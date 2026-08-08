import { chromium } from 'playwright';

const BASE = 'http://localhost:8126';
const results = [];

async function check(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`  ok  ${name}`);
  } catch (err) {
    results.push({ name, ok: false, err: String(err) });
    console.log(`FAIL  ${name}: ${err}`);
  }
}

async function collectErrors(page) {
  const errs = [];
  page.on('console', (m) => {
    if (m.type() === 'error') {
      const loc = m.location();
      if (loc && loc.url && loc.url.startsWith(BASE)) errs.push(m.text());
    }
  });
  page.on('pageerror', (e) => errs.push(String(e)));
  return errs;
}

const browser = await chromium.launch();

// --- desktop checks ---
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = await collectErrors(page);

const gridCounts = { 'kids-min': 5, 'mens-ministry': 6, 'youth-group': 43 };

for (const [slug, expected] of Object.entries(gridCounts)) {
  await check(`${slug} grid count`, async () => {
    await page.goto(`${BASE}/${slug}.html`, { waitUntil: 'networkidle' });
    const n = await page.locator('.jog-photo-grid img').count();
    if (n !== expected) throw new Error(`expected ${expected} imgs, got ${n}`);
    const srcs = await page.locator('.jog-photo-grid img').evaluateAll((imgs) => imgs.map((i) => i.getAttribute('src')));
    if (srcs.some((s) => s.includes('/assets/img/vendor/'))) throw new Error('grid still references vendor path');
    if (srcs.some((s) => !s.includes('assets/img/gallery/'))) throw new Error('grid src not from gallery folder');
  });
}

await check('womens-ministry gallery disabled (no grid)', async () => {
  await page.goto(`${BASE}/womens-ministry.html`, { waitUntil: 'networkidle' });
  const n = await page.locator('.jog-photo-grid').count();
  if (n !== 0) throw new Error(`expected no photo grid, got ${n}`);
});

await check('about-us has 3 staff imgs', async () => {
  await page.goto(`${BASE}/about-us.html`, { waitUntil: 'networkidle' });
  const n = await page.locator('.about-staff-card img').count();
  if (n !== 3) throw new Error(`expected 3 staff imgs, got ${n}`);
});

async function lightboxRoundTrip(slug, targetSel) {
  await page.goto(`${BASE}/${slug}.html`, { waitUntil: 'networkidle' });
  const thumb = page.locator(targetSel).first();
  await thumb.scrollIntoViewIfNeeded();
  await thumb.waitFor({ state: 'attached' });
  const thumbSrc = await thumb.getAttribute('src');
  await thumb.click();
  const lb = page.locator('.jog-lightbox');
  await page.waitForFunction(() => document.querySelector('.jog-lightbox')?.classList.contains('jog-lightbox-open'));
  const lbSrc = await lb.locator('.jog-lightbox-img').getAttribute('src');
  if (!lbSrc || !lbSrc.includes(thumbSrc)) throw new Error(`lightbox src mismatch: ${lbSrc} vs ${thumbSrc}`);
  await page.waitForFunction(() => {
    const el = document.querySelector('.jog-lightbox-img');
    return el && el.complete && el.naturalWidth > 0;
  });
  const lw = await lb.locator('.jog-lightbox-img').evaluate((el) => Math.round(el.getBoundingClientRect().width));
  const th = await thumb.evaluate((el) => Math.round(el.getBoundingClientRect().width));
  if (lw <= th) throw new Error(`lightbox not bigger (thumb ${th}px, lightbox ${lw}px)`);
  const locked = await page.evaluate(() => document.body.classList.contains('jog-lightbox-locked'));
  if (!locked) throw new Error('body not locked');
}

await check('kids-min first grid photo lightbox', async () => await lightboxRoundTrip('kids-min', '.jog-photo-grid img'));
await check('mens-ministry first grid photo lightbox', async () => await lightboxRoundTrip('mens-ministry', '.jog-photo-grid img'));
await check('youth-group first grid photo lightbox', async () => await lightboxRoundTrip('youth-group', '.jog-photo-grid img'));
await check('about-us staff photo lightbox', async () => await lightboxRoundTrip('about-us', '.about-staff-card img'));

await check('esc closes lightbox', async () => {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  const open = await page.locator('.jog-lightbox').evaluate((el) => el.classList.contains('jog-lightbox-open'));
  if (open) throw new Error('still open after Esc');
  const stillLocked = await page.evaluate(() => document.body.classList.contains('jog-lightbox-locked'));
  if (stillLocked) throw new Error('body still locked after close');
});

await check('overlay backdrop click closes lightbox', async () => {
  await page.goto(`${BASE}/kids-min.html`, { waitUntil: 'networkidle' });
  const t = page.locator('.jog-photo-grid img').first();
  await t.scrollIntoViewIfNeeded();
  await t.click();
  await page.waitForFunction(() => document.querySelector('.jog-lightbox')?.classList.contains('jog-lightbox-open'));
  await page.mouse.click(10, 10);
  await page.waitForTimeout(150);
  const open = await page.locator('.jog-lightbox').evaluate((el) => el.classList.contains('jog-lightbox-open'));
  if (open) throw new Error('still open after backdrop click');
});

// --- mobile checks ---
const mob = await browser.newPage({ viewport: { width: 375, height: 760 } });
await check('mobile: youth lightbox no overflow + close btn', async () => {
  await mob.goto(`${BASE}/youth-group.html`, { waitUntil: 'networkidle' });
  const t = mob.locator('.jog-photo-grid img').first();
  await t.scrollIntoViewIfNeeded();
  await t.click();
  await mob.waitForFunction(() => document.querySelector('.jog-lightbox')?.classList.contains('jog-lightbox-open'));
  const over = await mob.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  if (over) throw new Error('horizontal overflow with lightbox open');
  const lw = await mob.locator('.jog-lightbox-img').evaluate((el) => Math.round(el.getBoundingClientRect().width));
  if (lw > 375) throw new Error(`lightbox img wider than viewport: ${lw}px`);
  await mob.locator('.jog-lightbox-close').click();
  await mob.waitForTimeout(150);
  const open = await mob.locator('.jog-lightbox').evaluate((el) => el.classList.contains('jog-lightbox-open'));
  if (open) throw new Error('not closed by button');
});

await check('no console/page errors (main frame)', async () => {
  if (errors.length) throw new Error(errors.join(' | '));
});

await page.close();
await mob.close();
await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log('FAILURES:', failed.map((f) => f.name).join(', '));
  process.exit(1);
}
console.log('LIGHTBOX + GALLERY OK');
