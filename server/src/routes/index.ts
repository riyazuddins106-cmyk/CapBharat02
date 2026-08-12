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
import { platformSettings } from '../database/schema/platformSettings.js';
import { eq, inArray } from 'drizzle-orm';

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
      searchDurationMinutes: 10,
       cancellationFeeAfterAcceptancePercent: 20,
       cancellationFeeAfterAcceptanceMinAmount: 50,
       cancellationFeeAfterAcceptanceMaxAmount: 500,
       cancellationFeeAfterCheckinPercent: 20,
       cancellationFeeAfterCheckinMinAmount: 50,
       cancellationFeeAfterCheckinMaxAmount: 500,
    };
    const config = row ? { ...defaults, ...JSON.parse(row.value) } : defaults;
    res.json({ success: true, data: config });
  } catch {
    res.json({ success: true, data: {
      minAdvanceMinutes: 30,
      sameDayBooking: true,
      maxAdvanceDays: 30,
      is24Hours: false,
      openingHour: 8,
      closingHour: 20,
      slotIntervalMinutes: 30,
      searchDurationMinutes: 10,
       cancellationFeeAfterAcceptancePercent: 20,
       cancellationFeeAfterAcceptanceMinAmount: 50,
       cancellationFeeAfterAcceptanceMaxAmount: 500,
       cancellationFeeAfterCheckinPercent: 20,
       cancellationFeeAfterCheckinMinAmount: 50,
       cancellationFeeAfterCheckinMaxAmount: 500,
    } });
  }
});

const EXPO_TUNNEL_KEYS = ['expo_tunnel_customer', 'expo_tunnel_partner'] as const;
const EXPO_TUNNEL_TTL_MS = 15 * 60 * 1000;

router.get('/qr/tunnels', async (_req, res) => {
  try {
    const rows = await db
      .select({
        key: platformSettings.key,
        value: platformSettings.value,
        updatedAt: platformSettings.updatedAt,
      })
      .from(platformSettings)
      .where(inArray(platformSettings.key, [...EXPO_TUNNEL_KEYS]));

    const tunnels: Record<string, { url: string; updatedAt: string } | null> = {
      customer: null,
      partner: null,
    };

    for (const row of rows) {
      const app = row.key === 'expo_tunnel_customer' ? 'customer' : 'partner';
      try {
        const payload = JSON.parse(row.value) as { url?: string };
        const isFresh = Date.now() - row.updatedAt.getTime() <= EXPO_TUNNEL_TTL_MS;
        if (isFresh && payload.url) {
          tunnels[app] = { url: payload.url, updatedAt: row.updatedAt.toISOString() };
        }
      } catch {
        // Ignore malformed or stale tunnel state and keep the public page usable.
      }
    }

    res.set('Cache-Control', 'no-store');
    res.json({ success: true, data: tunnels });
  } catch (error) {
    console.error('[qr] Failed to read tunnel registry:', error);
    res.status(503).json({ success: false, error: 'QR tunnel registry unavailable' });
  }
});

router.post('/qr/tunnels', async (req, res) => {
  const expectedKey = process.env.SESSION_SECRET;
  if (!expectedKey || req.get('x-expo-tunnel-key') !== expectedKey) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const app = req.body?.app;
  const url = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
  if (!['customer', 'partner'].includes(app) || !/^exp[s]?:\/\/[^\s]+$/i.test(url)) {
    return res.status(400).json({ success: false, error: 'Valid app and Expo URL are required' });
  }

  const key = `expo_tunnel_${app}`;
  const value = JSON.stringify({ url });
  try {
    const [existing] = await db
      .select({ key: platformSettings.key })
      .from(platformSettings)
      .where(eq(platformSettings.key, key))
      .limit(1);

    if (existing) {
      await db
        .update(platformSettings)
        .set({ value, updatedAt: new Date() })
        .where(eq(platformSettings.key, key));
    } else {
      await db.insert(platformSettings).values({ key, value });
    }

    res.set('Cache-Control', 'no-store');
    return res.json({ success: true });
  } catch (error) {
    console.error('[qr] Failed to write tunnel registry:', error);
    return res.status(503).json({ success: false, error: 'QR tunnel registry unavailable' });
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
