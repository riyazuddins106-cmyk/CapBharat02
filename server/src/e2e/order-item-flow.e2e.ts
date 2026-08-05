/**
 * Current service-order contract smoke test.
 *
 * Covers the multi-service cart, master order creation, per-service listing,
 * cancellation, continue-searching, and test-mode payment when enabled.
 */
export {};

const BASE = 'http://localhost:8000/api';
const run = Date.now();
let passed = 0;
let failed = 0;

async function request(method: string, path: string, body?: unknown, token?: string) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await response.json().catch(() => ({})) as {
    data?: any;
    error?: { message?: string };
    message?: string;
  };
  return { response, json, data: json?.data, error: json?.error?.message ?? json?.message };
}

function check(label: string, condition: boolean, detail?: unknown) {
  if (condition) {
    passed++;
    console.log(`✓ ${label}`);
  } else {
    failed++;
    console.error(`✗ ${label}${detail === undefined ? '' : ` — ${JSON.stringify(detail)}`}`);
  }
}

async function main() {
  const health = await request('GET', '/health');
  check('API health', health.response.ok, health.error);

  const email = `order-item.${run}@test.invalid`;
  const password = 'OrderFlow1';
  const registration = await request('POST', '/auth/register', {
    fullName: 'Order Flow Customer',
    email,
    password,
  });
  check('customer registration', registration.response.status === 201, registration.error);
  const verificationCode = registration.data?.devCode;
  if (!verificationCode) throw new Error('Registration did not return a development OTP.');

  const verified = await request('POST', '/auth/verify-otp', {
    email,
    code: verificationCode,
    purpose: 'signup',
  });
  check('customer OTP verification', verified.response.ok, verified.error);

  const login = await request('POST', '/auth/login', { email, password });
  check('customer login', login.response.ok, login.error);
  const token = login.data?.accessToken as string;
  if (!token) throw new Error('Login did not return an access token.');

  const services = await request('GET', '/services');
  const serviceRows = (services.data?.services ?? services.data ?? []) as Array<{ id: string }>;
  check('service catalog available', serviceRows.length > 0);
  if (!serviceRows.length) throw new Error('No active service is available for the order test.');

  const selected = serviceRows.slice(0, Math.min(2, serviceRows.length));
  for (const service of selected) {
    const added = await request('POST', '/cart/items', { serviceId: service.id, quantity: 1 }, token);
    check(`add service ${service.id.slice(0, 8)} to cart`, added.response.status === 201, added.error);
  }

  const cart = await request('GET', '/cart', undefined, token);
  check('cart contains selected services', cart.response.ok && cart.data?.items?.length === selected.length, cart.error);

  // Keep the fixture inside the configured booking window. Adding 24 hours
  // can land outside the window depending on the time the smoke test runs.
  const scheduledDate = new Date();
  scheduledDate.setDate(scheduledDate.getDate() + 1);
  scheduledDate.setHours(10, 0, 0, 0);
  const scheduledAt = scheduledDate.toISOString();
  const checkout = await request('POST', '/orders/checkout', { scheduledAt, notes: 'Current order contract test' }, token);
  check('master order checkout', checkout.response.status === 201, checkout.error);
  const order = checkout.data as { id?: string; status?: string; items?: Array<{ id: string; status: string; partnerId?: string | null }> };
  check('master order has searching status', order?.status === 'searching_partners', order?.status);
  check('master order has per-service items', Array.isArray(order?.items) && order.items.length === selected.length, order?.items);

  if (!order?.id || !order.items?.length) throw new Error('Checkout did not return a usable order.');
  const listed = await request('GET', '/orders', undefined, token);
  check('customer order list includes master order', listed.response.ok && listed.data?.some((item: { id: string }) => item.id === order.id), listed.error);

  const firstItem = order.items[0];
  const cancelled = await request('PATCH', `/orders/${order.id}/items/${firstItem.id}/cancel`, {}, token);
  check('customer can cancel one service item', cancelled.response.ok, cancelled.error);
  const cancelledItem = cancelled.data?.items?.find((item: { id: string }) => item.id === firstItem.id);
  check('cancelled item reports cancelled state', cancelledItem?.status === 'cancelled', cancelledItem?.status);

  if (order.items.length > 1) {
    const secondItem = order.items[1];
    const continued = await request('PATCH', `/orders/${order.id}/items/${secondItem.id}/continue-searching`, {}, token);
    check('customer can continue searching for an unassigned item', continued.response.ok, continued.error);
  }

  const config = await request('GET', '/payments/config');
  if (config.data?.testMode && order.items.length > 1) {
    const secondItem = order.items[1];
    const payment = await request('POST', `/orders/${order.id}/items/${secondItem.id}/test-pay`, { method: 'cash' }, token);
    check('test-mode per-service payment completes', payment.response.ok, payment.error);
  } else {
    console.log('– test-mode payment check skipped because payment test mode is disabled');
  }

  const unauthenticated = await request('GET', '/orders');
  check('unauthenticated order list is blocked', unauthenticated.response.status === 401, unauthenticated.error);

  console.log(`\nOrder-item flow: ${passed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});