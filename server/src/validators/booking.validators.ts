import { z } from 'zod';

export const createBookingSchema = z.object({
  professionalId: z.string().uuid('Invalid professional id'),
  scheduledAt: z.string().datetime({ message: 'scheduledAt must be an ISO datetime string' }),
  addressId: z.string().uuid().optional(),
  notes: z.string().max(1000).optional(),
});

export const rescheduleBookingSchema = z.object({
  scheduledAt: z.string().datetime({ message: 'scheduledAt must be an ISO datetime string' }),
});

export const bookingIdParamSchema = z.object({
  id: z.string().uuid('Invalid booking id'),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type RescheduleBookingInput = z.infer<typeof rescheduleBookingSchema>;
