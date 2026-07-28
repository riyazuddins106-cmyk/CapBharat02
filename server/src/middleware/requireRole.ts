import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

type Role = 'customer' | 'partner' | 'admin' | 'operations_manager';

/**
 * Middleware that verifies the authenticated user has one of the required roles.
 * Must be used after `authenticate`.
 *
 * Role is read from req.user.role, which is embedded in the JWT access token —
 * no DB query is performed.
 */
export function requireRole(...roles: Role[]) {
  return asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw AppError.unauthorized();

    const userRole = req.user.role as Role;

    if (!roles.includes(userRole)) {
      throw AppError.forbidden(`Access restricted to: ${roles.join(', ')}`);
    }

    next();
  });
}
