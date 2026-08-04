import { db } from '../config/database.js';
import {
  bookings, bookingPartnerRequests, professionals, users, payoutRequests,
  payments, orderItems, orderItemPayments, bookingItems,
} from '../database/schema/index.js';
import { eq, and, isNull, isNotNull, or, desc, sql, exists } from 'drizzle-orm';

/** Subquery: most-recent payment status for a booking (null if none). */
const paymentStatusSub = (bookingIdCol: typeof bookings.id) =>
  sql<string | null>`(SELECT status FROM payments WHERE booking_id = ${bookingIdCol} ORDER BY created_at DESC LIMIT 1)`;

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

  /** List all bookings for this professional, newest first.
   *  Includes: (a) assigned bookings where professionalId matches,
   *  and (b) dispatched bookings where this partner has a pending request. */
  async listJobs(professionalId: string) {
    return db
      .selectDistinct({
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
        paymentStatus: paymentStatusSub(bookings.id),
      })
      .from(bookings)
      .leftJoin(users, eq(bookings.customerId, users.id))
      .leftJoin(
        bookingPartnerRequests,
        and(
          eq(bookingPartnerRequests.bookingId, bookings.id),
          eq(bookingPartnerRequests.partnerId, professionalId),
          eq(bookingPartnerRequests.status, 'pending'),
        ),
      )
      .where(
        and(
          isNull(bookings.deletedAt),
          or(
            eq(bookings.professionalId, professionalId),
            isNotNull(bookingPartnerRequests.id),
          ),
        ),
      )
      .orderBy(desc(bookings.scheduledAt));
  },

  /** Get a single job visible to this professional.
   *  Matches if: (a) this partner is the assigned professional,
   *  OR (b) there is a pending dispatch request for this partner. */
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
        paymentStatus: paymentStatusSub(bookings.id),
      })
      .from(bookings)
      .leftJoin(users, eq(bookings.customerId, users.id))
      .leftJoin(
        bookingPartnerRequests,
        and(
          eq(bookingPartnerRequests.bookingId, bookings.id),
          eq(bookingPartnerRequests.partnerId, professionalId),
          eq(bookingPartnerRequests.status, 'pending'),
        ),
      )
      .where(
        and(
          eq(bookings.id, bookingId),
          isNull(bookings.deletedAt),
          or(
            eq(bookings.professionalId, professionalId),
            isNotNull(bookingPartnerRequests.id),
          ),
        ),
      )
      .limit(1);
    return job ?? null;
  },

  /** Update booking status */
  async updateStatus(bookingId: string, status: 'pending' | 'upcoming' | 'in_progress' | 'completed' | 'cancelled') {
    const [updated] = await db
      .update(bookings)
      .set({ status, updatedAt: new Date() })
      .where(eq(bookings.id, bookingId))
      .returning();
    return updated;
  },

  /** Earnings summary across legacy bookings and service-order items.
   *
   * Legacy bookings become earnings only after a customer payment is paid.
   * Service-order items become earnings only after the item is completed and
   * its item payment is paid. The two systems are separate, so aggregating
   * them here does not double-count a job.
   */
  async getEarnings(professionalId: string) {
    const legacyRows = await db
      .select({
        amount: sql<number>`COALESCE(SUM(${bookingItems.unitPartnerPayout} * ${bookingItems.quantity}), ${bookings.price})`,
        scheduledAt: bookings.scheduledAt,
      })
      .from(bookings)
      .leftJoin(bookingItems, eq(bookingItems.bookingId, bookings.id))
      .where(
        and(
          eq(bookings.professionalId, professionalId),
          eq(bookings.status, 'completed'),
          isNull(bookings.deletedAt),
          exists(
            db.select({ one: sql`1` })
              .from(payments)
              .where(and(
                eq(payments.bookingId, bookings.id),
                eq(payments.status, 'paid'),
              )),
          ),
        ),
      )
      .groupBy(bookings.id, bookings.price, bookings.scheduledAt);

    const serviceRows = await db
      .select({
        payout: orderItems.partnerPayout,
        quantity: orderItems.quantity,
        scheduledAt: orderItems.scheduledAt,
      })
      .from(orderItems)
      .innerJoin(orderItemPayments, eq(orderItemPayments.orderItemId, orderItems.id))
      .where(and(
        eq(orderItems.partnerId, professionalId),
        eq(orderItems.status, 'service_completed'),
        eq(orderItemPayments.status, 'paid'),
      ));

    const rows = [
      ...legacyRows.map(row => ({ amount: Number(row.amount), scheduledAt: row.scheduledAt })),
      ...serviceRows.map(row => ({
        amount: row.payout * Math.max(1, row.quantity),
        scheduledAt: row.scheduledAt,
      })),
    ];

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let total = 0, thisMonth = 0, today = 0;
    for (const row of rows) {
      const d = new Date(row.scheduledAt);
      total += row.amount;
      if (d >= startOfMonth) thisMonth += row.amount;
      if (d >= startOfToday) today += row.amount;
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
      if (key in weeklyMap) weeklyMap[key] += row.amount;
    }

    return {
      total,
      thisMonth,
      today,
      completedJobs: rows.length,
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
      if (row.status === 'pending' || row.status === 'approved' || row.status === 'processing') pending += row.amount;
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
