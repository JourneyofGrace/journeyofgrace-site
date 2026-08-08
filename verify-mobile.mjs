import { chromium } from 'playwright';

const PAGES = ['index','about-us','connect','events','sermons','sermon-archive','journey-classes','kids-min','life-groups','mens-ministry','womens-ministry','youth-group','service-teams','nextstep','visit','plan-your-visit','spanish','privacy','404'];

const browser = await chromium.launch({ headless: true });
const results = {};
let allOk = true;

for (const slug of PAGES) {
  const url = `http://localhost:8126/${slug}.html`;
  const errors = [];
  const page = await browser.newPage({ viewport: { width: 375, height: 760 } });
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200)); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message.slice(0, 200)));

  try {
    await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(400);

    const base = await page.evaluate(() => {
      const out = { overflow: false, offenders: [], width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth };
      out.overflow = out.scrollWidth > out.width + 1;
      if (out.overflow) {
        for (const el of document.querySelectorAll('body *')) {
          if (el.children.length || el.tagName === 'svg') continue;
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          if (r.width > 0 && r.right > out.width + 2 && cs.position !== 'fixed') {
            const cls = (el.className && typeof el.className === 'string') ? '.' + el.className.split(/\s+/).slice(0, 2).join('.') : el.tagName;
            out.offenders.push({ el: el.tagName.toLowerCase() + cls, right: Math.round(r.right) });
            if (out.offenders.length >= 6) break;
          }
        }
      }
      out.header = !!document.querySelector('header.jog-global-header');
      out.toggle = !!document.querySelector('button.jog-mobile-toggle');
      out.footer = !!document.querySelector('footer.jog-footer');
      out.content = !!document.querySelector('#mainContent') || !!document.querySelector('main');
      out.banner = !!document.querySelector('.jog-page-banner') || !!document.querySelector('.jog-hero');
      return out;
    });

    let drawer = null;
    if (base.toggle) {
      await page.click('button.jog-mobile-toggle').catch(() => {});
      await page.waitForTimeout(250);
      drawer = await page.evaluate(() => {
        const d = document.querySelector('#mobileNavDrawer');
        if (!d) return null;
        const r = d.getBoundingClientRect();
        return { open: d.classList.contains('open'), right: Math.round(r.right), width: Math.round(r.width), visible: r.width > 0 };
      });
      await page.keyboard.press('Escape').catch(() => {});
      await page.evaluate(() => { const d = document.querySelector('#mobileNavDrawer'); if (d) d.classList.remove('open'); });
    }

    results[slug] = { base, drawer, errors };
    const noOverflow = !base.overflow;
    const hasContent = base.header && base.content && base.toggle;
    const footerOk = slug === 'index' ? true : base.footer;
    const drawerOk = drawer ? (drawer.open && drawer.right <= 375) : true;
    const errOk = errors.length === 0;
    const ok = noOverflow && hasContent && footerOk && drawerOk && errOk;
    if (!ok) allOk = false;
    console.log((ok ? 'OK  ' : 'FAIL') + ' ' + slug +
      (base.overflow ? ' [OVERFLOW ' + JSON.stringify(base.offenders) + ']' : '') +
      (!footerOk ? ' [NO-FOOTER]' : '') +
      (!drawerOk ? ' [DRAWER ' + JSON.stringify(drawer) + ']' : '') +
      (!errOk ? ' [ERR ' + errors.length + ']' : ''));
  } catch (e) {
    results[slug] = { fatal: String(e).slice(0, 300) };
    allOk = false;
    console.log('FAIL ' + slug + ' [FATAL ' + String(e).slice(0, 150) + ']');
  }
  await page.close();
}

console.log(allOk ? 'MOBILE ALL OK' : 'MOBILE HAS FAILURES');
await browser.close();
process.exit(allOk ? 0 : 1);
