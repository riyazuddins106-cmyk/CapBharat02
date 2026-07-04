import { z } from 'zod';

export const createReviewSchema = z.object({
  bookingId: z.string().uuid('Invalid booking id'),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

export const professionalIdParamSchema = z.object({
  professionalId: z.string().uuid('Invalid professional id'),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
