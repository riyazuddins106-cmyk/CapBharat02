import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
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
  app.use(express.json({ limit: '2mb' }));
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

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
