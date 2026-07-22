import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { db } from '../config/database.js';
import { bookings, users, professionals, serviceCategories, reviews, payoutRequests } from '../database/schema/index.js';
import { eq, desc, count, sum, ne, isNull, isNotNull, and, avg } from 'drizzle-orm';
import { AppError } from '../utils/AppError.js';
import { auditLogService } from '../services/auditLog.service.js';
import { notificationService } from '../services/notification.service.js';
import { storageService } from '../services/storage.service.js';
import { hashPassword } from '../utils/password.js';

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

  /* ─────────────────────── Professionals ─────────────────────── */
  listProfessionals: asyncHandler(async (req: Request, res: Response) => {
    const limit  = Math.min(Number(req.query.limit  ?? 50), 100);
    const offset = Number(req.query.offset ?? 0);

    const { subServiceCategories } = await import('../database/schema/subServiceCategories.js');
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
        subCategoryId: professionals.subCategoryId,
        subCategoryName: subServiceCategories.name,
        createdAt: professionals.createdAt,
      })
      .from(professionals)
      .leftJoin(serviceCategories, eq(professionals.categoryId, serviceCategories.id))
      .leftJoin(subServiceCategories, eq(professionals.subCategoryId, subServiceCategories.id))
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
      emailVerifiedAt: new Date(),
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
    const limit  = Math.min(Number(req.query.limit  ?? 50), 100);
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
        customerName: users.fullName,
        customerEmail: users.email,
        proName: professionals.name,
      })
      .from(reviews)
      .leftJoin(users, eq(reviews.customerId, users.id))
      .leftJoin(professionals, eq(reviews.professionalId, professionals.id))
      .where(isNull(reviews.deletedAt))
      .orderBy(desc(reviews.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ total }] = await db
      .select({ total: count(reviews.id) })
      .from(reviews)
      .where(isNull(reviews.deletedAt));

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
      })
      .from(payoutRequests)
      .leftJoin(professionals, eq(payoutRequests.professionalId, professionals.id))
      .orderBy(desc(payoutRequests.requestedAt))
      .limit(limit)
      .offset(offset);

    const [{ total }] = await db.select({ total: count(payoutRequests.id) }).from(payoutRequests);

    res.json({ success: true, data: { payouts: rows, total: Number(total) } });
  }),

  resolvePayoutRequest: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body as { status?: string };
    if (status !== 'paid' && status !== 'rejected') {
      throw AppError.badRequest('status must be "paid" or "rejected"');
    }

    const [existing] = await db.select().from(payoutRequests).where(eq(payoutRequests.id, id));
    if (!existing) throw AppError.notFound('Payout request not found');
    if (existing.status !== 'pending') {
      throw AppError.badRequest(`Payout request is already ${existing.status}.`);
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
        status === 'paid' ? 'Payout sent' : 'Payout request rejected',
        status === 'paid'
          ? `Your payout of ₹${existing.amount} has been processed.`
          : `Your payout request of ₹${existing.amount} was rejected.`,
        { payoutId: id, type: `payout_${status}` },
      );
    }

    res.json({ success: true, data: row });
  }),
};
