import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { db } from '../config/database.js';
import { bookings, users, professionals, serviceCategories, reviews } from '../database/schema/index.js';
import { eq, desc, count, sum, ne, isNull, and, avg } from 'drizzle-orm';
import { AppError } from '../utils/AppError.js';

export const adminController = {
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

  /* ───────────────────────── Bookings ────────────────────────── */
  listBookings: asyncHandler(async (req: Request, res: Response) => {
    const limit  = Math.min(Number(req.query.limit  ?? 50), 100);
    const offset = Number(req.query.offset ?? 0);

    const rows = await db
      .select({
        id: bookings.id,
        status: bookings.status,
        serviceName: bookings.serviceName,
        proName: bookings.proName,
        price: bookings.price,
        notes: bookings.notes,
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
    res.json({ success: true, data: row });
  }),

  cancelBooking: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const [existing] = await db
      .select({ id: bookings.id, deletedAt: bookings.deletedAt })
      .from(bookings)
      .where(eq(bookings.id, id));
    if (!existing || existing.deletedAt) throw AppError.notFound('Booking not found');

    const [row] = await db
      .update(bookings)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();
    if (!row) throw AppError.notFound('Booking not found');
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
    res.json({ success: true, data: { id: row.id } });
  }),

  /* ─────────────────────── Professionals ─────────────────────── */
  listProfessionals: asyncHandler(async (req: Request, res: Response) => {
    const limit  = Math.min(Number(req.query.limit  ?? 50), 100);
    const offset = Number(req.query.offset ?? 0);

    const rows = await db
      .select({
        id: professionals.id,
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
        createdAt: professionals.createdAt,
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

  updateProfessional: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, title, bio, basePrice, priceUnit, badge, tags } = req.body as {
      name?: string; title?: string; bio?: string; basePrice?: number;
      priceUnit?: string; badge?: string; tags?: string[];
    };

    if (name !== undefined && String(name).trim().length === 0)
      throw AppError.badRequest('Name cannot be empty');
    if (basePrice !== undefined && (typeof basePrice !== 'number' || basePrice < 0))
      throw AppError.badRequest('basePrice must be a non-negative number');

    const [existing] = await db
      .select({ id: professionals.id, deletedAt: professionals.deletedAt })
      .from(professionals)
      .where(eq(professionals.id, id));
    if (!existing || existing.deletedAt) throw AppError.notFound('Professional not found');

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (name      !== undefined) patch.name      = String(name).trim();
    if (title     !== undefined) patch.title     = String(title).trim();
    if (bio       !== undefined) patch.bio       = bio;
    if (basePrice !== undefined) patch.basePrice = basePrice;
    if (priceUnit !== undefined) patch.priceUnit = priceUnit;
    if (badge     !== undefined) patch.badge     = badge || null;
    if (tags      !== undefined) patch.tags      = Array.isArray(tags) ? tags : [];

    const [row] = await db
      .update(professionals)
      .set(patch as any)
      .where(eq(professionals.id, id))
      .returning();
    if (!row) throw AppError.notFound('Professional not found');
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
    res.json({ success: true, data: { id: row.id } });
  }),

  /* ──────────────────────── Reviews ──────────────────────────── */
  listReviews: asyncHandler(async (req: Request, res: Response) => {
    const limit  = Math.min(Number(req.query.limit  ?? 50), 100);
    const offset = Number(req.query.offset ?? 0);

    const rows = await db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        customerId: reviews.customerId,
        professionalId: reviews.professionalId,
        customerName: users.fullName,
        customerEmail: users.email,
        proName: professionals.name,
      })
      .from(reviews)
      .leftJoin(users, eq(reviews.customerId, users.id))
      .leftJoin(professionals, eq(reviews.professionalId, professionals.id))
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
      .where(eq(reviews.id, id));
    if (!existing) throw AppError.notFound('Review not found');

    await db.delete(reviews).where(eq(reviews.id, id));

    // Recalculate professional's cached rating and reviewCount
    const [agg] = await db
      .select({ avgRating: avg(reviews.rating), total: count(reviews.id) })
      .from(reviews)
      .where(eq(reviews.professionalId, existing.professionalId));

    await db
      .update(professionals)
      .set({
        rating:      Number(agg?.avgRating ?? 0),
        reviewCount: Number(agg?.total     ?? 0),
        updatedAt:   new Date(),
      })
      .where(eq(professionals.id, existing.professionalId));

    res.json({ success: true, data: { id } });
  }),
};
