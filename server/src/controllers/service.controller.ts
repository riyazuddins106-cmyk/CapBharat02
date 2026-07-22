import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { db } from '../config/database.js';
import { services, serviceCategories, subServiceCategories } from '../database/schema/index.js';
import { eq, and, isNull, ilike, or, sql } from 'drizzle-orm';
import { AppError } from '../utils/AppError.js';

// ─── helpers ────────────────────────────────────────────────────────────────

function formatService(row: any, cat: any, sub: any) {
  return {
    id:             row.id,
    categoryId:     row.categoryId,
    categoryName:   cat?.name ?? null,
    subCategoryId:  row.subCategoryId,
    subCategoryName: sub?.name ?? null,
    name:           row.name,
    description:    row.description,
    images:         Array.isArray(row.images) ? row.images : [],
    customerPrice:  row.customerPrice,
    partnerPayout:  row.partnerPayout,
    commission:     row.commission,
    duration:       row.duration,
    requiredSkill:  row.requiredSkill,
    isActive:       row.isActive,
    createdAt:      row.createdAt,
    updatedAt:      row.updatedAt,
  };
}

// ─── controller ─────────────────────────────────────────────────────────────

export const serviceController = {

  /* Public: list active services, optional filter by category/subcategory */
  list: asyncHandler(async (req: Request, res: Response) => {
    const { categoryId, subCategoryId, q } = req.query as Record<string, string>;

    const rows = await db
      .select({
        s:   services,
        cat: { id: serviceCategories.id, name: serviceCategories.name },
        sub: { id: subServiceCategories.id, name: subServiceCategories.name },
      })
      .from(services)
      .leftJoin(serviceCategories,    eq(services.categoryId,    serviceCategories.id))
      .leftJoin(subServiceCategories, eq(services.subCategoryId, subServiceCategories.id))
      .where(and(
        isNull(services.deletedAt),
        eq(services.isActive, true),
        categoryId    ? eq(services.categoryId,    categoryId)    : undefined,
        subCategoryId ? eq(services.subCategoryId, subCategoryId) : undefined,
        q             ? ilike(services.name, `%${q}%`)            : undefined,
      ) as any)
      .orderBy(services.name);

    const data = rows.map(r => formatService(r.s, r.cat, r.sub));
    res.json({ success: true, data: { services: data, total: data.length } });
  }),

  /* Public: get one service by id */
  getById: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const [row] = await db
      .select({
        s:   services,
        cat: { id: serviceCategories.id, name: serviceCategories.name },
        sub: { id: subServiceCategories.id, name: subServiceCategories.name },
      })
      .from(services)
      .leftJoin(serviceCategories,    eq(services.categoryId,    serviceCategories.id))
      .leftJoin(subServiceCategories, eq(services.subCategoryId, subServiceCategories.id))
      .where(and(eq(services.id, id), isNull(services.deletedAt)));

    if (!row) throw AppError.notFound('Service not found');
    res.json({ success: true, data: formatService(row.s, row.cat, row.sub) });
  }),

  /* Admin: list all services (including inactive) */
  adminList: asyncHandler(async (req: Request, res: Response) => {
    const { categoryId, subCategoryId, q } = req.query as Record<string, string>;

    const rows = await db
      .select({
        s:   services,
        cat: { id: serviceCategories.id, name: serviceCategories.name },
        sub: { id: subServiceCategories.id, name: subServiceCategories.name },
      })
      .from(services)
      .leftJoin(serviceCategories,    eq(services.categoryId,    serviceCategories.id))
      .leftJoin(subServiceCategories, eq(services.subCategoryId, subServiceCategories.id))
      .where(and(
        isNull(services.deletedAt),
        categoryId    ? eq(services.categoryId,    categoryId)    : undefined,
        subCategoryId ? eq(services.subCategoryId, subCategoryId) : undefined,
        q             ? ilike(services.name, `%${q}%`)            : undefined,
      ) as any)
      .orderBy(services.name);

    const data = rows.map(r => formatService(r.s, r.cat, r.sub));
    res.json({ success: true, data: { services: data, total: data.length } });
  }),

  /* Admin: create service */
  adminCreate: asyncHandler(async (req: Request, res: Response) => {
    const {
      categoryId, subCategoryId, name, description,
      images, customerPrice, partnerPayout, duration, requiredSkill, isActive,
    } = req.body as {
      categoryId: string; subCategoryId?: string; name: string; description?: string;
      images?: string[]; customerPrice: number; partnerPayout: number;
      duration?: number; requiredSkill?: string; isActive?: boolean;
    };

    if (!name?.trim())      throw AppError.badRequest('Name is required');
    if (!categoryId)        throw AppError.badRequest('Category is required');
    if (customerPrice == null) throw AppError.badRequest('Customer price is required');
    if (partnerPayout == null) throw AppError.badRequest('Partner payout is required');

    const [cat] = await db.select({ id: serviceCategories.id })
      .from(serviceCategories).where(eq(serviceCategories.id, categoryId));
    if (!cat) throw AppError.badRequest('Category not found');

    const cPrice   = Math.round(Number(customerPrice));
    const pPayout  = Math.round(Number(partnerPayout));
    const commission = cPrice - pPayout;

    const [row] = await db.insert(services).values({
      categoryId,
      subCategoryId:  subCategoryId || null,
      name:           name.trim(),
      description:    description || null,
      images:         Array.isArray(images) ? images : [],
      customerPrice:  cPrice,
      partnerPayout:  pPayout,
      commission,
      duration:       Number(duration ?? 60),
      requiredSkill:  requiredSkill?.trim() || null,
      isActive:       isActive !== false,
    }).returning();

    const [created] = await db
      .select({
        s:   services,
        cat: { id: serviceCategories.id, name: serviceCategories.name },
        sub: { id: subServiceCategories.id, name: subServiceCategories.name },
      })
      .from(services)
      .leftJoin(serviceCategories,    eq(services.categoryId,    serviceCategories.id))
      .leftJoin(subServiceCategories, eq(services.subCategoryId, subServiceCategories.id))
      .where(eq(services.id, row.id));

    res.status(201).json({ success: true, data: formatService(created.s, created.cat, created.sub) });
  }),

  /* Admin: update service */
  adminUpdate: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const [existing] = await db.select().from(services)
      .where(and(eq(services.id, id), isNull(services.deletedAt)));
    if (!existing) throw AppError.notFound('Service not found');

    const {
      name, categoryId, subCategoryId, description,
      images, customerPrice, partnerPayout, duration, requiredSkill, isActive,
    } = req.body as Record<string, any>;

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (name          !== undefined) patch.name          = String(name).trim();
    if (categoryId    !== undefined) patch.categoryId    = categoryId;
    if (subCategoryId !== undefined) patch.subCategoryId = subCategoryId || null;
    if (description   !== undefined) patch.description   = description;
    if (images        !== undefined) patch.images        = Array.isArray(images) ? images : [];
    if (isActive      !== undefined) patch.isActive      = Boolean(isActive);
    if (duration      !== undefined) patch.duration      = Number(duration);
    if (requiredSkill !== undefined) patch.requiredSkill = requiredSkill?.trim() || null;

    let cPrice  = existing.customerPrice;
    let pPayout = existing.partnerPayout;
    if (customerPrice !== undefined) { cPrice = Math.round(Number(customerPrice)); patch.customerPrice = cPrice; }
    if (partnerPayout !== undefined) { pPayout = Math.round(Number(partnerPayout)); patch.partnerPayout = pPayout; }
    patch.commission = cPrice - pPayout;

    await db.update(services).set(patch as any).where(eq(services.id, id));

    const [updated] = await db
      .select({
        s:   services,
        cat: { id: serviceCategories.id, name: serviceCategories.name },
        sub: { id: subServiceCategories.id, name: subServiceCategories.name },
      })
      .from(services)
      .leftJoin(serviceCategories,    eq(services.categoryId,    serviceCategories.id))
      .leftJoin(subServiceCategories, eq(services.subCategoryId, subServiceCategories.id))
      .where(eq(services.id, id));

    res.json({ success: true, data: formatService(updated.s, updated.cat, updated.sub) });
  }),

  /* Admin: soft-delete service */
  adminDelete: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const [existing] = await db.select({ id: services.id }).from(services)
      .where(and(eq(services.id, id), isNull(services.deletedAt)));
    if (!existing) throw AppError.notFound('Service not found');

    await db.update(services)
      .set({ deletedAt: new Date(), isActive: false, updatedAt: new Date() })
      .where(eq(services.id, id));

    res.json({ success: true, data: { id } });
  }),
};
