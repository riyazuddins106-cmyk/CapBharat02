import { and, eq, inArray, isNull, ne, or, sql } from 'drizzle-orm';
import { db } from '../config/database.js';
import {
  orderItems, orderItemRequests, orderItemPayments, orders,
  professionals, partnerServices, users, addresses, services,
} from '../database/schema/index.js';
import { notificationDbService } from './notificationDb.service.js';
import { notificationService } from './notification.service.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/AppError.js';
import { verifyOrderItemQrToken } from '../utils/bookingQr.js';

const MAX_RADIUS_KM = 30;

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

async function notifyPartnerOfItem(
  proUserId: string | null,
  proName: string,
  orderItem: typeof orderItems.$inferSelect,
  order: typeof orders.$inferSelect,
  type: string,
) {
  if (!proUserId) return;
  const title = type === 'manual' ? 'New assigned job' : 'New job request';
  const body = `New service request scheduled for ${new Date(order.scheduledAt).toLocaleString('en-IN')}.`;
  void notificationService.sendToUser(proUserId, title, body, { orderItemId: orderItem.id, orderId: order.id, type });
  void notificationDbService.create({
    userId: proUserId, title, body, type: 'booking',
    data: { orderItemId: orderItem.id, orderId: order.id, dispatchType: type },
  });
}

/** Re-compute and persist the master order status based on its items */
export async function recomputeOrderStatus(orderId: string) {
  const items = await db.select({ status: orderItems.status })
    .from(orderItems)
    .where(and(eq(orderItems.orderId, orderId)));

  if (!items.length) return;

  const nonCancelled = items.filter(i => i.status !== 'cancelled');
  if (!nonCancelled.length) {
    await db.update(orders).set({ status: 'cancelled', updatedAt: new Date() }).where(eq(orders.id, orderId));
    return;
  }

  const allCompleted  = nonCancelled.every(i => i.status === 'service_completed');
  const anyCompleted  = nonCancelled.some(i => i.status === 'service_completed');
  // The master order is only a summary. Each order item remains the source of
  // truth for the customer's Search, Active, and Pay Now tabs. Include an
  // assigned item in the summary so a multi-service order does not look like
  // it has no progress just because another service is still searching.
  const confirmedStatuses = ['assigned', 'partner_accepted', 'partner_arrived', 'payment_pending', 'payment_completed', 'service_started', 'service_completed'];
  const allConfirmed  = nonCancelled.every(i => confirmedStatuses.includes(i.status));
  const anyConfirmed  = nonCancelled.some(i => confirmedStatuses.includes(i.status));
  const anyInProgress = nonCancelled.some(i => ['partner_arrived', 'payment_pending', 'service_started'].includes(i.status));

  let newStatus: typeof orders.$inferSelect['status'];
  if (allCompleted)          newStatus = 'completed';
  else if (anyCompleted)     newStatus = 'partially_completed';
  else if (anyInProgress)    newStatus = 'in_progress';
  else if (allConfirmed)     newStatus = 'fully_confirmed';
  else if (anyConfirmed)     newStatus = 'partially_confirmed';
  else                       newStatus = 'searching_partners';

  await db.update(orders).set({ status: newStatus, updatedAt: new Date() }).where(eq(orders.id, orderId));
}

export const orderDispatchService = {
  /** Broadcast job requests to eligible partners for a single order item */
  async broadcastForItem(
    orderItem: typeof orderItems.$inferSelect,
    order: typeof orders.$inferSelect,
  ) {
    // Find all active/available partners who offer this specific service
    const allCandidates = await db.select({ pro: professionals, user: users })
      .from(partnerServices)
      .innerJoin(professionals, eq(partnerServices.partnerId, professionals.id))
      .innerJoin(services, eq(partnerServices.serviceId, services.id))
      .leftJoin(users, eq(professionals.userId, users.id))
      .where(and(
        eq(partnerServices.serviceId, orderItem.serviceId),
        eq(services.id, orderItem.serviceId),
        eq(services.categoryId, professionals.categoryId),
        // subcategory is NOT used as a hard dispatch filter — partner_services already
        // guarantees the partner is qualified for this specific service, so a mismatch
        // between the partner's profile sub-category and the service sub-category must
        // not block dispatch (e.g. partner specialises in "AC Repair" but is assigned
        // to "AC Service & Repair" → they should still receive the job).
        eq(professionals.isActive, true),
        eq(professionals.availabilityStatus, 'available'),
        isNull(professionals.deletedAt),
      ));

    // Document verification gate
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
      }
    }

    if (!verifiedCandidates.length) {
      logger.warn(`[orderDispatch] No eligible partners for orderItem=${orderItem.id}`);
      return [];
    }

    // GPS proximity filter
    let bookingLat: number | null = null;
    let bookingLng: number | null = null;
    if (order.addressId) {
      const [addr] = await db.select({ latitude: addresses.latitude, longitude: addresses.longitude })
        .from(addresses).where(eq(addresses.id, order.addressId)).limit(1);
      bookingLat = addr?.latitude ?? null;
      bookingLng = addr?.longitude ?? null;
    }

    let candidates = verifiedCandidates;
    if (bookingLat !== null && bookingLng !== null) {
      const withDistance = verifiedCandidates.map((c) => {
        const { latitude: pLat, longitude: pLng } = c.pro;
        const distance = pLat !== null && pLng !== null
          ? haversineKm(bookingLat!, bookingLng!, pLat, pLng)
          : Infinity;
        return { ...c, distance };
      });
      withDistance.sort((a, b) => a.distance - b.distance);
      const nearby = withDistance.filter(c => c.distance <= MAX_RADIUS_KM);
      candidates = (nearby.length > 0 ? nearby : withDistance).map(({ distance: _d, ...c }) => c);
    }

    // Expire existing pending requests for this item (re-broadcast scenario)
    await db.update(orderItemRequests)
      .set({ status: 'expired', respondedAt: new Date() })
      .where(and(eq(orderItemRequests.orderItemId, orderItem.id), eq(orderItemRequests.status, 'pending')));

    // Insert new requests
    await db.insert(orderItemRequests).values(candidates.map(({ pro }) => ({
      orderItemId: orderItem.id,
      partnerId: pro.id,
      status: 'pending',
    })));

    await Promise.all(candidates.map(({ pro }) =>
      notifyPartnerOfItem(pro.userId, pro.name, orderItem, order, 'job_request')
    ));

    logger.info(`[orderDispatch] item=${orderItem.id} broadcast to ${candidates.length} partners`);
    return candidates.map(({ pro }) => pro.id);
  },

  /** Partner accepts an order item */
  async acceptItem(orderItemId: string, partnerId: string) {
    // Find the request
    const [request] = await db.select()
      .from(orderItemRequests)
      .where(and(
        eq(orderItemRequests.orderItemId, orderItemId),
        eq(orderItemRequests.partnerId, partnerId),
        eq(orderItemRequests.status, 'pending'),
      )).limit(1);
    if (!request) throw new Error('Job request not found or already responded to.');

    // Assign partner to item
    const [updatedItem] = await db.update(orderItems).set({
      partnerId,
      status: 'partner_accepted',
      updatedAt: new Date(),
    }).where(and(
      eq(orderItems.id, orderItemId),
      isNull(orderItems.partnerId), // only if not yet assigned
    )).returning();
    if (!updatedItem) throw new Error('This service has already been assigned to a partner.');

    // Mark this request as accepted, expire others
    await db.update(orderItemRequests).set({ status: 'accepted', respondedAt: new Date() })
      .where(and(eq(orderItemRequests.orderItemId, orderItemId), eq(orderItemRequests.partnerId, partnerId)));
    await db.update(orderItemRequests).set({ status: 'expired', respondedAt: new Date() })
      .where(and(eq(orderItemRequests.orderItemId, orderItemId), ne(orderItemRequests.partnerId, partnerId)));

    // Mark partner as busy
    await db.update(professionals).set({ availabilityStatus: 'busy', updatedAt: new Date() })
      .where(eq(professionals.id, partnerId));

    // Recompute order status
    await recomputeOrderStatus(updatedItem.orderId);

    // Notify customer
    const [order] = await db.select().from(orders).where(eq(orders.id, updatedItem.orderId)).limit(1);
    if (order) {
      const [svc] = await db.execute(
        sql`SELECT name FROM services WHERE id = ${updatedItem.serviceId} LIMIT 1`
      ) as any;
      const svcName = ((svc as any).rows?.[0] ?? svc[0])?.name ?? 'service';
      void notificationDbService.create({
        userId: order.customerId,
        title: 'Partner assigned 🎉',
        body: `A partner has accepted your ${svcName} booking.`,
        type: 'booking',
        data: { orderId: order.id, orderItemId: orderItemId },
      });
    }

    return updatedItem;
  },

  /** Partner rejects an order item */
  async rejectItem(orderItemId: string, partnerId: string) {
    const [updated] = await db.update(orderItemRequests)
      .set({ status: 'rejected', respondedAt: new Date() })
      .where(and(
        eq(orderItemRequests.orderItemId, orderItemId),
        eq(orderItemRequests.partnerId, partnerId),
        eq(orderItemRequests.status, 'pending'),
      )).returning();
    if (!updated) throw new Error('Request already responded to.');

    // Check if any pending requests remain; if not, mark item as searching
    const [remaining] = await db.select({ count: sql<number>`count(*)::int` })
      .from(orderItemRequests)
      .where(and(eq(orderItemRequests.orderItemId, orderItemId), eq(orderItemRequests.status, 'pending')));
    if (!remaining?.count) {
      await db.update(orderItems).set({ status: 'searching_partner', updatedAt: new Date() })
        .where(eq(orderItems.id, orderItemId));
    }
  },

  /** Partner checks in (arrives at location) — triggers payment request */
  async checkInItem(orderItemId: string, partnerId: string, qrToken: string) {
    try {
      const claims = verifyOrderItemQrToken(qrToken);
      if (claims.orderItemId !== orderItemId) {
        throw new Error('QR token does not belong to this service.');
      }
    } catch (error) {
      throw AppError.badRequest(error instanceof Error ? error.message : 'Invalid or expired customer QR code.');
    }

    const [item] = await db.update(orderItems).set({
      status: 'payment_pending',
      updatedAt: new Date(),
    }).where(and(
      eq(orderItems.id, orderItemId),
      eq(orderItems.partnerId, partnerId),
      eq(orderItems.status, 'partner_accepted'),
    )).returning();
    if (!item) throw new Error('Order item not found or not in the correct state for check-in.');

    const [existingPayment] = await db.select({ id: orderItemPayments.id })
      .from(orderItemPayments)
      .where(eq(orderItemPayments.orderItemId, item.id))
      .limit(1);
    if (!existingPayment) {
      await db.insert(orderItemPayments).values({
        orderItemId: item.id,
        orderId: item.orderId,
        customerId: (await db.select({ customerId: orders.customerId }).from(orders).where(eq(orders.id, item.orderId)).limit(1))[0]?.customerId ?? '',
        amount: item.customerPrice,
        currency: 'INR',
        status: 'created',
        notes: 'Payment requested at partner check-in',
      });
    }

    await recomputeOrderStatus(item.orderId);

    // Notify customer to pay for this specific service
    const [order] = await db.select().from(orders).where(eq(orders.id, item.orderId)).limit(1);
    if (order) {
      const svcRow = await db.execute(sql`SELECT name FROM services WHERE id = ${item.serviceId} LIMIT 1`) as any;
      const svcName = ((svcRow as any).rows?.[0] ?? svcRow[0])?.name ?? 'service';
      void notificationDbService.create({
        userId: order.customerId,
        title: 'Partner has arrived! 📍',
        body: `Your partner is at the location. Please pay ₹${item.customerPrice} for ${svcName} to begin.`,
        type: 'payment',
        data: { orderId: order.id, orderItemId: item.id, amount: item.customerPrice },
      });
    }

    return item;
  },

  /** Partner confirms that the customer handed over the cash for this item. */
  async confirmCashPayment(orderItemId: string, partnerId: string) {
    const [item] = await db.select().from(orderItems).where(and(
      eq(orderItems.id, orderItemId),
      eq(orderItems.partnerId, partnerId),
    )).limit(1);
    if (!item) throw AppError.notFound('Service job not found or not assigned to you.');
    if (!['partner_arrived', 'payment_pending'].includes(item.status)) {
      throw AppError.badRequest('Cash can only be confirmed after check-in.');
    }

    const [payment] = await db.select().from(orderItemPayments)
      .where(eq(orderItemPayments.orderItemId, orderItemId)).limit(1);
    if (!payment || payment.method !== 'cash' || !payment.cashReportedAt) {
      throw AppError.badRequest('The customer has not reported a cash payment for this service.');
    }
    if (payment.status === 'paid') throw AppError.badRequest('Cash payment is already confirmed.');

    const now = new Date();
    const [updatedPayment] = await db.update(orderItemPayments).set({
      status: 'paid',
      cashConfirmedAt: now,
      cashConfirmedByPartnerId: partnerId,
      updatedAt: now,
    }).where(and(
      eq(orderItemPayments.id, payment.id),
      eq(orderItemPayments.status, 'created'),
    )).returning();
    if (!updatedPayment) throw AppError.badRequest('Cash payment was already updated.');

    const [updatedItem] = await db.update(orderItems).set({
      status: 'service_started',
      updatedAt: now,
    }).where(and(
      eq(orderItems.id, orderItemId),
      eq(orderItems.partnerId, partnerId),
      inArray(orderItems.status, ['partner_arrived', 'payment_pending']),
    )).returning();
    if (!updatedItem) throw AppError.badRequest('Service is no longer waiting for cash confirmation.');

    await recomputeOrderStatus(item.orderId);
    const [order] = await db.select().from(orders).where(eq(orders.id, item.orderId)).limit(1);
    const [service] = await db.select({ name: services.name }).from(services).where(eq(services.id, item.serviceId)).limit(1);
    if (order) {
      void notificationDbService.create({
        userId: order.customerId,
        title: 'Cash payment confirmed',
        body: `₹${item.customerPrice} cash received for ${service?.name ?? 'your service'}. The service can now begin.`,
        type: 'payment',
        data: { orderId: item.orderId, orderItemId, amount: item.customerPrice, method: 'cash' },
      });
    }
    return { item: updatedItem, payment: updatedPayment };
  },

  /** Partner completes service */
  async completeItem(orderItemId: string, partnerId: string) {
    const [item] = await db.update(orderItems).set({
      status: 'service_completed',
      updatedAt: new Date(),
      completedAt: new Date(),
    }).where(and(
      eq(orderItems.id, orderItemId),
      eq(orderItems.partnerId, partnerId),
      inArray(orderItems.status, ['service_started', 'payment_completed']),
    )).returning();
    if (!item) throw new Error('Order item not found or not in a completable state.');

    // Mark partner as available again
    await db.update(professionals).set({ availabilityStatus: 'available', updatedAt: new Date() })
      .where(eq(professionals.id, partnerId));

    await recomputeOrderStatus(item.orderId);
    return item;
  },
};
