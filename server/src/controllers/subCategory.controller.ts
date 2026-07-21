import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { db } from '../config/database.js';
import { subServiceCategories, serviceCategories } from '../database/schema/index.js';
import { eq, and, isNull, isNotNull } from 'drizzle-orm';
import { AppError } from '../utils/AppError.js';
import { storageService } from '../services/storage.service.js';

export const subCategoryController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { categoryId } = req.params;
    const [cat] = await db.select({ id: serviceCategories.id }).from(serviceCategories).where(eq(serviceCategories.id, categoryId));
    if (!cat) throw AppError.notFound('Category not found');
    const rows = await db
      .select()
      .from(subServiceCategories)
      .where(and(eq(subServiceCategories.categoryId, categoryId), isNull(subServiceCategories.deletedAt)))
      .orderBy(subServiceCategories.sortOrder, subServiceCategories.name);
    res.json({ success: true, data: { subcategories: rows, total: rows.length } });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const { categoryId } = req.params;
    const { name, description, iconName, color, iconColor, sortOrder } = req.body as {
      name: string; description?: string; iconName?: string; color?: string; iconColor?: string; sortOrder?: number;
    };
    if (!name || String(name).trim().length === 0) throw AppError.badRequest('Name is required');
    const [cat] = await db.select({ id: serviceCategories.id }).from(serviceCategories).where(eq(serviceCategories.id, categoryId));
    if (!cat) throw AppError.notFound('Category not found');
    const [row] = await db.insert(subServiceCategories).values({
      categoryId,
      name: String(name).trim(),
      description: description || null,
      iconName: iconName || 'tag-outline',
      color: color || '#5B3EF5',
      iconColor: iconColor || '#ffffff',
      sortOrder: Number(sortOrder ?? 0),
      isActive: true,
    }).returning();
    res.status(201).json({ success: true, data: row });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, description, iconName, color, iconColor, sortOrder, isActive } = req.body as {
      name?: string; description?: string; iconName?: string; color?: string; iconColor?: string;
      sortOrder?: number; isActive?: boolean;
    };
    const [existing] = await db.select().from(subServiceCategories).where(eq(subServiceCategories.id, id));
    if (!existing) throw AppError.notFound('Subcategory not found');
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (name        !== undefined) patch.name        = String(name).trim();
    if (description !== undefined) patch.description = description;
    if (iconName    !== undefined) patch.iconName    = iconName;
    if (color       !== undefined) patch.color       = color;
    if (iconColor   !== undefined) patch.iconColor   = iconColor;
    if (sortOrder   !== undefined) patch.sortOrder   = Number(sortOrder);
    if (isActive    !== undefined) patch.isActive    = Boolean(isActive);
    const [row] = await db.update(subServiceCategories).set(patch as any).where(eq(subServiceCategories.id, id)).returning();
    res.json({ success: true, data: row });
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const [existing] = await db.select({ id: subServiceCategories.id }).from(subServiceCategories)
      .where(and(eq(subServiceCategories.id, id), isNull(subServiceCategories.deletedAt)));
    if (!existing) throw AppError.notFound('Subcategory not found');
    await db.update(subServiceCategories)
      .set({ deletedAt: new Date(), isActive: false, updatedAt: new Date() })
      .where(eq(subServiceCategories.id, id));
    res.json({ success: true, data: { id } });
  }),

  restore: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const [existing] = await db.select({ id: subServiceCategories.id }).from(subServiceCategories)
      .where(and(eq(subServiceCategories.id, id), isNotNull(subServiceCategories.deletedAt)));
    if (!existing) throw AppError.notFound('Subcategory not found or not deleted');
    const [row] = await db.update(subServiceCategories)
      .set({ deletedAt: null, isActive: true, updatedAt: new Date() })
      .where(eq(subServiceCategories.id, id))
      .returning();
    res.json({ success: true, data: row });
  }),

  uploadImage: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!req.file) throw AppError.badRequest('No file uploaded');
    const [existing] = await db.select({ id: subServiceCategories.id }).from(subServiceCategories).where(eq(subServiceCategories.id, id));
    if (!existing) throw AppError.notFound('Subcategory not found');
    const imageUrl = await storageService.uploadCategoryImage(`subcategory-${id}`, req.file);
    const [row] = await db.update(subServiceCategories).set({ imageUrl, updatedAt: new Date() }).where(eq(subServiceCategories.id, id)).returning();
    res.json({ success: true, data: row });
  }),
};
