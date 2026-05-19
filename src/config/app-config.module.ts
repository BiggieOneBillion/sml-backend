import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppConfigService } from './app-config.service';
import { validateEnv } from './env.validation';

/**
 * @Global() — ConfigModule is needed everywhere; making it global
 * avoids importing it in every feature module.
 */
@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      // In production, env vars come from the runtime environment (ECS, K8s secrets)
      // In development/test, load from .env file
      envFilePath: ['.env.local', '.env'],
      cache: true, // Parse once, serve cached — config never changes at runtime
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
