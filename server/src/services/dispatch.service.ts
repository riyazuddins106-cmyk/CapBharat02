import { and, desc, eq, inArray, isNull, ne, sql } from 'drizzle-orm';
import { db } from '../config/database.js';
import {
  bookingAssignmentLogs, bookingPartnerRequests, bookings, professionals, partnerServices,
  services, users,
} from '../database/schema/index.js';
import { AppError } from '../utils/AppError.js';
import { notificationDbService } from './notificationDb.service.js';
import { notificationService } from './notification.service.js';

const eligibleStatuses = ['searching_partner', 'waiting_operation'];

async function notifyPartner(pro: { userId: string | null; name: string }, booking: typeof bookings.$inferSelect, type: string) {
  if (!pro.userId) return;
  const title = type === 'manual' ? 'New assigned job' : 'New job request';
  const body = `${booking.serviceName} is scheduled for ${new Date(booking.scheduledAt).toLocaleString('en-IN')}.`;
  void notificationService.sendToUser(pro.userId, title, body, { bookingId: booking.id, type });
  void notificationDbService.create({ userId: pro.userId, title, body, type: 'booking', data: { bookingId: booking.id, dispatchType: type } });
}

export const dispatchService = {
  async broadcast(booking: typeof bookings.$inferSelect, serviceId: string) {
    const candidates = await db.select({ pro: professionals, user: users })
      .from(partnerServices)
      .innerJoin(professionals, eq(partnerServices.partnerId, professionals.id))
      .leftJoin(users, eq(professionals.userId, users.id))
      .where(and(
        eq(partnerServices.serviceId, serviceId),
        eq(professionals.isActive, true),
        eq(professionals.availabilityStatus, 'available'),
        eq(professionals.currentBookingStatus, 'available'),
        isNull(professionals.deletedAt),
      ));
    if (!candidates.length) return [];
    await db.insert(bookingPartnerRequests).values(candidates.map(({ pro }) => ({
      bookingId: booking.id, partnerId: pro.id, status: 'pending',
    })));
    await db.insert(bookingAssignmentLogs).values(candidates.map(({ pro }) => ({
      bookingId: booking.id, partnerId: pro.id, action: 'AUTO_SENT',
    })));
    await Promise.all(candidates.map(({ pro }) => notifyPartner({ userId: pro.userId, name: pro.name }, booking, 'job_request')));
    return candidates.map(({ pro }) => pro.id);
  },

  async accept(bookingId: string, partnerId: string) {
    const result = await db.update(bookings).set({
      professionalId: partnerId,
      proName: sql`(SELECT name FROM professionals WHERE id = ${partnerId})`,
      status: 'upcoming',
      dispatchStatus: 'assigned',
      assignmentType: 'auto',
      updatedAt: new Date(),
    }).where(and(eq(bookings.id, bookingId), isNull(bookings.professionalId), inArray(bookings.dispatchStatus, eligibleStatuses))).returning();
    const booking = result[0];
    if (!booking) throw AppError.conflict('This booking has already been assigned.');
    await db.update(bookingPartnerRequests).set({ status: 'accepted', respondedAt: new Date() })
      .where(and(eq(bookingPartnerRequests.bookingId, bookingId), eq(bookingPartnerRequests.partnerId, partnerId)));
    await db.update(bookingPartnerRequests).set({ status: 'expired', respondedAt: new Date() })
      .where(and(eq(bookingPartnerRequests.bookingId, bookingId), ne(bookingPartnerRequests.partnerId, partnerId)));
    await db.insert(bookingAssignmentLogs).values({ bookingId, partnerId, action: 'PARTNER_ACCEPTED' });
    await db.update(professionals).set({ availabilityStatus: 'busy', currentBookingStatus: 'busy', updatedAt: new Date() })
      .where(eq(professionals.id, partnerId));
    return booking;
  },

  async reject(bookingId: string, partnerId: string) {
    await db.update(bookingPartnerRequests).set({ status: 'rejected', respondedAt: new Date() })
      .where(and(eq(bookingPartnerRequests.bookingId, bookingId), eq(bookingPartnerRequests.partnerId, partnerId)));
    await db.insert(bookingAssignmentLogs).values({ bookingId, partnerId, action: 'PARTNER_REJECTED' });
    const [remaining] = await db.select({ count: sql<number>`count(*)::int` }).from(bookingPartnerRequests)
      .where(and(eq(bookingPartnerRequests.bookingId, bookingId), eq(bookingPartnerRequests.status, 'pending')));
    if (!remaining?.count) await db.update(bookings).set({ dispatchStatus: 'waiting_operation', updatedAt: new Date() }).where(eq(bookings.id, bookingId));
  },

  async listForOperations(status?: string) {
    const rows = await db.select({ booking: bookings, customer: users })
      .from(bookings).innerJoin(users, eq(bookings.customerId, users.id))
      .where(and(isNull(bookings.deletedAt), status ? eq(bookings.dispatchStatus, status) : undefined))
      .orderBy(desc(bookings.createdAt));
    return Promise.all(rows.map(async ({ booking, customer }) => {
      const requests = await db.select({ request: bookingPartnerRequests, partner: professionals })
        .from(bookingPartnerRequests).innerJoin(professionals, eq(bookingPartnerRequests.partnerId, professionals.id))
        .where(eq(bookingPartnerRequests.bookingId, booking.id));
      return { ...booking, customerName: customer.fullName, requests };
    }));
  },

  async eligiblePartners(bookingId: string) {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
    if (!booking) throw AppError.notFound('Booking not found.');
    const [firstItem] = await db.select({ serviceId: services.id }).from(services)
      .where(eq(services.name, booking.serviceName)).limit(1);
    const rows = await db.select({ pro: professionals })
      .from(professionals)
      .where(and(eq(professionals.isActive, true), eq(professionals.availabilityStatus, 'available'), eq(professionals.currentBookingStatus, 'available'), isNull(professionals.deletedAt)));
    if (!firstItem) return rows.map(({ pro }) => pro);
    const mapped = await db.select({ partnerId: partnerServices.partnerId }).from(partnerServices).where(eq(partnerServices.serviceId, firstItem.serviceId));
    const ids = new Set(mapped.map((r) => r.partnerId));
    return rows.filter(({ pro }) => ids.has(pro.id)).map(({ pro }) => pro);
  },

  async assign(bookingId: string, partnerId: string, assignedBy: string) {
    const [pro] = await db.select().from(professionals).where(and(eq(professionals.id, partnerId), eq(professionals.isActive, true), eq(professionals.availabilityStatus, 'available'), eq(professionals.currentBookingStatus, 'available'))).limit(1);
    if (!pro) throw AppError.badRequest('Partner is not available.');
    const [booking] = await db.update(bookings).set({
      professionalId: partnerId, proName: pro.name, status: 'upcoming',
      dispatchStatus: 'assigned', assignmentType: 'manual', assignedBy, updatedAt: new Date(),
    }).where(and(eq(bookings.id, bookingId), isNull(bookings.professionalId))).returning();
    if (!booking) throw AppError.conflict('Booking has already been assigned.');
    await db.update(bookingPartnerRequests).set({ status: 'expired', respondedAt: new Date() }).where(eq(bookingPartnerRequests.bookingId, bookingId));
    await db.insert(bookingAssignmentLogs).values({ bookingId, partnerId, action: 'MANUAL_ASSIGNED', assignedByUserId: assignedBy });
    await db.update(professionals).set({ availabilityStatus: 'busy', currentBookingStatus: 'busy', updatedAt: new Date() }).where(eq(professionals.id, partnerId));
    await notifyPartner({ userId: pro.userId, name: pro.name }, booking, 'manual_assignment');
    await notificationDbService.create({ userId: booking.customerId, title: 'Professional assigned', body: `${pro.name} has been assigned to your booking.`, type: 'booking', data: { bookingId } });
    return booking;
  },

  async history(bookingId?: string) {
    return db.select().from(bookingAssignmentLogs)
      .where(bookingId ? eq(bookingAssignmentLogs.bookingId, bookingId) : undefined)
      .orderBy(desc(bookingAssignmentLogs.createdAt));
  },
};