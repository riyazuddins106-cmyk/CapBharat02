import { AppError } from '../utils/AppError.js';
import { reviewRepository } from '../repositories/review.repository.js';
import { bookingRepository } from '../repositories/booking.repository.js';
import { professionalRepository } from '../repositories/professional.repository.js';
import type { CreateReviewInput, UpdateReviewInput } from '../validators/review.validators.js';

async function recomputeRating(professionalId: string) {
  const { avg, count } = await reviewRepository.getAverageRating(professionalId);
  await professionalRepository.updateRating(professionalId, Math.round(avg * 10) / 10, count);
}

export const reviewService = {
  async create(customerId: string, input: CreateReviewInput) {
    const booking = await bookingRepository.findByIdAndCustomer(input.bookingId, customerId);
    if (!booking) throw AppError.notFound('Booking not found.');
    if (booking.status !== 'completed') throw AppError.badRequest('You can only review completed bookings.');
    if (!booking.professionalId) throw AppError.badRequest('This booking has no assigned professional.');

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
    await recomputeRating(booking.professionalId);

    return review;
  },

  async update(customerId: string, reviewId: string, input: UpdateReviewInput) {
    const review = await reviewRepository.findByIdAndCustomer(reviewId, customerId);
    if (!review) throw AppError.notFound('Review not found.');

    const updated = await reviewRepository.update(reviewId, {
      ...(input.rating !== undefined ? { rating: input.rating } : {}),
      ...(input.comment !== undefined ? { comment: input.comment } : {}),
    });

    if (input.rating !== undefined) {
      await recomputeRating(review.professionalId);
    }

    return updated;
  },

  async remove(customerId: string, reviewId: string) {
    const review = await reviewRepository.findByIdAndCustomer(reviewId, customerId);
    if (!review) throw AppError.notFound('Review not found.');

    await reviewRepository.remove(reviewId);
    await recomputeRating(review.professionalId);
  },

  async listForProfessional(professionalId: string) {
    return reviewRepository.listForProfessional(professionalId);
  },
};
