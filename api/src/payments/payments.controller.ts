import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Headers,
  RawBody,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import type { ClerkUser } from '../auth/clerk.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Get available subscription plans
   */
  @Public()
  @Get('plans')
  async getPlans() {
    return this.paymentsService.getPlans();
  }

  /**
   * Get current subscription status
   */
  @UseGuards(ClerkAuthGuard)
  @Get('status')
  async getStatus(@CurrentUser() user: ClerkUser) {
    return this.paymentsService.getSubscriptionStatus(user.id);
  }

  /**
   * Create a checkout session for subscription
   */
  @UseGuards(ClerkAuthGuard)
  @Post('checkout')
  async createCheckout(@CurrentUser() user: ClerkUser, @Body() dto: CreateCheckoutDto) {
    return this.paymentsService.createCheckoutSession(
      user.id,
      user.email,
      dto.priceId,
      dto.successUrl,
      dto.cancelUrl,
      dto.couponCode,
    );
  }

  /**
   * Create a customer portal session for managing subscription
   */
  @UseGuards(ClerkAuthGuard)
  @Post('portal')
  async createPortal(@CurrentUser() user: ClerkUser) {
    return this.paymentsService.createPortalSession(user.id);
  }

  /**
   * Cancel subscription at period end
   */
  @UseGuards(ClerkAuthGuard)
  @Post('cancel')
  async cancelSubscription(@CurrentUser() user: ClerkUser) {
    await this.paymentsService.cancelSubscription(user.id);
    return { message: 'Subscription will be canceled at the end of the billing period' };
  }

  /**
   * Stripe webhook handler
   */
  @Public()
  @Post('webhook')
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @RawBody() payload: Buffer,
  ) {
    await this.paymentsService.handleWebhook(signature, payload);
    return { received: true };
  }
}
