# Authentication and Access Rules

RULE ID: AUTH-001  
RULE NAME: Bearer access token required  
CURRENT BEHAVIOR: Protected routes reject requests without a Bearer token or with an invalid/expired token.  
APPLIES TO: Routes using `authenticate`.  
EXCEPTIONS: Public and optional-auth routes.  
SOURCE FILES: `server/src/middleware/authenticate.ts`  
RELATED MODULE: Authentication  
RELATED WORKFLOW: [`../workflows/registration-login.md`](../workflows/registration-login.md)

RULE ID: AUTH-002  
RULE NAME: Role checks follow authentication  
CURRENT BEHAVIOR: `requireRole` checks the role embedded in `req.user` after authentication.  
APPLIES TO: Admin, partner, and operations routes.  
EXCEPTIONS: Route-specific declarations determine allowed roles.  
SOURCE FILES: `server/src/middleware/requireRole.ts`, `server/src/routes/*.routes.ts`  
RELATED MODULE: Authentication  
RELATED WORKFLOW: [`../workflows/registration-login.md`](../workflows/registration-login.md)
