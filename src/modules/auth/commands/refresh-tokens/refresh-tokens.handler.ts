import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import * as bcrypt from 'bcrypt';

import { RefreshTokensCommand } from './refresh-tokens.command';
import { PrismaService } from '../../../../database/prisma.service';
import { AppLogger } from '../../../../logger/app-logger.service';
import { AuthService, AuthTokens } from '../../auth.service';
import {
  TokenExpiredException,
  ResourceNotFoundException,
} from '../../../../common/exceptions/app.exceptions';
import { JwtPayload } from '../../strategies/jwt-access.strategy';
import { AppConfigService } from '../../../../config/app-config.service';
import { JwtService } from '@nestjs/jwt';

@CommandHandler(RefreshTokensCommand)
export class RefreshTokensHandler implements ICommandHandler<RefreshTokensCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
    private readonly authService: AuthService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(RefreshTokensHandler.name);
  }

  async execute(command: RefreshTokensCommand): Promise<AuthTokens> {
    const { refreshToken, ipAddress } = command;

    let payload: JwtPayload;
    try {
      payload = this.jwt.verify<JwtPayload>(refreshToken, {
        secret: this.config.jwt.refreshSecret,
      });
    } catch {
      throw new TokenExpiredException();
    }

    const storedTokens = await this.prisma.refreshToken.findMany({
      where: {
        userId: payload.sub,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    let matchedToken: (typeof storedTokens)[0] | undefined;
    for (const stored of storedTokens) {
      const matches = await bcrypt.compare(refreshToken, stored.tokenHash);
      if (matches) {
        matchedToken = stored;
        break;
      }
    }

    if (!matchedToken) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: payload.sub },
        data: { revokedAt: new Date() },
      });
      this.logger.warn('Refresh token reuse detected — all tokens revoked', {
        userId: payload.sub,
        ip: ipAddress,
      });
      throw new TokenExpiredException();
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, status: true },
    });

    if (!user) throw new ResourceNotFoundException('User');

    await this.prisma.refreshToken.update({
      where: { id: matchedToken.id },
      data: { revokedAt: new Date() },
    });

    return this.authService.generateTokenPair(user.id, user.email, user.status, ipAddress);
  }
}
