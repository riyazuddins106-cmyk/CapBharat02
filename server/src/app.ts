import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import QRCode from 'qrcode';
import { fileURLToPath } from 'url';
import routes from './routes/index.js';
import { apiRateLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { isProduction } from './config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: true,
      credentials: true,
    }),
  );
  app.use(express.json({
    limit: '2mb',
    // Capture raw body so Stripe & Razorpay webhook signature verification works
    verify: (req: any, _res, buf) => { req.rawBody = buf; },
  }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan(isProduction ? 'combined' : 'dev'));
  app.set('etag', false);
  app.use('/api', (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.use('/api', apiRateLimiter, routes);

  // In production, serve built web apps as static files.
  // Each app is built with its own base path:
  //   customer-web → /          (apps/customer-web/dist)
  //   admin-web    → /admin-panel/ (apps/admin-web/dist)
  //   partner-web  → /partner/   (apps/partner-web/dist)
  if (isProduction) {
    const root = path.resolve(__dirname, '..', '..'); // workspace root (server/dist → server → workspace root)

    const adminDist   = path.join(root, 'apps', 'admin-web', 'dist');
    const partnerDist = path.join(root, 'apps', 'partner-web', 'dist');
    const customerDist= path.join(root, 'apps', 'customer-web', 'dist');

    app.use('/admin-panel', express.static(adminDist));
    app.get('/admin-panel/*', (_req, res) =>
      res.sendFile(path.join(adminDist, 'index.html')));

    app.use('/partner', express.static(partnerDist));
    app.get('/partner/*', (_req, res) =>
      res.sendFile(path.join(partnerDist, 'index.html')));

    app.use(express.static(customerDist));
    app.get('*', (_req, res) =>
      res.sendFile(path.join(customerDist, 'index.html')));
  }

  // QR code page for physical device testing
  app.get('/qr', async (_req, res) => {
    // Derive tunnel URL from .expo/settings.json (urlRandomness field).
    // This is the source of truth — the temp URL files are a secondary cache.
    const workspaceRoot = path.resolve(__dirname, '..', '..');
    const getUrl = (appDir: string, port: number) => {
      try {
        const settingsPath = path.join(workspaceRoot, 'apps', appDir, '.expo', 'settings.json');
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        const r = settings.urlRandomness;
        if (r) return `exp://${r.toLowerCase()}-anonymous-${port}.exp.direct`;
      } catch { /* fall through */ }
      // fallback: temp file written by tunnel script
      try { return fs.readFileSync(`/tmp/expo-tunnel-${port}.url`, 'utf8').trim(); } catch { return ''; }
    };
    const customerUrl = getUrl('mobile', 8080);
    const partnerUrl  = getUrl('mobile-partner', 8099);

    const makeQr = async (url: string) => {
      if (!url) return '';
      return QRCode.toDataURL(url, { width: 220, margin: 1, color: { dark: '#1e293b', light: '#f8fafc' } });
    };

    const [customerQr, partnerQr] = await Promise.all([makeQr(customerUrl), makeQr(partnerUrl)]);

    const qrCard = (label: string, url: string, qr: string, color: string) => {
      if (!url) return `<div class="card"><h2>${label}</h2><p class="waiting">⏳ Tunnel starting… refresh in a few seconds.</p></div>`;
      return `
        <div class="card">
          <h2>${label}</h2>
          <img src="${qr}" width="220" height="220" style="border-radius:12px" alt="QR code"/>
          <p class="url">${url}</p>
          <a class="btn" style="background:${color}" href="${url}">Open in Expo Go</a>
        </div>`;
    };

    const autoRefresh = (!customerUrl || !partnerUrl)
      ? `<meta http-equiv="refresh" content="10"/>`
      : '';

    res.setHeader('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>ServeNow — Expo QR Codes</title>
  ${autoRefresh}
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,sans-serif;background:#0f172a;color:#f1f5f9;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;gap:24px}
    h1{font-size:1.5rem;font-weight:700;letter-spacing:-.5px}
    .cards{display:flex;flex-wrap:wrap;gap:24px;justify-content:center}
    .card{background:#1e293b;border-radius:16px;padding:28px 24px;display:flex;flex-direction:column;align-items:center;gap:16px;min-width:260px;box-shadow:0 4px 24px rgba(0,0,0,.4)}
    .card h2{font-size:1.1rem;font-weight:600}
    .url{font-size:.7rem;color:#94a3b8;word-break:break-all;text-align:center;max-width:220px}
    .btn{padding:10px 20px;border-radius:8px;color:#fff;text-decoration:none;font-weight:600;font-size:.9rem}
    .waiting{color:#94a3b8;font-size:.9rem}
    .hint{font-size:.75rem;color:#475569}
  </style>
</head>
<body>
  <h1>📱 ServeNow — Scan with Expo Go</h1>
  <div class="cards">
    ${qrCard('Customer App', customerUrl, customerQr, '#6366f1')}
    ${qrCard('Partner App',  partnerUrl,  partnerQr,  '#10b981')}
  </div>
  <p class="hint">${!customerUrl || !partnerUrl ? 'Auto-refreshes every 10 s while tunnel is starting' : 'Scan with the Expo Go app on your phone'}</p>
</body>
</html>`);
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
