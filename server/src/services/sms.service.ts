import { logger } from '../utils/logger.js';
import { db } from '../config/database.js';
import { platformSettings } from '../database/schema/index.js';
import { eq } from 'drizzle-orm';

interface SmsConfig {
  provider?: 'fast2sms';
  fast2sms?: { apiKey: string };
  enabled?: boolean;
}

async function loadConfig(): Promise<SmsConfig | null> {
  try {
    const [row] = await db
      .select()
      .from(platformSettings)
      .where(eq(platformSettings.key, 'sms_config'));
    return row ? JSON.parse(row.value) : null;
  } catch {
    return null;
  }
}

async function sendFast2Sms(apiKey: string, phone: string, otp: string): Promise<boolean> {
  try {
    const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        authorization: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        route: 'otp',
        variables_values: otp,
        numbers: phone.replace(/\D/g, '').slice(-10), // strip country code, keep last 10 digits
      }),
    });
    const data = await res.json() as { return?: boolean; message?: string[] };
    if (!data.return) {
      logger.warn('[sms] Fast2SMS send failed:', data.message?.join(', '));
      return false;
    }
    return true;
  } catch (err) {
    logger.error('[sms] Fast2SMS request error:', err);
    return false;
  }
}

export const smsService = {
  /**
   * Send an OTP via SMS.
   * Falls back gracefully — never throws; returns true if sent, false otherwise.
   */
  async sendOtp(phone: string, otp: string): Promise<boolean> {
    if (!phone) return false;

    // 1. Try DB config (admin panel)
    let apiKey: string | undefined;
    try {
      const cfg = await loadConfig();
      if (cfg?.enabled === false) return false; // explicitly disabled
      apiKey = cfg?.fast2sms?.apiKey;
    } catch { /* ignore */ }

    // 2. Fall back to env variable
    if (!apiKey) {
      apiKey = process.env.FAST2SMS_API_KEY;
    }

    if (!apiKey) {
      logger.info('[sms] No SMS API key configured — skipping SMS OTP');
      return false;
    }

    const sent = await sendFast2Sms(apiKey, phone, otp);
    if (sent) {
      logger.info(`[sms] OTP sent to ${phone.slice(0, 4)}****`);
    }
    return sent;
  },
};
