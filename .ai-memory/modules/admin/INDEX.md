# Module: Admin
**Status:** ✅ Complete — service-order controls added

## Key Files
| File | Purpose |
|------|---------|
| `apps/admin-web/src/app/App.tsx` | **Monolithic** — entire admin UI in one file (~6900 lines) |
| `apps/admin-web/src/lib/api.ts` | all admin API calls |
| `server/src/controllers/admin.controller.ts` | stats, users, bookings, professionals |
| `server/src/controllers/platformSettings.controller.ts` | settings CRUD |
| `server/src/routes/admin.routes.ts` | route bindings (all require admin role) |

Service Orders: master order hierarchy, per-item dispatch restart, refunds, payouts, and platform margin.

## ⚠️ Important: Admin UI is monolithic
There are NO separate page files. Every view (dashboard, users, bookings, categories, settings, etc.) is a component function inside `App.tsx`. When editing admin UI, search by function name in App.tsx.

## Admin Panel URL
`/admin-panel/` — runs on port 5001

## Key Views in App.tsx (search by function name)
| View | Function |
|------|---------|
| Booking Settings | `BookingSettingsView` (~line 5726) |
| Service Create/Edit | search `minAdvanceMinutes` (~line 6535) |
| Categories | search `CategoryManagement` |
| Offers | search `OffersView` |
| Payouts | search `PayoutsView` |
| Platform Settings | search `SettingsView` |
| Audit Logs | search `AuditLogsView` |

## Settings Architecture
Settings stored in `platform_settings` table as key-value JSON blobs.
Allowed keys: `payment_config`, `email_config`, `sms_config`, `contact_config`, `otp_config`, `booking_config`
Admin saves via `PATCH /api/admin/settings/:key` → takes effect immediately, no restart needed.

## Test Credentials
Admin: `admin@servenow.in` / `Admin@1234`
