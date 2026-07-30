import { db } from '../config/database.js';
import { sql } from 'drizzle-orm';

async function main() {
  const unwrap = (r: any): any[] => {
    if (Array.isArray(r)) return r;
    if (r?.rows && Array.isArray(r.rows)) return r.rows;
    return [];
  };

  console.log('=== Recent bookings ===');
  const bk = await db.execute(sql`
    SELECT id, status, dispatch_status, professional_id, service_name, created_at
    FROM bookings ORDER BY created_at DESC LIMIT 5
  `);
  for (const b of unwrap(bk)) console.log(JSON.stringify(b));

  console.log('\n=== Partners ===');
  const partners = await db.execute(sql`
    SELECT p.id, u.full_name, p.availability_status, p.is_active
    FROM professionals p JOIN users u ON u.id = p.user_id
  `);
  for (const p of unwrap(partners)) console.log(JSON.stringify(p));

  console.log('\n=== Doc configs ===');
  const docs = await db.execute(sql`
    SELECT type_key, is_mandatory, is_active FROM document_type_configs ORDER BY sort_order
  `);
  for (const d of unwrap(docs)) console.log(JSON.stringify(d));

  console.log('\n=== Services with category name ===');
  const svcs = await db.execute(sql`
    SELECT s.id, s.name, s.is_active, s.category_id FROM services s ORDER BY s.name LIMIT 30
  `);
  for (const s of unwrap(svcs)) console.log(JSON.stringify(s));

  console.log('\n=== Partner skills ===');
  const skills = await db.execute(sql`
    SELECT ps.partner_id, u.full_name, s.name as service, s.id as service_id
    FROM partner_services ps
    JOIN services s ON s.id = ps.service_id
    JOIN professionals p ON p.id = ps.partner_id
    JOIN users u ON u.id = p.user_id
    LIMIT 20
  `);
  for (const s of unwrap(skills)) console.log(JSON.stringify(s));

  console.log('\n=== Recent dispatch requests ===');
  const reqs = await db.execute(sql`
    SELECT bpr.booking_id, bpr.partner_id, bpr.status, u.full_name
    FROM booking_partner_requests bpr
    JOIN professionals p ON p.id = bpr.partner_id
    JOIN users u ON u.id = p.user_id
    ORDER BY bpr.sent_at DESC LIMIT 10
  `);
  for (const r of unwrap(reqs)) console.log(JSON.stringify(r));

  process.exit(0);
}
main().catch(e => { console.error(e.message); process.exit(1); });
