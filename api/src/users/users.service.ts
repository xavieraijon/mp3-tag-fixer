import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClerkUser } from '../auth/clerk.service';
import { User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Find or create a user from Clerk data
   * This syncs the Clerk user to our local database
   */
  async findOrCreateFromClerk(clerkUser: ClerkUser): Promise<User> {
    const existingUser = await this.prisma.user.findUnique({
      where: { id: clerkUser.id },
    });

    if (existingUser) {
      // Update user data if changed
      return this.prisma.user.update({
        where: { id: clerkUser.id },
        data: {
          email: clerkUser.email,
          name: [clerkUser.firstName, clerkUser.lastName]
            .filter(Boolean)
            .join(' ') || null,
          avatarUrl: clerkUser.imageUrl,
        },
      });
    }

    // Create new user
    return this.prisma.user.create({
      data: {
        id: clerkUser.id,
        email: clerkUser.email,
        name: [clerkUser.firstName, clerkUser.lastName]
          .filter(Boolean)
          .join(' ') || null,
        avatarUrl: clerkUser.imageUrl,
      },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async updateSubscription(
    userId: string,
    data: {
      stripeCustomerId?: string;
      subscriptionStatus?: 'FREE' | 'ACTIVE' | 'CANCELED' | 'PAST_DUE';
      subscriptionEndsAt?: Date | null;
    },
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id },
    });
  }
}
