# Known Issues

Only verified limitations or areas needing verification are recorded here.

## Issue: No unified test runner or lint automation

Severity: Medium  
Affected Module: Testing  
Current Behavior: Individual CRUD, E2E, payment, Admin browser, build, and mobile
type-check commands are reproducible and verified, but no single root `test`,
lint, or CI command is configured.
Expected Behavior: One maintained command for the complete regression suite.
Known Cause: The repository exposes separate scripts rather than a unified
runner.
Workaround: Run the documented commands in `docs/08-TESTING.md` serially.
Status: NOT TESTED — unified automation has not been added or verified.
Related Files: `server/src/e2e/`, `package.json`, `server/package.json`

## Issue: Legacy and itemized order parity is not fully verified

Severity: Medium  
Affected Module: Booking/orders  
Current Behavior: Both models and route families exist.  
Expected Behavior: Clear documented ownership for every customer/admin/partner
workflow.  
Known Cause: Parallel legacy and newer implementations.  
Workaround: Follow the relevant controller/schema source path.  
Status: PARTIALLY FIXED — both models are operational and documented, but some
write-flow parity scenarios remain `NOT TESTED`.
Related Files: `server/src/database/schema/bookings.ts`,
`orders.ts`, `orderItems.ts`

## Issue: Live provider and production integration verification is blocked

Severity: Medium  
Affected Module: Deployment/integrations  
Current Behavior: Provider code and environment variable names exist. Application
state-level payment/payout checks pass, but live gateway transactions, refunds,
transfers, and production webhook configuration were not verified.
Expected Behavior: Safe provider-backed verification in the target environment.
Known Cause: External provider credentials, test transactions, and deployment
configuration are outside the repository.
Workaround: Configure a safe provider test environment without exposing values.
Status: BLOCKED
Related Files: `.replit`, `server/src/config/`, `server/src/controllers/payment.controller.ts`

## Issue: Selected write-flow coverage remains not tested

Severity: Low
Affected Module: Uploads, reviews, and Admin management
Current Behavior: Read paths, validation, and surrounding workflows are verified;
disposable binary uploads, review creation/moderation, partner issue/evidence
creation, and Admin account mutations were not run in the final QA pass.
Expected Behavior: Each write flow is exercised against disposable records and
cleaned up.
Known Cause: The final pass avoided mutating live operational records.
Workaround: Use disposable fixtures and verify cleanup.
Status: NOT TESTED
Related Files: `server/src/routes/partner.routes.ts`,
`server/src/routes/review.routes.ts`, `server/src/controllers/admin.controller.ts`
