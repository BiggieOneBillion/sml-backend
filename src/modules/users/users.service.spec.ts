import { Test, TestingModule } from '@nestjs/testing';
import { Industry, SubscriptionStatus, TwoFaMethod, UserRole, UserStatus } from '@prisma/client';

import { UsersService } from './users.service';
import { PrismaService } from '../../database/prisma.service';
import { AppConfigService } from '../../config/app-config.service';
import { AppLogger } from '../../logger/app-logger.service';
import {
  BusinessRuleException,
  ResourceNotFoundException,
} from '../../common/exceptions/app.exceptions';

import { GetMyProfileHandler } from './queries/get-my-profile/get-my-profile.handler';
import { GetUsersHandler } from './queries/get-users/get-users.handler';
import { GetUserByIdHandler } from './queries/get-user-by-id/get-user-by-id.handler';
import { UpdateProfileHandler } from './commands/update-profile/update-profile.handler';
import { UpdateInterestsHandler } from './commands/update-interests/update-interests.handler';
import { UpdateSecurityHandler } from './commands/update-security/update-security.handler';
import { ConfirmAvatarHandler } from './commands/confirm-avatar/confirm-avatar.handler';

import { GetMyProfileQuery } from './queries/get-my-profile/get-my-profile.query';
import { GetUsersQuery } from './queries/get-users/get-users.query';
import { GetUserByIdQuery } from './queries/get-user-by-id/get-user-by-id.query';
import { UpdateProfileCommand } from './commands/update-profile/update-profile.command';
import { UpdateInterestsCommand } from './commands/update-interests/update-interests.command';
import { UpdateSecurityCommand } from './commands/update-security/update-security.command';
import { ConfirmAvatarCommand } from './commands/confirm-avatar/confirm-avatar.command';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
  userProfile: {
    upsert: jest.fn(),
  },
  userInterest: {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  },
  subscription: {
    findUnique: jest.fn(),
  },
  runTransaction: jest.fn().mockImplementation((fn: (tx: typeof mockPrismaService) => unknown) =>
    fn(mockPrismaService),
  ),
};

const mockConfigService = {
  aws: { region: 'us-east-1', accessKeyId: undefined, secretAccessKey: undefined },
  s3: { publicBucket: 'sml-public', privateBucket: 'sml-private', cloudfrontUrl: undefined },
};

const mockLogger = {
  setContext: jest.fn().mockReturnThis(),
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

// ── Fixtures ──────────────────────────────────────────────────────────────────

const userId = 'user-uuid-1';

const fullUserRecord = {
  id: userId,
  email: 'user@example.com',
  fullName: 'Test User',
  status: UserStatus.ACTIVE,
  primaryIntent: 'BROWSE',
  emailVerifiedAt: new Date(),
  twoFaEnabled: false,
  twoFaMethod: null,
  createdAt: new Date(),
  profile: {
    avatarUrl: null,
    bio: null,
    occupation: null,
    industry: null,
    role: null,
    locationText: null,
    locationCountry: null,
    locationCity: null,
    nationality: null,
    investmentExperience: null,
    isVerified: false,
    verifiedAt: null,
  },
  interests: [],
  subscription: null,
};

// ── Test Suite ────────────────────────────────────────────────────────────────

describe('Users Command & Query Handlers', () => {
  let getMyProfileHandler: GetMyProfileHandler;
  let getUsersHandler: GetUsersHandler;
  let getUserByIdHandler: GetUserByIdHandler;
  let updateProfileHandler: UpdateProfileHandler;
  let updateInterestsHandler: UpdateInterestsHandler;
  let updateSecurityHandler: UpdateSecurityHandler;
  let confirmAvatarHandler: ConfirmAvatarHandler;
  let usersService: UsersService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        GetMyProfileHandler,
        GetUsersHandler,
        GetUserByIdHandler,
        UpdateProfileHandler,
        UpdateInterestsHandler,
        UpdateSecurityHandler,
        ConfirmAvatarHandler,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AppConfigService, useValue: mockConfigService },
        { provide: AppLogger, useValue: mockLogger },
      ],
    }).compile();

    getMyProfileHandler = module.get(GetMyProfileHandler);
    getUsersHandler = module.get(GetUsersHandler);
    getUserByIdHandler = module.get(GetUserByIdHandler);
    updateProfileHandler = module.get(UpdateProfileHandler);
    updateInterestsHandler = module.get(UpdateInterestsHandler);
    updateSecurityHandler = module.get(UpdateSecurityHandler);
    confirmAvatarHandler = module.get(ConfirmAvatarHandler);
    usersService = module.get(UsersService);
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
  });

  // ── GetMyProfileHandler ───────────────────────────────────────────────────

  describe('GetMyProfileHandler', () => {
    it('should return the full profile with mapped interests', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...fullUserRecord,
        interests: [{ interest: Industry.TECHNOLOGY }, { interest: Industry.STARTUPS }],
      });

      const result = await getMyProfileHandler.execute(new GetMyProfileQuery(userId));

      expect(result.id).toBe(userId);
      expect(result.interests).toEqual([Industry.TECHNOLOGY, Industry.STARTUPS]);
      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: userId, deletedAt: null } }),
      );
    });

    it('should throw ResourceNotFoundException when user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(getMyProfileHandler.execute(new GetMyProfileQuery(userId))).rejects.toThrow(
        ResourceNotFoundException,
      );
    });

    it('should never select passwordHash or twoFaSecret', async () => {
      prisma.user.findUnique.mockResolvedValue(fullUserRecord);
      await getMyProfileHandler.execute(new GetMyProfileQuery(userId));

      const selectArg = prisma.user.findUnique.mock.calls[0][0].select;
      expect(selectArg).not.toHaveProperty('passwordHash');
      expect(selectArg).not.toHaveProperty('twoFaSecret');
    });
  });

  // ── UpdateProfileHandler ──────────────────────────────────────────────────

  describe('UpdateProfileHandler', () => {
    beforeEach(() => {
      prisma.user.findUnique.mockResolvedValue(fullUserRecord);
      prisma.user.update.mockResolvedValue({});
      prisma.userProfile.upsert.mockResolvedValue({});
    });

    it('should update user-level fields (fullName)', async () => {
      await updateProfileHandler.execute(new UpdateProfileCommand(userId, { fullName: 'New Name' }));

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ fullName: 'New Name' }) }),
      );
    });

    it('should upsert profile fields (bio, occupation)', async () => {
      await updateProfileHandler.execute(
        new UpdateProfileCommand(userId, { bio: 'My bio', occupation: 'Engineer' }),
      );

      expect(prisma.userProfile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId },
          update: expect.objectContaining({ bio: 'My bio', occupation: 'Engineer' }),
        }),
      );
    });

    it('should allow setting nullable profile fields to null', async () => {
      await updateProfileHandler.execute(new UpdateProfileCommand(userId, { bio: null }));

      expect(prisma.userProfile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ bio: null }),
        }),
      );
    });

    it('should not update fields that were not provided (undefined)', async () => {
      await updateProfileHandler.execute(
        new UpdateProfileCommand(userId, { fullName: 'Only Name' }),
      );

      expect(prisma.userProfile.upsert).not.toHaveBeenCalled();
    });

    it('should not update user record when only profile fields are provided', async () => {
      await updateProfileHandler.execute(new UpdateProfileCommand(userId, { bio: 'Bio only' }));

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should run both updates inside a transaction', async () => {
      await updateProfileHandler.execute(
        new UpdateProfileCommand(userId, { fullName: 'Name', bio: 'Bio' }),
      );

      expect(prisma.runTransaction).toHaveBeenCalledTimes(1);
    });
  });

  // ── UpdateInterestsHandler ────────────────────────────────────────────────

  describe('UpdateInterestsHandler', () => {
    beforeEach(() => {
      prisma.userInterest.deleteMany.mockResolvedValue({ count: 2 });
      prisma.userInterest.createMany.mockResolvedValue({ count: 2 });
    });

    it('should replace all interests atomically', async () => {
      const dto = { interests: [Industry.TECHNOLOGY, Industry.STARTUPS] };
      const result = await updateInterestsHandler.execute(new UpdateInterestsCommand(userId, dto));

      expect(prisma.userInterest.deleteMany).toHaveBeenCalledWith({ where: { userId } });
      expect(prisma.userInterest.createMany).toHaveBeenCalledWith({
        data: [
          { userId, interest: Industry.TECHNOLOGY },
          { userId, interest: Industry.STARTUPS },
        ],
      });
      expect(result.interests).toEqual([Industry.TECHNOLOGY, Industry.STARTUPS]);
    });

    it('should deduplicate interests before saving', async () => {
      const dto = {
        interests: [Industry.TECHNOLOGY, Industry.TECHNOLOGY, Industry.STARTUPS],
      };
      await updateInterestsHandler.execute(new UpdateInterestsCommand(userId, dto));

      const createCall = prisma.userInterest.createMany.mock.calls[0][0];
      expect(createCall.data).toHaveLength(2);
    });

    it('should run inside a transaction', async () => {
      await updateInterestsHandler.execute(
        new UpdateInterestsCommand(userId, { interests: [Industry.EDUCATION] }),
      );
      expect(prisma.runTransaction).toHaveBeenCalledTimes(1);
    });
  });

  // ── UpdateSecurityHandler ─────────────────────────────────────────────────

  describe('UpdateSecurityHandler', () => {
    it('should enable 2FA and set the method', async () => {
      prisma.user.update.mockResolvedValue({
        twoFaEnabled: true,
        twoFaMethod: TwoFaMethod.SMS,
      });

      const result = await updateSecurityHandler.execute(
        new UpdateSecurityCommand(userId, { twoFaEnabled: true, twoFaMethod: TwoFaMethod.SMS }),
      );

      expect(result.twoFaEnabled).toBe(true);
      expect(result.twoFaMethod).toBe(TwoFaMethod.SMS);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ twoFaEnabled: true, twoFaMethod: TwoFaMethod.SMS }),
        }),
      );
    });

    it('should clear twoFaMethod and twoFaSecret when disabling 2FA', async () => {
      prisma.user.update.mockResolvedValue({ twoFaEnabled: false, twoFaMethod: null });

      await updateSecurityHandler.execute(
        new UpdateSecurityCommand(userId, { twoFaEnabled: false }),
      );

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            twoFaEnabled: false,
            twoFaMethod: null,
            twoFaSecret: null,
          }),
        }),
      );
    });
  });

  // ── GetUsersHandler ───────────────────────────────────────────────────────

  describe('GetUsersHandler', () => {
    const otherUserId = 'other-user-uuid';
    const userRow = {
      id: otherUserId,
      fullName: 'Other User',
      profile: {
        avatarUrl: null,
        role: UserRole.INVESTOR,
        industry: Industry.TECHNOLOGY,
        locationCountry: 'NG',
        isVerified: true,
        bio: 'A bio',
        occupation: 'Trader',
        locationText: 'Lagos',
        locationCity: 'Lagos',
        nationality: 'Nigerian',
        investmentExperience: '5 years',
        verifiedAt: new Date(),
      },
      interests: [{ interest: Industry.TECHNOLOGY }],
    };

    beforeEach(() => {
      prisma.user.findMany.mockResolvedValue([userRow]);
      prisma.user.count.mockResolvedValue(1);
    });

    it('should return only summary fields for non-premium users', async () => {
      prisma.subscription.findUnique.mockResolvedValue(null);

      const result = await getUsersHandler.execute(
        new GetUsersQuery(userId, { page: 1, limit: 20 }),
      );

      const item = result.data[0] as unknown as Record<string, unknown>;
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('fullName');
      expect(item).toHaveProperty('isVerified');
      expect(item).not.toHaveProperty('bio');
      expect(item).not.toHaveProperty('interests');
    });

    it('should return full detail fields for premium users', async () => {
      prisma.subscription.findUnique.mockResolvedValue({ status: SubscriptionStatus.ACTIVE });

      const result = await getUsersHandler.execute(
        new GetUsersQuery(userId, { page: 1, limit: 20 }),
      );

      const item = result.data[0] as unknown as Record<string, unknown>;
      expect(item).toHaveProperty('bio');
      expect(item).toHaveProperty('interests');
      expect(item).toHaveProperty('nationality');
    });

    it('should exclude the requesting user from results', async () => {
      prisma.subscription.findUnique.mockResolvedValue(null);
      await getUsersHandler.execute(new GetUsersQuery(userId, { page: 1, limit: 20 }));

      const whereArg = prisma.user.findMany.mock.calls[0][0].where;
      expect(JSON.stringify(whereArg)).toContain(userId);
    });

    it('should include pagination meta in the response', async () => {
      prisma.subscription.findUnique.mockResolvedValue(null);
      prisma.user.count.mockResolvedValue(42);

      const result = await getUsersHandler.execute(
        new GetUsersQuery(userId, { page: 2, limit: 10 }),
      );

      expect(result.meta).toMatchObject({ page: 2, limit: 10, total: 42 });
    });
  });

  // ── GetUserByIdHandler ────────────────────────────────────────────────────

  describe('GetUserByIdHandler', () => {
    it('should return own full profile when targetId equals requesterId', async () => {
      prisma.user.findUnique.mockResolvedValue(fullUserRecord);

      const result = await getUserByIdHandler.execute(new GetUserByIdQuery(userId, userId));

      expect(result).toHaveProperty('email');
    });

    it('should return summary for non-premium when viewing another user', async () => {
      const targetId = 'target-user-uuid';
      prisma.user.findUnique.mockResolvedValue({
        id: targetId,
        fullName: 'Target',
        profile: {
          avatarUrl: null,
          role: null,
          industry: null,
          locationCountry: null,
          isVerified: false,
          bio: 'secret',
          occupation: null,
          locationText: null,
          locationCity: null,
          nationality: null,
          investmentExperience: null,
          verifiedAt: null,
        },
        interests: [],
      });
      prisma.subscription.findUnique.mockResolvedValue(null);

      const result = (await getUserByIdHandler.execute(
        new GetUserByIdQuery(userId, targetId),
      )) as unknown as Record<string, unknown>;

      expect(result).not.toHaveProperty('email');
      expect(result).not.toHaveProperty('bio');
    });

    it('should throw ResourceNotFoundException for non-existent user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.subscription.findUnique.mockResolvedValue(null);

      await expect(
        getUserByIdHandler.execute(new GetUserByIdQuery(userId, 'ghost-id')),
      ).rejects.toThrow(ResourceNotFoundException);
    });
  });

  // ── ConfirmAvatarHandler (via UsersService.validateAvatarUrl) ─────────────

  describe('ConfirmAvatarHandler', () => {
    beforeEach(() => {
      prisma.userProfile.upsert.mockResolvedValue({});
    });

    it('should update avatar URL when it points to the configured S3 bucket', async () => {
      const avatarUrl = `https://sml-public.s3.us-east-1.amazonaws.com/avatars/${userId}/photo.jpg`;

      const result = await confirmAvatarHandler.execute(
        new ConfirmAvatarCommand(userId, { avatarUrl }),
      );

      expect(result.avatarUrl).toBe(avatarUrl);
      expect(prisma.userProfile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: { avatarUrl } }),
      );
    });

    it('should throw BusinessRuleException for a URL not from our S3 bucket', async () => {
      await expect(
        confirmAvatarHandler.execute(
          new ConfirmAvatarCommand(userId, { avatarUrl: 'https://evil.com/fake.jpg' }),
        ),
      ).rejects.toThrow(BusinessRuleException);

      expect(prisma.userProfile.upsert).not.toHaveBeenCalled();
    });
  });

  // ── UsersService.generatePresignedUploadUrl ───────────────────────────────

  describe('UsersService.generatePresignedUploadUrl', () => {
    it('should throw BusinessRuleException when AWS credentials are not configured', async () => {
      await expect(
        usersService.generatePresignedUploadUrl('avatars/test/file.jpg', 'image/jpeg', 1024),
      ).rejects.toThrow(BusinessRuleException);
    });
  });
});
