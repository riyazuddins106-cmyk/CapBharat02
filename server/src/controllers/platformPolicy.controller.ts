import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import { AppError } from '../utils/AppError.js';
import { platformPolicyService } from '../services/platformPolicy.service.js';

const ALLOWED_SLUGS = ['privacy_policy', 'terms', 'data_retention'] as const;
type PolicySlug = typeof ALLOWED_SLUGS[number];

function isAllowed(slug: string): slug is PolicySlug {
  return (ALLOWED_SLUGS as readonly string[]).includes(slug);
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
    if (!isAllowed(slug)) throw new AppError('Invalid policy slug', 400);
    const { title, content } = req.body as { title?: string; content?: string };
    if (!title?.trim()) throw new AppError('title is required', 400);
    if (content === undefined) throw new AppError('content is required', 400);
    const updated = await platformPolicyService.upsert(slug, title.trim(), content);
    sendSuccess(res, updated);
  }),
};
