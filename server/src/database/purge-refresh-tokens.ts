import postgres from 'postgres';

const url = process.env.SUPABASE_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) { console.error('No DB URL'); process.exit(1); }

const sql = postgres(url, {
  ssl: { rejectUnauthorized: false },
  max: 1,
  connect_timeout: 30,
});

const [{ cnt }] = await sql`SELECT COUNT(*)::int AS cnt FROM refresh_tokens`;
console.log('Stale tokens before:', cnt);
await sql`DELETE FROM refresh_tokens`;
const [{ cnt: after }] = await sql`SELECT COUNT(*)::int AS cnt FROM refresh_tokens`;
console.log('Tokens after purge:', after);
await sql.end();
process.exit(0);
