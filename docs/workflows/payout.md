# Partner Payout Workflow

## Trigger

A partner requests payout or the payout scheduler processes eligible requests.

## Preconditions

Partner account and payout record are valid; any configured caps/approval state
must permit processing.

## Step-by-step flow

1. Partner submits a payout request.
2. Admin/scheduler reviews and claims eligible work.
3. Provider payout processing is attempted where configured.
4. Request and payout-run counters/status are updated.
5. Failure details are persisted for recovery or review.

## API Calls

Partner `/earnings` and `/payouts` routes plus admin payout routes.

## Database Changes

`payout_requests`, `payout_runs`, and partner earnings-related records.

## Notifications

Exact payout notification events are `UNKNOWN — REQUIRES VERIFICATION`.

## Business Rules

Partner earnings use completed paid work and stored partner payout values, not
the customer-facing total.

## Final State

Payout request becomes pending, approved, processing, paid, or rejected.

## Error Scenarios

Invalid request, insufficient eligible earnings, provider failure, concurrent
claim, and rejected approval.

## Related Source Files

`server/src/services/payoutScheduler.service.ts`,
`server/src/services/razorpayPayout.service.ts`,
`server/src/database/schema/payoutRequests.ts`.
