import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    findById(id: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    updateSubscription(userId: string, data: {
        stripeCustomerId?: string;
        subscriptionStatus?: 'FREE' | 'ACTIVE' | 'CANCELED' | 'PAST_DUE';
        subscriptionEndsAt?: Date | null;
    }): Promise<User>;
    delete(id: string): Promise<void>;
}
