import { Router } from 'express';
import multer from 'multer';
import { adminController } from '../controllers/admin.controller.js';
import { platformPolicyController } from '../controllers/platformPolicy.controller.js';
import { offerController } from '../controllers/offer.controller.js';
import { subCategoryController } from '../controllers/subCategory.controller.js';
import { reelController } from '../controllers/reel.controller.js';
import { getSettings, upsertSettings, testEmail } from '../controllers/platformSettings.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import { serviceController } from '../controllers/service.controller.js';
import { documentController } from '../controllers/document.controller.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

const router = Router();

router.use(authenticate, requireRole('admin', 'operations_manager'));

const adminOnly = requireRole('admin');

// Dashboard stats
router.get('/stats', adminController.getStats);
router.patch('/me', adminController.updateOwnAdminProfile);

// Analytics timeseries
router.get('/analytics/timeseries', adminController.getAnalyticsTimeseries);

// Bookings management
router.get('/bookings',                        adminController.listBookings);
router.get('/bookings/:id',                    adminController.getBooking);
router.get('/orders',                          adminController.listOrders);
router.get('/orders/:orderId',                 adminController.getOrder);
router.patch('/orders/:orderId/items/:itemId/dispatch', adminController.continueOrderItemDispatch);
router.patch('/orders/:orderId/items/:itemId/refund',   adminController.refundOrderItem);
router.patch('/bookings/:id',                  adminController.updateBooking);
router.patch('/bookings/:id/cancel',           adminController.cancelBooking);
router.delete('/bookings/:id',                 adminOnly, adminController.deleteBooking);

// Payment confirmation (admin manually confirms/rejects cash or UPI payments)
router.patch('/payments/:id/confirm',          adminController.confirmPayment);

// Professionals management
router.post('/professionals',                   adminOnly, adminController.createProfessional);
router.get('/professionals',                    adminController.listProfessionals);
router.get('/professionals/:id/detail',         adminController.getProfessionalDetail);
router.patch('/professionals/:id',              adminOnly, adminController.updateProfessional);
router.patch('/professionals/:id/suspend',      adminController.suspendProfessional);
router.patch('/professionals/:id/activate',     adminController.activateProfessional);
router.delete('/professionals/:id',             adminOnly, adminController.deleteProfessional);
router.post('/professionals/:id/avatar',        adminOnly, upload.single('avatar'), adminController.uploadProfessionalAvatar);

// Users / Customers
router.get('/admins',                  adminOnly, adminController.listAdmins);
router.post('/admins',                 adminOnly, adminController.createAdmin);
router.patch('/admins/:id',             adminOnly, adminController.updateAdmin);
router.get('/users',                  adminController.listUsers);
router.get('/users/:id/detail',        adminController.getCustomerDetail);
router.patch('/users/:id',            adminController.updateUser);
router.delete('/users/:id',           adminOnly, adminController.deleteUser);
router.patch('/users/:id/suspend',    adminController.suspendUser);
router.patch('/users/:id/activate',   adminController.activateUser);

// Service categories
router.get('/categories',                           adminController.listCategories);
router.post('/categories',                          adminOnly, adminController.createCategory);
router.patch('/categories/:id',                     adminOnly, adminController.updateCategory);
router.delete('/categories/:id',                    adminOnly, adminController.deleteCategory);
router.post('/categories/:id/image',                adminOnly, upload.single('image'), adminController.uploadCategoryImage);

// Sub-categories
router.get('/categories/:categoryId/subcategories',  subCategoryController.list);
router.post('/categories/:categoryId/subcategories', adminOnly, subCategoryController.create);
router.patch('/subcategories/:id',                   adminOnly, subCategoryController.update);
router.delete('/subcategories/:id',                  adminOnly, subCategoryController.delete);
router.patch('/subcategories/:id/restore',           adminOnly, subCategoryController.restore);
router.post('/subcategories/:id/image',              adminOnly, upload.single('image'), subCategoryController.uploadImage);

// Reels
router.get('/reels/detect-platform',   reelController.detectPlatformEndpoint);
router.get('/reels',                   reelController.adminList);
router.get('/reels/deleted',           reelController.adminListDeleted);
router.post('/reels',                  adminOnly, reelController.adminCreate);
router.patch('/reels/:id',             adminOnly, reelController.adminUpdate);
router.delete('/reels/:id',            adminOnly, reelController.adminDelete);
router.patch('/reels/:id/restore',     adminOnly, reelController.adminRestore);
router.post('/reels/:id/thumbnail',    adminOnly, upload.single('image'), reelController.uploadThumbnail);
router.post('/reels/:id/video',        adminOnly, upload.single('video'),  reelController.uploadVideo);

// Reviews (moderation)
router.get('/reviews',                adminController.listReviews);
router.delete('/reviews/:id',         adminOnly, adminController.deleteReview);
router.patch('/reviews/:id/restore',  adminOnly, adminController.restoreReview);

// Audit log
router.get('/audit-logs',             adminOnly, adminController.listAuditLogs);

// Payouts
router.get('/payouts',                adminController.listPayoutRequests);
router.get('/payouts/partners',       adminController.listPayoutPartners);
router.get('/payouts/partners/:id',   adminController.getPayoutPartnerDetail);
router.get('/payout-runs',            adminController.listPayoutRuns);
router.post('/payout-runs/run',       adminOnly, adminController.runPayoutsNow);
router.patch('/payouts/:id',           adminOnly, adminController.resolvePayoutRequest);

// Platform Policies (admin CRUD)
router.get('/platform-policies',                   adminOnly, platformPolicyController.adminList);
router.post('/platform-policies',                  adminOnly, platformPolicyController.adminCreate);
router.put('/platform-policies/:slug',             adminOnly, platformPolicyController.adminUpdate);
router.delete('/platform-policies/:slug',          adminOnly, platformPolicyController.adminDelete);
router.patch('/platform-policies/:slug/restore',   adminOnly, platformPolicyController.adminRestore);

// Offers / Banners (admin CRUD)
router.post('/offers/image',           adminOnly, upload.single('image'), offerController.uploadImage);
router.get('/offers',                  offerController.adminList);
router.get('/offers/deleted',          adminOnly, offerController.adminListDeleted);
router.post('/offers',                 adminOnly, offerController.adminCreate);
router.patch('/offers/:id',             adminOnly, offerController.adminUpdate);
router.delete('/offers/:id',            adminOnly, offerController.adminDelete);
router.patch('/offers/:id/restore',     adminOnly, offerController.adminRestore);

// Services (admin-owned service catalogue)
router.get('/services',      serviceController.adminList);
router.post('/services',     adminOnly, serviceController.adminCreate);
router.patch('/services/:id', adminOnly, serviceController.adminUpdate);
router.delete('/services/:id', adminOnly, serviceController.adminDelete);

// Platform Settings (payment config, email config)
router.get('/settings/:key',        adminOnly, getSettings);
router.put('/settings/:key',        adminOnly, upsertSettings);
router.post('/settings/email/test', adminOnly, testEmail);

// Partner document overview (one row per partner)
router.get('/partners/documents',                    documentController.adminListPartners);
router.get('/partners/:partnerId/documents',          documentController.adminGetPartnerDocuments);

// Document review queue
router.get('/documents/review-queue',               adminOnly, documentController.adminGetReviewQueue);

// Per-document actions (keep existing routes for backward compat + add /review alias)
router.get('/documents',                    adminOnly, documentController.adminListDocuments);
router.get('/documents/:id/history',         adminOnly, documentController.adminGetDocumentHistory);
router.patch('/documents/:id/status',        adminOnly, documentController.adminUpdateStatus);
router.patch('/documents/:id/review',        adminOnly, documentController.adminReviewDocument);

// Document type configuration (admin)
router.get('/document-types',               adminOnly, documentController.adminListDocumentTypes);
router.post('/document-types',              adminOnly, documentController.adminCreateDocumentType);
router.patch('/document-types/:id',         adminOnly, documentController.adminUpdateDocumentType);
router.delete('/document-types/:id',        adminOnly, documentController.adminDeleteDocumentType);

export default router;
