import { and, eq, isNull, desc, sql } from 'drizzle-orm';
import { db } from '../config/database.js';
import { bookings, type Booking, type NewBooking } from '../database/schema/bookings.js';

export const bookingRepository = {
  async listForCustomer(customerId: string): Promise<Booking[]> {
    return db
      .select()
      .from(bookings)
      .where(and(eq(bookings.customerId, customerId), isNull(bookings.deletedAt)))
      .orderBy(desc(bookings.scheduledAt));
  },

  async findById(id: string): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(and(eq(bookings.id, id), isNull(bookings.deletedAt))).limit(1);
    return booking;
  },

  async findByIdAndCustomer(id: string, customerId: string): Promise<Booking | undefined> {
    const [booking] = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.id, id), eq(bookings.customerId, customerId), isNull(bookings.deletedAt)))
      .limit(1);
    return booking;
  },

  async create(data: NewBooking): Promise<Booking> {
    const [booking] = await db.insert(bookings).values(data).returning();
    return booking;
  },

  async updateStatus(id: string, status: Booking['status']): Promise<Booking | undefined> {
    const [booking] = await db.update(bookings).set({ status, updatedAt: new Date() }).where(eq(bookings.id, id)).returning();
    return booking;
  },

  async reschedule(id: string, scheduledAt: Date): Promise<Booking | undefined> {
    const [booking] = await db
      .update(bookings)
      .set({ scheduledAt, status: 'upcoming', updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();
    return booking;
  },

  async findActiveDuplicate(customerId: string, professionalId: string, scheduledAt: Date): Promise<Booking | undefined> {
    const [booking] = await db
      .select()
      .from(bookings)
      .where(and(
        eq(bookings.customerId, customerId),
        eq(bookings.professionalId, professionalId),
        eq(bookings.scheduledAt, scheduledAt),
        isNull(bookings.deletedAt),
        sql`${bookings.status} in ('pending', 'upcoming')`,
      ))
      .limit(1);
    return booking;
  },

  async countByProfessional(professionalId: string): Promise<number> {
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(bookings).where(eq(bookings.professionalId, professionalId));
    return count;
  },
};
