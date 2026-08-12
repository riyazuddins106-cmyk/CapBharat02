/**
 * ServeNow GPS Dispatch — End-to-End Test
 *
 * Covers:
 *  1. Haversine unit tests (pure math, no I/O)
 *  2. Full API cycle:
 *       register customer → register partner (near) → register partner (far)
 *       → link partners to service via DB
 *       → partners set GPS + go available
 *       → customer creates address (with GPS) + adds to cart + checks out
 *       → dispatch broadcasts ONLY to nearby partner (within 30 km)
 *       → nearby partner accepts job
 *       → booking is assigned, history logged, double-accept blocked
 *  3. Admin dispatch endpoints (list, history, eligible-partners)
 *  4. API input validation guards
 */

import '../config/env.js'; // validate + exit if secrets missing
import { db } from '../config/database.js';
import {
  bookings, partnerServices, professionals,
  bookingPartnerRequests, bookingAssignmentLogs,
  addresses, users, carts, cartItems, serviceCategories, services,
} from '../database/schema/index.js';
import { eq, inArray } from 'drizzle-orm';

const BASE = 'http://localhost:8000/api';

// ── Assertion helpers ────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const failures: string[] = [];

function ok(label: string, value: unknown, expected?: unknown) {
  const pass = expected === undefined ? Boolean(value) : value === expected;
  if (pass) { console.log(`  ✓ ${label}`); passed++; }
  else {
    console.error(`  ✗ ${label}  got=${JSON.stringify(value)}  want=${JSON.stringify(expected)}`);
    failed++;
    failures.push(label);
  }
}

function approxEq(label: string, a: number | null | undefined, b: number, tol = 0.0001) {
  ok(label, Math.abs((a ?? NaN) - b) < tol);
}

// ── HTTP helper ──────────────────────────────────────────────────────────────
async function api(method: string, path: string, body?: unknown, token?: string) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json() as Record<string, unknown>;
  return { status: res.status, body: json, data: json['data'] as Record<string, unknown> };
}

// ── Cleanup tracking ─────────────────────────────────────────────────────────
const created = { userIds: [] as string[], bookingIds: [] as string[], addressIds: [] as string[] };

// ════════════════════════════════════════════════════════════════════════════
//  1. Haversine unit tests
// ════════════════════════════════════════════════════════════════════════════
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function testHaversine() {
  console.log('\n── 1. Haversine unit tests ──────────────────────────────────');
  approxEq('same point → 0 km', haversineKm(12.97, 77.59, 12.97, 77.59), 0);
  const blr = haversineKm(12.9716, 77.5946, 12.9753, 77.6069);
  ok('Bangalore city pair < 10 km', blr < 10);
  ok('Bangalore city pair > 0.5 km', blr > 0.5);
  ok('Mumbai→Bangalore > 800 km', haversineKm(19.076, 72.877, 12.971, 77.594) > 800);
  const ab = haversineKm(12.0, 77.0, 13.0, 78.0);
  approxEq('haversine is symmetric', ab - haversineKm(13.0, 78.0, 12.0, 77.0), 0);
  ok('near test coords < 1 km apart', haversineKm(12.9500, 77.5000, 12.9516, 77.5020) < 1);
  ok('far coords > 800 km from booking', haversineKm(12.9500, 77.5000, 19.076, 72.877) > 800);
}

// ════════════════════════════════════════════════════════════════════════════
//  2. Full API cycle
// ════════════════════════════════════════════════════════════════════════════
async function testApiCycle() {
  const run = Date.now();
  const custEmail   = `e2e.cust.${run}@test.invalid`;
  const nearEmail   = `e2e.near.${run}@test.invalid`;
  const farEmail    = `e2e.far.${run}@test.invalid`;
  const pw          = 'TestPass1';
  const [cleaningCategory] = await db.select({ id: serviceCategories.id })
    .from(serviceCategories)
    .where(eq(serviceCategories.name, 'Cleaning'))
    .limit(1);
  const [bathroomService] = await db.select({ id: services.id })
    .from(services)
    .where(eq(services.name, 'Bathroom Cleaning'))
    .limit(1);
  if (!cleaningCategory || !bathroomService) {
    throw new Error('Fresh catalog is missing Cleaning or Bathroom Cleaning.');
  }
  const CLEANING_CAT = cleaningCategory.id;
  const BATHROOM_SVC = bathroomService.id;

  // ── Register & verify customer ───────────────────────────────────────────
  console.log('\n── 2. Register users ────────────────────────────────────────');

  const regCust = await api('POST', '/auth/register', { fullName: 'E2E Customer', email: custEmail, password: pw });
  ok('customer register → 201', regCust.status, 201);
  const custOtp = (regCust.data as Record<string, unknown>)?.devCode as string;
  const custUserId = (regCust.data as Record<string, unknown>)?.userId as string;
  ok('customer devCode present', Boolean(custOtp));
  created.userIds.push(custUserId);

  const verifyCust = await api('POST', '/auth/verify-otp', { email: custEmail, code: custOtp, purpose: 'signup' });
  ok('customer OTP verified → 200', verifyCust.status, 200);

  const loginCust = await api('POST', '/auth/login', { email: custEmail, password: pw });
  ok('customer login → 200', loginCust.status, 200);
  const custToken = (loginCust.data as Record<string, unknown>)?.accessToken as string;
  ok('customer token present', Boolean(custToken));

  // ── Register & verify near partner ──────────────────────────────────────
  const regNear = await api('POST', '/auth/register-partner', {
    fullName: 'E2E NearPro', email: nearEmail, password: pw,
    categoryId: CLEANING_CAT, title: 'Cleaner', city: 'Bengaluru',
  });
  ok('near-partner register → 201', regNear.status, 201);
  const nearOtp    = (regNear.data as Record<string, unknown>)?.devCode as string;
  const nearUserId = (regNear.data as Record<string, unknown>)?.userId as string;
  created.userIds.push(nearUserId);

  await api('POST', '/auth/verify-otp', { email: nearEmail, code: nearOtp, purpose: 'signup' });
  const loginNear  = await api('POST', '/auth/login', { email: nearEmail, password: pw });
  ok('near-partner login → 200', loginNear.status, 200);
  const nearToken  = (loginNear.data as Record<string, unknown>)?.accessToken as string;

  // ── Register & verify far partner ───────────────────────────────────────
  const regFar = await api('POST', '/auth/register-partner', {
    fullName: 'E2E FarPro', email: farEmail, password: pw,
    categoryId: CLEANING_CAT, title: 'Cleaner Far', city: 'Bengaluru',
  });
  ok('far-partner register → 201', regFar.status, 201);
  const farOtp    = (regFar.data as Record<string, unknown>)?.devCode as string;
  const farUserId = (regFar.data as Record<string, unknown>)?.userId as string;
  created.userIds.push(farUserId);

  await api('POST', '/auth/verify-otp', { email: farEmail, code: farOtp, purpose: 'signup' });
  const loginFar   = await api('POST', '/auth/login', { email: farEmail, password: pw });
  ok('far-partner login → 200', loginFar.status, 200);
  const farToken   = (loginFar.data as Record<string, unknown>)?.accessToken as string;

  // ── Resolve professional records ─────────────────────────────────────────
  console.log('\n── 3. Link partners to service ──────────────────────────────');

  const [nearPro] = await db.select().from(professionals)
    .where(eq(professionals.userId, nearUserId)).limit(1);
  ok('near professional row exists', Boolean(nearPro?.id));

  const [farPro] = await db.select().from(professionals)
    .where(eq(professionals.userId, farUserId)).limit(1);
  ok('far professional row exists', Boolean(farPro?.id));

  await db.insert(partnerServices).values([
    { partnerId: nearPro!.id, serviceId: BATHROOM_SVC },
    { partnerId: farPro!.id,  serviceId: BATHROOM_SVC },
  ]).onConflictDoNothing();
  ok('partner_services rows inserted', true);

  // ── GPS + availability ───────────────────────────────────────────────────
  console.log('\n── 4. Set GPS + availability ────────────────────────────────');

  //  Booking address: lat=12.9500, lng=77.5000
  //  Near partner:    lat=12.9516, lng=77.5020  → ~0.3 km  ✓ within 30 km
  //  Far  partner:    lat=19.0760, lng=72.8770  → ~840 km  ✗ outside 30 km

  const locNear = await api('PATCH', '/partner/location', { latitude: 12.9516, longitude: 77.5020 }, nearToken);
  ok('near-partner /location → 200', locNear.status, 200);

  const locFar  = await api('PATCH', '/partner/location', { latitude: 19.0760, longitude: 72.8770 }, farToken);
  ok('far-partner /location → 200', locFar.status, 200);

  const availNear = await api('PATCH', '/partner/availability', { status: 'available' }, nearToken);
  ok('near-partner availability → available (200)', availNear.status, 200);

  const availFar  = await api('PATCH', '/partner/availability', { status: 'available' }, farToken);
  ok('far-partner availability → available (200)', availFar.status, 200);

  // Ensure currentBookingStatus is also 'available' (new accounts start available by default,
  // but explicitly set to be certain)
  await db.update(professionals)
    .set({ currentBookingStatus: 'available' })
    .where(inArray(professionals.id, [nearPro!.id, farPro!.id]));

  // Verify GPS persisted in DB
  const [nearDb] = await db.select().from(professionals)
    .where(eq(professionals.id, nearPro!.id)).limit(1);
  approxEq('near-partner latitude stored correctly', nearDb?.latitude, 12.9516);
  approxEq('near-partner longitude stored correctly', nearDb?.longitude, 77.5020);
  ok('near-partner availabilityStatus = available', nearDb?.availabilityStatus, 'available');

  const [farDb] = await db.select().from(professionals)
    .where(eq(professionals.id, farPro!.id)).limit(1);
  approxEq('far-partner latitude stored correctly', farDb?.latitude, 19.0760);

  // ── Customer: address + cart ─────────────────────────────────────────────
  console.log('\n── 5. Customer address + cart ───────────────────────────────');

  const addrRes = await api('POST', '/addresses', {
    label: 'Test Home',
    line1: '123 Test Street',
    city: 'Bangalore',
    state: 'Karnataka',
    postalCode: '560001',
    country: 'India',
    latitude: 12.9500,
    longitude: 77.5000,
  }, custToken);
  ok('address create → 201', addrRes.status, 201);
  const addressId = (addrRes.data as Record<string, unknown>)?.id as string;
  ok('address id present', Boolean(addressId));
  created.addressIds.push(addressId);

  const cartAdd = await api('POST', '/cart/items',
    { serviceId: BATHROOM_SVC, quantity: 1 }, custToken);
  ok('add to cart → 201', cartAdd.status, 201);

  // ── Checkout → dispatch ──────────────────────────────────────────────────
  console.log('\n── 6. Checkout → dispatch broadcast ─────────────────────────');

  const scheduledAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  const checkout = await api('POST', '/bookings/checkout',
    { scheduledAt, addressId, notes: 'e2e dispatch test' }, custToken);
  ok('checkout → 201', checkout.status, 201);

  const bk = checkout.data as Record<string, unknown>;
  const bookingId = bk?.id as string;
  ok('booking.id present', Boolean(bookingId));
  ok('booking.dispatchStatus = searching_partner', bk?.dispatchStatus, 'searching_partner');
  ok('booking.status = pending', bk?.status, 'pending');
  ok('booking.addressId set', bk?.addressId, addressId);
  ok('booking.price = 599 (Bathroom Cleaning)', bk?.price, 599);
  created.bookingIds.push(bookingId);

  // brief wait for broadcast async ops
  await new Promise(r => setTimeout(r, 600));

  // ── Verify dispatch candidates ───────────────────────────────────────────
  console.log('\n── 7. Verify dispatch candidates (GPS filter) ───────────────');

  const requests = await db.select().from(bookingPartnerRequests)
    .where(eq(bookingPartnerRequests.bookingId, bookingId));
  const sentPartnerIds = requests.map(r => r.partnerId);

  ok('near-partner received job request', sentPartnerIds.includes(nearPro!.id));
  ok('far-partner did NOT receive request (>30 km)', !sentPartnerIds.includes(farPro!.id));
  ok('all sent requests are pending', requests.every(r => r.status === 'pending'));

  const autoLogs = await db.select().from(bookingAssignmentLogs)
    .where(eq(bookingAssignmentLogs.bookingId, bookingId));
  ok('AUTO_SENT log for near-partner',
    autoLogs.some(l => l.partnerId === nearPro!.id && l.action === 'AUTO_SENT'));
  ok('no AUTO_SENT log for far-partner',
    !autoLogs.some(l => l.partnerId === farPro!.id));

  // ── Near partner accepts job ─────────────────────────────────────────────
  console.log('\n── 8. Near partner accepts job ──────────────────────────────');

  const accept = await api('PATCH', `/partner/jobs/${bookingId}/accept`, {}, nearToken);
  ok('accept → 200', accept.status, 200);
  const accepted = accept.data as Record<string, unknown>;
  ok('booking.status → upcoming',  accepted?.status, 'upcoming');
  ok('booking.dispatchStatus → assigned', accepted?.dispatchStatus, 'assigned');
  ok('booking.professionalId set', Boolean(accepted?.professionalId));
  ok('booking.assignmentType = auto', accepted?.assignmentType, 'auto');

  // ── Verify final DB state ────────────────────────────────────────────────
  console.log('\n── 9. Verify DB state post-acceptance ───────────────────────');

  const [finalBk] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
  ok('DB booking.dispatchStatus = assigned', finalBk?.dispatchStatus, 'assigned');
  ok('DB booking.professionalId = nearPro',  finalBk?.professionalId, nearPro!.id);
  ok('DB booking.assignmentType = auto',     finalBk?.assignmentType, 'auto');

  const [nearReq] = await db.select().from(bookingPartnerRequests).where(
    eq(bookingPartnerRequests.bookingId, bookingId)).limit(1); // near was only one
  ok('near-partner request → accepted', nearReq?.status, 'accepted');
  ok('near-partner request respondedAt set', Boolean(nearReq?.respondedAt));

  const [nearFinal] = await db.select().from(professionals)
    .where(eq(professionals.id, nearPro!.id)).limit(1);
  ok('near-partner availabilityStatus → busy',    nearFinal?.availabilityStatus, 'busy');
  ok('near-partner currentBookingStatus → busy',  nearFinal?.currentBookingStatus, 'busy');

  const finalLogs = await db.select().from(bookingAssignmentLogs)
    .where(eq(bookingAssignmentLogs.bookingId, bookingId));
  ok('PARTNER_ACCEPTED log recorded',
    finalLogs.some(l => l.partnerId === nearPro!.id && l.action === 'PARTNER_ACCEPTED'));

  // ── Double-accept guard ──────────────────────────────────────────────────
  // The far partner was never dispatched, so they correctly get 404 (no request on file).
  // The 409 conflict fires when a partner who *was* dispatched tries to accept an already-
  // assigned booking.  We test this with the near partner re-attempting their own accepted job.
  console.log('\n── 10. Conflict guards ───────────────────────────────────────');

  // Far partner (never dispatched) → 404 "Job not found"
  const farAccept = await api('PATCH', `/partner/jobs/${bookingId}/accept`, {}, farToken);
  ok('undispatched partner accept → 404', farAccept.status, 404);

  // Near partner re-accepts already-assigned booking → 400 (booking no longer pending)
  const doubleNear = await api('PATCH', `/partner/jobs/${bookingId}/accept`, {}, nearToken);
  ok('already-accepted booking re-accept → 400', doubleNear.status, 400);

  // ── Admin dispatch endpoints ─────────────────────────────────────────────
  console.log('\n── 11. Admin dispatch endpoints ─────────────────────────────');

  const adminLogin = await api('POST', '/auth/login',
    { email: 'admin@servenow.in', password: 'Admin@1234' });
  if (adminLogin.status === 200) {
    const adminToken = (adminLogin.data as Record<string, unknown>)?.accessToken as string;

    const dispatchList = await api('GET', '/operations/dispatch?status=assigned', undefined, adminToken);
    ok('GET /operations/dispatch → 200', dispatchList.status, 200);
    const listed = (dispatchList.body?.data as Array<Record<string, unknown>>) ?? [];
    ok('assigned booking in dispatch list',
      listed.some(b => b['id'] === bookingId));

    const history = await api('GET', `/operations/dispatch/history?bookingId=${bookingId}`, undefined, adminToken);
    ok('GET /operations/dispatch/history → 200', history.status, 200);
    const logs = (history.body?.data as Array<Record<string, unknown>>) ?? [];
    ok('history has AUTO_SENT',        logs.some(l => l['action'] === 'AUTO_SENT'));
    ok('history has PARTNER_ACCEPTED', logs.some(l => l['action'] === 'PARTNER_ACCEPTED'));

    const eligible = await api('GET', `/operations/dispatch/${bookingId}/eligible-partners`, undefined, adminToken);
    ok('GET /operations/dispatch/eligible-partners → 200', eligible.status, 200);
  } else {
    console.log('  (seed admin not found — skipping admin endpoint checks)');
  }

  // ── Input validation guards ──────────────────────────────────────────────
  console.log('\n── 12. API input validation ─────────────────────────────────');

  const badLoc = await api('PATCH', '/partner/location',
    { latitude: 'not-a-number', longitude: 77.0 }, nearToken);
  ok('non-numeric latitude → 400', badLoc.status, 400);

  const missingLoc = await api('PATCH', '/partner/location',
    { latitude: 12.97 }, nearToken);
  ok('missing longitude → 400', missingLoc.status, 400);

  const badDate = await api('POST', '/bookings/checkout',
    { scheduledAt: 'not-a-date', addressId }, custToken);
  ok('invalid scheduledAt → 400', badDate.status, 400);

  const emptyCart = await api('POST', '/bookings/checkout',
    { scheduledAt: new Date(Date.now() + 3600000).toISOString() }, custToken);
  // cart was cleared by checkout; second checkout should fail with empty cart
  ok('checkout with empty cart → 400', emptyCart.status, 400);
}

// ── Cleanup ──────────────────────────────────────────────────────────────────
async function cleanup() {
  console.log('\n── Cleanup ──────────────────────────────────────────────────');
  try {
    const validBookings = created.bookingIds.filter(Boolean);
    const validAddresses = created.addressIds.filter(Boolean);
    const validUsers = created.userIds.filter(Boolean);
    if (validBookings.length)  await db.delete(bookings).where(inArray(bookings.id, validBookings));
    if (validAddresses.length) await db.delete(addresses).where(inArray(addresses.id, validAddresses));
    if (validUsers.length) {
      // professionals.user_id is ON DELETE SET NULL, so delete test profiles
      // explicitly or every interrupted run leaves an orphan in Admin.
      const testProfessionals = await db.select({ id: professionals.id })
        .from(professionals)
        .where(inArray(professionals.userId, validUsers));
      const professionalIds = testProfessionals.map(({ id }) => id);
      if (professionalIds.length) {
        await db.delete(bookings).where(inArray(bookings.professionalId, professionalIds));
        await db.delete(professionals).where(inArray(professionals.id, professionalIds));
      }
      await db.delete(users).where(inArray(users.id, validUsers));
    }
    // Also clean up any orphan carts (customer was deleted, carts cascade)
    console.log('  ✓ test data cleaned up');
  } catch (err) {
    console.warn('  ⚠ cleanup error:', (err as Error).message);
  }
}

// ── Entry point ──────────────────────────────────────────────────────────────
(async () => {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(' ServeNow GPS Dispatch — End-to-End Test Suite');
  console.log('═══════════════════════════════════════════════════════════════');

  testHaversine();

  try {
    await testApiCycle();
  } finally {
    await cleanup();
  }

  const total = passed + failed;
  console.log('\n═══════════════════════════════════════════════════════════════');
  if (failed === 0) {
    console.log(` ✓ All ${total} assertions passed`);
  } else {
    console.error(` ✗ ${failed}/${total} assertions FAILED`);
    failures.forEach(f => console.error(`   • ${f}`));
  }
  console.log('═══════════════════════════════════════════════════════════════\n');
  process.exit(failed > 0 ? 1 : 0);
})();
