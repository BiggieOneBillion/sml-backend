import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import * as bcrypt from 'bcrypt';
import { UserStatus } from '@prisma/client';

import { LoginCommand } from './login.command';
import { PrismaService } from '../../../../database/prisma.service';
import { AppLogger } from '../../../../logger/app-logger.service';
import { AuthService, AuthResult } from '../../auth.service';
import {
  InvalidCredentialsException,
  EmailNotVerifiedException,
  BusinessRuleException,
} from '../../../../common/exceptions/app.exceptions';
import { maskEmail } from '../../../../common/utils/helpers';

@CommandHandler(LoginCommand)
export class LoginHandler implements ICommandHandler<LoginCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(LoginHandler.name);
  }

  async execute(command: LoginCommand): Promise<AuthResult> {
    const { email, password, ipAddress, userAgent } = command;

    const user = await this.prisma.user.findUnique({
      where: { email, deletedAt: null },
      select: {
        id: true,
        email: true,
        fullName: true,
        passwordHash: true,
        status: true,
        emailVerifiedAt: true,
      },
    });

    // Constant-time comparison even for non-existent users to prevent timing attacks
    const dummyHash = '$2b$12$invalidhashfortimingnormalization000000000000000000000';
    const passwordToCompare = user?.passwordHash ?? dummyHash;

    const isPasswordValid = await bcrypt.compare(password, passwordToCompare);

    if (!user || !isPasswordValid) {
      this.logger.warn('Failed login attempt', { email: maskEmail(email), ip: ipAddress });
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

    this.logger.log('User logged in', { userId: user.id, email: maskEmail(user.email), ip: ipAddress });

    const tokens = await this.authService.generateTokenPair(
      user.id,
      user.email,
      user.status,
      ipAddress,
      userAgent,
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
}
