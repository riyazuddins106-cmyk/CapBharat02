import { AppError } from '../utils/AppError.js';
import { bookingRepository } from '../repositories/booking.repository.js';
import { professionalRepository } from '../repositories/professional.repository.js';
import { notificationService } from './notification.service.js';
import { notificationDbService } from './notificationDb.service.js';
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

    const scheduledAt = new Date(input.scheduledAt);
    const duplicate = await bookingRepository.findActiveDuplicate(customerId, pro.id, scheduledAt);
    if (duplicate) {
      throw AppError.conflict('Booking already done. You already have a booking with this professional at this date and time.');
    }

    const booking = await bookingRepository.create({
      customerId,
      professionalId: pro.id,
      categoryId: pro.categoryId,
      addressId: input.addressId ?? null,
      serviceName: pro.title,
      proName: pro.name,
      scheduledAt,
      notes: input.notes ?? null,
      price: pro.basePrice,
      status: 'upcoming',
    });

    if (pro.userId) {
      const title = 'New booking request';
      const body = `You have a new booking for ${pro.title}.`;
      void notificationService.sendToUser(pro.userId, title, body, { bookingId: booking.id, type: 'booking_created' });
      void notificationDbService.create({ userId: pro.userId, title, body, type: 'booking', data: { bookingId: booking.id } });
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
      const title = 'Booking cancelled';
      const body = `A booking for ${booking.serviceName} was cancelled by the customer.`;
      void notificationService.sendToUser(pro.userId, title, body, { bookingId, type: 'booking_cancelled' });
      void notificationDbService.create({ userId: pro.userId, title, body, type: 'booking', data: { bookingId } });
    }
    // Notify customer too
    const cancelTitle = 'Booking cancelled';
    const cancelBody = `Your booking for ${booking.serviceName} has been cancelled.`;
    void notificationDbService.create({ userId: customerId, title: cancelTitle, body: cancelBody, type: 'booking', data: { bookingId } });

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
