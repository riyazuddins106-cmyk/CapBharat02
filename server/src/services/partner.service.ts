import { AppError } from '../utils/AppError.js';
import { partnerRepository } from '../repositories/partner.repository.js';
import { professionalRepository } from '../repositories/professional.repository.js';
import { storageService } from './storage.service.js';
import { notificationService } from './notification.service.js';
import type { Express } from 'express';

export const partnerService = {
  async getProfile(userId: string) {
    const pro = await partnerRepository.findProfessionalByUserId(userId);
    if (!pro) throw AppError.notFound('Partner profile not found. Contact support to set up your professional account.');
    return pro;
  },

  async updateProfile(userId: string, data: { title?: string; bio?: string; basePrice?: number; priceUnit?: string; tags?: string[]; categoryId?: string; subCategoryId?: string | null }) {
    const pro = await partnerRepository.findProfessionalByUserId(userId);
    if (!pro) throw AppError.notFound('Partner profile not found.');

    // Validate categoryId — must be active
    if (data.categoryId !== undefined) {
      const { db } = await import('../config/database.js');
      const { serviceCategories } = await import('../database/schema/serviceCategories.js');
      const { eq } = await import('drizzle-orm');
      const [cat] = await db.select({ id: serviceCategories.id, isActive: serviceCategories.isActive })
        .from(serviceCategories).where(eq(serviceCategories.id, data.categoryId)).limit(1);
      if (!cat) throw AppError.badRequest('Category not found');
      if (!cat.isActive) throw AppError.badRequest('Selected category is not active');
    }

    // Validate subCategoryId — must be active and belong to the effective category
    if (data.subCategoryId !== undefined && data.subCategoryId !== null) {
      const { db } = await import('../config/database.js');
      const { subServiceCategories } = await import('../database/schema/subServiceCategories.js');
      const { eq } = await import('drizzle-orm');
      const [sub] = await db.select({ id: subServiceCategories.id, categoryId: subServiceCategories.categoryId, isActive: subServiceCategories.isActive })
        .from(subServiceCategories).where(eq(subServiceCategories.id, data.subCategoryId)).limit(1);
      if (!sub) throw AppError.badRequest('Sub-category not found');
      if (!sub.isActive) throw AppError.badRequest('Selected sub-category is not active');
      const effectiveCategoryId = data.categoryId ?? pro.categoryId;
      if (effectiveCategoryId && sub.categoryId !== effectiveCategoryId)
        throw AppError.badRequest('Sub-category does not belong to the selected category');
    }

    const updated = await professionalRepository.update(pro.id, {
      ...(data.title         !== undefined && { title: data.title }),
      ...(data.bio           !== undefined && { bio: data.bio }),
      ...(data.basePrice     !== undefined && { basePrice: data.basePrice }),
      ...(data.priceUnit     !== undefined && { priceUnit: data.priceUnit }),
      ...(data.tags          !== undefined && { tags: data.tags }),
      ...(data.categoryId    !== undefined && { categoryId: data.categoryId }),
      ...(data.subCategoryId !== undefined && { subCategoryId: data.subCategoryId }),
    });
    return updated;
  },

  async updateAccount(userId: string, data: { fullName?: string; phone?: string }) {
    const { userRepository } = await import('../repositories/user.repository.js');
    const updated = await userRepository.update(userId, {
      ...(data.fullName !== undefined && { fullName: data.fullName }),
      ...(data.phone    !== undefined && { phone: data.phone }),
    });
    if (!updated) throw AppError.notFound('User not found.');
    return {
      id: updated.id,
      email: updated.email,
      phone: updated.phone,
      fullName: updated.fullName,
      avatarUrl: updated.avatarUrl,
      role: updated.role,
      emailVerified: Boolean(updated.emailVerifiedAt),
      createdAt: updated.createdAt,
    };
  },

  async updateAvatar(userId: string, avatarUrl: string) {
    const pro = await partnerRepository.findProfessionalByUserId(userId);
    if (!pro) throw AppError.notFound('Partner profile not found.');
    const updated = await professionalRepository.update(pro.id, { avatarUrl });
    return updated;
  },

  async listJobs(userId: string) {
    const pro = await partnerRepository.findProfessionalByUserId(userId);
    if (!pro) throw AppError.notFound('Partner profile not found.');
    return partnerRepository.listJobs(pro.id);
  },

  async getJob(userId: string, bookingId: string) {
    const pro = await partnerRepository.findProfessionalByUserId(userId);
    if (!pro) throw AppError.notFound('Partner profile not found.');
    const job = await partnerRepository.findJobByIdAndProfessional(bookingId, pro.id);
    if (!job) throw AppError.notFound('Job not found.');

    // Fetch individual booking items so the partner can see all services
    const { db } = await import('../config/database.js');
    const { bookingItems, services } = await import('../database/schema/index.js');
    const { eq } = await import('drizzle-orm');
    const items = await db
      .select({
        name: services.name,
        quantity: bookingItems.quantity,
        unitPartnerPayout: bookingItems.unitPartnerPayout,
        duration: bookingItems.duration,
        lineTotal: bookingItems.lineTotal,
      })
      .from(bookingItems)
      .innerJoin(services, eq(bookingItems.serviceId, services.id))
      .where(eq(bookingItems.bookingId, bookingId));

    return { ...job, services: items };
  },

  async acceptJob(userId: string, bookingId: string) {
    const pro = await partnerRepository.findProfessionalByUserId(userId);
    if (!pro) throw AppError.notFound('Partner profile not found.');
    const job = await partnerRepository.findJobByIdAndProfessional(bookingId, pro.id);
    if (!job) throw AppError.notFound('Job not found or not assigned to you.');
    if (job.status !== 'pending') throw AppError.badRequest(`Cannot accept a booking with status "${job.status}".`);
    const { dispatchService } = await import('./dispatch.service.js');
    const updated = await dispatchService.accept(bookingId, pro.id);
    if (job.customerId) {
      const title = 'Booking confirmed!';
      const body = `${pro.name} has accepted your ${job.serviceName} booking.`;
      void notificationService.sendToUser(job.customerId, title, body, { bookingId, type: 'booking_accepted' });
      const { notificationDbService } = await import('./notificationDb.service.js');
      void notificationDbService.create({ userId: job.customerId, title, body, type: 'booking', data: { bookingId } });
    }
    return updated;
  },

  async rejectJob(userId: string, bookingId: string) {
    const pro = await partnerRepository.findProfessionalByUserId(userId);
    if (!pro) throw AppError.notFound('Partner profile not found.');
    const job = await partnerRepository.findJobByIdAndProfessional(bookingId, pro.id);
    if (!job) throw AppError.notFound('Job not found or not assigned to you.');
    if (job.status !== 'pending') throw AppError.badRequest(`Cannot reject a booking with status "${job.status}".`);
    const { dispatchService } = await import('./dispatch.service.js');
    await dispatchService.reject(bookingId, pro.id);
    const updated = await partnerRepository.findJobByIdAndProfessional(bookingId, pro.id);
    if (job.customerId) {
      const title = 'Booking declined';
      const body = `Your ${job.serviceName} booking was declined by the partner. Please book another professional.`;
      void notificationService.sendToUser(job.customerId, title, body, { bookingId, type: 'booking_rejected' });
      const { notificationDbService } = await import('./notificationDb.service.js');
      void notificationDbService.create({ userId: job.customerId, title, body, type: 'booking', data: { bookingId } });
    }
    return updated;
  },

  async updateAvailability(userId: string, status: 'available' | 'busy' | 'offline') {
    const pro = await partnerRepository.findProfessionalByUserId(userId);
    if (!pro) throw AppError.notFound('Partner profile not found.');
    if (!['available', 'busy', 'offline'].includes(status)) throw AppError.badRequest('Invalid availability status.');
    return professionalRepository.update(pro.id, {
      availabilityStatus: status,
      currentBookingStatus: status === 'available' ? 'available' : status === 'busy' ? 'busy' : 'available',
    });
  },

  async checkIn(userId: string, bookingId: string, qrToken: string) {
    const pro = await partnerRepository.findProfessionalByUserId(userId);
    if (!pro) throw AppError.notFound('Partner profile not found.');

    const job = await partnerRepository.findJobByIdAndProfessional(bookingId, pro.id);
    if (!job) throw AppError.notFound('Job not found or not assigned to you.');
    if (job.status !== 'upcoming' && job.status !== 'pending') {
      throw AppError.badRequest(`Cannot check in a booking with status "${job.status}".`);
    }

    // Verify the QR token is valid and matches this booking
    try {
      const { verifyBookingQrToken } = await import('../utils/bookingQr.js');
      const { bookingId: tokenBookingId } = verifyBookingQrToken(qrToken);
      if (tokenBookingId !== bookingId) {
        throw AppError.badRequest('QR code does not match this booking.');
      }
    } catch (err: any) {
      if (err?.statusCode) throw err;
      throw AppError.badRequest('Invalid or expired QR code. Ask the customer to refresh their booking QR.');
    }

    const updated = await partnerRepository.updateStatus(bookingId, 'in_progress');

    if (job.customerId) {
      const title = 'Your service partner has arrived';
      const body = `${pro.name} has checked in for your ${job.serviceName} booking.`;
      void notificationService.sendToUser(job.customerId, title, body, { bookingId, type: 'booking_in_progress' });
      const { notificationDbService } = await import('./notificationDb.service.js');
      void notificationDbService.create({ userId: job.customerId, title, body, type: 'booking', data: { bookingId } });
    }

    return updated;
  },

  async completeJob(userId: string, bookingId: string) {
    const pro = await partnerRepository.findProfessionalByUserId(userId);
    if (!pro) throw AppError.notFound('Partner profile not found.');

    const job = await partnerRepository.findJobByIdAndProfessional(bookingId, pro.id);
    if (!job) throw AppError.notFound('Job not found or not assigned to you.');
    if (job.status !== 'in_progress') {
      throw AppError.badRequest(`Cannot complete a booking with status "${job.status}". Check in first.`);
    }

    const updated = await partnerRepository.updateStatus(bookingId, 'completed');

    if (job.customerId) {
      const title = 'Service completed — please pay';
      const body = `Your ${job.serviceName} booking with ${pro.name} is complete. Please proceed to payment.`;
      void notificationService.sendToUser(job.customerId, title, body, { bookingId, type: 'booking_completed' });
      const { notificationDbService } = await import('./notificationDb.service.js');
      void notificationDbService.create({ userId: job.customerId, title, body, type: 'booking', data: { bookingId } });

      const { pointsService } = await import('./points.service.js');
      void pointsService.earnForBooking(job.customerId, bookingId, job.price ?? 0);

      // Create a pending payment record so the customer can pay immediately
      try {
        const { db } = await import('../config/database.js');
        const { payments } = await import('../database/schema/payments.js');
        const { eq } = await import('drizzle-orm');
        // Only create if one doesn't exist yet
        const existing = await db.select({ id: payments.id }).from(payments)
          .where(eq(payments.bookingId, bookingId)).limit(1);
        if (!existing.length) {
          await db.insert(payments).values({
            bookingId,
            customerId: job.customerId,
            amount: job.price ?? 0,
            currency: 'INR',
            status: 'created',
          });
        }
      } catch (e) {
        console.error('[partner.service] failed to create payment record:', e);
      }
    }

    return updated;
  },

  async getEarnings(userId: string) {
    const pro = await partnerRepository.findProfessionalByUserId(userId);
    if (!pro) throw AppError.notFound('Partner profile not found.');
    const earnings = await partnerRepository.getEarnings(pro.id);
    const payoutTotals = await partnerRepository.getPayoutTotals(pro.id);
    const available = Math.max(0, earnings.total - payoutTotals.pending - payoutTotals.paid);
    return { ...earnings, pendingPayout: payoutTotals.pending, paidOut: payoutTotals.paid, available };
  },

  async requestPayout(userId: string, amount: number, note?: string) {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw AppError.badRequest('Payout amount must be a positive number.');
    }
    const pro = await partnerRepository.findProfessionalByUserId(userId);
    if (!pro) throw AppError.notFound('Partner profile not found.');

    const earnings = await partnerRepository.getEarnings(pro.id);
    const payoutTotals = await partnerRepository.getPayoutTotals(pro.id);
    const available = earnings.total - payoutTotals.pending - payoutTotals.paid;
    if (amount > available) {
      throw AppError.badRequest(`Requested amount exceeds available balance (₹${available}).`);
    }

    return partnerRepository.createPayoutRequest(pro.id, amount, note);
  },

  async listPayoutRequests(userId: string) {
    const pro = await partnerRepository.findProfessionalByUserId(userId);
    if (!pro) throw AppError.notFound('Partner profile not found.');
    return partnerRepository.listPayoutRequestsForProfessional(pro.id);
  },
};
