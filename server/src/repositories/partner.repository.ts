import { db } from '../config/database.js';
import { bookings, professionals, users, payoutRequests } from '../database/schema/index.js';
import { eq, and, isNull, desc, sql } from 'drizzle-orm';

export const partnerRepository = {
  /** Find the professional record linked to a user */
  async findProfessionalByUserId(userId: string) {
    const [pro] = await db
      .select()
      .from(professionals)
      .where(and(eq(professionals.userId, userId), isNull(professionals.deletedAt)))
      .limit(1);
    return pro ?? null;
  },

  /** List all bookings for this professional, newest first */
  async listJobs(professionalId: string) {
    return db
      .select({
        id: bookings.id,
        customerId: bookings.customerId,
        professionalId: bookings.professionalId,
        categoryId: bookings.categoryId,
        addressId: bookings.addressId,
        serviceName: bookings.serviceName,
        proName: bookings.proName,
        scheduledAt: bookings.scheduledAt,
        status: bookings.status,
        notes: bookings.notes,
        price: bookings.price,
        createdAt: bookings.createdAt,
        updatedAt: bookings.updatedAt,
        customerName: users.fullName,
        customerPhone: users.phone,
      })
      .from(bookings)
      .leftJoin(users, eq(bookings.customerId, users.id))
      .where(and(eq(bookings.professionalId, professionalId), isNull(bookings.deletedAt)))
      .orderBy(desc(bookings.scheduledAt));
  },

  /** Get a single job that belongs to this professional */
  async findJobByIdAndProfessional(bookingId: string, professionalId: string) {
    const [job] = await db
      .select({
        id: bookings.id,
        customerId: bookings.customerId,
        professionalId: bookings.professionalId,
        categoryId: bookings.categoryId,
        addressId: bookings.addressId,
        serviceName: bookings.serviceName,
        proName: bookings.proName,
        scheduledAt: bookings.scheduledAt,
        status: bookings.status,
        notes: bookings.notes,
        price: bookings.price,
        createdAt: bookings.createdAt,
        updatedAt: bookings.updatedAt,
        customerName: users.fullName,
        customerPhone: users.phone,
      })
      .from(bookings)
      .leftJoin(users, eq(bookings.customerId, users.id))
      .where(
        and(
          eq(bookings.id, bookingId),
          eq(bookings.professionalId, professionalId),
          isNull(bookings.deletedAt),
        ),
      )
      .limit(1);
    return job ?? null;
  },

  /** Update booking status */
  async updateStatus(bookingId: string, status: 'in_progress' | 'completed') {
    const [updated] = await db
      .update(bookings)
      .set({ status, updatedAt: new Date() })
      .where(eq(bookings.id, bookingId))
      .returning();
    return updated;
  },

  /** Earnings summary: total, this month, today */
  async getEarnings(professionalId: string) {
    const rows = await db
      .select({
        price: bookings.price,
        scheduledAt: bookings.scheduledAt,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.professionalId, professionalId),
          eq(bookings.status, 'completed'),
          isNull(bookings.deletedAt),
        ),
      );

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let total = 0, thisMonth = 0, today = 0;
    for (const row of rows) {
      const d = new Date(row.scheduledAt);
      total += row.price;
      if (d >= startOfMonth) thisMonth += row.price;
      if (d >= startOfToday) today += row.price;
    }

    // Weekly breakdown (last 7 days)
    const weeklyMap: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(startOfToday);
      d.setDate(d.getDate() - i);
      weeklyMap[d.toISOString().slice(0, 10)] = 0;
    }
    for (const row of rows) {
      const key = new Date(row.scheduledAt).toISOString().slice(0, 10);
      if (key in weeklyMap) weeklyMap[key] += row.price;
    }

    return {
      total,
      thisMonth,
      today,
      weekly: Object.entries(weeklyMap).map(([date, amount]) => ({ date, amount })),
    };
  },

  /** Sum of amount already requested (pending or paid) for a professional */
  async getPayoutTotals(professionalId: string) {
    const rows = await db
      .select({ status: payoutRequests.status, amount: payoutRequests.amount })
      .from(payoutRequests)
      .where(eq(payoutRequests.professionalId, professionalId));
    let pending = 0, paid = 0;
    for (const row of rows) {
      if (row.status === 'pending') pending += row.amount;
      if (row.status === 'paid') paid += row.amount;
    }
    return { pending, paid };
  },

  async createPayoutRequest(professionalId: string, amount: number, note?: string) {
    const [row] = await db
      .insert(payoutRequests)
      .values({ professionalId, amount, note: note ?? null })
      .returning();
    return row;
  },

  async listPayoutRequestsForProfessional(professionalId: string) {
    return db
      .select()
      .from(payoutRequests)
      .where(eq(payoutRequests.professionalId, professionalId))
      .orderBy(desc(payoutRequests.requestedAt));
  },
};
