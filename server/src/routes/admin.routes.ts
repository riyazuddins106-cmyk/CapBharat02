import { Router } from 'express';
import { adminController } from '../controllers/admin.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();

router.use(authenticate, requireRole('admin'));

// Dashboard stats
router.get('/stats', adminController.getStats);

// Bookings management
router.get('/bookings', adminController.listBookings);
router.patch('/bookings/:id/cancel', adminController.cancelBooking);

// Professionals management
router.get('/professionals', adminController.listProfessionals);
router.patch('/professionals/:id/suspend', adminController.suspendProfessional);
router.patch('/professionals/:id/activate', adminController.activateProfessional);

// Users/customers
router.get('/users', adminController.listUsers);

export default router;
