import { AppError } from '../utils/AppError.js';
import { partnerRepository } from '../repositories/partner.repository.js';

export const partnerService = {
  async getProfile(userId: string) {
    const pro = await partnerRepository.findProfessionalByUserId(userId);
    if (!pro) throw AppError.notFound('Partner profile not found. Contact support to set up your professional account.');
    return pro;
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

  async checkIn(userId: string, bookingId: string) {
    const pro = await partnerRepository.findProfessionalByUserId(userId);
    if (!pro) throw AppError.notFound('Partner profile not found.');

    const job = await partnerRepository.findJobByIdAndProfessional(bookingId, pro.id);
    if (!job) throw AppError.notFound('Job not found or not assigned to you.');
    if (job.status !== 'upcoming' && job.status !== 'pending') {
      throw AppError.badRequest(`Cannot check in a booking with status "${job.status}".`);
    }

    return partnerRepository.updateStatus(bookingId, 'in_progress');
  },

  async completeJob(userId: string, bookingId: string) {
    const pro = await partnerRepository.findProfessionalByUserId(userId);
    if (!pro) throw AppError.notFound('Partner profile not found.');

    const job = await partnerRepository.findJobByIdAndProfessional(bookingId, pro.id);
    if (!job) throw AppError.notFound('Job not found or not assigned to you.');
    if (job.status !== 'in_progress') {
      throw AppError.badRequest(`Cannot complete a booking with status "${job.status}". Check in first.`);
    }

    return partnerRepository.updateStatus(bookingId, 'completed');
  },

  async getEarnings(userId: string) {
    const pro = await partnerRepository.findProfessionalByUserId(userId);
    if (!pro) throw AppError.notFound('Partner profile not found.');
    return partnerRepository.getEarnings(pro.id);
  },
};
