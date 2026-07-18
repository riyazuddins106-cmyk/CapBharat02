import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import { db } from '../config/database.js';
import { payments } from '../database/schema/payments.js';
import { bookings } from '../database/schema/bookings.js';
import { platformSettings } from '../database/schema/platformSettings.js';
import { eq, and } from 'drizzle-orm';
import { AppError } from '../utils/AppError.js';

/* ── GET /api/payments/config  (no auth) ───────────────────────────────────
   Returns the enabled payment methods so the customer UI can render options  */
export const getPaymentConfig = asyncHandler(async (_req: Request, res: Response) => {
  const [row] = await db.select().from(platformSettings).where(eq(platformSettings.key, 'payment_config'));
  const cfg = row ? JSON.parse(row.value) : {};
  const methods: string[] = [];
  if (cfg?.cod?.enabled)      methods.push('cash');
  if (cfg?.upi?.enabled)      methods.push('upi_manual');
  if (cfg?.razorpay?.enabled) methods.push('razorpay');
  // If nothing configured yet, default to COD only
  if (!methods.length) methods.push('cash');

  sendSuccess(res, {
    methods,
    upiVpa:        cfg?.upi?.enabled    ? (cfg.upi.vpa ?? '')          : null,
    razorpayKeyId: cfg?.razorpay?.enabled ? (cfg.razorpay.keyId ?? '') : null,
  });
});

/* ── GET /api/bookings/:id/payment  (customer auth) ────────────────────────
   Returns the payment record for this booking (if it exists)               */
export const getPaymentForBooking = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id: bookingId } = req.params;

  const [booking] = await db.select().from(bookings)
    .where(and(eq(bookings.id, bookingId), eq(bookings.customerId, userId))).limit(1);
  if (!booking) throw AppError.notFound('Booking not found.');

  const [payment] = await db.select().from(payments)
    .where(eq(payments.bookingId, bookingId)).limit(1);

  sendSuccess(res, payment ?? null);
});

/* ── POST /api/bookings/:id/payment  (customer auth) ───────────────────────
   Customer submits their chosen payment method after service is completed   */
export const submitPayment = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id: bookingId } = req.params;
  const { method, notes, razorpayPaymentId, razorpaySignature } = req.body as {
    method: 'cash' | 'upi_manual' | 'razorpay';
    notes?: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
  };

  if (!method) throw AppError.badRequest('Payment method is required.');

  // Validate booking belongs to customer and is in a payable state
  const [booking] = await db.select().from(bookings)
    .where(and(eq(bookings.id, bookingId), eq(bookings.customerId, userId))).limit(1);
  if (!booking) throw AppError.notFound('Booking not found.');
  if (!['completed', 'in_progress'].includes(booking.status)) {
    throw AppError.badRequest('Payment can only be submitted for in-progress or completed bookings.');
  }

  // Check if payment already exists for this booking
  const [existing] = await db.select().from(payments)
    .where(eq(payments.bookingId, bookingId)).limit(1);

  if (existing?.status === 'paid') {
    throw AppError.badRequest('This booking has already been paid.');
  }

  const amount = booking.price ?? 0;

  let paymentRecord;
  if (existing) {
    // Update existing pending payment
    const [updated] = await db.update(payments)
      .set({
        method: method as any,
        status: 'paid',
        notes: notes ?? null,
        razorpayPaymentId: razorpayPaymentId ?? null,
        razorpaySignature: razorpaySignature ?? null,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, existing.id))
      .returning();
    paymentRecord = updated;
  } else {
    // Create new payment record
    const [created] = await db.insert(payments).values({
      bookingId,
      customerId: userId,
      amount,
      currency: 'INR',
      status: 'paid',
      method: method as any,
      notes: notes ?? null,
      razorpayPaymentId: razorpayPaymentId ?? null,
      razorpaySignature: razorpaySignature ?? null,
    }).returning();
    paymentRecord = created;
  }

  sendSuccess(res, paymentRecord, 200);
});
