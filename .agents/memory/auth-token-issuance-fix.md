---
name: Refresh token issuance bug (fixed)
description: Critical bug in issueTokenPair where returned JWT and stored hash referred to different token IDs, breaking all refresh token flows.
---

# Refresh Token Issuance Bug — Fixed

## The Bug
`issueTokenPair()` (server/src/services/auth.service.ts) had a broken flow:
1. Created a DB record → got ID_1
2. Signed JWT with `tokenId = ID_1`
3. Hashed that JWT
4. **Revoked** ID_1
5. Created a NEW record with the hash → got ID_2
6. Signed and returned a **new** JWT with `tokenId = ID_2`

Result: stored hash was of the JWT with ID_1, but the returned JWT had ID_2. `bcrypt.compare` on refresh always failed.

## The Fix
- Added `refreshTokenRepository.updateHash(id, hash)` to update the placeholder record in place.
- `issueTokenPair` now: create placeholder → sign JWT with its ID → hash that exact JWT → updateHash → return that JWT.
- Added `isActive` check in `refresh()` to prevent disabled accounts from refreshing.

**Why:** The two-step create+revoke+create pattern was trying to avoid needing an update method, but created a tokenId mismatch. The correct pattern requires updating the same record.
