import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
export declare class PaymentsService {
    private readonly configService;
    private readonly prisma;
    private readonly stripe;
    constructor(configService: ConfigService, prisma: PrismaService);
    private ensureStripe;
    getOrCreateCustomer(userId: string, email: string): Promise<string>;
    createCheckoutSession(userId: string, email: string, priceId: string, successUrl: string, cancelUrl: string, couponCode?: string): Promise<{
        sessionId: string;
        url: string;
    }>;
    createPortalSession(userId: string): Promise<{
        url: string;
    }>;
    getSubscriptionStatus(userId: string): Promise<{
        status: import(".prisma/client").$Enums.SubscriptionStatus;
        endsAt: Date | null;
        subscription: {
            id: any;
            status: any;
            currentPeriodEnd: Date | null;
            cancelAtPeriodEnd: any;
            plan: any;
        } | null;
    }>;
    cancelSubscription(userId: string): Promise<void>;
    handleWebhook(signature: string, payload: Buffer): Promise<void>;
    private handleCheckoutCompleted;
    private handleSubscriptionUpdated;
    private handleSubscriptionDeleted;
    private handlePaymentFailed;
    getPlans(): Promise<{
        id: string;
        name: string;
        price: number;
        interval: string;
    }[]>;
}
