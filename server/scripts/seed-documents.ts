/**
 * Seed dummy partner documents for testing the Document Verification UI.
 * Run: cd server && pnpm exec tsx src/database/seed-documents.ts
 */
import postgres from 'postgres';

const url = process.env.SUPABASE_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL not set');

const sql = postgres(url, { ssl: 'require' });

async function run(label: string, query: string) {
  try {
    await sql.unsafe(query);
    console.log(`  ✓ ${label}`);
  } catch (e: any) {
    if (e.code === '23505') { console.log(`  – ${label} (already exists / skipped)`); }
    else { console.error(`  ✗ ${label}:`, e.message); }
  }
}

async function seed() {
  console.log('\n══════════════════════════════════════');
  console.log('  ServeNow — Document Seeder');
  console.log('══════════════════════════════════════\n');

  // ── 1. Get admin user id (for reviewer)
  const adminRows = await sql`SELECT id FROM users WHERE role = 'admin' LIMIT 1`;
  const adminId = adminRows[0]?.id;
  if (!adminId) { console.error('No admin user found. Run seed-test-accounts.ts first.'); process.exit(1); }
  console.log('Admin ID:', adminId);

  // ── 2. Get all existing professionals
  const pros = await sql`
    SELECT p.id AS pro_id, u.full_name AS name, u.email
    FROM professionals p
    JOIN users u ON u.id = p.user_id
    ORDER BY p.created_at ASC
    LIMIT 10
  `;
  console.log(`Found ${pros.length} partners\n`);

  if (pros.length === 0) {
    console.log('No partners found. Creating a test partner user first...\n');

    // Create test partner users
    const partnerData = [
      { email: 'ravi.kumar@example.com',   name: 'Ravi Kumar',   phone: '+91 98765 11001' },
      { email: 'priya.sharma@example.com', name: 'Priya Sharma', phone: '+91 98765 11002' },
      { email: 'arjun.verma@example.com',  name: 'Arjun Verma',  phone: '+91 98765 11003' },
    ];

    // Get a valid category
    const cats = await sql`SELECT id FROM service_categories WHERE is_active = true LIMIT 1`;
    const catId = cats[0]?.id;
    if (!catId) { console.error('No categories found.'); process.exit(1); }

    for (const p of partnerData) {
      await run(`user: ${p.name}`, `
        INSERT INTO users (email, phone, full_name, password_hash, role, email_verified)
        VALUES ('${p.email}', '${p.phone}', '${p.name}',
                '$2b$10$rOzJqK8mX1nVpLqY2sT0CeGsF5mN3wP8dQ6vA7bH4kJ1lM9cR2iU6',
                'partner', true)
        ON CONFLICT (email) DO NOTHING
      `);
      await run(`professional: ${p.name}`, `
        INSERT INTO professionals (user_id, category_id, name, title, availability_status)
        SELECT u.id, '${catId}', '${p.name}', 'Service Professional', 'available'
        FROM users u WHERE u.email = '${p.email}'
        ON CONFLICT DO NOTHING
      `);
    }

    // Re-fetch
    const newPros = await sql`
      SELECT p.id AS pro_id, u.full_name AS name, u.email
      FROM professionals p JOIN users u ON u.id = p.user_id
      ORDER BY p.created_at ASC LIMIT 10
    `;
    pros.push(...newPros);
  }

  // ── 3. Get document types
  const types = await sql`SELECT type_key FROM document_type_configs WHERE is_active = true ORDER BY sort_order`;
  const typeKeys = types.map((t: any) => t.type_key);
  console.log('Document types:', typeKeys.join(', '), '\n');

  // Sample public image URLs for dummy documents
  const sampleImages = [
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png',
    'https://www.w3.org/WAI/WCAG21/Techniques/pdf/img/table-word.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Camponotus_flavomarginatus_ant.jpg/400px-Camponotus_flavomarginatus_ant.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Bikesg.jpg/320px-Bikesg.jpg',
  ];

  // ── 4. Seed documents for each partner with varied statuses
  const statuses: Array<{ status: string; reason: string | null; reviewedBy: string | null }> = [
    { status: 'approved',           reason: null,                                          reviewedBy: adminId },
    { status: 'pending',            reason: null,                                          reviewedBy: null    },
    { status: 'rejected',           reason: 'Document image is blurry and unreadable.',    reviewedBy: adminId },
    { status: 'under_review',       reason: null,                                          reviewedBy: null    },
    { status: 're_upload_required', reason: 'Please upload a clearer, unedited copy.',     reviewedBy: adminId },
    { status: 'expired',            reason: 'Document expiry date has passed.',             reviewedBy: adminId },
  ];

  let docCount = 0;
  for (let pi = 0; pi < pros.length; pi++) {
    const pro = pros[pi];
    console.log(`\n  Partner: ${pro.name} (${pro.email})`);

    // Give each partner 3-5 documents with different statuses
    const docsForPartner = typeKeys.slice(0, Math.min(4 + pi, typeKeys.length));
    for (let di = 0; di < docsForPartner.length; di++) {
      const docType = docsForPartner[di];
      const st = statuses[(pi * 3 + di) % statuses.length];
      const imgUrl = sampleImages[di % sampleImages.length];
      const reviewedAt = st.reviewedBy ? `NOW() - interval '${di + 1} days'` : 'NULL';
      const reviewedBy = st.reviewedBy ? `'${st.reviewedBy}'` : 'NULL';
      const reason = st.reason ? `'${st.reason.replace(/'/g, "''")}'` : 'NULL';

      await run(`doc: ${pro.name} / ${docType}`, `
        INSERT INTO partner_documents
          (professional_id, document_type, document_url, file_name, status, rejection_reason,
           reviewed_by, version, uploaded_at, reviewed_at)
        VALUES (
          '${pro.pro_id}', '${docType}', '${imgUrl}', '${docType}_v1.jpg',
          '${st.status}', ${reason}, ${reviewedBy}, 1,
          NOW() - interval '${di + 2} days', ${reviewedAt}
        )
        ON CONFLICT (professional_id, document_type) DO UPDATE SET
          status = EXCLUDED.status,
          rejection_reason = EXCLUDED.rejection_reason,
          reviewed_by = EXCLUDED.reviewed_by,
          reviewed_at = EXCLUDED.reviewed_at,
          document_url = EXCLUDED.document_url
      `);
      docCount++;
    }

    // Add some history entries for the first document type
    if (docsForPartner.length > 0) {
      const docType = docsForPartner[0];
      await run(`history: ${pro.name} / ${docType} v1`, `
        INSERT INTO partner_document_history
          (professional_id, document_type, document_url, file_name, status, rejection_reason,
           version, uploaded_at, reviewed_at, archived_at)
        VALUES (
          '${pro.pro_id}', '${docType}',
          '${sampleImages[1]}', '${docType}_old.jpg',
          'rejected', 'First submission was unclear.',
          1, NOW() - interval '10 days', NOW() - interval '8 days', NOW() - interval '7 days'
        )
      `);
    }
  }

  console.log(`\n══════════════════════════════════════`);
  console.log(`  Seeded ${docCount} documents across ${pros.length} partners`);
  console.log(`══════════════════════════════════════\n`);
  console.log('  ✅ Admin Panel → Document Verification: http://localhost:5001/admin-panel/');
  console.log('  Login: admin@servenow.in / Admin@1234\n');

  await sql.end();
}

seed().catch(e => { console.error(e); process.exit(1); });
