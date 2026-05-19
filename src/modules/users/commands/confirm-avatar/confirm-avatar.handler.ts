import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { ConfirmAvatarCommand } from './confirm-avatar.command';
import { PrismaService } from '../../../../database/prisma.service';
import { AppLogger } from '../../../../logger/app-logger.service';
import { UsersService } from '../../users.service';

@CommandHandler(ConfirmAvatarCommand)
export class ConfirmAvatarHandler implements ICommandHandler<ConfirmAvatarCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(ConfirmAvatarHandler.name);
  }

  async execute(command: ConfirmAvatarCommand): Promise<{ avatarUrl: string }> {
    const { userId, dto } = command;

    this.usersService.validateAvatarUrl(dto.avatarUrl);

    await this.prisma.userProfile.upsert({
      where: { userId },
      create: { userId, avatarUrl: dto.avatarUrl },
      update: { avatarUrl: dto.avatarUrl },
    });

    this.logger.log('Avatar updated', { userId });

    return { avatarUrl: dto.avatarUrl };
  }
}
