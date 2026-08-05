import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { partnerService } from '../services/partner.service.js';
import { storageService } from '../services/storage.service.js';
import { AppError } from '../utils/AppError.js';
import { orderDispatchService } from '../services/orderDispatch.service.js';
import { db } from '../config/database.js';
import { and, eq, inArray, isNull, or } from 'drizzle-orm';
import {
  orderItemRequests, orderItems, orderItemPayments, orders, professionals,
  services, users, addresses, bookings, partnerJobEvidence,
} from '../database/schema/index.js';
import { supportTicketService } from '../services/supportTicket.service.js';
import { sql } from 'drizzle-orm';

async function assertPartnerJob(professionalId: string, jobType: 'booking' | 'order_item', jobId: string) {
  const row = jobType === 'booking'
    ? await db.select({ id: bookings.id }).from(bookings).where(and(eq(bookings.id, jobId), eq(bookings.professionalId, professionalId), isNull(bookings.deletedAt))).limit(1)
    : await db.select({ id: orderItems.id }).from(orderItems).where(and(eq(orderItems.id, jobId), eq(orderItems.partnerId, professionalId))).limit(1);
  if (!row.length) throw AppError.notFound('Job not found or not assigned to you.');
}

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

  schedule: asyncHandler(async (req: Request, res: Response) => {
    const [pro] = await db.select({ id: professionals.id })
      .from(professionals).where(eq(professionals.userId, req.user!.userId)).limit(1);
    if (!pro) throw AppError.notFound('Partner profile not found.');

    const from = typeof req.query.from === 'string' ? new Date(`${req.query.from}T00:00:00.000Z`) : new Date();
    const to = typeof req.query.to === 'string'
      ? new Date(`${req.query.to}T23:59:59.999Z`)
      : new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) throw AppError.badRequest('from and to must be valid dates.');

    const legacy = await db.select({
      id: bookings.id,
      jobType: bookings.id,
      serviceName: bookings.serviceName,
      scheduledAt: bookings.scheduledAt,
      status: bookings.status,
      customerName: users.fullName,
      payment: orderItemPayments,
      customerPhone: users.phone,
      address: addresses,
      payout: bookings.price,
      durationMinutes: sql<number>`COALESCE((SELECT SUM(duration) FROM booking_items WHERE booking_id = ${bookings.id}), 60)`,
    }).from(bookings)
      .leftJoin(users, eq(bookings.customerId, users.id))
      .leftJoin(addresses, eq(bookings.addressId, addresses.id))
      .where(and(eq(bookings.professionalId, pro.id), isNull(bookings.deletedAt),
        sql`${bookings.scheduledAt} >= ${from.toISOString()}::timestamptz`,
        sql`${bookings.scheduledAt} <= ${to.toISOString()}::timestamptz`));

    const service = await db.select({
      id: orderItems.id,
      serviceName: services.name,
      scheduledAt: orderItems.scheduledAt,
      status: orderItems.status,
      customerName: users.fullName,
      customerPhone: users.phone,
      address: addresses,
      payout: orderItems.partnerPayout,
      durationMinutes: orderItems.durationMinutes,
    }).from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .innerJoin(services, eq(orderItems.serviceId, services.id))
      .innerJoin(users, eq(orders.customerId, users.id))
      .leftJoin(addresses, eq(orders.addressId, addresses.id))
      .where(and(eq(orderItems.partnerId, pro.id),
        sql`${orderItems.scheduledAt} >= ${from.toISOString()}::timestamptz`,
        sql`${orderItems.scheduledAt} <= ${to.toISOString()}::timestamptz`));

    res.json({
      success: true,
      data: [
        ...legacy.map(j => ({ ...j, jobType: 'booking', endTime: new Date(new Date(j.scheduledAt).getTime() + Number(j.durationMinutes) * 60_000) })),
        ...service.map(j => ({ ...j, jobType: 'order_item', endTime: new Date(new Date(j.scheduledAt).getTime() + j.durationMinutes * 60_000) })),
      ].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()),
    });
  }),

  performance: asyncHandler(async (req: Request, res: Response) => {
    const [pro] = await db.select({
      id: professionals.id, rating: professionals.rating, reviewCount: professionals.reviewCount,
    }).from(professionals).where(eq(professionals.userId, req.user!.userId)).limit(1);
    if (!pro) throw AppError.notFound('Partner profile not found.');

    const [legacyCounts] = await db.select({
      total: sql<number>`COUNT(*)`,
      completed: sql<number>`COUNT(*) FILTER (WHERE ${bookings.status} = 'completed')`,
      cancelled: sql<number>`COUNT(*) FILTER (WHERE ${bookings.status} = 'cancelled')`,
    }).from(bookings).where(and(eq(bookings.professionalId, pro.id), isNull(bookings.deletedAt)));
    const [itemCounts] = await db.select({
      total: sql<number>`COUNT(*)`,
      completed: sql<number>`COUNT(*) FILTER (WHERE ${orderItems.status} = 'service_completed')`,
      cancelled: sql<number>`COUNT(*) FILTER (WHERE ${orderItems.status} = 'cancelled')`,
    }).from(orderItems).where(eq(orderItems.partnerId, pro.id));
    const total = Number(legacyCounts?.total ?? 0) + Number(itemCounts?.total ?? 0);
    const completed = Number(legacyCounts?.completed ?? 0) + Number(itemCounts?.completed ?? 0);
    const cancelled = Number(legacyCounts?.cancelled ?? 0) + Number(itemCounts?.cancelled ?? 0);
    const [accepted] = await db.select({ count: sql<number>`COUNT(*)` })
      .from(orderItemRequests).where(and(eq(orderItemRequests.partnerId, pro.id), eq(orderItemRequests.status, 'accepted')));
    const [requests] = await db.select({ count: sql<number>`COUNT(*)` })
      .from(orderItemRequests).where(eq(orderItemRequests.partnerId, pro.id));
    res.json({
      success: true,
      data: {
        rating: Number(pro.rating ?? 0), reviewCount: pro.reviewCount ?? 0,
        jobsCompleted: completed, totalJobs: total,
        completionRate: total ? Math.round(completed / total * 100) : 0,
        cancellationRate: total ? Math.round(cancelled / total * 100) : 0,
        acceptanceRate: Number(requests?.count ?? 0) ? Math.round(Number(accepted?.count ?? 0) / Number(requests.count) * 100) : 0,
        onTimeArrival: null,
      },
    });
  }),

  listEvidence: asyncHandler(async (req: Request, res: Response) => {
    const [pro] = await db.select({ id: professionals.id }).from(professionals)
      .where(eq(professionals.userId, req.user!.userId)).limit(1);
    if (!pro) throw AppError.notFound('Partner profile not found.');
    const jobType = req.query.jobType === 'order_item' ? 'order_item' : 'booking';
    const jobId = String(req.query.jobId ?? '');
    if (!jobId) throw AppError.badRequest('jobId is required.');
    await assertPartnerJob(pro.id, jobType, jobId);
    const rows = await db.select().from(partnerJobEvidence).where(and(
      eq(partnerJobEvidence.professionalId, pro.id),
      jobType === 'booking' ? eq(partnerJobEvidence.bookingId, jobId) : eq(partnerJobEvidence.orderItemId, jobId),
    ));
    res.json({ success: true, data: rows });
  }),

  uploadEvidence: asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) throw AppError.badRequest('A photo file is required.');
    const phase = req.body.phase as 'before' | 'after';
    if (phase !== 'before' && phase !== 'after') throw AppError.badRequest('phase must be before or after.');
    const jobType = req.body.jobType === 'order_item' ? 'order_item' : 'booking';
    const jobId = String(req.body.jobId ?? '');
    if (!jobId) throw AppError.badRequest('jobId is required.');
    const [pro] = await db.select({ id: professionals.id }).from(professionals)
      .where(eq(professionals.userId, req.user!.userId)).limit(1);
    if (!pro) throw AppError.notFound('Partner profile not found.');
    await assertPartnerJob(pro.id, jobType, jobId);
    const url = await storageService.uploadPartnerJobEvidence(pro.id, jobId, phase, req.file);
    const [row] = await db.insert(partnerJobEvidence).values({
      professionalId: pro.id,
      ...(jobType === 'booking' ? { bookingId: jobId } : { orderItemId: jobId }),
      phase, fileUrl: url, fileName: req.file.originalname,
    }).returning();
    res.status(201).json({ success: true, data: row });
  }),

  reportIssue: asyncHandler(async (req: Request, res: Response) => {
    const { jobType, jobId, issueType, message, priority } = req.body as {
      jobType?: 'booking' | 'order_item'; jobId?: string; issueType?: string; message?: string; priority?: 'normal' | 'high' | 'urgent';
    };
    if (!jobType || !jobId || !issueType || !message) throw AppError.badRequest('jobType, jobId, issueType, and message are required.');
    const [pro] = await db.select({ id: professionals.id, name: professionals.name, userId: professionals.userId })
      .from(professionals).where(eq(professionals.userId, req.user!.userId)).limit(1);
    if (!pro) throw AppError.notFound('Partner profile not found.');
    await assertPartnerJob(pro.id, jobType, jobId);
    const [user] = await db.select({ fullName: users.fullName, email: users.email }).from(users).where(eq(users.id, req.user!.userId)).limit(1);
    const ticket = await supportTicketService.create({
      userId: req.user!.userId, name: user?.fullName ?? pro.name, email: user?.email ?? '',
      subject: `Partner job issue: ${issueType}`, message, issueType,
      priority: priority ?? 'normal',
      ...(jobType === 'booking' ? { bookingId: jobId } : { orderItemId: jobId }),
    });
    res.status(201).json({ success: true, data: ticket });
  }),

  // ── Order-item job endpoints (new multi-service dispatch system) ──────────

  /** GET /api/partner/order-item-jobs — list open requests + assigned items for this partner */
  listOrderItemJobs: asyncHandler(async (req: Request, res: Response) => {
    const [pro] = await db.select({
      id: professionals.id,
      categoryId: professionals.categoryId,
      subCategoryId: professionals.subCategoryId,
    })
      .from(professionals)
      .where(eq(professionals.userId, req.user!.userId))
      .limit(1);
    if (!pro) throw AppError.notFound('Partner profile not found.');

    // Pending requests waiting for accept/reject
    const pendingRequests = await db.select({
      request: orderItemRequests,
      item: orderItems,
      order: orders,
      serviceName: services.name,
      customerName: users.fullName,
      payment: orderItemPayments,
    })
      .from(orderItemRequests)
      .innerJoin(orderItems, eq(orderItemRequests.orderItemId, orderItems.id))
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .leftJoin(services, eq(orderItems.serviceId, services.id))
      .leftJoin(users, eq(orders.customerId, users.id))
      .leftJoin(orderItemPayments, eq(orderItemPayments.orderItemId, orderItems.id))
      .where(and(
        eq(orderItemRequests.partnerId, pro.id),
        eq(orderItemRequests.status, 'pending'),
        eq(services.categoryId, pro.categoryId),
        pro.subCategoryId
          ? eq(services.subCategoryId, pro.subCategoryId)
          : undefined,
      ));

    // Active assigned items (accepted → in progress)
    const activeItems = await db.select({
      item: orderItems,
      order: orders,
      serviceName: services.name,
      customerName: users.fullName,
      payment: orderItemPayments,
    })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .leftJoin(services, eq(orderItems.serviceId, services.id))
      .leftJoin(users, eq(orders.customerId, users.id))
      .leftJoin(orderItemPayments, eq(orderItemPayments.orderItemId, orderItems.id))
      .where(and(
        eq(orderItems.partnerId, pro.id),
         inArray(orderItems.status, ['partner_accepted', 'partner_arrived', 'payment_pending', 'payment_completed', 'service_started']),
      ));

    // Completed items (last 30 days)
    const completedItems = await db.select({
      item: orderItems,
      order: orders,
      serviceName: services.name,
      customerName: users.fullName,
      payment: orderItemPayments,
    })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .leftJoin(services, eq(orderItems.serviceId, services.id))
      .leftJoin(users, eq(orders.customerId, users.id))
      .leftJoin(orderItemPayments, eq(orderItemPayments.orderItemId, orderItems.id))
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
           serviceName: r.serviceName ?? 'Service booking',
           customerName: r.customerName ?? 'Customer',
          scheduledAt: r.item.scheduledAt,
          durationMinutes: r.item.durationMinutes,
          partnerPayout: r.item.partnerPayout,
          customerPrice: r.item.customerPrice,
           paymentStatus: r.payment?.status ?? null,
           paymentMethod: r.payment?.method ?? null,
           cashReportedAt: r.payment?.cashReportedAt ?? null,
           cashConfirmedAt: r.payment?.cashConfirmedAt ?? null,
          orderStatus: r.order.status,
          createdAt: r.request.createdAt,
        })),
        activeJobs: activeItems.map(r => ({
          orderItemId: r.item.id,
          orderId: r.order.id,
          serviceId: r.item.serviceId,
           serviceName: r.serviceName ?? 'Service booking',
           customerName: r.customerName ?? 'Customer',
          status: r.item.status,
          scheduledAt: r.item.scheduledAt,
          durationMinutes: r.item.durationMinutes,
          partnerPayout: r.item.partnerPayout,
          customerPrice: r.item.customerPrice,
           paymentStatus: r.payment?.status ?? null,
           paymentMethod: r.payment?.method ?? null,
           cashReportedAt: r.payment?.cashReportedAt ?? null,
           cashConfirmedAt: r.payment?.cashConfirmedAt ?? null,
        })),
        completedJobs: completedItems.map(r => ({
          orderItemId: r.item.id,
          orderId: r.order.id,
          serviceId: r.item.serviceId,
           serviceName: r.serviceName ?? 'Service booking',
           customerName: r.customerName ?? 'Customer',
          status: r.item.status,
          scheduledAt: r.item.scheduledAt,
          partnerPayout: r.item.partnerPayout,
           completedAt: r.item.completedAt,
           paymentStatus: r.payment?.status ?? null,
           paymentMethod: r.payment?.method ?? null,
           cashReportedAt: r.payment?.cashReportedAt ?? null,
           cashConfirmedAt: r.payment?.cashConfirmedAt ?? null,
        })),
      },
    });
  }),

  /** GET /api/partner/order-item-jobs/:itemId — full service-level job detail */
  getOrderItemJob: asyncHandler(async (req: Request, res: Response) => {
    const [pro] = await db.select({
      id: professionals.id,
      categoryId: professionals.categoryId,
      subCategoryId: professionals.subCategoryId,
    })
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
        eq(services.categoryId, pro.categoryId),
        pro.subCategoryId
          ? eq(services.subCategoryId, pro.subCategoryId)
          : undefined,
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
         completedAt: row.item.completedAt,
        endTime: new Date(new Date(row.item.scheduledAt).getTime() + row.item.durationMinutes * 60_000),
      },
    });
  }),

  /** PATCH /api/partner/order-item-jobs/:requestId/accept */
  acceptOrderItemJob: asyncHandler(async (req: Request, res: Response) => {
    const [pro] = await db.select({
      id: professionals.id,
      categoryId: professionals.categoryId,
      subCategoryId: professionals.subCategoryId,
    })
      .from(professionals).where(eq(professionals.userId, req.user!.userId)).limit(1);
    if (!pro) throw AppError.notFound('Partner profile not found.');

    const [request] = await db.select().from(orderItemRequests)
      .where(and(eq(orderItemRequests.id, req.params.requestId), eq(orderItemRequests.partnerId, pro.id)))
      .limit(1);
    if (!request) throw AppError.notFound('Job request not found.');

    const [eligible] = await db.select({ id: orderItems.id })
      .from(orderItems)
      .innerJoin(services, eq(orderItems.serviceId, services.id))
      .where(and(
        eq(orderItems.id, request.orderItemId),
        eq(services.categoryId, pro.categoryId),
        pro.subCategoryId
          ? eq(services.subCategoryId, pro.subCategoryId)
          : undefined,
      ))
      .limit(1);
    if (!eligible) throw AppError.badRequest('This service is outside your assigned category.');

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

    const { qrToken } = req.body as { qrToken?: string };
    if (!qrToken?.trim()) throw AppError.badRequest('qrToken is required. Scan the customer QR code to check in.');

    const data = await orderDispatchService.checkInItem(req.params.itemId, pro.id, qrToken.trim());
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

  /** PATCH /api/partner/order-item-jobs/:itemId/confirm-cash — confirm cash receipt */
  confirmCashPayment: asyncHandler(async (req: Request, res: Response) => {
    const [pro] = await db.select({ id: professionals.id })
      .from(professionals).where(eq(professionals.userId, req.user!.userId)).limit(1);
    if (!pro) throw AppError.notFound('Partner profile not found.');

    const data = await orderDispatchService.confirmCashPayment(req.params.itemId, pro.id);
    res.json({ success: true, data });
  }),
};
