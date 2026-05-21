import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  UsePipes,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CommandBus } from '@nestjs/cqrs';
import { Request } from 'express';
import { Throttle } from '@nestjs/throttler';

import {
  RegisterSchema,
  LoginSchema,
  RefreshTokenSchema,
  VerifyEmailSchema,
  ResendVerificationSchema,
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  VerifyEmailDto,
  ResendVerificationDto,
} from './dto/auth.dto';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ApiZodBody } from './dto/zod-dto.helper';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtPayload } from './strategies/jwt-access.strategy';
import { RegisterCommand } from './commands/register/register.command';
import { VerifyEmailCommand } from './commands/verify-email/verify-email.command';
import { ResendVerificationCommand } from './commands/resend-verification/resend-verification.command';
import { LoginCommand } from './commands/login/login.command';
import { RefreshTokensCommand } from './commands/refresh-tokens/refresh-tokens.command';
import { LogoutCommand } from './commands/logout/logout.command';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly commandBus: CommandBus) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UsePipes(new ZodValidationPipe(RegisterSchema))
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiZodBody(RegisterSchema)
  @ApiResponse({ status: 201, description: 'Account created, verification email sent' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  @ApiResponse({ status: 422, description: 'Validation failed' })
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ?? req.ip ?? 'unknown';
    return this.commandBus.execute(new RegisterCommand(dto.email, dto.fullName, dto.password, ip));
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(VerifyEmailSchema))
  @ApiOperation({ summary: 'Verify email address with token from email link' })
  @ApiZodBody(VerifyEmailSchema)
  @ApiResponse({ status: 200, description: 'Email verified, tokens returned' })
  @ApiResponse({ status: 422, description: 'Invalid or expired token' })
  async verifyEmail(@Body() dto: VerifyEmailDto, @Req() req: Request) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ?? req.ip ?? 'unknown';
    return this.commandBus.execute(new VerifyEmailCommand(dto.token, dto.registrationToken, ip));
  }

  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 3_600_000 } })
  @UsePipes(new ZodValidationPipe(ResendVerificationSchema))
  @ApiOperation({ summary: 'Resend email verification link' })
  @ApiZodBody(ResendVerificationSchema)
  async resendVerification(@Body() dto: ResendVerificationDto) {
    return this.commandBus.execute(new ResendVerificationCommand(dto.email));
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UsePipes(new ZodValidationPipe(LoginSchema))
  @ApiOperation({ summary: 'Login and receive JWT tokens' })
  @ApiZodBody(LoginSchema)
  @ApiResponse({ status: 200, description: 'Login successful, tokens returned' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
  ) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ?? req.ip ?? 'unknown';
    const userAgent = req.headers['user-agent'];
    return this.commandBus.execute(new LoginCommand(dto.email, dto.password, ip, userAgent));
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UsePipes(new ZodValidationPipe(RefreshTokenSchema))
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiZodBody(RefreshTokenSchema)
  @ApiResponse({ status: 200, description: 'New token pair returned' })
  @ApiResponse({ status: 401, description: 'Refresh token invalid or expired' })
  async refreshTokens(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ?? req.ip ?? 'unknown';
    return this.commandBus.execute(new RefreshTokensCommand(dto.refreshToken, ip));
  }

  @Delete('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and revoke refresh token' })
  @ApiZodBody(RefreshTokenSchema)
  @ApiResponse({ status: 204, description: 'Logged out successfully' })
  async logout(
    @CurrentUser() user: JwtPayload,
    @Body() dto: { refreshToken: string },
  ) {
    await this.commandBus.execute(new LogoutCommand(user.sub, dto.refreshToken));
  }
}
