import { Router } from 'express';
import authRoutes from './auth.routes.js';
import profileRoutes from './profile.routes.js';
import addressRoutes from './address.routes.js';
import categoryRoutes from './category.routes.js';
import bookingRoutes from './booking.routes.js';
import reviewRoutes from './review.routes.js';
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
import cartRoutes from './cart.routes.js';
import dispatchRoutes from './dispatch.routes.js';
import serviceWishlistRoutes from './serviceWishlist.routes.js';
import ordersRoutes from './orders.routes.js';
import { db } from '../config/database.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

// ── Public booking config (no auth required) ──────────────────────────────────
router.get('/booking-config', async (_req, res) => {
  try {
    const { platformSettings } = await import('../database/schema/index.js');
    const { eq } = await import('drizzle-orm');
    const [row] = await db.select().from(platformSettings).where(eq(platformSettings.key, 'booking_config'));
    const defaults = {
      minAdvanceMinutes: 30,
      sameDayBooking: true,
      maxAdvanceDays: 30,
      is24Hours: false,
      openingHour: 8,
      closingHour: 20,
      slotIntervalMinutes: 30,
    };
    const config = row ? { ...defaults, ...JSON.parse(row.value) } : defaults;
    res.json({ success: true, data: config });
  } catch {
    res.json({ success: true, data: { minAdvanceMinutes: 30, sameDayBooking: true, maxAdvanceDays: 30, is24Hours: false, openingHour: 8, closingHour: 20, slotIntervalMinutes: 30 } });
  }
});

router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);
router.use('/addresses', addressRoutes);
router.use('/categories', categoryRoutes);
router.use('/bookings', bookingRoutes);
router.use('/reviews', reviewRoutes);
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
router.use('/cart', cartRoutes);
router.use('/operations/dispatch', dispatchRoutes);
router.use('/service-wishlist', serviceWishlistRoutes);
router.use('/orders', ordersRoutes);

export default router;
