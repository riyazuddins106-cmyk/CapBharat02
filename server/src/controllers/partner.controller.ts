import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { partnerService } from '../services/partner.service.js';
import { storageService } from '../services/storage.service.js';
import { AppError } from '../utils/AppError.js';

export const partnerController = {
  getProfile: asyncHandler(async (req: Request, res: Response) => {
    const data = await partnerService.getProfile(req.user!.userId);
    res.json({ success: true, data });
  }),

  listJobs: asyncHandler(async (req: Request, res: Response) => {
    const data = await partnerService.listJobs(req.user!.userId);
    res.json({ success: true, data });
  }),

  getJob: asyncHandler(async (req: Request, res: Response) => {
    const data = await partnerService.getJob(req.user!.userId, req.params.id);
    res.json({ success: true, data });
  }),

  checkIn: asyncHandler(async (req: Request, res: Response) => {
    const { qrToken } = req.body as { qrToken?: string };
    if (!qrToken) throw new (await import('../utils/AppError.js')).AppError('qrToken is required in request body', 400);
    const data = await partnerService.checkIn(req.user!.userId, req.params.id, qrToken);
    res.json({ success: true, data });
  }),

  completeJob: asyncHandler(async (req: Request, res: Response) => {
    const data = await partnerService.completeJob(req.user!.userId, req.params.id);
    res.json({ success: true, data });
  }),

  getEarnings: asyncHandler(async (req: Request, res: Response) => {
    const data = await partnerService.getEarnings(req.user!.userId);
    res.json({ success: true, data });
  }),

  requestPayout: asyncHandler(async (req: Request, res: Response) => {
    const { amount, note } = req.body as { amount?: number; note?: string };
    const data = await partnerService.requestPayout(req.user!.userId, Number(amount), note);
    res.json({ success: true, data });
  }),

  listPayoutRequests: asyncHandler(async (req: Request, res: Response) => {
    const data = await partnerService.listPayoutRequests(req.user!.userId);
    res.json({ success: true, data });
  }),

  updateProfile: asyncHandler(async (req: Request, res: Response) => {
    const data = await partnerService.updateProfile(req.user!.userId, req.body);
    res.json({ success: true, data });
  }),

  updateAccount: asyncHandler(async (req: Request, res: Response) => {
    const data = await partnerService.updateAccount(req.user!.userId, req.body);
    res.json({ success: true, data });
  }),

  uploadAvatar: asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) throw AppError.badRequest('No file uploaded. Use the "avatar" field.');
    const avatarUrl = await storageService.uploadAvatar(req.user!.userId, req.file);
    const data = await partnerService.updateAvatar(req.user!.userId, avatarUrl);
    res.json({ success: true, data });
  }),
};
