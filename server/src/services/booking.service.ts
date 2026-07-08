import { AppError } from '../utils/AppError.js';
import { bookingRepository } from '../repositories/booking.repository.js';
import { professionalRepository } from '../repositories/professional.repository.js';
import { notificationService } from './notification.service.js';
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

    const booking = await bookingRepository.create({
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

    if (pro.userId) {
      void notificationService.sendToUser(
        pro.userId,
        'New booking request',
        `You have a new booking for ${pro.title}.`,
        { bookingId: booking.id, type: 'booking_created' },
      );
    }

    return booking;
  },

  async cancel(customerId: string, bookingId: string) {
    const booking = await bookingRepository.findByIdAndCustomer(bookingId, customerId);
    if (!booking) throw AppError.notFound('Booking not found.');
    if (!['pending', 'upcoming'].includes(booking.status)) {
      throw AppError.badRequest('Only pending or upcoming bookings can be cancelled.');
    }
    const updated = await bookingRepository.updateStatus(bookingId, 'cancelled');

    const pro = await professionalRepository.findById(booking.professionalId);
    if (pro?.userId) {
      void notificationService.sendToUser(
        pro.userId,
        'Booking cancelled',
        `A booking for ${booking.serviceName} was cancelled by the customer.`,
        { bookingId, type: 'booking_cancelled' },
      );
    }

    return updated;
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
