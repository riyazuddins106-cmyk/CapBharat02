import { db } from '../config/database.js';
import { auditLogs } from '../database/schema/index.js';
import { desc, count } from 'drizzle-orm';

export const auditLogService = {
  async record(adminId: string, action: string, targetType: string, targetId?: string | null, metadata: Record<string, unknown> = {}) {
    try {
      await db.insert(auditLogs).values({
        adminId,
        action,
        targetType,
        targetId: targetId ?? null,
        metadata,
      });
    } catch (err) {
      // Audit logging must never break the primary action.
      console.error('[auditLog] failed to record entry', err);
    }
  },

  async list(limit: number, offset: number) {
    const rows = await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ total }] = await db.select({ total: count(auditLogs.id) }).from(auditLogs);

    return { rows, total: Number(total) };
  },
};
