import { z } from 'zod';

export const createAddressSchema = z.object({
  label: z.string().trim().min(1).max(64).default('Home'),
  line1: z.string().trim().min(3).max(255),
  line2: z.string().trim().max(255).nullish(),
  city: z.string().trim().min(1).max(128),
  state: z.string().trim().min(1).max(128),
  postalCode: z.string().trim().min(3).max(32),
  country: z.string().trim().min(1).max(128).default('India'),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  isDefault: z.boolean().optional(),
});

export const updateAddressSchema = createAddressSchema.partial();

export const addressIdParamSchema = z.object({
  id: z.string().uuid('Invalid address id'),
});

export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;
