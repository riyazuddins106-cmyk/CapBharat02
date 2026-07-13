import { z } from 'zod';

export const createReviewSchema = z.object({
  bookingId: z.string().uuid('Invalid booking id'),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

export const professionalIdParamSchema = z.object({
  professionalId: z.string().uuid('Invalid professional id'),
});

export const reviewIdParamSchema = z.object({
  id: z.string().uuid('Invalid review id'),
});

export const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(2000).optional(),
}).refine((data) => data.rating !== undefined || data.comment !== undefined, {
  message: 'At least one of rating or comment must be provided.',
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
