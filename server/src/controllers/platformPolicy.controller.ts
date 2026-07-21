import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import { AppError } from '../utils/AppError.js';
import { platformPolicyService } from '../services/platformPolicy.service.js';

function slugify(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
}

export const platformPolicyController = {
  /** Public — GET /api/platform-policies */
  listAll: asyncHandler(async (_req: Request, res: Response) => {
    const rows = await platformPolicyService.getAll();
    sendSuccess(res, rows);
  }),

  /** Public — GET /api/platform-policies/:slug */
  getOne: asyncHandler(async (req: Request, res: Response) => {
    const { slug } = req.params;
    const row = await platformPolicyService.getBySlug(slug);
    if (!row) throw new AppError('Policy not found', 404);
    sendSuccess(res, row);
  }),

  /** Admin — GET /api/admin/platform-policies */
  adminList: asyncHandler(async (_req: Request, res: Response) => {
    const rows = await platformPolicyService.getAll();
    sendSuccess(res, rows);
  }),

  /** Admin — PUT /api/admin/platform-policies/:slug */
  adminUpdate: asyncHandler(async (req: Request, res: Response) => {
    const { slug } = req.params;
    const { title, content } = req.body as { title?: string; content?: string };
    if (!title?.trim()) throw new AppError('title is required', 400);
    if (content === undefined) throw new AppError('content is required', 400);
    const updated = await platformPolicyService.upsert(slug, title.trim(), content);
    sendSuccess(res, updated);
  }),

  /** Admin — POST /api/admin/platform-policies */
  adminCreate: asyncHandler(async (req: Request, res: Response) => {
    const { title, content, slug: rawSlug } = req.body as { title?: string; content?: string; slug?: string };
    if (!title?.trim()) throw new AppError('title is required', 400);
    const slug = (rawSlug?.trim() ? slugify(rawSlug) : slugify(title));
    if (!slug) throw new AppError('Could not derive a valid slug from the title', 400);
    try {
      const created = await platformPolicyService.create(slug, title.trim(), content ?? '');
      sendSuccess(res, created, 201);
    } catch (e: any) {
      throw new AppError(e.message ?? 'Failed to create policy', 409);
    }
  }),

  /** Admin — DELETE /api/admin/platform-policies/:slug */
  adminDelete: asyncHandler(async (req: Request, res: Response) => {
    const { slug } = req.params;
    const removed = await platformPolicyService.remove(slug);
    if (!removed) throw new AppError('Policy not found', 404);
    sendSuccess(res, { slug });
  }),

  /** Admin — PATCH /api/admin/platform-policies/:slug/restore */
  adminRestore: asyncHandler(async (req: Request, res: Response) => {
    const { slug } = req.params;
    const restored = await platformPolicyService.restore(slug);
    if (!restored) throw new AppError('Policy not found or not deleted', 404);
    sendSuccess(res, restored);
  }),
};
