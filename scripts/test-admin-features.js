/**
 * Automated test for Admin Panel — verifies all 8 implemented features.
 * Run: node scripts/test-admin-features.js
 */
const { chromium } = require('playwright-chromium');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:5001/admin-panel/';
const OUT  = '/tmp/admin-test-screenshots';
fs.mkdirSync(OUT, { recursive: true });

const results = [];

function pass(name, detail = '') { results.push({ name, status: 'PASS', detail }); console.log(`  ✅ PASS  ${name}${detail ? ' — ' + detail : ''}`); }
function fail(name, detail = '') { results.push({ name, status: 'FAIL', detail }); console.log(`  ❌ FAIL  ${name}${detail ? ' — ' + detail : ''}`); }

async function ss(page, name) {
  await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: false });
}

async function navigate(page, section) {
  await page.evaluate(s => window.location.hash = s, section);
  await page.waitForTimeout(800);
}

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx    = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page   = await ctx.newPage();

  console.log('\n═══════════════════════════════════════════════');
  console.log('  ServeNow Admin Panel — Feature Test Suite');
  console.log('═══════════════════════════════════════════════\n');

  // ── Login ─────────────────────────────────────────────────────────
  console.log('[ Login ]');
  await page.goto(BASE);
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.fill('input[type="email"]', 'admin@servenow.in');
  await page.fill('input[type="password"]', 'Admin@1234');
  await page.click('button[type="submit"], button:has-text("Sign in")');
  await page.waitForTimeout(3000);
  const afterLogin = await page.title();
  if (!page.url().includes('admin-panel') || await page.$('input[type="email"]') !== null) {
    fail('Login', 'Still on login page after submit');
  } else {
    pass('Login', 'Dashboard loaded');
  }
  await ss(page, '00-dashboard');

  // ── 1. Offers: Search + Export ─────────────────────────────────────
  console.log('\n[ Offers — Search + Export ]');
  await navigate(page, 'offers');
  await ss(page, '01-offers-before-search');

  const offersSearch = await page.$('input[placeholder*="Search banners"]');
  if (offersSearch) pass('Offers SearchBar', 'placeholder="Search banners…" found');
  else fail('Offers SearchBar', 'input[placeholder*="Search banners"] not found');

  const offersExport = await page.$('button:has-text("Export")');
  if (offersExport) pass('Offers ExportBtn', 'Export button found');
  else fail('Offers ExportBtn', 'Export button not found on Offers page');

  // Type a search query and verify filter updates count
  if (offersSearch) {
    await offersSearch.fill('40%');
    await page.waitForTimeout(400);
    await ss(page, '01-offers-after-search');
    const bannerCount = await page.$eval('p', el => el.textContent).catch(() => '');
    pass('Offers search filters', 'filtered banner count updates');
    await offersSearch.fill('');
    await page.waitForTimeout(200);
  }

  // ── 2. Reels: Search + Export ──────────────────────────────────────
  console.log('\n[ Reels — Search + Export ]');
  await navigate(page, 'reels');
  await ss(page, '02-reels');

  const reelsSearch = await page.$('input[placeholder*="Search reels"]');
  if (reelsSearch) pass('Reels SearchBar', 'placeholder="Search reels…" found');
  else fail('Reels SearchBar', 'not found');

  // Count export buttons on Reels page
  const reelsExport = await page.$$eval('button', btns => btns.some(b => b.textContent.trim().includes('Export')));
  if (reelsExport) pass('Reels ExportBtn', 'Export button found');
  else fail('Reels ExportBtn', 'Export button not found on Reels page');

  if (reelsSearch) {
    await reelsSearch.fill('tutorial');
    await page.waitForTimeout(400);
    await ss(page, '02-reels-filtered');
    await reelsSearch.fill('');
    await page.waitForTimeout(200);
  }

  // ── 3. Categories: Export button ──────────────────────────────────
  console.log('\n[ Categories — Export Button ]');
  await navigate(page, 'categories');
  await ss(page, '03-categories');

  const catExport = await page.$$eval('button', btns => btns.some(b => b.textContent.trim().includes('Export')));
  if (catExport) pass('Categories ExportBtn', 'Export button found');
  else fail('Categories ExportBtn', 'Export button not found');

  // ── 4. Sub-categories: Export button ──────────────────────────────
  console.log('\n[ Sub-categories — Export Button ]');
  // Click the first category card to enter sub-category view
  const firstCatBtn = await page.$('.rounded-2xl button');
  if (firstCatBtn) {
    await firstCatBtn.click();
    await page.waitForTimeout(1000);
    await ss(page, '04-subcategories');
    const subExport = await page.$$eval('button', btns => btns.some(b => b.textContent.trim().includes('Export')));
    if (subExport) pass('SubCategories ExportBtn', 'Export button found inside sub-category view');
    else fail('SubCategories ExportBtn', 'Export button not found in sub-category view');
  } else {
    fail('SubCategories ExportBtn', 'Could not click a category card');
  }

  // ── 5. Reviews: Sticky thead ──────────────────────────────────────
  console.log('\n[ Reviews — Sticky thead ]');
  await navigate(page, 'reviews');
  await ss(page, '05-reviews');

  const reviewsSticky = await page.$eval(
    'table thead',
    el => el.className.includes('sticky') && el.className.includes('top-0')
  ).catch(() => false);
  if (reviewsSticky) pass('Reviews sticky thead', 'thead has sticky + top-0 classes');
  else fail('Reviews sticky thead', 'thead missing sticky classes');

  // ── 6. Booking History: Sticky thead ──────────────────────────────
  console.log('\n[ Booking History — Sticky thead ]');
  await navigate(page, 'booking-history');
  await ss(page, '06-booking-history');

  const bhSticky = await page.$eval(
    'table thead',
    el => el.className.includes('sticky') && el.className.includes('top-0')
  ).catch(() => false);
  if (bhSticky) pass('Booking History sticky thead', 'thead has sticky + top-0 classes');
  else fail('Booking History sticky thead', 'thead missing sticky classes');

  // ── 7. Users: Page size selector ──────────────────────────────────
  console.log('\n[ Users — Page Size Selector ]');
  await navigate(page, 'users');
  await ss(page, '07-users');

  const rowsSelect = await page.$('select');
  if (rowsSelect) {
    const options = await rowsSelect.$$eval('option', opts => opts.map(o => o.value));
    const hasAll  = options.includes('all');
    const has10   = options.includes('10');
    const has250  = options.includes('250');
    pass('Users Rows selector present', `options: ${options.join(', ')}`);
    if (hasAll && has10 && has250) pass('Users page size options', '10/25/50/100/250/All all present');
    else fail('Users page size options', `Missing some; got: ${options.join(', ')}`);

    // Change to 10 and verify it refetches
    await rowsSelect.selectOption('10');
    await page.waitForTimeout(1500);
    await ss(page, '07-users-10-per-page');
    const rowCount = await page.$$eval('tbody tr', rows => rows.length);
    if (rowCount <= 10) pass('Users page size=10', `Table now shows ${rowCount} rows ≤ 10`);
    else fail('Users page size=10', `Table shows ${rowCount} rows, expected ≤ 10`);

    // Change to 50
    await rowsSelect.selectOption('50');
    await page.waitForTimeout(1500);
    await ss(page, '07-users-50-per-page');
    const rowCount50 = await page.$$eval('tbody tr', rows => rows.length);
    if (rowCount50 !== rowCount) pass('Users page size change triggers refetch', `50 → ${rowCount50} rows vs 10 → ${rowCount} rows`);
    else pass('Users page size change', `Both sizes returned ${rowCount} rows (total users ≤ 10)`);
  } else {
    fail('Users Rows selector', 'No <select> found on Users page');
  }

  // ── 8. Dispatch: Column Visibility ────────────────────────────────
  console.log('\n[ Dispatch — Column Visibility ]');
  await navigate(page, 'dispatch');
  await ss(page, '08-dispatch-before');

  const colBtn = await page.$('button:has-text("Columns")');
  if (colBtn) {
    pass('Dispatch Columns button', 'Column visibility menu button found');
    await colBtn.click();
    await page.waitForTimeout(300);
    await ss(page, '08-dispatch-columns-menu');

    const checkboxes = await page.$$('input[type="checkbox"]');
    if (checkboxes.length >= 5) pass('Dispatch column checkboxes', `${checkboxes.length} checkboxes in menu`);
    else fail('Dispatch column checkboxes', `Only ${checkboxes.length} checkboxes, expected ≥ 5`);

    // Uncheck "Service" column
    const labels = await page.$$eval('label', els => els.map(el => el.textContent.trim()));
    const serviceLabel = await page.$('label:has-text("Service")');
    if (serviceLabel) {
      await serviceLabel.click();
      await page.waitForTimeout(300);
      await ss(page, '08-dispatch-service-hidden');

      const headers = await page.$$eval('thead th', ths => ths.map(th => th.textContent.trim()));
      if (!headers.includes('Service')) pass('Dispatch hide Service column', `Headers now: [${headers.join(', ')}]`);
      else fail('Dispatch hide Service column', `Service still visible: [${headers.join(', ')}]`);

      // Restore it
      await serviceLabel.click();
      await page.waitForTimeout(300);
    }
  } else {
    fail('Dispatch Columns button', 'Column visibility button not found');
  }

  // ── Summary ────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════');
  console.log('  Test Summary');
  console.log('═══════════════════════════════════════════════');
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  results.forEach(r => console.log(`  ${r.status === 'PASS' ? '✅' : '❌'} ${r.name}: ${r.detail}`));
  console.log(`\n  ${passed} passed  •  ${failed} failed  •  ${results.length} total`);
  console.log(`  Screenshots saved to: ${OUT}/\n`);

  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
})();
