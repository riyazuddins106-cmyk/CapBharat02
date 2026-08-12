# Partner Dispatch and Service Workflow

## Trigger

A booking/order item needs a partner.

## Preconditions

The item is dispatchable, the partner is active/eligible, and the partner has
the required service capability/availability.

## Step-by-step flow

1. Dispatch identifies eligible partners using an explicit service capability
   link and operational data. The partner profile sub-category is not an
   additional hard filter after the service link has matched; otherwise a
   valid service request can be created but hidden from the partner.
2. The backend creates/broadcasts a partner request.
3. Partner accepts or rejects.
4. On acceptance, the item/booking stores assignment.
5. Partner checks in/arrives using the job or QR flow.
6. Payment/confirmation state is updated as required.
7. Partner completes the job and may submit evidence.
8. Order/item status is recomputed and earnings become eligible for payout.

## API Calls

Legacy `/api/partner/jobs/*` and new
`/api/partner/order-item-jobs/*`; admin dispatch routes are under
`/api/operations/dispatch`.

## Database Changes

Booking/order item, partner request, assignment log, evidence, payment, and
professional availability records can change.

## Notifications

Partner/customer notifications are emitted by notification services where
configured.

## Business Rules

Dispatch is platform-controlled; customers do not select a professional.
Partner availability and service capability are prerequisites.

## Final State

Assigned/accepted, in-service, completed, cancelled, or searching state.

## Error Scenarios

Partner rejection, no eligible partner, invalid state transition, unauthorized
role, QR/check-in failure, and payment failure.

## Related Source Files

`server/src/services/dispatch.service.ts`,
`server/src/services/orderDispatch.service.ts`,
`server/src/controllers/partner.controller.ts`,
`server/src/routes/partner.routes.ts`.
