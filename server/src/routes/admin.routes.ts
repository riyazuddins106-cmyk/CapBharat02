import { Router } from 'express';
import { adminController } from '../controllers/admin.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();

router.use(authenticate, requireRole('admin'));

// Dashboard stats
router.get('/stats', adminController.getStats);

// Bookings management
router.get('/bookings',                  adminController.listBookings);
router.patch('/bookings/:id',            adminController.updateBooking);
router.patch('/bookings/:id/cancel',     adminController.cancelBooking);
router.delete('/bookings/:id',           adminController.deleteBooking);

// Professionals management
router.get('/professionals',                    adminController.listProfessionals);
router.patch('/professionals/:id',              adminController.updateProfessional);
router.patch('/professionals/:id/suspend',      adminController.suspendProfessional);
router.patch('/professionals/:id/activate',     adminController.activateProfessional);
router.delete('/professionals/:id',             adminController.deleteProfessional);

// Users / Customers
router.get('/users',                  adminController.listUsers);
router.patch('/users/:id',            adminController.updateUser);
router.delete('/users/:id',           adminController.deleteUser);
router.patch('/users/:id/suspend',    adminController.suspendUser);
router.patch('/users/:id/activate',   adminController.activateUser);

// Service categories
router.get('/categories',             adminController.listCategories);
router.post('/categories',            adminController.createCategory);
router.patch('/categories/:id',       adminController.updateCategory);
router.delete('/categories/:id',      adminController.deleteCategory);

// Reviews (moderation)
router.get('/reviews',                adminController.listReviews);
router.delete('/reviews/:id',         adminController.deleteReview);

export default router;
