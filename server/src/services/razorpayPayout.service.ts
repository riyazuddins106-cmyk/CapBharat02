import { db } from '../config/database.js';
import { platformSettings, professionals, users } from '../database/schema/index.js';
import { eq } from 'drizzle-orm';
import { AppError } from '../utils/AppError.js';

type RazorpayConfig = {
  enabled?: boolean;
  keyId?: string;
  keySecret?: string;
  xAccountNumber?: string;
};

type PaymentConfig = {
  testMode?: { enabled?: boolean };
  razorpay?: RazorpayConfig;
};

type RazorpayApiResponse = {
  id?: string;
  status?: string;
  error?: { description?: string; reason?: string; code?: string };
};

async function getConfig(): Promise<PaymentConfig> {
  const [row] = await db.select().from(platformSettings).where(eq(platformSettings.key, 'payment_config'));
  return row ? JSON.parse(row.value) as PaymentConfig : {};
}

type PayoutControlConfig = {
  payoutsPaused?: boolean;
};

async function getPayoutControlConfig(): Promise<PayoutControlConfig> {
  const [row] = await db.select().from(platformSettings).where(eq(platformSettings.key, 'payout_config'));
  if (!row) return {};
  try {
    return JSON.parse(row.value) as PayoutControlConfig;
  } catch {
    return {};
  }
}

export async function arePartnerPayoutsPaused(): Promise<boolean> {
  const config = await getPayoutControlConfig();
  return config.payoutsPaused === true;
}

export async function assertPartnerPayoutsNotPaused(): Promise<void> {
  if (await arePartnerPayoutsPaused()) {
    throw AppError.badRequest('Partner payouts are temporarily paused by an administrator.');
  }
}

function providerError(response: Response, body: RazorpayApiResponse) {
  return body.error?.description
    || body.error?.reason
    || `RazorpayX request failed (HTTP ${response.status}).`;
}

async function razorpayRequest(
  cfg: RazorpayConfig,
  path: string,
  body: Record<string, unknown>,
): Promise<RazorpayApiResponse> {
  const response = await fetch(`https://api.razorpay.com/v1/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${cfg.keyId}:${cfg.keySecret}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({})) as RazorpayApiResponse;
  if (!response.ok || !result.id) throw AppError.badRequest(providerError(response, result));
  return result;
}

/** Create a RazorpayX UPI payout using the credentials configured in Admin. */
export async function createRazorpayUpiPayout(input: {
  payoutRequestId: string;
  professionalId: string;
  amountRupees: number;
  upiId: string;
  note?: string | null;
}) {
  await assertPartnerPayoutsNotPaused();
  const cfg = await getConfig();
  const razorpay = cfg.razorpay;
  if (cfg.testMode?.enabled) {
    throw AppError.badRequest('Disable Test / Sandbox Mode before sending real partner payouts.');
  }
  if (!razorpay?.enabled || !razorpay.keyId || !razorpay.keySecret) {
    throw AppError.badRequest('Razorpay is not enabled or its Key ID/Secret is missing in Admin → Payment Config.');
  }
  if (!razorpay.xAccountNumber) {
    throw AppError.badRequest('RazorpayX Payout Account Number is missing in Admin → Payment Config.');
  }

  const [partner] = await db.select({
    name: professionals.name,
    contactId: professionals.payoutContactId,
    fundAccountId: professionals.payoutFundAccountId,
    email: users.email,
    phone: users.phone,
  })
    .from(professionals)
    .leftJoin(users, eq(users.id, professionals.userId))
    .where(eq(professionals.id, input.professionalId))
    .limit(1);
  if (!partner) throw AppError.notFound('Partner profile not found.');

  let contactId = partner.contactId;
  if (!contactId) {
    const contact = await razorpayRequest(razorpay, 'contacts', {
      name: partner.name,
      email: partner.email,
      contact: partner.phone || undefined,
      type: 'vendor',
      reference_id: `servenow_partner_${input.professionalId}`,
      notes: { professional_id: input.professionalId },
    });
    contactId = contact.id!;
    await db.update(professionals)
      .set({ payoutContactId: contactId, updatedAt: new Date() })
      .where(eq(professionals.id, input.professionalId));
  }

  let fundAccountId = partner.fundAccountId;
  if (!fundAccountId) {
    const fundAccount = await razorpayRequest(razorpay, 'fund_accounts', {
      contact_id: contactId,
      account_type: 'vpa',
      vpa: { address: input.upiId },
    });
    fundAccountId = fundAccount.id!;
    await db.update(professionals)
      .set({ payoutFundAccountId: fundAccountId, updatedAt: new Date() })
      .where(eq(professionals.id, input.professionalId));
  }

  const response = await fetch('https://api.razorpay.com/v1/payouts', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${razorpay.keyId}:${razorpay.keySecret}`).toString('base64')}`,
      'Content-Type': 'application/json',
      'X-Payout-Idempotency': input.payoutRequestId,
    },
    body: JSON.stringify({
      account_number: razorpay.xAccountNumber,
      fund_account_id: fundAccountId,
      amount: Math.round(input.amountRupees * 100),
      currency: 'INR',
      mode: 'UPI',
      purpose: 'payout',
      queue_if_low_balance: true,
      reference_id: `servenow_${input.payoutRequestId}`,
      narration: (input.note?.trim() || 'ServeNow partner payout').slice(0, 30),
    }),
  });
  const body = await response.json().catch(() => ({})) as RazorpayApiResponse;
  if (!response.ok || !body.id) throw AppError.badRequest(providerError(response, body));

  return { id: body.id, status: body.status ?? 'queued' };
}