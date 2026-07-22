import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import { bookingService } from '../services/booking.service.js';
import { db } from '../config/database.js';
import { and, eq, isNull } from 'drizzle-orm';
import { bookingItems, cartItems, carts, serviceCategories, services, bookings } from '../database/schema/index.js';
import { dispatchService } from '../services/dispatch.service.js';
import { AppError } from '../utils/AppError.js';

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
    const [cart] = await db.select().from(carts).where(eq(carts.customerId, req.user!.userId)).limit(1);
    if (!cart) throw AppError.badRequest('Your cart is empty.');
    const rows = await db.select({ item: cartItems, service: services, category: serviceCategories })
      .from(cartItems)
      .innerJoin(services, eq(cartItems.serviceId, services.id))
      .innerJoin(serviceCategories, eq(services.categoryId, serviceCategories.id))
      .where(and(eq(cartItems.cartId, cart.id), eq(services.isActive, true), isNull(services.deletedAt)));
    if (!rows.length) throw AppError.badRequest('Your cart is empty.');
    const total = rows.reduce((sum, row) => sum + row.item.quantity * row.service.customerPrice, 0);
    const first = rows[0];
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
    await dispatchService.broadcast(booking, first.service.id);
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
