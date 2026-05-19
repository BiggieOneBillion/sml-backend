import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { v4 as uuidv4 } from 'uuid';
import { UserStatus } from '@prisma/client';

import { ResendVerificationCommand } from './resend-verification.command';
import { PrismaService } from '../../../../database/prisma.service';
import { AppLogger } from '../../../../logger/app-logger.service';
import { BusinessRuleException } from '../../../../common/exceptions/app.exceptions';
import { addHours } from '../../../../common/utils/helpers';
import { EmailOutboxService } from '../../../email/email-outbox.service';
import { EmailTemplate } from '../../../email/email-template.enum';
import { AppConfigService } from '../../../../config/app-config.service';

@CommandHandler(ResendVerificationCommand)
export class ResendVerificationHandler implements ICommandHandler<ResendVerificationCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLogger,
    private readonly emailOutbox: EmailOutboxService,
    private readonly config: AppConfigService,
  ) {
    this.logger.setContext(ResendVerificationHandler.name);
  }

  async execute(command: ResendVerificationCommand): Promise<{ message: string }> {
    const { email } = command;

    const safeResponse = {
      message: 'If an account with that email exists, a verification link has been sent.',
    };

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, status: true },
    });

    if (!user || user.status === UserStatus.ACTIVE) {
      return safeResponse;
    }

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

    const userRecord = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { fullName: true },
    });

    await this.prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt: addHours(new Date(), 24),
      },
    });

    await this.emailOutbox.queue(email, EmailTemplate.VERIFY_EMAIL, {
      fullName: userRecord?.fullName ?? email,
      token,
      frontendUrl: this.config.frontendUrl,
    });

    this.logger.log('Verification email queued', { userId: user.id });

    return safeResponse;
  }
}
