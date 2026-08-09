# Payment and Pricing Rules

RULE ID: PAY-001  
RULE NAME: Webhook signatures must be verified  
CURRENT BEHAVIOR: Raw request bodies are captured for Razorpay/Stripe signature verification.  
APPLIES TO: Payment webhooks.  
EXCEPTIONS: Test/manual payment paths do not use provider webhooks.  
SOURCE FILES: `server/src/app.ts`, `server/src/controllers/payment.controller.ts`  
RELATED MODULE: Payments  
RELATED WORKFLOW: [`../workflows/payment.md`](../workflows/payment.md)

RULE ID: PAY-002  
RULE NAME: Payment has explicit lifecycle status  
CURRENT BEHAVIOR: Legacy payment status enum is `created`, `paid`, `failed`, or `refunded`.  
APPLIES TO: `payments`.  
EXCEPTIONS: Itemized payment state has its own schema/controller behavior.  
SOURCE FILES: `server/src/database/schema/payments.ts`  
RELATED MODULE: Payments  
RELATED WORKFLOW: [`../workflows/payment.md`](../workflows/payment.md)
