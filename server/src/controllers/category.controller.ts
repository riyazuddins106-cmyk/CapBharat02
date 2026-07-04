import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import { categoryService } from '../services/category.service.js';
import { AppError } from '../utils/AppError.js';

export const categoryController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    const categories = await categoryService.list();
    sendSuccess(res, categories);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const category = await categoryService.getById(req.params.id);
    if (!category) throw AppError.notFound('Category not found.');
    sendSuccess(res, category);
  }),
};
