import { Router } from 'express';
import authRoutes from './auth.routes.js';
import profileRoutes from './profile.routes.js';
import addressRoutes from './address.routes.js';
import categoryRoutes from './category.routes.js';
import professionalRoutes from './professional.routes.js';
import bookingRoutes from './booking.routes.js';
import reviewRoutes from './review.routes.js';
import favoriteRoutes from './favorite.routes.js';
import seedRoutes from './seed.routes.js';
import partnerRoutes from './partner.routes.js';
import adminRoutes from './admin.routes.js';
import notificationRoutes from './notification.routes.js';
import supportTicketRoutes from './supportTicket.routes.js';
import pointsRoutes from './points.routes.js';
import platformPolicyRoutes from './platformPolicy.routes.js';
import offerRoutes from './offer.routes.js';
import reelRoutes from './reel.routes.js';
import paymentRoutes from './payment.routes.js';
import serviceRoutes from './service.routes.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);
router.use('/addresses', addressRoutes);
router.use('/categories', categoryRoutes);
router.use('/professionals', professionalRoutes);
router.use('/bookings', bookingRoutes);
router.use('/reviews', reviewRoutes);
router.use('/favorites', favoriteRoutes);
router.use('/seed', seedRoutes);
router.use('/partner', partnerRoutes);
router.use('/admin', adminRoutes);
router.use('/notifications', notificationRoutes);
router.use('/support-tickets', supportTicketRoutes);
router.use('/points', pointsRoutes);
router.use('/platform-policies', platformPolicyRoutes);
router.use('/offers', offerRoutes);
router.use('/reels', reelRoutes);
router.use('/payments', paymentRoutes);
router.use('/services', serviceRoutes);

export default router;
