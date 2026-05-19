import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import * as bcrypt from 'bcrypt';

import { LogoutCommand } from './logout.command';
import { PrismaService } from '../../../../database/prisma.service';
import { AppLogger } from '../../../../logger/app-logger.service';

@CommandHandler(LogoutCommand)
export class LogoutHandler implements ICommandHandler<LogoutCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(LogoutHandler.name);
  }

  async execute(command: LogoutCommand): Promise<void> {
    const { userId, refreshToken } = command;

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
}
