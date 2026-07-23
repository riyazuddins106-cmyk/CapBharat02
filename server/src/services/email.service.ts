import nodemailer from 'nodemailer';
import { logger } from '../utils/logger.js';
import { db } from '../config/database.js';
import { platformSettings } from '../database/schema/index.js';
import { eq } from 'drizzle-orm';

/**
 * Email sender priority:
 *  1. Admin-panel DB config (email_config key in platform_settings)
 *  2. SMTP_* environment variables
 *  3. Ethereal (auto-provisioned test account) — dev/test only, never production
 *
 * Ethereal intercepts every email and shows it at a web URL that is logged to
 * the server console. No credentials or setup needed — great for local testing.
 */

interface EmailConfig {
  provider?: 'smtp' | 'sendgrid';
  smtp?: { host: string; port: number; user: string; password: string; secure: boolean };
  sendgrid?: { apiKey: string };
  from?: { name: string; email: string };
}

// Cache the Ethereal test account so we only provision it once per process.
let _etherealTransporter: nodemailer.Transporter | null = null;
let _etherealFrom = 'ServeNow <noreply@servenow.dev>';
let _etherealUser = '';
let _etherealPass = '';

async function getEtherealTransporter(): Promise<{ transporter: nodemailer.Transporter; from: string }> {
  if (!_etherealTransporter) {
    const testAccount = await nodemailer.createTestAccount();
    _etherealUser = testAccount.user;
    _etherealPass = testAccount.pass;
    _etherealFrom = `"ServeNow (test)" <${testAccount.user}>`;
    _etherealTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    logger.info('[email] ═══════════════════════════════════════════════');
    logger.info('[email] Ethereal test SMTP ready (dev mode)');
    logger.info(`[email]   Login : https://ethereal.email/login`);
    logger.info(`[email]   User  : ${testAccount.user}`);
    logger.info(`[email]   Pass  : ${testAccount.pass}`);
    logger.info('[email] ═══════════════════════════════════════════════');
  }
  return { transporter: _etherealTransporter, from: _etherealFrom };
}

async function loadDbConfig(): Promise<EmailConfig | null> {
  try {
    const [row] = await db
      .select()
      .from(platformSettings)
      .where(eq(platformSettings.key, 'email_config'));
    return row ? JSON.parse(row.value) : null;
  } catch (err) {
    logger.error(`[email] Failed to load DB email config — falling back to env vars: ${(err as Error).message}`);
    return null;
  }
}

interface BuiltTransporter {
  transporter: nodemailer.Transporter;
  from: string;
  isTest: boolean;
}

async function buildTransporter(): Promise<BuiltTransporter> {
  const cfg = await loadDbConfig();

  // --- DB config: SendGrid ---
  if (cfg?.provider === 'sendgrid' && cfg.sendgrid?.apiKey) {
    const from = cfg.from?.email
      ? `"${cfg.from.name ?? 'ServeNow'}" <${cfg.from.email}>`
      : 'ServeNow <noreply@servenow.in>';
    return {
      isTest: false,
      from,
      transporter: nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        auth: { user: 'apikey', pass: cfg.sendgrid.apiKey },
      }),
    };
  }

  // --- DB config: SMTP ---
  if (cfg?.smtp?.host && cfg.smtp.user) {
    const smtpPort = cfg.smtp.port ?? 587;
    const smtpSecure = smtpPort === 465 ? true : (cfg.smtp.secure ?? false);
    const from = cfg.from?.email
      ? `"${cfg.from.name ?? 'ServeNow'}" <${cfg.from.email}>`
      : `ServeNow <${cfg.smtp.user}>`;
    return {
      isTest: false,
      from,
      transporter: nodemailer.createTransport({
        host: cfg.smtp.host,
        port: smtpPort,
        secure: smtpSecure,
        auth: { user: cfg.smtp.user, pass: cfg.smtp.password ?? '' },
      }),
    };
  }

  // --- Env-var SMTP ---
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (host && user && pass) {
    return {
      isTest: false,
      from: process.env.EMAIL_FROM ?? `ServeNow <${user}>`,
      transporter: nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user, pass },
      }),
    };
  }

  // --- Ethereal fallback (dev / test only) ---
  if (process.env.NODE_ENV !== 'production') {
    const ethereal = await getEtherealTransporter();
    return { ...ethereal, isTest: true };
  }

  // Production with no config — callers must handle gracefully.
  throw new Error('No email provider configured. Set SMTP_USER + SMTP_PASS or configure email in the admin panel.');
}

export interface SendResult {
  sent: boolean;
  /** Ethereal preview URL — only set when using the test account (non-production) */
  previewUrl?: string;
}

export const emailService = {
  isConfigured: async (): Promise<boolean> => {
    if (process.env.NODE_ENV !== 'production') return true; // Ethereal always available in dev
    try {
      await buildTransporter();
      return true;
    } catch {
      return false;
    }
  },

  async send(to: string, subject: string, html: string, text?: string): Promise<SendResult> {
    let built: BuiltTransporter;
    try {
      built = await buildTransporter();
    } catch (err) {
      logger.warn(`[email] ${(err as Error).message} — skipping send to ${to}`);
      return { sent: false };
    }

    try {
      const info = await built.transporter.sendMail({
        from: built.from,
        to,
        subject,
        html,
        text: text ?? html.replace(/<[^>]+>/g, ''),
      });

      if (built.isTest) {
        const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
        logger.info(`[email] ✉  Test email delivered to ${to} — subject: "${subject}"`);
        logger.info(`[email] 🔗 Preview → ${previewUrl}`);
        return { sent: true, previewUrl: previewUrl as string | undefined };
      }

      return { sent: true };
    } catch (err) {
      logger.error(`[email] Failed to send "${subject}" to ${to}: ${(err as Error).message}`);
      return { sent: false };
    }
  },
};
