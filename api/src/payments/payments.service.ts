import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionStatus } from '@prisma/client';
import Stripe from 'stripe';

@Injectable()
export class PaymentsService {
  private readonly stripe: Stripe | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      console.warn(
        '[PaymentsService] Stripe secret key not configured - payments disabled',
      );
    } else {
      this.stripe = new Stripe(secretKey);
    }
  }

  private ensureStripe(): Stripe {
    if (!this.stripe) {
      throw new BadRequestException('Payments are not configured');
    }
    return this.stripe;
  }

  /**
   * Create or get Stripe customer for a user
   */
  async getOrCreateCustomer(userId: string, email: string): Promise<string> {
    const stripe = this.ensureStripe();
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });

    if (user?.stripeCustomerId) {
      return user.stripeCustomerId;
    }

    const customer = await stripe.customers.create({
      email,
      metadata: { userId },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customer.id },
    });

    return customer.id;
  }

  /**
   * Create a checkout session for subscription
   */
  async createCheckoutSession(
    userId: string,
    email: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string,
    couponCode?: string,
  ): Promise<{ sessionId: string; url: string }> {
    const customerId = await this.getOrCreateCustomer(userId, email);

    const stripe = this.ensureStripe();
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { userId },
    };

    if (couponCode) {
      sessionParams.discounts = [{ coupon: couponCode }];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return {
      sessionId: session.id,
      url: session.url || '',
    };
  }

  /**
   * Create a customer portal session
   */
  async createPortalSession(userId: string): Promise<{ url: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });

    if (!user?.stripeCustomerId) {
      throw new BadRequestException('No Stripe customer found for this user');
    }

    const returnUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:4200';
    const stripe = this.ensureStripe();

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: returnUrl,
    });

    return { url: session.url };
  }

  /**
   * Get subscription status for a user
   */
  async getSubscriptionStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionStatus: true,
        subscriptionEndsAt: true,
        stripeCustomerId: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    let activeSubscription = null;

    if (user.stripeCustomerId && this.stripe) {
      try {
        const subscriptions = await this.stripe.subscriptions.list({
          customer: user.stripeCustomerId,
          status: 'active',
          limit: 1,
        });

        if (subscriptions.data.length > 0) {
          const sub = subscriptions.data[0] as any;
          activeSubscription = {
            id: sub.id,
            status: sub.status,
            currentPeriodEnd: sub.current_period_end
              ? new Date(sub.current_period_end * 1000)
              : null,
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            plan: sub.items?.data[0]?.price?.nickname || 'Premium',
          };
        }
      } catch (e) {
        console.warn(
          '[PaymentsService] Could not fetch Stripe subscription:',
          e,
        );
      }
    }

    return {
      status: user.subscriptionStatus,
      endsAt: user.subscriptionEndsAt,
      subscription: activeSubscription,
    };
  }

  /**
   * Cancel subscription at period end
   */
  async cancelSubscription(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });

    if (!user?.stripeCustomerId) {
      throw new BadRequestException('No Stripe customer found');
    }

    const stripe = this.ensureStripe();
    const subscriptions = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      throw new BadRequestException('No active subscription found');
    }

    await stripe.subscriptions.update(subscriptions.data[0].id, {
      cancel_at_period_end: true,
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { subscriptionStatus: SubscriptionStatus.CANCELED },
    });
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(signature: string, payload: Buffer): Promise<void> {
    const webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );

    if (!webhookSecret) {
      throw new BadRequestException('Webhook secret not configured');
    }

    const stripe = this.ensureStripe();
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (e) {
      console.error(
        '[PaymentsService] Webhook signature verification failed:',
        e,
      );
      throw new BadRequestException('Invalid webhook signature');
    }

    console.log(`[PaymentsService] Received webhook: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object);
        break;

      default:
        console.log(`[PaymentsService] Unhandled event type: ${event.type}`);
    }
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.userId;
    if (!userId) return;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        stripeCustomerId: session.customer as string,
        subscriptionStatus: SubscriptionStatus.ACTIVE,
      },
    });

    console.log(`[PaymentsService] Checkout completed for user ${userId}`);
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const customerId = subscription.customer as string;

    const user = await this.prisma.user.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (!user) return;

    let status: SubscriptionStatus;
    switch (subscription.status) {
      case 'active':
      case 'trialing':
        status = SubscriptionStatus.ACTIVE;
        break;
      case 'past_due':
        status = SubscriptionStatus.PAST_DUE;
        break;
      case 'canceled':
      case 'unpaid':
        status = SubscriptionStatus.CANCELED;
        break;
      default:
        status = SubscriptionStatus.FREE;
    }

    const sub = subscription as any;
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: status,
        subscriptionEndsAt: sub.current_period_end
          ? new Date(sub.current_period_end * 1000)
          : null,
      },
    });

    console.log(
      `[PaymentsService] Subscription updated for user ${user.id}: ${status}`,
    );
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const customerId = subscription.customer as string;

    await this.prisma.user.updateMany({
      where: { stripeCustomerId: customerId },
      data: {
        subscriptionStatus: SubscriptionStatus.FREE,
        subscriptionEndsAt: null,
      },
    });

    console.log(
      `[PaymentsService] Subscription deleted for customer ${customerId}`,
    );
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice) {
    const customerId = invoice.customer as string;

    await this.prisma.user.updateMany({
      where: { stripeCustomerId: customerId },
      data: {
        subscriptionStatus: SubscriptionStatus.PAST_DUE,
      },
    });

    console.log(`[PaymentsService] Payment failed for customer ${customerId}`);
  }

  /**
   * Get available subscription plans
   */
  async getPlans(): Promise<
    { id: string; name: string; price: number; interval: string }[]
  > {
    if (!this.stripe) {
      return []; // Return empty if Stripe not configured
    }
    const prices = await this.stripe.prices.list({
      active: true,
      type: 'recurring',
      expand: ['data.product'],
    });

    return prices.data.map((price) => {
      const product = price.product as Stripe.Product;
      return {
        id: price.id,
        name: product.name,
        price: (price.unit_amount || 0) / 100,
        interval: price.recurring?.interval || 'month',
      };
    });
  }
}
