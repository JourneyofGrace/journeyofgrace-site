import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:8126/journeyofgrace-site/connect.html';
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
    bcCrumbs: q('.jog-breadcrumb .jog-breadcrumb-home')?.getAttribute('href'),
    hidden: q('.jog-breadcrumb')?null:true,
    h2s: [...document.querySelectorAll('h2.jog-ministry-heading')].map(e=>e.innerText),
    tiles: [...document.querySelectorAll('a.jog-ministry-tile')].map(e=>({t:e.innerText,h:e.href})),
    bannerImg: q('.page-banner-image-wrapper img')?.getAttribute('src'),
    bannerRect: rect(q('.page-banner-wrapper')),
    contentRect: rect(q('.main-content-inner-wrapper')),
    footerRect: rect(q('footer.jog-footer')),
    mainRect: rect(q('#mainContent')),
    noConnectBanner: !q('figure'),
    jogBlocks: document.querySelectorAll('.jog-block').length,
    spacerBlocks: document.querySelectorAll('.jog-block-spacer').length,
    indexNav: !!q('.index-nav'),
    overlay: !!q('.overlay-nav-wrapper'),
    svgSymbols: !!document.querySelector('svg[data-usage="social-icons-svg"]'),
    navLinks: [...document.querySelectorAll('.jog-global-nav a')].map(a=>a.innerText),
    bodyClassLen: document.body.className.length,
  };
});
await p.screenshot({ path: '/tmp/opencode/connect-new-top.png' });
console.log(JSON.stringify({ report, errors }, null, 2));
await b.close();
