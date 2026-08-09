# Notifications and Support Module

## Purpose

Keep users informed of platform events and provide customer issue handling.

## Responsibilities

Persist/read notifications, register push tokens, send Expo push messages,
send email/SMS where configured, and manage support tickets.

## APIs

`/api/notifications`, profile push-token route, and
`/api/support-tickets`.

## Database Tables

`notifications`, `support_tickets`, and optional booking/order-item references.

## Important Source Files

- `server/src/controllers/notification.controller.ts`
- `server/src/services/notification.service.ts`
- `server/src/services/notificationDb.service.ts`
- `server/src/services/email.service.ts`
- `server/src/services/sms.service.ts`
- `server/src/controllers/supportTicket.controller.ts`
- `server/src/services/supportTicket.service.ts`
- `apps/mobile/lib/pushNotifications.ts`
- `apps/mobile-partner/lib/pushNotifications.ts`

## Related Workflows

[`../workflows/notifications.md`](../workflows/notifications.md)
