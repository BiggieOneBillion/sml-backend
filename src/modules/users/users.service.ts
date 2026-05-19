import { Injectable } from '@nestjs/common';
import { Prisma, SubscriptionStatus, UserStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

import { PrismaService } from '../../database/prisma.service';
import { AppConfigService } from '../../config/app-config.service';
import { AppLogger } from '../../logger/app-logger.service';
import {
  BusinessRuleException,
  ResourceNotFoundException,
} from '../../common/exceptions/app.exceptions';
import { ResponseBuilder } from '../../common/types/api-response.types';
import { toPrismaPage } from '../../common/utils/helpers';

import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateInterestsDto } from './dto/update-interests.dto';
import { UpdateSecurityDto } from './dto/update-security.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { ConfirmAvatarDto, RequestAvatarUploadDto } from './dto/avatar.dto';
import {
  OwnProfileResponse,
  PublicUserDetail,
  PublicUserSummary,
} from './types/user-profile.types';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(UsersService.name);
  }

  // ── Own Profile ───────────────────────────────────────────────────────────

  async getMyProfile(userId: string): Promise<OwnProfileResponse> {
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

    if (!user) {
      throw new ResourceNotFoundException('User', userId);
    }

    return { ...user, interests: user.interests.map((i) => i.interest) };
  }

  async updateMyProfile(userId: string, dto: UpdateProfileDto): Promise<OwnProfileResponse> {
    const { fullName, primaryIntent, ...profileFields } = dto;

    await this.prisma.runTransaction(async (tx) => {
      // Update User-level fields
      const userUpdate: Prisma.UserUpdateInput = {};
      if (fullName !== undefined) userUpdate.fullName = fullName;
      if (primaryIntent !== undefined) userUpdate.primaryIntent = primaryIntent;

      if (Object.keys(userUpdate).length > 0) {
        await tx.user.update({ where: { id: userId }, data: userUpdate });
      }

      // Build profile patch from non-undefined fields only
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

    return this.getMyProfile(userId);
  }

  // ── Interests ─────────────────────────────────────────────────────────────

  async updateInterests(
    userId: string,
    dto: UpdateInterestsDto,
  ): Promise<{ interests: UpdateInterestsDto['interests'] }> {
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

  // ── Security ──────────────────────────────────────────────────────────────

  async updateSecurity(
    userId: string,
    dto: UpdateSecurityDto,
  ): Promise<{ twoFaEnabled: boolean; twoFaMethod: string | null }> {
    const update: Prisma.UserUpdateInput = { twoFaEnabled: dto.twoFaEnabled };

    if (dto.twoFaEnabled) {
      update.twoFaMethod = dto.twoFaMethod;
    } else {
      // Disabling: clear method and secret
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

  // ── User Discovery ────────────────────────────────────────────────────────

  async getUsers(requesterId: string, query: QueryUsersDto) {
    const isPremium = await this.isUserPremium(requesterId);

    // Build where clause incrementally to keep it type-safe
    const andClauses: Prisma.UserWhereInput[] = [
      { deletedAt: null, status: UserStatus.ACTIVE, NOT: { id: requesterId } },
    ];

    if (query.q) {
      andClauses.push({
        OR: [
          { fullName: { contains: query.q, mode: 'insensitive' } },
          { profile: { occupation: { contains: query.q, mode: 'insensitive' } } },
        ],
      });
    }

    const profileFilter: Prisma.UserProfileWhereInput = {};
    if (query.role) profileFilter.role = query.role;
    if (query.industry) profileFilter.industry = query.industry;
    if (query.country) profileFilter.locationCountry = query.country;

    if (Object.keys(profileFilter).length > 0) {
      andClauses.push({ profile: profileFilter });
    }

    const where: Prisma.UserWhereInput = { AND: andClauses };
    const { skip, take } = toPrismaPage({ page: query.page, limit: query.limit });

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

    return ResponseBuilder.paginated(data, { page: query.page, limit: query.limit, total });
  }

  async getUserById(
    requesterId: string,
    targetId: string,
  ): Promise<OwnProfileResponse | PublicUserSummary | PublicUserDetail> {
    if (requesterId === targetId) {
      return this.getMyProfile(requesterId);
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
      this.isUserPremium(requesterId),
    ]);

    if (!target) {
      throw new ResourceNotFoundException('User', targetId);
    }

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

  // ── Avatar Upload ─────────────────────────────────────────────────────────

  async requestAvatarUpload(
    userId: string,
    dto: RequestAvatarUploadDto,
  ): Promise<{ uploadUrl: string; key: string }> {
    const ext = dto.contentType.split('/')[1];
    const key = `avatars/${userId}/${uuidv4()}.${ext}`;
    const uploadUrl = await this.generatePresignedUploadUrl(key, dto.contentType, dto.fileSizeBytes);
    return { uploadUrl, key };
  }

  async confirmAvatar(userId: string, dto: ConfirmAvatarDto): Promise<{ avatarUrl: string }> {
    this.validateAvatarUrl(dto.avatarUrl);

    await this.prisma.userProfile.upsert({
      where: { userId },
      create: { userId, avatarUrl: dto.avatarUrl },
      update: { avatarUrl: dto.avatarUrl },
    });

    this.logger.log('Avatar updated', { userId });

    return { avatarUrl: dto.avatarUrl };
  }

  // ── Private Helpers ───────────────────────────────────────────────────────

  private async isUserPremium(userId: string): Promise<boolean> {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
      select: { status: true },
    });
    return sub?.status === SubscriptionStatus.ACTIVE;
  }

  private validateAvatarUrl(url: string): void {
    const { publicBucket, cloudfrontUrl } = this.config.s3;
    const region = this.config.aws.region;

    const allowed = [
      `https://${publicBucket}.s3.${region}.amazonaws.com/avatars/`,
      `https://${publicBucket}.s3.amazonaws.com/avatars/`,
      `https://s3.${region}.amazonaws.com/${publicBucket}/avatars/`,
    ];

    if (cloudfrontUrl) allowed.push(`${cloudfrontUrl}/avatars/`);

    if (!allowed.some((prefix) => url.startsWith(prefix))) {
      throw new BusinessRuleException(
        'INVALID_AVATAR_URL',
        'Avatar URL must point to our storage service.',
      );
    }
  }

  private async generatePresignedUploadUrl(
    key: string,
    contentType: string,
    fileSizeBytes: number,
  ): Promise<string> {
    const { accessKeyId, secretAccessKey, region } = this.config.aws;

    if (!accessKeyId || !secretAccessKey) {
      throw new BusinessRuleException(
        'STORAGE_NOT_CONFIGURED',
        'File upload is not available. Please contact support.',
      );
    }

    try {
      // Requires: npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

      const s3 = new S3Client({ region, credentials: { accessKeyId, secretAccessKey } });
      const command = new PutObjectCommand({
        Bucket: this.config.s3.publicBucket,
        Key: key,
        ContentType: contentType,
        ContentLength: fileSizeBytes,
      });

      return getSignedUrl(s3, command, { expiresIn: 900 });
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === 'MODULE_NOT_FOUND') {
        throw new BusinessRuleException(
          'STORAGE_NOT_CONFIGURED',
          'File upload is not available. Please contact support.',
        );
      }
      throw err;
    }
  }
}
