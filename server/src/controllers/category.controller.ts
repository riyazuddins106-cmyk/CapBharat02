import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import { categoryService } from '../services/category.service.js';
import { AppError } from '../utils/AppError.js';
import { db } from '../config/database.js';
import { subServiceCategories } from '../database/schema/index.js';
import { eq, and, asc } from 'drizzle-orm';

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

  /** Public: list active subcategories for a given category */
  listSubcategories: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const category = await categoryService.getById(id);
    if (!category) throw AppError.notFound('Category not found.');
    const rows = await db
      .select()
      .from(subServiceCategories)
      .where(and(eq(subServiceCategories.categoryId, id), eq(subServiceCategories.isActive, true)))
      .orderBy(asc(subServiceCategories.sortOrder), asc(subServiceCategories.name));
    sendSuccess(res, rows);
  }),
};
