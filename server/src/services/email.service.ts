import nodemailer, { type Transporter } from 'nodemailer';
import { logger } from '../utils/logger.js';

/**
 * Generic SMTP-based email sender. Works with any provider that exposes SMTP
 * credentials (Resend, SendGrid, Gmail, Mailgun, a custom mail server, etc.).
 *
 * Configure via env vars once you have provider details:
 *   SMTP_HOST      e.g. smtp.resend.com
 *   SMTP_PORT      e.g. 587 (defaults to 587)
 *   SMTP_SECURE    "true" for port 465 (defaults to "false")
 *   SMTP_USER      SMTP username (for Resend this is "resend")
 *   SMTP_PASS      SMTP password / API key
 *   EMAIL_FROM     e.g. "ServeNow <no-reply@yourdomain.com>"
 *
 * Until these are set, sendEmail() is a no-op and callers should fall back
 * to logging (see otp.service.ts) so the flow stays testable.
 */

let transporter: Transporter | null = null;
let initialized = false;

function isConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransporter(): Transporter | null {
  if (!isConfigured()) return null;
  if (!initialized) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    initialized = true;
  }
  return transporter;
}

export const emailService = {
  isConfigured,

  async send(to: string, subject: string, html: string, text?: string): Promise<boolean> {
    const t = getTransporter();
    if (!t) return false;

    try {
      await t.sendMail({
        // Gmail rejects a From address that doesn't match the authenticated
        // account, so default to SMTP_USER when EMAIL_FROM isn't set.
        from: process.env.EMAIL_FROM ?? process.env.SMTP_USER ?? 'ServeNow <no-reply@servenow.in>',
        to,
        subject,
        html,
        text: text ?? html.replace(/<[^>]+>/g, ''),
      });
      return true;
    } catch (err) {
      logger.error(`[email] Failed to send "${subject}" to ${to}: ${(err as Error).message}`);
      return false;
    }
  },
};
