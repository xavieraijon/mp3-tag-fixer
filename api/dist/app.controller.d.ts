import { AppService } from './app.service';
import type { ClerkUser } from './auth/clerk.service';
import { UsersService } from './users/users.service';
export declare class AppController {
    private readonly appService;
    private readonly usersService;
    constructor(appService: AppService, usersService: UsersService);
    healthCheck(): {
        status: string;
        timestamp: string;
    };
    getMe(clerkUser: ClerkUser): Promise<{
        id: string;
        email: string;
        name: string | null;
        avatarUrl: string | null;
        subscriptionStatus: import(".prisma/client").$Enums.SubscriptionStatus;
        createdAt: Date;
    }>;
}
