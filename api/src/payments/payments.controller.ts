import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Headers,
  RawBody,
  NotFoundException,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserId } from '../auth/decorators/user-id.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UsersService } from '../users/users.service';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly usersService: UsersService,
  ) {}

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
  @UseGuards(JwtAuthGuard)
  @Get('status')
  async getStatus(@UserId() userId: string) {
    return this.paymentsService.getSubscriptionStatus(userId);
  }

  /**
   * Create a checkout session for subscription
   */
  @UseGuards(JwtAuthGuard)
  @Post('checkout')
  async createCheckout(@UserId() userId: string, @Body() dto: CreateCheckoutDto) {
    // Get user email from database
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.paymentsService.createCheckoutSession(
      userId,
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
  @UseGuards(JwtAuthGuard)
  @Post('portal')
  async createPortal(@UserId() userId: string) {
    return this.paymentsService.createPortalSession(userId);
  }

  /**
   * Cancel subscription at period end
   */
  @UseGuards(JwtAuthGuard)
  @Post('cancel')
  async cancelSubscription(@UserId() userId: string) {
    await this.paymentsService.cancelSubscription(userId);
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
