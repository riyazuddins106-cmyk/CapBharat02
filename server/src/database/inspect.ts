import 'dotenv/config';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require', max: 1 });

async function main() {
  const tables = await sql<{ table_name: string; column_name: string; udt_name: string }[]>`
    SELECT table_name, column_name, udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `;
  const grouped: Record<string, string[]> = {};
  for (const r of tables) {
    (grouped[r.table_name] ||= []).push(`${r.column_name}:${r.udt_name}`);
  }
  for (const [t, cols] of Object.entries(grouped)) {
    console.log(`${t} -> ${cols.join(', ')}`);
  }
  await sql.end();
}

main().catch((e) => { console.error(e.message); process.exit(1); });
