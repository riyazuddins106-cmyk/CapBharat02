import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const authenticate = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw AppError.unauthorized('Missing or invalid authorization header');
  }

  const token = header.slice('Bearer '.length);

  try {
    const payload = verifyAccessToken(token);
    req.user = { userId: payload.userId, email: payload.email };
    next();
  } catch {
    throw AppError.unauthorized('Invalid or expired access token');
  }
});

/**
 * Like `authenticate` but non-blocking — attaches req.user if a valid token is
 * present, otherwise continues without error. Used for public endpoints that
 * return richer data when the caller is authenticated (e.g. isFavorite flag).
 */
export const optionalAuthenticate = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    const token = header.slice('Bearer '.length);
    try {
      const payload = verifyAccessToken(token);
      req.user = { userId: payload.userId, email: payload.email };
    } catch {
      // Token invalid — proceed as unauthenticated, do not throw
    }
  }
  next();
});
