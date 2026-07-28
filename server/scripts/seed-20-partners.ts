/**
 * Seeds 20 partner accounts with professional profiles and bookings.
 * Run: pnpm --filter @servenow/server tsx src/database/seed-20-partners.ts
 */
import 'dotenv/config';
import postgres from 'postgres';
import bcrypt from 'bcryptjs';

const sql = postgres(process.env.SUPABASE_DATABASE_URL!, { ssl: 'require', max: 1 });

function daysFromNow(n: number, hour = 10): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(hour, 0, 0, 0);
  return d;
}

const PARTNERS = [
  {
    email: 'ravi.kumar@servenow.com',     name: 'Ravi Kumar',       password: 'Ravi@1234',
    category: 'Cleaning',  title: 'Home Cleaning Expert',
    bio: 'Certified cleaning specialist, 6+ yrs. Deep cleaning, eco-friendly products. 500+ happy customers.',
    rating: 4.8, reviews: 127, price: 599, badge: 'Top Rated',
    tags: ['Deep Cleaning', 'Sanitisation', 'Eco-Friendly', 'Kitchen', 'Bathroom'],
  },
  {
    email: 'amit.singh@servenow.com',     name: 'Amit Singh',       password: 'Amit@1234',
    category: 'Plumbing',  title: 'Senior Plumber',
    bio: 'Expert in pipe installation, leak repairs, and bathroom fittings. Available 24/7 for emergencies.',
    rating: 4.6, reviews: 89,  price: 799, badge: 'Expert',
    tags: ['Pipe Repair', 'Leak Fix', 'Bathroom Fitting', '24/7 Emergency'],
  },
  {
    email: 'priya.mehta@servenow.com',    name: 'Priya Mehta',      password: 'Priya@1234',
    category: 'Salon',     title: 'Beauty & Salon Expert',
    bio: 'Professional hair stylist and beauty consultant. Bridal packages, facials, and hair treatments.',
    rating: 4.9, reviews: 214, price: 899, badge: 'Top Rated',
    tags: ['Haircut', 'Facial', 'Bridal Makeup', 'Waxing', 'Manicure'],
  },
  {
    email: 'suresh.verma@servenow.com',   name: 'Suresh Verma',     password: 'Suresh@1234',
    category: 'Electrical', title: 'Electrical Engineer',
    bio: 'Licensed electrician with 10+ years. Wiring, panel upgrades, appliance installation, solar.',
    rating: 4.7, reviews: 156, price: 549, badge: 'Expert',
    tags: ['Wiring', 'Panel Upgrade', 'Solar', 'Appliance Install', 'Safety'],
  },
  {
    email: 'neha.gupta@servenow.com',     name: 'Neha Gupta',       password: 'Neha@1234',
    category: 'Painting',  title: 'Interior Painting Specialist',
    bio: 'Professional painter for homes and offices. Texture, stencil, and waterproofing expertise.',
    rating: 4.5, reviews: 73,  price: 1299, badge: null,
    tags: ['Interior Paint', 'Texture', 'Stencil', 'Waterproofing', 'Wall Art'],
  },
  {
    email: 'rahul.sharma@servenow.com',   name: 'Rahul Sharma',     password: 'Rahul@1234',
    category: 'AC Repair',  title: 'AC & HVAC Technician',
    bio: 'Certified AC technician. Servicing, gas refilling, installation for all brands.',
    rating: 4.8, reviews: 201, price: 499, badge: 'Top Rated',
    tags: ['AC Service', 'Gas Refill', 'Installation', 'All Brands', 'HVAC'],
  },
  {
    email: 'pooja.patel@servenow.com',    name: 'Pooja Patel',      password: 'Pooja@1234',
    category: 'Cleaning',  title: 'Deep Cleaning Specialist',
    bio: 'Specialised in move-in/move-out and post-renovation cleaning. Fully equipped with professional tools.',
    rating: 4.7, reviews: 98,  price: 699, badge: 'Expert',
    tags: ['Move-Out Clean', 'Post-Renovation', 'Office Clean', 'Carpet', 'Sofa'],
  },
  {
    email: 'vijay.nair@servenow.com',     name: 'Vijay Nair',       password: 'Vijay@1234',
    category: 'Plumbing',  title: 'Plumbing & Waterproofing Pro',
    bio: 'Waterproofing and plumbing expert. Terrace, bathroom, and basement waterproofing solutions.',
    rating: 4.4, reviews: 61,  price: 999, badge: null,
    tags: ['Waterproofing', 'Terrace', 'Basement', 'Plumbing', 'Drainage'],
  },
  {
    email: 'sunita.joshi@servenow.com',   name: 'Sunita Joshi',     password: 'Sunita@1234',
    category: 'Salon',     title: 'Hair & Skincare Consultant',
    bio: 'Specialised in keratin treatments, hair colour, and advanced skincare. Home visit available.',
    rating: 4.9, reviews: 183, price: 1199, badge: 'Top Rated',
    tags: ['Keratin', 'Hair Colour', 'Skincare', 'De-Tan', 'Anti-Aging'],
  },
  {
    email: 'manoj.kumar@servenow.com',    name: 'Manoj Kumar',      password: 'Manoj@1234',
    category: 'Electrical', title: 'Home Automation Specialist',
    bio: 'Smart home setup, CCTV installation, and inverter wiring. 8 years of experience.',
    rating: 4.6, reviews: 112, price: 749, badge: 'Expert',
    tags: ['Smart Home', 'CCTV', 'Inverter', 'Automation', 'WiFi Setup'],
  },
  {
    email: 'anita.reddy@servenow.com',    name: 'Anita Reddy',      password: 'Anita@1234',
    category: 'Cleaning',  title: 'Sanitisation & Hygiene Expert',
    bio: 'COVID-safe deep sanitisation services for homes, offices, and commercial spaces.',
    rating: 4.7, reviews: 67,  price: 799, badge: null,
    tags: ['Sanitisation', 'Disinfection', 'Office', 'Commercial', 'COVID-Safe'],
  },
  {
    email: 'deepak.mishra@servenow.com',  name: 'Deepak Mishra',    password: 'Deepak@1234',
    category: 'Painting',  title: 'Wall Art & Texture Designer',
    bio: '3D wall art, Venetian plaster, and customised murals. Transform your walls into masterpieces.',
    rating: 4.8, reviews: 44,  price: 1799, badge: 'Expert',
    tags: ['3D Art', 'Venetian Plaster', 'Murals', 'Texture', 'Custom Design'],
  },
  {
    email: 'kavita.iyer@servenow.com',    name: 'Kavita Iyer',      password: 'Kavita@1234',
    category: 'Salon',     title: 'Nail Art & Beauty Specialist',
    bio: 'Nail extensions, gel art, eyelash extensions, and threading. Hygiene-first approach.',
    rating: 4.9, reviews: 276, price: 699, badge: 'Top Rated',
    tags: ['Nail Art', 'Gel Extensions', 'Eyelashes', 'Threading', 'Waxing'],
  },
  {
    email: 'rakesh.pandey@servenow.com',  name: 'Rakesh Pandey',    password: 'Rakesh@1234',
    category: 'AC Repair',  title: 'Multi-Brand AC Specialist',
    bio: 'Expert in all AC brands — Samsung, LG, Daikin, Voltas. Preventive maintenance contracts available.',
    rating: 4.5, reviews: 133, price: 449, badge: null,
    tags: ['Samsung', 'LG', 'Daikin', 'Voltas', 'AMC'],
  },
  {
    email: 'meena.saxena@servenow.com',   name: 'Meena Saxena',     password: 'Meena@1234',
    category: 'Laundry',   title: 'Laundry & Dry Clean Expert',
    bio: 'Premium laundry and dry cleaning pick-up & delivery. Stain removal and fabric care specialist.',
    rating: 4.6, reviews: 88,  price: 399, badge: 'Expert',
    tags: ['Dry Clean', 'Stain Removal', 'Pickup & Delivery', 'Fabric Care', 'Ironing'],
  },
  {
    email: 'sanjay.tiwari@servenow.com',  name: 'Sanjay Tiwari',    password: 'Sanjay@1234',
    category: 'Plumbing',  title: 'Bathroom & Kitchen Renovation',
    bio: 'Complete bathroom and kitchen renovation. Tile laying, fitting, and plumbing combined service.',
    rating: 4.7, reviews: 55,  price: 2499, badge: 'Expert',
    tags: ['Renovation', 'Tile Laying', 'Kitchen Fitting', 'Bathroom', 'Plumbing'],
  },
  {
    email: 'lalita.chopra@servenow.com',  name: 'Lalita Chopra',    password: 'Lalita@1234',
    category: 'Cleaning',  title: 'Kitchen & Chimney Specialist',
    bio: 'Expert kitchen cleaning, chimney servicing, and appliance deep-clean. Sparkling results guaranteed.',
    rating: 4.8, reviews: 102, price: 649, badge: 'Top Rated',
    tags: ['Kitchen Clean', 'Chimney Service', 'Fridge Clean', 'Oven', 'Microwave'],
  },
  {
    email: 'arun.bhatt@servenow.com',     name: 'Arun Bhatt',       password: 'Arun@1234',
    category: 'Electrical', title: 'Solar & Energy Consultant',
    bio: 'Solar panel installation, energy audits, and inverter/battery setup. 12 years experience.',
    rating: 4.6, reviews: 39,  price: 899, badge: null,
    tags: ['Solar', 'Energy Audit', 'Inverter', 'Battery', 'Green Energy'],
  },
  {
    email: 'divya.nair@servenow.com',     name: 'Divya Nair',       password: 'Divya@1234',
    category: 'Salon',     title: 'Bridal Makeup Artist',
    bio: 'Luxury bridal packages, pre-bridal skincare, and party makeup. Pan-India service.',
    rating: 5.0, reviews: 312, price: 4999, badge: 'Top Rated',
    tags: ['Bridal Makeup', 'Pre-Bridal', 'Party Makeup', 'Airbrush', 'HD Makeup'],
  },
  {
    email: 'prakash.rao@servenow.com',    name: 'Prakash Rao',      password: 'Prakash@1234',
    category: 'AC Repair',  title: 'Refrigeration & AC Expert',
    bio: 'Refrigerator and AC repair specialist. Compressor replacement, gas top-up, and PCB repair.',
    rating: 4.7, reviews: 167, price: 599, badge: 'Expert',
    tags: ['Refrigerator', 'Compressor', 'Gas Top-Up', 'PCB Repair', 'Cooling'],
  },
];

const JOB_TEMPLATES = [
  { serviceName: 'Deep Home Cleaning',       status: 'upcoming',     price: 1199, daysOffset: 2,  notes: '3 BHK apartment. Focus on kitchen and bathrooms.' },
  { serviceName: 'Kitchen Deep Clean',       status: 'upcoming',     price: 799,  daysOffset: 4,  notes: 'Chimney, stove top, and cabinet interiors.' },
  { serviceName: 'Full Home Cleaning',       status: 'completed',    price: 1199, daysOffset: -1, notes: '2 BHK standard cleaning. Great results.' },
  { serviceName: 'Pipe Leak Repair',         status: 'completed',    price: 599,  daysOffset: -2, notes: 'Fixed 2 pipe leaks under kitchen sink.' },
  { serviceName: 'AC Service & Gas Refill',  status: 'completed',    price: 699,  daysOffset: -3, notes: 'Full service + gas top-up for 1.5 ton AC.' },
  { serviceName: 'Bathroom Fitting',         status: 'completed',    price: 999,  daysOffset: -5, notes: 'New shower set and geyser installed.' },
  { serviceName: 'Electrical Inspection',    status: 'completed',    price: 499,  daysOffset: -7, notes: 'Annual safety inspection. All clear.' },
  { serviceName: 'Sofa & Carpet Cleaning',   status: 'completed',    price: 1499, daysOffset: -9, notes: '3-seater sofa + 2 carpets shampooed.' },
  { serviceName: 'Interior Painting',        status: 'pending',      price: 2999, daysOffset: 8,  notes: '2 BHK interior — 3 coats including primer.' },
  { serviceName: 'Emergency Plumbing',       status: 'in_progress',  price: 849,  daysOffset: 0,  notes: 'Burst pipe in bathroom. Urgent fix.' },
  { serviceName: 'Move-In Cleaning',         status: 'completed',    price: 1799, daysOffset: -11, notes: 'Complete sanitisation before moving in. 4 BHK.' },
  { serviceName: 'Hair Colour & Cut',        status: 'upcoming',     price: 1099, daysOffset: 3,  notes: 'Global colour + haircut + conditioning.' },
  { serviceName: 'Bridal Package',           status: 'cancelled',    price: 4999, daysOffset: -4, notes: 'Customer postponed event.' },
];

async function main() {
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  ServeNow — 20 Partner Accounts Seeder');
  console.log('══════════════════════════════════════════════════════\n');

  /* ── Fetch categories ── */
  const categories = await sql`SELECT id, name FROM service_categories`;
  if (categories.length === 0) throw new Error('No categories — run seed-demo.ts first');
  const catMap: Record<string, string> = {};
  for (const c of categories) catMap[c.name] = c.id;
  console.log(`📂 Found ${categories.length} categories\n`);

  /* ── Ensure demo customer ── */
  const custHash = await bcrypt.hash('Customer@123', 10);
  const [custUser] = await sql`
    INSERT INTO users (email, full_name, phone, password_hash, role, email_verified_at, is_active)
    VALUES ('customer@servenow.com', 'Priya Sharma', '+91 98765 43210', ${custHash}, 'customer', NOW(), true)
    ON CONFLICT (email) DO UPDATE SET
      full_name = 'Priya Sharma', phone = '+91 98765 43210',
      role = 'customer', email_verified_at = NOW(), is_active = true
    RETURNING id
  `;

  /* ── Ensure demo customer address ── */
  const [existAddr] = await sql`
    SELECT id FROM addresses WHERE user_id = ${custUser.id} AND deleted_at IS NULL LIMIT 1
  `;
  let addrId: string;
  if (existAddr) {
    addrId = existAddr.id;
  } else {
    const [addr] = await sql`
      INSERT INTO addresses (user_id, label, line1, line2, city, state, postal_code, country, is_default)
      VALUES (${custUser.id}, 'Home', 'Flat 4B, Lotus Apartments, Andheri West',
              'Near DN Nagar Metro Station', 'Mumbai', 'Maharashtra', '400053', 'India', true)
      RETURNING id
    `;
    addrId = addr.id;
  }
  console.log(`👤 Customer: Priya Sharma (customer@servenow.com)\n`);

  const credentials: Array<{ n: number; name: string; email: string; password: string; role: string; jobs: number; earnings: number }> = [];

  for (let i = 0; i < PARTNERS.length; i++) {
    const p = PARTNERS[i];
    const num = String(i + 1).padStart(2, '0');

    /* ── Create/update user ── */
    const hash = await bcrypt.hash(p.password, 10);
    const [user] = await sql`
      INSERT INTO users (email, full_name, password_hash, role, email_verified_at, is_active)
      VALUES (${p.email}, ${p.name}, ${hash}, 'partner', NOW(), true)
      ON CONFLICT (email) DO UPDATE SET
        full_name = ${p.name}, password_hash = ${hash},
        role = 'partner', email_verified_at = NOW(), is_active = true
      RETURNING id, full_name
    `;

    /* ── Category ── */
    const categoryId = catMap[p.category] ?? Object.values(catMap)[0];

    /* ── Create/update professional ── */
    const [existPro] = await sql`
      SELECT id FROM professionals WHERE user_id = ${user.id} AND deleted_at IS NULL LIMIT 1
    `;
    let proId: string;
    if (existPro) {
      await sql`
        UPDATE professionals SET
          category_id = ${categoryId}, name = ${p.name}, title = ${p.title},
          bio = ${p.bio}, rating = ${p.rating}, review_count = ${p.reviews},
          base_price = ${p.price}, price_unit = '/visit',
          badge = ${p.badge ?? null},
          tags = ${JSON.stringify(p.tags)}, is_active = true, updated_at = NOW()
        WHERE id = ${existPro.id}
      `;
      proId = existPro.id;
    } else {
      const [newPro] = await sql`
        INSERT INTO professionals
          (user_id, category_id, name, title, bio, rating, review_count,
           base_price, price_unit, badge, tags, is_active)
        VALUES (
          ${user.id}, ${categoryId}, ${p.name}, ${p.title}, ${p.bio},
          ${p.rating}, ${p.reviews}, ${p.price}, '/visit',
          ${p.badge ?? null}, ${JSON.stringify(p.tags)}, true
        )
        RETURNING id
      `;
      proId = newPro.id;
    }

    /* ── Clear old demo bookings ── */
    await sql`
      DELETE FROM bookings
      WHERE professional_id = ${proId} AND customer_id = ${custUser.id}
    `;

    /* ── Insert bookings from template (rotate through templates) ── */
    let earnings = 0;
    let jobCount = 0;
    const numJobs = 5 + (i % 5);
    for (let j = 0; j < numJobs; j++) {
      const tmpl = JOB_TEMPLATES[j % JOB_TEMPLATES.length];
      const scheduledAt = daysFromNow(tmpl.daysOffset + (j * 0), 9 + (j % 4));
      await sql`
        INSERT INTO bookings
          (customer_id, professional_id, category_id, address_id,
           service_name, pro_name, scheduled_at, status, notes, price)
        VALUES (
          ${custUser.id}, ${proId}, ${categoryId}, ${addrId},
          ${tmpl.serviceName}, ${p.name},
          ${scheduledAt.toISOString()}, ${tmpl.status},
          ${tmpl.notes}, ${tmpl.price}
        )
      `;
      if (tmpl.status === 'completed') earnings += tmpl.price;
      jobCount++;
    }

    credentials.push({ n: i + 1, name: p.name, email: p.email, password: p.password, role: 'partner', jobs: jobCount, earnings });
    console.log(`  ${num}. ✓ ${p.name.padEnd(18)} | ${p.category.padEnd(11)} | ${jobCount} jobs | ₹${earnings} earned | ${p.email}`);
  }

  /* ── Print credential table ── */
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  PARTNER LOGIN CREDENTIALS');
  console.log('══════════════════════════════════════════════════════');
  console.log(`${'#'.padEnd(4)} ${'Name'.padEnd(20)} ${'Email'.padEnd(32)} ${'Password'.padEnd(14)} ${'Jobs'.padEnd(5)} Earnings`);
  console.log('─'.repeat(90));
  for (const c of credentials) {
    console.log(
      `${String(c.n).padEnd(4)} ${c.name.padEnd(20)} ${c.email.padEnd(32)} ${c.password.padEnd(14)} ${String(c.jobs).padEnd(5)} ₹${c.earnings}`
    );
  }

  console.log('\n📌 Customer Login (use in customer app to see the bookings):');
  console.log('   Email:    customer@servenow.com');
  console.log('   Password: Customer@123');

  await sql.end();
  console.log('\n[seed-20-partners] Done ✓\n');
}

main().catch(err => {
  console.error('[seed-20-partners] Failed:', err.message ?? err);
  process.exit(1);
});
