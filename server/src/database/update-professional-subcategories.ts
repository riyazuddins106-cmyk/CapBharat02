/**
 * Assigns correct categoryId + subCategoryId to every professional in the DB
 * based on name / title / tag keywords.
 * Run:  cd server && pnpm exec tsx src/database/update-professional-subcategories.ts
 */
import 'dotenv/config';
import postgres from 'postgres';

const url = process.env.SUPABASE_DATABASE_URL;
if (!url) throw new Error('SUPABASE_DATABASE_URL not set');
const sql = postgres(url, { ssl: 'require', max: 1 });

type Row = { id: string; name: string; title: string; tags: string };

/* Keyword → subcategory name mapping (lower-case keywords) */
const KEYWORD_MAP: { category: string; sub: string; keywords: string[] }[] = [
  // ── Cleaning ────────────────────────────────────────────────────────
  { category: 'Cleaning', sub: 'Home Deep Clean',     keywords: ['home deep', 'deep clean', 'full home', 'full clean', 'sanitiz', 'kavita', 'sunita', 'home cleaning'] },
  { category: 'Cleaning', sub: 'Bathroom Cleaning',   keywords: ['bathroom', 'toilet clean', 'laxmi', 'tiles clean'] },
  { category: 'Cleaning', sub: 'Kitchen Deep Clean',  keywords: ['kitchen', 'chimney', 'stove', 'sink clean'] },
  { category: 'Cleaning', sub: 'Sofa & Carpet Clean', keywords: ['sofa', 'carpet', 'upholstery', 'steam clean'] },
  { category: 'Cleaning', sub: 'Move-in / Move-out',  keywords: ['move-in', 'move-out', 'move in', 'move out', 'handover', 'vacant', 'shifting clean'] },
  { category: 'Cleaning', sub: 'Office Cleaning',     keywords: ['office clean', 'commercial clean', 'workspace clean'] },
  // ── Plumbing ────────────────────────────────────────────────────────
  { category: 'Plumbing', sub: 'Pipe Leak & Repair',    keywords: ['pipe leak', 'burst pipe', 'pipe repair', 'leak fix', 'mohan', 'pipe'] },
  { category: 'Plumbing', sub: 'Tap & Faucet',          keywords: ['tap', 'faucet', 'mixer', 'washer', 'faucet'] },
  { category: 'Plumbing', sub: 'Toilet Repair',         keywords: ['toilet', 'flush', 'cistern', 'seat repair'] },
  { category: 'Plumbing', sub: 'Water Heater / Geyser', keywords: ['geyser', 'water heater', 'heater install', 'boiler'] },
  { category: 'Plumbing', sub: 'Drainage & Blockage',   keywords: ['drain', 'blockage', 'clog', 'sewer', 'de-clog'] },
  { category: 'Plumbing', sub: 'Pipe Installation',     keywords: ['pipe install', 'plumb install', 'new pipeline'] },
  // ── Electrical ──────────────────────────────────────────────────────
  { category: 'Electrical', sub: 'Wiring & Rewiring',   keywords: ['wiring', 'rewiring', 'short circuit', 'arun', 'electrical wir'] },
  { category: 'Electrical', sub: 'Fan & Light Fitting', keywords: ['fan', 'light', 'led', 'chandelier', 'ceiling fan', 'fitting'] },
  { category: 'Electrical', sub: 'Switchboard Repair',  keywords: ['switch', 'socket', 'plug', 'switchboard', 'outlet'] },
  { category: 'Electrical', sub: 'MCB & Fuse Box',      keywords: ['mcb', 'fuse', 'panel', 'earthing', 'fuse box'] },
  { category: 'Electrical', sub: 'CCTV Installation',   keywords: ['cctv', 'camera', 'dvr', 'surveillance', 'security cam'] },
  { category: 'Electrical', sub: 'Inverter & Battery',  keywords: ['inverter', 'battery', 'ups', 'backup power'] },
  // ── Salon ───────────────────────────────────────────────────────────
  { category: 'Salon', sub: 'Haircut & Styling', keywords: ['haircut', 'hair cut', 'styling', 'blow-dry', 'hair style', 'preethi', 'barber', 'hair salon'] },
  { category: 'Salon', sub: 'Facial & Skincare', keywords: ['facial', 'skincare', 'skin care', 'clean-up', 'gold facial', 'anti-ageing', 'cleanup'] },
  { category: 'Salon', sub: 'Nail Art',           keywords: ['nail', 'manicure', 'pedicure'] },
  { category: 'Salon', sub: 'Waxing & Threading', keywords: ['wax', 'threading', 'epilat', 'detan'] },
  { category: 'Salon', sub: 'Spa & Massage',      keywords: ['spa', 'massage', 'relaxation', 'body wrap'] },
  { category: 'Salon', sub: 'Bridal Makeup',      keywords: ['bridal', 'makeup', 'wedding makeup', 'bride'] },
  // ── Painting ────────────────────────────────────────────────────────
  { category: 'Painting', sub: 'Interior Painting',     keywords: ['interior paint', 'wall paint', 'room paint', 'house paint', 'indoor paint'] },
  { category: 'Painting', sub: 'Exterior Painting',     keywords: ['exterior paint', 'outside paint', 'outdoor paint', 'facade'] },
  { category: 'Painting', sub: 'Waterproofing',         keywords: ['waterproof', 'damp proof', 'leak proof', 'seepage'] },
  { category: 'Painting', sub: 'Wood & Metal Polish',   keywords: ['wood polish', 'metal polish', 'varnish', 'lacquer'] },
  // ── AC Repair ───────────────────────────────────────────────────────
  { category: 'AC Repair', sub: 'AC Service & Cleaning', keywords: ['ac clean', 'ac service', 'ac maintenance', 'split ac', 'ac wash'] },
  { category: 'AC Repair', sub: 'AC Repair',             keywords: ['ac repair', 'ac fix', 'ac not cool', 'ac gas', 'refrigerant'] },
  { category: 'AC Repair', sub: 'AC Installation',       keywords: ['ac install', 'ac fit'] },
  { category: 'AC Repair', sub: 'Refrigerator Repair',   keywords: ['refrigerator', 'fridge', 'freezer'] },
  { category: 'AC Repair', sub: 'Washing Machine Repair',keywords: ['washing machine', 'washer repair'] },
  // ── Laundry ─────────────────────────────────────────────────────────
  { category: 'Laundry', sub: 'Wash & Fold',         keywords: ['wash fold', 'laundry service', 'clothes wash'] },
  { category: 'Laundry', sub: 'Dry Cleaning',        keywords: ['dry clean', 'dryclean'] },
  { category: 'Laundry', sub: 'Ironing & Pressing',  keywords: ['iron', 'press cloth', 'pressing'] },
  { category: 'Laundry', sub: 'Stain Removal',       keywords: ['stain', 'spot clean'] },
];

async function main() {
  /* 1. Load categories */
  const cats: { id: string; name: string }[] = await sql`SELECT id, name FROM service_categories`;
  const catMap = Object.fromEntries(cats.map(c => [c.name, c.id]));

  /* 2. Load all sub-categories */
  const subs: { id: string; name: string; category_id: string }[] = await sql`
    SELECT id, name, category_id FROM sub_service_categories WHERE is_active = true
  `;
  // Build lookup: "Category|SubName" → id
  const catById = Object.fromEntries(cats.map(c => [c.id, c.name]));
  const subMap: Record<string, string> = {};
  for (const s of subs) {
    const catName = catById[s.category_id] ?? '';
    subMap[`${catName}|${s.name}`] = s.id;
  }

  /* 3. Load all professionals */
  const pros: Row[] = await sql`
    SELECT id, name, title, COALESCE(tags::text, '[]') as tags FROM professionals WHERE deleted_at IS NULL
  `;
  console.log(`Professionals to update: ${pros.length}`);

  let updated = 0;
  let skipped = 0;

  for (const pro of pros) {
    const haystack = `${pro.name} ${pro.title} ${pro.tags}`.toLowerCase();

    let matchedCatId: string | null = null;
    let matchedSubId: string | null = null;

    for (const rule of KEYWORD_MAP) {
      if (rule.keywords.some(kw => haystack.includes(kw))) {
        matchedCatId = catMap[rule.category] ?? null;
        const subKey = `${rule.category}|${rule.sub}`;
        matchedSubId = subMap[subKey] ?? null;
        break;
      }
    }

    if (matchedCatId) {
      await sql`
        UPDATE professionals
        SET category_id = ${matchedCatId},
            sub_category_id = ${matchedSubId},
            updated_at = NOW()
        WHERE id = ${pro.id}
      `;
      console.log(`  ✓ ${pro.name} → ${Object.keys(catMap).find(k => catMap[k] === matchedCatId)} › ${matchedSubId ? subs.find(s => s.id === matchedSubId)?.name : '—'}`);
      updated++;
    } else {
      console.log(`  ⚠ ${pro.name} — no keyword match, skipping`);
      skipped++;
    }
  }

  console.log(`\n═══ Done: ${updated} updated, ${skipped} skipped ═══`);
  await sql.end();
}

main().catch(e => { console.error(e); process.exit(1); });
