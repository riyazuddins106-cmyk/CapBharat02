/**
 * Full dummy-data seed — sub-categories + professionals for all 8 categories.
 * Run:  cd server && npx tsx src/database/seed-full-dummy.ts
 */
import 'dotenv/config';
import postgres from 'postgres';

const url = process.env.SUPABASE_DATABASE_URL;
if (!url) throw new Error('SUPABASE_DATABASE_URL not set');
const sql = postgres(url, { ssl: 'require', max: 1 });

/* ─── existing category IDs (fetched from DB at runtime) ─── */
type Cat  = { id: string; name: string };
type Sub  = { id: string; name: string; category_id: string };

async function main() {
  /* 1. Load categories */
  const cats: Cat[] = await sql`SELECT id, name FROM service_categories ORDER BY sort_order`;
  const catMap = Object.fromEntries(cats.map((c) => [c.name, c.id]));
  console.log('Categories found:', cats.map((c) => c.name).join(', '));

  /* 2. Sub-category definitions */
  const subDefs: { category: string; name: string; description: string; sortOrder: number }[] = [
    // Cleaning
    { category: 'Cleaning', name: 'Home Deep Clean',       description: 'Full home sanitisation and deep clean',              sortOrder: 1 },
    { category: 'Cleaning', name: 'Bathroom Cleaning',     description: 'Tiles, fixtures, and toilet sanitisation',           sortOrder: 2 },
    { category: 'Cleaning', name: 'Kitchen Deep Clean',    description: 'Stove, chimney, sink, and cabinet cleaning',         sortOrder: 3 },
    { category: 'Cleaning', name: 'Sofa & Carpet Clean',   description: 'Upholstery and carpet steam cleaning',               sortOrder: 4 },
    { category: 'Cleaning', name: 'Move-in / Move-out',    description: 'Handover-ready cleaning for vacant properties',      sortOrder: 5 },
    { category: 'Cleaning', name: 'Office Cleaning',       description: 'Commercial space cleaning and sanitisation',         sortOrder: 6 },
    // Plumbing
    { category: 'Plumbing', name: 'Pipe Leak & Repair',    description: 'Fix water leaks, burst pipes, and joints',           sortOrder: 1 },
    { category: 'Plumbing', name: 'Tap & Faucet',          description: 'Tap installation, washer, and mixer repair',         sortOrder: 2 },
    { category: 'Plumbing', name: 'Toilet Repair',         description: 'Flush, seat, and cistern repair or replacement',     sortOrder: 3 },
    { category: 'Plumbing', name: 'Water Heater / Geyser', description: 'Geyser installation, servicing, and repair',        sortOrder: 4 },
    { category: 'Plumbing', name: 'Drainage & Blockage',   description: 'Blocked drains, sewer lines, and de-clogging',      sortOrder: 5 },
    { category: 'Plumbing', name: 'Pipe Installation',     description: 'New plumbing lines and pipe laying',                 sortOrder: 6 },
    // Electrical
    { category: 'Electrical', name: 'Wiring & Rewiring',   description: 'New wiring, short-circuit fixes, and re-routing',   sortOrder: 1 },
    { category: 'Electrical', name: 'Fan & Light Fitting', description: 'Ceiling fan, LED, chandelier installation',         sortOrder: 2 },
    { category: 'Electrical', name: 'Switchboard Repair',  description: 'Socket, switch, and plug replacement',              sortOrder: 3 },
    { category: 'Electrical', name: 'MCB & Fuse Box',      description: 'Panel upgrade, MCB replacement, earthing',          sortOrder: 4 },
    { category: 'Electrical', name: 'CCTV Installation',   description: 'Camera setup, DVR, and network cabling',            sortOrder: 5 },
    { category: 'Electrical', name: 'Inverter & Battery',  description: 'UPS, inverter, and battery installation/service',   sortOrder: 6 },
    // Salon
    { category: 'Salon', name: 'Haircut & Styling',        description: 'Men and women haircut, blow-dry, and styling',      sortOrder: 1 },
    { category: 'Salon', name: 'Facial & Skincare',        description: 'Clean-up, gold facial, and anti-ageing treatments', sortOrder: 2 },
    { category: 'Salon', name: 'Bridal Makeup',            description: 'Bridal, pre-bridal, and party makeup packages',     sortOrder: 3 },
    { category: 'Salon', name: 'Nail Art & Manicure',      description: 'Manicure, pedicure, gel nails, and nail art',       sortOrder: 4 },
    { category: 'Salon', name: 'Waxing & Threading',       description: 'Full body wax, threading, and hair removal',        sortOrder: 5 },
    { category: 'Salon', name: 'Hair Spa & Colour',        description: 'Keratin, hair spa, highlights, and colouring',      sortOrder: 6 },
    // Painting
    { category: 'Painting', name: 'Interior Painting',     description: 'Wall painting with premium emulsion and finish',    sortOrder: 1 },
    { category: 'Painting', name: 'Exterior Painting',     description: 'Weather-resistant exterior wall painting',          sortOrder: 2 },
    { category: 'Painting', name: 'Texture & Design',      description: 'Designer wall textures and 3D effects',             sortOrder: 3 },
    { category: 'Painting', name: 'Wall Putty & Primer',   description: 'Surface preparation, putty, and primer application',sortOrder: 4 },
    { category: 'Painting', name: 'Wood Polishing',        description: 'Door, window, and furniture wood polish',           sortOrder: 5 },
    { category: 'Painting', name: 'Waterproofing',         description: 'Terrace, bathroom, and basement waterproofing',     sortOrder: 6 },
    // AC Repair
    { category: 'AC Repair', name: 'AC Service & Cleaning',description: 'Filter clean, coil wash, and general servicing',   sortOrder: 1 },
    { category: 'AC Repair', name: 'AC Gas Refill',         description: 'Refrigerant top-up and gas leak detection',        sortOrder: 2 },
    { category: 'AC Repair', name: 'AC Installation',       description: 'New split and window AC installation',             sortOrder: 3 },
    { category: 'AC Repair', name: 'AC Repair',             description: 'Compressor, PCB, and thermostat repair',           sortOrder: 4 },
    { category: 'AC Repair', name: 'Refrigerator Repair',   description: 'Cooling issues, gas, and compressor service',      sortOrder: 5 },
    { category: 'AC Repair', name: 'Washing Machine Repair',description: 'Front-load and top-load washer repair',            sortOrder: 6 },
    // Laundry
    { category: 'Laundry', name: 'Wash & Fold',             description: 'Machine wash and neatly folded delivery',          sortOrder: 1 },
    { category: 'Laundry', name: 'Dry Cleaning',            description: 'Suits, sarees, and delicate fabric dry cleaning',  sortOrder: 2 },
    { category: 'Laundry', name: 'Ironing Only',            description: 'Steam iron for clothes, shirts, and trousers',     sortOrder: 3 },
    { category: 'Laundry', name: 'Stain Removal',           description: 'Tough stain treatment and spot cleaning',          sortOrder: 4 },
    { category: 'Laundry', name: 'Curtain Cleaning',        description: 'On-site or pick-up curtain washing',               sortOrder: 5 },
    { category: 'Laundry', name: 'Shoe Cleaning',           description: 'Sneaker and leather shoe deep clean',              sortOrder: 6 },
    // More
    { category: 'More', name: 'Carpentry',                  description: 'Furniture assembly, repair, and custom woodwork',  sortOrder: 1 },
    { category: 'More', name: 'Pest Control',               description: 'Cockroach, termite, rodent, and bed-bug treatment',sortOrder: 2 },
    { category: 'More', name: 'Water Purifier Service',     description: 'RO installation, filter change, and repair',       sortOrder: 3 },
    { category: 'More', name: 'CCTV & Security',            description: 'Camera, alarm, and access-control installation',   sortOrder: 4 },
    { category: 'More', name: 'Appliance Repair',           description: 'TV, microwave, mixer, and small appliance repair', sortOrder: 5 },
    { category: 'More', name: 'Packers & Movers',           description: 'Home shifting, packing, and loading service',      sortOrder: 6 },
  ];

  /* 3. Upsert sub-categories */
  let subInserted = 0;
  const subMap: Record<string, string> = {}; // "Category|SubName" → id

  for (const def of subDefs) {
    const catId = catMap[def.category];
    if (!catId) { console.warn('Category not found:', def.category); continue; }

    const [existing] = await sql<Sub[]>`
      SELECT id, name, category_id FROM sub_service_categories
      WHERE category_id = ${catId} AND name = ${def.name}
    `;
    if (existing) {
      subMap[`${def.category}|${def.name}`] = existing.id;
    } else {
      const [ins] = await sql<Sub[]>`
        INSERT INTO sub_service_categories (category_id, name, description, sort_order, is_active)
        VALUES (${catId}, ${def.name}, ${def.description}, ${def.sortOrder}, true)
        RETURNING id, name, category_id
      `;
      subMap[`${def.category}|${def.name}`] = ins.id;
      subInserted++;
    }
  }
  console.log(`Sub-categories: ${subInserted} new inserted (${subDefs.length} total defined)`);

  /* 4. Professional definitions */
  type ProDef = {
    category: string; subCategory?: string;
    name: string; title: string; bio: string;
    rating: number; reviewCount: number; basePrice: number; priceUnit: string;
    badge: string | null; avatarUrl: string; tags: string[];
  };

  const proDefs: ProDef[] = [
    // ── CLEANING ──────────────────────────────────────────
    {
      category: 'Cleaning', subCategory: 'Home Deep Clean',
      name: 'Kavita Reddy', title: 'Home Deep Cleaning Expert',
      bio: '8 years experience in full-home sanitisation. Uses eco-friendly products. 400+ happy homes served.',
      rating: 4.9, reviewCount: 421, basePrice: 599, priceUnit: '/visit',
      badge: 'Top Rated',
      avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&auto=format',
      tags: ['Deep Clean', 'Eco Products', 'Sanitise', 'Full Home'],
    },
    {
      category: 'Cleaning', subCategory: 'Home Deep Clean',
      name: 'Sunita Bai', title: 'Certified Home Cleaning Pro',
      bio: 'Specialises in 3BHK and 4BHK deep cleaning. Always on time, thorough, and trustworthy.',
      rating: 4.7, reviewCount: 198, basePrice: 499, priceUnit: '/visit',
      badge: 'Verified',
      avatarUrl: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=400&h=400&fit=crop&auto=format',
      tags: ['Home Clean', '3BHK', '4BHK', 'Reliable'],
    },
    {
      category: 'Cleaning', subCategory: 'Bathroom Cleaning',
      name: 'Laxmi Devi', title: 'Bathroom & Toilet Cleaning Specialist',
      bio: 'Professional bathroom sanitiser. Removes hard water stains, mould, and soap scum effectively.',
      rating: 4.8, reviewCount: 267, basePrice: 299, priceUnit: '/bathroom',
      badge: 'Top Rated',
      avatarUrl: 'https://images.unsplash.com/photo-1614283233556-f35b0c801ef1?w=400&h=400&fit=crop&auto=format',
      tags: ['Bathroom', 'Hard Water Stains', 'Sanitise', 'Tiles'],
    },
    {
      category: 'Cleaning', subCategory: 'Kitchen Deep Clean',
      name: 'Rekha Menon', title: 'Kitchen Deep Clean Expert',
      bio: 'Chimney de-greasing, burner scrubbing, and full kitchen sanitisation. Available weekends.',
      rating: 4.8, reviewCount: 315, basePrice: 449, priceUnit: '/visit',
      badge: 'Verified',
      avatarUrl: 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=400&h=400&fit=crop&auto=format',
      tags: ['Kitchen', 'Chimney', 'Grease', 'Sanitise'],
    },
    {
      category: 'Cleaning', subCategory: 'Sofa & Carpet Clean',
      name: 'Ramesh Cleaning Co.', title: 'Sofa & Carpet Steam Cleaning',
      bio: 'Professional steam cleaning for sofas, carpets, and mattresses. Removes dust mites and allergens.',
      rating: 4.6, reviewCount: 142, basePrice: 799, priceUnit: '/session',
      badge: null,
      avatarUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop&auto=format',
      tags: ['Sofa', 'Carpet', 'Steam Clean', 'Dust Mites'],
    },
    {
      category: 'Cleaning', subCategory: 'Move-in / Move-out',
      name: 'Nirmala Services', title: 'Move-in / Move-out Cleaning',
      bio: 'Handover-ready cleaning for landlords and tenants. Security deposit protection guaranteed.',
      rating: 4.9, reviewCount: 88, basePrice: 1299, priceUnit: '/flat',
      badge: 'Top Rated',
      avatarUrl: 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=400&h=400&fit=crop&auto=format',
      tags: ['Move-out', 'Handover', 'Deep Clean', 'Full Flat'],
    },
    // ── PLUMBING ──────────────────────────────────────────
    {
      category: 'Plumbing', subCategory: 'Pipe Leak & Repair',
      name: 'Mohan Singh', title: 'Pipe Leak & Repair Expert',
      bio: 'Licensed plumber with 10+ years fixing leaks, burst pipes, and joint failures. 24/7 emergency.',
      rating: 4.8, reviewCount: 356, basePrice: 349, priceUnit: '/visit',
      badge: 'Top Rated',
      avatarUrl: 'https://images.unsplash.com/photo-1504275107627-0c2ba7a43dba?w=400&h=400&fit=crop&auto=format',
      tags: ['Leak Fix', 'Burst Pipe', 'Emergency', '24/7'],
    },
    {
      category: 'Plumbing', subCategory: 'Tap & Faucet',
      name: 'Dilip Kumar', title: 'Tap & Faucet Technician',
      bio: 'Specialises in mixer installation, tap repair, and bathroom accessories fitting.',
      rating: 4.7, reviewCount: 221, basePrice: 199, priceUnit: '/visit',
      badge: 'Verified',
      avatarUrl: 'https://images.unsplash.com/photo-1556157382-97eda2d62296?w=400&h=400&fit=crop&auto=format',
      tags: ['Tap', 'Mixer', 'Faucet', 'Bathroom'],
    },
    {
      category: 'Plumbing', subCategory: 'Toilet Repair',
      name: 'Harish Plumbing', title: 'Toilet & Sanitary Repair',
      bio: 'Flush tank repair, seat replacement, and cistern servicing. Same-day appointments available.',
      rating: 4.6, reviewCount: 178, basePrice: 249, priceUnit: '/visit',
      badge: null,
      avatarUrl: 'https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?w=400&h=400&fit=crop&auto=format',
      tags: ['Flush', 'Toilet', 'Cistern', 'Same Day'],
    },
    {
      category: 'Plumbing', subCategory: 'Water Heater / Geyser',
      name: 'Santosh Geyser Works', title: 'Geyser & Water Heater Expert',
      bio: 'All brands: Bajaj, AO Smith, Racold, V-Guard. Installation, repair, and annual servicing.',
      rating: 4.9, reviewCount: 289, basePrice: 399, priceUnit: '/visit',
      badge: 'Top Rated',
      avatarUrl: 'https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=400&h=400&fit=crop&auto=format',
      tags: ['Geyser', 'Water Heater', 'All Brands', 'Installation'],
    },
    {
      category: 'Plumbing', subCategory: 'Drainage & Blockage',
      name: 'Raju Drain Solutions', title: 'Drainage & Blockage Specialist',
      bio: 'High-pressure jetting and mechanical de-clogging for sinks, toilets, and sewer lines.',
      rating: 4.7, reviewCount: 133, basePrice: 449, priceUnit: '/visit',
      badge: 'Verified',
      avatarUrl: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=400&h=400&fit=crop&auto=format',
      tags: ['Drain', 'Blockage', 'Jetting', 'Sewer'],
    },
    // ── ELECTRICAL ────────────────────────────────────────
    {
      category: 'Electrical', subCategory: 'Wiring & Rewiring',
      name: 'Arun Electricals', title: 'Licensed Electrician – Wiring',
      bio: 'Full home wiring, concealed conduit work, and short-circuit diagnosis. ISI certified materials.',
      rating: 4.8, reviewCount: 302, basePrice: 499, priceUnit: '/visit',
      badge: 'Verified',
      avatarUrl: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=400&h=400&fit=crop&auto=format',
      tags: ['Wiring', 'Rewiring', 'Short Circuit', 'ISI Certified'],
    },
    {
      category: 'Electrical', subCategory: 'Fan & Light Fitting',
      name: 'Vikram Electric', title: 'Fan & Light Installation Pro',
      bio: 'Ceiling fans, LED panels, track lights, and chandeliers. Neat work, no mess.',
      rating: 4.7, reviewCount: 415, basePrice: 149, priceUnit: '/point',
      badge: 'Top Rated',
      avatarUrl: 'https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=400&h=400&fit=crop&auto=format',
      tags: ['Fan', 'LED', 'Chandelier', 'Track Light'],
    },
    {
      category: 'Electrical', subCategory: 'Switchboard Repair',
      name: 'Naresh Wiring Co.', title: 'Switchboard & Socket Repair',
      bio: 'MCB trips, plug sockets, and modular switchboard upgrades. Fast 2-hour service window.',
      rating: 4.6, reviewCount: 189, basePrice: 199, priceUnit: '/visit',
      badge: null,
      avatarUrl: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&h=400&fit=crop&auto=format',
      tags: ['Switchboard', 'Socket', 'MCB', 'Modular'],
    },
    {
      category: 'Electrical', subCategory: 'CCTV Installation',
      name: 'SecureVision CCTV', title: 'CCTV & Security Camera Expert',
      bio: 'HD CCTV systems, DVR setup, and remote viewing configuration for homes and offices.',
      rating: 4.9, reviewCount: 97, basePrice: 999, priceUnit: '/camera',
      badge: 'Top Rated',
      avatarUrl: 'https://images.unsplash.com/photo-1560472355-536de3962603?w=400&h=400&fit=crop&auto=format',
      tags: ['CCTV', 'HD Camera', 'DVR', 'Remote View'],
    },
    {
      category: 'Electrical', subCategory: 'Inverter & Battery',
      name: 'PowerSafe Inverters', title: 'Inverter & Battery Service',
      bio: 'Luminous, Exide, and Amaron batteries. UPS installation and inverter annual maintenance.',
      rating: 4.7, reviewCount: 144, basePrice: 299, priceUnit: '/visit',
      badge: 'Verified',
      avatarUrl: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=400&h=400&fit=crop&auto=format',
      tags: ['Inverter', 'Battery', 'UPS', 'Luminous'],
    },
    // ── SALON ─────────────────────────────────────────────
    {
      category: 'Salon', subCategory: 'Haircut & Styling',
      name: 'Preethi Styles', title: 'Hair Stylist & Cut Expert',
      bio: 'Trained from Lakme Academy. Women and men haircuts, blow-dry, and keratin smoothing.',
      rating: 4.9, reviewCount: 523, basePrice: 349, priceUnit: '/session',
      badge: 'Top Rated',
      avatarUrl: 'https://images.unsplash.com/photo-1610992015732-2449b76344bc?w=400&h=400&fit=crop&auto=format',
      tags: ['Haircut', 'Blow-dry', 'Keratin', 'Lakme Trained'],
    },
    {
      category: 'Salon', subCategory: 'Facial & Skincare',
      name: 'Ananya Glow Studio', title: 'Facial & Skincare Specialist',
      bio: 'Gold facial, O3+ skin care, and anti-ageing treatments. Hygienic single-use products.',
      rating: 4.8, reviewCount: 378, basePrice: 499, priceUnit: '/session',
      badge: 'Top Rated',
      avatarUrl: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=400&h=400&fit=crop&auto=format',
      tags: ['Facial', 'Gold Facial', 'Anti-Ageing', 'O3+'],
    },
    {
      category: 'Salon', subCategory: 'Bridal Makeup',
      name: 'Divya Nair', title: 'Bridal Makeup Artist',
      bio: 'Luxury bridal packages, pre-bridal skincare, and party makeup. Pan-India service available.',
      rating: 5.0, reviewCount: 312, basePrice: 4999, priceUnit: '/booking',
      badge: 'Top Rated',
      avatarUrl: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=400&h=400&fit=crop&auto=format',
      tags: ['Bridal', 'Pre-Bridal', 'Airbrush', 'HD Makeup'],
    },
    {
      category: 'Salon', subCategory: 'Nail Art & Manicure',
      name: 'Nisha Nail Studio', title: 'Nail Art & Manicure Expert',
      bio: 'Gel nails, acrylic extensions, French manicure, and custom nail art. Hygienic tools every visit.',
      rating: 4.7, reviewCount: 264, basePrice: 399, priceUnit: '/session',
      badge: 'Verified',
      avatarUrl: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=400&fit=crop&auto=format',
      tags: ['Gel Nails', 'Acrylic', 'Nail Art', 'Manicure'],
    },
    {
      category: 'Salon', subCategory: 'Waxing & Threading',
      name: 'Sona Beauty', title: 'Waxing & Threading Specialist',
      bio: 'Rica wax, chocolate wax, full body and eyebrow threading. Gentle technique for sensitive skin.',
      rating: 4.6, reviewCount: 447, basePrice: 249, priceUnit: '/session',
      badge: null,
      avatarUrl: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400&h=400&fit=crop&auto=format',
      tags: ['Rica Wax', 'Threading', 'Full Body', 'Sensitive Skin'],
    },
    {
      category: 'Salon', subCategory: 'Hair Spa & Colour',
      name: 'Colour Lab by Priya', title: 'Hair Colour & Spa Expert',
      bio: 'Balayage, highlights, root touch-up, and protein hair spa. Loreal and Wella colours used.',
      rating: 4.9, reviewCount: 199, basePrice: 999, priceUnit: '/session',
      badge: 'Top Rated',
      avatarUrl: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=400&h=400&fit=crop&auto=format',
      tags: ['Hair Colour', 'Balayage', 'Hair Spa', 'Loreal'],
    },
    // ── PAINTING ──────────────────────────────────────────
    {
      category: 'Painting', subCategory: 'Interior Painting',
      name: 'Suraj Painters', title: 'Interior Wall Painting Pro',
      bio: 'Asian Paints and Berger certified painter. Royale Shyne, Emulsion, and eggshell finish.',
      rating: 4.7, reviewCount: 211, basePrice: 8, priceUnit: '/sq.ft',
      badge: 'Verified',
      avatarUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=400&fit=crop&auto=format',
      tags: ['Interior', 'Asian Paints', 'Emulsion', 'Royale Shyne'],
    },
    {
      category: 'Painting', subCategory: 'Interior Painting',
      name: 'Ramkumar Decor', title: 'Premium Interior Painter',
      bio: '15 years in residential painting. Specialises in clean edges, crack filling, and two-coat finish.',
      rating: 4.8, reviewCount: 143, basePrice: 10, priceUnit: '/sq.ft',
      badge: 'Top Rated',
      avatarUrl: 'https://images.unsplash.com/photo-1565301660306-29e08751cc53?w=400&h=400&fit=crop&auto=format',
      tags: ['Interior', 'Crack Fill', 'Two Coat', 'Premium'],
    },
    {
      category: 'Painting', subCategory: 'Texture & Design',
      name: 'Artisan Wall Studio', title: 'Texture & Wall Design Expert',
      bio: 'Stucco, brick effect, metallic, and 3D texture painting. Transform any wall into art.',
      rating: 4.9, reviewCount: 76, basePrice: 25, priceUnit: '/sq.ft',
      badge: 'Top Rated',
      avatarUrl: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=400&h=400&fit=crop&auto=format',
      tags: ['Texture', '3D Design', 'Metallic', 'Stucco'],
    },
    {
      category: 'Painting', subCategory: 'Wood Polishing',
      name: 'Furniture Polish Pro', title: 'Wood Polish & Lacquer Expert',
      bio: 'PU polish, melamine, and wax finishing for doors, windows, and modular furniture.',
      rating: 4.6, reviewCount: 98, basePrice: 15, priceUnit: '/sq.ft',
      badge: null,
      avatarUrl: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&h=400&fit=crop&auto=format',
      tags: ['Wood Polish', 'PU Polish', 'Melamine', 'Furniture'],
    },
    {
      category: 'Painting', subCategory: 'Waterproofing',
      name: 'DryShield Solutions', title: 'Waterproofing Specialist',
      bio: 'Dr Fixit and CICO waterproofing for terraces, bathrooms, and basements. 5-year guarantee.',
      rating: 4.8, reviewCount: 64, basePrice: 20, priceUnit: '/sq.ft',
      badge: 'Verified',
      avatarUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&h=400&fit=crop&auto=format',
      tags: ['Waterproofing', 'Terrace', 'Dr Fixit', '5-Year Guarantee'],
    },
    // ── AC REPAIR ─────────────────────────────────────────
    {
      category: 'AC Repair', subCategory: 'AC Service & Cleaning',
      name: 'CoolBreeze AC Services', title: 'AC Service & Deep Clean',
      bio: 'Jet wash, coil clean, and filter service for split and window ACs. All brands covered.',
      rating: 4.8, reviewCount: 512, basePrice: 399, priceUnit: '/AC',
      badge: 'Top Rated',
      avatarUrl: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=400&h=400&fit=crop&auto=format',
      tags: ['AC Service', 'Jet Wash', 'All Brands', 'Split AC'],
    },
    {
      category: 'AC Repair', subCategory: 'AC Gas Refill',
      name: 'FrostFix HVAC', title: 'AC Gas Refill & Leak Check',
      bio: 'R22, R32, and R410A refrigerant refill. Leak detection and sealing included.',
      rating: 4.7, reviewCount: 287, basePrice: 799, priceUnit: '/AC',
      badge: 'Verified',
      avatarUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop&auto=format',
      tags: ['Gas Refill', 'R32', 'R410A', 'Leak Fix'],
    },
    {
      category: 'AC Repair', subCategory: 'AC Installation',
      name: 'QuickFit AC Installation', title: 'AC Installation Expert',
      bio: '1-ton and 1.5-ton split AC installation with copper piping and 1-year workmanship warranty.',
      rating: 4.9, reviewCount: 341, basePrice: 999, priceUnit: '/AC',
      badge: 'Top Rated',
      avatarUrl: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=400&fit=crop&auto=format',
      tags: ['AC Installation', 'Split AC', 'Copper Pipe', '1 Year Warranty'],
    },
    {
      category: 'AC Repair', subCategory: 'Refrigerator Repair',
      name: 'ChillTech Appliances', title: 'Refrigerator Repair Expert',
      bio: 'Single-door, double-door, and side-by-side fridge repair. Compressor, gas, and PCB issues.',
      rating: 4.7, reviewCount: 176, basePrice: 499, priceUnit: '/visit',
      badge: 'Verified',
      avatarUrl: 'https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=400&h=400&fit=crop&auto=format',
      tags: ['Fridge Repair', 'Compressor', 'Double Door', 'PCB'],
    },
    {
      category: 'AC Repair', subCategory: 'Washing Machine Repair',
      name: 'WashPro Services', title: 'Washing Machine Repair',
      bio: 'LG, Samsung, Bosch, and IFB front-load and top-load washer repair. Motor, drum, and drain.',
      rating: 4.6, reviewCount: 221, basePrice: 449, priceUnit: '/visit',
      badge: null,
      avatarUrl: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=400&h=400&fit=crop&auto=format',
      tags: ['Washing Machine', 'Front Load', 'LG', 'Samsung'],
    },
    // ── LAUNDRY ───────────────────────────────────────────
    {
      category: 'Laundry', subCategory: 'Wash & Fold',
      name: 'Fresh Fold Laundry', title: 'Wash & Fold Service',
      bio: 'Pick-up and drop laundry with 24-hour turnaround. Per-kg pricing, premium detergent.',
      rating: 4.7, reviewCount: 344, basePrice: 60, priceUnit: '/kg',
      badge: 'Verified',
      avatarUrl: 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=400&h=400&fit=crop&auto=format',
      tags: ['Wash & Fold', 'Pick-up', 'Drop', '24 Hr'],
    },
    {
      category: 'Laundry', subCategory: 'Dry Cleaning',
      name: 'Prestige Dry Cleaners', title: 'Premium Dry Cleaning Service',
      bio: 'Suits, sarees, sherwanis, and winter wear dry cleaning. Crease-free and hygienically packed.',
      rating: 4.9, reviewCount: 187, basePrice: 199, priceUnit: '/piece',
      badge: 'Top Rated',
      avatarUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop&auto=format',
      tags: ['Dry Clean', 'Suits', 'Sarees', 'Winter Wear'],
    },
    {
      category: 'Laundry', subCategory: 'Ironing Only',
      name: 'SteamPress Express', title: 'Ironing & Steam Press',
      bio: 'Professional steam ironing. Per-piece pricing, 12-hour turnaround, home delivery available.',
      rating: 4.5, reviewCount: 512, basePrice: 15, priceUnit: '/piece',
      badge: null,
      avatarUrl: 'https://images.unsplash.com/photo-1615397349754-cfa2066a298e?w=400&h=400&fit=crop&auto=format',
      tags: ['Ironing', 'Steam Press', '12 Hr', 'Home Delivery'],
    },
    {
      category: 'Laundry', subCategory: 'Curtain Cleaning',
      name: 'Curtain Care Pro', title: 'Curtain & Drape Cleaning',
      bio: 'On-site and pick-up curtain washing. Blackout, sheer, and heavy drapes all handled with care.',
      rating: 4.7, reviewCount: 89, basePrice: 80, priceUnit: '/panel',
      badge: 'Verified',
      avatarUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop&auto=format',
      tags: ['Curtains', 'Drapes', 'Pick-up', 'On-site'],
    },
    // ── MORE ──────────────────────────────────────────────
    {
      category: 'More', subCategory: 'Carpentry',
      name: 'Woodcraft Interiors', title: 'Carpenter & Furniture Expert',
      bio: 'Custom furniture, modular kitchen fitting, wardrobe assembly, and wooden door repair.',
      rating: 4.7, reviewCount: 231, basePrice: 499, priceUnit: '/visit',
      badge: 'Verified',
      avatarUrl: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&h=400&fit=crop&auto=format',
      tags: ['Carpentry', 'Furniture', 'Wardrobe', 'Kitchen'],
    },
    {
      category: 'More', subCategory: 'Pest Control',
      name: 'PestGuard Pro', title: 'Pest Control Specialist',
      bio: 'AMC and one-time treatment for cockroaches, termites, bed bugs, and rodents. Safe for kids.',
      rating: 4.8, reviewCount: 388, basePrice: 999, priceUnit: '/flat',
      badge: 'Top Rated',
      avatarUrl: 'https://images.unsplash.com/photo-1632844273137-c53ff2eedcae?w=400&h=400&fit=crop&auto=format',
      tags: ['Pest Control', 'Termite', 'Cockroach', 'Safe for Kids'],
    },
    {
      category: 'More', subCategory: 'Water Purifier Service',
      name: 'AquaFresh Technicians', title: 'RO & Water Purifier Expert',
      bio: 'Kent, Aquaguard, Pureit service and filter replacement. Annual AMC available.',
      rating: 4.7, reviewCount: 142, basePrice: 399, priceUnit: '/visit',
      badge: 'Verified',
      avatarUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&h=400&fit=crop&auto=format',
      tags: ['RO Service', 'Kent', 'Aquaguard', 'Filter Change'],
    },
    {
      category: 'More', subCategory: 'CCTV & Security',
      name: 'SafeHome Security', title: 'CCTV & Alarm Installation',
      bio: 'End-to-end CCTV setup, intercom, and video door phones for homes and offices.',
      rating: 4.8, reviewCount: 76, basePrice: 1499, priceUnit: '/system',
      badge: 'Top Rated',
      avatarUrl: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=400&fit=crop&auto=format',
      tags: ['CCTV', 'Alarm', 'Video Door', 'Intercom'],
    },
    {
      category: 'More', subCategory: 'Packers & Movers',
      name: 'QuickShift Movers', title: 'Packers & Movers',
      bio: 'Local home shifting with packing, loading, and unloading. Fragile item handling guaranteed.',
      rating: 4.6, reviewCount: 156, basePrice: 2999, priceUnit: '/move',
      badge: null,
      avatarUrl: 'https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?w=400&h=400&fit=crop&auto=format',
      tags: ['Moving', 'Packing', 'Loading', 'Fragile Handling'],
    },
  ];

  /* 5. Insert professionals (skip if name already exists) */
  const existingNames: { name: string }[] = await sql`SELECT name FROM professionals`;
  const takenNames = new Set(existingNames.map((r) => r.name));

  let proInserted = 0;
  for (const def of proDefs) {
    if (takenNames.has(def.name)) {
      console.log(`  Skipping (exists): ${def.name}`);
      continue;
    }
    const catId = catMap[def.category];
    if (!catId) { console.warn('  Missing category:', def.category); continue; }

    const subId = def.subCategory ? subMap[`${def.category}|${def.subCategory}`] ?? null : null;

    await sql`
      INSERT INTO professionals
        (category_id, sub_category_id, name, title, bio, rating, review_count,
         base_price, price_unit, badge, avatar_url, tags, is_active)
      VALUES (
        ${catId}, ${subId}, ${def.name}, ${def.title}, ${def.bio},
        ${def.rating}, ${def.reviewCount}, ${def.basePrice}, ${def.priceUnit},
        ${def.badge}, ${def.avatarUrl}, ${JSON.stringify(def.tags)}, true
      )
    `;
    proInserted++;
    console.log(`  + ${def.name} [${def.category} › ${def.subCategory ?? '—'}]`);
  }

  /* 6. Summary */
  const [totSub] = await sql`SELECT COUNT(*) AS c FROM sub_service_categories`;
  const [totPro] = await sql`SELECT COUNT(*) AS c FROM professionals`;
  console.log('\n════ Seed complete ════');
  console.log(`Sub-categories in DB : ${totSub.c}`);
  console.log(`Professionals in DB  : ${totPro.c}`);
  console.log(`New pros inserted    : ${proInserted}`);

  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
