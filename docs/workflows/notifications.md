# Notification Workflow

## Trigger

An application event requires an in-app, push, email, or SMS message.

## Preconditions

The target user and message data exist. Push delivery requires a registered
token; email/SMS delivery requires its configured provider.

## Step-by-step flow

1. Domain service creates/publishes a notification event.
2. Database notification record is persisted when applicable.
3. Push/email/SMS service attempts external delivery.
4. Client reads notifications and marks them through notification APIs.

## API Calls

Notification route group, profile push-token route, and domain-specific event
routes.

## Database Changes

`notifications`; `users.push_token` for mobile push registration.

## Notifications

This workflow is itself the notification path; exact event-to-channel mapping
is `UNKNOWN — REQUIRES VERIFICATION`.

## Business Rules

Delivery channels are optional/configured independently; never treat external
delivery as proof that an in-app record exists.

## Final State

Notification is stored/read and external delivery is attempted.

## Error Scenarios

Missing token/configuration, provider failure, invalid user, and database
failure.

## Related Source Files

`server/src/services/notification.service.ts`,
`server/src/services/notificationDb.service.ts`,
`server/src/controllers/notification.controller.ts`.
