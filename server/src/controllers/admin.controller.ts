import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { db } from '../config/database.js';
import { bookings, users, professionals, serviceCategories } from '../database/schema/index.js';
import { eq, desc, count, sum, ne, isNull } from 'drizzle-orm';
import { AppError } from '../utils/AppError.js';

export const adminController = {
  getStats: asyncHandler(async (_req: Request, res: Response) => {
    const [bookingStats] = await db
      .select({
        total: count(bookings.id),
        revenue: sum(bookings.price),
      })
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

    res.json({
      success: true,
      data: {
        totalBookings: Number(bookingStats?.total ?? 0),
        totalRevenue: Number(bookingStats?.revenue ?? 0),
        activeBookings: Number(activeBookingCount?.count ?? 0),
        totalProfessionals: Number(proCount?.count ?? 0),
        totalCustomers: Number(customerCount?.count ?? 0),
      },
    });
  }),

  listBookings: asyncHandler(async (req: Request, res: Response) => {
    const limit = Math.min(Number(req.query.limit ?? 50), 100);
    const offset = Number(req.query.offset ?? 0);

    const rows = await db
      .select({
        id: bookings.id,
        status: bookings.status,
        serviceName: bookings.serviceName,
        proName: bookings.proName,
        price: bookings.price,
        scheduledAt: bookings.scheduledAt,
        createdAt: bookings.createdAt,
        customerName: users.fullName,
        customerEmail: users.email,
      })
      .from(bookings)
      .leftJoin(users, eq(bookings.customerId, users.id))
      .where(isNull(bookings.deletedAt))
      .orderBy(desc(bookings.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ total }] = await db
      .select({ total: count(bookings.id) })
      .from(bookings)
      .where(isNull(bookings.deletedAt));

    res.json({ success: true, data: { bookings: rows, total: Number(total) } });
  }),

  cancelBooking: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const [row] = await db
      .update(bookings)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();
    if (!row) throw AppError.notFound('Booking not found');
    res.json({ success: true, data: row });
  }),

  listProfessionals: asyncHandler(async (req: Request, res: Response) => {
    const limit = Math.min(Number(req.query.limit ?? 50), 100);
    const offset = Number(req.query.offset ?? 0);

    const rows = await db
      .select({
        id: professionals.id,
        name: professionals.name,
        title: professionals.title,
        rating: professionals.rating,
        reviewCount: professionals.reviewCount,
        basePrice: professionals.basePrice,
        isActive: professionals.isActive,
        avatarUrl: professionals.avatarUrl,
        badge: professionals.badge,
        categoryName: serviceCategories.name,
      })
      .from(professionals)
      .leftJoin(serviceCategories, eq(professionals.categoryId, serviceCategories.id))
      .where(isNull(professionals.deletedAt))
      .orderBy(desc(professionals.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ total }] = await db
      .select({ total: count(professionals.id) })
      .from(professionals)
      .where(isNull(professionals.deletedAt));

    res.json({ success: true, data: { professionals: rows, total: Number(total) } });
  }),

  suspendProfessional: asyncHandler(async (req: Request, res: Response) => {
    const [row] = await db
      .update(professionals)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(professionals.id, req.params.id))
      .returning({ id: professionals.id, isActive: professionals.isActive });
    if (!row) throw AppError.notFound('Professional not found');
    res.json({ success: true, data: row });
  }),

  activateProfessional: asyncHandler(async (req: Request, res: Response) => {
    const [row] = await db
      .update(professionals)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(professionals.id, req.params.id))
      .returning({ id: professionals.id, isActive: professionals.isActive });
    if (!row) throw AppError.notFound('Professional not found');
    res.json({ success: true, data: row });
  }),

  listUsers: asyncHandler(async (req: Request, res: Response) => {
    const limit = Math.min(Number(req.query.limit ?? 50), 100);
    const offset = Number(req.query.offset ?? 0);

    const rows = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(ne(users.role, 'admin'))
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ total }] = await db
      .select({ total: count(users.id) })
      .from(users)
      .where(ne(users.role, 'admin'));

    res.json({ success: true, data: { users: rows, total: Number(total) } });
  }),
};
