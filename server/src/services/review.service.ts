import { AppError } from '../utils/AppError.js';
import { reviewRepository } from '../repositories/review.repository.js';
import { bookingRepository } from '../repositories/booking.repository.js';
import { professionalRepository } from '../repositories/professional.repository.js';
import type { CreateReviewInput } from '../validators/review.validators.js';

export const reviewService = {
  async create(customerId: string, input: CreateReviewInput) {
    const booking = await bookingRepository.findByIdAndCustomer(input.bookingId, customerId);
    if (!booking) throw AppError.notFound('Booking not found.');
    if (booking.status !== 'completed') throw AppError.badRequest('You can only review completed bookings.');

    const existing = await reviewRepository.findByBooking(input.bookingId);
    if (existing) throw AppError.conflict('You have already reviewed this booking.');

    const review = await reviewRepository.create({
      bookingId: input.bookingId,
      customerId,
      professionalId: booking.professionalId,
      rating: input.rating,
      comment: input.comment ?? null,
    });

    // Recompute and persist aggregated rating on professional
    const { avg, count } = await reviewRepository.getAverageRating(booking.professionalId);
    await professionalRepository.updateRating(booking.professionalId, Math.round(avg * 10) / 10, count);

    return review;
  },

  async listForProfessional(professionalId: string) {
    return reviewRepository.listForProfessional(professionalId);
  },
};
