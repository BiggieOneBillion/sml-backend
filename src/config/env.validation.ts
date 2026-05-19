import { z } from 'zod';

/**
 * Zod schema for all environment variables.
 *
 * WHY ZOD INSTEAD OF class-validator + @nestjs/config?
 * - Type inference is automatic (no manual DTO mirroring)
 * - .parse() throws at startup if config is invalid — fail-fast
 * - The inferred type is used throughout the codebase for full type-safety
 * - Coercion (z.coerce.number()) handles string → number from process.env
 */
const envSchema = z.object({
  // ── Application ──────────────────────────────────────────────────────────
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  API_VERSION: z.string().default('v1'),
  APP_NAME: z.string().default('SML Stock Market API'),
  FRONTEND_URL: z.string().url().default('http://localhost:3001'),

  // ── Database ─────────────────────────────────────────────────────────────
  DATABASE_URL: z.string().url(),

  // ── JWT Authentication ────────────────────────────────────────────────────
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  // ── Redis ────────────────────────────────────────────────────────────────
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_TLS: z.coerce.boolean().default(false),

  // ── AWS / Storage ────────────────────────────────────────────────────────
  AWS_REGION: z.string().default('us-east-1'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  S3_BUCKET_PUBLIC: z.string().default('sml-public-assets'),
  S3_BUCKET_PRIVATE: z.string().default('sml-private-documents'),
  CLOUDFRONT_URL: z.string().url().optional(),

  // ── Stripe ───────────────────────────────────────────────────────────────
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
  STRIPE_INVESTOR_PRICE_ID: z.string(),

  // ── Email (Resend) ────────────────────────────────────────────────────────
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().default('noreply@smlstockmarket.com'),

  // ── SMS / 2FA (Twilio) ────────────────────────────────────────────────────
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_VERIFY_SERVICE_SID: z.string().optional(),

  // ── Rate Limiting ─────────────────────────────────────────────────────────
  THROTTLE_TTL_MS: z.coerce.number().int().positive().default(60_000),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(100),

  // ── Security ─────────────────────────────────────────────────────────────
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(14).default(12),
  COOKIE_SECRET: z.string().min(32),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Called once by NestJS ConfigModule at bootstrap.
 * If any required variable is missing or invalid, the process exits
 * immediately with a descriptive error — never silently wrong.
 */
export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const errors = result.error.issues
      .map((e) => `  • ${e.path.join('.')}: ${e.message}`)
      .join('\n');

    throw new Error(
      `\n❌ Invalid environment configuration:\n${errors}\n\n` +
        `Check your .env file against .env.example\n`,
    );
  }

  return result.data;
}
