import { db } from '../config/database.js';
import { sql } from 'drizzle-orm';

const PARTNER_ID = '86858cf6-4a2e-409c-88de-8344237d1a6a';
const SERVICES = [
  'fdf8fbbd-235d-418f-8887-84bdc08099f6', // AC Service
  'ca82fb93-f14a-43b9-ab96-05f606a21c49', // Bathroom Cleaning
  'e10fa002-4e79-4767-865a-c40f98f78221', // Classic Facial
  '7b03ea5e-0ddf-4efc-b8b0-6c5e81510c02', // Curtain Cleaning
  '4a8029f9-450c-4f87-9591-ecb3b20d0d21', // Dry Cleaning
];

for (const serviceId of SERVICES) {
  await db.execute(
    sql`INSERT INTO partner_services (partner_id, service_id, created_at)
        VALUES (${PARTNER_ID}, ${serviceId}, NOW())
        ON CONFLICT DO NOTHING`
  );
  console.log('✅ Linked service:', serviceId);
}
console.log('Done — partner services seeded');
process.exit(0);
