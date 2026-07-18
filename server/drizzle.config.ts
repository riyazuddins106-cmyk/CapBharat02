import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

// Prefer SUPABASE_DATABASE_URL — it uses the pooler which matches the server.
// Falling back to DATABASE_URL pushes to the direct connection, a different DB endpoint.
const rawUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
if (!rawUrl) {
  throw new Error('SUPABASE_DATABASE_URL is not set. Add it to Replit Secrets.');
}
// drizzle-kit schema introspection needs a session-mode connection (port 5432),
// not the transaction pooler (port 6543) which hangs on pg_catalog queries.
const databaseUrl = rawUrl.replace(':6543/', ':5432/');

export default defineConfig({
  out: './src/database/migrations',
  schema: './src/database/schema/*.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
    ssl: 'require',
  },
  strict: true,
  verbose: true,
});
