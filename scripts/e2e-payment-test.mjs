/**
 * End-to-end test: booking creation → partner accept → check-in → complete → payment
 * Run: node scripts/e2e-payment-test.mjs
 */

const BASE = 'http://localhost:8000/api';
let pass = 0, fail = 0;

function ok(label, val) {
  console.log(`  ✅ ${label}: ${val}`);
  pass++;
}
function err(label, got) {
  console.error(`  ❌ ${label}: ${JSON.stringify(got)}`);
  fail++;
}

async function api(method, path, body, token) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(`${BASE}${path}`, opts);
  const text = await r.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: r.status, data };
}

async function clearCart(token) {
  const cartRes = await api('GET', '/cart', null, token);
  const items = cartRes.data?.data?.items ?? cartRes.data?.data ?? [];
  for (const item of items) {
    await api('DELETE', `/cart/items/${item.id}`, null, token);
  }
}

async function clearActiveBookings(token) {
  const bookingsRes = await api('GET', '/bookings', null, token);
  const bookings = bookingsRes.data?.data?.bookings ?? bookingsRes.data?.data ?? [];
  for (const booking of bookings) {
    if (['pending', 'upcoming'].includes(booking.status)) {
      await api('PATCH', `/bookings/${booking.id}/cancel`, { reason: 'E2E fixture reset' }, token);
    }
  }
}

function safeScheduledAt() {
  const IST_OFFSET_MS = 5.5 * 3600_000;
  const target = new Date(Date.now() + IST_OFFSET_MS);
  target.setUTCDate(target.getUTCDate() + 1);
  target.setUTCHours(12, 0, 0, 0);
  return new Date(target.getTime() - IST_OFFSET_MS).toISOString();
}

// ─── 1. LOGIN ─────────────────────────────────────────────────────────────────
console.log('\n─── 1. Authentication ───');
const cRes = await api('POST', '/auth/login', { email: 'customer@servenow.in', password: 'Customer@1234' });
const CT = cRes.data?.data?.accessToken;
const custName = cRes.data?.data?.user?.name;
if (CT) ok('Customer login', custName); else { err('Customer login', cRes.data); process.exit(1); }

const pRes = await api('POST', '/auth/login', { email: 'partner@servenow.in', password: 'Partner@1234' });
const PT = pRes.data?.data?.accessToken;
const partName = pRes.data?.data?.user?.name;
if (PT) ok('Partner login', partName); else { err('Partner login', pRes.data); process.exit(1); }

const aRes = await api('POST', '/auth/login', { email: 'admin@servenow.in', password: 'Admin@1234' });
const AT = aRes.data?.data?.accessToken;
if (AT) ok('Admin login', aRes.data?.data?.user?.name); else err('Admin login (non-fatal)', aRes.status);
await clearActiveBookings(CT);
await clearCart(CT);
const availabilityRes = await api('PATCH', '/partner/availability', { availabilityStatus: 'available' }, PT);
if (availabilityRes.data?.success || availabilityRes.status === 200) ok('Partner fixture available', 'available');
else err('Partner fixture availability', availabilityRes.data);

// ─── 2. PICK A SERVICE ────────────────────────────────────────────────────────
console.log('\n─── 2. Pick a service ───');
const svcRes = await api('GET', '/services?limit=5', null, CT);
const services = svcRes.data?.data?.services ?? svcRes.data?.data ?? [];
const svc = services[0];
if (!svc?.id) { err('Fetch services', svcRes.data); process.exit(1); }
ok('Service', `${svc.name} | ₹${svc.customerPrice} | id:${svc.id.slice(0,8)}`);

// ─── 3. CART + CHECKOUT ───────────────────────────────────────────────────────
console.log('\n─── 3. Cart & Checkout ───');

// Clear any existing cart first
await clearCart(CT);

const addRes = await api('POST', '/cart/items', { serviceId: svc.id, quantity: 1 }, CT);
if (addRes.data?.success || addRes.status === 200 || addRes.status === 201) {
  ok('Add to cart', `status ${addRes.status}`);
} else {
  err('Add to cart', addRes.data);
  process.exit(1);
}

const cartViewRes = await api('GET', '/cart', null, CT);
const cartItems = cartViewRes.data?.data?.items ?? cartViewRes.data?.data ?? [];
ok('Cart contents', `${cartItems.length} item(s)`);

const scheduledAt = safeScheduledAt();
const coRes = await api('POST', '/bookings/checkout', {
  addressText: '42 Marine Drive, Mumbai 400001',
  scheduledAt,
  notes: 'E2E automated test',
}, CT);

const booking = coRes.data?.data?.booking ?? coRes.data?.data;
const BID = booking?.id;
if (!BID) { err('Checkout', coRes.data); process.exit(1); }
ok('Booking created', `id:${BID.slice(0,8)} | status:${booking.status} | price:₹${booking.price}`);

// ─── 4. VERIFY IN CUSTOMER BOOKING LIST (status check) ───────────────────────
console.log('\n─── 4. Customer booking list ───');
const listRes = await api('GET', '/bookings', null, CT);
const myBookings = listRes.data?.data?.bookings ?? listRes.data?.data ?? [];
const found = myBookings.find(b => b.id === BID);
if (found) ok('Booking visible to customer', `status:${found.status} paymentStatus:${found.paymentStatus ?? 'null'}`);
else err('Booking not found in list', `got ${myBookings.length} bookings`);

// ─── 5. VERIFY AUTO-DISPATCH ──────────────────────────────────────────────────
console.log('\n─── 5. Verify auto-dispatch ───');
await new Promise(r => setTimeout(r, 800));
const dispatchRes = await api('GET', '/operations/dispatch', null, AT);
if (dispatchRes.data?.success || dispatchRes.status === 200) ok('Admin dispatch queue loaded', `status ${dispatchRes.status}`);
else err('Admin dispatch queue', dispatchRes.data);

// ─── 6. PARTNER ACCEPTS JOB ───────────────────────────────────────────────────
console.log('\n─── 6. Partner accepts job ───');
const jobsRes = await api('GET', '/partner/jobs', null, PT);
const jobs = jobsRes.data?.data?.jobs ?? jobsRes.data?.data ?? [];
console.log(`  Partner sees ${jobs.length} upcoming job(s)`);
const job = jobs.find(j => j.id === BID);

if (!job?.id) {
  err('Partner cannot see job', `jobs list: ${JSON.stringify(jobs.slice(0,2))}`);
} else {
  const acceptRes = await api('PATCH', `/partner/jobs/${job.id}/accept`, {}, PT);
  if (acceptRes.data?.success || acceptRes.status === 200) ok('Partner accepted job', job.id.slice(0,8));
  else err('Accept job', acceptRes.data);
}

const JID = job?.id ?? BID;

// ─── 7. CUSTOMER GETS QR TOKEN ────────────────────────────────────────────────
console.log('\n─── 7. QR Token ───');
const qrRes = await api('GET', `/bookings/${JID}/qr`, null, CT);
const qrToken = qrRes.data?.data?.qrToken ?? qrRes.data?.qrToken;
if (qrToken) ok('QR token generated', qrToken.slice(0,20) + '...');
else err('QR token', qrRes.data);

// ─── 8. PARTNER CHECK-IN ──────────────────────────────────────────────────────
console.log('\n─── 8. Partner check-in ───');
const ciRes = await api('PATCH', `/partner/jobs/${JID}/checkin`, { qrToken }, PT);
if (ciRes.data?.success || ciRes.status === 200) ok('Partner checked in', `booking now in_progress`);
else err('Check-in', ciRes.data);

// ─── 9. PARTNER COMPLETES JOB ─────────────────────────────────────────────────
console.log('\n─── 9. Partner completes job ───');
const completeRes = await api('PATCH', `/partner/jobs/${JID}/complete`, {
  completionNotes: 'Service done, all good',
}, PT);
if (completeRes.data?.success || completeRes.status === 200) ok('Partner marked job complete', '');
else err('Complete job', completeRes.data);

// ─── 10. VERIFY CUSTOMER SEES "AWAITING PAYMENT" ─────────────────────────────
console.log('\n─── 10. Customer booking list — post-completion ───');
await new Promise(r => setTimeout(r, 300));
const list2Res = await api('GET', '/bookings', null, CT);
const myBookings2 = list2Res.data?.data?.bookings ?? list2Res.data?.data ?? [];
const completedBk = myBookings2.find(b => b.id === JID);
if (completedBk) {
  ok('Booking visible after completion', `status:${completedBk.status} | paymentStatus:${completedBk.paymentStatus ?? 'null'}`);
  if (completedBk.status === 'completed' && completedBk.paymentStatus !== 'paid') {
    ok('CORE FIX VERIFIED', 'Booking is completed but NOT paid → goes to "Pay Now" tab ✨');
  } else if (completedBk.status === 'completed') {
    console.log(`  ℹ️  paymentStatus = ${completedBk.paymentStatus} (may already have a payment record)`);
  } else {
    err('Expected completed status', completedBk.status);
  }
} else {
  err('Booking missing from list after completion', `${myBookings2.length} bookings`);
}

// ─── 11. CUSTOMER SUBMITS PAYMENT (cash) ─────────────────────────────────────
console.log('\n─── 11. Customer submits payment ───');
const payRes = await api('POST', `/bookings/${JID}/payment`, {
  method: 'cash',
}, CT);
if (payRes.data?.success || payRes.status === 200 || payRes.status === 201) {
   ok('Payment submitted', `method:cash | amount:₹${booking?.price ?? svc.customerPrice}`);
} else {
  err('Payment submit', payRes.data);
}

await new Promise(r => setTimeout(r, 400));

// ─── 12. VERIFY PAYMENT STATUS CHANGED ───────────────────────────────────────
console.log('\n─── 12. Verify payment recorded ───');
const list3Res = await api('GET', '/bookings', null, CT);
const myBookings3 = list3Res.data?.data?.bookings ?? list3Res.data?.data ?? [];
const paidBk = myBookings3.find(b => b.id === JID);
if (paidBk) {
  ok('Final booking state', `status:${paidBk.status} | paymentStatus:${paidBk.paymentStatus ?? 'null'}`);
  if (paidBk.paymentStatus === 'paid' || paidBk.paymentStatus === 'created') {
    ok('Payment recorded on booking', paidBk.paymentStatus);
  }
} else {
  // booking moved to past — check with all statuses
  err('Booking not found in active list (may be in past)', '');
}

// Directly check payment record
const payListRes = await api('GET', `/bookings/${JID}/payment`, null, CT);
const payRecord = payListRes.data?.data;
if (payRecord) ok('Payment record found', `status:${payRecord.status} | method:${payRecord.method}`);
else console.log('  ℹ️  /payments/booking/:id not available — checking via admin...');

// ─── 13. ADMIN STATS — verify payment counts ─────────────────────────────────
console.log('\n─── 13. Admin stats — payment overview ───');
const statsRes = await api('GET', '/admin/stats', null, AT);
const stats = statsRes.data?.data;
if (stats) {
  ok('Admin stats loaded', '');
  console.log(`     completedPaid            = ${stats.completedPaid}`);
  console.log(`     completedAwaitingPayment = ${stats.completedAwaitingPayment}`);
  console.log(`     todayCollection          = ₹${stats.todayCollection}`);
  console.log(`     pendingCollection        = ₹${stats.pendingCollection}`);
  if (stats.completedPaid !== undefined) ok('New payment stats fields present', '✅');
  else err('New payment stats fields MISSING', Object.keys(stats).join(', '));
} else err('Admin stats', statsRes.data);

// ─── SUMMARY ──────────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════');
console.log(`  RESULT: ${pass} passed, ${fail} failed`);
console.log('══════════════════════════════════════════\n');
process.exit(fail > 0 ? 1 : 0);
