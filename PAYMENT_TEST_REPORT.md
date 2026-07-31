# ServeNow — Payment Flow Test Report
**Date:** 2026-07-31  
**Analysis method:** Full static code analysis (server offline — missing `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `JWT_REFRESH_SECRET`)  
**Scope:** All payment-related files across server, admin-web, customer-web, partner-web, mobile, mobile-partner

---

## 1. Existing Payment Architecture

### 1.1 Gateways Integrated
| Gateway | SDK | Enabled by | Webhook |
|---|---|---|---|
| Razorpay | `razorpay` npm | `platform_settings.payment_config.razorpay.enabled` | `POST /api/payments/razorpay/webhook` |
| Stripe | `stripe` npm | `platform_settings.payment_config.stripe.enabled` | `POST /api/payments/stripe/webhook` |
| Cash (COD) | None (manual) | `platform_settings.payment_config.cod.enabled` | N/A |
| UPI Manual | None (manual) | `platform_settings.payment_config.upi.enabled` + `upi.vpa` | N/A (admin confirms) |

### 1.2 Payment Config Storage
- **Table:** `platform_settings` (key=`'payment_config'`, value=JSON blob)  
- **Schema:** `server/src/database/schema/platformSettings.ts`  
- **Admin read/write:** `GET/PUT /api/admin/settings/payment_config` → `platformSettings.controller.ts`  
- **Public read:** `GET /api/payments/config` → returns only enabled methods + public keys

### 1.3 Payment Statuses (enum `payment_status`)
| Value | Meaning |
|---|---|
| `created` | Initiated / pending confirmation (UPI manual, newly created orders) |
| `paid` | Confirmed and complete |
| `failed` | Rejected by admin or signature mismatch |
| `refunded` | Enum value exists; **no refund endpoint implemented** |

### 1.4 Payment Methods (enum `payment_method`)
`card`, `netbanking`, `upi`, `wallet`, `other`, `cash`, `upi_manual`, `razorpay`, `stripe`

### 1.5 Booking Statuses
`pending` → `upcoming` → `in_progress` → `completed` / `cancelled`  
Payment can only be submitted when booking is `in_progress` or `completed`.

### 1.6 Database Tables
| Table | Role |
|---|---|
| `payments` | One row per booking. Stores gateway IDs, status, method, notes. |
| `bookings` | Links to `payments` via `payments.booking_id`. |
| `platform_settings` | Stores payment config JSON. |
| `points_ledger` (via points repo) | Loyalty points earn/redeem history. |
| `notifications` | In-app notification records. |

### 1.7 All Payment API Routes
| Method | Path | Handler | Auth |
|---|---|---|---|
| `GET` | `/api/payments/config` | `getPaymentConfig` | Public |
| `GET` | `/api/payments/razorpay/checkout` | `serveRazorpayCheckout` | Public |
| `POST` | `/api/payments/razorpay/callback` | `razorpayCallback` | Public (HMAC-verified) |
| `POST` | `/api/payments/razorpay/webhook` | `razorpayWebhook` | Webhook secret |
| `GET` | `/api/payments/stripe/success` | `stripeSuccess` | Public (session-verified) |
| `POST` | `/api/payments/stripe/webhook` | `stripeWebhook` | Webhook secret |
| `GET` | `/api/bookings/:id/payment` | `getPaymentForBooking` | Customer JWT |
| `POST` | `/api/bookings/:id/payment` | `submitPayment` | Customer JWT |
| `POST` | `/api/bookings/:id/razorpay/create-order` | `createRazorpayOrder` | Customer JWT |
| `POST` | `/api/bookings/:id/razorpay/verify` | `verifyRazorpayWeb` | Customer JWT |
| `POST` | `/api/bookings/:id/stripe/create-session` | `createStripeSession` | Customer JWT |
| `POST` | `/api/bookings/:id/test-pay` | `testPay` | Customer JWT |
| `PATCH` | `/api/admin/payments/:id/confirm` | `confirmPayment` | Admin JWT |

### 1.8 Side-Effects on Payment Confirmation
Every gateway path that marks a payment `paid` is supposed to trigger:
1. `awardPoints(customerId, bookingId, price)` — 1 point per ₹10 spent (idempotent)
2. `notifyPartner(bookingId, amount, serviceName)` — push + in-app notification to partner
3. Customer notification (varies by path)

### 1.9 Test Mode
- Controlled via `platform_settings.payment_config.testMode.enabled`
- When ON: `GET /api/payments/config` returns all 4 methods + dummy keys regardless of real config
- When ON (mobile): gateway buttons call `POST /api/bookings/:id/test-pay` → marks `paid` immediately, no real gateway
- Seed script: `server/src/database/seed-test-mode.ts`

### 1.10 Loyalty Points
- **Rate:** 1 point per ₹10 spent  
- **Min redeem:** 100 points = ₹100  
- **Idempotency:** `pointsRepository.findByBooking(userId, bookingId, 'earn')` prevents double-award  
- **File:** `server/src/services/points.service.ts`

### 1.11 Synchronisation Across Clients
| Client | Sees payment status | Can act |
|---|---|---|
| Customer mobile | `paymentStatus` on booking card; PaymentSheet shows paid/pending | Submit payment |
| Partner mobile | Read-only badge on job detail: `Awaiting customer payment ⏳` / `Customer paid ✅` | None |
| Partner web | Read-only column: `⏳ Pending` / `✅ Paid` | None |
| Admin web | PaymentStatusCell with Confirm/Reject buttons for cash & UPI | Confirm or reject |

---

## 2. Test Plan (Based Only on Existing Implementation)

### 2.1 Payment Config Endpoint
| # | Test Case | Expected |
|---|---|---|
| PC-1 | `GET /api/payments/config` with testMode=false, only cash enabled | `{ methods: ['cash'], testMode: false }` |
| PC-2 | `GET /api/payments/config` with testMode=false, no methods enabled | `{ methods: ['cash'] }` (fallback) |
| PC-3 | `GET /api/payments/config` with testMode=true | All 4 methods; dummy keys |
| PC-4 | `GET /api/payments/config` with testMode=false, stripe enabled | Stripe publishable key in response |

### 2.2 Test Mode Payment
| # | Test Case | Expected |
|---|---|---|
| TM-1 | `POST /bookings/:id/test-pay` with testMode=true | `{ status: 'paid' }`, points awarded, partner notified |
| TM-2 | `POST /bookings/:id/test-pay` with testMode=false | `400 Test mode is not enabled` |
| TM-3 | `POST /bookings/:id/test-pay` with already-paid booking | `400 already been paid` |
| TM-4 | `POST /bookings/:id/test-pay` with non-existent booking | `404` |

### 2.3 Cash Payment
| # | Test Case | Expected |
|---|---|---|
| CA-1 | `POST /bookings/:id/payment { method: 'cash' }` | `{ status: 'paid' }`, points awarded, partner notified |
| CA-2 | Same booking second time | `400 already been paid` |
| CA-3 | Booking in `pending` status | `400 Payment can only be initiated for in-progress or completed bookings` |
| CA-4 | Booking belonging to different customer | `404 Booking not found` |

### 2.4 UPI Manual Payment
| # | Test Case | Expected |
|---|---|---|
| UPI-1 | `POST /bookings/:id/payment { method: 'upi_manual', notes: 'UTR123' }` | `{ status: 'created' }` (NOT paid); partner notified; customer gets pending notification |
| UPI-2 | Mobile UI after UPI submit | Shows "UPI Payment Submitted ⏳ pending confirmation" screen (NOT "Payment Recorded!") |
| UPI-3 | Admin confirms UPI | `{ status: 'paid' }`, customer notified |
| UPI-4 | Admin rejects UPI | `{ status: 'failed' }`, customer notified |
| UPI-5 | Admin confirm already-paid | `400 Payment is already confirmed` |

### 2.5 Razorpay
| # | Test Case | Expected |
|---|---|---|
| RZ-1 | `POST /bookings/:id/razorpay/create-order` | Returns `orderId`, `amount`, `keyId`; payment row created with `status=created` |
| RZ-2 | Razorpay callback with valid HMAC signature | `status=paid`, points, partner notified; redirects to `servenow://payment-success` |
| RZ-3 | Razorpay callback with invalid HMAC signature | `400 Signature mismatch` |
| RZ-4 | Razorpay webhook `payment.captured` with valid secret | `status=paid`, points awarded |
| RZ-5 | Razorpay webhook `payment.captured` for already-paid | No-op (idempotency guard) |
| RZ-6 | Razorpay webhook with invalid secret | `400 Invalid webhook signature` |
| RZ-7 | Razorpay webhook with no secret configured | `400 Webhook secret not configured` |
| RZ-8 | `POST /bookings/:id/razorpay/verify` (web flow) | `status=paid`, points, partner notified |

### 2.6 Stripe
| # | Test Case | Expected |
|---|---|---|
| ST-1 | `POST /bookings/:id/stripe/create-session` | Returns `checkoutUrl`; payment row created with `status=created` |
| ST-2 | `GET /payments/stripe/success` with matching `session_id` + `booking_id` and paid session | `status=paid`, points, partner notified; redirect to `servenow://payment-success` |
| ST-3 | `GET /payments/stripe/success` with mismatched `booking_id` vs session metadata | Redirect to `servenow://payment-cancel` |
| ST-4 | `GET /payments/stripe/success` with missing session metadata | Redirect to `servenow://payment-cancel` |
| ST-5 | `GET /payments/stripe/success` with unpaid session | Redirect to `servenow://payment-cancel` |
| ST-6 | Stripe webhook `checkout.session.completed` with valid secret | `status=paid`, points, partner notified |
| ST-7 | Stripe webhook `checkout.session.completed` already paid | No-op (idempotency guard) |
| ST-8 | Stripe webhook with invalid signature | `400 Webhook signature verification failed` |
| ST-9 | Stripe webhook `checkout.session.completed` with non-UUID bookingId in metadata | Skipped (UUID regex guard) |

---

## 3. Bugs Found

### 🔴 BUG-1 — HIGH: Admin `confirmPayment` never awards loyalty points
**File:** `server/src/controllers/admin.controller.ts` — `confirmPayment` (line 241–272)  
**Description:** When an admin confirms a UPI or cash payment, the handler updates status to `'paid'` and notifies the customer, but **never calls `awardPoints`**. Every other payment path (Razorpay callback, Razorpay verify, Stripe success, Stripe webhook, testPay, direct cash submit) calls `awardPoints`. UPI customers confirmed by admin never earn loyalty points.  
**Severity:** High — silent data inconsistency; customers lose earned points with no error or indication.  
**Root cause:** Side-effect omission in `confirmPayment`.

**Fix:**
```typescript
// In admin.controller.ts, after updating payment status to 'paid':
if (action === 'confirm' && booking) {
  const { pointsService } = await import('../services/points.service.js');
  void pointsService.earnForBooking(payment.customerId, payment.bookingId, booking.price ?? 0);
}
```

---

### 🔴 BUG-2 — HIGH: `notifyPartner` sends "Payment Received 💰" for pending UPI
**File:** `server/src/controllers/payment.controller.ts` — `submitPayment` (line 570)  
**Description:** When UPI manual is submitted, `notifyPartner` is called with the standard "Payment Received 💰" message. But the payment is NOT yet received — it's pending confirmation. The partner app receives a misleading notification that payment has already been received, before they've confirmed anything.  
**Severity:** High — misinforms partners; could cause them to complete jobs without actually verifying payment.  
**Root cause:** `notifyPartner` has a hardcoded "Payment Received" message; the UPI branch calls it unconditionally.

**Fix:** Replace the UPI `notifyPartner` call with a dedicated "payment pending" notification:
```typescript
// UPI branch in submitPayment — replace void notifyPartner(...) with:
const { professionals } = await import('../database/schema/professionals.js');
const [bk2] = await db.select({ professionalId: bookings.professionalId }).from(bookings).where(eq(bookings.id, bookingId)).limit(1);
if (bk2?.professionalId) {
  const [pro] = await db.select({ userId: professionals.userId }).from(professionals).where(eq(professionals.id, bk2.professionalId)).limit(1);
  if (pro?.userId) {
    void notificationService.sendToUser(pro.userId,
      'UPI Payment Pending ⏳',
      `Customer has submitted UPI payment of ₹${booking.price} for ${booking.serviceName ?? 'service'}. Confirm receipt in Admin or when you meet the customer.`,
      { bookingId, type: 'payment_pending' }
    );
  }
}
```

---

### 🟡 BUG-3 — MEDIUM: Razorpay `payment.captured` webhook skips `notifyPartner`
**File:** `server/src/controllers/payment.controller.ts` — `razorpayWebhook` (line 346–367)  
**Description:** The `payment.captured` webhook handler awards points but does **not** call `notifyPartner`. If a Razorpay payment captures asynchronously (e.g. after a network timeout in the callback), the partner never receives a "Payment Received" notification. All other paid paths (callback, verify, Stripe success, Stripe webhook, testPay, cash) call both.  
**Severity:** Medium — partner notification gap on async captures.  
*(Already proposed as follow-up task #3)*

**Fix:** Add after `void awardPoints(...)` in the `payment.captured` branch:
```typescript
if (existing?.bookingId && bk) {
  void notifyPartner(existing.bookingId, bk.price ?? 0, bk.serviceName ?? 'service');
}
```

---

### 🟡 BUG-4 — MEDIUM: Razorpay callback `booking_id` not cross-checked against DB
**File:** `server/src/controllers/payment.controller.ts` — `razorpayCallback` (line 258–315)  
**Description:** The callback verifies the HMAC signature of `razorpay_order_id|razorpay_payment_id`, which is strong — but it does not verify that the `booking_id` in the form body matches the row in the `payments` table that has `razorpayOrderId = razorpay_order_id`. A spoofed POST with a valid Razorpay signature for order X but `booking_id=Y` would mark booking Y as paid.  
**Severity:** Medium — requires a valid Razorpay payment signature (hard), but the signature is not booking-specific.  
*(Already proposed as follow-up task #4)*

**Fix:** After signature verification, fetch the existing payment and assert `existing.bookingId === booking_id`:
```typescript
const [existing] = await db.select().from(payments).where(eq(payments.razorpayOrderId, razorpay_order_id)).limit(1);
if (!existing || existing.bookingId !== booking_id) {
  logger.warn('[razorpay] booking_id mismatch: form=%s db=%s', booking_id, existing?.bookingId);
  throw AppError.badRequest('Payment verification failed. Booking ID mismatch.');
}
```

---

### 🟡 BUG-5 — MEDIUM: `confirmPayment` accepts any `created` status, including gateway payments
**File:** `server/src/controllers/admin.controller.ts` — `confirmPayment` (line 241–272)  
**Description:** The admin confirm route only blocks re-confirmation of already-`paid` records. It does not restrict confirmation to manual methods (`cash`, `upi_manual`). An admin could manually confirm a Razorpay or Stripe payment that's stuck in `created` — bypassing actual gateway verification.  
**Severity:** Medium — admin-only route; requires deliberate action, but could mask integration failures.

**Fix:** Add a method check before confirming:
```typescript
const manualMethods = ['cash', 'upi_manual', null];
if (action === 'confirm' && !manualMethods.includes(payment.method)) {
  throw AppError.badRequest(`Cannot manually confirm a ${payment.method} payment. Check the gateway dashboard.`);
}
```

---

### 🟢 BUG-6 — LOW: `getPaymentForBooking` returns null without error for non-existent payment
**File:** `server/src/controllers/payment.controller.ts` — `getPaymentForBooking` (line 96–104)  
**Description:** Returns `null` (HTTP 200) when no payment row exists for a booking. The mobile app silently ignores this (`catch(() => {})`). If downstream code assumes a payment record exists, it could dereference null. Current mobile code handles null gracefully, but future callers may not.  
**Severity:** Low — currently handled; defensive typing issue.

---

### 🟢 BUG-7 — LOW: Stripe success awards points even when payment record was already `paid`
**File:** `server/src/controllers/payment.controller.ts` — `stripeSuccess` (line 422–463)  
**Description:** Lines 442–451 only update the DB row when `existing.status !== 'paid'`. But lines 455–459 call `awardPoints` unconditionally regardless. If the success URL is visited twice, `awardPoints` is called twice. Points service IS idempotent, so no double-award occurs — but this is an unnecessary extra DB query.  
**Severity:** Low — idempotency guard prevents actual damage; minor inefficiency.

---

## 4. Tests Skipped (Feature Does Not Exist)

| Test | Reason Skipped |
|---|---|
| Refund flow | `refunded` enum value exists but no endpoint to trigger a refund |
| PhonePe / Paytm / other gateways | Not integrated |
| Retry payment after failure | No explicit retry endpoint; user can re-submit |
| Invoice / receipt generation | Not implemented |
| Payment timeout / expiry | No timeout-specific logic found |
| Phone number OTP for UPI | Not implemented |
| Point redemption at checkout | Redeem endpoint exists; no checkout integration |
| Partner-side UPI confirmation | No partner-authenticated confirm endpoint (admin-only) |

---

## 5. Data Consistency Verification (Static)

| Check | Result |
|---|---|
| `payments.booking_id` always set | ✅ All insert paths include `bookingId` |
| `payments.customerId` always set | ✅ Set from `req.user!.userId` or booking lookup |
| `paymentStatus` on booking API response | ✅ Admin controller uses subquery `paymentStatusSub(bookings.id)` |
| Points never double-awarded | ✅ `findByBooking(userId, bookingId, 'earn')` guard in points service |
| Webhook idempotency (Stripe) | ✅ `existing.status !== 'paid'` guard before update |
| Webhook idempotency (Razorpay) | ✅ Same guard in `razorpayWebhook` |
| Admin confirm idempotency | ✅ `payment.status === 'paid' && action === 'confirm'` → 400 |
| awardPoints called on admin confirm | ❌ **Missing — BUG-1** |
| UPI pending message correct | ✅ Server sets `status='created'`; mobile UI fixed to show pending |
| notifyPartner message correct for pending UPI | ❌ **Sends "Payment Received" before confirmed — BUG-2** |

---

## 6. Environment Status

| Item | Status |
|---|---|
| Test mode in DB | Not enabled (requires `seed-test-mode.ts` to be run once DB is connected) |
| Live Razorpay credentials | Not configured |
| Live Stripe credentials | Not configured |
| Server startup | ❌ Blocked — missing secrets: `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `JWT_REFRESH_SECRET` |
| DATABASE_URL | Not set in Replit secrets |

To get the server running, add the following as Replit Secrets:
- `DATABASE_URL` — PostgreSQL connection string (Supabase)
- `JWT_SECRET` — any strong random string
- `JWT_REFRESH_SECRET` — separate strong random string
- `SUPABASE_ANON_KEY` — from Supabase project settings
- `SUPABASE_SERVICE_ROLE_KEY` — from Supabase project settings

---

## 7. Summary

| Severity | Count | Fixed This Session |
|---|---|---|
| 🔴 High | 2 | 0 (BUG-1, BUG-2 are new; see below) |
| 🟡 Medium | 3 | 2 previously fixed (Stripe spoofing ✅, UPI mobile UI ✅); 1 new (BUG-5) |
| 🟢 Low | 2 | 0 |

### Previously Fixed (this session)
- ✅ Stripe success route spoofing: `&&` → `||` in metadata check
- ✅ Mobile UPI: `submitMutation.onSuccess` now shows pending screen instead of "Payment Recorded!"

### Requires Code Fix Now
- **BUG-1** (`confirmPayment` never awards points) — `server/src/controllers/admin.controller.ts:241`
- **BUG-2** (UPI notifyPartner sends wrong "Payment Received" message) — `server/src/controllers/payment.controller.ts:570`

### Deferred (already proposed as follow-up tasks)
- **BUG-3** — Razorpay webhook missing `notifyPartner` (Task #3)
- **BUG-4** — Razorpay callback `booking_id` spoofing (Task #4)
