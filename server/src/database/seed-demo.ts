/**
 * Seeds persistent demo data across all tables.
 * Run: pnpm --filter @servenow/server tsx src/database/seed-demo.ts
 */
import 'dotenv/config';
import postgres from 'postgres';
import bcrypt from 'bcryptjs';

const sql = postgres(process.env.SUPABASE_DATABASE_URL!, { ssl: 'require', max: 1 });

async function main() {
  console.log('\n══════════════════════════════════════════');
  console.log('  ServeNow — Demo Data Seeder');
  console.log('══════════════════════════════════════════\n');

  /* ── 1. Categories ── */
  console.log('📂 Seeding service_categories…');
  await sql`
    INSERT INTO service_categories (name, icon_name, color, icon_color, service_count, sort_order)
    VALUES
      ('Cleaning',   'Sparkles',   '#EDE9FD', '#5B3EF5', 120, 1),
      ('Plumbing',   'Wrench',     '#FEF3C7', '#D97706', 85,  2),
      ('Electrical', 'Zap',        '#DCFCE7', '#16A34A', 94,  3),
      ('Salon',      'Scissors',   '#FCE7F3', '#DB2777', 200, 4),
      ('Painting',   'Paintbrush', '#DBEAFE', '#2563EB', 62,  5),
      ('AC Repair',  'Wind',       '#FFF7ED', '#EA580C', 78,  6),
      ('Laundry',    'Droplets',   '#F0FDF4', '#15803D', 55,  7),
      ('More',       'Grid',       '#F3F4F6', '#6B7280', 500, 8)
    ON CONFLICT (name) DO UPDATE SET updated_at = NOW()
  `;
  console.log('  ✓ categories done');

  await sql.end();
  console.log('\n[seed] Done ✓');
}

main().catch((err) => {
  console.error('[seed] Failed:', err.message ?? err);
  process.exit(1);
});
