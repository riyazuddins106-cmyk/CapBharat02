import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { partnerService } from '../services/partner.service.js';
import { storageService } from '../services/storage.service.js';
import { AppError } from '../utils/AppError.js';
import { orderDispatchService } from '../services/orderDispatch.service.js';
import { db } from '../config/database.js';
import { and, eq, inArray, or } from 'drizzle-orm';
import {
  orderItemRequests, orderItems, orderItemPayments, orders, professionals,
  services, users, addresses,
} from '../database/schema/index.js';

export const partnerController = {
  getProfile: asyncHandler(async (req: Request, res: Response) => {
    const data = await partnerService.getProfile(req.user!.userId);
    res.json({ success: true, data });
  }),

  listJobs: asyncHandler(async (req: Request, res: Response) => {
    const data = await partnerService.listJobs(req.user!.userId);
    res.json({ success: true, data });
  }),

  getJob: asyncHandler(async (req: Request, res: Response) => {
    const data = await partnerService.getJob(req.user!.userId, req.params.id);
    res.json({ success: true, data });
  }),

  acceptJob: asyncHandler(async (req: Request, res: Response) => {
    const data = await partnerService.acceptJob(req.user!.userId, req.params.id);
    res.json({ success: true, data });
  }),

  rejectJob: asyncHandler(async (req: Request, res: Response) => {
    const data = await partnerService.rejectJob(req.user!.userId, req.params.id);
    res.json({ success: true, data });
  }),

  checkIn: asyncHandler(async (req: Request, res: Response) => {
    const { qrToken } = req.body as { qrToken?: string };
    if (!qrToken) throw new (await import('../utils/AppError.js')).AppError('qrToken is required in request body', 400);
    const data = await partnerService.checkIn(req.user!.userId, req.params.id, qrToken);
    res.json({ success: true, data });
  }),

  completeJob: asyncHandler(async (req: Request, res: Response) => {
    const data = await partnerService.completeJob(req.user!.userId, req.params.id);
    res.json({ success: true, data });
  }),

  getEarnings: asyncHandler(async (req: Request, res: Response) => {
    const data = await partnerService.getEarnings(req.user!.userId);
    res.json({ success: true, data });
  }),

  requestPayout: asyncHandler(async (req: Request, res: Response) => {
    const { amount, note } = req.body as { amount?: number; note?: string };
    const data = await partnerService.requestPayout(req.user!.userId, Number(amount), note);
    res.json({ success: true, data });
  }),

  listPayoutRequests: asyncHandler(async (req: Request, res: Response) => {
    const data = await partnerService.listPayoutRequests(req.user!.userId);
    res.json({ success: true, data });
  }),

  updateProfile: asyncHandler(async (req: Request, res: Response) => {
    const data = await partnerService.updateProfile(req.user!.userId, req.body);
    res.json({ success: true, data });
  }),

  updateAccount: asyncHandler(async (req: Request, res: Response) => {
    const data = await partnerService.updateAccount(req.user!.userId, req.body);
    res.json({ success: true, data });
  }),

  updateAvailability: asyncHandler(async (req: Request, res: Response) => {
    // Accept both field names: mobile sends availabilityStatus, legacy sends status
    const status = req.body.availabilityStatus ?? req.body.status;
    const data = await partnerService.updateAvailability(req.user!.userId, status);
    res.json({ success: true, data });
  }),

  updateLocation: asyncHandler(async (req: Request, res: Response) => {
    const { latitude, longitude } = req.body as { latitude?: number; longitude?: number };
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      throw AppError.badRequest('latitude and longitude (numbers) are required.');
    }
    const data = await partnerService.updateLocation(req.user!.userId, latitude, longitude);
    res.json({ success: true, data });
  }),

  uploadAvatar: asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) throw AppError.badRequest('No file uploaded. Use the "avatar" field.');
    const avatarUrl = await storageService.uploadAvatar(req.user!.userId, req.file);
    const data = await partnerService.updateAvatar(req.user!.userId, avatarUrl);
    res.json({ success: true, data });
  }),

  // ── Order-item job endpoints (new multi-service dispatch system) ──────────

  /** GET /api/partner/order-item-jobs — list open requests + assigned items for this partner */
  listOrderItemJobs: asyncHandler(async (req: Request, res: Response) => {
    const [pro] = await db.select({ id: professionals.id })
      .from(professionals)
      .where(eq(professionals.userId, req.user!.userId))
      .limit(1);
    if (!pro) throw AppError.notFound('Partner profile not found.');

    // Pending requests waiting for accept/reject
    const pendingRequests = await db.select({ request: orderItemRequests, item: orderItems, order: orders })
      .from(orderItemRequests)
      .innerJoin(orderItems, eq(orderItemRequests.orderItemId, orderItems.id))
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(and(eq(orderItemRequests.partnerId, pro.id), eq(orderItemRequests.status, 'pending')));

    // Active assigned items (accepted → in progress)
    const activeItems = await db.select({ item: orderItems, order: orders })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(and(
        eq(orderItems.partnerId, pro.id),
        inArray(orderItems.status, ['partner_accepted', 'partner_arrived', 'service_started']),
      ));

    // Completed items (last 30 days)
    const completedItems = await db.select({ item: orderItems, order: orders })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(and(
        eq(orderItems.partnerId, pro.id),
        eq(orderItems.status, 'service_completed'),
      ));

    res.json({
      success: true,
      data: {
        pendingRequests: pendingRequests.map(r => ({
          requestId: r.request.id,
          orderItemId: r.item.id,
          orderId: r.order.id,
          serviceId: r.item.serviceId,
          scheduledAt: r.item.scheduledAt,
          durationMinutes: r.item.durationMinutes,
          partnerPayout: r.item.partnerPayout,
          customerPrice: r.item.customerPrice,
          orderStatus: r.order.status,
          createdAt: r.request.createdAt,
        })),
        activeJobs: activeItems.map(r => ({
          orderItemId: r.item.id,
          orderId: r.order.id,
          serviceId: r.item.serviceId,
          status: r.item.status,
          scheduledAt: r.item.scheduledAt,
          durationMinutes: r.item.durationMinutes,
          partnerPayout: r.item.partnerPayout,
          customerPrice: r.item.customerPrice,
        })),
        completedJobs: completedItems.map(r => ({
          orderItemId: r.item.id,
          orderId: r.order.id,
          serviceId: r.item.serviceId,
          status: r.item.status,
          scheduledAt: r.item.scheduledAt,
          partnerPayout: r.item.partnerPayout,
        })),
      },
    });
  }),

  /** GET /api/partner/order-item-jobs/:itemId — full service-level job detail */
  getOrderItemJob: asyncHandler(async (req: Request, res: Response) => {
    const [pro] = await db.select({ id: professionals.id })
      .from(professionals)
      .where(eq(professionals.userId, req.user!.userId))
      .limit(1);
    if (!pro) throw AppError.notFound('Partner profile not found.');

    const [row] = await db.select({
      item: orderItems,
      order: orders,
      service: { id: services.id, name: services.name, categoryId: services.categoryId },
      customer: { id: users.id, name: users.fullName, phone: users.phone },
      address: addresses,
      payment: orderItemPayments,
      request: { id: orderItemRequests.id, status: orderItemRequests.status },
    })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .leftJoin(services, eq(orderItems.serviceId, services.id))
      .innerJoin(users, eq(orders.customerId, users.id))
      .leftJoin(addresses, eq(orders.addressId, addresses.id))
      .leftJoin(orderItemPayments, eq(orderItemPayments.orderItemId, orderItems.id))
      .leftJoin(orderItemRequests, and(
        eq(orderItemRequests.orderItemId, orderItems.id),
        eq(orderItemRequests.partnerId, pro.id),
        eq(orderItemRequests.status, 'pending'),
      ))
      .where(and(
        eq(orderItems.id, req.params.itemId),
        or(eq(orderItems.partnerId, pro.id), eq(orderItemRequests.partnerId, pro.id)),
      ))
      .limit(1);

    if (!row) throw AppError.notFound('Service job not found.');
    res.json({
      success: true,
      data: {
        ...row.item,
        orderId: row.order.id,
        orderStatus: row.order.status,
        orderNotes: row.order.notes,
        serviceName: row.service?.name ?? 'Service',
        customer: row.customer,
        address: row.address,
        payment: row.payment,
        requestId: row.request?.id ?? null,
        endTime: new Date(new Date(row.item.scheduledAt).getTime() + row.item.durationMinutes * 60_000),
      },
    });
  }),

  /** PATCH /api/partner/order-item-jobs/:requestId/accept */
  acceptOrderItemJob: asyncHandler(async (req: Request, res: Response) => {
    const [pro] = await db.select({ id: professionals.id })
      .from(professionals).where(eq(professionals.userId, req.user!.userId)).limit(1);
    if (!pro) throw AppError.notFound('Partner profile not found.');

    const [request] = await db.select().from(orderItemRequests)
      .where(and(eq(orderItemRequests.id, req.params.requestId), eq(orderItemRequests.partnerId, pro.id)))
      .limit(1);
    if (!request) throw AppError.notFound('Job request not found.');

    const data = await orderDispatchService.acceptItem(request.orderItemId, pro.id);
    res.json({ success: true, data });
  }),

  /** PATCH /api/partner/order-item-jobs/:requestId/reject */
  rejectOrderItemJob: asyncHandler(async (req: Request, res: Response) => {
    const [pro] = await db.select({ id: professionals.id })
      .from(professionals).where(eq(professionals.userId, req.user!.userId)).limit(1);
    if (!pro) throw AppError.notFound('Partner profile not found.');

    const [request] = await db.select().from(orderItemRequests)
      .where(and(eq(orderItemRequests.id, req.params.requestId), eq(orderItemRequests.partnerId, pro.id)))
      .limit(1);
    if (!request) throw AppError.notFound('Job request not found.');

    await orderDispatchService.rejectItem(request.orderItemId, pro.id);
    res.json({ success: true, data: { message: 'Job request rejected.' } });
  }),

  /** PATCH /api/partner/order-item-jobs/:itemId/checkin — partner arrives */
  checkInOrderItem: asyncHandler(async (req: Request, res: Response) => {
    const [pro] = await db.select({ id: professionals.id })
      .from(professionals).where(eq(professionals.userId, req.user!.userId)).limit(1);
    if (!pro) throw AppError.notFound('Partner profile not found.');

    const data = await orderDispatchService.checkInItem(req.params.itemId, pro.id);
    res.json({ success: true, data });
  }),

  /** PATCH /api/partner/order-item-jobs/:itemId/complete — service done */
  completeOrderItem: asyncHandler(async (req: Request, res: Response) => {
    const [pro] = await db.select({ id: professionals.id })
      .from(professionals).where(eq(professionals.userId, req.user!.userId)).limit(1);
    if (!pro) throw AppError.notFound('Partner profile not found.');

    const data = await orderDispatchService.completeItem(req.params.itemId, pro.id);
    res.json({ success: true, data });
  }),
};
