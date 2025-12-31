import { PaymentsService } from './payments.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { UsersService } from '../users/users.service';
export declare class PaymentsController {
    private readonly paymentsService;
    private readonly usersService;
    constructor(paymentsService: PaymentsService, usersService: UsersService);
    getPlans(): Promise<{
        id: string;
        name: string;
        price: number;
        interval: string;
    }[]>;
    getStatus(userId: string): Promise<{
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
    createCheckout(userId: string, dto: CreateCheckoutDto): Promise<{
        sessionId: string;
        url: string;
    }>;
    createPortal(userId: string): Promise<{
        url: string;
    }>;
    cancelSubscription(userId: string): Promise<{
        message: string;
    }>;
    handleWebhook(signature: string, payload: Buffer): Promise<{
        received: boolean;
    }>;
}
