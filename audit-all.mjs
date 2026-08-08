import { chromium } from 'playwright';

const PAGES = [
  'index','about-us','connect','events','sermons','sermon-archive','journey-classes',
  'kids-min','life-groups','mens-ministry','womens-ministry','youth-group','service-teams',
  'nextstep','visit','plan-your-visit','spanish','privacy','404',
  'connection-card','event-facility-request'
];

const b = await chromium.launch();
const results = [];
for (const slug of PAGES) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const consoleErr = [];
  const pageErr = [];
  const badResponses = [];  // status >= 400 for any request
  p.on('console', m => { if (m.type() === 'error') consoleErr.push(m.text()); });
  p.on('pageerror', e => pageErr.push(e.message));
  p.on('response', r => {
    if (r.status() >= 400) badResponses.push(`${r.status()} ${r.url()}`);
  });

  let loadStatus;
  try {
    // index has an autoplay hero video (streams continuously) and intentionally no footer
    await p.goto(`http://localhost:8126/${slug}.html`, { waitUntil: slug === 'index' ? 'load' : 'networkidle', timeout: 25000 });
    loadStatus = 'ok';
  } catch (e) {
    loadStatus = 'ERR ' + e.message.split('\n')[0];
  }

  const data = await p.evaluate(() => {
    const q = s => document.querySelector(s);
    const qa = s => [...document.querySelectorAll(s)];
    const local = u => { try { const a = new URL(u, location.href); return a.origin === location.origin && a.pathname !== location.pathname; } catch { return false; } };
    const brokenImgs = qa('img').filter(i => i.getAttribute('src') && i.complete && i.naturalWidth === 0)
      .map(i => i.getAttribute('src'));
    const img404 = qa('img').filter(i => i.getAttribute('src') && i.complete && i.naturalWidth === 0)
      .map(i => i.getAttribute('src'));
    const mainEl = q('#mainContent') || q('main');
    const hOverflow = typeof document.documentElement.scrollWidth === 'number' &&
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
      ? `${document.documentElement.scrollWidth}/${document.documentElement.clientWidth}`
      : null;
    return {
      title: document.title,
      hasHeader: !!q('.jog-global-header'),
      hasFooter: !!q('.jog-footer'),
      hasContent: (mainEl?.textContent?.trim().length || 0) > 50,
      contentChars: mainEl?.textContent?.trim().length || 0,
      bodyTextStart: document.body.textContent.replace(/\\s+/g, ' ').slice(0, 60),
      emptyHeads: qa('h1,h2,h3').filter(h => !h.textContent.trim()).length,
      imgCount: qa('img').length,
      imgNotLoaded: img404,
      hOverflow,
      localLinks: qa('a[href]').map(a => a.getAttribute('href')).filter(local),
      localScripts: qa('script[src]').map(s => s.getAttribute('src')).filter(local),
      localCss: qa('link[rel="stylesheet"]').map(l => l.getAttribute('href')).filter(local),
      localMedia: qa('video source, source').map(s => s.getAttribute('src')).filter(Boolean).filter(local),
      mainTextStart: q('#mainContent')?.textContent?.slice(0, 80).replace(/\s+/g, ' '),
    };
  });

  results.push({ slug, loadStatus, consoleErr, pageErr, badResponses, data });
  await p.close();
}

// Resolve internal links (extensionless -> .html) and confirm each target exists
for (const r of results) {
  const brokenLinks = [];
  const seen = new Set();
  for (const href of r.data.localLinks || []) {
    const clean = href.split('#')[0].split('?')[0];
    if (!clean || clean === './' || clean === '/' || seen.has(clean)) continue;
    seen.add(clean);
    let path = clean;
    const hasExt = /\.[a-z0-9]{2,5}$/i.test(path);
    if (!hasExt) path = path.endsWith('/') ? path : path + '.html';
    try {
      const resp = await fetch('http://localhost:8126/' + path);
      if (!resp.ok) brokenLinks.push(`${resp.status} ${clean}`);
    } catch {
      brokenLinks.push(`ERR ${clean}`);
    }
  }
  r.brokenLinks = brokenLinks;
}

// Report
let problems = 0;
for (const r of results) {
  const flags = [];
  if (r.loadStatus !== 'ok') flags.push(r.loadStatus);
  if (r.pageErr.length) flags.push(`PAGEERR(${r.pageErr.length})`);
  if (r.consoleErr.length) flags.push(`CONSOLE(${r.consoleErr.length})`);
  if (r.badResponses.length) flags.push(`HTTP>=400(${r.badResponses.length})`);
  if (!r.data.hasHeader) flags.push('NO-HEADER');
  if (r.slug === 'index' && !r.data.hasFooter) flags.push('no-footer(expected)');
  if (r.slug !== 'index' && !r.data.hasFooter) flags.push('NO-FOOTER');
  if (!r.data.hasContent) flags.push('EMPTY-CONTENT');
  if (r.data.emptyHeads > 0) flags.push(`EMPTY-HEAD(${r.data.emptyHeads})`);
  if (r.data.imgNotLoaded.length) flags.push(`IMG-NOT-LOADED(${r.data.imgNotLoaded.length})`);
  if (r.data.hOverflow) flags.push('H-OVERFLOW');
  if ((r.brokenLinks || []).length) flags.push(`BROKEN-LINKS(${r.brokenLinks.length})`);
  const msg = flags.length ? '!!! ' + flags.join(' ') : 'ok';
  if (flags.length) problems++;
  console.log(`${r.slug.padEnd(18)} ${msg.padEnd(28)} imgs=${r.data.imgCount} chars=${r.data.contentChars}`);
  if (r.pageErr.length) console.log('    pageerr: ' + r.pageErr.join(' | '));
  if (r.consoleErr.length) console.log('    console: ' + r.consoleErr.slice(0,4).join(' | '));
  if (r.badResponses.length) console.log('    badResp: ' + r.badResponses.slice(0,6).join(' | '));
  if (r.data.imgNotLoaded.length) console.log('    imgs: ' + r.data.imgNotLoaded.join(', '));
  if (r.data.hOverflow) console.log('    hOverflow: ' + r.data.hOverflow);
  if ((r.brokenLinks || []).length) console.log('    brokenLinks: ' + r.brokenLinks.slice(0,8).join(', '));
}
console.log(`\n${problems} pages with problems / ${results.length} total`);
await b.close();
