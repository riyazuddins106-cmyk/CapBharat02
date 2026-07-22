import { Router } from 'express';
import { bookingController } from '../controllers/booking.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { createBookingSchema, bookingIdParamSchema, rescheduleBookingSchema } from '../validators/booking.validators.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { signBookingQrToken } from '../utils/bookingQr.js';
import { bookingRepository } from '../repositories/booking.repository.js';
import { AppError } from '../utils/AppError.js';
import { getPaymentForBooking, submitPayment, createRazorpayOrder, createStripeSession } from '../controllers/payment.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', bookingController.list);
router.post('/', validate({ body: createBookingSchema }), bookingController.create);
router.post('/checkout', bookingController.checkout);
router.get('/:id', validate({ params: bookingIdParamSchema }), bookingController.getById);
router.patch('/:id/cancel', validate({ params: bookingIdParamSchema }), bookingController.cancel);
router.patch('/:id/reschedule', validate({ params: bookingIdParamSchema, body: rescheduleBookingSchema }), bookingController.reschedule);

// Payment endpoints
router.get('/:id/payment', validate({ params: bookingIdParamSchema }), getPaymentForBooking);
router.post('/:id/payment', validate({ params: bookingIdParamSchema }), submitPayment);
router.post('/:id/razorpay/create-order', validate({ params: bookingIdParamSchema }), createRazorpayOrder);
router.post('/:id/stripe/create-session', validate({ params: bookingIdParamSchema }), createStripeSession);

// Generate a short-lived signed QR token for the customer to display
router.get('/:id/qr', asyncHandler(async (req, res) => {
  const booking = await bookingRepository.findByIdAndCustomer(req.params.id, req.user!.userId);
  if (!booking) throw AppError.notFound('Booking not found.');
  if (!['upcoming', 'in_progress', 'pending'].includes(booking.status)) {
    throw AppError.badRequest('QR code is only available for active bookings.');
  }
  const qrToken = signBookingQrToken(booking.id);
  res.json({ success: true, data: { qrToken, expiresIn: 300 } }); // 300s = 5 min TTL
}));

export default router;
