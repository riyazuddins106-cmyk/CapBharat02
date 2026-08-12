import { and, desc, eq, inArray, isNull, lt, ne, or, sql } from 'drizzle-orm';
import { db } from '../config/database.js';
import {
  bookingAssignmentLogs, bookingItems, bookingPartnerRequests, bookings, professionals, partnerServices,
  users, addresses, platformSettings, services,
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
import { getProfessionalsWithApprovedMandatoryDocuments } from './document.service.js';

const eligibleStatuses = ['searching_partner', 'waiting_operation'];

function serviceMatchesPartnerSubCategory() {
  return or(
    isNull(professionals.subCategoryId),
    isNull(services.subCategoryId),
    sql`${services.subCategoryId} = ${professionals.subCategoryId}`,
  );
}

function serviceMatchesPartnerSubCategoryId(partnerSubCategoryId: string | null) {
  return partnerSubCategoryId
    ? or(
        isNull(services.subCategoryId),
        eq(services.subCategoryId, partnerSubCategoryId),
      )
    : undefined;
}

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
      .innerJoin(services, eq(partnerServices.serviceId, services.id))
      .leftJoin(users, eq(professionals.userId, users.id))
      .where(and(
        serviceFilter,
        eq(services.categoryId, professionals.categoryId),
        serviceMatchesPartnerSubCategory(),
        eq(professionals.isActive, true),
        eq(professionals.availabilityStatus, 'available'),
        isNull(professionals.deletedAt),
      ));

    // Only dispatch to partners who have all mandatory docs approved.
    const verifiedIds = await getProfessionalsWithApprovedMandatoryDocuments(
      allCandidates.map(({ pro }) => pro.id),
    );
    const verifiedCandidates = allCandidates.filter(({ pro }) => verifiedIds.has(pro.id));
    if (verifiedCandidates.length < allCandidates.length) {
      console.log(`[dispatch] booking=${booking.id} filtered out ${allCandidates.length - verifiedCandidates.length} partner(s) with incomplete documents`);
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
    const [existing] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
    if (!existing) throw AppError.notFound('Booking not found.');
    if (
      ['searching_partner', 'waiting_operation'].includes(existing.dispatchStatus)
      && existing.dispatchDeadline
      && existing.dispatchDeadline.getTime() <= Date.now()
    ) {
      await db.update(bookingPartnerRequests).set({ status: 'expired', respondedAt: new Date() })
        .where(and(eq(bookingPartnerRequests.bookingId, bookingId), eq(bookingPartnerRequests.status, 'pending')));
      await db.update(bookings).set({ dispatchStatus: 'waiting_operation', updatedAt: new Date() })
        .where(eq(bookings.id, bookingId));
      throw AppError.conflict('This search window has ended. The customer can continue searching for a partner.');
    }

    const [partner] = await db.select({
      id: professionals.id,
      categoryId: professionals.categoryId,
      subCategoryId: professionals.subCategoryId,
    }).from(professionals).where(eq(professionals.id, partnerId)).limit(1);
    if (!partner) throw AppError.badRequest('Partner not found.');

    const bookingItemsForEligibility = await db.select({ serviceId: bookingItems.serviceId })
      .from(bookingItems)
      .where(eq(bookingItems.bookingId, bookingId));
    if (bookingItemsForEligibility.length) {
      const [qualified] = await db.select({ id: partnerServices.partnerId })
        .from(partnerServices)
        .innerJoin(services, eq(partnerServices.serviceId, services.id))
        .where(and(
          eq(partnerServices.partnerId, partnerId),
          inArray(partnerServices.serviceId, bookingItemsForEligibility.map((item) => item.serviceId)),
          eq(services.categoryId, partner.categoryId),
          serviceMatchesPartnerSubCategoryId(partner.subCategoryId),
        ))
        .limit(1);
      if (!qualified) throw AppError.badRequest('This partner is not eligible for the selected category and sub-category.');
    } else if (partner.categoryId !== existing.categoryId) {
      throw AppError.badRequest('This partner is not eligible for the selected category.');
    }

    const verifiedIds = await getProfessionalsWithApprovedMandatoryDocuments([partnerId]);
    if (!verifiedIds.has(partnerId)) {
      throw AppError.badRequest('This partner cannot accept jobs until all required documents are approved.');
    }
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

  /** Pause partner search for an unassigned legacy booking. */
  async stopSearching(bookingId: string) {
    const [booking] = await db.select().from(bookings)
      .where(and(eq(bookings.id, bookingId), isNull(bookings.deletedAt)))
      .limit(1);
    if (!booking) throw AppError.notFound('Booking not found.');
    if (booking.status === 'cancelled' || booking.status === 'completed') {
      throw AppError.badRequest('This booking is already finished.');
    }
    if (booking.professionalId || booking.dispatchStatus === 'assigned') {
      throw AppError.badRequest('This booking already has an assigned partner.');
    }
    if (!['searching_partner', 'waiting_operation'].includes(booking.dispatchStatus)) {
      throw AppError.badRequest('This booking is not currently searching for a partner.');
    }

    await db.update(bookingPartnerRequests)
      .set({ status: 'expired', respondedAt: new Date() })
      .where(and(
        eq(bookingPartnerRequests.bookingId, bookingId),
        eq(bookingPartnerRequests.status, 'pending'),
      ));

    const [updated] = await db.update(bookings)
      .set({ dispatchStatus: 'waiting_operation', updatedAt: new Date() })
      .where(eq(bookings.id, bookingId))
      .returning();

    await db.insert(bookingAssignmentLogs).values({
      bookingId,
      action: 'SEARCH_STOPPED',
    });

    return updated;
  },

  /** Pause expired legacy searches when the customer polls their bookings. */
  async expireTimedOutForCustomer(customerId: string) {
    const expired = await db.select({ id: bookings.id })
      .from(bookings)
      .where(and(
        eq(bookings.customerId, customerId),
        eq(bookings.dispatchStatus, 'searching_partner'),
        or(
          lt(bookings.dispatchDeadline, new Date()),
          and(isNull(bookings.dispatchDeadline), lt(bookings.createdAt, new Date(Date.now() - 10 * 60_000))),
        ),
        isNull(bookings.deletedAt),
      ));

    await Promise.all(expired.map(async ({ id }) => {
      await db.update(bookingPartnerRequests).set({ status: 'expired', respondedAt: new Date() })
        .where(and(eq(bookingPartnerRequests.bookingId, id), eq(bookingPartnerRequests.status, 'pending')));
      await db.update(bookings).set({ dispatchStatus: 'waiting_operation', updatedAt: new Date() })
        .where(and(eq(bookings.id, id), eq(bookings.dispatchStatus, 'searching_partner')));
    }));
  },

  /** Restart the configured search window for an unassigned legacy booking. */
  async continueSearching(bookingId: string, customerId: string, durationMinutes: number) {
    const [booking] = await db.select().from(bookings)
      .where(and(eq(bookings.id, bookingId), eq(bookings.customerId, customerId), isNull(bookings.deletedAt)))
      .limit(1);
    if (!booking) throw AppError.notFound('Booking not found.');
    if (booking.professionalId) throw AppError.badRequest('This booking already has an assigned partner.');
    if (['cancelled', 'completed'].includes(booking.status)) {
      throw AppError.badRequest('This booking is already finished.');
    }

    await db.update(bookingPartnerRequests).set({ status: 'expired', respondedAt: new Date() })
      .where(and(eq(bookingPartnerRequests.bookingId, bookingId), eq(bookingPartnerRequests.status, 'pending')));
    const [updated] = await db.update(bookings).set({
      status: 'pending',
      dispatchStatus: 'searching_partner',
      dispatchDeadline: new Date(Date.now() + durationMinutes * 60_000),
      updatedAt: new Date(),
    }).where(eq(bookings.id, bookingId)).returning();

    const items = await db.select({ serviceId: bookingItems.serviceId })
      .from(bookingItems)
      .where(eq(bookingItems.bookingId, bookingId));
    await this.broadcast(updated, items.map((item) => item.serviceId).filter(Boolean) as string[]);
    return updated;
  },

  /** Expire legacy searches before they are returned in the operations queue. */
  async expireTimedOutForOperations() {
    const fallbackCutoff = new Date(Date.now() - 10 * 60_000);
    const expired = await db.select({ id: bookings.id })
      .from(bookings)
      .where(and(
        eq(bookings.dispatchStatus, 'searching_partner'),
        or(
          lt(bookings.dispatchDeadline, new Date()),
          and(isNull(bookings.dispatchDeadline), lt(bookings.createdAt, fallbackCutoff)),
        ),
        isNull(bookings.deletedAt),
      ));

    await Promise.all(expired.map(async ({ id }) => {
      await db.update(bookingPartnerRequests)
        .set({ status: 'expired', respondedAt: new Date() })
        .where(and(
          eq(bookingPartnerRequests.bookingId, id),
          eq(bookingPartnerRequests.status, 'pending'),
        ));
      await db.update(bookings)
        .set({ dispatchStatus: 'waiting_operation', updatedAt: new Date() })
        .where(and(
          eq(bookings.id, id),
          eq(bookings.dispatchStatus, 'searching_partner'),
        ));
    }));

    return expired.length;
  },

  async listForOperations(status?: string) {
    await this.expireTimedOutForOperations();

    const rows = await db.select({ booking: bookings, customer: users })
      .from(bookings).innerJoin(users, eq(bookings.customerId, users.id))
      .where(and(isNull(bookings.deletedAt), status ? eq(bookings.dispatchStatus, status) : undefined))
      .orderBy(desc(bookings.createdAt));

    if (!rows.length) return [];

    // Fetch ALL partner requests for this result set in ONE query, then group in memory
    // (replaces the old N+1 loop that fired one DB query per booking row)
    const bookingIds = rows.map(r => r.booking.id);
    const allRequests = await db.select({ request: bookingPartnerRequests, partner: professionals })
      .from(bookingPartnerRequests)
      .innerJoin(professionals, eq(bookingPartnerRequests.partnerId, professionals.id))
      .where(inArray(bookingPartnerRequests.bookingId, bookingIds));

    const requestsByBooking = new Map<string, typeof allRequests>();
    for (const r of allRequests) {
      const id = r.request.bookingId;
      if (!requestsByBooking.has(id)) requestsByBooking.set(id, []);
      requestsByBooking.get(id)!.push(r);
    }

    return rows.map(({ booking, customer }) => ({
      ...booking,
      customerName: customer.fullName,
      requests: requestsByBooking.get(booking.id) ?? [],
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
      .where(and(
        eq(professionals.categoryId, booking.categoryId),
        eq(professionals.isActive, true),
        isNull(professionals.deletedAt),
      ));
    if (!items.length) {
      const verifiedIds = await getProfessionalsWithApprovedMandatoryDocuments(
        rows.map(({ pro }) => pro.id),
      );
      return rows.map(({ pro }) => pro).filter((partner) => verifiedIds.has(partner.id));
    }

    // A partner is eligible if they offer ANY of the booked services
    const serviceIdList = items.map((i) => i.serviceId);
    const mapped = await db.select({ partnerId: partnerServices.partnerId })
      .from(partnerServices)
      .innerJoin(services, eq(partnerServices.serviceId, services.id))
      .innerJoin(professionals, eq(partnerServices.partnerId, professionals.id))
      .where(and(
        inArray(partnerServices.serviceId, serviceIdList),
        eq(services.categoryId, professionals.categoryId),
        serviceMatchesPartnerSubCategory(),
      ));
    const ids = new Set(mapped.map((r) => r.partnerId));
    // Sort: available first, then busy, then offline
    const serviceQualified = rows.filter(({ pro }) => ids.has(pro.id)).map(({ pro }) => pro);
    const verifiedIds = await getProfessionalsWithApprovedMandatoryDocuments(
      serviceQualified.map((partner) => partner.id),
    );
    const filtered = serviceQualified.filter((partner) => verifiedIds.has(partner.id));
    const order: Record<string, number> = { available: 0, busy: 1, offline: 2 };
    filtered.sort((a, b) => (order[a.availabilityStatus] ?? 3) - (order[b.availabilityStatus] ?? 3));
    return filtered;
  },

  async assign(bookingId: string, partnerId: string, assignedBy: string) {
    // Admin can force-assign any active partner regardless of current availability
    const [pro] = await db.select().from(professionals).where(and(eq(professionals.id, partnerId), eq(professionals.isActive, true), isNull(professionals.deletedAt))).limit(1);
    if (!pro) throw AppError.badRequest('Partner not found or inactive.');

    const [booking] = await db.select({
      id: bookings.id,
      categoryId: bookings.categoryId,
    }).from(bookings).where(and(eq(bookings.id, bookingId), isNull(bookings.deletedAt))).limit(1);
    if (!booking) throw AppError.notFound('Booking not found.');

    const bookingItemsForEligibility = await db.select({ serviceId: bookingItems.serviceId })
      .from(bookingItems)
      .where(eq(bookingItems.bookingId, bookingId));
    if (bookingItemsForEligibility.length) {
      const [qualified] = await db.select({ id: partnerServices.partnerId })
        .from(partnerServices)
        .innerJoin(services, eq(partnerServices.serviceId, services.id))
        .where(and(
          eq(partnerServices.partnerId, partnerId),
          inArray(partnerServices.serviceId, bookingItemsForEligibility.map((item) => item.serviceId)),
          eq(services.categoryId, pro.categoryId),
          serviceMatchesPartnerSubCategoryId(pro.subCategoryId),
        ))
        .limit(1);
      if (!qualified) throw AppError.badRequest('This partner is not eligible for the selected category and sub-category.');
    } else if (pro.categoryId !== booking.categoryId) {
      throw AppError.badRequest('This partner is not eligible for the selected category.');
    }

    const verifiedIds = await getProfessionalsWithApprovedMandatoryDocuments([partnerId]);
    if (!verifiedIds.has(partnerId)) {
      throw AppError.badRequest('This partner cannot receive jobs until all required documents are approved.');
    }
    // Allow admin to reassign even if booking already has a professional (force-assign)
    const [updatedBooking] = await db.update(bookings).set({
      professionalId: partnerId, proName: pro.name, status: 'upcoming',
      dispatchStatus: 'assigned', assignmentType: 'manual', assignedBy, updatedAt: new Date(),
    }).where(and(eq(bookings.id, bookingId), isNull(bookings.deletedAt))).returning();
    if (!updatedBooking) throw AppError.notFound('Booking not found.');
    await db.update(bookingPartnerRequests).set({ status: 'expired', respondedAt: new Date() }).where(eq(bookingPartnerRequests.bookingId, bookingId));
    await db.insert(bookingAssignmentLogs).values({ bookingId, partnerId, action: 'MANUAL_ASSIGNED', assignedByUserId: assignedBy });
    await db.update(professionals).set({ availabilityStatus: 'busy', currentBookingStatus: 'busy', updatedAt: new Date() }).where(eq(professionals.id, partnerId));
    await notifyPartner({ userId: pro.userId, name: pro.name }, updatedBooking, 'manual_assignment');
    await notificationDbService.create({ userId: updatedBooking.customerId, title: 'Professional assigned', body: `${pro.name} has been assigned to your booking.`, type: 'booking', data: { bookingId } });
    return updatedBooking;
  },

  async history(bookingId?: string) {
    return db.select().from(bookingAssignmentLogs)
      .where(bookingId ? eq(bookingAssignmentLogs.bookingId, bookingId) : undefined)
      .orderBy(desc(bookingAssignmentLogs.createdAt));
  },
};