import nodemailer from 'nodemailer';
import { logger } from '../utils/logger.js';
import { db } from '../config/database.js';
import { platformSettings } from '../database/schema/index.js';
import { eq } from 'drizzle-orm';

/**
 * Email sender that prefers the admin-panel DB config (email_config) and
 * falls back to SMTP_* environment variables when no DB config is saved.
 */

interface EmailConfig {
  provider?: 'smtp' | 'sendgrid';
  smtp?: { host: string; port: number; user: string; password: string; secure: boolean };
  sendgrid?: { apiKey: string };
  from?: { name: string; email: string };
}

async function loadDbConfig(): Promise<EmailConfig | null> {
  try {
    const [row] = await db
      .select()
      .from(platformSettings)
      .where(eq(platformSettings.key, 'email_config'));
    return row ? JSON.parse(row.value) : null;
  } catch {
    return null;
  }
}

async function buildTransporter(): Promise<{ transporter: nodemailer.Transporter; from: string } | null> {
  const cfg = await loadDbConfig();

  // --- DB config: SendGrid ---
  if (cfg?.provider === 'sendgrid' && cfg.sendgrid?.apiKey) {
    const from = cfg.from?.email
      ? `"${cfg.from.name ?? 'ServeNow'}" <${cfg.from.email}>`
      : 'ServeNow <noreply@servenow.in>';
    return {
      transporter: nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        auth: { user: 'apikey', pass: cfg.sendgrid.apiKey },
      }),
      from,
    };
  }

  // --- DB config: SMTP ---
  if (cfg?.smtp?.host && cfg.smtp.user) {
    const from = cfg.from?.email
      ? `"${cfg.from.name ?? 'ServeNow'}" <${cfg.from.email}>`
      : `ServeNow <${cfg.smtp.user}>`;
    return {
      transporter: nodemailer.createTransport({
        host: cfg.smtp.host,
        port: cfg.smtp.port ?? 587,
        secure: cfg.smtp.secure ?? false,
        auth: { user: cfg.smtp.user, pass: cfg.smtp.password ?? '' },
      }),
      from,
    };
  }

  // --- Fallback: environment variables ---
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (host && user && pass) {
    return {
      transporter: nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user, pass },
      }),
      from: process.env.EMAIL_FROM ?? `ServeNow <${user}>`,
    };
  }

  return null;
}

export const emailService = {
  isConfigured: async (): Promise<boolean> => {
    const t = await buildTransporter();
    return t !== null;
  },

  async send(to: string, subject: string, html: string, text?: string): Promise<boolean> {
    const built = await buildTransporter();
    if (!built) {
      logger.warn('[email] No email provider configured — skipping send');
      return false;
    }

    try {
      await built.transporter.sendMail({
        from: built.from,
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
