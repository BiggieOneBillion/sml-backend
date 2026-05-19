import { z } from 'zod';

export const RequestAvatarUploadSchema = z.object({
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  fileSizeBytes: z
    .number()
    .int()
    .min(1)
    .max(5 * 1024 * 1024, 'File size must not exceed 5 MB'),
});

export type RequestAvatarUploadDto = z.infer<typeof RequestAvatarUploadSchema>;

export const ConfirmAvatarSchema = z.object({
  avatarUrl: z.string().url('Must be a valid URL'),
});

export type ConfirmAvatarDto = z.infer<typeof ConfirmAvatarSchema>;
