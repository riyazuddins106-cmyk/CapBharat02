import { z } from 'zod';

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(255).optional(),
}).strict();

export const identityRequestSchema = z.object({
  field: z.enum(['email', 'phone']),
  value: z.string().trim().min(1),
});

export const identityVerifySchema = z.object({
  field: z.enum(['email', 'phone']),
  value: z.string().trim().min(1),
  code: z.string().trim().min(4).max(6),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type IdentityField = z.infer<typeof identityRequestSchema>['field'];
export type IdentityRequestInput = z.infer<typeof identityRequestSchema>;
export type IdentityVerifyInput = z.infer<typeof identityVerifySchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
