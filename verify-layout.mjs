import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://localhost:8126/journeyofgrace-site/';
const VIEWPORT = { width: 1440, height: 900 };

const pages = ['404', 'about-us', 'connect', 'events', 'index', 'journey-classes', 'kids-min', 'life-groups', 'mens-ministry', 'nextstep', 'plan-your-visit', 'privacy', 'prximo-paso', 'sermon-archive', 'sermons', 'service-teams', 'spanish', 'visit', 'womens-ministry', 'youth-group'];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: VIEWPORT, serviceWorkers: 'block' });
let failures = 0;

for (const p of pages) {
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(BASE + p + '.html', { waitUntil: 'load' });
  await page.waitForTimeout(400);

  const nav = await page.$$eval('.jog-global-nav a', (as) => as.map((a) => a.textContent.trim()));
  const drawer = await page.$$eval('#mobileNavDrawer a', (as) => as.map((a) => a.textContent.trim()));
  const hasHeader = await page.locator('header.jog-global-header').count();
  const hasFooter = await page.locator('footer').count();

  if (!nav.includes('Español')) failures++, console.log(`FAIL ${p}: nav missing Español`);
  if (!drawer.includes('Español')) failures++, console.log(`FAIL ${p}: drawer missing Español`);
  if (nav.length !== 7) { failures++; console.log(`FAIL ${p}: nav count ${nav.length}`); }
  if (hasHeader !== 1) { failures++; console.log(`FAIL ${p}: header x${hasHeader}`); }
  if (p !== 'index' && hasFooter !== 1) { failures++; console.log(`FAIL ${p}: footer x${hasFooter}`); }
  if (errors.length) { failures++; console.log(`FAIL ${p}: console ${errors.slice(0, 3).join(' | ')}`); }

  if (p === 'index') {
    const cta = await page.locator('.jog-hero-cta').count();
    const pills = await page.locator('.jog-hero-pill').count();
    const desc = (await page.locator('.jog-hero-desc').textContent()) || '';
    if (cta !== 1 || pills !== 0 || desc !== 'Join Us on the Journey of Grace') {
      failures++; console.log(`FAIL index hero: cta=${cta} pills=${pills} desc="${desc}"`);
    }
  }
  if (p === 'visit') {
    const link = await page.locator('.service-info a[href="spanish"]').count();
    const text = (await page.locator('.service-info a[href="spanish"]').textContent()) || '';
    if (link !== 1 || !text.includes('9:00 AM')) { failures++; console.log(`FAIL visit espanol link: ${link} "${text}"`); }
  }
  console.log(`  ok  ${p}: nav=[${nav.join(' | ')}]`);
  await page.close();
}

await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);