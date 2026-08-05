import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { db } from '../config/database.js';
import {
  bookings, users, professionals, serviceCategories, reviews, payoutRequests, payoutRuns,
  orders, orderItems, orderItemPayments, services, addresses,
  bookingItems, bookingPartnerRequests, bookingAssignmentLogs,
} from '../database/schema/index.js';
import { payments } from '../database/schema/payments.js';
import { eq, desc, count, sum, ne, isNull, isNotNull, and, or, avg, sql, gte, lte, ilike, inArray } from 'drizzle-orm';

/** Most-recent payment status for a booking (null = no payment yet). */
const paymentStatusSub = (bookingIdCol: typeof bookings.id) =>
  sql<string | null>`(SELECT status FROM payments WHERE booking_id = ${bookingIdCol} ORDER BY created_at DESC LIMIT 1)`;

/** Most-recent payment method for a booking. */
const paymentMethodSub = (bookingIdCol: typeof bookings.id) =>
  sql<string | null>`(SELECT method FROM payments WHERE booking_id = ${bookingIdCol} ORDER BY created_at DESC LIMIT 1)`;

/** Most-recent payment id for a booking. */
const paymentIdSub = (bookingIdCol: typeof bookings.id) =>
  sql<string | null>`(SELECT id FROM payments WHERE booking_id = ${bookingIdCol} ORDER BY created_at DESC LIMIT 1)`;
import { AppError } from '../utils/AppError.js';
import { auditLogService } from '../services/auditLog.service.js';
import { notificationService } from '../services/notification.service.js';
import { storageService } from '../services/storage.service.js';
import { hashPassword } from '../utils/password.js';
import { refundOrderItemPayment } from './payment.controller.js';
import { createRazorpayUpiPayout } from '../services/razorpayPayout.service.js';
import { runPayouts } from '../services/payoutScheduler.service.js';

export const adminController = {
  updateOwnAdminProfile: asyncHandler(async (req: Request, res: Response) => {
    const { fullName, email, phone } = req.body as {
      fullName?: string;
      email?: string;
      phone?: string;
    };

    if (fullName !== undefined && fullName.trim().length < 2) {
      throw AppError.badRequest('Full name must be at least 2 characters.');
    }
    if (email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      throw AppError.badRequest('A valid email is required.');
    }

    const normalizedEmail = email?.trim().toLowerCase();
    if (normalizedEmail) {
      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);
      if (existing && existing.id !== req.user!.userId) {
        throw AppError.conflict('A user with this email already exists.');
      }
    }

    const [updated] = await db
      .update(users)
      .set({
        ...(fullName !== undefined ? { fullName: fullName.trim() } : {}),
        ...(normalizedEmail ? { email: normalizedEmail, emailVerifiedAt: new Date() } : {}),
        ...(phone !== undefined ? { phone: phone.trim() || null } : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.id, req.user!.userId))
      .returning({
        id: users.id,
        email: users.email,
        phone: users.phone,
        fullName: users.fullName,
        avatarUrl: users.avatarUrl,
        role: users.role,
      });

    if (!updated) throw AppError.notFound('Admin account not found.');
    await auditLogService.record(req.user!.userId, 'admin.profile.update', 'user', req.user!.userId, {
      changedFields: Object.keys(req.body ?? {}),
    });
    res.json({ success: true, data: updated });
  }),

  /** Master orders with per-service status, dispatch, earnings and payment state. */
  listOrders: asyncHandler(async (req: Request, res: Response) => {
    const limit = Math.min(Number(req.query.limit ?? 100), 500);
    const rows = await db.select({
      order: orders,
      item: orderItems,
      serviceName: services.name,
      customerName: users.fullName,
      customerEmail: users.email,
    })
      .from(orders)
      .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
      .leftJoin(services, eq(services.id, orderItems.serviceId))
      .innerJoin(users, eq(users.id, orders.customerId))
      .orderBy(desc(orders.createdAt))
      .limit(limit);

    const paymentRows = rows.length
      ? await db.select().from(orderItemPayments)
        .where(inArray(orderItemPayments.orderItemId, rows.map(row => row.item.id)))
      : [];
    const paymentByItem = new Map(paymentRows.map(payment => [payment.orderItemId, payment]));
    const byOrder = new Map<string, any>();

    for (const row of rows) {
      const existing = byOrder.get(row.order.id) ?? {
        ...row.order,
        customerName: row.customerName,
        customerEmail: row.customerEmail,
        items: [],
      };
      const payment = paymentByItem.get(row.item.id);
      existing.items.push({
        ...row.item,
        serviceName: row.serviceName,
        payment: payment ? {
          id: payment.id,
          status: payment.status,
          method: payment.method,
          amount: payment.amount,
          notes: payment.notes,
        } : null,
        earnings: {
          customerPrice: row.item.customerPrice,
          partnerPayout: row.item.partnerPayout,
          platformMargin: row.item.customerPrice - row.item.partnerPayout,
        },
      });
      byOrder.set(row.order.id, existing);
    }

    res.json({ success: true, data: [...byOrder.values()] });
  }),

  /** Full master-order detail for the admin service detail view. */
  getOrder: asyncHandler(async (req: Request, res: Response) => {
    const [row] = await db.select({
      order: orders,
      customer: users,
      address: addresses,
    })
      .from(orders)
      .innerJoin(users, eq(users.id, orders.customerId))
      .leftJoin(addresses, eq(addresses.id, orders.addressId))
      .where(eq(orders.id, req.params.orderId))
      .limit(1);
    if (!row) throw AppError.notFound('Order not found.');

    const itemRows = await db.select({
      item: orderItems,
      serviceName: services.name,
    })
      .from(orderItems)
      .leftJoin(services, eq(services.id, orderItems.serviceId))
      .where(eq(orderItems.orderId, req.params.orderId))
      .orderBy(orderItems.createdAt);

    const itemPayments = itemRows.length
      ? await db.select().from(orderItemPayments)
        .where(inArray(orderItemPayments.orderItemId, itemRows.map(({ item }) => item.id)))
      : [];
    const paymentByItem = new Map(itemPayments.map(payment => [payment.orderItemId, payment]));

    res.json({
      success: true,
      data: {
        ...row.order,
        customerName: row.customer.fullName,
        customerEmail: row.customer.email,
        customerPhone: row.customer.phone,
        address: row.address,
        items: itemRows.map(({ item, serviceName }) => {
          const payment = paymentByItem.get(item.id);
          return {
            ...item,
            serviceName,
            payment: payment ? {
              id: payment.id,
              status: payment.status,
              method: payment.method,
              amount: payment.amount,
              notes: payment.notes,
            } : null,
            earnings: {
              customerPrice: item.customerPrice,
              partnerPayout: item.partnerPayout,
              platformMargin: item.customerPrice - item.partnerPayout,
            },
          };
        }),
      },
    });
  }),

  /** Restart dispatch for one service item after a rejection or timeout. */
  continueOrderItemDispatch: asyncHandler(async (req: Request, res: Response) => {
    const [item] = await db.select().from(orderItems)
      .where(and(eq(orderItems.id, req.params.itemId), eq(orderItems.orderId, req.params.orderId)))
      .limit(1);
    if (!item) throw AppError.notFound('Order service not found.');
    if (item.status === 'cancelled' || item.status === 'service_completed') {
      throw AppError.badRequest('This service is not dispatchable.');
    }
    const [order] = await db.select().from(orders).where(eq(orders.id, item.orderId)).limit(1);
    if (!order) throw AppError.notFound('Order not found.');
    await db.update(orderItems).set({ status: 'searching_partner', partnerId: null, updatedAt: new Date() })
      .where(eq(orderItems.id, item.id));
    const { orderDispatchService } = await import('../services/orderDispatch.service.js');
    await orderDispatchService.broadcastForItem({ ...item, status: 'searching_partner', partnerId: null }, order);
    res.json({ success: true, data: { message: 'Dispatch restarted.' } });
  }),

  /** Refund a per-service payment and cancel the service item. */
  refundOrderItem: asyncHandler(async (req: Request, res: Response) => {
    const [item] = await db.select().from(orderItems)
      .where(and(eq(orderItems.id, req.params.itemId), eq(orderItems.orderId, req.params.orderId)))
      .limit(1);
    if (!item) throw AppError.notFound('Order service not found.');
    const [payment] = await db.select().from(orderItemPayments)
      .where(eq(orderItemPayments.orderItemId, item.id)).limit(1);
    if (!payment) throw AppError.badRequest('No payment exists for this service.');
    if (payment.status === 'refunded') throw AppError.badRequest('This service is already refunded.');
    await refundOrderItemPayment(payment.id);
    await db.update(orderItems).set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(orderItems.id, item.id));
    res.json({ success: true, data: { message: 'Service payment refunded.' } });
  }),
  /* ───────────────────────── Dashboard ───────────────────────── */
  getStats: asyncHandler(async (_req: Request, res: Response) => {
    const [bookingStats] = await db
      .select({ total: count(bookings.id), revenue: sum(bookings.price) })
      .from(bookings)
      .where(isNull(bookings.deletedAt));

    const [activeBookingCount] = await db
      .select({ count: count(bookings.id) })
      .from(bookings)
      .where(eq(bookings.status, 'upcoming'));

    const [proCount] = await db
      .select({ count: count(professionals.id) })
      .from(professionals)
      .where(isNull(professionals.deletedAt));

    const [customerCount] = await db
      .select({ count: count(users.id) })
      .from(users)
      .where(eq(users.role, 'customer'));

    // Payment stats: completed+paid vs completed+awaiting, today's collection, pending collection
    // NOTE: FILTER must appear immediately after the aggregate (before any cast).
    // Use IS DISTINCT FROM instead of COALESCE(...,'') != 'paid' to avoid casting
    // empty string to the payment_status enum (which is invalid).
    const psRaw = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE b.status = 'completed'
            AND (SELECT status FROM payments WHERE booking_id = b.id ORDER BY created_at DESC LIMIT 1) = 'paid')
          ::int AS completed_paid,
        COUNT(*) FILTER (WHERE b.status = 'completed'
            AND (SELECT status FROM payments WHERE booking_id = b.id ORDER BY created_at DESC LIMIT 1) IS DISTINCT FROM 'paid'::payment_status)
          ::int AS completed_awaiting,
        COALESCE(SUM(b.price) FILTER (WHERE
            (SELECT status FROM payments WHERE booking_id = b.id ORDER BY created_at DESC LIMIT 1) = 'paid'
            AND (SELECT updated_at FROM payments WHERE booking_id = b.id AND status = 'paid' ORDER BY created_at DESC LIMIT 1)::date = CURRENT_DATE
          ), 0)::bigint AS today_collection,
        COALESCE(SUM(b.price) FILTER (WHERE b.status = 'completed'
            AND (SELECT status FROM payments WHERE booking_id = b.id ORDER BY created_at DESC LIMIT 1) IS DISTINCT FROM 'paid'::payment_status
          ), 0)::bigint AS pending_collection
      FROM bookings b
      WHERE b.deleted_at IS NULL
    `);
    const ps: any = (psRaw as any)?.rows?.[0] ?? (Array.isArray(psRaw) ? (psRaw as any[])[0] : {}) ?? {};

    res.json({
      success: true,
      data: {
        totalBookings: Number(bookingStats?.total ?? 0),
        totalRevenue: Number(bookingStats?.revenue ?? 0),
        activeBookings: Number(activeBookingCount?.count ?? 0),
        totalProfessionals: Number(proCount?.count ?? 0),
        totalCustomers: Number(customerCount?.count ?? 0),
        completedPaid: Number(ps.completed_paid ?? 0),
        completedAwaitingPayment: Number(ps.completed_awaiting ?? 0),
        todayCollection: Number(ps.today_collection ?? 0),
        pendingCollection: Number(ps.pending_collection ?? 0),
      },
    });
  }),

  /* ───────────────────────── Bookings ────────────────────────── */
  listBookings: asyncHandler(async (req: Request, res: Response) => {
    const limit  = Math.min(Number(req.query.limit  ?? 50), 500);
    const offset = Number(req.query.offset ?? 0);

    const fromParam    = req.query.from     ? String(req.query.from)     : undefined;
    const toParam      = req.query.to       ? String(req.query.to)       : undefined;
    const statusParam  = req.query.status   ? String(req.query.status)   : undefined;
    const statusesRaw  = req.query.statuses ? String(req.query.statuses) : undefined;
    const searchParam  = req.query.search   ? String(req.query.search).trim() : undefined;
    const VALID_STATUSES = ['pending', 'upcoming', 'in_progress', 'completed', 'cancelled'];

    const conditions: any[] = [isNull(bookings.deletedAt)];
    if (fromParam) {
      const d = new Date(fromParam + 'T00:00:00Z');
      if (!isNaN(d.getTime())) conditions.push(gte(bookings.scheduledAt, d));
    }
    if (toParam) {
      const d = new Date(toParam + 'T23:59:59Z');
      if (!isNaN(d.getTime())) conditions.push(lte(bookings.scheduledAt, d));
    }
    // Multi-status (?statuses=completed,cancelled) takes priority over single ?status=
    const validatedStatuses = statusesRaw
      ? statusesRaw.split(',').map(s => s.trim()).filter(s => VALID_STATUSES.includes(s))
      : [];
    if (validatedStatuses.length > 0) {
      conditions.push(inArray(bookings.status, validatedStatuses as any[]));
    } else if (statusParam && VALID_STATUSES.includes(statusParam)) {
      conditions.push(eq(bookings.status, statusParam as any));
    }
    if (searchParam) {
      conditions.push(or(
        ilike(bookings.serviceName, `%${searchParam}%`),
        ilike(bookings.proName,     `%${searchParam}%`),
        ilike(users.fullName,       `%${searchParam}%`),
        ilike(users.email,          `%${searchParam}%`),
      ));
    }
    const where = and(...conditions);

    const selectCols = {
      id: bookings.id,
      customerId: bookings.customerId,
      status: bookings.status,
      serviceName: bookings.serviceName,
      proName: bookings.proName,
      price: bookings.price,
      notes: bookings.notes,
      scheduledAt: bookings.scheduledAt,
      createdAt: bookings.createdAt,
      customerName: users.fullName,
      customerEmail: users.email,
      paymentStatus: paymentStatusSub(bookings.id),
      paymentMethod: paymentMethodSub(bookings.id),
      paymentId:     paymentIdSub(bookings.id),
    };

    // Run paginated rows + aggregate counts in parallel — single round trip each
    const [rows, [agg]] = await Promise.all([
      db.select(selectCols)
        .from(bookings)
        .leftJoin(users, eq(bookings.customerId, users.id))
        .where(where)
        .orderBy(desc(bookings.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({
        total:            count(bookings.id),
        revenueSum:       sum(bookings.price),
        completedCount:   sql<number>`COUNT(CASE WHEN ${bookings.status} = 'completed'  THEN 1 END)::int`,
        completedRevenue: sql<number>`COALESCE(SUM(CASE WHEN ${bookings.status} = 'completed' THEN ${bookings.price} END), 0)::bigint`,
        cancelledCount:   sql<number>`COUNT(CASE WHEN ${bookings.status} = 'cancelled'  THEN 1 END)::int`,
        pendingCount:     sql<number>`COUNT(CASE WHEN ${bookings.status} IN ('pending','upcoming') THEN 1 END)::int`,
      })
        .from(bookings)
        .leftJoin(users, eq(bookings.customerId, users.id))
        .where(where),
    ]);

    res.json({
      success: true,
      data: {
        bookings: rows,
        total:            Number(agg?.total            ?? 0),
        revenueSum:       Number(agg?.revenueSum       ?? 0),
        completedCount:   Number(agg?.completedCount   ?? 0),
        completedRevenue: Number(agg?.completedRevenue ?? 0),
        cancelledCount:   Number(agg?.cancelledCount   ?? 0),
        pendingCount:     Number(agg?.pendingCount     ?? 0),
      },
    });
  }),

  /** Full legacy booking detail for admin operations and history. */
  getBooking: asyncHandler(async (req: Request, res: Response) => {
    const [row] = await db.select({
      booking: bookings,
      customer: users,
      address: addresses,
    })
      .from(bookings)
      .leftJoin(users, eq(users.id, bookings.customerId))
      .leftJoin(addresses, eq(addresses.id, bookings.addressId))
      .where(and(eq(bookings.id, req.params.id), isNull(bookings.deletedAt)))
      .limit(1);
    if (!row) throw AppError.notFound('Booking not found.');

    const [items, requests, history, paymentRows] = await Promise.all([
      db.select({ item: bookingItems, serviceName: services.name })
        .from(bookingItems)
        .leftJoin(services, eq(services.id, bookingItems.serviceId))
        .where(eq(bookingItems.bookingId, req.params.id)),
      db.select({ request: bookingPartnerRequests, partner: professionals })
        .from(bookingPartnerRequests)
        .innerJoin(professionals, eq(professionals.id, bookingPartnerRequests.partnerId))
        .where(eq(bookingPartnerRequests.bookingId, req.params.id)),
      db.select({ log: bookingAssignmentLogs, partnerName: professionals.name })
        .from(bookingAssignmentLogs)
        .leftJoin(professionals, eq(professionals.id, bookingAssignmentLogs.partnerId))
        .where(eq(bookingAssignmentLogs.bookingId, req.params.id))
        .orderBy(desc(bookingAssignmentLogs.createdAt)),
      db.select().from(payments).where(eq(payments.bookingId, req.params.id)).orderBy(desc(payments.createdAt)),
    ]);

    res.json({
      success: true,
      data: {
        ...row.booking,
        customerName: row.customer?.fullName ?? null,
        customerEmail: row.customer?.email ?? null,
        customerPhone: row.customer?.phone ?? null,
        address: row.address,
        items: items.map(({ item, serviceName }) => ({ ...item, serviceName })),
        dispatchRequests: requests.map(({ request, partner }) => ({
          ...request,
          partner: {
            id: partner.id,
            name: partner.name,
            rating: partner.rating,
            availabilityStatus: partner.availabilityStatus,
          },
        })),
        assignmentHistory: history.map(({ log, partnerName }) => ({ ...log, partnerName: partnerName ?? null })),
        payments: paymentRows,
      },
    });
  }),

  updateBooking: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, notes, price, scheduledAt } = req.body as {
      status?: string; notes?: string; price?: number; scheduledAt?: string;
    };

    const VALID_STATUSES = ['pending', 'upcoming', 'in_progress', 'completed', 'cancelled'];
    if (status !== undefined && !VALID_STATUSES.includes(status))
      throw AppError.badRequest(`Invalid status. Allowed: ${VALID_STATUSES.join(', ')}`);
    if (price !== undefined && (typeof price !== 'number' || price < 0))
      throw AppError.badRequest('Price must be a non-negative number');
    if (scheduledAt !== undefined) {
      const parsed = new Date(scheduledAt);
      if (isNaN(parsed.getTime())) throw AppError.badRequest('scheduledAt is not a valid date');
    }

    const [existing] = await db
      .select({ id: bookings.id, deletedAt: bookings.deletedAt })
      .from(bookings)
      .where(eq(bookings.id, id));
    if (!existing || existing.deletedAt) throw AppError.notFound('Booking not found');

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (status      !== undefined) patch.status      = status;
    if (notes       !== undefined) patch.notes       = notes;
    if (price       !== undefined) patch.price       = price;
    if (scheduledAt !== undefined) patch.scheduledAt = new Date(scheduledAt);

    const [row] = await db
      .update(bookings)
      .set(patch as any)
      .where(eq(bookings.id, id))
      .returning();
    if (!row) throw AppError.notFound('Booking not found');
    await auditLogService.record(req.user!.userId, 'booking.update', 'booking', id, patch);
    if (status !== undefined) {
      void notificationService.sendToUser(
        row.customerId,
        'Your booking was updated',
        `Your ${row.serviceName} booking status is now "${status}".`,
        { bookingId: id, type: 'booking_status_changed' },
      );
    }
    res.json({ success: true, data: row });
  }),

  cancelBooking: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const [existing] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, id));
    if (!existing || existing.deletedAt) throw AppError.notFound('Booking not found');
    if (existing.status === 'completed' || existing.status === 'cancelled') {
      throw AppError.badRequest('This booking cannot be cancelled in its current state.');
    }

    await db.update(bookingPartnerRequests)
      .set({ status: 'expired', respondedAt: new Date() })
      .where(and(eq(bookingPartnerRequests.bookingId, id), eq(bookingPartnerRequests.status, 'pending')));
    if (existing.professionalId) {
      await db.update(professionals)
        .set({ availabilityStatus: 'available', currentBookingStatus: 'available', updatedAt: new Date() })
        .where(eq(professionals.id, existing.professionalId));
    }

    const [row] = await db
      .update(bookings)
      .set({ status: 'cancelled', dispatchStatus: 'cancelled', updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();
    if (!row) throw AppError.notFound('Booking not found');
    await auditLogService.record(req.user!.userId, 'booking.cancel', 'booking', id);
    void notificationService.sendToUser(
      row.customerId,
      'Booking cancelled',
      `Your ${row.serviceName} booking was cancelled by the admin team.`,
      { bookingId: id, type: 'booking_cancelled' },
    );
    res.json({ success: true, data: row });
  }),

  deleteBooking: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const [existing] = await db
      .select({ id: bookings.id, deletedAt: bookings.deletedAt })
      .from(bookings)
      .where(eq(bookings.id, id));
    if (!existing || existing.deletedAt) throw AppError.notFound('Booking not found');

    const [row] = await db
      .update(bookings)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning({ id: bookings.id });
    if (!row) throw AppError.notFound('Booking not found');
    await auditLogService.record(req.user!.userId, 'booking.delete', 'booking', id);
    res.json({ success: true, data: { id: row.id } });
  }),

  /* ──────────────────── Payment Confirmation ──────────────────── */
  confirmPayment: asyncHandler(async (req: Request, res: Response) => {
    const { id: paymentId } = req.params;
    const { action, notes } = req.body as { action: 'confirm' | 'reject'; notes?: string };

    if (!['confirm', 'reject'].includes(action))
      throw AppError.badRequest('action must be "confirm" or "reject".');

    const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
    if (!payment) throw AppError.notFound('Payment not found.');
    if (payment.status === 'paid' && action === 'confirm')
      throw AppError.badRequest('Payment is already confirmed.');

    // Only allow manual confirmation for cash and UPI — gateway payments (Razorpay, Stripe)
    // are verified server-side via HMAC/session; manually overriding them would bypass that.
    const manualMethods = ['cash', 'upi_manual', null];
    if (action === 'confirm' && !manualMethods.includes(payment.method ?? null)) {
      throw AppError.badRequest(
        `Cannot manually confirm a ${payment.method} payment. Verify it in the gateway dashboard instead.`
      );
    }

    const newStatus = action === 'confirm' ? 'paid' : 'failed';
    const [updated] = await db.update(payments)
      .set({ status: newStatus, notes: notes ?? payment.notes, updatedAt: new Date() })
      .where(eq(payments.id, paymentId))
      .returning();

    // Notify the customer
    const [booking] = await db.select().from(bookings)
      .where(eq(bookings.id, payment.bookingId)).limit(1);
    if (booking) {
      const title = action === 'confirm' ? 'Payment Confirmed ✅' : 'Payment Issue ⚠️';
      const body  = action === 'confirm'
        ? `Your payment of ₹${booking.price} for ${booking.serviceName} has been confirmed by admin.`
        : `Your payment for ${booking.serviceName} was not accepted. Please contact support.`;
      void notificationService.sendToUser(payment.customerId, title, body);

      // Award loyalty points when admin confirms — same as every other paid path
      if (action === 'confirm') {
        const { pointsService } = await import('../services/points.service.js');
        void pointsService.earnForBooking(payment.customerId, payment.bookingId, booking.price ?? 0);
      }
    }

    await auditLogService.record(req.user!.userId, `payment.${action}`, 'payment', paymentId, { newStatus });
    res.json({ success: true, data: updated });
  }),

  /* ─────────────────────── Professionals ─────────────────────── */
  listProfessionals: asyncHandler(async (req: Request, res: Response) => {
    const limit  = Math.min(Number(req.query.limit  ?? 50), 100);
    const offset = Number(req.query.offset ?? 0);
    const search = String(req.query.search ?? '').trim();
    const linkStatus = String(req.query.linkStatus ?? 'linked');
    const categoryIds = String(req.query.categoryIds ?? '').split(',').map(id => id.trim()).filter(Boolean);
    const subCategoryIds = String(req.query.subCategoryIds ?? '').split(',').map(id => id.trim()).filter(Boolean);

    const { subServiceCategories } = await import('../database/schema/subServiceCategories.js');
    const filters = [
      isNull(professionals.deletedAt),
      linkStatus === 'unlinked' ? isNull(professionals.userId) : eq(professionals.userId, users.id),
    ];
    if (categoryIds.length) filters.push(inArray(professionals.categoryId, categoryIds));
    if (subCategoryIds.length) filters.push(inArray(professionals.subCategoryId, subCategoryIds));
    if (search) {
      filters.push(or(
        ilike(professionals.name, `%${search}%`),
        ilike(professionals.title, `%${search}%`),
        ilike(users.email, `%${search}%`),
        ilike(users.fullName, `%${search}%`),
      )!);
    }
    const professionalWhere = and(...filters);
    const rows = await db
      .select({
        id: professionals.id,
        userId: professionals.userId,
        userEmail: users.email,
        name: professionals.name,
        title: professionals.title,
        bio: professionals.bio,
        rating: professionals.rating,
        reviewCount: professionals.reviewCount,
        basePrice: professionals.basePrice,
        priceUnit: professionals.priceUnit,
        badge: professionals.badge,
        tags: professionals.tags,
        isActive: professionals.isActive,
        avatarUrl: professionals.avatarUrl,
        categoryId: professionals.categoryId,
        categoryName: serviceCategories.name,
        subCategoryId: professionals.subCategoryId,
        subCategoryName: subServiceCategories.name,
        createdAt: professionals.createdAt,
      })
      .from(professionals)
      .leftJoin(users, eq(professionals.userId, users.id))
      .leftJoin(serviceCategories, eq(professionals.categoryId, serviceCategories.id))
      .leftJoin(subServiceCategories, eq(professionals.subCategoryId, subServiceCategories.id))
      .where(professionalWhere)
      .orderBy(desc(professionals.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ total }] = await db
      .select({ total: count(professionals.id) })
      .from(professionals)
      .leftJoin(users, eq(professionals.userId, users.id))
      .where(professionalWhere);

    res.json({ success: true, data: { professionals: rows, total: Number(total) } });
  }),

  createProfessional: asyncHandler(async (req: Request, res: Response) => {
    const { fullName, email, password, phone, title, bio, categoryId, subCategoryId, basePrice, priceUnit, badge, tags } = req.body as {
      fullName: string; email: string; password: string; phone?: string;
      title: string; bio?: string; categoryId: string; subCategoryId?: string;
      basePrice: number; priceUnit?: string; badge?: string; tags?: string[];
    };

    if (!fullName?.trim()) throw AppError.badRequest('Full name is required');
    if (!email?.trim())    throw AppError.badRequest('Email is required');
    if (!password || password.length < 6) throw AppError.badRequest('Password must be at least 6 characters');
    if (!title?.trim())    throw AppError.badRequest('Title is required');
    if (!categoryId)       throw AppError.badRequest('Category is required');
    if (basePrice === undefined || basePrice < 0) throw AppError.badRequest('Base price must be a non-negative number');

    // Check email not already taken
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email.trim().toLowerCase())).limit(1);
    if (existing) throw AppError.badRequest('A user with this email already exists');

    // Validate category
    const { serviceCategories: sc } = await import('../database/schema/serviceCategories.js');
    const [cat] = await db.select({ id: sc.id, isActive: sc.isActive }).from(sc).where(eq(sc.id, categoryId)).limit(1);
    if (!cat) throw AppError.badRequest('Category not found');
    if (!cat.isActive) throw AppError.badRequest('Selected category is not active');

    // Validate sub-category if provided
    if (subCategoryId) {
      const { subServiceCategories: ssc } = await import('../database/schema/subServiceCategories.js');
      const [sub] = await db.select({ id: ssc.id, categoryId: ssc.categoryId, isActive: ssc.isActive })
        .from(ssc).where(eq(ssc.id, subCategoryId)).limit(1);
      if (!sub) throw AppError.badRequest('Sub-category not found');
      if (!sub.isActive) throw AppError.badRequest('Sub-category is not active');
      if (sub.categoryId !== categoryId) throw AppError.badRequest('Sub-category does not belong to selected category');
    }

    const passwordHash = await hashPassword(password);

    // Create user with partner role (already verified — admin-created)
    const [newUser] = await db.insert(users).values({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      phone: phone?.trim() || null,
      role: 'partner',
      // Admin-created partners must still verify their email before resetting passwords.
      // Do NOT pre-verify — leave emailVerifiedAt null so OTP verification is required.
    }).returning();

    // Create professional profile
    const [pro] = await db.insert(professionals).values({
      userId: newUser.id,
      name: fullName.trim(),
      title: title.trim(),
      bio: bio?.trim() || null,
      categoryId,
      subCategoryId: subCategoryId || null,
      basePrice: Number(basePrice),
      priceUnit: priceUnit || '/visit',
      badge: badge?.trim() || null,
      tags: Array.isArray(tags) ? tags : [],
      isActive: true,
    }).returning();

    await auditLogService.record(req.user!.userId, 'professional.create', 'professional', pro.id, { email: newUser.email, name: pro.name });
    res.status(201).json({ success: true, data: { ...pro, email: newUser.email, phone: newUser.phone } });
  }),

  updateProfessional: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, title, bio, basePrice, priceUnit, badge, tags, categoryId, subCategoryId } = req.body as {
      name?: string; title?: string; bio?: string; basePrice?: number;
      priceUnit?: string; badge?: string; tags?: string[];
      categoryId?: string; subCategoryId?: string | null;
    };

    if (name !== undefined && String(name).trim().length === 0)
      throw AppError.badRequest('Name cannot be empty');
    if (basePrice !== undefined && (typeof basePrice !== 'number' || basePrice < 0))
      throw AppError.badRequest('basePrice must be a non-negative number');

    // Validate categoryId if provided — must be an active category
    if (categoryId !== undefined) {
      const { serviceCategories } = await import('../database/schema/serviceCategories.js');
      const [cat] = await db.select({ id: serviceCategories.id, isActive: serviceCategories.isActive })
        .from(serviceCategories).where(eq(serviceCategories.id, categoryId)).limit(1);
      if (!cat) throw AppError.badRequest('Category not found');
      if (!cat.isActive) throw AppError.badRequest('Selected category is not active');
    }

    // Validate subCategoryId if provided — must be active and belong to the (new or existing) category
    if (subCategoryId !== undefined && subCategoryId !== null) {
      const { subServiceCategories } = await import('../database/schema/subServiceCategories.js');
      const [sub] = await db.select({ id: subServiceCategories.id, categoryId: subServiceCategories.categoryId, isActive: subServiceCategories.isActive })
        .from(subServiceCategories).where(eq(subServiceCategories.id, subCategoryId)).limit(1);
      if (!sub) throw AppError.badRequest('Sub-category not found');
      if (!sub.isActive) throw AppError.badRequest('Selected sub-category is not active');
      // Resolve effective categoryId for cross-check
      const effectiveCategoryId = categoryId ?? (await db
        .select({ categoryId: professionals.categoryId })
        .from(professionals).where(eq(professionals.id, id)).limit(1)
      )[0]?.categoryId;
      if (effectiveCategoryId && sub.categoryId !== effectiveCategoryId)
        throw AppError.badRequest('Sub-category does not belong to the selected category');
    }

    const [existing] = await db
      .select({ id: professionals.id, deletedAt: professionals.deletedAt })
      .from(professionals)
      .where(eq(professionals.id, id));
    if (!existing || existing.deletedAt) throw AppError.notFound('Professional not found');

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (name          !== undefined) patch.name          = String(name).trim();
    if (title         !== undefined) patch.title         = String(title).trim();
    if (bio           !== undefined) patch.bio           = bio;
    if (basePrice     !== undefined) patch.basePrice     = basePrice;
    if (priceUnit     !== undefined) patch.priceUnit     = priceUnit;
    if (badge         !== undefined) patch.badge         = badge || null;
    if (tags          !== undefined) patch.tags          = Array.isArray(tags) ? tags : [];
    if (categoryId    !== undefined) patch.categoryId    = categoryId;
    if (subCategoryId !== undefined) patch.subCategoryId = subCategoryId ?? null;

    const [row] = await db
      .update(professionals)
      .set(patch as any)
      .where(eq(professionals.id, id))
      .returning();
    if (!row) throw AppError.notFound('Professional not found');
    await auditLogService.record(req.user!.userId, 'professional.update', 'professional', id, patch);
    res.json({ success: true, data: row });
  }),

  suspendProfessional: asyncHandler(async (req: Request, res: Response) => {
    const [existing] = await db
      .select({ id: professionals.id, deletedAt: professionals.deletedAt })
      .from(professionals)
      .where(eq(professionals.id, req.params.id));
    if (!existing || existing.deletedAt) throw AppError.notFound('Professional not found');

    const [row] = await db
      .update(professionals)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(professionals.id, req.params.id))
      .returning({ id: professionals.id, isActive: professionals.isActive });
    if (!row) throw AppError.notFound('Professional not found');
    await auditLogService.record(req.user!.userId, 'professional.suspend', 'professional', req.params.id);
    res.json({ success: true, data: row });
  }),

  activateProfessional: asyncHandler(async (req: Request, res: Response) => {
    const [existing] = await db
      .select({ id: professionals.id, deletedAt: professionals.deletedAt })
      .from(professionals)
      .where(eq(professionals.id, req.params.id));
    if (!existing || existing.deletedAt) throw AppError.notFound('Professional not found');

    const [row] = await db
      .update(professionals)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(professionals.id, req.params.id))
      .returning({ id: professionals.id, isActive: professionals.isActive });
    if (!row) throw AppError.notFound('Professional not found');
    await auditLogService.record(req.user!.userId, 'professional.activate', 'professional', req.params.id);
    res.json({ success: true, data: row });
  }),

  deleteProfessional: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const [existing] = await db
      .select({ id: professionals.id, deletedAt: professionals.deletedAt })
      .from(professionals)
      .where(eq(professionals.id, id));
    if (!existing || existing.deletedAt) throw AppError.notFound('Professional not found');

    const [row] = await db
      .update(professionals)
      .set({ deletedAt: new Date(), isActive: false, updatedAt: new Date() })
      .where(eq(professionals.id, id))
      .returning({ id: professionals.id });
    if (!row) throw AppError.notFound('Professional not found');
    await auditLogService.record(req.user!.userId, 'professional.delete', 'professional', id);
    res.json({ success: true, data: { id: row.id } });
  }),

  /* ─────────────────────── Users / Customers ─────────────────── */
  listUsers: asyncHandler(async (req: Request, res: Response) => {
    const limit  = Math.min(Number(req.query.limit  ?? 50), 100);
    const offset = Number(req.query.offset ?? 0);

    const whereClause = and(ne(users.role, 'admin'), isNull(users.deletedAt));

    const rows = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        phone: users.phone,
        role: users.role,
        isActive: users.isActive,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(whereClause)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ total }] = await db
      .select({ total: count(users.id) })
      .from(users)
      .where(whereClause);

    res.json({ success: true, data: { users: rows, total: Number(total) } });
  }),

  listAdmins: asyncHandler(async (_req: Request, res: Response) => {
    const rows = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        phone: users.phone,
        role: users.role,
        isActive: users.isActive,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(and(inArray(users.role, ['admin', 'operations_manager']), isNull(users.deletedAt)))
      .orderBy(desc(users.createdAt));

    res.json({ success: true, data: { admins: rows, total: rows.length } });
  }),

  createAdmin: asyncHandler(async (req: Request, res: Response) => {
    const { fullName, email, password, phone, role } = req.body as {
      fullName?: string;
      email?: string;
      password?: string;
      phone?: string;
      role?: string;
    };

    if (!fullName?.trim()) throw AppError.badRequest('Full name is required.');
    if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      throw AppError.badRequest('A valid email is required.');
    }
    if (!password || password.length < 8) {
      throw AppError.badRequest('Password must be at least 8 characters.');
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      throw AppError.badRequest('Password must contain an uppercase letter, lowercase letter, and number.');
    }
    if (role !== 'admin' && role !== 'operations_manager') {
      throw AppError.badRequest('Role must be admin or operations_manager.');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);
    if (existing) throw AppError.conflict('A user with this email already exists.');

    const passwordHash = await hashPassword(password);
    const [created] = await db
      .insert(users)
      .values({
        fullName: fullName.trim(),
        email: normalizedEmail,
        phone: phone?.trim() || null,
        passwordHash,
        role: role as 'admin' | 'operations_manager',
        emailVerifiedAt: new Date(),
        isActive: true,
      })
      .returning({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        phone: users.phone,
        role: users.role,
        isActive: users.isActive,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
      });

    await auditLogService.record(req.user!.userId, 'admin.create', 'user', created.id, {
      email: created.email,
      role: created.role,
    });
    res.status(201).json({ success: true, data: created });
  }),

  updateAdmin: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { fullName, email, phone, role, isActive, password } = req.body as {
      fullName?: string;
      email?: string;
      phone?: string;
      role?: string;
      isActive?: boolean;
      password?: string;
    };

    if (id === req.user!.userId) {
      throw AppError.badRequest('Use Settings to update your own account.');
    }
    if (fullName !== undefined && fullName.trim().length < 2) {
      throw AppError.badRequest('Full name must be at least 2 characters.');
    }
    if (email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      throw AppError.badRequest('A valid email is required.');
    }
    if (role !== undefined && role !== 'admin' && role !== 'operations_manager') {
      throw AppError.badRequest('Role must be admin or operations_manager.');
    }
    if (isActive === false && id === req.user!.userId) {
      throw AppError.badRequest('You cannot disable your own account.');
    }
    if (password !== undefined) {
      if (password.length < 8) throw AppError.badRequest('Password must be at least 8 characters.');
      if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
        throw AppError.badRequest('Password must contain an uppercase letter, lowercase letter, and number.');
      }
    }

    const [target] = await db
      .select({ id: users.id, role: users.role, deletedAt: users.deletedAt })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    if (!target || target.deletedAt || !['admin', 'operations_manager'].includes(target.role)) {
      throw AppError.notFound('Admin account not found.');
    }

    const normalizedEmail = email?.trim().toLowerCase();
    if (normalizedEmail) {
      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);
      if (existing && existing.id !== id) {
        throw AppError.conflict('A user with this email already exists.');
      }
    }

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (fullName !== undefined) patch.fullName = fullName.trim();
    if (normalizedEmail) {
      patch.email = normalizedEmail;
      patch.emailVerifiedAt = new Date();
    }
    if (phone !== undefined) patch.phone = phone.trim() || null;
    if (role !== undefined) patch.role = role;
    if (isActive !== undefined) patch.isActive = isActive;
    if (password !== undefined) patch.passwordHash = await hashPassword(password);

    const [updated] = await db
      .update(users)
      .set(patch)
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        phone: users.phone,
        role: users.role,
        isActive: users.isActive,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
      });

    await auditLogService.record(req.user!.userId, 'admin.update', 'user', id, {
      changedFields: Object.keys(req.body ?? {}).filter(field => field !== 'password'),
      passwordReset: password !== undefined,
    });
    res.json({ success: true, data: updated });
  }),

  updateUser: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { fullName, email, phone, role } = req.body as {
      fullName?: string; email?: string; phone?: string; role?: string;
    };

    const ALLOWED_ROLES = ['customer', 'partner'] as const;
    if (role !== undefined && !ALLOWED_ROLES.includes(role as any))
      throw AppError.badRequest(`Invalid role. Allowed: ${ALLOWED_ROLES.join(', ')}`);
    if (fullName !== undefined && fullName.trim().length === 0)
      throw AppError.badRequest('fullName cannot be empty');
    if (email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw AppError.badRequest('Invalid email address');

    const [target] = await db
      .select({ role: users.role, deletedAt: users.deletedAt })
      .from(users)
      .where(eq(users.id, id));
    if (!target || target.deletedAt) throw AppError.notFound('User not found');
    if (target.role === 'admin') throw AppError.forbidden('Cannot modify an admin account');

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (fullName !== undefined) patch.fullName = fullName.trim();
    if (email    !== undefined) patch.email    = email.trim().toLowerCase();
    if (phone    !== undefined) patch.phone    = phone.trim() || null;
    if (role     !== undefined) patch.role     = role;

    const [row] = await db
      .update(users)
      .set(patch as any)
      .where(eq(users.id, id))
      .returning({
        id: users.id, fullName: users.fullName, email: users.email,
        phone: users.phone, role: users.role, isActive: users.isActive,
        avatarUrl: users.avatarUrl, createdAt: users.createdAt,
      });
    if (!row) throw AppError.notFound('User not found');
    await auditLogService.record(req.user!.userId, 'user.update', 'user', id, patch);
    res.json({ success: true, data: row });
  }),

  deleteUser: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const [target] = await db
      .select({ role: users.role, deletedAt: users.deletedAt })
      .from(users)
      .where(eq(users.id, id));
    if (!target || target.deletedAt) throw AppError.notFound('User not found');
    if (target.role === 'admin') throw AppError.forbidden('Cannot delete an admin account');

    const [row] = await db
      .update(users)
      .set({ deletedAt: new Date(), isActive: false, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning({ id: users.id });
    if (!row) throw AppError.notFound('User not found');
    await auditLogService.record(req.user!.userId, 'user.delete', 'user', id);
    res.json({ success: true, data: { id: row.id } });
  }),

  suspendUser: asyncHandler(async (req: Request, res: Response) => {
    const [target] = await db
      .select({ role: users.role, deletedAt: users.deletedAt })
      .from(users)
      .where(eq(users.id, req.params.id));
    if (!target || target.deletedAt) throw AppError.notFound('User not found');
    if (target.role === 'admin') throw AppError.forbidden('Cannot suspend an admin account');

    const [row] = await db
      .update(users)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(users.id, req.params.id))
      .returning({ id: users.id, isActive: users.isActive });
    if (!row) throw AppError.notFound('User not found');
    await auditLogService.record(req.user!.userId, 'user.suspend', 'user', req.params.id);
    res.json({ success: true, data: row });
  }),

  activateUser: asyncHandler(async (req: Request, res: Response) => {
    const [target] = await db
      .select({ role: users.role, deletedAt: users.deletedAt })
      .from(users)
      .where(eq(users.id, req.params.id));
    if (!target || target.deletedAt) throw AppError.notFound('User not found');
    if (target.role === 'admin') throw AppError.forbidden('Cannot modify an admin account');

    const [row] = await db
      .update(users)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(users.id, req.params.id))
      .returning({ id: users.id, isActive: users.isActive });
    if (!row) throw AppError.notFound('User not found');
    await auditLogService.record(req.user!.userId, 'user.activate', 'user', req.params.id);
    res.json({ success: true, data: row });
  }),

  /* ──────────────────── Service Categories ───────────────────── */
  listCategories: asyncHandler(async (_req: Request, res: Response) => {
    const rows = await db
      .select()
      .from(serviceCategories)
      .orderBy(serviceCategories.sortOrder, serviceCategories.name);
    res.json({ success: true, data: { categories: rows, total: rows.length } });
  }),

  createCategory: asyncHandler(async (req: Request, res: Response) => {
    const { name, description, iconName, color, iconColor, sortOrder } = req.body as {
      name: string; description?: string; iconName?: string;
      color?: string; iconColor?: string; sortOrder?: number;
    };
    if (!name || String(name).trim().length === 0)
      throw AppError.badRequest('Name is required');

    const [row] = await db
      .insert(serviceCategories)
      .values({
        name:        String(name).trim(),
        description: description || null,
        iconName:    iconName    || 'Grid',
        color:       color       || '#F3F4F6',
        iconColor:   iconColor   || '#6B7280',
        sortOrder:   Number(sortOrder ?? 0),
        isActive:    true,
      })
      .returning();
    await auditLogService.record(req.user!.userId, 'category.create', 'category', row.id, { name: row.name });
    res.status(201).json({ success: true, data: row });
  }),

  updateCategory: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, description, iconName, color, iconColor, sortOrder, isActive } = req.body as {
      name?: string; description?: string; iconName?: string; color?: string;
      iconColor?: string; sortOrder?: number; isActive?: boolean;
    };
    if (name !== undefined && String(name).trim().length === 0)
      throw AppError.badRequest('Name cannot be empty');

    const [existing] = await db
      .select({ id: serviceCategories.id })
      .from(serviceCategories)
      .where(eq(serviceCategories.id, id));
    if (!existing) throw AppError.notFound('Category not found');

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (name        !== undefined) patch.name        = String(name).trim();
    if (description !== undefined) patch.description = description;
    if (iconName    !== undefined) patch.iconName    = iconName;
    if (color       !== undefined) patch.color       = color;
    if (iconColor   !== undefined) patch.iconColor   = iconColor;
    if (sortOrder   !== undefined) patch.sortOrder   = Number(sortOrder);
    if (isActive    !== undefined) patch.isActive    = Boolean(isActive);

    const [row] = await db
      .update(serviceCategories)
      .set(patch as any)
      .where(eq(serviceCategories.id, id))
      .returning();
    if (!row) throw AppError.notFound('Category not found');
    await auditLogService.record(req.user!.userId, 'category.update', 'category', id, patch);
    res.json({ success: true, data: row });
  }),

  uploadProfessionalAvatar: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!req.file) throw AppError.badRequest('No file uploaded. Use the "avatar" field.');
    const [existing] = await db.select({ id: professionals.id }).from(professionals).where(eq(professionals.id, id));
    if (!existing) throw AppError.notFound('Professional not found');
    const avatarUrl = await storageService.uploadProfessionalAvatar(id, req.file);
    const [row] = await db.update(professionals).set({ avatarUrl, updatedAt: new Date() }).where(eq(professionals.id, id)).returning();
    await auditLogService.record(req.user!.userId, 'professional.avatar_upload', 'professional', id, {});
    res.json({ success: true, data: row });
  }),

  uploadCategoryImage: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!req.file) throw AppError.badRequest('No file uploaded. Use the "image" field.');
    const [existing] = await db.select({ id: serviceCategories.id }).from(serviceCategories).where(eq(serviceCategories.id, id));
    if (!existing) throw AppError.notFound('Category not found');
    const imageUrl = await storageService.uploadCategoryImage(`category-${id}`, req.file);
    const [row] = await db.update(serviceCategories).set({ imageUrl, updatedAt: new Date() } as any).where(eq(serviceCategories.id, id)).returning();
    res.json({ success: true, data: row });
  }),

  deleteCategory: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const [existing] = await db
      .select({ id: serviceCategories.id })
      .from(serviceCategories)
      .where(eq(serviceCategories.id, id));
    if (!existing) throw AppError.notFound('Category not found');

    // Deactivate instead of hard-delete (FK references prevent deletion)
    const [row] = await db
      .update(serviceCategories)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(serviceCategories.id, id))
      .returning({ id: serviceCategories.id });
    await auditLogService.record(req.user!.userId, 'category.delete', 'category', id);
    res.json({ success: true, data: { id: row.id } });
  }),

  /* ──────────────────────── Reviews ──────────────────────────── */
  listReviews: asyncHandler(async (req: Request, res: Response) => {
    const limit  = Math.min(Number(req.query.limit  ?? 500), 500);
    const offset = Number(req.query.offset ?? 0);

    const rows = await db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        deletedAt: reviews.deletedAt,
        customerId: reviews.customerId,
        professionalId: reviews.professionalId,
        bookingId: reviews.bookingId,
        customerName: users.fullName,
        customerEmail: users.email,
        proName: professionals.name,
        serviceName: bookings.serviceName,
      })
      .from(reviews)
      .leftJoin(users, eq(reviews.customerId, users.id))
      .leftJoin(professionals, eq(reviews.professionalId, professionals.id))
      .leftJoin(bookings, eq(reviews.bookingId, bookings.id))
      .orderBy(desc(reviews.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ total }] = await db
      .select({ total: count(reviews.id) })
      .from(reviews);

    res.json({ success: true, data: { reviews: rows, total: Number(total) } });
  }),

  deleteReview: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const [existing] = await db
      .select({ id: reviews.id, professionalId: reviews.professionalId })
      .from(reviews)
      .where(and(eq(reviews.id, id), isNull(reviews.deletedAt)));
    if (!existing) throw AppError.notFound('Review not found');

    await db.update(reviews).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(reviews.id, id));

    // Recalculate professional's cached rating and reviewCount (exclude soft-deleted)
    const [agg] = await db
      .select({ avgRating: avg(reviews.rating), total: count(reviews.id) })
      .from(reviews)
      .where(and(eq(reviews.professionalId, existing.professionalId), isNull(reviews.deletedAt)));

    await db
      .update(professionals)
      .set({
        rating:      Number(agg?.avgRating ?? 0),
        reviewCount: Number(agg?.total     ?? 0),
        updatedAt:   new Date(),
      })
      .where(eq(professionals.id, existing.professionalId));

    await auditLogService.record(req.user!.userId, 'review.delete', 'review', id);
    res.json({ success: true, data: { id } });
  }),

  restoreReview: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const [existing] = await db
      .select({ id: reviews.id, professionalId: reviews.professionalId })
      .from(reviews)
      .where(and(eq(reviews.id, id), isNotNull(reviews.deletedAt)));
    if (!existing) throw AppError.notFound('Review not found or not deleted');

    await db.update(reviews).set({ deletedAt: null, updatedAt: new Date() }).where(eq(reviews.id, id));

    // Recalculate professional's rating after restore
    const [agg] = await db
      .select({ avgRating: avg(reviews.rating), total: count(reviews.id) })
      .from(reviews)
      .where(and(eq(reviews.professionalId, existing.professionalId), isNull(reviews.deletedAt)));

    await db
      .update(professionals)
      .set({ rating: Number(agg?.avgRating ?? 0), reviewCount: Number(agg?.total ?? 0), updatedAt: new Date() })
      .where(eq(professionals.id, existing.professionalId));

    await auditLogService.record(req.user!.userId, 'review.restore', 'review', id);
    res.json({ success: true, data: { id } });
  }),

  /* ──────────────────────── Audit Logs ───────────────────────── */
  listAuditLogs: asyncHandler(async (req: Request, res: Response) => {
    const limit  = Math.min(Number(req.query.limit  ?? 50), 100);
    const offset = Number(req.query.offset ?? 0);
    const { rows, total } = await auditLogService.list(limit, offset);
    res.json({ success: true, data: { logs: rows, total } });
  }),

  /* ──────────────────────── Payouts ──────────────────────────── */
  listPayoutRequests: asyncHandler(async (req: Request, res: Response) => {
    const limit  = Math.min(Number(req.query.limit  ?? 50), 100);
    const offset = Number(req.query.offset ?? 0);

    const rows = await db
      .select({
        id: payoutRequests.id,
        professionalId: payoutRequests.professionalId,
        proName: professionals.name,
        amount: payoutRequests.amount,
        status: payoutRequests.status,
        note: payoutRequests.note,
        requestedAt: payoutRequests.requestedAt,
        resolvedAt: payoutRequests.resolvedAt,
        providerPayoutId: payoutRequests.providerPayoutId,
        providerStatus: payoutRequests.providerStatus,
        failureReason: payoutRequests.failureReason,
        payoutUpiId: professionals.payoutUpiId,
      })
      .from(payoutRequests)
      .leftJoin(professionals, eq(payoutRequests.professionalId, professionals.id))
      .orderBy(desc(payoutRequests.requestedAt))
      .limit(limit)
      .offset(offset);

    const [{ total }] = await db.select({ total: count(payoutRequests.id) }).from(payoutRequests);

    res.json({ success: true, data: { payouts: rows, total: Number(total) } });
  }),

  /** Scalable partner payout worklist. Aggregates earnings in SQL and never
   * loads all partner history into the browser. */
  listPayoutPartners: asyncHandler(async (req: Request, res: Response) => {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const requestedPageSize = Number(req.query.pageSize ?? 50);
    const pageSize = requestedPageSize === -1
      ? 1000
      : Math.min(250, Math.max(10, requestedPageSize));
    const offset = (page - 1) * pageSize;
    const search = String(req.query.search ?? '').trim();
    const requestedPartnerFilters = String(req.query.status ?? '')
      .split(',')
      .filter(Boolean);
    const allowedPartnerFilters = ['payable', 'pending', 'missing_upi'] as const;
    const partnerFilters = requestedPartnerFilters.filter(
      (value): value is typeof allowedPartnerFilters[number] =>
        (allowedPartnerFilters as readonly string[]).includes(value),
    );
    const partnerFilter = partnerFilters.length
      ? sql`AND (${sql.join(partnerFilters.map(value =>
          value === 'payable'
            ? sql`available > 0`
            : value === 'pending'
              ? sql`pending_requests > 0`
              : sql`available > 0 AND (payout_upi_id IS NULL OR payout_upi_id = '')`,
        ), sql` OR `)})`
      : sql``;

    const result = await db.execute(sql`
      WITH earned AS (
        SELECT b.professional_id, b.scheduled_at,
          COALESCE(SUM(bi.unit_partner_payout * bi.quantity), b.price)::numeric AS amount
        FROM bookings b
        LEFT JOIN booking_items bi ON bi.booking_id = b.id
        WHERE b.deleted_at IS NULL
          AND b.status = 'completed'
          AND EXISTS (
            SELECT 1 FROM payments bp
            WHERE bp.booking_id = b.id AND bp.status = 'paid'
          )
        GROUP BY b.id, b.professional_id, b.scheduled_at, b.price
        UNION ALL
        SELECT oi.partner_id, oi.scheduled_at,
          (oi.partner_payout * GREATEST(1, oi.quantity))::numeric AS amount
        FROM order_items oi
        WHERE oi.partner_id IS NOT NULL
          AND oi.status = 'service_completed'
          AND EXISTS (
            SELECT 1 FROM order_item_payments op
            WHERE op.order_item_id = oi.id AND op.status = 'paid'
          )
      ),
      earned_by_partner AS (
        SELECT
          professional_id,
          COUNT(*)::int AS completed_jobs,
          COALESCE(SUM(amount), 0)::numeric AS total_earnings,
          COALESCE(SUM(amount) FILTER (
            WHERE scheduled_at >= date_trunc('month', CURRENT_DATE)
          ), 0)::numeric AS month_earnings
        FROM earned
        GROUP BY professional_id
      ),
      payouts_by_partner AS (
        SELECT
          professional_id,
          COALESCE(SUM(amount) FILTER (WHERE status IN ('pending', 'approved', 'processing')), 0)::numeric AS pending_payout,
          COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0)::numeric AS paid_out,
          COUNT(*) FILTER (WHERE status IN ('pending', 'approved', 'processing'))::int AS pending_requests,
          MAX(requested_at) FILTER (WHERE status IN ('pending', 'approved', 'processing')) AS latest_request_at
        FROM payout_requests
        GROUP BY professional_id
      ),
      partner_summary AS (
        SELECT
          pr.id AS professional_id,
          pr.name,
          pr.payout_upi_id,
          u.email,
          u.phone,
          COALESCE(e.completed_jobs, 0)::int AS completed_jobs,
          COALESCE(e.total_earnings, 0)::numeric AS total_earnings,
          COALESCE(e.month_earnings, 0)::numeric AS month_earnings,
          COALESCE(p.pending_payout, 0)::numeric AS pending_payout,
          COALESCE(p.paid_out, 0)::numeric AS paid_out,
          COALESCE(p.pending_requests, 0)::int AS pending_requests,
          p.latest_request_at
        FROM professionals pr
        LEFT JOIN users u ON u.id = pr.user_id
        LEFT JOIN earned_by_partner e ON e.professional_id = pr.id
        LEFT JOIN payouts_by_partner p ON p.professional_id = pr.id
        WHERE pr.deleted_at IS NULL
      ),
      filtered AS (
        SELECT *,
          GREATEST(0, total_earnings - pending_payout - paid_out)::numeric AS available
        FROM partner_summary
        WHERE (
          ${search} = ''
          OR name ILIKE ${`%${search}%`}
          OR email ILIKE ${`%${search}%`}
          OR payout_upi_id ILIKE ${`%${search}%`}
        )
      )
      SELECT *,
        COUNT(*) OVER()::int AS total_partners,
        COALESCE(SUM(total_earnings) OVER(), 0)::numeric AS summary_total_earnings,
        COALESCE(SUM(month_earnings) OVER(), 0)::numeric AS summary_month_earnings,
        COALESCE(SUM(pending_payout) OVER(), 0)::numeric AS summary_pending_payout,
        COALESCE(SUM(paid_out) OVER(), 0)::numeric AS summary_paid_out,
        COALESCE(SUM(available) OVER(), 0)::numeric AS summary_available
      FROM filtered
      WHERE TRUE
      ${partnerFilter}
      ORDER BY available DESC, name ASC
      LIMIT ${pageSize} OFFSET ${offset}
    `);

    const rows = (result as any[]).map((row: any) => ({
      id: row.professional_id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      payoutUpiId: row.payout_upi_id,
      completedJobs: Number(row.completed_jobs ?? 0),
      totalEarnings: Number(row.total_earnings ?? 0),
      monthEarnings: Number(row.month_earnings ?? 0),
      pendingPayout: Number(row.pending_payout ?? 0),
      paidOut: Number(row.paid_out ?? 0),
      available: Number(row.available ?? 0),
      pendingRequests: Number(row.pending_requests ?? 0),
      latestRequestAt: row.latest_request_at,
      totalPartners: Number(row.total_partners ?? 0),
      summary: {
        totalEarnings: Number(row.summary_total_earnings ?? 0),
        monthEarnings: Number(row.summary_month_earnings ?? 0),
        pendingPayout: Number(row.summary_pending_payout ?? 0),
        paidOut: Number(row.summary_paid_out ?? 0),
        available: Number(row.summary_available ?? 0),
      },
    }));

    res.json({
      success: true,
      data: {
        partners: rows,
        total: rows[0]?.totalPartners ?? 0,
        summary: rows[0]?.summary ?? {
          totalEarnings: 0, monthEarnings: 0, pendingPayout: 0, paidOut: 0, available: 0,
        },
        page,
        pageSize,
      },
    });
  }),

  /** Full payout/earnings view for one partner, loaded only on demand. */
  getPayoutPartnerDetail: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await db.execute(sql`
      WITH earned AS (
        SELECT b.professional_id, b.scheduled_at,
          COALESCE(SUM(bi.unit_partner_payout * bi.quantity), b.price)::numeric AS amount
        FROM bookings b
        LEFT JOIN booking_items bi ON bi.booking_id = b.id
        WHERE b.deleted_at IS NULL AND b.professional_id = ${id}
          AND b.status = 'completed'
          AND EXISTS (SELECT 1 FROM payments bp WHERE bp.booking_id = b.id AND bp.status = 'paid')
        GROUP BY b.id, b.professional_id, b.scheduled_at, b.price
        UNION ALL
        SELECT oi.partner_id, oi.scheduled_at,
          (oi.partner_payout * GREATEST(1, oi.quantity))::numeric
        FROM order_items oi
        WHERE oi.partner_id = ${id}
          AND oi.status = 'service_completed'
          AND EXISTS (SELECT 1 FROM order_item_payments op WHERE op.order_item_id = oi.id AND op.status = 'paid')
      ),
      earned_by_partner AS (
        SELECT
          professional_id,
          COUNT(*)::int AS completed_jobs,
          COALESCE(SUM(amount), 0)::numeric AS total_earnings,
          COALESCE(SUM(amount) FILTER (
            WHERE scheduled_at >= date_trunc('month', CURRENT_DATE)
          ), 0)::numeric AS month_earnings
        FROM earned
        GROUP BY professional_id
      ),
      payouts_by_partner AS (
        SELECT
          professional_id,
        COALESCE(SUM(amount) FILTER (WHERE status IN ('pending', 'approved', 'processing')), 0)::numeric AS pending_payout,
          COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0)::numeric AS paid_out
        FROM payout_requests
        WHERE professional_id = ${id}
        GROUP BY professional_id
      )
      SELECT
        pr.id, pr.name, pr.payout_upi_id, u.email, u.phone,
        COALESCE(e.completed_jobs, 0)::int AS completed_jobs,
        COALESCE(e.total_earnings, 0)::numeric AS total_earnings,
        COALESCE(e.month_earnings, 0)::numeric AS month_earnings,
        COALESCE(p.pending_payout, 0)::numeric AS pending_payout,
        COALESCE(p.paid_out, 0)::numeric AS paid_out
      FROM professionals pr
      LEFT JOIN users u ON u.id = pr.user_id
      LEFT JOIN earned_by_partner e ON e.professional_id = pr.id
      LEFT JOIN payouts_by_partner p ON p.professional_id = pr.id
      WHERE pr.id = ${id} AND pr.deleted_at IS NULL
    `);
    const row = (result as any[])[0];
    if (!row) throw AppError.notFound('Partner not found.');

    const requests = await db.select({
      id: payoutRequests.id,
      professionalId: payoutRequests.professionalId,
      proName: professionals.name,
      amount: payoutRequests.amount,
      status: payoutRequests.status,
      note: payoutRequests.note,
      requestedAt: payoutRequests.requestedAt,
      resolvedAt: payoutRequests.resolvedAt,
      providerPayoutId: payoutRequests.providerPayoutId,
      providerStatus: payoutRequests.providerStatus,
      failureReason: payoutRequests.failureReason,
    })
      .from(payoutRequests)
      .leftJoin(professionals, eq(payoutRequests.professionalId, professionals.id))
      .where(eq(payoutRequests.professionalId, id))
      .orderBy(desc(payoutRequests.requestedAt))
      .limit(100);

    res.json({
      success: true,
      data: {
        partner: {
          id: row.id, name: row.name, email: row.email, phone: row.phone, payoutUpiId: row.payout_upi_id,
        },
        summary: {
          completedJobs: Number(row.completed_jobs ?? 0),
          totalEarnings: Number(row.total_earnings ?? 0),
          monthEarnings: Number(row.month_earnings ?? 0),
          pendingPayout: Number(row.pending_payout ?? 0),
          paidOut: Number(row.paid_out ?? 0),
          available: Math.max(0, Number(row.total_earnings ?? 0) - Number(row.pending_payout ?? 0) - Number(row.paid_out ?? 0)),
        },
        payoutRequests: requests,
      },
    });
  }),

  listPayoutRuns: asyncHandler(async (req: Request, res: Response) => {
    const limit = Math.min(Number(req.query.limit ?? 20), 100);
    const rows = await db.select().from(payoutRuns)
      .orderBy(desc(payoutRuns.startedAt))
      .limit(limit);
    res.json({ success: true, data: rows });
  }),

  runPayoutsNow: asyncHandler(async (_req: Request, res: Response) => {
    const result = await runPayouts('manual');
    res.json({ success: true, data: result });
  }),

  resolvePayoutRequest: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body as { status?: string };
    if (status !== 'paid' && status !== 'rejected' && status !== 'approved') {
      throw AppError.badRequest('status must be "approved", "paid", or "rejected"');
    }

    const [existing] = await db.select().from(payoutRequests).where(eq(payoutRequests.id, id));
    if (!existing) throw AppError.notFound('Payout request not found');
    if (!['pending', 'approved'].includes(existing.status)) {
      throw AppError.badRequest(`Payout request is already ${existing.status}.`);
    }

    if (status === 'approved') {
      const [row] = await db.update(payoutRequests)
        .set({ status: 'approved', providerStatus: 'approved_for_schedule', failureReason: null })
        .where(and(eq(payoutRequests.id, id), eq(payoutRequests.status, 'pending')))
        .returning();
      if (!row) throw AppError.conflict('Payout request changed before it could be approved.');
      await auditLogService.record(req.user!.userId, 'payout.approved_for_schedule', 'payout_request', id, { amount: existing.amount });
      return res.json({ success: true, data: row });
    }

    if (status === 'paid') {
      const [pro] = await db.select({
        userId: professionals.userId,
        payoutUpiId: professionals.payoutUpiId,
      }).from(professionals).where(eq(professionals.id, existing.professionalId));
      if (!pro?.payoutUpiId) {
        throw AppError.badRequest('Partner has not saved a payout UPI ID.');
      }

      try {
        const provider = await createRazorpayUpiPayout({
          payoutRequestId: existing.id,
          professionalId: existing.professionalId,
          amountRupees: existing.amount,
          upiId: pro.payoutUpiId,
          note: existing.note,
        });
        const [row] = await db
          .update(payoutRequests)
          .set({
            status: 'paid',
            resolvedAt: new Date(),
            providerPayoutId: provider.id,
            providerStatus: provider.status,
            failureReason: null,
          })
          .where(eq(payoutRequests.id, id))
          .returning();

        await auditLogService.record(req.user!.userId, 'payout.paid', 'payout_request', id, {
          amount: existing.amount,
          provider: 'razorpayx',
          providerPayoutId: provider.id,
        });
        if (pro.userId) {
          void notificationService.sendToUser(
            pro.userId,
            'Payout sent',
            `Your payout of ₹${existing.amount} was sent to ${pro.payoutUpiId}.`,
            { payoutId: id, providerPayoutId: provider.id, type: 'payout_paid' },
          );
        }
        return res.json({ success: true, data: row });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'RazorpayX payout failed.';
        await db.update(payoutRequests)
          .set({ providerStatus: 'failed', failureReason: message })
          .where(eq(payoutRequests.id, id));
        throw error;
      }
    }

    const [row] = await db
      .update(payoutRequests)
      .set({ status, resolvedAt: new Date() })
      .where(eq(payoutRequests.id, id))
      .returning();

    await auditLogService.record(req.user!.userId, `payout.${status}`, 'payout_request', id, { amount: existing.amount });

    const [pro] = await db.select({ userId: professionals.userId }).from(professionals).where(eq(professionals.id, existing.professionalId));
    if (pro?.userId) {
      void notificationService.sendToUser(
        pro.userId,
        'Payout request rejected',
        `Your payout request of ₹${existing.amount} was rejected.`,
        { payoutId: id, type: `payout_${status}` },
      );
    }

    res.json({ success: true, data: row });
  }),

  /* ─────────────────────── Analytics Timeseries ───────────────── */
  getAnalyticsTimeseries: asyncHandler(async (req: Request, res: Response) => {
    const VALID_GRANULARITIES = ['day', 'week', 'month'] as const;
    type Granularity = typeof VALID_GRANULARITIES[number];

    const granularity: Granularity = VALID_GRANULARITIES.includes(req.query.granularity as Granularity)
      ? (req.query.granularity as Granularity)
      : 'day';

    // Default: last 30 days
    const defaultTo = new Date();
    const defaultFrom = new Date();
    defaultFrom.setDate(defaultFrom.getDate() - 30);

    const toDate = req.query.to
      ? new Date(String(req.query.to) + 'T23:59:59Z')
      : defaultTo;
    const fromDate = req.query.from
      ? new Date(String(req.query.from) + 'T00:00:00Z')
      : defaultFrom;

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime()))
      throw AppError.badRequest('Invalid from/to date');

    // postgres driver requires strings (not Date objects) in raw sql templates
    const fromIso = fromDate.toISOString();
    const toIso   = toDate.toISOString();

    // Raw SQL query using date_trunc
    const rows = await db.execute(sql`
      SELECT
        date_trunc(${granularity}, b.scheduled_at) AS date,
        COUNT(b.id)::int                            AS bookings,
        COALESCE(SUM(b.price), 0)::numeric          AS revenue,
        COUNT(DISTINCT CASE WHEN u.created_at >= date_trunc(${granularity}, b.scheduled_at)
                             AND u.created_at  <  date_trunc(${granularity}, b.scheduled_at) + ('1 ' || ${granularity})::interval
                            THEN b.customer_id END)::int AS "newCustomers"
      FROM bookings b
      LEFT JOIN users u ON u.id = b.customer_id
      WHERE b.deleted_at IS NULL
        AND b.scheduled_at >= ${fromIso}::timestamptz
        AND b.scheduled_at <= ${toIso}::timestamptz
      GROUP BY 1
      ORDER BY 1 ASC
    `);

    const data = (rows as any[]).map((r: any) => ({
      date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date).slice(0, 10),
      bookings: Number(r.bookings ?? 0),
      revenue: Number(r.revenue ?? 0),
      newCustomers: Number(r.newCustomers ?? r['newCustomers'] ?? 0),
    }));

    res.json({ success: true, data });
  }),
};
