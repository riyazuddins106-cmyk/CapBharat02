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

  async updateProfile(userId: string, data: { title?: string; bio?: string; basePrice?: number; priceUnit?: string; tags?: string[] }) {
    const pro = await partnerRepository.findProfessionalByUserId(userId);
    if (!pro) throw AppError.notFound('Partner profile not found.');
    const updated = await professionalRepository.update(pro.id, {
      ...(data.title     !== undefined && { title: data.title }),
      ...(data.bio       !== undefined && { bio: data.bio }),
      ...(data.basePrice !== undefined && { basePrice: data.basePrice }),
      ...(data.priceUnit !== undefined && { priceUnit: data.priceUnit }),
      ...(data.tags      !== undefined && { tags: data.tags }),
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
    return job;
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
      void notificationService.sendToUser(
        job.customerId,
        'Your service partner has arrived',
        `${pro.name} has checked in for your ${job.serviceName} booking.`,
        { bookingId, type: 'booking_in_progress' },
      );
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
      void notificationService.sendToUser(
        job.customerId,
        'Service completed',
        `Your ${job.serviceName} booking with ${pro.name} is complete. Thanks for using ServeNow!`,
        { bookingId, type: 'booking_completed' },
      );

      const { pointsService } = await import('./points.service.js');
      void pointsService.earnForBooking(job.customerId, bookingId, job.price ?? 0);
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
