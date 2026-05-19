import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AccessTokenStrategy } from './strategies/jwt-access.strategy';
import { AppConfigService } from '../../config/app-config.service';
import { AppLogger } from '../../logger/app-logger.service';

/**
 * AuthModule encapsulates all authentication logic.
 *
 * JwtModule is registered asynchronously so it can read config from
 * AppConfigService (which is already available via the global ConfigModule).
 *
 * The module does NOT export JwtModule — other modules should not sign tokens
 * directly. Only AuthService should issue tokens.
 */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        // Note: We sign with different secrets per token type in AuthService.
        // This default secret is used only as a fallback by JwtService.sign().
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
  ],
  exports: [AuthService],
})
export class AuthModule {}
