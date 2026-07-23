import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { db } from '../config/database.js';
import { platformSettings } from '../database/schema/index.js';
import { eq } from 'drizzle-orm';
import { AppError } from '../utils/AppError.js';
import nodemailer from 'nodemailer';

/* ── Allowed setting keys ─────────────────────────────────────────── */
const ALLOWED_KEYS = new Set(['payment_config', 'email_config', 'sms_config', 'contact_config']);

/* ── GET /admin/settings/:key ─────────────────────────────────────── */
export const getSettings = asyncHandler(async (req: Request, res: Response) => {
  const { key } = req.params;
  if (!ALLOWED_KEYS.has(key)) throw AppError.badRequest(`Unknown settings key: ${key}`);

  const [row] = await db
    .select()
    .from(platformSettings)
    .where(eq(platformSettings.key, key));

  // Return empty defaults if not yet configured
  const value = row ? JSON.parse(row.value) : getDefaults(key);
  res.json({ success: true, data: { key, value } });
});

/* ── PUT /admin/settings/:key ─────────────────────────────────────── */
export const upsertSettings = asyncHandler(async (req: Request, res: Response) => {
  const { key } = req.params;
  if (!ALLOWED_KEYS.has(key)) throw AppError.badRequest(`Unknown settings key: ${key}`);

  const value = req.body;
  if (typeof value !== 'object' || value === null) {
    throw AppError.badRequest('Request body must be a JSON object');
  }

  const serialized = JSON.stringify(value);

  await db
    .insert(platformSettings)
    .values({ key, value: serialized })
    .onConflictDoUpdate({
      target: platformSettings.key,
      set: { value: serialized, updatedAt: new Date() },
    });

  res.json({ success: true, data: { key, value } });
});

/* ── POST /admin/settings/email/test ─────────────────────────────── */
export const testEmail = asyncHandler(async (req: Request, res: Response) => {
  const { to } = req.body as { to?: string };
  if (!to) throw AppError.badRequest('`to` email address is required');

  // Load saved email config
  const [row] = await db
    .select()
    .from(platformSettings)
    .where(eq(platformSettings.key, 'email_config'));

  const cfg: EmailConfig = row ? JSON.parse(row.value) : getDefaults('email_config');

  let transporter: nodemailer.Transporter;

  if (cfg.provider === 'sendgrid' && cfg.sendgrid?.apiKey) {
    transporter = nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      auth: { user: 'apikey', pass: cfg.sendgrid.apiKey },
    });
  } else if (cfg.smtp?.host) {
    transporter = nodemailer.createTransport({
      host:   cfg.smtp.host,
      port:   cfg.smtp.port ?? 587,
      secure: cfg.smtp.secure ?? false,
      auth:   cfg.smtp.user ? { user: cfg.smtp.user, pass: cfg.smtp.password ?? '' } : undefined,
    });
  } else {
    throw AppError.badRequest('No email provider configured yet. Save a valid SMTP or SendGrid config first.');
  }

  await transporter.sendMail({
    from: `"${cfg.from?.name ?? 'ServeNow'}" <${cfg.from?.email ?? 'noreply@servenow.in'}>`,
    to,
    subject: '✅ ServeNow — Email Config Test',
    html: `<p>This is a test email from your ServeNow admin panel.</p>
           <p>If you received this, your email configuration is working correctly.</p>`,
  });

  res.json({ success: true, data: { message: `Test email sent to ${to}` } });
});

/* ── Helpers ──────────────────────────────────────────────────────── */
interface EmailConfig {
  provider?: 'smtp' | 'sendgrid';
  smtp?: { host: string; port: number; user: string; password: string; secure: boolean };
  sendgrid?: { apiKey: string };
  from?: { name: string; email: string };
  notifications?: Record<string, boolean>;
}

function getDefaults(key: string): object {
  if (key === 'payment_config') {
    return {
      cod:      { enabled: true  },
      upi:      { enabled: false, vpa: '' },
      razorpay: { enabled: false, keyId: '', keySecret: '', webhookSecret: '' },
      stripe:   { enabled: false, publishableKey: '', secretKey: '' },
    };
  }
  if (key === 'email_config') {
    return {
      provider: 'smtp',
      smtp:     { host: '', port: 587, user: '', password: '', secure: false },
      sendgrid: { apiKey: '' },
      from:     { name: 'ServeNow', email: 'noreply@servenow.in' },
      notifications: {
        bookingConfirmation: true,
        bookingCancellation: true,
        paymentReceipt:      true,
        otp:                 true,
      },
    };
  }
  if (key === 'sms_config') {
    return {
      enabled:   false,
      provider:  'fast2sms',
      fast2sms:  { apiKey: '' },
    };
  }
  if (key === 'contact_config') {
    return {
      email:       'support@servenow.in',
      phone:       '+91 98765 43210',
      hours:       'Mon–Sat, 9am–6pm IST',
      docsUrl:     'docs.servenow.in',
    };
  }
  return {};
}
