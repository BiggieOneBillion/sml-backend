import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { AppConfigService } from '../../config/app-config.service';
import { addDays } from '../../common/utils/helpers';
import { JwtPayload } from './strategies/jwt-access.strategy';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds until access token expires
}

export interface AuthResult {
  user: {
    id: string;
    email: string;
    fullName: string;
    status: UserStatus;
    emailVerifiedAt: Date | null;
  };
  tokens: AuthTokens;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
  ) {}

  async generateTokenPair(
    userId: string,
    email: string,
    status: string,
    ipAddress: string,
    userAgent?: string,
    deviceFingerprint?: string,
  ): Promise<AuthTokens> {
    const payload: JwtPayload = { sub: userId, email, status };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.jwt.accessSecret,
        expiresIn: this.config.jwt.accessExpiresIn as any,
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.jwt.refreshSecret,
        expiresIn: this.config.jwt.refreshExpiresIn as any,
      }),
    ]);

    const tokenHash = await bcrypt.hash(refreshToken, 10);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        deviceFingerprint: deviceFingerprint ?? null,
        userAgent: userAgent?.substring(0, 255) ?? null,
        ipAddress,
        expiresAt: addDays(new Date(), 30),
      },
    });

    await this.prisma.refreshToken.deleteMany({
      where: { userId, expiresAt: { lt: new Date() } },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60,
    };
  }
}
