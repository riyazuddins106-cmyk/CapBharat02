import crypto from 'crypto';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { otpRepository } from '../repositories/otp.repository.js';
import { emailService } from './email.service.js';
import { smsService } from './sms.service.js';
import { db } from '../config/database.js';
import { platformSettings } from '../database/schema/index.js';
import { eq } from 'drizzle-orm';
import type { OtpCode } from '../database/schema/otpCodes.js';

/* ── Config loader (cached 60 s) ─────────────────────────────────── */

interface OtpConfig {
  channels: { email: boolean; sms: boolean };
  expiryMinutes: number;
  maxAttempts: number;
  codeLength: 4 | 6;
}

const DEFAULT_CONFIG: OtpConfig = {
  channels: { email: true, sms: true },
  expiryMinutes: 10,
  maxAttempts: 5,
  codeLength: 6,
};

let _cachedConfig: OtpConfig | null = null;
let _cacheExpiry = 0;
const CACHE_TTL_MS = 60_000;

async function loadConfig(): Promise<OtpConfig> {
  if (_cachedConfig && Date.now() < _cacheExpiry) return _cachedConfig;
  try {
    const [row] = await db
      .select()
      .from(platformSettings)
      .where(eq(platformSettings.key, 'otp_config'));
    const cfg = row ? { ...DEFAULT_CONFIG, ...(JSON.parse(row.value) as Partial<OtpConfig>) } : DEFAULT_CONFIG;
    // ensure nested channels object is merged too
    if (row) {
      const parsed = JSON.parse(row.value) as Partial<OtpConfig>;
      cfg.channels = { ...DEFAULT_CONFIG.channels, ...(parsed.channels ?? {}) };
    }
    _cachedConfig = cfg;
    _cacheExpiry = Date.now() + CACHE_TTL_MS;
    return cfg;
  } catch {
    return DEFAULT_CONFIG;
  }
}

/* ── OTP generator ───────────────────────────────────────────────── */

function generateCode(length: 4 | 6): string {
  const max = Math.pow(10, length);
  return crypto.randomInt(0, max).toString().padStart(length, '0');
}

/* ── Email content ───────────────────────────────────────────────── */

const SUBJECTS: Record<OtpCode['purpose'], string> = {
  signup:         'Verify your ServeNow account',
  login:          'Your ServeNow login code',
  password_reset: 'Reset your ServeNow password',
};

function buildEmailHtml(purpose: OtpCode['purpose'], code: string, expiryMinutes: number): string {
  const intro =
    purpose === 'signup'
      ? 'Use the code below to verify your account and finish creating your ServeNow account.'
      : purpose === 'login'
      ? 'Use the code below to log in to your ServeNow account.'
      : 'Use the code below to reset your ServeNow password.';

  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="color:#1a1a2e">ServeNow</h2>
      <p style="color:#555">${intro}</p>
      <div style="background:#f5f5f5;border-radius:12px;padding:24px;text-align:center;margin:24px 0">
        <p style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#1a1a2e;margin:0">${code}</p>
      </div>
      <p style="color:#888;font-size:13px">
        This code expires in <strong>${expiryMinutes} minutes</strong>.
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>
  `;
}

/* ── OTP Service ─────────────────────────────────────────────────── */

export const otpService = {
  /**
   * Issue an OTP and deliver it based on admin-configured channels.
   * - Email: sent when channels.email is true (and email config is set up)
   * - SMS:   sent when channels.sms is true AND phone is provided (best-effort)
   * Both channels receive the same code simultaneously.
   */
  async issue(
    email: string,
    purpose: OtpCode['purpose'],
    userId?: string,
    phone?: string,
  ): Promise<string> {
    const cfg = await loadConfig();
    const code = generateCode(cfg.codeLength);
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + cfg.expiryMinutes * 60 * 1000);

    await otpRepository.create({
      userId: userId ?? null,
      email,
      codeHash,
      purpose,
      expiresAt,
    });

    const deliveryResults: string[] = [];

    // ── Dev log (always written so OTP is never silently lost) ─────
    if (process.env.NODE_ENV !== 'production') {
      try {
        fs.appendFileSync(
          '/tmp/otp-dev.log',
          `${new Date().toISOString()} | ${email} | ${purpose} | code=${code} | channels=email:${cfg.channels.email},sms:${cfg.channels.sms}\n`,
        );
      } catch { /* ignore */ }
    }

    // ── Email channel ──────────────────────────────────────────────
    if (cfg.channels.email) {
      try {
        const result = await emailService.send(
          email,
          SUBJECTS[purpose],
          buildEmailHtml(purpose, code, cfg.expiryMinutes),
        );
        deliveryResults.push(result.sent ? 'email:sent' : 'email:ethereal');

        if (process.env.NODE_ENV !== 'production') {
          try {
            const previewLine = result.previewUrl ? `  preview: ${result.previewUrl}` : '';
            logger.info(
              result.sent
                ? `[otp] Email sent → ${email} (${purpose})${previewLine ? '\n' + previewLine : ''}`
                : `[otp] Email (Ethereal) → ${email} (${purpose}) code=${code}${previewLine ? ' ' + previewLine : ''}`,
            );
            fs.appendFileSync(
              '/tmp/otp-dev.log',
              `${new Date().toISOString()} | ${email} | ${purpose} | code=${code}${result.previewUrl ? ` | preview=${result.previewUrl}` : ''}\n`,
            );
          } catch { /* ignore */ }
        }
      } catch (err) {
        logger.error(`[otp] Email delivery failed for ${email}: ${(err as Error).message}`);
        deliveryResults.push('email:failed');
      }
    } else {
      deliveryResults.push('email:disabled');
    }

    // ── SMS channel ────────────────────────────────────────────────
    if (cfg.channels.sms && phone) {
      // Best-effort: never blocks, never throws
      smsService.sendOtp(phone, code).then(sent => {
        if (sent) {
          logger.info(`[otp] SMS sent → ${phone.slice(0, 4)}**** (${purpose})`);
          deliveryResults.push('sms:sent');
        } else {
          logger.info(`[otp] SMS skipped/failed → ${phone.slice(0, 4)}****`);
        }
      }).catch(() => {});
    } else if (cfg.channels.sms && !phone) {
      logger.info(`[otp] SMS channel enabled but no phone provided for ${email}`);
    }

    if (process.env.NODE_ENV !== 'production') {
      logger.info(`[otp] Delivery summary: [${deliveryResults.join(', ')}] | expiry=${cfg.expiryMinutes}min | length=${cfg.codeLength}`);
    }

    return code;
  },

  async verify(email: string, purpose: OtpCode['purpose'], code: string): Promise<void> {
    const cfg = await loadConfig();

    const otp = await otpRepository.findLatestActive(email, purpose);
    if (!otp) {
      throw AppError.badRequest('No active verification code found. Please request a new one.');
    }

    if (otp.expiresAt.getTime() < Date.now()) {
      throw AppError.badRequest('Verification code has expired. Please request a new one.');
    }

    const attempts = Number(otp.attempts ?? '0');
    if (attempts >= cfg.maxAttempts) {
      throw AppError.tooManyRequests('Too many incorrect attempts. Please request a new code.');
    }

    const isValid = await bcrypt.compare(code, otp.codeHash);
    if (!isValid) {
      await otpRepository.incrementAttempts(otp.id, attempts + 1);
      const remaining = cfg.maxAttempts - (attempts + 1);
      throw AppError.badRequest(
        remaining > 0
          ? `Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
          : 'Invalid verification code. No more attempts — please request a new code.',
      );
    }

    await otpRepository.consume(otp.id);
  },
};
