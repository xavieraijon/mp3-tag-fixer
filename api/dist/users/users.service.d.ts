import { PrismaService } from '../prisma/prisma.service';
import { ClerkUser } from '../auth/clerk.service';
import { User } from '@prisma/client';
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    findOrCreateFromClerk(clerkUser: ClerkUser): Promise<User>;
    findById(id: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    updateSubscription(userId: string, data: {
        stripeCustomerId?: string;
        subscriptionStatus?: 'FREE' | 'ACTIVE' | 'CANCELED' | 'PAST_DUE';
        subscriptionEndsAt?: Date | null;
    }): Promise<User>;
    delete(id: string): Promise<void>;
}
