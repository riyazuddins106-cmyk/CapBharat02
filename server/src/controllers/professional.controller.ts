import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import { professionalService } from '../services/professional.service.js';

export const professionalController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { categoryId, subCategoryId, search, sort, limit, offset } = req.query as Record<string, string | undefined>;
    const result = await professionalService.list(
      {
        categoryId,
        subCategoryId,
        search,
        sort: sort as 'rating' | 'price_asc' | 'price_desc' | 'reviews' | undefined,
        limit: limit ? parseInt(limit, 10) : 20,
        offset: offset ? parseInt(offset, 10) : 0,
      },
      req.user?.userId,
    );
    sendSuccess(res, result.data, 200, { total: result.total, limit: result.limit, offset: result.offset });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const professional = await professionalService.getById(req.params.id, req.user?.userId);
    sendSuccess(res, professional);
  }),
};
