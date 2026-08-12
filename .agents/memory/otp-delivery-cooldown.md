---
name: OTP delivery and resend cooldown
description: ServeNow OTP resend, expiry, and development email-provider behavior.
---

OTP resend must be limited to 60 seconds per email and purpose on the server,
not only disabled in the client. Issuing a new code should invalidate older
active codes, and verification must compare the configured expiry timestamp.

**Why:** The OTP screen previously allowed immediate repeated sends, while the
development server used Ethereal. Ethereal accepts test messages but does not
deliver them to the user's real Gmail inbox, which looked like a broken email
flow.

**How to apply:** Keep the client countdown aligned with the server's
`retryAfterSeconds`/timing response. In non-production, expose the development
code clearly; before real inbox testing, configure SMTP or SendGrid through the
Admin email settings. For Gmail SMTP, the password must be a Google
App Password with 2-Step Verification enabled, not the normal Gmail password.
After transport negotiation succeeds, invalid credentials return Gmail
`535-5.7.8 Username and Password not accepted`. Never expose development codes
in production. Gmail delivery was subsequently confirmed with an App Password
using port 587/STARTTLS.

## Gmail acceptance versus inbox arrival
The app's Gmail SMTP configuration verified successfully and Gmail returned
`250 2.0.0 OK` with the recipient in the `accepted` list for both a delivery
test and OTP sends.

**Why:** SMTP acceptance proves the message left ServeNow's transport, but it
does not guarantee inbox placement; Gmail may route it to Spam, Promotions,
All Mail, or delay it.

**How to apply:** Keep checking the server's accepted/rejected result and ask
the user to search Gmail for the exact subject/sender. In development, show
the returned `devCode` on every OTP screen; never include that fallback in
production responses.