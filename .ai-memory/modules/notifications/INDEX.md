# Module: Notifications
**Status:** ✅ Complete

## Key Files
| File | Purpose |
|------|---------|
| `server/src/services/notificationDb.service.ts` | create in-app notifications, send push |
| `server/src/controllers/notification.controller.ts` | list, mark read |
| `apps/mobile/app/(tabs)/notifications.tsx` | customer notifications screen |
| `apps/mobile-partner/app/(tabs)/notifications.tsx` | partner notifications screen |

## Two Types
1. **In-app notifications** — stored in DB, shown in notifications tab
2. **Push notifications** — sent via Expo Push API to device

## Push Token Registration
Both apps call `PATCH /api/profile/me/push-token` with the Expo push token on login.
Token stored in `professionals.push_token` (partner) and `users.push_token` (customer).

## No EAS projectId
Push tokens use Expo Go's anonymous identity. Works for dev/testing.
For standalone production builds: run `eas init` in each app folder to get a projectId, add to `app.json` under `extra.eas.projectId`.

## When Notifications Are Sent
| Event | Recipients |
|-------|-----------|
| New booking created | Matched partners (dispatch) |
| Partner accepted | Customer |
| Partner checked in | Customer |
| Booking completed | Customer |
| Booking cancelled | Both parties |

## API Routes
```
GET   /api/notifications          → list (auth required)
PATCH /api/notifications/:id/read → mark as read
PATCH /api/profile/me/push-token  → { pushToken } register device
```
