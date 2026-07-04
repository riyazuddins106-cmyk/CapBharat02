/**
 * Full end-to-end test script.
 * Run: pnpm --filter @servenow/server tsx src/database/test.ts
 */
import 'dotenv/config';

const BASE = `http://localhost:${process.env.PORT ?? 8000}/api`;

let passed = 0;
let failed = 0;

async function req(
  method: string,
  path: string,
  body?: unknown,
  token?: string,
): Promise<{ status: number; data: any }> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, data: json };
}

function ok(label: string, pass: boolean, detail = '') {
  if (pass) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

/* ── helpers ── */
import postgres from 'postgres';
const sql = postgres(process.env.SUPABASE_DATABASE_URL!, { ssl: 'require', max: 1 });

async function getOtp(email: string, purpose: string): Promise<string | null> {
  const rows = await sql`
    SELECT code_hash FROM otp_codes
    WHERE email = ${email} AND purpose = ${purpose} AND consumed_at IS NULL
    ORDER BY created_at DESC LIMIT 1
  `;
  return rows[0]?.code_hash ?? null;
}

async function getLatestOtpPlaintext(email: string, purpose: string): Promise<string> {
  // We can't reverse bcrypt, so we patch: insert a known OTP directly
  const known = '123456';
  const bcrypt = (await import('bcryptjs')).default;
  const hash = await bcrypt.hash(known, 10);
  await sql`
    UPDATE otp_codes SET code_hash = ${hash}
    WHERE email = ${email} AND purpose = ${purpose} AND consumed_at IS NULL
  `;
  return known;
}

async function cleanup(email: string) {
  await sql`DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE email = ${email})`;
  await sql`DELETE FROM bookings       WHERE customer_id IN (SELECT id FROM users WHERE email = ${email})`;
  await sql`DELETE FROM favorites      WHERE customer_id IN (SELECT id FROM users WHERE email = ${email})`;
  await sql`DELETE FROM addresses      WHERE user_id IN (SELECT id FROM users WHERE email = ${email})`;
  await sql`DELETE FROM otp_codes      WHERE email = ${email}`;
  await sql`DELETE FROM users          WHERE email = ${email}`;
}

/* ──────────────────────────────────────────────────────────
   TEST SUITE
────────────────────────────────────────────────────────── */
async function run() {
  const email = `test_${Date.now()}@servenow.dev`;
  const password = 'Test@12345';
  let accessToken = '';
  let refreshToken = '';
  let userId = '';
  let addressId = '';
  let bookingId = '';
  let professionalId = '';
  let categoryId = '';

  console.log('\n══════════════════════════════════════════');
  console.log('  ServeNow — Full API Test Suite');
  console.log('══════════════════════════════════════════\n');

  /* ── 1. Health ── */
  console.log('── Health ──');
  {
    const r = await req('GET', '/health');
    ok('GET /health returns 200', r.status === 200);
    ok('status is ok', r.data?.data?.status === 'ok');
  }

  /* ── 2. Auth — Register ── */
  console.log('\n── Auth: Register ──');
  {
    const r = await req('POST', '/auth/register', {
      fullName: 'Test User',
      email,
      password,
      phone: '+919876543210',
    });
    ok('POST /auth/register returns 201', r.status === 201, JSON.stringify(r.data));
    ok('returns userId', !!r.data?.data?.userId);
    userId = r.data?.data?.userId;
  }

  /* ── 3. Auth — Verify OTP (signup) ── */
  console.log('\n── Auth: OTP Verification ──');
  {
    const code = await getLatestOtpPlaintext(email, 'signup');
    const r = await req('POST', '/auth/verify-otp', { email, code, purpose: 'signup' });
    ok('POST /auth/verify-otp returns 200', r.status === 200, JSON.stringify(r.data));
    ok('returns accessToken', !!r.data?.data?.accessToken);
    ok('returns refreshToken', !!r.data?.data?.refreshToken);
    ok('returns user object', !!r.data?.data?.user?.id);
    accessToken = r.data?.data?.accessToken;
    refreshToken = r.data?.data?.refreshToken;
  }

  /* ── 4. Auth — Login ── */
  console.log('\n── Auth: Login ──');
  {
    const r = await req('POST', '/auth/login', { email, password });
    ok('POST /auth/login returns 200', r.status === 200, JSON.stringify(r.data));
    ok('returns tokens', !!r.data?.data?.accessToken && !!r.data?.data?.refreshToken);
    accessToken = r.data?.data?.accessToken;
    refreshToken = r.data?.data?.refreshToken;
  }

  /* ── 5. Auth — Refresh Token ── */
  console.log('\n── Auth: Refresh Token ──');
  {
    const r = await req('POST', '/auth/refresh', { refreshToken });
    ok('POST /auth/refresh returns 200', r.status === 200, JSON.stringify(r.data));
    ok('returns new accessToken', !!r.data?.data?.accessToken);
    accessToken = r.data?.data?.accessToken;
    refreshToken = r.data?.data?.refreshToken;
  }

  /* ── 6. Auth — Forgot Password ── */
  console.log('\n── Auth: Forgot / Reset Password ──');
  {
    const r = await req('POST', '/auth/forgot-password', { email });
    ok('POST /auth/forgot-password returns 200', r.status === 200);
    const code = await getLatestOtpPlaintext(email, 'password_reset');
    const r2 = await req('POST', '/auth/reset-password', {
      email,
      code,
      newPassword: 'NewPass@99',
    });
    ok('POST /auth/reset-password returns 200', r2.status === 200, JSON.stringify(r2.data));
    // log back in with new password
    const r3 = await req('POST', '/auth/login', { email, password: 'NewPass@99' });
    ok('Login with new password works', r3.status === 200);
    accessToken = r3.data?.data?.accessToken;
    refreshToken = r3.data?.data?.refreshToken;
  }

  /* ── 7. Profile ── */
  console.log('\n── Profile ──');
  {
    const r = await req('GET', '/profile/me', undefined, accessToken);
    ok('GET /profile/me returns 200', r.status === 200, JSON.stringify(r.data));
    ok('returns full user data', r.data?.data?.email === email);

    const r2 = await req('PATCH', '/profile/me', { fullName: 'Updated Name' }, accessToken);
    ok('PATCH /profile/me returns 200', r2.status === 200, JSON.stringify(r2.data));
    ok('fullName updated', r2.data?.data?.fullName === 'Updated Name');
  }

  /* ── 8. Categories ── */
  console.log('\n── Categories ──');
  {
    const r = await req('GET', '/categories');
    ok('GET /categories returns 200', r.status === 200);
    ok('returns array of categories', Array.isArray(r.data?.data) && r.data.data.length > 0);
    categoryId = r.data?.data?.[0]?.id;
  }

  /* ── 9. Professionals ── */
  console.log('\n── Professionals ──');
  {
    const r = await req('GET', '/professionals');
    ok('GET /professionals returns 200', r.status === 200);
    ok('returns professionals list', Array.isArray(r.data?.data) && r.data.data.length > 0);
    professionalId = r.data?.data?.[0]?.id;

    const r2 = await req('GET', `/professionals?categoryId=${categoryId}`);
    ok('GET /professionals?categoryId= filters correctly', r2.status === 200);

    const r3 = await req('GET', `/professionals?search=Priya`);
    ok('GET /professionals?search= works', r3.status === 200);

    const r4 = await req('GET', `/professionals/${professionalId}`);
    ok('GET /professionals/:id returns 200', r4.status === 200);
    ok('returns professional detail', !!r4.data?.data?.id);
  }

  /* ── 10. Addresses ── */
  console.log('\n── Addresses ──');
  {
    const r = await req('POST', '/addresses', {
      label: 'Home',
      line1: '12 MG Road',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400001',
      country: 'India',
      isDefault: true,
    }, accessToken);
    ok('POST /addresses returns 201', r.status === 201, JSON.stringify(r.data));
    ok('returns address id', !!r.data?.data?.id);
    addressId = r.data?.data?.id;

    const r2 = await req('GET', '/addresses', undefined, accessToken);
    ok('GET /addresses returns 200', r2.status === 200);
    ok('address list has 1 entry', r2.data?.data?.length === 1);

    const r3 = await req('PATCH', `/addresses/${addressId}`, { label: 'Office' }, accessToken);
    ok('PATCH /addresses/:id returns 200', r3.status === 200);
    ok('label updated to Office', r3.data?.data?.label === 'Office');
  }

  /* ── 11. Bookings ── */
  console.log('\n── Bookings ──');
  {
    const scheduledAt = new Date(Date.now() + 86400000).toISOString(); // tomorrow
    const r = await req('POST', '/bookings', {
      professionalId,
      scheduledAt,
      notes: 'Please bring cleaning supplies.',
      addressId,
    }, accessToken);
    ok('POST /bookings returns 201', r.status === 201, JSON.stringify(r.data));
    ok('returns booking id', !!r.data?.data?.id);
    bookingId = r.data?.data?.id;

    const r2 = await req('GET', '/bookings', undefined, accessToken);
    ok('GET /bookings returns 200', r2.status === 200);
    ok('booking list has 1 entry', r2.data?.data?.length >= 1);

    const r3 = await req('GET', `/bookings/${bookingId}`, undefined, accessToken);
    ok('GET /bookings/:id returns 200', r3.status === 200);

    const newTime = new Date(Date.now() + 2 * 86400000).toISOString();
    const r4 = await req('PATCH', `/bookings/${bookingId}/reschedule`, { scheduledAt: newTime }, accessToken);
    ok('PATCH /bookings/:id/reschedule returns 200', r4.status === 200, JSON.stringify(r4.data));
  }

  /* ── 12. Reviews ── */
  console.log('\n── Reviews ──');
  {
    // Force booking to completed so a review can be submitted
    await sql`UPDATE bookings SET status = 'completed' WHERE id = ${bookingId}`;
    const r = await req('POST', '/reviews', {
      bookingId,
      rating: 5,
      comment: 'Excellent service! Very professional.',
    }, accessToken);
    ok('POST /reviews returns 201', r.status === 201, JSON.stringify(r.data));
    ok('returns review id', !!r.data?.data?.id);

    const r2 = await req('GET', `/professionals/${professionalId}`);
    ok('GET /professionals/:id includes reviews', Array.isArray(r2.data?.data?.reviews));
  }

  /* ── 13. Favorites ── */
  console.log('\n── Favorites ──');
  {
    const r = await req('POST', `/favorites/${professionalId}`, undefined, accessToken);
    ok('POST /favorites/:id toggles on (201)', r.status === 201, JSON.stringify(r.data));
    ok('isFavorite is true', r.data?.data?.isFavorite === true);

    const r2 = await req('GET', '/favorites', undefined, accessToken);
    ok('GET /favorites returns 200', r2.status === 200);
    ok('favorites list has 1 entry', r2.data?.data?.length === 1);

    const r3 = await req('POST', `/favorites/${professionalId}`, undefined, accessToken);
    ok('POST /favorites/:id toggles off (200)', r3.status === 200);
    ok('isFavorite is false', r3.data?.data?.isFavorite === false);
  }

  /* ── 14. Booking Cancel ── */
  console.log('\n── Booking Cancel ──');
  {
    // Create a fresh booking to cancel
    const scheduledAt = new Date(Date.now() + 86400000).toISOString();
    const rb = await req('POST', '/bookings', { professionalId, scheduledAt }, accessToken);
    const bid = rb.data?.data?.id;
    const r = await req('PATCH', `/bookings/${bid}/cancel`, undefined, accessToken);
    ok('PATCH /bookings/:id/cancel returns 200', r.status === 200, JSON.stringify(r.data));
    ok('status is cancelled', r.data?.data?.status === 'cancelled');
  }

  /* ── 15. Auth — Logout ── */
  console.log('\n── Auth: Logout ──');
  {
    const r = await req('POST', '/auth/logout', { refreshToken }, accessToken);
    ok('POST /auth/logout returns 200', r.status === 200);

    // Confirm token is invalidated
    const r2 = await req('POST', '/auth/refresh', { refreshToken });
    ok('Refresh token rejected after logout', r2.status === 401);
  }

  /* ── 16. Auth guard ── */
  console.log('\n── Auth Guard ──');
  {
    const r = await req('GET', '/profile/me'); // no token
    ok('GET /profile/me without token returns 401', r.status === 401);
    const r2 = await req('GET', '/profile/me', undefined, 'bad.token.here');
    ok('GET /profile/me with bad token returns 401', r2.status === 401);
  }

  /* ── Cleanup ── */
  await cleanup(email);
  await sql.end();

  /* ── Summary ── */
  const total = passed + failed;
  console.log('\n══════════════════════════════════════════');
  console.log(`  Results: ${passed}/${total} passed  ${failed > 0 ? `(${failed} failed)` : '🎉'}`);
  console.log('══════════════════════════════════════════\n');
  if (failed > 0) process.exit(1);
}

run().catch((e) => {
  console.error('Test runner crashed:', e.message);
  process.exit(1);
});
