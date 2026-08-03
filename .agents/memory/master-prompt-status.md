---
name: Master Prompt Implementation Status
description: Tracks completion of every requirement from the Urban Company-style marketplace master prompt (attached_assets/Pasted-Here-is-the-complete-master-prompt-...).
---

# Master Prompt — Implementation Status

Last audited: 2026-08-03

Legend: ✅ Done | ⚠️ Partial | ❌ Not Built

---

## 1. New Booking Architecture (One Order → Multiple Service Bookings)

| # | Requirement | Status | Notes |
|---|---|---|---|
| 1.1 | Master Order table (parent record) | ❌ | No separate `orders` table. Single `bookings` row covers everything. |
| 1.2 | Individual service booking per cart item | ⚠️ | `booking_items` stores items but they share one booking record — no separate booking per service |
| 1.3 | Per-service partner assignment | ❌ | One partner assigned to the whole booking, not per service |
| 1.4 | Different-skilled partners per service | ❌ | Dispatch sends one partner for all services in the booking |

---

## 2. Order & Service Status Flows

| # | Requirement | Status | Notes |
|---|---|---|---|
| 2.1 | Master order statuses: `created → searching_partners → partially_confirmed → fully_confirmed → in_progress → partially_completed → completed` | ❌ | Current: `pending / upcoming / in_progress / completed / cancelled` only |
| 2.2 | Per-service statuses: `searching_partner → assigned → partner_accepted → partner_arrived → payment_pending → payment_completed → service_started → service_completed` | ❌ | Status lives on booking, not per item. Missing `partner_arrived`, `payment_pending`, `payment_completed`, `service_started` states |
| 2.3 | Partial acceptance (some services assigned, others still searching) | ❌ | Acceptance is all-or-nothing at booking level |

---

## 3. Time Slot System

| # | Requirement | Status | Notes |
|---|---|---|---|
| 3.1 | Show only start times (not ranges) | ⚠️ | Server accepts any timestamp. Customer mobile uses fixed hours `[9, 11, 14, 16, 18]` — needs free slot picker |
| 3.2 | Service window = longest service duration (not sum) | ❌ | `booking.controller.ts` lines 92–103 sums all durations for closing-time check |
| 3.3 | Display window: "10:00 AM – 1:00 PM, Approx 3 hrs" | ❌ | No per-service time window displayed anywhere |
| 3.4 | Partner calendar blocks only their service duration | ❌ | No per-partner calendar blocking implemented |
| 3.5 | Booking creation allowed 24/7 | ✅ | Server enforces only working-hours slots, not creation time |

---

## 4. Partner Search & Dispatch

| # | Requirement | Status | Notes |
|---|---|---|---|
| 4.1 | Search partners per-service separately | ❌ | `dispatch.service.ts` does one broadcast for the whole booking |
| 4.2 | Nearby partners first, then expand radius | ✅ | 30 km Haversine filter with fallback to all partners |
| 4.3 | Retry / re-dispatch when partner goes online | ✅ | `updateAvailability()` re-dispatches pending bookings |
| 4.4 | Configurable search timeout | ❌ | `dispatchDeadline` = 10 min hardcoded; no admin config UI |
| 4.5 | Stop on: accept / customer cancel / timeout / time expires | ⚠️ | Accept + cancel stop it; timeout is stored but not enforced by a cron |

---

## 5. Payment Workflow

| # | Requirement | Status | Notes |
|---|---|---|---|
| 5.1 | No payment until partner check-in | ⚠️ | Payment created after `completeJob` (job done), not after check-in/arrival |
| 5.2 | Per-service separate payments | ❌ | One payment record per booking, not per service |
| 5.3 | "Waiting for partner confirmation" state (no Pay button) | ⚠️ | "Awaiting Payment" tab exists but not gated on partner arrival event |
| 5.4 | Payment triggered on partner check-in (`Start Service`) | ❌ | Triggered on completion, not check-in |
| 5.5 | Commission split: platform % vs partner payout | ✅ | `customerPrice − partnerPayout` = commission, stored per service in catalog |
| 5.6 | Partner wallet / earnings / payout records | ✅ | `partner_payouts` table, earnings API, PayoutsAdminView |
| 5.7 | Transaction log per service | ⚠️ | `payments` table exists per booking, not per service |

---

## 6. Customer Mobile App

| # | Requirement | Status | Notes |
|---|---|---|---|
| 6.1 | Booking detail shows per-service breakdown (service name, partner, time window, payment status) | ❌ | Shows single booking-level info; no per-service rows |
| 6.2 | "Continue Searching" button per unassigned service | ❌ | Not built |
| 6.3 | "Cancel Service" button per individual service | ❌ | Cancel is per-booking only |
| 6.4 | Free start-time picker (30-min increments) | ❌ | Fixed slots `[9, 11, 14, 16, 18]` |
| 6.5 | Per-service payment screen on partner arrival | ❌ | Single payment sheet for whole booking |
| 6.6 | Draggable floating cart | ✅ | Built (PanResponder, edge-snap) |

---

## 7. Customer Web App

| # | Requirement | Status | Notes |
|---|---|---|---|
| 7.1 | Same per-service booking detail as mobile | ❌ | Not built |
| 7.2 | Per-service cancel / continue searching | ❌ | Not built |
| 7.3 | Free start-time picker | ❌ | Not audited — likely same fixed slots |
| 7.4 | Per-service payment flow | ❌ | Not built |
| 7.5 | Data sync with mobile (shared API) | ✅ | Both use same backend |

---

## 8. Partner App

| # | Requirement | Status | Notes |
|---|---|---|---|
| 8.1 | Job request per-service (not per-order) | ⚠️ | Job request is per-booking; partner sees all items in the booking |
| 8.2 | Accept / Reject | ✅ | Built |
| 8.3 | Navigation to customer location | ✅ | Built |
| 8.4 | Check-in / Start Service button | ✅ | Built |
| 8.5 | Complete service | ✅ | Built |
| 8.6 | Per-service duration & time window display | ⚠️ | Shows job `scheduledAt`; no individual service time window |
| 8.7 | Earnings update per service | ✅ | Shows `unitPartnerPayout` per service |

---

## 9. Admin Panel

| # | Requirement | Status | Notes |
|---|---|---|---|
| 9.1 | Master Order → Service Booking hierarchy view | ❌ | Flat booking list only |
| 9.2 | Per-service partner assignment & status | ⚠️ | Shows dispatch status per booking (not per service) |
| 9.3 | Configurable search timeout | ❌ | Not built |
| 9.4 | Commission config | ✅ | Per-service `customerPrice / partnerPayout` |
| 9.5 | Service duration config | ✅ | Admin can edit service duration |
| 9.6 | Payment & earnings per service | ⚠️ | Per-booking payment; aggregated partner payouts |
| 9.7 | Manual partner assignment | ✅ | Dispatch operations center |
| 9.8 | Refunds management | ⚠️ | Refund status in `payments` table; no admin UI for initiating refunds |

---

## Summary

| Area | Done | Partial | Not Built |
|---|---|---|---|
| Architecture (Orders/Items) | 0 | 1 | 3 |
| Status Flows | 0 | 0 | 3 |
| Time Slots | 1 | 1 | 3 |
| Dispatch / Search | 2 | 1 | 2 |
| Payments | 2 | 3 | 2 |
| Customer Mobile | 1 | 0 | 5 |
| Customer Web | 1 | 0 | 4 |
| Partner App | 4 | 2 | 0 |
| Admin Panel | 3 | 3 | 2 |
| **Total** | **14** | **11** | **24** |

---

## Build Order (recommended sequence)

These must be done in this order due to dependencies:

1. **DB schema** — add `orders` table (master order), add per-service `order_items` with own status column, migrate `bookings` to point to orders
2. **Backend** — update checkout to create one order + N service bookings; update dispatch to search per-service; add per-item status transitions
3. **Time slots** — replace fixed-hour array with dynamic 30-min slots, fix service-window = max(durations)
4. **Payment** — trigger payment per service on partner check-in, not job completion
5. **Customer Mobile** — booking detail per-service rows, continue-searching/cancel-service, free slot picker, per-service pay screen
6. **Customer Web** — same as mobile
7. **Partner App** — show only the one service assigned to this partner; show that service's time window
8. **Admin Panel** — order hierarchy view, timeout config, per-service payment log
