import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { CqrsModule } from '@nestjs/cqrs';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AccessTokenStrategy } from './strategies/jwt-access.strategy';
import { AppConfigService } from '../../config/app-config.service';
import { AppLogger } from '../../logger/app-logger.service';
import { EmailModule } from '../email/email.module';

import { RegisterHandler } from './commands/register/register.handler';
import { VerifyEmailHandler } from './commands/verify-email/verify-email.handler';
import { ResendVerificationHandler } from './commands/resend-verification/resend-verification.handler';
import { LoginHandler } from './commands/login/login.handler';
import { RefreshTokensHandler } from './commands/refresh-tokens/refresh-tokens.handler';
import { LogoutHandler } from './commands/logout/logout.handler';

const CommandHandlers = [
  RegisterHandler,
  VerifyEmailHandler,
  ResendVerificationHandler,
  LoginHandler,
  RefreshTokensHandler,
  LogoutHandler,
];

@Module({
  imports: [
    CqrsModule,
    EmailModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        secret: config.jwt.accessSecret,
        signOptions: { expiresIn: config.jwt.accessExpiresIn as any },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AccessTokenStrategy,
    AppLogger,
    ...CommandHandlers,
  ],
  exports: [AuthService],
})
export class AuthModule {}
