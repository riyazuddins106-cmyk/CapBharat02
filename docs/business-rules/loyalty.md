# Loyalty Rules

RULE ID: LOYALTY-001  
RULE NAME: Points are ledger entries  
CURRENT BEHAVIOR: Earn, redeem, and adjust entries are stored in `points_ledger`; customers can request redemption through `/api/points/redeem`.  
APPLIES TO: Customer loyalty/rewards.  
EXCEPTIONS: Exact earn/redeem rates and minimums are `UNKNOWN — REQUIRES VERIFICATION` in current source inspection.  
SOURCE FILES: `server/src/database/schema/pointsLedger.ts`, `server/src/controllers/points.controller.ts`, `server/src/services/points.service.ts`  
RELATED MODULE: Customer engagement  
RELATED WORKFLOW: Booking/order and points redemption.
