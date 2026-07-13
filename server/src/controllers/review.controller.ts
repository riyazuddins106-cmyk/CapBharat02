import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import { reviewService } from '../services/review.service.js';

export const reviewController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const review = await reviewService.create(req.user!.userId, req.body);
    sendSuccess(res, review, 201);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const review = await reviewService.update(req.user!.userId, req.params.id, req.body);
    sendSuccess(res, review);
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await reviewService.remove(req.user!.userId, req.params.id);
    sendSuccess(res, { message: 'Review deleted.' });
  }),

  listForProfessional: asyncHandler(async (req: Request, res: Response) => {
    const reviews = await reviewService.listForProfessional(req.params.professionalId);
    sendSuccess(res, reviews);
  }),
};
