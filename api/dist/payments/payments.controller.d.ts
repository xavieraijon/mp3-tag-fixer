import { PaymentsService } from './payments.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import type { ClerkUser } from '../auth/clerk.service';
export declare class PaymentsController {
    private readonly paymentsService;
    constructor(paymentsService: PaymentsService);
    getPlans(): Promise<{
        id: string;
        name: string;
        price: number;
        interval: string;
    }[]>;
    getStatus(user: ClerkUser): Promise<{
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
    createCheckout(user: ClerkUser, dto: CreateCheckoutDto): Promise<{
        sessionId: string;
        url: string;
    }>;
    createPortal(user: ClerkUser): Promise<{
        url: string;
    }>;
    cancelSubscription(user: ClerkUser): Promise<{
        message: string;
    }>;
    handleWebhook(signature: string, payload: Buffer): Promise<{
        received: boolean;
    }>;
}
