import { and, desc, eq, inArray, isNull, ne, or, sql } from 'drizzle-orm';
import { db } from '../config/database.js';
import {
  bookingAssignmentLogs, bookingItems, bookingPartnerRequests, bookings, professionals, partnerServices,
  users, addresses,
} from '../database/schema/index.js';

const MAX_RADIUS_KM = 30;

/** Haversine distance in km between two lat/lng points */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
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
  async broadcast(booking: typeof bookings.$inferSelect, serviceIds: string[]) {
    // Match partners who offer ANY of the booked services (not just the first).
    const serviceFilter = serviceIds.length === 1
      ? eq(partnerServices.serviceId, serviceIds[0])
      : inArray(partnerServices.serviceId, serviceIds);

    const allCandidates = await db.select({ pro: professionals, user: users })
      .from(partnerServices)
      .innerJoin(professionals, eq(partnerServices.partnerId, professionals.id))
      .leftJoin(users, eq(professionals.userId, users.id))
      .where(and(
        serviceFilter,
        eq(professionals.isActive, true),
        eq(professionals.availabilityStatus, 'available'),
        isNull(professionals.deletedAt),
      ));

    // ── Document verification gate ─────────────────────────────────────────
    // Only dispatch to partners who have all mandatory docs approved.
    const mandatoryRows = await db.execute(
      sql`SELECT type_key FROM document_type_configs WHERE is_mandatory = true AND is_active = true`
    );
    const mandatoryKeys: string[] = ((mandatoryRows as any).rows ?? (mandatoryRows as any)).map((r: any) => r.type_key);

    let verifiedCandidates = allCandidates;
    if (mandatoryKeys.length > 0) {
      const candidateIds = allCandidates.map(c => c.pro.id);
      if (candidateIds.length > 0) {
        const approvedRows = await db.execute(
          sql`SELECT professional_id, document_type FROM partner_documents
              WHERE professional_id = ANY(${candidateIds}::uuid[]) AND status = 'approved'`
        );
        const approvedByPro = new Map<string, Set<string>>();
        for (const r of ((approvedRows as any).rows ?? (approvedRows as any)) as any[]) {
          if (!approvedByPro.has(r.professional_id)) approvedByPro.set(r.professional_id, new Set());
          approvedByPro.get(r.professional_id)!.add(r.document_type);
        }
        verifiedCandidates = allCandidates.filter(({ pro }) => {
          const approved = approvedByPro.get(pro.id) ?? new Set();
          return mandatoryKeys.every(k => approved.has(k));
        });
        if (verifiedCandidates.length < allCandidates.length) {
          console.log(`[dispatch] booking=${booking.id} filtered out ${allCandidates.length - verifiedCandidates.length} partner(s) with incomplete documents`);
        }
      }
    }
    // ───────────────────────────────────────────────────────────────────────
    if (!verifiedCandidates.length) return [];

    // ── GPS-based proximity filtering ──────────────────────────────────────
    // Try to get the booking's address coordinates for distance sorting.
    let bookingLat: number | null = null;
    let bookingLng: number | null = null;
    if (booking.addressId) {
      const [addr] = await db
        .select({ latitude: addresses.latitude, longitude: addresses.longitude })
        .from(addresses)
        .where(eq(addresses.id, booking.addressId))
        .limit(1);
      bookingLat = addr?.latitude ?? null;
      bookingLng = addr?.longitude ?? null;
    }

    let candidates = verifiedCandidates;

    if (bookingLat !== null && bookingLng !== null) {
      // Annotate each candidate with their distance (partners without GPS go last)
      const withDistance = verifiedCandidates.map((c) => {
        const { latitude: pLat, longitude: pLng } = c.pro;
        const distance =
          pLat !== null && pLng !== null
            ? haversineKm(bookingLat!, bookingLng!, pLat, pLng)
            : Infinity;
        return { ...c, distance };
      });

      // Sort nearest first
      withDistance.sort((a, b) => a.distance - b.distance);

      // Prefer partners within MAX_RADIUS_KM; fall back to all if none qualify
      const nearby = withDistance.filter((c) => c.distance <= MAX_RADIUS_KM);
      candidates = (nearby.length > 0 ? nearby : withDistance).map(({ distance: _d, ...c }) => c);

      console.log(
        `[dispatch] booking=${booking.id} address=(${bookingLat},${bookingLng}) ` +
        `candidates=${verifiedCandidates.length} within${MAX_RADIUS_KM}km=${nearby.length}`,
      );
    }
    // ────────────────────────────────────────────────────────────────────────

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
    // Only update if the request is still pending — prevents double-rejection
    const [updated] = await db.update(bookingPartnerRequests)
      .set({ status: 'rejected', respondedAt: new Date() })
      .where(and(
        eq(bookingPartnerRequests.bookingId, bookingId),
        eq(bookingPartnerRequests.partnerId, partnerId),
        eq(bookingPartnerRequests.status, 'pending'),
      ))
      .returning();
    if (!updated) throw AppError.conflict('This job request has already been responded to or is no longer available.');
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

    // Derive eligible service IDs from booking_items (handles single and multi-item bookings).
    // Fallback: if no items found, return all active partners so admin always has options.
    const items = await db.select({ serviceId: bookingItems.serviceId })
      .from(bookingItems)
      .where(eq(bookingItems.bookingId, bookingId));

    // Return ALL active partners (any status) so admin can see who's busy/free and decide
    const rows = await db.select({ pro: professionals })
      .from(professionals)
      .where(and(eq(professionals.isActive, true), isNull(professionals.deletedAt)));
    if (!items.length) return rows.map(({ pro }) => pro);

    // A partner is eligible if they offer ANY of the booked services
    const serviceIdList = items.map((i) => i.serviceId);
    const mapped = await db.select({ partnerId: partnerServices.partnerId }).from(partnerServices)
      .where(inArray(partnerServices.serviceId, serviceIdList));
    const ids = new Set(mapped.map((r) => r.partnerId));
    // Sort: available first, then busy, then offline
    const filtered = rows.filter(({ pro }) => ids.has(pro.id)).map(({ pro }) => pro);
    const order: Record<string, number> = { available: 0, busy: 1, offline: 2 };
    filtered.sort((a, b) => (order[a.availabilityStatus] ?? 3) - (order[b.availabilityStatus] ?? 3));
    return filtered;
  },

  async assign(bookingId: string, partnerId: string, assignedBy: string) {
    // Admin can force-assign any active partner regardless of current availability
    const [pro] = await db.select().from(professionals).where(and(eq(professionals.id, partnerId), eq(professionals.isActive, true), isNull(professionals.deletedAt))).limit(1);
    if (!pro) throw AppError.badRequest('Partner not found or inactive.');
    // Allow admin to reassign even if booking already has a professional (force-assign)
    const [booking] = await db.update(bookings).set({
      professionalId: partnerId, proName: pro.name, status: 'upcoming',
      dispatchStatus: 'assigned', assignmentType: 'manual', assignedBy, updatedAt: new Date(),
    }).where(and(eq(bookings.id, bookingId), isNull(bookings.deletedAt))).returning();
    if (!booking) throw AppError.notFound('Booking not found.');
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