# Partner Mobile Module

## Purpose

Provide the Expo Router partner application for jobs, schedule, earnings,
documents, notifications, and profile operations.

## Responsibilities

Partner auth, job lists/details, accept/reject, QR/check-in, completion,
documents, schedule, earnings, availability/profile, and push notifications.

## User Roles

Partner.

## Screens / Pages

Verified route areas include auth, tabs for jobs/index, schedule, earnings,
profile, job detail, service-job detail, documents, help, and notifications.

## APIs

Partner profile, availability, job/order-item job, evidence/document, earnings,
payout, notification, and support-related APIs.

## Important Source Files

- `apps/mobile-partner/app/_layout.tsx`
- `apps/mobile-partner/app/(tabs)/jobs.tsx`
- `apps/mobile-partner/app/(tabs)/schedule.tsx`
- `apps/mobile-partner/app/(tabs)/earnings.tsx`
- `apps/mobile-partner/app/job/[id].tsx`
- `apps/mobile-partner/app/service-job/[id].tsx`
- `apps/mobile-partner/context/AuthContext.tsx`
- `apps/mobile-partner/lib/api.ts`
- `apps/mobile-partner/lib/pushNotifications.ts`

## Current Behavior

Supports partner job acceptance/check-in/completion, documents, schedule,
earnings, profile, and notifications.

## Known Issues

Exact mobile navigation guards and per-item job rendering are
`UNKNOWN — REQUIRES VERIFICATION`.

## Important Constraints

Partner access and status transitions must remain server-authorized.

## Related Modules

Partner Web, dispatch, orders, payouts, documents, notifications.
