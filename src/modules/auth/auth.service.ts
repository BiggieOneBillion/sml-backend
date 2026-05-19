import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { UserStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { AppConfigService } from '../../config/app-config.service';
import { AppLogger } from '../../logger/app-logger.service';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  VerifyEmailDto,
  ResendVerificationDto,
} from './dto/auth.dto';
import {
  DuplicateEmailException,
  InvalidCredentialsException,
  EmailNotVerifiedException,
  TokenExpiredException,
  ResourceNotFoundException,
  BusinessRuleException,
} from '../../common/exceptions/app.exceptions';
import { JwtPayload } from './strategies/jwt-access.strategy';
import { maskEmail, addDays, addHours } from '../../common/utils/helpers';

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
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(AuthService.name);
  }

  // ── Registration ──────────────────────────────────────────────────────────

  async register(
    dto: RegisterDto,
    ipAddress: string,
  ): Promise<{ message: string; userId: string }> {
    // Check uniqueness BEFORE hashing (expensive op) to fail fast
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });

    if (existing) {
      throw new DuplicateEmailException();
    }

    const passwordHash = await bcrypt.hash(
      dto.password,
      this.config.security.bcryptRounds,
    );

    // Create user + verification token in one transaction
    const { user, verificationToken } = await this.prisma.runTransaction(
      async (tx) => {
        const user = await tx.user.create({
          data: {
            email: dto.email,
            fullName: dto.fullName,
            passwordHash,
            status: UserStatus.PENDING_VERIFICATION,
            agreedToTermsAt: new Date(),
            agreedToTermsIp: ipAddress,
            agreedToTermsVersion: '1.0',
            profile: {
              create: {}, // create empty profile so it always exists
            },
            wallet: {
              create: { balance: 0, currency: 'USD' }, // create wallet immediately
            },
          },
          select: {
            id: true,
            email: true,
            fullName: true,
            status: true,
          },
        });

        const token = uuidv4();
        const verificationToken = await tx.emailVerificationToken.create({
          data: {
            userId: user.id,
            token,
            expiresAt: addHours(new Date(), 24),
          },
        });

        return { user, verificationToken };
      },
    );

    this.logger.log('User registered', {
      userId: user.id,
      email: maskEmail(dto.email),
    });

    // TODO: Queue email delivery (Phase 2 — email worker)
    // await this.emailQueue.add('verification', {
    //   to: user.email,
    //   token: verificationToken.token,
    // });

    return { message: 'Verification email sent. Please check your inbox.', userId: user.id };
  }

  // ── Email Verification ────────────────────────────────────────────────────

  async verifyEmail(
    dto: VerifyEmailDto,
    ipAddress: string,
  ): Promise<AuthResult> {
    const tokenRecord = await this.prisma.emailVerificationToken.findUnique({
      where: { token: dto.token },
      include: { user: true },
    });

    if (!tokenRecord) {
      throw new BusinessRuleException(
        'INVALID_VERIFICATION_TOKEN',
        'This verification link is invalid.',
      );
    }

    if (tokenRecord.usedAt) {
      throw new BusinessRuleException(
        'TOKEN_ALREADY_USED',
        'This verification link has already been used.',
      );
    }

    if (tokenRecord.expiresAt < new Date()) {
      throw new TokenExpiredException();
    }

    // Mark token as used + activate user in one transaction
    const user = await this.prisma.runTransaction(async (tx) => {
      await tx.emailVerificationToken.update({
        where: { id: tokenRecord.id },
        data: { usedAt: new Date() },
      });

      return tx.user.update({
        where: { id: tokenRecord.userId },
        data: {
          status: UserStatus.ACTIVE,
          emailVerifiedAt: new Date(),
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          status: true,
          emailVerifiedAt: true,
        },
      });
    });

    this.logger.log('Email verified', {
      userId: user.id,
      email: maskEmail(user.email),
    });

    const tokens = await this.generateTokenPair(user.id, user.email, user.status, ipAddress);

    return { user, tokens };
  }

  async resendVerification(dto: ResendVerificationDto): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true, status: true, emailVerifiedAt: true },
    });

    // Always return the same message — don't leak whether email exists
    const safeResponse = { message: 'If an account with that email exists, a verification link has been sent.' };

    if (!user || user.status === UserStatus.ACTIVE) {
      return safeResponse;
    }

    // Rate limit: max 3 tokens in the last hour
    const recentCount = await this.prisma.emailVerificationToken.count({
      where: {
        userId: user.id,
        createdAt: { gte: addHours(new Date(), -1) },
      },
    });

    if (recentCount >= 3) {
      throw new BusinessRuleException(
        'VERIFICATION_RATE_LIMITED',
        'Too many verification emails sent. Please wait before requesting another.',
      );
    }

    const token = uuidv4();
    await this.prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt: addHours(new Date(), 24),
      },
    });

    // TODO: Queue email
    this.logger.log('Verification email resent', { userId: user.id });

    return safeResponse;
  }

  // ── Login ─────────────────────────────────────────────────────────────────

  async login(dto: LoginDto, ipAddress: string, userAgent?: string): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email, deletedAt: null },
      select: {
        id: true,
        email: true,
        fullName: true,
        passwordHash: true,
        status: true,
        emailVerifiedAt: true,
      },
    });

    // IMPORTANT: Use constant-time comparison even for non-existent users
    // to prevent timing attacks that reveal whether an email is registered
    const dummyHash = '$2b$12$invalidhashfortimingnormalization000000000000000000000';
    const passwordToCompare = user?.passwordHash ?? dummyHash;

    const isPasswordValid = await bcrypt.compare(dto.password, passwordToCompare);

    if (!user || !isPasswordValid) {
      // Log failed attempt (for brute-force detection)
      this.logger.warn('Failed login attempt', {
        email: maskEmail(dto.email),
        ip: ipAddress,
      });
      throw new InvalidCredentialsException();
    }

    if (user.status === UserStatus.PENDING_VERIFICATION) {
      throw new EmailNotVerifiedException();
    }

    if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.DELETED) {
      throw new BusinessRuleException(
        'ACCOUNT_INACTIVE',
        'This account is no longer active. Please contact support.',
      );
    }

    this.logger.log('User logged in', {
      userId: user.id,
      email: maskEmail(user.email),
      ip: ipAddress,
    });

    const tokens = await this.generateTokenPair(
      user.id,
      user.email,
      user.status,
      ipAddress,
      userAgent,
      // dto.deviceFingerprint,
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        status: user.status,
        emailVerifiedAt: user.emailVerifiedAt,
      },
      tokens,
    };
  }

  // ── Token Refresh ─────────────────────────────────────────────────────────

  async refreshTokens(
    dto: RefreshTokenDto,
    ipAddress: string,
  ): Promise<AuthTokens> {
    // 1. Verify JWT signature & expiry
    let payload: JwtPayload;
    try {
      payload = this.jwt.verify<JwtPayload>(dto.refreshToken, {
        secret: this.config.jwt.refreshSecret,
      });
    } catch {
      throw new TokenExpiredException();
    }

    // 2. Hash incoming token and find it in DB
    const tokenHash = await bcrypt.hash(dto.refreshToken, 10);

    // NOTE: We query by userId first (indexed), then check hash
    const storedTokens = await this.prisma.refreshToken.findMany({
      where: {
        userId: payload.sub,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    // Find the matching token (bcrypt compare each — there are very few per user)
    let matchedToken: (typeof storedTokens)[0] | undefined;
    for (const stored of storedTokens) {
      const matches = await bcrypt.compare(dto.refreshToken, stored.tokenHash);
      if (matches) {
        matchedToken = stored;
        break;
      }
    }

    if (!matchedToken) {
      // Possible token reuse attack — revoke all tokens for this user
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

    // Rotate: revoke old token, issue new pair
    await this.prisma.refreshToken.update({
      where: { id: matchedToken.id },
      data: { revokedAt: new Date() },
    });

    return this.generateTokenPair(user.id, user.email, user.status, ipAddress);
  }

  // ── Logout ────────────────────────────────────────────────────────────────

  async logout(userId: string, refreshToken: string): Promise<void> {
    const storedTokens = await this.prisma.refreshToken.findMany({
      where: { userId, revokedAt: null },
    });

    for (const stored of storedTokens) {
      const matches = await bcrypt.compare(refreshToken, stored.tokenHash);
      if (matches) {
        await this.prisma.refreshToken.update({
          where: { id: stored.id },
          data: { revokedAt: new Date() },
        });
        break;
      }
    }

    this.logger.log('User logged out', { userId });
  }

  // ── Token Generation ──────────────────────────────────────────────────────

  private async generateTokenPair(
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

    // Store hashed refresh token (never store raw)
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

    // Clean up expired tokens for this user (housekeeping)
    await this.prisma.refreshToken.deleteMany({
      where: {
        userId,
        expiresAt: { lt: new Date() },
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
    };
  }
}
