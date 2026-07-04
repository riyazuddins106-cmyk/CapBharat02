import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import { favoriteService } from '../services/favorite.service.js';

export const favoriteController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const favorites = await favoriteService.list(req.user!.userId);
    sendSuccess(res, favorites);
  }),

  toggle: asyncHandler(async (req: Request, res: Response) => {
    const result = await favoriteService.toggle(req.user!.userId, req.params.professionalId);
    sendSuccess(res, result);
  }),
};
