import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const expectMap = {
  connect: { sections: 3, tiles: 6, imgs: 0, full: 0, cta: 1 },
  'journey-classes': { sections: 1, tiles: 0, imgs: 0, full: 0, cta: 1 },
  'kids-min': { sections: 3, tiles: 0, imgs: 5, full: 1, cta: 1 },
  'life-groups': { sections: 1, tiles: 0, imgs: 0, full: 0, cta: 1 },
  'mens-ministry': { sections: 3, tiles: 0, imgs: 6, full: 1, cta: 1 },
  'womens-ministry': { sections: 2, tiles: 0, imgs: 0, full: 0, cta: 1 },
  'service-teams': { sections: 1, tiles: 0, imgs: 0, full: 0, cta: 1 },
  'youth-group': { sections: 3, tiles: 0, imgs: 43, full: 1, cta: 1 },
};
let allOk = true;
for (const slug of Object.keys(expectMap)) {
  const ex = expectMap[slug];
  const errs = [];
  p.removeAllListeners('console'); p.removeAllListeners('pageerror');
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  await p.goto(`http://localhost:8126/${slug}.html`, { waitUntil: 'networkidle' });
  const r = await p.evaluate(() => ({
    title: document.title,
    breadcrumb: !!document.querySelector('.jog-breadcrumb-current'),
    verse: !!document.querySelector('.jog-verse .jog-verse-text'),
    sections: document.querySelectorAll('#mainContent section.jog-section, section.jog-ministry').length,
    tiles: document.querySelectorAll('.jog-ministry-tile').length,
    imgCount: document.querySelectorAll('.jog-photo-grid img').length,
    full: document.querySelectorAll('section.jog-section-full').length,
    cta: document.querySelectorAll('.jog-cta').length,
    header: !!document.querySelector('header.jog-global-header'),
    footer: !!document.querySelector('footer.jog-footer'),
  }));
  const bad = [];
  if (r.sections !== ex.sections) bad.push(`sections ${r.sections}!=${ex.sections}`);
  if (r.tiles !== ex.tiles) bad.push(`tiles ${r.tiles}!=${ex.tiles}`);
  if (r.imgCount !== ex.imgs) bad.push(`imgs ${r.imgCount}!=${ex.imgs}`);
  if (r.full !== ex.full) bad.push(`full ${r.full}!=${ex.full}`);
  if (r.cta !== ex.cta) bad.push(`cta ${r.cta}!=${ex.cta}`);
  if (!r.verse) bad.push('no verse');
  if (!r.breadcrumb) bad.push('no breadcrumb');
  if (!r.header || !r.footer) bad.push('header/footer');
  if (!r.title.includes('Journey of Grace')) bad.push(`title [${r.title}]`);
  if (errs.length) bad.push(`console: ${errs.join('; ')}`);
  if (bad.length) { allOk = false; console.log('FAIL', slug, bad.join(' | ')); }
  else console.log('OK   ', slug);
}
await b.close();
console.log(allOk ? 'ALL PAGES OK' : 'SOME PAGES FAILED');
