import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Prisma, UserStatus } from '@prisma/client';

import { GetUsersQuery } from './get-users.query';
import { PrismaService } from '../../../../database/prisma.service';
import { UsersService } from '../../users.service';
import { ResponseBuilder } from '../../../../common/types/api-response.types';
import { toPrismaPage } from '../../../../common/utils/helpers';
import { PublicUserSummary, PublicUserDetail } from '../../types/user-profile.types';

@QueryHandler(GetUsersQuery)
export class GetUsersHandler implements IQueryHandler<GetUsersQuery> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async execute(query: GetUsersQuery) {
    const { requesterId, query: q } = query;

    const isPremium = await this.usersService.isUserPremium(requesterId);

    const andClauses: Prisma.UserWhereInput[] = [
      { deletedAt: null, status: UserStatus.ACTIVE, NOT: { id: requesterId } },
    ];

    if (q.q) {
      andClauses.push({
        OR: [
          { fullName: { contains: q.q, mode: 'insensitive' } },
          { profile: { occupation: { contains: q.q, mode: 'insensitive' } } },
        ],
      });
    }

    const profileFilter: Prisma.UserProfileWhereInput = {};
    if (q.role) profileFilter.role = q.role;
    if (q.industry) profileFilter.industry = q.industry;
    if (q.country) profileFilter.locationCountry = q.country;

    if (Object.keys(profileFilter).length > 0) {
      andClauses.push({ profile: profileFilter });
    }

    const where: Prisma.UserWhereInput = { AND: andClauses };
    const { skip, take } = toPrismaPage({ page: q.page, limit: q.limit });

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
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
      this.prisma.user.count({ where }),
    ]);

    const data = users.map((u): PublicUserSummary | PublicUserDetail => {
      const base: PublicUserSummary = {
        id: u.id,
        fullName: u.fullName,
        avatarUrl: u.profile?.avatarUrl ?? null,
        role: u.profile?.role ?? null,
        industry: u.profile?.industry ?? null,
        locationCountry: u.profile?.locationCountry ?? null,
        isVerified: u.profile?.isVerified ?? false,
      };

      if (!isPremium) return base;

      return {
        ...base,
        bio: u.profile?.bio ?? null,
        occupation: u.profile?.occupation ?? null,
        locationText: u.profile?.locationText ?? null,
        locationCity: u.profile?.locationCity ?? null,
        nationality: u.profile?.nationality ?? null,
        investmentExperience: u.profile?.investmentExperience ?? null,
        interests: u.interests.map((i) => i.interest),
        verifiedAt: u.profile?.verifiedAt ?? null,
      };
    });

    return ResponseBuilder.paginated(data, { page: q.page, limit: q.limit, total });
  }
}
