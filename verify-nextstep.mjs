import { chromium } from 'playwright';

const BASE = 'http://localhost:8126/nextstep.html';
const errors = [];
const r = {};

const rawHtml = await (await fetch(BASE)).text();
r.rawSelfHostedForm = (rawHtml.match(/<form class="self-hosted-form"/g) || []).length;
r.rawFields = (rawHtml.match(/<input class="field-element"/g) || []).length;
r.rawTextarea = (rawHtml.match(/<textarea class="field-element"/g) || []).length;

const browser = await chromium.launch({ headless: true });

for (const vp of [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'mobile', width: 375, height: 760 }
]) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
  page.on('console', (m) => { if (m.type() === 'error') errors.push(vp.name + ' console: ' + m.text()); });
  page.on('pageerror', (e) => errors.push(vp.name + ' pageerror: ' + e.message));

  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(400);

  const width = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth
  }));
  r[vp.name + '_hOverflow'] = (width.scrollWidth > width.clientWidth + 1);
  r[vp.name + '_bodyClass'] = await page.getAttribute('body', 'class');
  r[vp.name + '_pcoWrapW'] = await page.evaluate(() => {
    const w = document.querySelector('.pco-form-scale-wrap');
    return w ? Math.round(parseFloat(w.style.width) || w.clientWidth) : -1;
  });
  r[vp.name + '_formVisible'] = await page.locator('.pco-form-scale-wrap iframe.pco-form-embed').first().isVisible().catch(() => false);

  if (vp.name === 'desktop') {
    r.bodyClass = await page.getAttribute('body', 'class');
    r.breadcrumb = await page.locator('nav.jog-breadcrumb').count();
    r.breadcrumbCurrent = await page.locator('nav.jog-breadcrumb span.jog-breadcrumb-current').textContent();
    r.verse = await page.locator('blockquote.jog-verse').count();
    r.verseCite = (await page.locator('.jog-verse-ref a strong').textContent() || '').trim();
    r.kicker = (await page.locator('.jog-html-content p.about-kicker').count());
    r.h1 = await page.locator('.jog-html-content h1').first().textContent();
    r.lead = await page.locator('.jog-html-content p.about-lead').count();
    r.h2s = await page.locator('.jog-html-content h2').allTextContents();
    r.beliefs = await page.locator('.jog-html-content ul.about-beliefs li').count();
    r.beliefLink = await page.locator('.jog-html-content ul.about-beliefs li a').first().getAttribute('href');
    r.beliefNoRte = await page.evaluate(() => {
      const ul = document.querySelector('.jog-html-content ul.about-beliefs');
      const li = ul ? ul.querySelector('li') : null;
      if (!li) return false;
      const cs = getComputedStyle(li.querySelector('p') || li, '::before');
      return cs.content === 'none' || cs.content === 'normal';
    });
    r.hrFleuron = await page.locator('div.horizontalrule-block').count();
    r.dropCapAmber = await page.evaluate(() => {
      const el = document.querySelector('.about-lead');
      if (!el) return false;
      const cs = getComputedStyle(el, '::first-letter');
      const n = parseFloat(cs.fontSize || '0');
      return n > 24;
    });
    r.pcoSrc = await page.locator('.pco-form-scale-wrap iframe.pco-form-embed').first().getAttribute('src') || '';
    r.header = await page.locator('header.jog-global-header').count();
    r.footer = await page.locator('footer.jog-footer').count();
  }

  await page.close();
}

console.log(JSON.stringify({ r, errors }, null, 2));

const ok =
  /jog-about-page/.test(r.bodyClass || '') &&
  r.breadcrumb === 1 &&
  (r.breadcrumbCurrent || '').trim() === 'Next Step' &&
  r.verse === 1 &&
  r.verseCite === 'Proverbs 3:5-6 (NLT)' &&
  r.kicker === 1 &&
  (r.h1 || '').trim() === 'What’s Your Next Step?' &&
  r.lead === 1 &&
  r.h2s.length === 2 &&
  r.beliefs === 4 &&
  r.beliefNoRte &&
  r.beliefLink === 'connect' &&
  r.hrFleuron >= 1 &&
  r.dropCapAmber &&
  r.rawSelfHostedForm === 1 &&
  r.rawFields >= 4 &&
  r.rawTextarea === 1 &&
  r.pcoSrc.includes('/forms/1286060') &&
  r.desktop_formVisible &&
  r.mobile_formVisible &&
  !r.desktop_hOverflow &&
  !r.mobile_hOverflow &&
  r.mobile_pcoWrapW <= 375 && r.mobile_pcoWrapW > 0 &&
  r.header === 1 && r.footer === 1 &&
  errors.length === 0;

console.log(ok ? 'NEXTSTEP OK' : 'NEXTSTEP FAIL');
await browser.close();
process.exit(ok ? 0 : 1);
