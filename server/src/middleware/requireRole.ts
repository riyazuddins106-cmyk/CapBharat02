import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { db } from '../config/database.js';
import { users } from '../database/schema/index.js';
import { eq } from 'drizzle-orm';

type Role = 'customer' | 'partner' | 'admin' | 'operations_manager';

/**
 * Middleware that verifies the authenticated user has one of the required roles.
 * Must be used after `authenticate`.
 */
export function requireRole(...roles: Role[]) {
  return asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw AppError.unauthorized();

    const [user] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, req.user.userId))
      .limit(1);

    if (!user) throw AppError.unauthorized('User not found');
    if (!roles.includes(user.role as Role)) {
      throw AppError.forbidden(`Access restricted to: ${roles.join(', ')}`);
    }

    next();
  });
}
