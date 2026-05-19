import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { UpdateInterestsCommand } from './update-interests.command';
import { PrismaService } from '../../../../database/prisma.service';
import { AppLogger } from '../../../../logger/app-logger.service';
import { UpdateInterestsDto } from '../../dto/update-interests.dto';

@CommandHandler(UpdateInterestsCommand)
export class UpdateInterestsHandler implements ICommandHandler<UpdateInterestsCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(UpdateInterestsHandler.name);
  }

  async execute(command: UpdateInterestsCommand): Promise<{ interests: UpdateInterestsDto['interests'] }> {
    const { userId, dto } = command;
    const unique = [...new Set(dto.interests)];

    await this.prisma.runTransaction(async (tx) => {
      await tx.userInterest.deleteMany({ where: { userId } });
      await tx.userInterest.createMany({
        data: unique.map((interest) => ({ userId, interest })),
      });
    });

    this.logger.log('Interests updated', { userId, count: unique.length });

    return { interests: unique };
  }
}
