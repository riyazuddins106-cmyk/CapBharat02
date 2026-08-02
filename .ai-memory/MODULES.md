# ServeNow — Module Overview
> High-level map of every domain module. Create a detail file under `modules/<name>/INDEX.md` the first time you work on that module.

---

## Module Map

### 🔐 Auth
- **Files:** `server/src/controllers/auth.controller.ts`, `server/src/routes/auth.routes.ts`, `server/src/repositories/refreshToken.repository.ts`, `server/src/services/email.service.ts`
- **Flow:** Register → OTP email verify → Login → JWT access+refresh → Refresh → Logout
- **Key quirk:** `issueTokenPair` must store the *same* token ID that is signed into the JWT — bug was fixed; do not revert.
- **Mobile screens:** `apps/mobile/app/auth.tsx`, `apps/mobile-partner/app/auth.tsx`

---

### 📦 Service Catalog
- **Files:** `server/src/controllers/category.controller.ts`, `server/src/controllers/service.controller.ts`, `server/src/controllers/subCategory.controller.ts`
- **Schema:** `categories` → `sub_categories` → `services` → `service_details`
- **Owned by:** Admin only. Partners do not create services.
- **Seeded by:** `server/src/database/seed-catalog.ts`
- **Key quirk:** `featured` and `image_url` columns on `service_categories` may be missing on pre-existing DBs — run `run-column-migration.ts` (ALTER TABLE IF NOT EXISTS).

---

### 📅 Booking
- **Files:** `server/src/controllers/booking.controller.ts`, `server/src/services/booking.service.ts`, `server/src/repositories/booking.repository.ts`
- **Flow:** Customer picks service → Cart → Checkout (apply points/coupon) → Booking created → Dispatch triggered → Partner accepts → Check-in (QR) → Complete → Review
- **Statuses:** `pending` → `accepted` → `in_progress` → `completed` | `cancelled`
- **Mobile:** `apps/mobile/app/checkout.tsx`, `apps/mobile/app/(tabs)/bookings.tsx`

---

### 🚀 Dispatch
- **Files:** `server/src/controllers/dispatch.controller.ts`, `server/src/services/dispatch.service.ts`
- **Flow:** On booking creation, find available partners with matching skills → send push notification → partner accepts/rejects → re-dispatch if rejected
- **Key field:** Partners need `availability_status = 'available'` and linked services in `partner_services` table.
- **Seeded by:** `server/src/database/seed-partner-services.ts`

---

### 💳 Payments
- **Files:** `server/src/controllers/payment.controller.ts`, `server/src/services/payment.service.ts`
- **Test mode:** Set via `seed-test-mode.ts` — skips real gateway calls in dev.
- **Real gateway:** Hook is present but not wired to a live provider by default.

---

### 🌟 Points & Rewards
- **Files:** `server/src/controllers/points.controller.ts`, `server/src/services/points.service.ts`
- **Rules:** Earn 1pt per ₹10 spent. Redeem 1pt = ₹1 discount. Minimum redemption: 100 pts.
- **Mobile:** `apps/mobile/app/points.tsx`

---

### 👑 Admin
- **Files:** `server/src/controllers/admin.controller.ts`, `server/src/routes/admin.routes.ts`
- **Frontend:** `apps/admin-web/src/app/` — stats, users, bookings, professionals, categories, offers, reviews, audit-logs, payouts, settings
- **Auth:** Admin role required on all `/api/admin/*` routes.

---

### 👷 Partner (mobile)
- **Files:** `apps/mobile-partner/app/` — auth, job list `(tabs)`, documents, notifications
- **Flow:** Login → View pending jobs → Accept → Navigate to address → QR check-in → Mark complete → Earnings
- **Key field:** Partner sends `availabilityStatus` (mobile field name) or `status` (legacy web).

---

### 📱 Customer Mobile
- **Files:** `apps/mobile/app/` — auth, `(tabs)` (home, bookings, profile), checkout, subcategories, service, wishlist, points, addresses, help-support, notifications, privacy-security
- **Tunneling:** `scripts/expo-tunnel.sh` — auto-detects Replit environment, no ngrok needed on Replit.
- **Expo SDK:** 54.0.35 — do NOT upgrade to SDK 57 (pnpm release-age policy blocks it and partial upgrades corrupt state).

---

### 🔔 Notifications
- **Files:** `server/src/controllers/notification.controller.ts`, `server/src/services/notification.service.ts`
- **Push:** Expo push tokens stored via `PATCH /api/profile/me/push-token`. Sent on: booking created, partner assigned, job status updates.
- **In-app:** Stored in `notifications` table, fetched by `GET /api/notifications`.

---

### 🎬 Reels
- **Files:** `server/src/controllers/reel.controller.ts`, `server/src/routes/reel.routes.ts`
- **Storage:** Supabase storage bucket. **Do not set `fileSizeLimit`** on the reels bucket — Supabase free plan caps it and the upload fails silently.

---

### 🎫 Offers & Coupons
- **Files:** `server/src/controllers/offer.controller.ts`
- **Flow:** Admin creates offer with code → Customer applies at checkout → Discount applied before points.

---

### 🎧 Support Tickets
- **Files:** `server/src/controllers/supportTicket.controller.ts`
- **Mobile:** `apps/mobile/app/help-support.tsx`

---

## When to Create a Module Detail File

Create `.ai-memory/modules/<name>/INDEX.md` when you are about to make changes to that module. Include:
- The exact files you will touch
- The current flow (as you found it)
- The change you made and why
- Any gotchas discovered

This keeps the module files lean until they're actually needed.
