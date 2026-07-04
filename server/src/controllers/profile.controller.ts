import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import { AppError } from '../utils/AppError.js';
import { userService } from '../services/user.service.js';
import { storageService } from '../services/storage.service.js';

export const profileController = {
  getProfile: asyncHandler(async (req: Request, res: Response) => {
    const profile = await userService.getProfile(req.user!.userId);
    sendSuccess(res, profile);
  }),

  updateProfile: asyncHandler(async (req: Request, res: Response) => {
    const profile = await userService.updateProfile(req.user!.userId, req.body);
    sendSuccess(res, profile);
  }),

  uploadAvatar: asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw AppError.badRequest('No file uploaded. Use the "avatar" field.');
    }
    const avatarUrl = await storageService.uploadAvatar(req.user!.userId, req.file);
    const profile = await userService.updateAvatar(req.user!.userId, avatarUrl);
    sendSuccess(res, profile);
  }),
};
