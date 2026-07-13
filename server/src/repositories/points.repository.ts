import { and, eq, desc, sql } from 'drizzle-orm';
import { db } from '../config/database.js';
import { pointsLedger, type PointsLedgerEntry, type NewPointsLedgerEntry } from '../database/schema/pointsLedger.js';

export const pointsRepository = {
  async getBalance(userId: string): Promise<number> {
    const [row] = await db
      .select({ balance: sql<number>`coalesce(sum(${pointsLedger.points}), 0)::int` })
      .from(pointsLedger)
      .where(eq(pointsLedger.userId, userId));
    return row?.balance ?? 0;
  },

  async listHistory(userId: string, limit = 50): Promise<PointsLedgerEntry[]> {
    return db
      .select()
      .from(pointsLedger)
      .where(eq(pointsLedger.userId, userId))
      .orderBy(desc(pointsLedger.createdAt))
      .limit(limit);
  },

  async findByBooking(userId: string, bookingId: string, type: 'earn' | 'redeem' | 'adjust'): Promise<PointsLedgerEntry | undefined> {
    const [row] = await db
      .select()
      .from(pointsLedger)
      .where(and(eq(pointsLedger.userId, userId), eq(pointsLedger.bookingId, bookingId), eq(pointsLedger.type, type)))
      .limit(1);
    return row;
  },

  async addEntry(data: NewPointsLedgerEntry): Promise<PointsLedgerEntry> {
    const [row] = await db.insert(pointsLedger).values(data).returning();
    return row;
  },
};
