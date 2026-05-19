import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { GetMyProfileQuery } from './get-my-profile.query';
import { PrismaService } from '../../../../database/prisma.service';
import { OwnProfileResponse } from '../../types/user-profile.types';
import { ResourceNotFoundException } from '../../../../common/exceptions/app.exceptions';

@QueryHandler(GetMyProfileQuery)
export class GetMyProfileHandler implements IQueryHandler<GetMyProfileQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetMyProfileQuery): Promise<OwnProfileResponse> {
    const { userId } = query;

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
