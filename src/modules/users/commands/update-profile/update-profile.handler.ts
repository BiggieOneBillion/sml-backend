import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Prisma } from '@prisma/client';

import { UpdateProfileCommand } from './update-profile.command';
import { PrismaService } from '../../../../database/prisma.service';
import { AppLogger } from '../../../../logger/app-logger.service';
import { OwnProfileResponse } from '../../types/user-profile.types';
import { ResourceNotFoundException } from '../../../../common/exceptions/app.exceptions';

@CommandHandler(UpdateProfileCommand)
export class UpdateProfileHandler implements ICommandHandler<UpdateProfileCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(UpdateProfileHandler.name);
  }

  async execute(command: UpdateProfileCommand): Promise<OwnProfileResponse> {
    const { userId, dto } = command;
    const { fullName, primaryIntent, ...profileFields } = dto;

    await this.prisma.runTransaction(async (tx) => {
      const userUpdate: Prisma.UserUpdateInput = {};
      if (fullName !== undefined) userUpdate.fullName = fullName;
      if (primaryIntent !== undefined) userUpdate.primaryIntent = primaryIntent;

      if (Object.keys(userUpdate).length > 0) {
        await tx.user.update({ where: { id: userId }, data: userUpdate });
      }

      const profilePatch: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(profileFields)) {
        if (val !== undefined) profilePatch[key] = val;
      }

      if (Object.keys(profilePatch).length > 0) {
        await tx.userProfile.upsert({
          where: { userId },
          create: { userId, ...profilePatch } as Prisma.UserProfileUncheckedCreateInput,
          update: profilePatch as Prisma.UserProfileUpdateInput,
        });
      }
    });

    this.logger.log('Profile updated', { userId });

    const user = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        email: true,
        fullName: true,
        status: true,
        primaryIntent: true,
        emailVerifiedAt: true,
        twoFaEnabled: true,
        twoFaMethod: true,
        createdAt: true,
        profile: {
          select: {
            avatarUrl: true,
            bio: true,
            occupation: true,
            industry: true,
            role: true,
            locationText: true,
            locationCountry: true,
            locationCity: true,
            nationality: true,
            investmentExperience: true,
            isVerified: true,
            verifiedAt: true,
          },
        },
        interests: { select: { interest: true } },
        subscription: { select: { status: true, currentPeriodEnd: true } },
      },
    });

    if (!user) throw new ResourceNotFoundException('User', userId);

    return { ...user, interests: user.interests.map((i) => i.interest) };
  }
}
