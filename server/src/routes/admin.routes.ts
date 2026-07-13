import { Router } from 'express';
import { adminController } from '../controllers/admin.controller.js';
import { platformPolicyController } from '../controllers/platformPolicy.controller.js';
import { offerController } from '../controllers/offer.controller.js';
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

// Audit log
router.get('/audit-logs',             adminController.listAuditLogs);

// Payouts
router.get('/payouts',                adminController.listPayoutRequests);
router.patch('/payouts/:id',          adminController.resolvePayoutRequest);

// Platform Policies (admin CRUD)
router.get('/platform-policies',          platformPolicyController.adminList);
router.post('/platform-policies',         platformPolicyController.adminCreate);
router.put('/platform-policies/:slug',    platformPolicyController.adminUpdate);
router.delete('/platform-policies/:slug', platformPolicyController.adminDelete);

// Offers / Banners (admin CRUD)
router.get('/offers',         offerController.adminList);
router.post('/offers',        offerController.adminCreate);
router.patch('/offers/:id',   offerController.adminUpdate);
router.delete('/offers/:id',  offerController.adminDelete);

export default router;
