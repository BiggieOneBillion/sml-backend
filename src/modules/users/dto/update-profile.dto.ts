import { z } from 'zod';
import { Industry, PrimaryIntent, UserRole } from '@prisma/client';

export const UpdateProfileSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100)
    .trim()
    .optional(),
  bio: z.string().max(150, 'Bio must not exceed 150 characters').optional().nullable(),
  occupation: z.string().max(100).trim().optional().nullable(),
  industry: z.nativeEnum(Industry).optional().nullable(),
  role: z.nativeEnum(UserRole).optional().nullable(),
  primaryIntent: z.nativeEnum(PrimaryIntent).optional(),
  locationCountry: z.string().max(100).trim().optional().nullable(),
  locationCity: z.string().max(100).trim().optional().nullable(),
  locationText: z.string().max(200).trim().optional().nullable(),
  nationality: z.string().max(100).trim().optional().nullable(),
  investmentExperience: z.string().max(500).trim().optional().nullable(),
});

export type UpdateProfileDto = z.infer<typeof UpdateProfileSchema>;
