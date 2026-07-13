import { z } from 'zod';

export const redeemPointsSchema = z.object({
  points: z.number().int().min(100, 'Minimum redemption is 100 points'),
});

export type RedeemPointsInput = z.infer<typeof redeemPointsSchema>;
