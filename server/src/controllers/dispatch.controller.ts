import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { dispatchService } from '../services/dispatch.service.js';

export const dispatchController = {
  list: asyncHandler(async (req: Request, res: Response) => res.json({ success: true, data: await dispatchService.listForOperations(req.query.status as string | undefined) })),
  eligible: asyncHandler(async (req: Request, res: Response) => res.json({ success: true, data: await dispatchService.eligiblePartners(req.params.bookingId) })),
  assign: asyncHandler(async (req: Request, res: Response) => res.json({ success: true, data: await dispatchService.assign(req.params.bookingId, req.body.partnerId, req.user!.userId) })),
  stopSearching: asyncHandler(async (req: Request, res: Response) => {
    const booking = await dispatchService.stopSearching(req.params.bookingId);
    res.json({ success: true, data: booking });
  }),
  history: asyncHandler(async (req: Request, res: Response) => res.json({ success: true, data: await dispatchService.history(req.query.bookingId as string | undefined) })),
};