import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './auth/decorators/public.decorator';
import { CurrentUser } from './auth/decorators/current-user.decorator';
import type { ClerkUser } from './auth/clerk.service';
import { UsersService } from './users/users.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Health check endpoint (public)
   */
  @Public()
  @Get('health')
  healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get current user profile (requires authentication)
   * Also syncs user to local database
   */
  @Get('me')
  async getMe(@CurrentUser() clerkUser: ClerkUser) {
    // Sync Clerk user to local database
    const user = await this.usersService.findOrCreateFromClerk(clerkUser);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      subscriptionStatus: user.subscriptionStatus,
      createdAt: user.createdAt,
    };
  }
}
