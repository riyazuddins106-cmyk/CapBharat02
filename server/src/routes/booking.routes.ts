import { Router } from 'express';
import { bookingController } from '../controllers/booking.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { createBookingSchema, bookingIdParamSchema, rescheduleBookingSchema } from '../validators/booking.validators.js';

const router = Router();

router.use(authenticate);

router.get('/', bookingController.list);
router.post('/', validate({ body: createBookingSchema }), bookingController.create);
router.get('/:id', validate({ params: bookingIdParamSchema }), bookingController.getById);
router.patch('/:id/cancel', validate({ params: bookingIdParamSchema }), bookingController.cancel);
router.patch('/:id/reschedule', validate({ params: bookingIdParamSchema, body: rescheduleBookingSchema }), bookingController.reschedule);

export default router;
