import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import { bookingService } from '../services/booking.service.js';
import { db } from '../config/database.js';
import { and, eq, isNull } from 'drizzle-orm';
import { bookingItems, cartItems, carts, serviceCategories, services, bookings } from '../database/schema/index.js';
import { dispatchService } from '../services/dispatch.service.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { notificationDbService } from '../services/notificationDb.service.js';

export const bookingController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const bookings = await bookingService.list(req.user!.userId);
    sendSuccess(res, bookings);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const booking = await bookingService.getById(req.user!.userId, req.params.id);
    sendSuccess(res, booking);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const booking = await bookingService.create(req.user!.userId, req.body);
    sendSuccess(res, booking, 201);
  }),

  checkout: asyncHandler(async (req: Request, res: Response) => {
    const { scheduledAt, addressId, notes } = req.body as { scheduledAt: string; addressId?: string; notes?: string };
    const when = new Date(scheduledAt);
    if (Number.isNaN(when.getTime())) throw AppError.badRequest('Invalid scheduledAt.');

    // ── Reject past slots ────────────────────────────────────────────────────
    if (when <= new Date()) throw AppError.badRequest('The selected time slot is in the past. Please choose a future slot.');

    // ── Load booking config and validate minimum advance time ─────────────────
    const { platformSettings } = await import('../database/schema/index.js');
    const [cfgRow] = await db.select().from(platformSettings).where(eq(platformSettings.key, 'booking_config'));
    const bookingCfg = cfgRow ? JSON.parse(cfgRow.value) : { minAdvanceMinutes: 30 };
    const globalMinAdvance: number = bookingCfg.minAdvanceMinutes ?? 30;

    const [cart] = await db.select().from(carts).where(eq(carts.customerId, req.user!.userId)).limit(1);
    if (!cart) throw AppError.badRequest('Your cart is empty.');
    const rows = await db.select({ item: cartItems, service: services, category: serviceCategories })
      .from(cartItems)
      .innerJoin(services, eq(cartItems.serviceId, services.id))
      .innerJoin(serviceCategories, eq(services.categoryId, serviceCategories.id))
      .where(and(eq(cartItems.cartId, cart.id), eq(services.isActive, true), isNull(services.deletedAt)));
    if (!rows.length) throw AppError.badRequest('Your cart is empty.');

    // ── Per-service advance time: use strictest requirement across all items ──
    const effectiveMinAdvance = rows.reduce((max, { service }) => {
      const svcMin = service.minAdvanceMinutes ?? globalMinAdvance;
      return Math.max(max, svcMin);
    }, globalMinAdvance);
    const earliestAllowed = new Date(Date.now() + effectiveMinAdvance * 60 * 1000);
    if (when < earliestAllowed) {
      throw AppError.badRequest(
        `Booking must be at least ${effectiveMinAdvance} minute${effectiveMinAdvance === 1 ? '' : 's'} in advance. Please choose a later time slot.`
      );
    }

    const total = rows.reduce((sum, row) => sum + row.item.quantity * row.service.customerPrice, 0);
    const first = rows[0];

    // Duplicate guard: block if this customer already has an active booking created
    // in the last 5 minutes that is still searching for a partner (prevents double-submit).
    const { sql: drizzleSql } = await import('drizzle-orm');
    const [recentDup] = await db.select({ id: bookings.id }).from(bookings).where(
      drizzleSql`customer_id = ${req.user!.userId}
        AND status = 'pending'
        AND dispatch_status = 'searching_partner'
        AND created_at > NOW() - INTERVAL '5 minutes'`
    ).limit(1);
    if (recentDup) throw AppError.conflict('You already have a booking in progress. Please wait a moment before placing another.');

    const [booking] = await db.transaction(async (tx) => {
      const [created] = await tx.insert(bookings).values({
        customerId: req.user!.userId,
        professionalId: null,
        categoryId: first.service.categoryId,
        addressId: addressId ?? null,
        serviceName: rows.length === 1 ? first.service.name : `${first.service.name} + ${rows.length - 1} more`,
        proName: null,
        scheduledAt: when,
        status: 'pending',
        notes: notes ?? null,
        price: total,
        dispatchStatus: 'searching_partner',
        dispatchDeadline: new Date(Date.now() + 10 * 60 * 1000),
      }).returning();
      await tx.insert(bookingItems).values(rows.map(({ item, service }) => ({
        bookingId: created.id,
        serviceId: service.id,
        quantity: item.quantity,
        unitCustomerPrice: service.customerPrice,
        unitPartnerPayout: service.partnerPayout,
        lineTotal: item.quantity * service.customerPrice,
        duration: service.duration,
      })));
      await tx.delete(cartItems).where(eq(cartItems.cartId, cart.id));
      return [created];
    });
    // Notify the customer that their booking was placed
    void notificationDbService.create({
      userId: req.user!.userId,
      title: 'Booking placed!',
      body: `Your booking for ${booking.serviceName} is confirmed. We're finding a professional near you.`,
      type: 'booking',
      data: { bookingId: booking.id },
    });
    try {
      const serviceIds = rows.map(({ service }) => service.id);
      await dispatchService.broadcast(booking, serviceIds);
    } catch (err) {
      // Non-fatal: booking is created; dispatch failure just means no partner notified yet
      logger.warn(`[checkout] dispatch broadcast failed for booking ${booking.id}`, err);
    }
    res.status(201).json({ success: true, data: booking });
  }),

  cancel: asyncHandler(async (req: Request, res: Response) => {
    const booking = await bookingService.cancel(req.user!.userId, req.params.id);
    sendSuccess(res, booking);
  }),

  reschedule: asyncHandler(async (req: Request, res: Response) => {
    const booking = await bookingService.reschedule(req.user!.userId, req.params.id, req.body);
    sendSuccess(res, booking);
  }),
};
