import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '../strategies/jwt-access.strategy';

/**
 * @CurrentUser() — extracts the authenticated user from the request.
 *
 * The JwtAuthGuard sets request.user after validating the JWT.
 * This decorator provides type-safe access to that user in controllers.
 *
 * Usage:
 *   @Get('profile')
 *   getProfile(@CurrentUser() user: JwtPayload) {
 *     return this.usersService.findOne(user.sub);
 *   }
 *
 *   // Get a specific field:
 *   @Get('me')
 *   getMe(@CurrentUser('sub') userId: string) { ... }
 */
export const CurrentUser = createParamDecorator(
  (field: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtPayload;

    if (!user) return null;
    return field ? user[field] : user;
  },
);
