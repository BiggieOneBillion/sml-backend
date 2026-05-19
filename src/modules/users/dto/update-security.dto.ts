import { z } from 'zod';
import { TwoFaMethod } from '@prisma/client';

export const UpdateSecuritySchema = z
  .object({
    twoFaEnabled: z.boolean(),
    twoFaMethod: z.nativeEnum(TwoFaMethod).optional(),
  })
  .refine((data) => !data.twoFaEnabled || data.twoFaMethod !== undefined, {
    message: 'twoFaMethod is required when enabling 2FA',
    path: ['twoFaMethod'],
  });

export type UpdateSecurityDto = z.infer<typeof UpdateSecuritySchema>;
