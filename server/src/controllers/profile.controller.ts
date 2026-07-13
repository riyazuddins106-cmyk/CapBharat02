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

  changePassword: asyncHandler(async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };
    if (!currentPassword || !newPassword) throw AppError.badRequest('currentPassword and newPassword are required.');
    if (newPassword.length < 8) throw AppError.badRequest('New password must be at least 8 characters.');
    await userService.changePassword(req.user!.userId, currentPassword, newPassword);
    sendSuccess(res, { message: 'Password changed successfully.' });
  }),

  deleteAccount: asyncHandler(async (req: Request, res: Response) => {
    const { password } = req.body as { password?: string };
    if (!password) throw AppError.badRequest('password is required to confirm account deletion.');
    await userService.deleteAccount(req.user!.userId, password);
    sendSuccess(res, { message: 'Account deleted.' });
  }),

  registerPushToken: asyncHandler(async (req: Request, res: Response) => {
    const { pushToken } = req.body as { pushToken?: string };
    if (!pushToken || typeof pushToken !== 'string') {
      throw AppError.badRequest('pushToken is required');
    }
    await userService.updatePushToken(req.user!.userId, pushToken);
    sendSuccess(res, { message: 'Push token registered.' });
  }),
};
