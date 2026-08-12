# Dispatch and Partner Rules

RULE ID: PARTNER-001  
RULE NAME: Partner capability and availability matter  
CURRENT BEHAVIOR: Partner service links and operational availability are used by partner/dispatch flows. A service link is the authoritative capability match; a profile sub-category label is descriptive and must not override an explicit service link.
APPLIES TO: Dispatch and partner jobs.  
EXCEPTIONS: Admin routes can manually operate on assignments.  
SOURCE FILES: `server/src/database/schema/partnerServices.ts`, `server/src/services/dispatch.service.ts`  
RELATED MODULE: Dispatch  
RELATED WORKFLOW: [`../workflows/partner-dispatch-service.md`](../workflows/partner-dispatch-service.md)

RULE ID: PARTNER-002  
RULE NAME: Customer price is not partner payout  
CURRENT BEHAVIOR: Order items and catalog services store customer price and partner payout separately.  
APPLIES TO: Earnings and payout accounting.  
EXCEPTIONS: Exact legacy fallback is `UNKNOWN — REQUIRES VERIFICATION`.  
SOURCE FILES: `server/src/database/schema/orderItems.ts`, `server/src/services/payoutScheduler.service.ts`  
RELATED MODULE: Payments and payouts  
RELATED WORKFLOW: [`../workflows/payout.md`](../workflows/payout.md)
