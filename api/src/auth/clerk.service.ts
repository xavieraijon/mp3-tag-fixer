import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClerkClient, verifyToken } from '@clerk/backend';

export interface ClerkUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
}

@Injectable()
export class ClerkService {
  private clerk;
  private secretKey: string;

  constructor(private configService: ConfigService) {
    this.secretKey = this.configService.get<string>('CLERK_SECRET_KEY') || '';

    if (!this.secretKey) {
      console.warn('[ClerkService] CLERK_SECRET_KEY not configured - auth will fail');
    }

    this.clerk = createClerkClient({ secretKey: this.secretKey });
  }

  async verifyTokenAndGetUser(token: string): Promise<ClerkUser> {
    try {
      // Verify the JWT token
      const payload = await verifyToken(token, {
        secretKey: this.secretKey,
      });

      if (!payload.sub) {
        throw new UnauthorizedException('Invalid token: no subject');
      }

      // Get full user data from Clerk
      const user = await this.clerk.users.getUser(payload.sub);

      return {
        id: user.id,
        email: user.emailAddresses[0]?.emailAddress || '',
        firstName: user.firstName,
        lastName: user.lastName,
        imageUrl: user.imageUrl,
      };
    } catch (error) {
      console.error('[ClerkService] Token verification failed:', error);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  async getUser(userId: string): Promise<ClerkUser> {
    try {
      const user = await this.clerk.users.getUser(userId);
      return {
        id: user.id,
        email: user.emailAddresses[0]?.emailAddress || '',
        firstName: user.firstName,
        lastName: user.lastName,
        imageUrl: user.imageUrl,
      };
    } catch (error) {
      console.error('[ClerkService] Failed to get user:', error);
      throw new UnauthorizedException('User not found');
    }
  }
}
