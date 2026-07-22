import crypto from 'crypto';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { otpRepository } from '../repositories/otp.repository.js';
import { emailService } from './email.service.js';
import type { OtpCode } from '../database/schema/otpCodes.js';

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function generateCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

const SUBJECTS: Record<OtpCode['purpose'], string> = {
  signup: 'Verify your ServeNow account',
  login: 'Your ServeNow login code',
  password_reset: 'Reset your ServeNow password',
};

function buildEmailHtml(purpose: OtpCode['purpose'], code: string): string {
  const intro =
    purpose === 'signup'
      ? 'Use the code below to verify your email and finish creating your ServeNow account.'
      : 'Use the code below to reset your ServeNow password.';
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <h2>ServeNow</h2>
      <p>${intro}</p>
      <p style="font-size:32px;font-weight:bold;letter-spacing:4px">${code}</p>
      <p>This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
    </div>
  `;
}

export const otpService = {
  async issue(email: string, purpose: OtpCode['purpose'], userId?: string): Promise<string> {
    const code = generateCode();
    const codeHash = await bcrypt.hash(code, 10);

    await otpRepository.create({
      userId: userId ?? null,
      email,
      codeHash,
      purpose,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    });

    // Send via SMTP if configured (see email.service.ts for required env vars:
    // SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM). Falls back to
    // logging the code in non-production so the flow stays testable until a
    // provider is wired up.
    let emailed = false;
    emailed = await emailService.send(email, SUBJECTS[purpose], buildEmailHtml(purpose, code));

    if (!emailed && process.env.NODE_ENV !== 'production') {
      logger.info(`[otp] Verification code for ${email} (${purpose}): ${code}`);
      // Also append to a temp file so test scripts can pick up OTPs without SMTP
      try {
        fs.appendFileSync('/tmp/otp-dev.log', `${email} ${purpose} ${code}\n`);
      } catch { /* ignore */ }
    }

    return code;
  },

  async verify(email: string, purpose: OtpCode['purpose'], code: string): Promise<void> {
    const otp = await otpRepository.findLatestActive(email, purpose);
    if (!otp) {
      throw AppError.badRequest('No active verification code found. Please request a new one.');
    }

    if (otp.expiresAt.getTime() < Date.now()) {
      throw AppError.badRequest('Verification code has expired. Please request a new one.');
    }

    const attempts = Number(otp.attempts ?? '0');
    if (attempts >= MAX_ATTEMPTS) {
      throw AppError.tooManyRequests('Too many incorrect attempts. Please request a new code.');
    }

    const isValid = await bcrypt.compare(code, otp.codeHash);
    if (!isValid) {
      await otpRepository.incrementAttempts(otp.id, attempts + 1);
      throw AppError.badRequest('Invalid verification code.');
    }

    await otpRepository.consume(otp.id);
  },
};
