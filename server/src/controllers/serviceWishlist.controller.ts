import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import { serviceWishlistService } from '../services/serviceWishlist.service.js';

export const serviceWishlistController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const items = await serviceWishlistService.list(req.user!.userId);
    sendSuccess(res, items);
  }),

  toggle: asyncHandler(async (req: Request, res: Response) => {
    const result = await serviceWishlistService.toggle(
      req.user!.userId,
      req.params.serviceId,
    );
    sendSuccess(res, result, result.isWishlisted ? 201 : 200);
  }),

  ids: asyncHandler(async (req: Request, res: Response) => {
    const ids = await serviceWishlistService.getWishlistedIds(req.user!.userId);
    sendSuccess(res, { ids });
  }),
};
