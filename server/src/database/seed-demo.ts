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

  /* ── 2. Professionals ── */
  console.log('👷 Seeding professionals…');

  // Fetch category IDs
  const cats = await sql<{ id: string; name: string }[]>`
    SELECT id, name FROM service_categories
  `;
  const catMap = Object.fromEntries(cats.map(c => [c.name, c.id]));

  const passwordHash = await bcrypt.hash('Partner@1234', 10);

  const professionals = [
    {
      email: 'rahul.cleaning@servenow.in',
      fullName: 'Rahul Sharma',
      title: 'Expert Home Cleaning Specialist',
      bio: '8+ years of experience in deep cleaning, sanitization, and home maintenance. Trusted by 500+ families.',
      category: 'Cleaning',
      basePrice: 599,
      priceUnit: '/visit',
      badge: 'Top Rated',
      rating: 4.8,
      reviewCount: 143,
      tags: ['deep clean', 'sanitization', 'move-in clean'],
      avatarUrl: 'https://i.pravatar.cc/150?img=11',
    },
    {
      email: 'priya.salon@servenow.in',
      fullName: 'Priya Mehta',
      title: 'Senior Beauty & Hair Stylist',
      bio: 'Certified stylist with expertise in hair coloring, keratin treatment, and bridal makeup. 6 years in the industry.',
      category: 'Salon',
      basePrice: 799,
      priceUnit: '/session',
      badge: 'Verified Pro',
      rating: 4.9,
      reviewCount: 211,
      tags: ['hair color', 'keratin', 'bridal', 'makeup'],
      avatarUrl: 'https://i.pravatar.cc/150?img=47',
    },
    {
      email: 'amit.plumber@servenow.in',
      fullName: 'Amit Verma',
      title: 'Licensed Plumbing Expert',
      bio: 'Specialized in pipe fitting, leak repair, bathroom installations, and emergency plumbing. 10+ years experience.',
      category: 'Plumbing',
      basePrice: 399,
      priceUnit: '/visit',
      badge: 'Top Rated',
      rating: 4.7,
      reviewCount: 98,
      tags: ['leak repair', 'pipe fitting', 'bathroom', 'emergency'],
      avatarUrl: 'https://i.pravatar.cc/150?img=12',
    },
    {
      email: 'suresh.electric@servenow.in',
      fullName: 'Suresh Nair',
      title: 'Certified Electrical Technician',
      bio: 'Licensed electrician for wiring, panel upgrades, fan/AC installation, and safety audits. ISI certified.',
      category: 'Electrical',
      basePrice: 349,
      priceUnit: '/visit',
      badge: null,
      rating: 4.6,
      reviewCount: 76,
      tags: ['wiring', 'fan install', 'AC install', 'safety audit'],
      avatarUrl: 'https://i.pravatar.cc/150?img=15',
    },
    {
      email: 'deepa.paint@servenow.in',
      fullName: 'Deepa Singh',
      title: 'Interior Painting Professional',
      bio: 'Expert in interior and exterior painting, texture finishes, and waterproofing. Premium quality at fair prices.',
      category: 'Painting',
      basePrice: 1299,
      priceUnit: '/day',
      badge: 'Popular',
      rating: 4.5,
      reviewCount: 54,
      tags: ['interior', 'exterior', 'texture', 'waterproofing'],
      avatarUrl: 'https://i.pravatar.cc/150?img=44',
    },
    {
      email: 'vijay.ac@servenow.in',
      fullName: 'Vijay Kumar',
      title: 'AC Installation & Repair Expert',
      bio: 'Specialist in AC installation, servicing, gas refilling, and PCB repair. All brands covered. 7+ years.',
      category: 'AC Repair',
      basePrice: 499,
      priceUnit: '/visit',
      badge: 'Verified Pro',
      rating: 4.7,
      reviewCount: 130,
      tags: ['AC service', 'installation', 'gas refill', 'PCB repair'],
      avatarUrl: 'https://i.pravatar.cc/150?img=13',
    },
  ];

  for (const pro of professionals) {
    const categoryId = catMap[pro.category];
    if (!categoryId) { console.log(`  ⚠ Category "${pro.category}" not found, skipping ${pro.fullName}`); continue; }

    // Check if user already exists
    const [existingUser] = await sql<{ id: string }[]>`
      SELECT id FROM users WHERE email = ${pro.email} LIMIT 1
    `;

    let userId: string;
    if (existingUser) {
      userId = existingUser.id;
    } else {
      const [newUser] = await sql<{ id: string }[]>`
        INSERT INTO users (full_name, email, password_hash, role, email_verified_at, is_active)
        VALUES (${pro.fullName}, ${pro.email}, ${passwordHash}, 'partner', NOW(), true)
        RETURNING id
      `;
      userId = newUser.id;
    }

    // Upsert professional record (match on user_id)
    const tagsJson = JSON.stringify(pro.tags);
    await sql`
      INSERT INTO professionals
        (user_id, name, title, bio, category_id, base_price, price_unit, badge, rating, review_count, tags, avatar_url, is_active)
      VALUES
        (${userId}, ${pro.fullName}, ${pro.title}, ${pro.bio}, ${categoryId},
         ${pro.basePrice}, ${pro.priceUnit}, ${pro.badge ?? null},
         ${pro.rating}, ${pro.reviewCount}, ${tagsJson}::jsonb,
         ${pro.avatarUrl}, true)
      ON CONFLICT (user_id) DO UPDATE SET
        name         = EXCLUDED.name,
        title        = EXCLUDED.title,
        bio          = EXCLUDED.bio,
        category_id  = EXCLUDED.category_id,
        base_price   = EXCLUDED.base_price,
        price_unit   = EXCLUDED.price_unit,
        badge        = EXCLUDED.badge,
        rating       = EXCLUDED.rating,
        review_count = EXCLUDED.review_count,
        tags         = EXCLUDED.tags,
        avatar_url   = EXCLUDED.avatar_url,
        updated_at   = NOW()
    `;
    console.log(`  ✓ ${pro.fullName} (${pro.category})`);
  }

  await sql.end();
  console.log('\n[seed] Done ✓');
}

main().catch((err) => {
  console.error('[seed] Failed:', err.message ?? err);
  process.exit(1);
});
