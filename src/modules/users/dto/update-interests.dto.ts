import { z } from 'zod';
import { Industry } from '@prisma/client';

export const UpdateInterestsSchema = z.object({
  interests: z
    .array(z.nativeEnum(Industry))
    .min(1, 'At least one interest is required')
    .max(10, 'You may select up to 10 interests'),
});

export type UpdateInterestsDto = z.infer<typeof UpdateInterestsSchema>;
