import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { sendError } from '../utils/response.js';
import { isProduction } from '../config/env.js';

export function notFoundHandler(req: Request, res: Response) {
  sendError(res, 404, `Route not found: ${req.method} ${req.originalUrl}`);
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return sendError(res, 400, 'Validation failed', err.flatten());
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(err.message, { stack: err.stack, path: req.originalUrl });
    }
    return sendError(res, err.statusCode, err.message, err.details);
  }

  const error = err as Error;
  logger.error(error?.message ?? 'Unknown error', { stack: error?.stack, path: req.originalUrl });

  return sendError(res, 500, isProduction ? 'Internal server error' : error?.message ?? 'Internal server error');
}
