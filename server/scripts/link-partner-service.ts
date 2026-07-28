/**
 * One-time script: link the test partner to AC Service + Pipe Leak Repair
 * Run: pnpm --filter @servenow/server exec tsx src/database/link-partner-service.ts
 */
import 'dotenv/config';
import { db } from '../src/config/database.js';
import { partnerServices } from '../src/database/schema/index.js';
import { eq } from 'drizzle-orm';

async function main() {
  const PARTNER_ID = '86858cf6-4a2e-409c-88de-8344237d1a6a';
  const SERVICES = [
    { id: 'fdf8fbbd-235d-418f-8887-84bdc08099f6', name: 'AC Service' },
    { id: 'd4f9cf64-aa06-4536-b38b-00baac1f4882', name: 'Pipe Leak Repair' },
  ];

  const existing = await db.select().from(partnerServices).where(eq(partnerServices.partnerId, PARTNER_ID));
  console.log('Existing links:', existing.map(r => r.serviceId));

  for (const svc of SERVICES) {
    if (!existing.find(r => r.serviceId === svc.id)) {
      await db.insert(partnerServices).values({ partnerId: PARTNER_ID, serviceId: svc.id }).onConflictDoNothing();
      console.log('✓ Linked:', svc.name, svc.id);
    } else {
      console.log('– Already linked:', svc.name);
    }
  }
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
