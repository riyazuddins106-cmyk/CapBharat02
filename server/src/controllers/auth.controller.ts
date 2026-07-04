import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import { authService } from '../services/auth.service.js';

export const authController = {
  register: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.register(req.body);
    sendSuccess(res, result, 201);
  }),

  verifyOtp: asyncHandler(async (req: Request, res: Response) => {
    const { email, code, purpose } = req.body;
    if (purpose === 'signup') {
      const result = await authService.verifySignupOtp(email, code);
      return sendSuccess(res, result);
    }
    return sendSuccess(res, { message: 'Use /auth/reset-password for password reset verification.' });
  }),

  resendOtp: asyncHandler(async (req: Request, res: Response) => {
    await authService.resendOtp(req.body.email, req.body.purpose);
    sendSuccess(res, { message: 'Verification code sent.' });
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.login(req.body);
    sendSuccess(res, result);
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.refresh(req.body.refreshToken);
    sendSuccess(res, result);
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    await authService.logout(req.body.refreshToken);
    sendSuccess(res, { message: 'Logged out.' });
  }),

  forgotPassword: asyncHandler(async (req: Request, res: Response) => {
    await authService.forgotPassword(req.body.email);
    sendSuccess(res, { message: 'If an account exists, a reset code has been sent.' });
  }),

  resetPassword: asyncHandler(async (req: Request, res: Response) => {
    await authService.resetPassword(req.body);
    sendSuccess(res, { message: 'Password has been reset. Please log in.' });
  }),
};
