import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { db } from '../config/database.js';
import { reels } from '../database/schema/index.js';
import { eq, and, gte, lte, or, isNull, sql } from 'drizzle-orm';
import { AppError } from '../utils/AppError.js';
import { storageService } from '../services/storage.service.js';
import { detectPlatform, getAutoThumbnail, validateReelUrl } from '../utils/reelPlatform.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function isPublished(r: { isActive: boolean; publishDate: Date | null; expiryDate: Date | null }): boolean {
  const now = new Date();
  if (!r.isActive) return false;
  if (r.publishDate && r.publishDate > now) return false;
  if (r.expiryDate  && r.expiryDate  <= now) return false;
  return true;
}

function buildEffectiveThumbnail(r: { thumbnailUrl: string | null; customThumbnailUrl: string | null }): string | null {
  return r.customThumbnailUrl || r.thumbnailUrl || null;
}

// ── Public ────────────────────────────────────────────────────────────────────

export const reelController = {
  listActive: asyncHandler(async (_req: Request, res: Response) => {
    const now = new Date();
    const rows = await db
      .select()
      .from(reels)
      .where(
        and(
          eq(reels.isActive, true),
          or(isNull(reels.publishDate), lte(reels.publishDate, sql`now()`)),
          or(isNull(reels.expiryDate),  gte(reels.expiryDate,  sql`now()`)),
        )
      )
      .orderBy(reels.featured, reels.sortOrder, reels.createdAt);

    const out = rows.map(r => ({
      ...r,
      effectiveThumbnail: buildEffectiveThumbnail(r),
    }));
    res.json({ success: true, data: out });
  }),

  // Increment click count
  recordClick: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await db.update(reels)
      .set({ clickCount: sql`${reels.clickCount} + 1` })
      .where(eq(reels.id, id));
    res.json({ success: true });
  }),

  // Increment view count
  recordView: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await db.update(reels)
      .set({ viewCount: sql`${reels.viewCount} + 1` })
      .where(eq(reels.id, id));
    res.json({ success: true });
  }),

  // ── Admin ────────────────────────────────────────────────────────────────────

  adminList: asyncHandler(async (_req: Request, res: Response) => {
    const rows = await db.select().from(reels).orderBy(reels.sortOrder, reels.createdAt);
    const out = rows.map(r => ({ ...r, effectiveThumbnail: buildEffectiveThumbnail(r) }));
    res.json({ success: true, data: { reels: out, total: out.length } });
  }),

  adminCreate: asyncHandler(async (req: Request, res: Response) => {
    const {
      title, description, videoUrl, thumbnailUrl, category, serviceCategoryId,
      sortOrder, featured, publishDate, expiryDate,
    } = req.body as {
      title: string; description?: string; videoUrl: string; thumbnailUrl?: string;
      category?: string; serviceCategoryId?: string;
      sortOrder?: number; featured?: boolean;
      publishDate?: string; expiryDate?: string;
    };

    if (!title?.trim())    throw AppError.badRequest('title is required');
    if (!videoUrl?.trim()) throw AppError.badRequest('videoUrl is required');
    if (!validateReelUrl(videoUrl)) throw AppError.badRequest('Unsupported platform. Only YouTube, Instagram, and Facebook links are allowed.');

    const platform   = detectPlatform(videoUrl);
    const autoThumb  = getAutoThumbnail(videoUrl, platform);

    const [row] = await db.insert(reels).values({
      title: title.trim(),
      description: description || null,
      videoUrl: videoUrl.trim(),
      platform,
      thumbnailUrl: autoThumb,
      customThumbnailUrl: thumbnailUrl || null,
      category: category || null,
      serviceCategoryId: serviceCategoryId || null,
      sortOrder: Number(sortOrder ?? 0),
      isActive: true,
      featured: Boolean(featured ?? false),
      publishDate: publishDate ? new Date(publishDate) : null,
      expiryDate:  expiryDate  ? new Date(expiryDate)  : null,
    }).returning();

    res.status(201).json({ success: true, data: { ...row, effectiveThumbnail: buildEffectiveThumbnail(row) } });
  }),

  adminUpdate: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const {
      title, description, videoUrl, category, serviceCategoryId,
      sortOrder, isActive, featured, publishDate, expiryDate,
    } = req.body as {
      title?: string; description?: string; videoUrl?: string;
      category?: string; serviceCategoryId?: string | null;
      sortOrder?: number; isActive?: boolean; featured?: boolean;
      publishDate?: string | null; expiryDate?: string | null;
    };

    const [existing] = await db.select().from(reels).where(eq(reels.id, id));
    if (!existing) throw AppError.notFound('Reel not found');

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (title        !== undefined) patch.title        = String(title).trim();
    if (description  !== undefined) patch.description  = description;
    if (category     !== undefined) patch.category     = category;
    if (sortOrder    !== undefined) patch.sortOrder    = Number(sortOrder);
    if (isActive     !== undefined) patch.isActive     = Boolean(isActive);
    if (featured     !== undefined) patch.featured     = Boolean(featured);
    if ('publishDate' in req.body)  patch.publishDate  = publishDate ? new Date(publishDate) : null;
    if ('expiryDate'  in req.body)  patch.expiryDate   = expiryDate  ? new Date(expiryDate)  : null;
    if ('serviceCategoryId' in req.body) patch.serviceCategoryId = serviceCategoryId || null;

    if (videoUrl !== undefined) {
      const cleanUrl = String(videoUrl).trim();
      if (!validateReelUrl(cleanUrl)) throw AppError.badRequest('Unsupported platform URL.');
      patch.videoUrl    = cleanUrl;
      patch.platform    = detectPlatform(cleanUrl);
      patch.thumbnailUrl = getAutoThumbnail(cleanUrl, patch.platform as any);
    }

    const [row] = await db.update(reels).set(patch as any).where(eq(reels.id, id)).returning();
    res.json({ success: true, data: { ...row, effectiveThumbnail: buildEffectiveThumbnail(row) } });
  }),

  adminDelete: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const [existing] = await db.select({ id: reels.id }).from(reels).where(eq(reels.id, id));
    if (!existing) throw AppError.notFound('Reel not found');
    await db.delete(reels).where(eq(reels.id, id));
    res.json({ success: true, data: { id } });
  }),

  uploadThumbnail: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!req.file) throw AppError.badRequest('No file uploaded');
    const [existing] = await db.select({ id: reels.id }).from(reels).where(eq(reels.id, id));
    if (!existing) throw AppError.notFound('Reel not found');
    const customThumbnailUrl = await storageService.uploadCategoryImage(`reel-thumb-${id}`, req.file);
    const [row] = await db.update(reels)
      .set({ customThumbnailUrl, updatedAt: new Date() })
      .where(eq(reels.id, id))
      .returning();
    res.json({ success: true, data: { ...row, effectiveThumbnail: buildEffectiveThumbnail(row) } });
  }),

  uploadVideo: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!req.file) throw AppError.badRequest('No file uploaded');
    const [existing] = await db.select({ id: reels.id }).from(reels).where(eq(reels.id, id));
    if (!existing) throw AppError.notFound('Reel not found');
    const videoUrl = await storageService.uploadReelVideo(`reel-video-${id}`, req.file);
    const [row] = await db.update(reels)
      .set({ videoUrl, updatedAt: new Date() })
      .where(eq(reels.id, id))
      .returning();
    res.json({ success: true, data: { ...row, effectiveThumbnail: buildEffectiveThumbnail(row) } });
  }),

  // Detect platform from a URL (used by admin UI before saving)
  detectPlatformEndpoint: asyncHandler(async (req: Request, res: Response) => {
    const { url } = req.query as { url?: string };
    if (!url) throw AppError.badRequest('url query param required');
    const valid    = validateReelUrl(url);
    const platform = valid ? detectPlatform(url) : 'unknown';
    const thumb    = valid ? getAutoThumbnail(url, platform) : null;
    res.json({ success: true, data: { valid, platform, autoThumbnail: thumb } });
  }),
};
