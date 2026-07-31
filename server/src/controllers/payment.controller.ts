import type { Request, Response } from 'express';
import Razorpay from 'razorpay';
import Stripe from 'stripe';
import crypto from 'crypto';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import { db } from '../config/database.js';
import { payments } from '../database/schema/payments.js';
import { bookings } from '../database/schema/bookings.js';
import { platformSettings } from '../database/schema/platformSettings.js';
import { eq, and } from 'drizzle-orm';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { pointsService } from '../services/points.service.js';
import { notificationService } from '../services/notification.service.js';

/** Award loyalty points for a paid booking — non-fatal, swallowed on error */
async function awardPoints(customerId: string, bookingId: string, priceRupees: number) {
  try {
    await pointsService.earnForBooking(customerId, bookingId, priceRupees);
  } catch (err) {
    logger.warn(`[payments] points award failed for booking ${bookingId}`, err);
  }
}

/** Notify the assigned partner that payment was received (or is pending) — non-fatal.
 *  Pass isPending=true for UPI manual: the money hasn't arrived yet, so the message
 *  should ask them to confirm receipt rather than announce it's been received. */
async function notifyPartner(bookingId: string, amount: number, serviceName: string, isPending = false) {
  try {
    const { professionals } = await import('../database/schema/professionals.js');
    const [bk] = await db.select({ professionalId: bookings.professionalId })
      .from(bookings).where(eq(bookings.id, bookingId)).limit(1);
    if (!bk?.professionalId) return;
    const [pro] = await db.select({ userId: professionals.userId })
      .from(professionals).where(eq(professionals.id, bk.professionalId)).limit(1);
    if (!pro?.userId) return;
    const title = isPending ? 'UPI Payment Pending ⏳' : 'Payment Received 💰';
    const body  = isPending
      ? `₹${amount} submitted via UPI for ${serviceName}. Booking #${bookingId.slice(0, 8).toUpperCase()}. Confirm receipt when you receive it.`
      : `₹${amount} received for ${serviceName}. Booking #${bookingId.slice(0, 8).toUpperCase()}.`;
    const type  = isPending ? 'payment_pending' : 'payment_received';
    void notificationService.sendToUser(pro.userId, title, body, { bookingId, type });
    const { notificationDbService } = await import('../services/notificationDb.service.js');
    void notificationDbService.create({ userId: pro.userId, title, body, type: 'payment', data: { bookingId } });
  } catch (err) {
    logger.warn('[payments] failed to notify partner for booking %s', bookingId, err);
  }
}

/* ── Helpers to load gateway config from DB ─────────────────────────────── */

async function getPaymentCfg() {
  const [row] = await db.select().from(platformSettings).where(eq(platformSettings.key, 'payment_config'));
  return row ? (JSON.parse(row.value) as {
    testMode?: { enabled: boolean };
    cod?:      { enabled: boolean };
    upi?:      { enabled: boolean; vpa: string };
    razorpay?: { enabled: boolean; keyId: string; keySecret: string; webhookSecret: string };
    stripe?:   { enabled: boolean; publishableKey: string; secretKey: string; webhookSecret: string };
  }) : {};
}

function makeRazorpay(cfg: { keyId: string; keySecret: string }) {
  if (!cfg.keyId || !cfg.keySecret) throw AppError.badRequest('Razorpay is not configured. Add Key ID and Secret in Admin → Payment Config.');
  return new Razorpay({ key_id: cfg.keyId, key_secret: cfg.keySecret });
}

function makeStripe(cfg: { secretKey: string }) {
  if (!cfg.secretKey) throw AppError.badRequest('Stripe is not configured. Add Secret Key in Admin → Payment Config.');
  return new Stripe(cfg.secretKey);
}

/* ── GET /api/payments/config  (public) ─────────────────────────────────── */
export const getPaymentConfig = asyncHandler(async (_req: Request, res: Response) => {
  const cfg = await getPaymentCfg();
  const testMode = cfg?.testMode?.enabled ?? false;

  const methods: string[] = [];
  if (testMode) {
    // In test mode expose ALL methods regardless of enabled flags / missing keys
    methods.push('cash', 'upi_manual', 'razorpay', 'stripe');
  } else {
    if (cfg?.cod?.enabled)      methods.push('cash');
    if (cfg?.upi?.enabled)      methods.push('upi_manual');
    if (cfg?.razorpay?.enabled) methods.push('razorpay');
    if (cfg?.stripe?.enabled)   methods.push('stripe');
    if (!methods.length) methods.push('cash');
  }

  sendSuccess(res, {
    testMode,
    methods,
    upiVpa:               testMode ? 'test@upi'  : (cfg?.upi?.enabled  ? (cfg.upi.vpa ?? '')               : null),
    razorpayKeyId:        testMode ? 'test_key'  : (cfg?.razorpay?.enabled ? (cfg.razorpay.keyId ?? '')    : null),
    stripePublishableKey: testMode ? 'test_pk'   : (cfg?.stripe?.enabled   ? (cfg.stripe.publishableKey ?? '') : null),
  });
});

/* ── GET /api/bookings/:id/payment  (customer auth) ─────────────────────── */
export const getPaymentForBooking = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id: bookingId } = req.params;
  const [booking] = await db.select().from(bookings)
    .where(and(eq(bookings.id, bookingId), eq(bookings.customerId, userId))).limit(1);
  if (!booking) throw AppError.notFound('Booking not found.');
  const [payment] = await db.select().from(payments).where(eq(payments.bookingId, bookingId)).limit(1);
  if (!payment) throw AppError.notFound('No payment record found for this booking.');
  sendSuccess(res, payment);
});

/* ── POST /api/bookings/:id/razorpay/create-order  (customer auth) ──────── */
export const createRazorpayOrder = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id: bookingId } = req.params;

  const [booking] = await db.select().from(bookings)
    .where(and(eq(bookings.id, bookingId), eq(bookings.customerId, userId))).limit(1);
  if (!booking) throw AppError.notFound('Booking not found.');
  if (!['completed', 'in_progress'].includes(booking.status))
    throw AppError.badRequest('Payment can only be initiated for in-progress or completed bookings.');

  const [existing] = await db.select().from(payments).where(eq(payments.bookingId, bookingId)).limit(1);
  if (existing?.status === 'paid') throw AppError.badRequest('This booking has already been paid.');

  const cfg = await getPaymentCfg();
  if (!cfg.razorpay?.enabled) throw AppError.badRequest('Razorpay is not enabled.');
  const rz = makeRazorpay(cfg.razorpay);

  const amountPaise = (booking.price ?? 0) * 100; // Razorpay uses paise
  let order: any;
  try {
    order = await rz.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: `booking_${bookingId.slice(0, 20)}`,
    });
  } catch (err: unknown) {
    // Razorpay SDK throws a plain object, not an Error instance
    const rzErr = err as { error?: { description?: string }; message?: string };
    const msg = rzErr?.error?.description ?? rzErr?.message ?? 'Razorpay order creation failed';
    throw AppError.badRequest(msg);
  }

  // Upsert a payment record with status=created
  if (existing) {
    await db.update(payments).set({
      razorpayOrderId: order.id,
      method: 'razorpay',
      status: 'created',
      updatedAt: new Date(),
    }).where(eq(payments.id, existing.id));
  } else {
    await db.insert(payments).values({
      bookingId,
      customerId: userId,
      amount: booking.price ?? 0,
      currency: 'INR',
      status: 'created',
      method: 'razorpay',
      razorpayOrderId: order.id,
    });
  }

  sendSuccess(res, {
    orderId:   order.id,
    amount:    amountPaise,
    currency:  'INR',
    keyId:     cfg.razorpay.keyId,
    bookingId,
    businessName: 'ServeNow',
  });
});

/* ── GET /api/payments/razorpay/checkout  (public, query-param auth) ─────
   Returns an HTML page that loads Razorpay checkout.js so mobile WebView
   can show the native-like payment sheet without requiring a native SDK.   */
export const serveRazorpayCheckout = asyncHandler(async (req: Request, res: Response) => {
  const { orderId, amount, keyId, bookingId, name, description } = req.query as Record<string, string>;
  if (!orderId || !amount || !keyId || !bookingId) throw AppError.badRequest('Missing required params');

  const callbackUrl = `${req.protocol}://${req.get('host')}/api/payments/razorpay/callback`;
  const cancelUrl   = 'servenow://payment-cancel';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>ServeNow Payment</title>
  <style>
    body { margin:0; background:#1a1a2e; display:flex; align-items:center; justify-content:center; height:100vh; font-family:sans-serif; }
    .card { background:#fff; border-radius:16px; padding:32px 24px; max-width:360px; width:90%; text-align:center; box-shadow:0 8px 32px rgba(0,0,0,.3); }
    .logo { font-size:22px; font-weight:800; color:#5B3EF5; margin-bottom:4px; }
    .amt  { font-size:36px; font-weight:800; color:#111; margin:12px 0; }
    .desc { color:#666; font-size:14px; margin-bottom:24px; }
    .btn  { background:#5B3EF5; color:#fff; border:none; border-radius:10px; padding:14px 32px; font-size:16px; font-weight:700; cursor:pointer; width:100%; }
    .btn:active { opacity:.8; }
    .cancel { display:block; margin-top:14px; color:#999; font-size:13px; text-decoration:none; }
    .spinner { display:none; margin:16px auto; border:3px solid #eee; border-top:3px solid #5B3EF5; border-radius:50%; width:28px; height:28px; animation:spin 0.8s linear infinite; }
    @keyframes spin { to { transform:rotate(360deg); } }
  </style>
</head>
<body>
<div class="card">
  <div class="logo">ServeNow</div>
  <div class="amt">₹${Math.round(parseInt(amount) / 100)}</div>
  <div class="desc">${description || 'Service Payment'}</div>
  <button class="btn" id="payBtn" onclick="startPayment()">Pay with Razorpay</button>
  <a class="cancel" href="${cancelUrl}">Cancel</a>
  <div class="spinner" id="spinner"></div>
</div>
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
<script>
function startPayment() {
  document.getElementById('payBtn').style.display='none';
  document.getElementById('spinner').style.display='block';
  var options = {
    key: '${keyId}',
    amount: '${amount}',
    currency: 'INR',
    order_id: '${orderId}',
    name: '${name || 'ServeNow'}',
    description: '${description || 'Service Payment'}',
    theme: { color: '#5B3EF5' },
    handler: function(response) {
      // POST payment details to server for signature verification
      var form = document.createElement('form');
      form.method = 'POST';
      form.action = '${callbackUrl}';
      [
        ['razorpay_payment_id', response.razorpay_payment_id],
        ['razorpay_order_id',   response.razorpay_order_id],
        ['razorpay_signature',  response.razorpay_signature],
        ['booking_id',          '${bookingId}'],
      ].forEach(function(p) {
        var i = document.createElement('input');
        i.type='hidden'; i.name=p[0]; i.value=p[1]; form.appendChild(i);
      });
      document.body.appendChild(form);
      form.submit();
    },
    modal: {
      ondismiss: function() {
        document.getElementById('payBtn').style.display='block';
        document.getElementById('spinner').style.display='none';
        window.location.href = '${cancelUrl}';
      }
    }
  };
  var rzp = new Razorpay(options);
  rzp.open();
}
window.onload = startPayment;
</script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

/* ── POST /api/payments/razorpay/callback  (public, called by Razorpay) ── */
export const razorpayCallback = asyncHandler(async (req: Request, res: Response) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature, booking_id } = req.body as Record<string, string>;

  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !booking_id) {
    throw AppError.badRequest('Missing payment fields.');
  }

  // Verify signature
  const cfg = await getPaymentCfg();
  if (!cfg.razorpay?.keySecret) throw AppError.internal('Razorpay not configured.');
  const expectedSig = crypto
    .createHmac('sha256', cfg.razorpay.keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expectedSig !== razorpay_signature) {
    logger.warn('[razorpay] Signature mismatch for booking %s', booking_id);
    throw AppError.badRequest('Payment verification failed. Signature mismatch.');
  }

  // Cross-check: the payment row for this order must belong to this booking.
  // Signature proves the Razorpay order + payment IDs are genuine, but not which booking_id
  // was submitted in the form — an attacker with a valid signature for order X could submit
  // a different booking_id. Look up by order ID to verify ownership.
  const [existingByOrder] = await db.select().from(payments)
    .where(eq(payments.razorpayOrderId, razorpay_order_id)).limit(1);
  if (existingByOrder && existingByOrder.bookingId !== booking_id) {
    logger.warn('[razorpay] booking_id mismatch: form=%s db=%s', booking_id, existingByOrder.bookingId);
    throw AppError.badRequest('Payment verification failed. Booking ID mismatch.');
  }

  // Mark payment as paid
  const [existing] = await db.select().from(payments).where(eq(payments.bookingId, booking_id)).limit(1);
  if (existing) {
    await db.update(payments).set({
      status: 'paid',
      method: 'razorpay',
      razorpayPaymentId: razorpay_payment_id,
      razorpayOrderId:   razorpay_order_id,
      razorpaySignature: razorpay_signature,
      updatedAt: new Date(),
    }).where(eq(payments.id, existing.id));
  } else {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, booking_id)).limit(1);
    await db.insert(payments).values({
      bookingId:         booking_id,
      customerId:        booking?.customerId ?? '',
      amount:            booking?.price ?? 0,
      currency:          'INR',
      status:            'paid',
      method:            'razorpay',
      razorpayPaymentId: razorpay_payment_id,
      razorpayOrderId:   razorpay_order_id,
      razorpaySignature: razorpay_signature,
    });
  }

  logger.info('[razorpay] Payment verified and recorded for booking %s', booking_id);

  // Award loyalty points (idempotent, non-fatal)
  const [bk] = await db.select().from(bookings).where(eq(bookings.id, booking_id)).limit(1);
  if (bk) {
    void awardPoints(bk.customerId, booking_id, bk.price ?? 0);
    void notifyPartner(booking_id, bk.price ?? 0, bk.serviceName ?? 'service');
  }

  // Redirect to deep link so mobile WebView can detect success
  res.redirect(302, `servenow://payment-success?bookingId=${booking_id}&paymentId=${razorpay_payment_id}&gateway=razorpay`);
});

/* ── POST /api/payments/razorpay/webhook  (Razorpay webhook) ─────────────
   Handles async events like payment.captured, refund.processed etc.
   Set this URL in Razorpay dashboard: https://yourdomain/api/payments/razorpay/webhook  */
export const razorpayWebhook = asyncHandler(async (req: Request, res: Response) => {
  const cfg = await getPaymentCfg();
  const secret = cfg.razorpay?.webhookSecret;

  // Reject all webhook calls when the secret is not configured.
  // Silently skipping verification would allow anyone to spoof payment events.
  if (!secret) {
    return res.status(400).json({
      success: false,
      error: 'Webhook secret not configured. Set it in Payment Config before enabling the webhook.',
    });
  }

  const sig = req.headers['x-razorpay-signature'] as string;
  const body = (req as any).rawBody as Buffer | string | undefined;
  if (!body) {
    return res.status(400).json({ success: false, error: 'Missing request body for signature verification' });
  }
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  if (sig !== expected) {
    return res.status(400).json({ success: false, error: 'Invalid webhook signature' });
  }

  const event = req.body as { event: string; payload?: { payment?: { entity?: { order_id?: string; id?: string } } } };
  logger.info('[razorpay-webhook] event=%s', event.event);

  if (event.event === 'payment.captured') {
    const paymentId = event.payload?.payment?.entity?.id;
    const orderId   = event.payload?.payment?.entity?.order_id;
    if (paymentId && orderId) {
      // Idempotency guard: skip if already marked paid to prevent double side-effects
      const [existing] = await db.select({ id: payments.id, status: payments.status, bookingId: payments.bookingId, customerId: payments.customerId })
        .from(payments).where(eq(payments.razorpayOrderId, orderId)).limit(1);
      if (existing?.status !== 'paid') {
        await db.update(payments)
          .set({ status: 'paid', razorpayPaymentId: paymentId, updatedAt: new Date() })
          .where(eq(payments.razorpayOrderId, orderId));
        // Award points + notify partner (idempotent — points service deduplicates by bookingId)
        if (existing?.bookingId) {
          const [bk] = await db.select().from(bookings).where(eq(bookings.id, existing.bookingId)).limit(1);
          if (bk) {
            void awardPoints(bk.customerId, existing.bookingId, bk.price ?? 0);
            void notifyPartner(existing.bookingId, bk.price ?? 0, bk.serviceName ?? 'service');
          }
        }
      }
    }
  }

  res.json({ success: true });
});

/* ── POST /api/bookings/:id/stripe/create-session  (customer auth) ───────── */
export const createStripeSession = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id: bookingId } = req.params;

  const [booking] = await db.select().from(bookings)
    .where(and(eq(bookings.id, bookingId), eq(bookings.customerId, userId))).limit(1);
  if (!booking) throw AppError.notFound('Booking not found.');
  if (!['completed', 'in_progress'].includes(booking.status))
    throw AppError.badRequest('Payment can only be initiated for in-progress or completed bookings.');

  const [existing] = await db.select().from(payments).where(eq(payments.bookingId, bookingId)).limit(1);
  if (existing?.status === 'paid') throw AppError.badRequest('This booking has already been paid.');

  const cfg = await getPaymentCfg();
  if (!cfg.stripe?.enabled) throw AppError.badRequest('Stripe is not enabled.');
  const stripe = makeStripe(cfg.stripe);

  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency:     'inr',
        unit_amount:  (booking.price ?? 0) * 100,
        product_data: {
          name:        booking.serviceName ?? 'Service',
          description: `Booking #${bookingId.slice(0, 8).toUpperCase()}`,
        },
      },
      quantity: 1,
    }],
    mode:        'payment',
    success_url: `${baseUrl}/api/payments/stripe/success?session_id={CHECKOUT_SESSION_ID}&booking_id=${bookingId}`,
    cancel_url:  'servenow://payment-cancel',
    metadata:    { bookingId, userId },
  });

  // Save session id
  if (existing) {
    await db.update(payments).set({
      stripeSessionId: session.id, method: 'stripe', status: 'created', updatedAt: new Date(),
    }).where(eq(payments.id, existing.id));
  } else {
    await db.insert(payments).values({
      bookingId, customerId: userId, amount: booking.price ?? 0, currency: 'INR',
      status: 'created', method: 'stripe', stripeSessionId: session.id,
    });
  }

  sendSuccess(res, { checkoutUrl: session.url, sessionId: session.id });
});

/* ── GET /api/payments/stripe/success  (Stripe redirects here after payment) */
export const stripeSuccess = asyncHandler(async (req: Request, res: Response) => {
  const { session_id, booking_id } = req.query as Record<string, string>;
  if (!session_id || !booking_id) throw AppError.badRequest('Missing params.');

  const cfg = await getPaymentCfg();
  if (!cfg.stripe?.secretKey) throw AppError.internal('Stripe not configured.');
  const stripe = makeStripe(cfg.stripe);

  const session = await stripe.checkout.sessions.retrieve(session_id);
  if (session.payment_status !== 'paid') {
    return res.redirect(302, 'servenow://payment-cancel');
  }

  // Cross-check: session MUST carry metadata.bookingId and it MUST match the query param.
  // Using || means: reject if metadata is missing OR if it doesn't match — prevents spoofing
  // via a session created without metadata or for a different booking.
  if (!session.metadata?.bookingId || session.metadata.bookingId !== booking_id) {
    logger.warn('[stripe] booking_id mismatch or missing metadata: query=%s session=%s', booking_id, session.metadata?.bookingId);
    return res.redirect(302, 'servenow://payment-cancel');
  }

  const [existing] = await db.select().from(payments).where(eq(payments.bookingId, booking_id)).limit(1);
  if (existing && existing.status !== 'paid') {
    await db.update(payments).set({
      status:                'paid',
      method:                'stripe',
      stripeSessionId:       session.id,
      stripePaymentIntentId: session.payment_intent as string,
      updatedAt:             new Date(),
    }).where(eq(payments.id, existing.id));

    // Award points and notify partner only on the first confirmation — not on duplicate visits
    const [sbk] = await db.select().from(bookings).where(eq(bookings.id, booking_id)).limit(1);
    if (sbk) {
      void awardPoints(sbk.customerId, booking_id, sbk.price ?? 0);
      void notifyPartner(booking_id, sbk.price ?? 0, sbk.serviceName ?? 'service');
    }
  }

  logger.info('[stripe] Payment verified for booking %s', booking_id);

  res.redirect(302, `servenow://payment-success?bookingId=${booking_id}&gateway=stripe`);
});

/* ── POST /api/payments/stripe/webhook  (Stripe webhook) ─────────────────
   Set this URL in Stripe dashboard: https://yourdomain/api/payments/stripe/webhook */
export const stripeWebhook = asyncHandler(async (req: Request, res: Response) => {
  const cfg = await getPaymentCfg();
  const secret = cfg.stripe?.webhookSecret;

  // Reject all webhook calls when the secret is not configured.
  // Silently skipping verification would allow anyone to spoof Stripe events.
  if (!secret) {
    return res.status(400).json({
      success: false,
      error: 'Stripe webhook secret not configured. Set it in Admin → Payment Config before enabling the webhook.',
    });
  }

  let event: Stripe.Event;
  const sig = req.headers['stripe-signature'] as string;
  const rawBody = (req as any).rawBody as Buffer;
  try {
    const stripe = makeStripe(cfg.stripe!);
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch {
    return res.status(400).json({ success: false, error: 'Webhook signature verification failed' });
  }

  logger.info('[stripe-webhook] type=%s', event.type);

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const bookingId = session.metadata?.bookingId;
    if (bookingId && UUID_RE.test(bookingId) && session.payment_status === 'paid') {
      const [existing] = await db.select().from(payments).where(eq(payments.bookingId, bookingId)).limit(1);
      if (existing && existing.status !== 'paid') {
        await db.update(payments).set({
          status:                'paid',
          stripeSessionId:       session.id,
          stripePaymentIntentId: session.payment_intent as string,
          updatedAt:             new Date(),
        }).where(eq(payments.id, existing.id));

        // Award loyalty points + notify partner (mirrors stripeSuccess side-effects)
        const [bk] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
        if (bk) {
          void awardPoints(bk.customerId, bookingId, bk.price ?? 0);
          void notifyPartner(bookingId, bk.price ?? 0, bk.serviceName ?? 'service');
        }
      }
    }
  }

  res.json({ received: true });
});

/* ── POST /api/bookings/:id/payment  (customer auth — cash & UPI only) ─────
   Razorpay and Stripe go through their own create-order / create-session
   flows and are verified server-side. This endpoint handles cash and UPI.   */
export const submitPayment = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id: bookingId } = req.params;
  const { method, notes } = req.body as { method: 'cash' | 'upi_manual'; notes?: string };

  if (!method) throw AppError.badRequest('Payment method is required.');
  if (!['cash', 'upi_manual'].includes(method))
    throw AppError.badRequest('Use the gateway-specific endpoints for Razorpay or Stripe payments.');

  const [booking] = await db.select().from(bookings)
    .where(and(eq(bookings.id, bookingId), eq(bookings.customerId, userId))).limit(1);
  if (!booking) throw AppError.notFound('Booking not found.');
  if (!['completed', 'in_progress'].includes(booking.status))
    throw AppError.badRequest('Payment can only be submitted for in-progress or completed bookings.');

  const [existing] = await db.select().from(payments).where(eq(payments.bookingId, bookingId)).limit(1);
  if (existing?.status === 'paid') throw AppError.badRequest('This booking has already been paid.');

  // Cash is confirmed immediately; UPI manual requires partner confirmation → pending
  const newStatus = method === 'cash' ? 'paid' : 'created';

  let paymentRecord;
  if (existing) {
    const [updated] = await db.update(payments).set({
      method: method as any, status: newStatus, notes: notes ?? null, updatedAt: new Date(),
    }).where(eq(payments.id, existing.id)).returning();
    paymentRecord = updated;
  } else {
    const [created] = await db.insert(payments).values({
      bookingId, customerId: userId, amount: booking.price ?? 0,
      currency: 'INR', status: newStatus, method: method as any, notes: notes ?? null,
    }).returning();
    paymentRecord = created;
  }

  if (method === 'cash') {
    // Award loyalty points immediately for cash payments
    void awardPoints(userId, bookingId, booking.price ?? 0);
    void notifyPartner(bookingId, booking.price ?? 0, booking.serviceName ?? 'service');
    void notificationService.sendToUser(
      userId,
      'Payment Recorded ✅',
      `Your cash payment of ₹${booking.price} for ${booking.serviceName} has been confirmed.`,
    );
  } else {
    // UPI: notify customer it's pending partner confirmation
    void notificationService.sendToUser(
      userId,
      'UPI Payment Submitted ⏳',
      `Your UPI payment of ₹${booking.price} for ${booking.serviceName} is awaiting confirmation from the partner.`,
    );
    // Notify partner that a UPI transfer is pending their confirmation (not yet received)
    void notifyPartner(bookingId, booking.price ?? 0, booking.serviceName ?? 'service', true);
  }

  sendSuccess(res, paymentRecord, 200);
});

/* ── POST /api/bookings/:id/test-pay  (customer auth — test mode only) ──────
   Immediately marks a booking as paid without calling any real gateway.
   Only works when testMode is enabled in payment_config.               */
export const testPay = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id: bookingId } = req.params;
  const { method = 'razorpay' } = req.body as { method?: string };

  const cfg = await getPaymentCfg();
  if (!cfg.testMode?.enabled) throw AppError.badRequest('Test mode is not enabled. Enable it in Admin → Payment Config.');

  const [booking] = await db.select().from(bookings)
    .where(and(eq(bookings.id, bookingId), eq(bookings.customerId, userId))).limit(1);
  if (!booking) throw AppError.notFound('Booking not found.');

  const [existing] = await db.select().from(payments).where(eq(payments.bookingId, bookingId)).limit(1);
  if (existing?.status === 'paid') throw AppError.badRequest('This booking has already been paid.');

  const fakeRef = `test_${Date.now()}`;
  let paymentRecord;
  if (existing) {
    const [updated] = await db.update(payments).set({
      method: method as any, status: 'paid',
      notes: '[TEST MODE] Simulated payment — no real transaction',
      razorpayOrderId: method === 'razorpay' ? fakeRef : undefined,
      stripeSessionId: method === 'stripe'   ? fakeRef : undefined,
      updatedAt: new Date(),
    }).where(eq(payments.id, existing.id)).returning();
    paymentRecord = updated;
  } else {
    const [created] = await db.insert(payments).values({
      bookingId, customerId: userId, amount: booking.price ?? 0, currency: 'INR',
      status: 'paid', method: method as any,
      notes: '[TEST MODE] Simulated payment — no real transaction',
      razorpayOrderId: method === 'razorpay' ? fakeRef : undefined,
      stripeSessionId: method === 'stripe'   ? fakeRef : undefined,
    }).returning();
    paymentRecord = created;
  }

  void awardPoints(userId, bookingId, booking.price ?? 0);
  void notifyPartner(bookingId, booking.price ?? 0, booking.serviceName ?? 'service');
  logger.info('[test-pay] Simulated %s payment for booking %s', method, bookingId);
  sendSuccess(res, paymentRecord, 200);
});

/* ── POST /api/bookings/:id/razorpay/verify  (customer auth — web client) ──
   Called by React web app after Razorpay checkout.js succeeds in-browser.
   Verifies HMAC signature server-side and marks the payment as paid.        */
export const verifyRazorpayWeb = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id: bookingId } = req.params;
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } =
    req.body as Record<string, string>;

  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature)
    throw AppError.badRequest('Missing payment verification fields.');

  const cfg = await getPaymentCfg();
  if (!cfg.razorpay?.keySecret) throw AppError.internal('Razorpay not configured.');

  const expectedSig = crypto
    .createHmac('sha256', cfg.razorpay.keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expectedSig !== razorpay_signature)
    throw AppError.badRequest('Payment verification failed. Signature mismatch.');

  const [booking] = await db.select().from(bookings)
    .where(and(eq(bookings.id, bookingId), eq(bookings.customerId, userId))).limit(1);
  if (!booking) throw AppError.notFound('Booking not found.');

  const [existing] = await db.select().from(payments).where(eq(payments.bookingId, bookingId)).limit(1);
  let paymentRecord;
  if (existing) {
    const [updated] = await db.update(payments).set({
      status: 'paid', method: 'razorpay',
      razorpayPaymentId: razorpay_payment_id,
      razorpayOrderId:   razorpay_order_id,
      razorpaySignature: razorpay_signature,
      updatedAt: new Date(),
    }).where(eq(payments.id, existing.id)).returning();
    paymentRecord = updated;
  } else {
    const [created] = await db.insert(payments).values({
      bookingId, customerId: userId,
      amount: booking.price ?? 0, currency: 'INR',
      status: 'paid', method: 'razorpay',
      razorpayPaymentId: razorpay_payment_id,
      razorpayOrderId:   razorpay_order_id,
      razorpaySignature: razorpay_signature,
    }).returning();
    paymentRecord = created;
  }

  void awardPoints(userId, bookingId, booking.price ?? 0);
  void notificationService.sendToUser(
    userId,
    'Payment Confirmed ✅',
    `Your Razorpay payment of ₹${booking.price} for ${booking.serviceName} has been recorded.`,
  );
  void notifyPartner(bookingId, booking.price ?? 0, booking.serviceName ?? 'service');

  sendSuccess(res, paymentRecord, 200);
});
