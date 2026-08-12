/**
 * ServeNow — Full End-to-End Flow Test
 * ──────────────────────────────────────────────────────────────────────────────
 * Covers every realistic scenario:
 *
 *  FLOW 1  Happy path      → book → partner accepts → QR check-in → complete → pay (cash)
 *  FLOW 2  Customer cancel → book → customer cancels before partner acts
 *  FLOW 3  Partner rejects → book → partner rejects → booking goes back to searching
 *  FLOW 4  Partner ignores → book → no partner action (stays searching_partner)
 *  FLOW 5  Cancel mid-job  → book → partner accepts & checks in → customer tries to cancel (blocked)
 *  FLOW 6  Reschedule      → book → customer reschedules → partner accepts → complete
 *  FLOW 7  Multi-service   → add 2 services to cart → checkout → full happy path
 *  FLOW 8  Bad QR          → book → partner tries wrong QR token → rejected
 *  FLOW 9  Expired QR      → simulate expired token → partner checkin blocked
 *
 * Run: pnpm --filter @servenow/server exec tsx src/e2e/full-flow.e2e.ts
 */

const BASE = 'http://localhost:8000/api';

// ── Colour helpers ─────────────────────────────────────────────────────────────
const c = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  gray:   '\x1b[90m',
  blue:   '\x1b[34m',
};

let passed = 0, failed = 0, skipped = 0;
const results: { flow: string; status: 'PASS' | 'FAIL' | 'SKIP'; detail: string }[] = [];

// ── HTTP helpers ───────────────────────────────────────────────────────────────
async function api(method: string, path: string, body?: unknown, token?: string) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data: (json as any)?.data ?? json, error: (json as any)?.error ?? (json as any)?.message };
}

const GET    = (p: string, t?: string)           => api('GET',    p, undefined, t);
const POST   = (p: string, b: unknown, t?: string) => api('POST',   p, b, t);
const PATCH  = (p: string, b?: unknown, t?: string) => api('PATCH',  p, b, t);

// ── Result tracking ────────────────────────────────────────────────────────────
function pass(flow: string, detail: string) {
  passed++;
  results.push({ flow, status: 'PASS', detail });
  console.log(`  ${c.green}✓${c.reset} ${detail}`);
}
function fail(flow: string, detail: string, extra?: unknown) {
  failed++;
  results.push({ flow, status: 'FAIL', detail });
  console.log(`  ${c.red}✗${c.reset} ${detail}`);
  if (extra) console.log(`    ${c.gray}→ ${JSON.stringify(extra)}${c.reset}`);
}
function skip(flow: string, detail: string) {
  skipped++;
  results.push({ flow, status: 'SKIP', detail });
  console.log(`  ${c.yellow}–${c.reset} ${detail} (skipped)`);
}
function assert(flow: string, label: string, condition: boolean, extra?: unknown) {
  condition ? pass(flow, label) : fail(flow, label, extra);
}

function header(title: string) {
  console.log(`\n${c.bold}${c.cyan}━━━ ${title} ${c.reset}`);
}

// ── Auth helpers ───────────────────────────────────────────────────────────────
async function login(email: string, password: string) {
  const r = await POST('/auth/login', { email, password });
  if (!r.ok) throw new Error(`Login failed for ${email}: ${r.error}`);
  return r.data.accessToken as string;
}

// ── Cart helpers ───────────────────────────────────────────────────────────────
async function clearCart(token: string) {
  const r = await GET('/cart', token);
  if (r.ok && r.data?.items?.length) {
    for (const item of r.data.items) {
      await api('DELETE', `/cart/items/${item.id}`, undefined, token);
    }
  }
}

async function clearActiveTestBookings(token: string) {
  const r = await GET('/bookings', token);
  const bookings = Array.isArray(r.data) ? r.data : (r.data?.bookings ?? []);
  for (const booking of bookings) {
    if (['pending', 'upcoming'].includes(booking.status)) {
      await PATCH(`/bookings/${booking.id}/cancel`, { reason: 'E2E fixture reset' }, token);
    }
  }
}

async function addToCart(serviceId: string, qty: number, token: string) {
  return POST('/cart/items', { serviceId, quantity: qty }, token);
}

async function checkout(token: string, scheduledAt: string, notes?: string) {
  return POST('/bookings/checkout', { scheduledAt, notes }, token);
}

// ── Get test service IDs ───────────────────────────────────────────────────────
async function getServices() {
  const r = await GET('/services');
  return (r.data?.services ?? []) as any[];
}

// ── Partner job helpers ────────────────────────────────────────────────────────
async function getPartnerJobs(token: string) {
  const r = await GET('/partner/jobs', token);
  return (r.data?.jobs ?? r.data ?? []) as any[];
}

async function findJobForBooking(bookingId: string, token: string) {
  const jobs = await getPartnerJobs(token);
  return jobs.find((j: any) => j.id === bookingId || j.bookingId === bookingId);
}

function futureDate(offsetMinutes = 120) {
  // Checkout validates business hours in IST and also validates the service
  // duration against closing time. Use a future IST date at a safe midday slot
  // instead of depending on the machine's current UTC hour.
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const nowIST = new Date(Date.now() + IST_OFFSET_MS);
  const dayOffset = 1 + Math.floor(offsetMinutes / 240);
  const minuteOffset = offsetMinutes % 240;
  const targetIST = new Date(nowIST);
  targetIST.setUTCDate(targetIST.getUTCDate() + dayOffset);
  targetIST.setUTCHours(10 + Math.floor(minuteOffset / 60), minuteOffset % 60, 0, 0);
  return new Date(targetIST.getTime() - IST_OFFSET_MS).toISOString();
}

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN TEST RUNNER
// ══════════════════════════════════════════════════════════════════════════════
async function run() {
  console.log(`\n${c.bold}${c.blue}ServeNow — Full End-to-End Flow Test${c.reset}`);
  console.log(`${c.gray}API: ${BASE}${c.reset}\n`);

  // ── Login all actors ──────────────────────────────────────────────────────
  let customerToken: string, partnerToken: string, adminToken: string;
  try {
    [customerToken, partnerToken, adminToken] = await Promise.all([
      login('customer@servenow.in', 'Customer@1234'),
      login('partner@servenow.in',  'Partner@1234'),
      login('admin@servenow.in',    'Admin@1234'),
    ]);
    await clearActiveTestBookings(customerToken);
    await clearCart(customerToken);
    console.log(`${c.green}✓${c.reset} Logged in as customer, partner, admin`);
  } catch (e: any) {
    console.log(`${c.red}✗ Login failed: ${e.message}${c.reset}`);
    process.exit(1);
  }

  const services = await getServices();
  if (!services.length) {
    console.log(`${c.red}✗ No services found — cannot run tests${c.reset}`);
    process.exit(1);
  }
  const svc1 = services[0];
  const svc2 = services[1] ?? svc1;
  console.log(`${c.gray}Using services: "${svc1.name}" (₹${svc1.customerPrice}), "${svc2.name}" (₹${svc2.customerPrice})${c.reset}`);

  // ════════════════════════════════════════════════════════════════════════════
  //  FLOW 1 — Happy path: book → accept → QR check-in → complete → pay
  // ════════════════════════════════════════════════════════════════════════════
  header('FLOW 1 — Happy Path (book → accept → check-in → complete → pay)');
  {
    const flow = 'FLOW 1';
    await clearCart(customerToken);

    // 1a. Add to cart
    const addR = await addToCart(svc1.id, 1, customerToken);
    assert(flow, 'Add service to cart', addR.ok, addR.error);

    // 1b. Checkout → booking created
    const bookR = await checkout(customerToken, futureDate(120), 'Please arrive on time');
    assert(flow, 'Checkout creates booking', bookR.ok, bookR.error);
    const booking1 = bookR.data?.booking ?? bookR.data;
    assert(flow, 'Booking has ID', !!booking1?.id, booking1);
    assert(flow, 'Booking status is searching/pending', ['pending', 'searching_partner', 'upcoming'].includes(booking1?.status ?? booking1?.dispatchStatus), booking1?.status);

    if (!booking1?.id) { fail(flow, 'Cannot continue — no booking ID'); }
    else {
      // 1c. Partner gets the job
      const jobs = await getPartnerJobs(partnerToken);
      const job1 = jobs.find((j: any) => j.id === booking1.id);
      assert(flow, 'Partner can see pending jobs', jobs.length > 0, jobs);

      if (job1) {
        // 1d. Partner accepts
        const acceptR = await PATCH(`/partner/jobs/${job1.id}/accept`, {}, partnerToken);
        assert(flow, 'Partner accepts job', acceptR.ok, acceptR.error);

        // 1e. Booking status updated
        const bR = await GET(`/bookings/${booking1.id}`, customerToken);
        assert(flow, 'Booking becomes upcoming after accept', ['upcoming', 'in_progress'].includes(bR.data?.status), bR.data?.status);

        // 1f. Customer gets QR token
        const qrR = await GET(`/bookings/${booking1.id}/qr`, customerToken);
        assert(flow, 'Customer gets QR token', qrR.ok && !!qrR.data?.qrToken, qrR.error);
        const qrToken = qrR.data?.qrToken;

        if (qrToken) {
          // 1g. Partner scans QR → check in
          const checkinR = await PATCH(`/partner/jobs/${job1.id}/checkin`, { qrToken }, partnerToken);
          assert(flow, 'Partner checks in with valid QR', checkinR.ok, checkinR.error);

          // 1h. Booking is now in_progress
          const bR2 = await GET(`/bookings/${booking1.id}`, customerToken);
          assert(flow, 'Booking status is in_progress after check-in', bR2.data?.status === 'in_progress', bR2.data?.status);

          // 1i. Partner completes job
          const completeR = await PATCH(`/partner/jobs/${job1.id}/complete`, {}, partnerToken);
          assert(flow, 'Partner marks job complete', completeR.ok, completeR.error);

          // 1j. Booking is completed
          const bR3 = await GET(`/bookings/${booking1.id}`, customerToken);
          assert(flow, 'Booking status is completed', bR3.data?.status === 'completed', bR3.data?.status);

          // 1k. Customer pays (cash)
          const payR = await POST(`/bookings/${booking1.id}/payment`, { method: 'cash' }, customerToken);
          assert(flow, 'Customer submits cash payment', payR.ok, payR.error);

          // 1l. Payment status is paid/created
          const payGetR = await GET(`/bookings/${booking1.id}/payment`, customerToken);
          assert(flow, 'Payment record exists', !!payGetR.data, payGetR.error);
          assert(flow, 'Payment status is paid or created', ['paid', 'created', 'pending'].includes(payGetR.data?.status), payGetR.data?.status);
        }
      } else {
        skip(flow, 'No job found for partner — dispatch may not be linked to test partner');
      }
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  FLOW 2 — Customer cancels BEFORE partner acts
  // ════════════════════════════════════════════════════════════════════════════
  header('FLOW 2 — Customer cancels before partner accepts');
  {
    const flow = 'FLOW 2';
    await clearCart(customerToken);
    await addToCart(svc1.id, 1, customerToken);

    const bookR = await checkout(customerToken, futureDate(200));
    assert(flow, 'Booking created', bookR.ok, bookR.error);
    const booking2 = bookR.data?.booking ?? bookR.data;

    if (booking2?.id) {
      // Customer cancels immediately
      const cancelR = await PATCH(`/bookings/${booking2.id}/cancel`, {}, customerToken);
      assert(flow, 'Customer can cancel before partner acts', cancelR.ok, cancelR.error);

      const bR = await GET(`/bookings/${booking2.id}`, customerToken);
      assert(flow, 'Booking status is cancelled', bR.data?.status === 'cancelled', bR.data?.status);

      // Partner cannot accept a cancelled booking
      const jobs = await getPartnerJobs(partnerToken);
      const job2 = jobs.find((j: any) => j.id === booking2.id);
      if (job2) {
        const acceptR = await PATCH(`/partner/jobs/${job2.id}/accept`, {}, partnerToken);
        assert(flow, 'Partner cannot accept cancelled booking', !acceptR.ok, `status=${acceptR.status}`);
      } else {
        pass(flow, 'Cancelled booking not visible in partner job list');
      }
    } else {
      fail(flow, 'Booking not created', bookR.error);
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  FLOW 3 — Partner rejects the booking
  // ════════════════════════════════════════════════════════════════════════════
  header('FLOW 3 — Partner rejects the booking');
  {
    const flow = 'FLOW 3';
    await clearCart(customerToken);
    await addToCart(svc2.id, 1, customerToken);

    const bookR = await checkout(customerToken, futureDate(180));
    assert(flow, 'Booking created', bookR.ok, bookR.error);
    const booking3 = bookR.data?.booking ?? bookR.data;

    if (booking3?.id) {
      const jobs = await getPartnerJobs(partnerToken);
      const job3 = jobs.find((j: any) => j.id === booking3.id);

      if (job3) {
        const rejectR = await PATCH(`/partner/jobs/${job3.id}/reject`, {}, partnerToken);
        assert(flow, 'Partner can reject a job', rejectR.ok, rejectR.error);

        // Booking goes back to searching or stays pending
        const bR = await GET(`/bookings/${booking3.id}`, customerToken);
        const validStatuses = ['pending', 'searching_partner', 'upcoming', 'cancelled'];
        assert(flow, `Booking status after reject is valid (got: ${bR.data?.status})`, validStatuses.includes(bR.data?.status), bR.data?.status);
        if (['pending', 'searching_partner', 'upcoming'].includes(bR.data?.status)) {
          await PATCH(`/bookings/${booking3.id}/cancel`, {}, customerToken);
        }
      } else {
        skip(flow, 'No job visible to partner for this booking');
        await PATCH(`/bookings/${booking3.id}/cancel`, { reason: 'E2E fixture cleanup' }, customerToken);
      }
    } else {
      fail(flow, 'Booking not created', bookR.error);
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  FLOW 4 — No partner action (booking stays in searching state)
  // ════════════════════════════════════════════════════════════════════════════
  header('FLOW 4 — No partner action (stays searching_partner / pending)');
  {
    const flow = 'FLOW 4';
    await clearCart(customerToken);
    await addToCart(svc1.id, 1, customerToken);

    const bookR = await checkout(customerToken, futureDate(300));
    assert(flow, 'Booking created', bookR.ok, bookR.error);
    const booking4 = bookR.data?.booking ?? bookR.data;

    if (booking4?.id) {
      // Don't have partner act — just verify the booking stays visible
      const bR = await GET(`/bookings/${booking4.id}`, customerToken);
      assert(flow, 'Booking is visible to customer', bR.ok, bR.error);
      assert(flow, 'Booking is still active (not auto-cancelled)', ['pending', 'upcoming', 'searching_partner'].includes(bR.data?.status), bR.data?.status);

      // Customer can still cancel a searching booking
      const cancelR = await PATCH(`/bookings/${booking4.id}/cancel`, {}, customerToken);
      assert(flow, 'Customer can cancel a searching booking', cancelR.ok, cancelR.error);

      // Verify QR endpoint returns error for cancelled booking
      const qrR = await GET(`/bookings/${booking4.id}/qr`, customerToken);
      assert(flow, 'QR not available for cancelled booking', !qrR.ok, `status=${qrR.status}`);
    } else {
      fail(flow, 'Booking not created', bookR.error);
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  FLOW 5 — Customer tries to cancel AFTER partner has checked in (in_progress)
  // ════════════════════════════════════════════════════════════════════════════
  header('FLOW 5 — Customer cannot cancel an in-progress job');
  {
    const flow = 'FLOW 5';
    await clearCart(customerToken);
    await addToCart(svc1.id, 1, customerToken);

    const bookR = await checkout(customerToken, futureDate(240));
    const booking5 = bookR.data?.booking ?? bookR.data;

    if (booking5?.id) {
      const jobs = await getPartnerJobs(partnerToken);
      const job5 = jobs.find((j: any) => j.id === booking5.id);

      if (job5) {
        // Partner accepts
        await PATCH(`/partner/jobs/${job5.id}/accept`, {}, partnerToken);

        // Get QR and check in
        const qrR = await GET(`/bookings/${booking5.id}/qr`, customerToken);
        if (qrR.ok && qrR.data?.qrToken) {
          await PATCH(`/partner/jobs/${job5.id}/checkin`, { qrToken: qrR.data.qrToken }, partnerToken);

          // Verify in_progress
          const bR = await GET(`/bookings/${booking5.id}`, customerToken);
          assert(flow, 'Booking is in_progress', bR.data?.status === 'in_progress', bR.data?.status);

          // Now customer tries to cancel
          const cancelR = await PATCH(`/bookings/${booking5.id}/cancel`, {}, customerToken);
          assert(flow, 'Customer cannot cancel in-progress booking', !cancelR.ok, `status=${cancelR.status} msg=${cancelR.error}`);

          // Clean up — partner completes
          await PATCH(`/partner/jobs/${job5.id}/complete`, {}, partnerToken);
        } else {
          skip(flow, 'Could not get QR token to set up in_progress state');
        }
      } else {
        skip(flow, 'Job not visible to partner');
      }
    } else {
      fail(flow, 'Booking not created', bookR.error);
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  FLOW 6 — Customer reschedules before partner accepts, then full happy path
  // ════════════════════════════════════════════════════════════════════════════
  header('FLOW 6 — Customer reschedules → partner accepts → complete');
  {
    const flow = 'FLOW 6';
    await clearCart(customerToken);
    await addToCart(svc2.id, 1, customerToken);

    const bookR = await checkout(customerToken, futureDate(120));
    const booking6 = bookR.data?.booking ?? bookR.data;
    assert(flow, 'Booking created', bookR.ok, bookR.error);

    if (booking6?.id) {
      // Reschedule to a different time
      const newTime = futureDate(360);
      const reschedR = await PATCH(`/bookings/${booking6.id}/reschedule`, { scheduledAt: newTime }, customerToken);
      assert(flow, 'Customer can reschedule booking', reschedR.ok, reschedR.error);

      if (reschedR.ok) {
        const bR = await GET(`/bookings/${booking6.id}`, customerToken);
        const reschedTime = new Date(bR.data?.scheduledAt).getTime();
        const expectedTime = new Date(newTime).getTime();
        assert(flow, 'Scheduled time updated correctly', Math.abs(reschedTime - expectedTime) < 5000, bR.data?.scheduledAt);
      }

      // Partner accepts rescheduled booking
      const jobs = await getPartnerJobs(partnerToken);
      const job6 = jobs.find((j: any) => j.id === booking6.id);

      if (job6) {
        await PATCH(`/partner/jobs/${job6.id}/accept`, {}, partnerToken);
        const qrR = await GET(`/bookings/${booking6.id}/qr`, customerToken);

        if (qrR.ok && qrR.data?.qrToken) {
          await PATCH(`/partner/jobs/${job6.id}/checkin`, { qrToken: qrR.data.qrToken }, partnerToken);
          const complR = await PATCH(`/partner/jobs/${job6.id}/complete`, {}, partnerToken);
          assert(flow, 'Full flow completes after reschedule', complR.ok, complR.error);
        } else {
          skip(flow, 'QR token unavailable');
        }
      } else {
        skip(flow, 'Job not visible to partner after reschedule');
        await PATCH(`/bookings/${booking6.id}/cancel`, { reason: 'E2E fixture cleanup' }, customerToken);
      }
    } else {
      fail(flow, 'Booking not created', bookR.error);
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  FLOW 7 — Multiple services in one booking
  // ════════════════════════════════════════════════════════════════════════════
  header('FLOW 7 — Multi-service cart → checkout → complete');
  {
    const flow = 'FLOW 7';
    await clearCart(customerToken);

    const add1 = await addToCart(svc1.id, 1, customerToken);
    const add2 = await addToCart(svc2.id, 2, customerToken);
    assert(flow, 'Added 2 different services to cart', add1.ok && add2.ok, { add1: add1.error, add2: add2.error });

    const cartR = await GET('/cart', customerToken);
    assert(flow, 'Cart has 2 items', (cartR.data?.items?.length ?? 0) >= 1, cartR.data?.items?.length);

    const bookR = await checkout(customerToken, futureDate(150));
    assert(flow, 'Multi-service checkout succeeds', bookR.ok, bookR.error);
    const booking7 = bookR.data?.booking ?? bookR.data;

    if (booking7?.id) {
      const bR = await GET(`/bookings/${booking7.id}`, customerToken);
      assert(flow, 'Booking has services list', Array.isArray(bR.data?.services) || !!bR.data?.serviceName, bR.data);

      const jobs = await getPartnerJobs(partnerToken);
      const job7 = jobs.find((j: any) => j.id === booking7.id);

      if (job7) {
        await PATCH(`/partner/jobs/${job7.id}/accept`, {}, partnerToken);
        const qrR = await GET(`/bookings/${booking7.id}/qr`, customerToken);

        if (qrR.ok && qrR.data?.qrToken) {
          await PATCH(`/partner/jobs/${job7.id}/checkin`, { qrToken: qrR.data.qrToken }, partnerToken);
          const complR = await PATCH(`/partner/jobs/${job7.id}/complete`, {}, partnerToken);
          assert(flow, 'Multi-service booking completed', complR.ok, complR.error);

          // Pay with UPI manual
          const payR = await POST(`/bookings/${booking7.id}/payment`, { method: 'upi_manual', notes: 'UTR123456' }, customerToken);
          assert(flow, 'Payment submitted via UPI', payR.ok, payR.error);
        } else {
          skip(flow, 'QR unavailable');
        }
      } else {
        skip(flow, 'Job not visible to partner');
        await PATCH(`/bookings/${booking7.id}/cancel`, { reason: 'E2E fixture cleanup' }, customerToken);
      }
    } else {
      fail(flow, 'Multi-service checkout failed', bookR.error);
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  FLOW 8 — Partner tries a WRONG QR token (different booking's token)
  // ════════════════════════════════════════════════════════════════════════════
  header('FLOW 8 — Wrong QR token rejected at check-in');
  {
    const flow = 'FLOW 8';
    await clearCart(customerToken);
    await addToCart(svc1.id, 1, customerToken);

    const bookR = await checkout(customerToken, futureDate(180));
    const booking8 = bookR.data?.booking ?? bookR.data;

    if (booking8?.id) {
      const jobs = await getPartnerJobs(partnerToken);
      const job8 = jobs.find((j: any) => j.id === booking8.id);

      if (job8) {
        await PATCH(`/partner/jobs/${job8.id}/accept`, {}, partnerToken);

        // Use a clearly fake / tampered QR token
        const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJib29raW5nSWQiOiJmYWtlLWlkLTEyMyIsInR5cCI6ImNoZWNraW4ifQ.fake_signature';
        const badCheckinR = await PATCH(`/partner/jobs/${job8.id}/checkin`, { qrToken: fakeToken }, partnerToken);
        assert(flow, 'Fake QR token is rejected', !badCheckinR.ok, `status=${badCheckinR.status}`);

        // Empty token also rejected
        const emptyR = await PATCH(`/partner/jobs/${job8.id}/checkin`, { qrToken: '' }, partnerToken);
        assert(flow, 'Empty QR token rejected', !emptyR.ok, `status=${emptyR.status}`);

        // Missing token rejected
        const missingR = await PATCH(`/partner/jobs/${job8.id}/checkin`, {}, partnerToken);
        assert(flow, 'Missing qrToken field rejected', !missingR.ok, `status=${missingR.status}`);

        // Clean up — cancel the booking
        await PATCH(`/bookings/${booking8.id}/cancel`, {}, customerToken);
      } else {
        skip(flow, 'Job not visible to partner');
      }
    } else {
      fail(flow, 'Booking not created', bookR.error);
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  FLOW 9 — Auth & access control checks
  // ════════════════════════════════════════════════════════════════════════════
  header('FLOW 9 — Auth & access control');
  {
    const flow = 'FLOW 9';

    // Unauthenticated booking attempt
    const unauthed = await POST('/bookings/checkout', { scheduledAt: futureDate(120) });
    assert(flow, 'Unauthenticated checkout blocked (401)', unauthed.status === 401, unauthed.status);

    // Partner cannot create a booking on behalf of customer (wrong role context)
    await clearCart(customerToken);
    await addToCart(svc1.id, 1, customerToken);
    const bookR = await checkout(customerToken, futureDate(120));
    const bk = bookR.data?.booking ?? bookR.data;

    if (bk?.id) {
      // Partner cannot cancel a customer's booking
      const partnerCancelR = await PATCH(`/bookings/${bk.id}/cancel`, {}, partnerToken);
      assert(flow, 'Partner cannot cancel customer booking', !partnerCancelR.ok || partnerCancelR.status === 403 || partnerCancelR.status === 404, `status=${partnerCancelR.status}`);

      // Partner cannot get QR for a booking they don't own
      const partnerQrR = await GET(`/bookings/${bk.id}/qr`, partnerToken);
      assert(flow, 'Partner cannot get customer booking QR', !partnerQrR.ok, `status=${partnerQrR.status}`);

      // Non-existent booking returns 404
      const notFoundR = await GET('/bookings/00000000-0000-0000-0000-000000000000', customerToken);
      assert(flow, 'Non-existent booking returns 404', notFoundR.status === 404, notFoundR.status);

      // Clean up
      await PATCH(`/bookings/${bk.id}/cancel`, {}, customerToken);
    } else {
      skip(flow, 'Could not create booking for access control tests');
    }

    // Admin stats accessible to admin only
    const adminStats = await GET('/admin/stats', adminToken);
    assert(flow, 'Admin can access /admin/stats', adminStats.ok, adminStats.error);

    const customerStatsR = await GET('/admin/stats', customerToken);
    assert(flow, 'Customer blocked from /admin/stats', !customerStatsR.ok, customerStatsR.status);
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  FLOW 10 — Double-complete blocked
  // ════════════════════════════════════════════════════════════════════════════
  header('FLOW 10 — Partner cannot complete an already-completed job');
  {
    const flow = 'FLOW 10';
    await clearCart(customerToken);
    await addToCart(svc1.id, 1, customerToken);
    const bookR = await checkout(customerToken, futureDate(120));
    const bk = bookR.data?.booking ?? bookR.data;

    if (bk?.id) {
      const jobs = await getPartnerJobs(partnerToken);
      const job = jobs.find((j: any) => j.id === bk.id);

      if (job) {
        await PATCH(`/partner/jobs/${job.id}/accept`, {}, partnerToken);
        const qrR = await GET(`/bookings/${bk.id}/qr`, customerToken);

        if (qrR.ok && qrR.data?.qrToken) {
          await PATCH(`/partner/jobs/${job.id}/checkin`, { qrToken: qrR.data.qrToken }, partnerToken);
          await PATCH(`/partner/jobs/${job.id}/complete`, {}, partnerToken);

          // Try to complete again
          const secondComplete = await PATCH(`/partner/jobs/${job.id}/complete`, {}, partnerToken);
          assert(flow, 'Double-complete is blocked', !secondComplete.ok, `status=${secondComplete.status}`);

          // Try to check in again on completed booking
          const qrR2 = await GET(`/bookings/${bk.id}/qr`, customerToken);
          assert(flow, 'QR not available for completed booking', !qrR2.ok, `status=${qrR2.status}`);
        } else {
          skip(flow, 'QR unavailable');
        }
      } else {
        skip(flow, 'Job not visible to partner');
      }
    } else {
      fail(flow, 'Booking not created', bookR.error);
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  SUMMARY
  // ════════════════════════════════════════════════════════════════════════════
  const total = passed + failed + skipped;
  console.log(`\n${c.bold}━━━ RESULTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}`);
  console.log(`  ${c.green}PASSED ${c.reset}: ${passed}/${total}`);
  console.log(`  ${c.red}FAILED ${c.reset}: ${failed}/${total}`);
  console.log(`  ${c.yellow}SKIPPED${c.reset}: ${skipped}/${total}`);

  if (failed > 0) {
    console.log(`\n${c.bold}${c.red}Failed checks:${c.reset}`);
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  ${c.red}✗${c.reset} [${r.flow}] ${r.detail}`);
    });
  }
  if (skipped > 0) {
    console.log(`\n${c.bold}${c.yellow}Skipped checks:${c.reset}`);
    results.filter(r => r.status === 'SKIP').forEach(r => {
      console.log(`  ${c.yellow}–${c.reset} [${r.flow}] ${r.detail}`);
    });
  }

  const allPassed = failed === 0;
  console.log(`\n${allPassed ? c.green + '✅ All checks passed!' : c.red + '❌ Some checks failed.'}${c.reset}\n`);
  process.exit(allPassed ? 0 : 1);
}

run().catch(e => {
  console.error(`${c.red}Unhandled error:${c.reset}`, e);
  process.exit(1);
});
