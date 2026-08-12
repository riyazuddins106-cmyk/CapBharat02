---
name: Account identity settings
description: ServeNow account identity rules for immutable usernames and verified contact changes.
---

Usernames are generated once, normalized, and protected by a database-wide unique
constraint across customer, partner, admin, and operations accounts. They are
displayed read-only; there is no username edit path.

**Why:** Email is the login identity, and the application has separate web/mobile
and Admin-managed account update paths. Allowing any one of them to update email
or phone directly would bypass verification.

**How to apply:** Bind every contact-change OTP to the proposed target and user,
verify it through the authenticated identity endpoint, then update the user and
refresh local/auth state. Keep generic profile/account mutations limited to
non-identity fields.