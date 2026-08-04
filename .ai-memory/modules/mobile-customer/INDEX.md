# Module: Customer Mobile App
**Status:** ✅ Complete — service-level orders added

## Key Files
| File | Purpose |
|------|---------|
| `apps/mobile/app/` | all screens (Expo Router file-based routing) |
| `apps/mobile/app/(tabs)/` | tab screens: home, bookings, profile |
| `apps/mobile/app/checkout.tsx` | full checkout flow |
| `apps/mobile/app/service/[id].tsx` | service detail + add to cart |
| `apps/mobile/lib/api.ts` | all API calls + TypeScript types |
| `apps/mobile/context/AuthContext.tsx` | auth state, accessToken, login/logout |
| `apps/mobile/hooks/useColors.ts` | theme colors (dark/light) |
| `apps/mobile/metro.config.js` | Metro config with React + worklets resolution fixes |
| `apps/mobile/package.json` | pinned: reanimated 4.1.1, worklets 0.5.1 |

## Screens
- Home: categories grid + reels feed
- Sub-categories drill-down → service listing → service detail
- Checkout: cart → address → date → time slot → summary → payment
- My Bookings: legacy bookings plus master orders with per-service status, windows, cancel/search, and payment actions
- Wishlist / Favorites
- Points & Rewards
- Notifications
- Help & Support (tickets)
- Privacy & Security

## Running
- Port: 8080
- Workflow: `Expo Customer App`
- QR at: `http://localhost:3000` (QR Codes workflow)

## Known Gotchas
- Expo tunnel: must `unset REPLIT_EXPO_DEV_DOMAIN` before running — see GOTCHAS.md
- worklets must be pinned to 0.5.1 — see GOTCHAS.md
- useFonts needs setTimeout fallback — see GOTCHAS.md

## Test Credentials
Customer: `customer@servenow.in` / `Customer@1234`
