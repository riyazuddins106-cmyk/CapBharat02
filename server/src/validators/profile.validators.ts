import { z } from 'zod';

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(255).optional(),
  phone: z.string().trim().min(7).max(20).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
