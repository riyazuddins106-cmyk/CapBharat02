import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import { pointsService } from '../services/points.service.js';

export const pointsController = {
  getSummary: asyncHandler(async (req: Request, res: Response) => {
    const summary = await pointsService.getSummary(req.user!.userId);
    sendSuccess(res, summary);
  }),

  redeem: asyncHandler(async (req: Request, res: Response) => {
    const result = await pointsService.redeem(req.user!.userId, req.body);
    sendSuccess(res, result, 201);
  }),
};
