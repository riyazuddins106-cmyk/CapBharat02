import { AppError } from '../utils/AppError.js';
import { bookingRepository } from '../repositories/booking.repository.js';
import { professionalRepository } from '../repositories/professional.repository.js';
import type { CreateBookingInput, RescheduleBookingInput } from '../validators/booking.validators.js';

export const bookingService = {
  async list(customerId: string) {
    return bookingRepository.listForCustomer(customerId);
  },

  async getById(customerId: string, bookingId: string) {
    const booking = await bookingRepository.findByIdAndCustomer(bookingId, customerId);
    if (!booking) throw AppError.notFound('Booking not found.');
    return booking;
  },

  async create(customerId: string, input: CreateBookingInput) {
    const pro = await professionalRepository.findById(input.professionalId);
    if (!pro || !pro.isActive) throw AppError.notFound('Professional not found or unavailable.');

    return bookingRepository.create({
      customerId,
      professionalId: pro.id,
      categoryId: pro.categoryId,
      addressId: input.addressId ?? null,
      serviceName: pro.title,
      proName: pro.name,
      scheduledAt: new Date(input.scheduledAt),
      notes: input.notes ?? null,
      price: pro.basePrice,
      status: 'upcoming',
    });
  },

  async cancel(customerId: string, bookingId: string) {
    const booking = await bookingRepository.findByIdAndCustomer(bookingId, customerId);
    if (!booking) throw AppError.notFound('Booking not found.');
    if (!['pending', 'upcoming'].includes(booking.status)) {
      throw AppError.badRequest('Only pending or upcoming bookings can be cancelled.');
    }
    return bookingRepository.updateStatus(bookingId, 'cancelled');
  },

  async reschedule(customerId: string, bookingId: string, input: RescheduleBookingInput) {
    const booking = await bookingRepository.findByIdAndCustomer(bookingId, customerId);
    if (!booking) throw AppError.notFound('Booking not found.');
    if (!['pending', 'upcoming'].includes(booking.status)) {
      throw AppError.badRequest('Only pending or upcoming bookings can be rescheduled.');
    }
    return bookingRepository.reschedule(bookingId, new Date(input.scheduledAt));
  },
};
