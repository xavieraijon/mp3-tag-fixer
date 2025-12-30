import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ClerkUser } from '../clerk.service';

/**
 * Decorator to get the current authenticated user from the request
 * @example
 * @Get('profile')
 * getProfile(@CurrentUser() user: ClerkUser) {
 *   return user;
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof ClerkUser | undefined, ctx: ExecutionContext): ClerkUser | string | null => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as ClerkUser;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
