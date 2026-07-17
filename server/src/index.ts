import { env } from './config/env.js';
import { createApp } from './app.js';
import { ensureAvatarBucket } from './config/supabase.js';
import { logger } from './utils/logger.js';

async function main() {
  const app = createApp();
  const port = Number(env.PORT);

  app.listen(port, '0.0.0.0', () => {
    logger.info(`ServeNow API listening on http://localhost:${port}`);
    // Run bucket setup in background so it doesn't delay startup / health check
    ensureAvatarBucket().catch((err) =>
      logger.error('Failed to ensure avatar bucket', err)
    );
  });
}

main().catch((err) => {
  logger.error('Failed to start server', err);
  process.exit(1);
});
