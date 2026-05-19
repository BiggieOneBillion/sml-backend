import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { UserStatus } from '@prisma/client';

import { RegisterCommand } from './register.command';
import { PrismaService } from '../../../../database/prisma.service';
import { AppConfigService } from '../../../../config/app-config.service';
import { AppLogger } from '../../../../logger/app-logger.service';
import { DuplicateEmailException } from '../../../../common/exceptions/app.exceptions';
import { maskEmail, addHours } from '../../../../common/utils/helpers';
import { EmailOutboxService } from '../../../email/email-outbox.service';
import { EmailTemplate } from '../../../email/email-template.enum';

@CommandHandler(RegisterCommand)
export class RegisterHandler implements ICommandHandler<RegisterCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly logger: AppLogger,
    private readonly emailOutbox: EmailOutboxService,
  ) {
    this.logger.setContext(RegisterHandler.name);
  }

  async execute(command: RegisterCommand): Promise<{ message: string; userId: string }> {
    const { email, fullName, password, ipAddress } = command;

    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      throw new DuplicateEmailException();
    }

    const passwordHash = await bcrypt.hash(password, this.config.security.bcryptRounds);

    const { user } = await this.prisma.runTransaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          fullName,
          passwordHash,
          status: UserStatus.PENDING_VERIFICATION,
          agreedToTermsAt: new Date(),
          agreedToTermsIp: ipAddress,
          agreedToTermsVersion: '1.0',
          profile: { create: {} },
          wallet: { create: { balance: 0, currency: 'USD' } },
        },
        select: { id: true, email: true, fullName: true, status: true },
      });

      const token = uuidv4();
      await tx.emailVerificationToken.create({
        data: {
          userId: user.id,
          token,
          expiresAt: addHours(new Date(), 24),
        },
      });

      await this.emailOutbox.queueInTx(tx, user.email, EmailTemplate.VERIFY_EMAIL, {
        fullName: user.fullName,
        token,
        frontendUrl: this.config.frontendUrl,
      });

      return { user };
    });

    this.logger.log('User registered', { userId: user.id, email: maskEmail(email) });

    return { message: 'Verification email sent. Please check your inbox.', userId: user.id };
  }
}
