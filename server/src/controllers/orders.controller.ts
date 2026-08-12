import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import { db } from '../config/database.js';
import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import {
  orders, orderItems, orderItemRequests, orderItemPayments,
  cartItems, carts, services, serviceCategories, platformSettings,
  professionals, users,
} from '../database/schema/index.js';
import { orderDispatchService, recomputeOrderStatus } from '../services/orderDispatch.service.js';
import { AppError } from '../utils/AppError.js';
import { notificationDbService } from '../services/notificationDb.service.js';
import { logger } from '../utils/logger.js';
import { signOrderItemQrToken } from '../utils/bookingQr.js';

// ── helpers ─────────────────────────────────────────────────────────────────

async function getBookingCfg() {
  const [cfgRow] = await db.select().from(platformSettings).where(eq(platformSettings.key, 'booking_config'));
  return cfgRow
    ? {
      searchDurationMinutes: 10,
      cancellationFeeAfterAcceptancePercent: 20,
      cancellationFeeAfterAcceptanceMinAmount: 50,
      cancellationFeeAfterAcceptanceMaxAmount: 500,
      cancellationFeeAfterCheckinPercent: 20,
      cancellationFeeAfterCheckinMinAmount: 50,
      cancellationFeeAfterCheckinMaxAmount: 500,
      ...JSON.parse(cfgRow.value),
    }
    : {
      searchDurationMinutes: 10,
      cancellationFeeAfterAcceptancePercent: 20,
      cancellationFeeAfterAcceptanceMinAmount: 50,
      cancellationFeeAfterAcceptanceMaxAmount: 500,
      cancellationFeeAfterCheckinPercent: 20,
      cancellationFeeAfterCheckinMinAmount: 50,
      cancellationFeeAfterCheckinMaxAmount: 500,
    };
}

function configuredFeeAmount(
  rateValue: unknown,
  fallbackRate: number,
  minValue: unknown,
  maxValue: unknown,
  applicableAmount: unknown,
) {
  const parsedRate = Number(rateValue);
  const configuredMin = Number(minValue);
  const configuredMax = Number(maxValue);
  const min = Number.isFinite(configuredMin) ? Math.max(0, Math.round(configuredMin)) : 0;
  const max = Number.isFinite(configuredMax) ? Math.max(min, Math.round(configuredMax)) : Number.MAX_SAFE_INTEGER;
  const percentage = Number.isFinite(parsedRate) ? Math.max(0, Math.min(100, parsedRate)) : fallbackRate;
  const baseAmount = Math.max(0, Number(applicableAmount) || 0);
  const calculatedAmount = Math.round(baseAmount * percentage / 100);
  return Math.max(min, Math.min(max, calculatedAmount));
}

async function enrichOrderItems(orderId: string) {
  const items = await db.select({
    item: orderItems,
    service: { id: services.id, name: services.name, categoryId: services.categoryId },
    partner: { id: professionals.id, name: professionals.name },
  })
    .from(orderItems)
    .leftJoin(services, eq(orderItems.serviceId, services.id))
    .leftJoin(professionals, eq(orderItems.partnerId, professionals.id))
    .where(eq(orderItems.orderId, orderId));

  // Attach payment status per item
  const itemIds = items.map(i => i.item.id);
  const itemPayments = itemIds.length
    ? await db.select().from(orderItemPayments).where(inArray(orderItemPayments.orderItemId, itemIds))
    : [];
  const paymentByItemId = new Map(itemPayments.map(p => [p.orderItemId, p]));

  return items.map(({ item, service, partner }) => ({
    ...item,
    serviceName: service?.name ?? null,
    partnerName: partner?.name ?? null,
    payment: paymentByItemId.get(item.id) ?? null,
    // Calculated time window
    startTime: item.scheduledAt,
    endTime: new Date(new Date(item.scheduledAt).getTime() + item.durationMinutes * 60_000),
  }));
}

async function pauseExpiredOrderItems(orderIds: string[]) {
  await orderDispatchService.expireTimedOutItems(orderIds);
}

// ── controller ───────────────────────────────────────────────────────────────

export const ordersController = {

  /** POST /api/orders/checkout — create master order + per-service items from cart */
  checkout: asyncHandler(async (req: Request, res: Response) => {
    const { scheduledAt, addressId, notes } = req.body as {
      scheduledAt: string; addressId?: string; notes?: string;
    };
    const when = new Date(scheduledAt);
    if (Number.isNaN(when.getTime())) throw AppError.badRequest('Invalid scheduledAt.');
    if (when <= new Date()) throw AppError.badRequest('The selected time slot is in the past. Please choose a future slot.');

    const bookingCfg = await getBookingCfg();
    const searchDurationMinutes = Math.max(1, Math.min(60, Number(bookingCfg.searchDurationMinutes) || 10));
    const globalMinAdvance: number = bookingCfg.minAdvanceMinutes ?? 30;
    const sameDayBooking: boolean  = bookingCfg.sameDayBooking !== false;
    const maxAdvanceDays: number   = bookingCfg.maxAdvanceDays ?? 30;
    const is24Hours: boolean       = bookingCfg.is24Hours === true;
    const openingHour: number      = is24Hours ? 0 : (bookingCfg.openingHour ?? 8);
    const closingHour: number      = is24Hours ? 24 : (bookingCfg.closingHour ?? 20);

    const nowDate = new Date();
    if (when.toDateString() === nowDate.toDateString() && !sameDayBooking) {
      throw AppError.badRequest('Same-day bookings are not available. Please choose a future date.');
    }
    const maxDate = new Date(nowDate.getTime() + maxAdvanceDays * 24 * 60 * 60 * 1000);
    if (when > maxDate) {
      throw AppError.badRequest(`Bookings can only be made up to ${maxAdvanceDays} days in advance.`);
    }

    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const whenIST = new Date(when.getTime() + IST_OFFSET_MS);
    const slotHour = whenIST.getUTCHours();
    if (!is24Hours && (slotHour < openingHour || slotHour >= closingHour)) {
      throw AppError.badRequest(`Bookings are only available between ${openingHour}:00 and ${closingHour}:00.`);
    }

    // Load cart
    const [cart] = await db.select().from(carts).where(eq(carts.customerId, req.user!.userId)).limit(1);
    if (!cart) throw AppError.badRequest('Your cart is empty.');
    const rows = await db.select({ item: cartItems, service: services, category: serviceCategories })
      .from(cartItems)
      .innerJoin(services, eq(cartItems.serviceId, services.id))
      .innerJoin(serviceCategories, eq(services.categoryId, serviceCategories.id))
      .where(and(eq(cartItems.cartId, cart.id), eq(services.isActive, true), isNull(services.deletedAt)));
    if (!rows.length) throw AppError.badRequest('Your cart is empty.');

    // Min advance: strictest across services
    const effectiveMinAdvance = rows.reduce((max, { service }) => {
      return Math.max(max, service.minAdvanceMinutes ?? globalMinAdvance);
    }, globalMinAdvance);
    const earliestAllowed = new Date(Date.now() + effectiveMinAdvance * 60_000);
    if (when < earliestAllowed) {
      throw AppError.badRequest(
        `Booking must be at least ${effectiveMinAdvance} minute${effectiveMinAdvance === 1 ? '' : 's'} in advance.`
      );
    }

    // End-time check: use LONGEST duration (not sum) — parallel services
    const maxDurationMinutes = rows.reduce(
      (max, { item, service }) => Math.max(max, item.quantity * (service.duration ?? 60)), 0
    );
    const endIST = new Date(whenIST.getTime() + maxDurationMinutes * 60_000);
    const endHour = endIST.getUTCHours() + endIST.getUTCMinutes() / 60;
    if (!is24Hours && endHour > closingHour) {
      const pad = (n: number) => String(Math.floor(n)).padStart(2, '0');
      const endStr = `${pad(endIST.getUTCHours())}:${pad(endIST.getUTCMinutes())}`;
      throw AppError.badRequest(
        `Your booking would end at ${endStr}, which is past closing time (${closingHour}:00). Please choose an earlier slot.`
      );
    }

    const total = rows.reduce((sum, row) => sum + row.item.quantity * row.service.customerPrice, 0);

    // Create order + items in a transaction
    const order = await db.transaction(async (tx) => {
      const [createdOrder] = await tx.insert(orders).values({
        customerId: req.user!.userId,
        addressId: addressId ?? null,
        scheduledAt: when,
        status: 'searching_partners',
        totalAmount: total,
        notes: notes ?? null,
      }).returning();

      await tx.insert(orderItems).values(rows.map(({ item, service }) => ({
        orderId: createdOrder.id,
        serviceId: service.id,
        status: 'searching_partner' as const,
        dispatchDeadline: new Date(Date.now() + searchDurationMinutes * 60_000),
        scheduledAt: when,
        durationMinutes: service.duration ?? 60,
        customerPrice: service.customerPrice,
        partnerPayout: service.partnerPayout,
        quantity: item.quantity,
      })));

      await tx.delete(cartItems).where(eq(cartItems.cartId, cart.id));
      return createdOrder;
    });

    // Notify customer
    const serviceNames = rows.map(r => r.service.name).join(', ');
    void notificationDbService.create({
      userId: req.user!.userId,
      title: 'Order placed! 🎉',
      body: `Your order for ${serviceNames} is placed. Finding partners near you...`,
      type: 'booking',
      data: { orderId: order.id },
    });

    // Dispatch per item (non-fatal)
    const createdItems = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    for (const item of createdItems) {
      try {
        await orderDispatchService.broadcastForItem(item, order);
      } catch (err) {
        logger.warn(`[orders] dispatch failed for item ${item.id}`, err);
      }
    }

    const enriched = await enrichOrderItems(order.id);
    res.status(201).json({ success: true, data: { ...order, items: enriched } });
  }),

  /** GET /api/orders — list orders for the authenticated customer */
  list: asyncHandler(async (req: Request, res: Response) => {
    const customerOrders = await db.select()
      .from(orders)
      .where(eq(orders.customerId, req.user!.userId))
      .orderBy(desc(orders.createdAt));

    await pauseExpiredOrderItems(customerOrders.map((order) => order.id));

    const result = await Promise.all(customerOrders.map(async (order) => {
      const enriched = await enrichOrderItems(order.id);
      return { ...order, items: enriched };
    }));

    sendSuccess(res, result);
  }),

  /** GET /api/orders/:id — get a single order with all items */
  getById: asyncHandler(async (req: Request, res: Response) => {
    const [order] = await db.select()
      .from(orders)
      .where(and(eq(orders.id, req.params.id), eq(orders.customerId, req.user!.userId)))
      .limit(1);
    if (!order) throw AppError.notFound('Order not found.');

    const enriched = await enrichOrderItems(order.id);
    sendSuccess(res, { ...order, items: enriched });
  }),

  /** GET /api/orders/:id/items/:itemId/qr — short-lived customer check-in QR */
  getItemQr: asyncHandler(async (req: Request, res: Response) => {
    const { id: orderId, itemId } = req.params;
    const [order] = await db.select().from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.customerId, req.user!.userId)))
      .limit(1);
    if (!order) throw AppError.notFound('Order not found.');

    const [item] = await db.select().from(orderItems)
      .where(and(eq(orderItems.id, itemId), eq(orderItems.orderId, orderId)))
      .limit(1);
    if (!item) throw AppError.notFound('Service not found in this order.');
    if (!['partner_accepted', 'partner_arrived', 'payment_pending', 'payment_completed', 'service_started'].includes(item.status)) {
      throw AppError.badRequest('The customer QR code is available after a partner accepts this service.');
    }

    sendSuccess(res, {
      qrToken: signOrderItemQrToken(orderId, itemId),
      expiresIn: 300,
      orderId,
      orderItemId: itemId,
    });
  }),

  /** PATCH /api/orders/:id/items/:itemId/cancel — cancel one service in an order */
  cancelItem: asyncHandler(async (req: Request, res: Response) => {
    const { id: orderId, itemId } = req.params;
    const rawReason = (req.body as { reason?: unknown; notes?: unknown } | undefined)?.reason
      ?? (req.body as { notes?: unknown } | undefined)?.notes;
    const cancellationReason = typeof rawReason === 'string' && rawReason.trim()
      ? rawReason.trim()
      : null;

    const [order] = await db.select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.customerId, req.user!.userId)))
      .limit(1);
    if (!order) throw AppError.notFound('Order not found.');

    const [item] = await db.select().from(orderItems)
      .where(and(eq(orderItems.id, itemId), eq(orderItems.orderId, orderId)))
      .limit(1);
    if (!item) throw AppError.notFound('Service not found in this order.');
    if (['service_completed', 'service_started', 'cancelled'].includes(item.status)) {
      throw AppError.badRequest('This service cannot be cancelled.');
    }

    const bookingCfg = await getBookingCfg();
    const configuredCancellationFee = item.status === 'partner_accepted'
      ? configuredFeeAmount(
        bookingCfg.cancellationFeeAfterAcceptancePercent,
        20,
        bookingCfg.cancellationFeeAfterAcceptanceMinAmount,
        bookingCfg.cancellationFeeAfterAcceptanceMaxAmount,
        item.customerPrice,
      )
      : ['partner_arrived', 'payment_pending', 'payment_completed'].includes(item.status)
        ? configuredFeeAmount(
          bookingCfg.cancellationFeeAfterCheckinPercent,
          20,
          bookingCfg.cancellationFeeAfterCheckinMinAmount,
          bookingCfg.cancellationFeeAfterCheckinMaxAmount,
          item.customerPrice,
        )
        : 0;
    const cancellationFee = Math.min(Math.max(0, Number(item.customerPrice) || 0), configuredCancellationFee);

    // Cancel pending partner requests for this item
    await db.update(orderItemRequests)
      .set({ status: 'expired', respondedAt: new Date() })
      .where(and(eq(orderItemRequests.orderItemId, itemId), eq(orderItemRequests.status, 'pending')));

    // Free the partner if assigned
    if (item.partnerId) {
      await db.update(professionals)
        .set({ availabilityStatus: 'available', updatedAt: new Date() })
        .where(eq(professionals.id, item.partnerId));
    }

    await db.update(orderItems).set({
      status: 'cancelled',
      cancellationReason,
      cancellationFee,
      cancelledAt: new Date(),
      updatedAt: new Date(),
    })
      .where(eq(orderItems.id, itemId));

    await recomputeOrderStatus(orderId);

    const enriched = await enrichOrderItems(orderId);
    const [updatedOrder] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    sendSuccess(res, { ...updatedOrder, items: enriched });
  }),

  /** PATCH /api/orders/:id/items/:itemId/continue-searching — re-broadcast dispatch for an unassigned item */
  continueSearching: asyncHandler(async (req: Request, res: Response) => {
    const { id: orderId, itemId } = req.params;

    const [order] = await db.select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.customerId, req.user!.userId)))
      .limit(1);
    if (!order) throw AppError.notFound('Order not found.');

    const [item] = await db.select().from(orderItems)
      .where(and(eq(orderItems.id, itemId), eq(orderItems.orderId, orderId)))
      .limit(1);
    if (!item) throw AppError.notFound('Service not found in this order.');
    if (item.partnerId) throw AppError.badRequest('This service already has an assigned partner.');
    if (item.status === 'cancelled') throw AppError.badRequest('Cannot search for a cancelled service.');

    const bookingCfg = await getBookingCfg();
    const searchDurationMinutes = Math.max(1, Math.min(60, Number(bookingCfg.searchDurationMinutes) || 10));

    await db.update(orderItemRequests)
      .set({ status: 'expired', respondedAt: new Date() })
      .where(and(
        eq(orderItemRequests.orderItemId, itemId),
        eq(orderItemRequests.status, 'pending'),
      ));

    // Reset to searching
    await db.update(orderItems).set({
      status: 'searching_partner',
      dispatchDeadline: new Date(Date.now() + searchDurationMinutes * 60_000),
      updatedAt: new Date(),
    })
      .where(eq(orderItems.id, itemId));

    // Re-broadcast
    const [freshItem] = await db.select().from(orderItems).where(eq(orderItems.id, itemId)).limit(1);
    await orderDispatchService.broadcastForItem(freshItem!, order);
    await recomputeOrderStatus(orderId);

    sendSuccess(res, { message: 'Searching for a partner...' });
  }),

  /** GET /api/orders/:id/items/:itemId/payment — get payment status for one service */
  getItemPayment: asyncHandler(async (req: Request, res: Response) => {
    const { id: orderId, itemId } = req.params;

    const [order] = await db.select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.customerId, req.user!.userId)))
      .limit(1);
    if (!order) throw AppError.notFound('Order not found.');

    const [payment] = await db.select().from(orderItemPayments)
      .where(eq(orderItemPayments.orderItemId, itemId))
      .limit(1);
    sendSuccess(res, payment ?? null);
  }),

  /** POST /api/orders/:id/items/:itemId/test-pay — test-mode instant payment for one service */
  testPayItem: asyncHandler(async (req: Request, res: Response) => {
    const { id: orderId, itemId } = req.params;
    const { method = 'cash' } = req.body as { method?: string };

    // Verify payment config: test mode must be on
    const [cfgRow] = await db.select().from(platformSettings).where(eq(platformSettings.key, 'payment_config'));
    const paymentCfg = cfgRow ? JSON.parse(cfgRow.value) : {};
    if (!paymentCfg?.testMode?.enabled) {
      throw AppError.badRequest('Test mode is not enabled. Enable it in Admin → Payment Config.');
    }
    if (!['cash', 'upi_manual', 'razorpay', 'stripe'].includes(method)) {
      throw AppError.badRequest('Unsupported payment method.');
    }
    if (method === 'upi_manual' && !(paymentCfg?.upi?.enabled === true && paymentCfg.upi.vpa?.trim())) {
      throw AppError.badRequest('UPI is not configured. Enable UPI and add a VPA in Admin → Payment Config, or choose another payment method.');
    }

    const [order] = await db.select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.customerId, req.user!.userId)))
      .limit(1);
    if (!order) throw AppError.notFound('Order not found.');

    const [item] = await db.select().from(orderItems)
      .where(and(eq(orderItems.id, itemId), eq(orderItems.orderId, orderId)))
      .limit(1);
    if (!item) throw AppError.notFound('Service item not found.');
    if (item.status === 'cancelled') throw AppError.badRequest('Cannot pay for a cancelled service.');
    if (!['partner_arrived', 'payment_pending'].includes(item.status)) {
      throw AppError.badRequest('Payment is available after the partner checks in.');
    }

    const [existing] = await db.select().from(orderItemPayments)
      .where(eq(orderItemPayments.orderItemId, itemId)).limit(1);
    if (existing?.status === 'paid') throw AppError.badRequest('This service has already been paid.');

    const fakeRef = `test_${Date.now()}`;
    const isCash = method === 'cash';
    let paymentRecord;
    if (existing) {
      const [updated] = await db.update(orderItemPayments).set({
        method: method as any, status: isCash ? 'created' : 'paid',
        notes: '[TEST MODE] Simulated payment',
        cashReportedAt: isCash ? new Date() : null,
        updatedAt: new Date(),
      }).where(eq(orderItemPayments.id, existing.id)).returning();
      paymentRecord = updated;
    } else {
      const [created] = await db.insert(orderItemPayments).values({
        orderItemId: itemId,
        orderId,
        customerId: req.user!.userId,
        amount: item.customerPrice,
        currency: 'INR',
        status: isCash ? 'created' : 'paid',
        method: method as any,
        notes: '[TEST MODE] Simulated payment',
        cashReportedAt: isCash ? new Date() : undefined,
        razorpayOrderId: method === 'razorpay' ? fakeRef : undefined,
        stripeSessionId: method === 'stripe' ? fakeRef : undefined,
      }).returning();
      paymentRecord = created;
    }

    if (!isCash) {
      await db.update(orderItems).set({
        status: 'service_started',
        updatedAt: new Date(),
      }).where(eq(orderItems.id, itemId));
    }

    await recomputeOrderStatus(orderId);
    if (isCash) {
      const service = await db.select({ name: services.name }).from(services).where(eq(services.id, item.serviceId)).limit(1);
      void notificationDbService.create({
        userId: order.customerId,
        title: 'Cash payment reported',
        body: `Cash payment of ₹${item.customerPrice} reported for ${service[0]?.name ?? 'your service'}. Your partner will confirm receipt.`,
        type: 'payment',
        data: { orderId, orderItemId: itemId, amount: item.customerPrice, method: 'cash' },
      });
    }
    sendSuccess(res, paymentRecord);
  }),

  /** POST /api/orders/:id/items/:itemId/pay — cash/upi payment for one service */
  payItem: asyncHandler(async (req: Request, res: Response) => {
    const { id: orderId, itemId } = req.params;
    const { method, notes } = req.body as { method: 'cash' | 'upi_manual'; notes?: string };

    if (!method || !['cash', 'upi_manual'].includes(method)) {
      throw AppError.badRequest('Valid payment method (cash / upi_manual) is required.');
    }
    if (method === 'upi_manual') {
      const [paymentCfgRow] = await db.select().from(platformSettings)
        .where(eq(platformSettings.key, 'payment_config'));
      const paymentCfg = paymentCfgRow ? JSON.parse(paymentCfgRow.value) : {};
      if (!(paymentCfg?.upi?.enabled === true && paymentCfg.upi.vpa?.trim())) {
        throw AppError.badRequest('UPI is not configured. Enable UPI and add a VPA in Admin → Payment Config, or choose another payment method.');
      }
    }

    const [order] = await db.select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.customerId, req.user!.userId)))
      .limit(1);
    if (!order) throw AppError.notFound('Order not found.');

    const [item] = await db.select().from(orderItems)
      .where(and(eq(orderItems.id, itemId), eq(orderItems.orderId, orderId)))
      .limit(1);
    if (!item) throw AppError.notFound('Service item not found.');
    if (item.status === 'cancelled') throw AppError.badRequest('Cannot pay for a cancelled service.');
    if (!['partner_arrived', 'payment_pending'].includes(item.status)) {
      throw AppError.badRequest('Payment is available after the partner checks in.');
    }

    const [existing] = await db.select().from(orderItemPayments)
      .where(eq(orderItemPayments.orderItemId, itemId)).limit(1);
    if (existing?.status === 'paid') throw AppError.badRequest('Already paid.');

    const newStatus = 'created';
    let paymentRecord;
    if (existing) {
      const [updated] = await db.update(orderItemPayments).set({
        method: method as any, status: newStatus as any, notes: notes ?? null,
        cashReportedAt: method === 'cash' ? new Date() : null,
        updatedAt: new Date(),
      }).where(eq(orderItemPayments.id, existing.id)).returning();
      paymentRecord = updated;
    } else {
      const [created] = await db.insert(orderItemPayments).values({
        orderItemId: itemId, orderId, customerId: req.user!.userId,
        amount: item.customerPrice, currency: 'INR',
        status: newStatus as any, method: method as any, notes: notes ?? null,
        cashReportedAt: method === 'cash' ? new Date() : undefined,
      }).returning();
      paymentRecord = created;
    }

    await recomputeOrderStatus(orderId);
    const service = await db.select({ name: services.name }).from(services).where(eq(services.id, item.serviceId)).limit(1);
    void notificationDbService.create({
      userId: order.customerId,
      title: method === 'cash' ? 'Cash payment reported' : 'Payment submitted',
      body: method === 'cash'
        ? `Cash payment of ₹${item.customerPrice} reported for ${service[0]?.name ?? 'your service'}. Your partner will confirm receipt.`
        : `Payment details submitted for ${service[0]?.name ?? 'your service'}.`,
      type: 'payment',
      data: { orderId, orderItemId: itemId, amount: item.customerPrice, method },
    });

    sendSuccess(res, paymentRecord);
  }),
};
