import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppConfigService } from '../../../config/app-config.service';

/**
 * JWT payload shape stored in access tokens.
 * Keep it minimal — only what's needed to identify the user and check permissions.
 * Heavy data (profile, subscription) is fetched from DB on demand.
 */
export interface JwtPayload {
  sub: string;          // user ID
  email: string;
  status: string;       // UserStatus
  iat?: number;
  exp?: number;
}

/**
 * AccessTokenStrategy — validates Bearer tokens from Authorization header.
 * Attached to guards as 'jwt' strategy.
 *
 * WHY we store minimal payload in JWT:
 * - Token cannot be revoked before expiry (stateless)
 * - Avoid stale permission data in long-lived tokens
 * - Short TTL (15m) means stale data is only stale for 15 minutes max
 */
@Injectable()
export class AccessTokenStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly config: AppConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.jwt.accessSecret,
    });
  }

  /**
   * Called after token signature is verified.
   * Return value is attached to request.user
   */
  validate(payload: JwtPayload): JwtPayload {
    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException('Invalid token payload');
    }
    return payload;
  }
}
