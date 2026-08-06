import { chromium } from 'playwright';

const BASE = (process.argv[2] || 'http://localhost:8160/').replace(/\/$/, '/');
const PAGES = (process.argv[3] || 'index,about-us,connect,womens-ministry,journey-classes,events,sermons,spanish,youth-group').split(',');

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const failed = [];
p.on('response', r => {
  if (r.status() >= 400) failed.push(r.status() + ' ' + r.url());
});
const errors = [];
p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
p.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

for (const pg of PAGES) {
  failed.length = 0; errors.length = 0;
  const url = BASE + pg + '.html';
  const resp = await p.goto(url, { waitUntil: 'networkidle' });
  await p.waitForTimeout(400);
  const r = await p.evaluate(() => {
    const q = s => document.querySelector(s);
    const anchors = [...document.querySelectorAll('a[href]')]
      .filter(a => {
        try {
          const u = new URL(a.href, location.href);
          return u.origin === location.origin;
        } catch { return false; }
      })
      .map(a => new URL(a.href, location.href).pathname);
    const notFoundImgs = [...document.images].filter(i => !i.complete || i.naturalWidth === 0).map(i => i.getAttribute('src') || i.src);
    return {
      status: document.title ? 'ok' : 'none',
      breadcrumb: q('.jog-breadcrumb') ? q('.jog-breadcrumb').innerText.replace(/\n/g, ' ▸ ') : null,
      bcHome: q('.jog-breadcrumb .jog-breadcrumb-home')?.getAttribute('href'),
      bcParent: q('.jog-breadcrumb .jog-breadcrumb-parent')?.getAttribute('href'),
      internalLinks: anchors.length,
      activeNav: [...document.querySelectorAll('.jog-global-nav a.active')].map(a => a.textContent.trim()),
      badImgs: notFoundImgs.slice(0, 6),
      scrollH: document.documentElement.scrollHeight
    };
  });
  // Re-check / redirect chain status
  console.log('\n== ' + pg + ' ==  status', resp.status());
  console.log('  breadcrumb:', r.breadcrumb);
  console.log('  bcHome:', r.bcHome, '| bcParent:', r.bcParent);
  console.log('  internalLinks:', r.internalLinks, '| activeNav:', JSON.stringify(r.activeNav), '| scrollH:', r.scrollH);
  if (r.badImgs.length) console.log('  BAD IMGS:', JSON.stringify(r.badImgs));
  if (failed.length) console.log('  HTTP >=400:', JSON.stringify(failed.slice(0, 10)));
  if (errors.length) console.log('  CONSOLE ERRORS:', JSON.stringify(errors.slice(0, 6)));
}

await b.close();
