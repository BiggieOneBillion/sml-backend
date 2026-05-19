import { z } from 'zod';
import { createZodDto } from './zod-dto.helper';

// ── Zod Schemas ───────────────────────────────────────────────────────────────

/**
 * WHY ZOD FOR DTOs alongside class-validator?
 *
 * We use Zod schemas as the single source of truth, then derive:
 *   1. The TypeScript type (z.infer<typeof schema>)
 *   2. The DTO class (via createZodDto helper below)
 *
 * This eliminates the common bug where the class-validator decorators
 * and the inferred types drift apart. One schema, two outputs.
 *
 * The ZodValidationPipe (in common/pipes) validates incoming requests
 * against these schemas.
 */

export const RegisterSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must not exceed 100 characters')
    .trim(),

  email: z
    .string()
    .email('Please provide a valid email address')
    .toLowerCase()
    .trim(),

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),

  agreedToTerms: z
    .boolean()
    .refine((val) => val === true, {
      message: 'You must agree to the Terms of Service and Privacy Policy',
    }),
});

export const LoginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
  // deviceFingerprint: z.string().optional(),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const VerifyEmailSchema = z.object({
  token: z.string().uuid('Invalid verification token'),
});

export const ResendVerificationSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z
    .string()
    .min(8)
    .regex(/[A-Za-z]/)
    .regex(/[0-9]/)
    .regex(/[^A-Za-z0-9]/),
});

// ── Inferred Types ────────────────────────────────────────────────────────────

export type RegisterDto = z.infer<typeof RegisterSchema>;
export type LoginDto = z.infer<typeof LoginSchema>;
export type RefreshTokenDto = z.infer<typeof RefreshTokenSchema>;
export type VerifyEmailDto = z.infer<typeof VerifyEmailSchema>;
export type ResendVerificationDto = z.infer<typeof ResendVerificationSchema>;
export type ForgotPasswordDto = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordDto = z.infer<typeof ResetPasswordSchema>;
