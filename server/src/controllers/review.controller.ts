import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import { reviewService } from '../services/review.service.js';

export const reviewController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const review = await reviewService.create(req.user!.userId, req.body);
    sendSuccess(res, review, 201);
  }),

  listForProfessional: asyncHandler(async (req: Request, res: Response) => {
    const reviews = await reviewService.listForProfessional(req.params.professionalId);
    sendSuccess(res, reviews);
  }),
};
