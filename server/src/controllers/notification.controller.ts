import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import { notificationDbService } from '../services/notificationDb.service.js';

export const notificationController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const data = await notificationDbService.list(req.user!.userId);
    sendSuccess(res, data);
  }),

  markRead: asyncHandler(async (req: Request, res: Response) => {
    await notificationDbService.markRead(req.params.id, req.user!.userId);
    sendSuccess(res, { message: 'Marked as read.' });
  }),

  markAllRead: asyncHandler(async (req: Request, res: Response) => {
    await notificationDbService.markAllRead(req.user!.userId);
    sendSuccess(res, { message: 'All marked as read.' });
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    await notificationDbService.delete(req.params.id, req.user!.userId);
    sendSuccess(res, { message: 'Notification deleted.' });
  }),

  unreadCount: asyncHandler(async (req: Request, res: Response) => {
    const count = await notificationDbService.unreadCount(req.user!.userId);
    sendSuccess(res, { count });
  }),
};
