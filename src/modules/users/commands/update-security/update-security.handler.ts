import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Prisma } from '@prisma/client';

import { UpdateSecurityCommand } from './update-security.command';
import { PrismaService } from '../../../../database/prisma.service';
import { AppLogger } from '../../../../logger/app-logger.service';

@CommandHandler(UpdateSecurityCommand)
export class UpdateSecurityHandler implements ICommandHandler<UpdateSecurityCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(UpdateSecurityHandler.name);
  }

  async execute(command: UpdateSecurityCommand): Promise<{ twoFaEnabled: boolean; twoFaMethod: string | null }> {
    const { userId, dto } = command;

    const update: Prisma.UserUpdateInput = { twoFaEnabled: dto.twoFaEnabled };

    if (dto.twoFaEnabled) {
      update.twoFaMethod = dto.twoFaMethod;
    } else {
      update.twoFaMethod = null;
      update.twoFaSecret = null;
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: update,
      select: { twoFaEnabled: true, twoFaMethod: true },
    });

    this.logger.log('Security settings updated', { userId, twoFaEnabled: dto.twoFaEnabled });

    return { twoFaEnabled: updated.twoFaEnabled, twoFaMethod: updated.twoFaMethod ?? null };
  }
}
