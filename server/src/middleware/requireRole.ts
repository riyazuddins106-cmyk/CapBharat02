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
 *
 * Role is read directly from req.user.role (embedded in the JWT access token)
 * to avoid a DB hit on every request. For tokens issued before the role field
 * was added to the JWT payload, a single DB fallback lookup is performed —
 * this only affects sessions within the first 15-minute access-token TTL after
 * the deployment of this change.
 */
export function requireRole(...roles: Role[]) {
  return asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw AppError.unauthorized();

    let userRole = req.user.role as Role | undefined;

    // Legacy fallback: role missing from token (issued before this change)
    if (!userRole) {
      const [user] = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, req.user.userId))
        .limit(1);

      if (!user) throw AppError.unauthorized('User not found');
      userRole = user.role as Role;
    }

    if (!roles.includes(userRole)) {
      throw AppError.forbidden(`Access restricted to: ${roles.join(', ')}`);
    }

    next();
  });
}
