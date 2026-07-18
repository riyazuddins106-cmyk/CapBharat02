import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

// Prefer SUPABASE_DATABASE_URL — it uses the pooler (prepare:false) which matches the server.
// Falling back to DATABASE_URL pushes to the direct connection, a different DB endpoint.
const databaseUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('SUPABASE_DATABASE_URL is not set. Add it to Replit Secrets.');
}

export default defineConfig({
  out: './src/database/migrations',
  schema: './src/database/schema/*.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
  strict: true,
  verbose: true,
});
