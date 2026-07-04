import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import { bookingService } from '../services/booking.service.js';

export const bookingController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const bookings = await bookingService.list(req.user!.userId);
    sendSuccess(res, bookings);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const booking = await bookingService.getById(req.user!.userId, req.params.id);
    sendSuccess(res, booking);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const booking = await bookingService.create(req.user!.userId, req.body);
    sendSuccess(res, booking, 201);
  }),

  cancel: asyncHandler(async (req: Request, res: Response) => {
    const booking = await bookingService.cancel(req.user!.userId, req.params.id);
    sendSuccess(res, booking);
  }),

  reschedule: asyncHandler(async (req: Request, res: Response) => {
    const booking = await bookingService.reschedule(req.user!.userId, req.params.id, req.body);
    sendSuccess(res, booking);
  }),
};
