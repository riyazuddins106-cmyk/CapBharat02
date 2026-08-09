# Known Issues

Only verified limitations or areas needing verification are recorded here.

## Issue: Test runner command not verified

Severity: Medium  
Affected Module: Testing  
Current Behavior: E2E TypeScript files exist, but no test script/runner was
found in inspected manifests.  
Expected Behavior: A documented reproducible test command.  
Known Cause: No configured command was visible.  
Workaround: UNKNOWN — REQUIRES VERIFICATION  
Status: Open; not changed by documentation task.  
Related Files: `server/src/e2e/`, `package.json`, `server/package.json`

## Issue: Legacy and itemized order parity is not fully verified

Severity: Medium  
Affected Module: Booking/orders  
Current Behavior: Both models and route families exist.  
Expected Behavior: Clear documented ownership for every customer/admin/partner
workflow.  
Known Cause: Parallel legacy and newer implementations.  
Workaround: Follow the relevant controller/schema source path.  
Status: Open; not changed by documentation task.  
Related Files: `server/src/database/schema/bookings.ts`,
`orders.ts`, `orderItems.ts`

## Issue: Production integration state is unknown

Severity: Medium  
Affected Module: Deployment/integrations  
Current Behavior: Provider code and environment variable names exist.  
Expected Behavior: Verified production webhook, bucket, SMTP, SMS, and payout
configuration.  
Known Cause: External account/deployment state is not represented by source.  
Workaround: Verify in the target environment without exposing values.  
Status: UNKNOWN — REQUIRES VERIFICATION  
Related Files: `.replit`, `server/src/config/`, `server/src/controllers/payment.controller.ts`
