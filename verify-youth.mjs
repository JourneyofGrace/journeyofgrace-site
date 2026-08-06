import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:8126/journeyofgrace-site/youth-group.html';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
p.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
await p.goto(url, { waitUntil: 'networkidle' });
await p.waitForTimeout(1200);
const report = await p.evaluate(() => {
  const q = s => document.querySelector(s);
  const rect = el => { const r = el?.getBoundingClientRect(); return r ? {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)} : null; };
  return {
    scrollH: document.documentElement.scrollHeight,
    breadcrumb: q('.jog-breadcrumb')?.innerText,
    bcHome: q('.jog-breadcrumb .jog-breadcrumb-home')?.getAttribute('href'),
    verseText: q('.jog-verse-text')?.innerText,
    verseHref: q('.jog-verse-ref a')?.getAttribute('href'),
    sections: [...document.querySelectorAll('h2.jog-section-heading')].map(e=>e.innerText),
    lead: document.querySelector('p.jog-lead')?.innerText.slice(0,80),
    listItems: [...document.querySelectorAll('.jog-list li')].map(e=>e.innerText),
    cta: q('.jog-cta')?.innerText,
    ctaHref: q('.jog-cta')?.getAttribute('href'),
    galleryImgs: document.querySelectorAll('.jog-photo-grid img').length,
    bannerImg: q('.page-banner-image-wrapper img')?.getAttribute('src'),
    bannerRect: rect(q('.page-banner-wrapper')),
    footerRect: rect(q('footer.jog-footer')),
    jogBlocks: document.querySelectorAll('.jog-block').length,
    overlay: !!q('.overlay-nav-wrapper'),
    indexNav: !!q('.index-nav'),
    svgSymbols: !!document.querySelector('svg[data-usage="social-icons-svg"]'),
    navLinks: [...document.querySelectorAll('.jog-global-nav a')].map(a=>a.innerText),
    gcImgsAll: [...document.querySelectorAll('.jog-photo-grid img')].slice(0,3).map(i=>i.getAttribute('src')),
  };
});
await p.screenshot({ path: '/tmp/opencode/youth-new-full.png', fullPage: true });
console.log(JSON.stringify({ report, errors }, null, 2));
await b.close();
