import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:8126/about-us.html';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
p.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
await p.goto(url, { waitUntil: 'networkidle' });
await p.waitForTimeout(1200);
const report = await p.evaluate(() => {
  const q = s => document.querySelector(s);
  return {
    scrollH: document.documentElement.scrollHeight,
    title: document.title,
    bodyClass: document.body.className,
    hasHeader: !!document.querySelector('header.jog-global-header'),
    hasFooter: !!document.querySelector('footer.jog-footer'),
    kickers: [...document.querySelectorAll('.about-kicker')].map(e => e.innerText),
    h2s: [...document.querySelectorAll('.jog-html-content h2')].map(e => e.innerText),
    h1staff: q('.about-staff-heading, .jog-html-content h1')?.innerText,
    lead: q('.about-lead')?.innerText.slice(0, 80),
    paraCount: document.querySelectorAll('#mainContent .jog-html-content p').length,
    beliefsItems: [...document.querySelectorAll('.about-beliefs li')].map(e => e.innerText),
    believeLink: document.querySelector('a[href="https://www.nazarene.org/we-believe"]')?.getAttribute('target'),
    internalVisit: document.querySelector('a[href="visit"]')?.getAttribute('target'),
    staffCards: document.querySelectorAll('.about-staff-card').length,
    staffBios: document.querySelectorAll('.about-staff-bio').length,
    roles: [...document.querySelectorAll('.about-role')].map(e => e.innerText),
    names: [...document.querySelectorAll('.about-staff-name a')].map(e => ({ t: e.innerText, href: e.getAttribute('href') })),
    quotes: [...document.querySelectorAll('.about-quote')].map(e => e.innerText.slice(0, 90)),
    staffImgs: [...document.querySelectorAll('.about-staff-card img')].map(i => i.getAttribute('src')),
    imgLoaded: [...document.querySelectorAll('.about-staff-card img')].every(i => i.complete && i.naturalWidth > 0),
    hrBlocks: document.querySelectorAll('.horizontalrule-block hr').length,
    spacerBlocks: document.querySelectorAll('.jog-block-spacer').length,
    bannerTitle: q('.jog-page-title span')?.innerText,
    readCol: (() => { const el = q('.jog-col-8'); const r = el?.getBoundingClientRect(); return r ? { x: Math.round(r.x), w: Math.round(r.width) } : null; })(),
    breadcrumb: !!q('nav.jog-breadcrumb'),
    breadcrumbHome: q('nav.jog-breadcrumb a.jog-breadcrumb-home span')?.innerText,
    breadcrumbCurrent: q('nav.jog-breadcrumb span.jog-breadcrumb-current')?.innerText,
  };
});
await p.screenshot({ path: '/tmp/opencode/about-new-full.png', fullPage: true });
console.log(JSON.stringify({ report, errors }, null, 2));
await b.close();
