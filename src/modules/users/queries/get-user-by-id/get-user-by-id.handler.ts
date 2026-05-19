import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { UserStatus } from '@prisma/client';

import { GetUserByIdQuery } from './get-user-by-id.query';
import { PrismaService } from '../../../../database/prisma.service';
import { UsersService } from '../../users.service';
import { ResourceNotFoundException } from '../../../../common/exceptions/app.exceptions';
import {
  OwnProfileResponse,
  PublicUserSummary,
  PublicUserDetail,
} from '../../types/user-profile.types';

@QueryHandler(GetUserByIdQuery)
export class GetUserByIdHandler implements IQueryHandler<GetUserByIdQuery> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async execute(query: GetUserByIdQuery): Promise<OwnProfileResponse | PublicUserSummary | PublicUserDetail> {
    const { requesterId, targetId } = query;

    if (requesterId === targetId) {
      const user = await this.prisma.user.findUnique({
        where: { id: requesterId, deletedAt: null },
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

      if (!user) throw new ResourceNotFoundException('User', requesterId);

      return { ...user, interests: user.interests.map((i) => i.interest) };
    }

    const [target, isPremium] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: targetId, deletedAt: null, status: UserStatus.ACTIVE },
        select: {
          id: true,
          fullName: true,
          profile: {
            select: {
              avatarUrl: true,
              role: true,
              industry: true,
              locationCountry: true,
              isVerified: true,
              bio: true,
              occupation: true,
              locationText: true,
              locationCity: true,
              nationality: true,
              investmentExperience: true,
              verifiedAt: true,
            },
          },
          interests: { select: { interest: true } },
        },
      }),
      this.usersService.isUserPremium(requesterId),
    ]);

    if (!target) throw new ResourceNotFoundException('User', targetId);

    const base: PublicUserSummary = {
      id: target.id,
      fullName: target.fullName,
      avatarUrl: target.profile?.avatarUrl ?? null,
      role: target.profile?.role ?? null,
      industry: target.profile?.industry ?? null,
      locationCountry: target.profile?.locationCountry ?? null,
      isVerified: target.profile?.isVerified ?? false,
    };

    if (!isPremium) return base;

    return {
      ...base,
      bio: target.profile?.bio ?? null,
      occupation: target.profile?.occupation ?? null,
      locationText: target.profile?.locationText ?? null,
      locationCity: target.profile?.locationCity ?? null,
      nationality: target.profile?.nationality ?? null,
      investmentExperience: target.profile?.investmentExperience ?? null,
      interests: target.interests.map((i) => i.interest),
      verifiedAt: target.profile?.verifiedAt ?? null,
    };
  }
}
