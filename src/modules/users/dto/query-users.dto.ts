import { z } from 'zod';
import { Industry, UserRole } from '@prisma/client';

export const QueryUsersSchema = z.object({
  role: z.nativeEnum(UserRole).optional(),
  industry: z.nativeEnum(Industry).optional(),
  country: z.string().max(100).trim().optional(),
  q: z.string().max(100).trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type QueryUsersDto = z.infer<typeof QueryUsersSchema>;
