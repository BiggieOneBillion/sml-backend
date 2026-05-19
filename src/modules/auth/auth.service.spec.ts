import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserStatus } from '@prisma/client';

import { AuthService } from './auth.service';
import { PrismaService } from '../../database/prisma.service';
import { AppConfigService } from '../../config/app-config.service';
import { AppLogger } from '../../logger/app-logger.service';
import {
  DuplicateEmailException,
  InvalidCredentialsException,
  EmailNotVerifiedException,
  BusinessRuleException,
} from '../../common/exceptions/app.exceptions';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  emailVerificationToken: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    deleteMany: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  runTransaction: jest.fn().mockImplementation((fn) => fn(mockPrismaService)),
};

const mockJwtService = {
  signAsync: jest.fn().mockResolvedValue('mock.jwt.token'),
  verify: jest.fn(),
};

const mockConfigService = {
  jwt: {
    accessSecret: 'test-access-secret',
    refreshSecret: 'test-refresh-secret',
    accessExpiresIn: '15m',
    refreshExpiresIn: '30d',
  },
  security: { bcryptRounds: 10 },
};

const mockLogger = {
  setContext: jest.fn().mockReturnThis(),
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

// ── Test Suite ────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: AppConfigService, useValue: mockConfigService },
        { provide: AppLogger, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
  });

  // ── register() ───────────────────────────────────────────────────────────

  describe('register()', () => {
    const dto = {
      fullName: 'Test User',
      email: 'test@example.com',
      password: 'Password1!',
      agreedToTerms: true as const,
    };
    const ip = '127.0.0.1';

    it('should create a user and return userId with success message', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.runTransaction.mockImplementation(async (fn: any) => {
        const result = await fn(prisma);
        return result;
      });
      prisma.user.create.mockResolvedValue({
        id: 'user-uuid-123',
        email: dto.email,
        fullName: dto.fullName,
        status: UserStatus.PENDING_VERIFICATION,
      });
      prisma.emailVerificationToken.create.mockResolvedValue({
        id: 'token-uuid',
        token: 'verification-token-uuid',
      });

      const result = await service.register(dto, ip);

      expect(result.userId).toBe('user-uuid-123');
      expect(result.message).toContain('Verification email sent');
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: dto.email,
            fullName: dto.fullName,
            status: UserStatus.PENDING_VERIFICATION,
            agreedToTermsAt: expect.any(Date),
            agreedToTermsIp: ip,
          }),
        }),
      );
    });

    it('should throw DuplicateEmailException if email already exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing-user' });

      await expect(service.register(dto, ip)).rejects.toThrow(DuplicateEmailException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('should hash the password before storing', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.runTransaction.mockImplementation(async (fn: any) => fn(prisma));
      prisma.user.create.mockResolvedValue({ id: 'uid', email: dto.email, fullName: dto.fullName, status: UserStatus.PENDING_VERIFICATION });
      prisma.emailVerificationToken.create.mockResolvedValue({ id: 't', token: 'tok' });

      await service.register(dto, ip);

      const createCall = prisma.user.create.mock.calls[0][0];
      const storedHash = createCall.data.passwordHash;

      // Hash must not be the plain password
      expect(storedHash).not.toBe(dto.password);
      // Hash must be a valid bcrypt hash
      const isValid = await bcrypt.compare(dto.password, storedHash);
      expect(isValid).toBe(true);
    });
  });

  // ── login() ───────────────────────────────────────────────────────────────

  describe('login()', () => {
    const password = 'Password1!';
    const dto = {
      email: 'test@example.com',
      password,
    };
    const ip = '127.0.0.1';

    it('should return auth result with tokens on valid credentials', async () => {
      const hash = await bcrypt.hash(password, 10);
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-id',
        email: dto.email,
        fullName: 'Test User',
        passwordHash: hash,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
      });
      prisma.refreshToken.create.mockResolvedValue({});
      prisma.refreshToken.deleteMany.mockResolvedValue({});

      const result = await service.login(dto, ip);

      expect(result.user.email).toBe(dto.email);
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
      expect(result.tokens.expiresIn).toBe(900); // 15 minutes
    });

    it('should throw InvalidCredentialsException for wrong password', async () => {
      const hash = await bcrypt.hash('correct-password', 10);
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-id',
        email: dto.email,
        passwordHash: hash,
        status: UserStatus.ACTIVE,
      });

      await expect(service.login(dto, ip)).rejects.toThrow(InvalidCredentialsException);
    });

    it('should throw InvalidCredentialsException for non-existent email (no user enumeration)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      // Should throw same exception — not reveal whether user exists
      await expect(service.login(dto, ip)).rejects.toThrow(InvalidCredentialsException);
    });

    it('should throw EmailNotVerifiedException for unverified user', async () => {
      const hash = await bcrypt.hash(password, 10);
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-id',
        email: dto.email,
        passwordHash: hash,
        status: UserStatus.PENDING_VERIFICATION,
        emailVerifiedAt: null,
      });

      await expect(service.login(dto, ip)).rejects.toThrow(EmailNotVerifiedException);
    });

    it('should throw BusinessRuleException for suspended accounts', async () => {
      const hash = await bcrypt.hash(password, 10);
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-id',
        email: dto.email,
        passwordHash: hash,
        status: UserStatus.SUSPENDED,
      });

      await expect(service.login(dto, ip)).rejects.toThrow(BusinessRuleException);
    });
  });

  // ── resendVerification() ──────────────────────────────────────────────────

  describe('resendVerification()', () => {
    it('should return safe message even if email does not exist (prevent enumeration)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.resendVerification({ email: 'nonexistent@test.com' });

      expect(result.message).toContain('If an account with that email exists');
      expect(prisma.emailVerificationToken.create).not.toHaveBeenCalled();
    });

    it('should throw rate limit exception after 3 resends in an hour', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-id',
        status: UserStatus.PENDING_VERIFICATION,
        emailVerifiedAt: null,
      });
      prisma.emailVerificationToken.count.mockResolvedValue(3); // already at limit

      await expect(
        service.resendVerification({ email: 'test@example.com' }),
      ).rejects.toThrow(BusinessRuleException);
    });
  });
});
