import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { UserStatus } from '@prisma/client';

/**
 * JwtAuthGuard — Applied globally in main.ts. Protects all routes by default.
 *
 * Routes can opt out with @Public() decorator.
 *
 * Additionally checks:
 *  - Token signature (Passport handles this)
 *  - User status: SUSPENDED users cannot access any protected route
 *
 * WHY GLOBAL GUARD?
 * Secure by default. Developers must explicitly mark public routes.
 * This prevents accidentally-public routes from being deployed.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Check if route is marked @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    return super.canActivate(context);
  }

  handleRequest<TUser extends { status: string }>(
    err: Error | null,
    user: TUser | false,
    info: { message?: string } | null,
  ): TUser {
    if (err || !user) {
      const message =
        info?.message === 'jwt expired'
          ? 'Your session has expired. Please log in again.'
          : 'Authentication required';
      throw new UnauthorizedException(message);
    }

    // Block suspended users at the guard level
    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException(
        'Your account has been suspended. Please contact support.',
      );
    }

    return user;
  }
}
