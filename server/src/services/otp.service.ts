import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { otpRepository } from '../repositories/otp.repository.js';
import type { OtpCode } from '../database/schema/otpCodes.js';

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function generateCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export const otpService = {
  async issue(email: string, purpose: OtpCode['purpose'], userId?: string): Promise<void> {
    const code = generateCode();
    const codeHash = await bcrypt.hash(code, 10);

    await otpRepository.create({
      userId: userId ?? null,
      email,
      codeHash,
      purpose,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    });

    // No transactional email provider is configured yet. Logging the OTP so the
    // flow is fully testable end-to-end in development. Wire up a real email
    // provider (e.g. Supabase's SMTP or Resend) before going to production.
    logger.info(`[otp] Verification code for ${email} (${purpose}): ${code}`);
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
