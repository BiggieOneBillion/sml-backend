import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UserStatus } from '@prisma/client';

import { VerifyEmailCommand } from './verify-email.command';
import { PrismaService } from '../../../../database/prisma.service';
import { AppLogger } from '../../../../logger/app-logger.service';
import { AuthService, AuthResult } from '../../auth.service';
import {
  BusinessRuleException,
  TokenExpiredException,
} from '../../../../common/exceptions/app.exceptions';
import { maskEmail } from '../../../../common/utils/helpers';

@CommandHandler(VerifyEmailCommand)
export class VerifyEmailHandler implements ICommandHandler<VerifyEmailCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(VerifyEmailHandler.name);
  }

  async execute(command: VerifyEmailCommand): Promise<AuthResult> {
    const { token, ipAddress } = command;

    const tokenRecord = await this.prisma.emailVerificationToken.findUnique({
      where: { token },
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

    const user = await this.prisma.runTransaction(async (tx) => {
      await tx.emailVerificationToken.update({
        where: { id: tokenRecord.id },
        data: { usedAt: new Date() },
      });

      return tx.user.update({
        where: { id: tokenRecord.userId },
        data: { status: UserStatus.ACTIVE, emailVerifiedAt: new Date() },
        select: { id: true, email: true, fullName: true, status: true, emailVerifiedAt: true },
      });
    });

    this.logger.log('Email verified', { userId: user.id, email: maskEmail(user.email) });

    const tokens = await this.authService.generateTokenPair(
      user.id,
      user.email,
      user.status,
      ipAddress,
    );

    return { user, tokens };
  }
}
