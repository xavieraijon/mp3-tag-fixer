import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extract userId from JWT payload attached to request by JwtAuthGuard
 * @example
 * async create(@UserId() userId: string, @Body() dto: CreateDto) { ... }
 */
export const UserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.userId;
  },
);
