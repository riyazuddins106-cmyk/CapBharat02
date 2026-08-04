# Module: Partner Mobile App
**Status:** ✅ Complete — service-level order jobs added

## Key Files
| File | Purpose |
|------|---------|
| `apps/mobile-partner/app/` | all screens (Expo Router) |
| `apps/mobile-partner/lib/api.ts` | all API calls + TypeScript types |
| `apps/mobile-partner/context/AuthContext.tsx` | auth state |
| `apps/mobile-partner/metro.config.js` | Metro config with same fixes as customer app |
| `apps/mobile-partner/package.json` | same version pins as customer app |

## Screens
- Auth (login, register, OTP verify)
- Job list: legacy jobs plus service-level order-item requests and active/completed service actions
- Job detail: legacy accept/check-in/complete; service-item list supports accept, mark arrived, payment-gated completion
- Document upload
- Availability toggle
- Earnings & payouts
- Notifications

## Partner Job Flow
1. Dispatch sends push notification → partner sees job in "New" tab
2. Partner accepts → job moves to "Accepted"
3. Customer arrives → partner scans customer's QR code (check-in)
4. Job completed → points awarded to customer → earnings recorded

## Running
- Port: 8099
- Workflow: `Expo Partner App` (starts 25s after Customer App to avoid ngrok slot conflict)
- QR at: `http://localhost:3000` (QR Codes workflow)

## Known Gotchas
- Same as customer app: unset REPLIT_EXPO_DEV_DOMAIN, worklets pin
- Partner availability: controller accepts both `availabilityStatus` (mobile) and `status` (legacy) — see GOTCHAS.md

## Test Credentials
Partner: `partner@servenow.in` / `Partner@1234`
