import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from './env.validation';

/**
 * AppConfigService wraps NestJS ConfigService with full type safety.
 *
 * Usage: inject AppConfigService instead of raw ConfigService to get
 * autocomplete and compile-time guarantees on every config access.
 */
@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService<Env, true>) {}

  get nodeEnv(): Env['NODE_ENV'] {
    return this.config.get('NODE_ENV', { infer: true });
  }

  get port(): number {
    return this.config.get('PORT', { infer: true });
  }

  get apiVersion(): string {
    return this.config.get('API_VERSION', { infer: true });
  }

  get appName(): string {
    return this.config.get('APP_NAME', { infer: true });
  }

  get frontendUrl(): string {
    return this.config.get('FRONTEND_URL', { infer: true });
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  get isTest(): boolean {
    return this.nodeEnv === 'test';
  }

  // ── Database ──────────────────────────────────────────────────────────────
  get databaseUrl(): string {
    return this.config.get('DATABASE_URL', { infer: true });
  }

  // ── JWT ───────────────────────────────────────────────────────────────────
  get jwt() {
    return {
      accessSecret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      refreshSecret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
      accessExpiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN', { infer: true }),
      refreshExpiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', { infer: true }),
    };
  }

  // ── Redis ─────────────────────────────────────────────────────────────────
  get redis() {
    return {
      host: this.config.get('REDIS_HOST', { infer: true }),
      port: this.config.get('REDIS_PORT', { infer: true }),
      password: this.config.get('REDIS_PASSWORD', { infer: true }),
      tls: this.config.get('REDIS_TLS', { infer: true }),
    };
  }

  // ── AWS ───────────────────────────────────────────────────────────────────
  get aws() {
    return {
      region: this.config.get('AWS_REGION', { infer: true }),
      accessKeyId: this.config.get('AWS_ACCESS_KEY_ID', { infer: true }),
      secretAccessKey: this.config.get('AWS_SECRET_ACCESS_KEY', { infer: true }),
    };
  }

  get s3() {
    return {
      publicBucket: this.config.get('S3_BUCKET_PUBLIC', { infer: true }),
      privateBucket: this.config.get('S3_BUCKET_PRIVATE', { infer: true }),
      cloudfrontUrl: this.config.get('CLOUDFRONT_URL', { infer: true }),
    };
  }

  // ── Stripe ────────────────────────────────────────────────────────────────
  get stripe() {
    return {
      secretKey: this.config.get('STRIPE_SECRET_KEY', { infer: true }),
      webhookSecret: this.config.get('STRIPE_WEBHOOK_SECRET', { infer: true }),
      investorPriceId: this.config.get('STRIPE_INVESTOR_PRICE_ID', { infer: true }),
    };
  }

  // ── Email ─────────────────────────────────────────────────────────────────
  get email() {
    return {
      apiKey: this.config.get('RESEND_API_KEY', { infer: true }),
      from: this.config.get('EMAIL_FROM', { infer: true }),
    };
  }

  // ── Security ──────────────────────────────────────────────────────────────
  get security() {
    return {
      bcryptRounds: this.config.get('BCRYPT_ROUNDS', { infer: true }),
      cookieSecret: this.config.get('COOKIE_SECRET', { infer: true }),
    };
  }

  // ── Rate Limiting ─────────────────────────────────────────────────────────
  get throttle() {
    return {
      ttl: this.config.get('THROTTLE_TTL_MS', { infer: true }),
      limit: this.config.get('THROTTLE_LIMIT', { infer: true }),
    };
  }
}
