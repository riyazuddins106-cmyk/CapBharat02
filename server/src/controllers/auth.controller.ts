import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import { authService } from '../services/auth.service.js';
import { isProduction } from '../config/env.js';

// Strip devCode before sending in production so OTPs are never leaked to clients.
function sanitize<T extends { devCode?: string }>(data: T): Omit<T, 'devCode'> | T {
  if (isProduction) {
    const { devCode: _drop, ...rest } = data;
    return rest as Omit<T, 'devCode'>;
  }
  return data;
}

export const authController = {
  registerPartner: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.registerPartner(req.body);
    sendSuccess(res, sanitize(result), 201);
  }),

  register: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.register(req.body);
    sendSuccess(res, sanitize(result), 201);
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
    const result = await authService.resendOtp(req.body.email, req.body.purpose);
    sendSuccess(res, sanitize({ message: 'Verification code sent.', ...result }));
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

  logoutAll: asyncHandler(async (req: Request, res: Response) => {
    await authService.logoutAll(req.user!.userId);
    sendSuccess(res, { message: 'Logged out of all devices.' });
  }),

  forgotPassword: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.forgotPassword(req.body.email);
    sendSuccess(res, sanitize({ message: 'If an account exists, a reset code has been sent.', ...(result ?? {}) }));
  }),

  resetPassword: asyncHandler(async (req: Request, res: Response) => {
    await authService.resetPassword(req.body);
    sendSuccess(res, { message: 'Password has been reset. Please log in.' });
  }),
};
