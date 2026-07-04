import { env } from './config/env.js';
import { createApp } from './app.js';
import { ensureAvatarBucket } from './config/supabase.js';
import { logger } from './utils/logger.js';

async function main() {
  await ensureAvatarBucket();

  const app = createApp();
  const port = Number(env.PORT);

  app.listen(port, 'localhost', () => {
    logger.info(`ServeNow API listening on http://localhost:${port}`);
  });
}

main().catch((err) => {
  logger.error('Failed to start server', err);
  process.exit(1);
});
