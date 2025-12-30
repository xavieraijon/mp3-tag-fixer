"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const stripe_1 = __importDefault(require("stripe"));
let PaymentsService = class PaymentsService {
    configService;
    prisma;
    stripe = null;
    constructor(configService, prisma) {
        this.configService = configService;
        this.prisma = prisma;
        const secretKey = this.configService.get('STRIPE_SECRET_KEY');
        if (!secretKey) {
            console.warn('[PaymentsService] Stripe secret key not configured - payments disabled');
        }
        else {
            this.stripe = new stripe_1.default(secretKey);
        }
    }
    ensureStripe() {
        if (!this.stripe) {
            throw new common_1.BadRequestException('Payments are not configured');
        }
        return this.stripe;
    }
    async getOrCreateCustomer(userId, email) {
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
    async createCheckoutSession(userId, email, priceId, successUrl, cancelUrl, couponCode) {
        const customerId = await this.getOrCreateCustomer(userId, email);
        const stripe = this.ensureStripe();
        const sessionParams = {
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
    async createPortalSession(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { stripeCustomerId: true },
        });
        if (!user?.stripeCustomerId) {
            throw new common_1.BadRequestException('No Stripe customer found for this user');
        }
        const returnUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:4200';
        const stripe = this.ensureStripe();
        const session = await stripe.billingPortal.sessions.create({
            customer: user.stripeCustomerId,
            return_url: returnUrl,
        });
        return { url: session.url };
    }
    async getSubscriptionStatus(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                subscriptionStatus: true,
                subscriptionEndsAt: true,
                stripeCustomerId: true,
            },
        });
        if (!user) {
            throw new common_1.BadRequestException('User not found');
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
                    const sub = subscriptions.data[0];
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
            }
            catch (e) {
                console.warn('[PaymentsService] Could not fetch Stripe subscription:', e);
            }
        }
        return {
            status: user.subscriptionStatus,
            endsAt: user.subscriptionEndsAt,
            subscription: activeSubscription,
        };
    }
    async cancelSubscription(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { stripeCustomerId: true },
        });
        if (!user?.stripeCustomerId) {
            throw new common_1.BadRequestException('No Stripe customer found');
        }
        const stripe = this.ensureStripe();
        const subscriptions = await stripe.subscriptions.list({
            customer: user.stripeCustomerId,
            status: 'active',
            limit: 1,
        });
        if (subscriptions.data.length === 0) {
            throw new common_1.BadRequestException('No active subscription found');
        }
        await stripe.subscriptions.update(subscriptions.data[0].id, {
            cancel_at_period_end: true,
        });
        await this.prisma.user.update({
            where: { id: userId },
            data: { subscriptionStatus: client_1.SubscriptionStatus.CANCELED },
        });
    }
    async handleWebhook(signature, payload) {
        const webhookSecret = this.configService.get('STRIPE_WEBHOOK_SECRET');
        if (!webhookSecret) {
            throw new common_1.BadRequestException('Webhook secret not configured');
        }
        const stripe = this.ensureStripe();
        let event;
        try {
            event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
        }
        catch (e) {
            console.error('[PaymentsService] Webhook signature verification failed:', e);
            throw new common_1.BadRequestException('Invalid webhook signature');
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
    async handleCheckoutCompleted(session) {
        const userId = session.metadata?.userId;
        if (!userId)
            return;
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                stripeCustomerId: session.customer,
                subscriptionStatus: client_1.SubscriptionStatus.ACTIVE,
            },
        });
        console.log(`[PaymentsService] Checkout completed for user ${userId}`);
    }
    async handleSubscriptionUpdated(subscription) {
        const customerId = subscription.customer;
        const user = await this.prisma.user.findFirst({
            where: { stripeCustomerId: customerId },
        });
        if (!user)
            return;
        let status;
        switch (subscription.status) {
            case 'active':
            case 'trialing':
                status = client_1.SubscriptionStatus.ACTIVE;
                break;
            case 'past_due':
                status = client_1.SubscriptionStatus.PAST_DUE;
                break;
            case 'canceled':
            case 'unpaid':
                status = client_1.SubscriptionStatus.CANCELED;
                break;
            default:
                status = client_1.SubscriptionStatus.FREE;
        }
        const sub = subscription;
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                subscriptionStatus: status,
                subscriptionEndsAt: sub.current_period_end
                    ? new Date(sub.current_period_end * 1000)
                    : null,
            },
        });
        console.log(`[PaymentsService] Subscription updated for user ${user.id}: ${status}`);
    }
    async handleSubscriptionDeleted(subscription) {
        const customerId = subscription.customer;
        await this.prisma.user.updateMany({
            where: { stripeCustomerId: customerId },
            data: {
                subscriptionStatus: client_1.SubscriptionStatus.FREE,
                subscriptionEndsAt: null,
            },
        });
        console.log(`[PaymentsService] Subscription deleted for customer ${customerId}`);
    }
    async handlePaymentFailed(invoice) {
        const customerId = invoice.customer;
        await this.prisma.user.updateMany({
            where: { stripeCustomerId: customerId },
            data: {
                subscriptionStatus: client_1.SubscriptionStatus.PAST_DUE,
            },
        });
        console.log(`[PaymentsService] Payment failed for customer ${customerId}`);
    }
    async getPlans() {
        if (!this.stripe) {
            return [];
        }
        const prices = await this.stripe.prices.list({
            active: true,
            type: 'recurring',
            expand: ['data.product'],
        });
        return prices.data.map((price) => {
            const product = price.product;
            return {
                id: price.id,
                name: product.name,
                price: (price.unit_amount || 0) / 100,
                interval: price.recurring?.interval || 'month',
            };
        });
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map