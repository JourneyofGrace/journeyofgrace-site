import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:8126/journeyofgrace-site/connect.html', { waitUntil: 'networkidle' });
await p.waitForTimeout(800);
const info = await p.evaluate(() => {
  const v = document.querySelector('.jog-verse');
  const t = document.querySelector('.jog-verse-text');
  const r = document.querySelector('.jog-verse-ref a');
  const rc = v?.getBoundingClientRect();
  return {
    verseText: t?.innerText,
    refHref: r?.getAttribute('href'),
    refText: r?.innerText,
    rect: rc ? {x:Math.round(rc.x),y:Math.round(rc.y),w:Math.round(rc.width),h:Math.round(rc.height)} : null,
    verseCount: document.querySelectorAll('.jog-verse-text').length,
  };
});
await p.locator('.jog-verse').screenshot({ path: '/tmp/opencode/vl/connect-verse.png' });
console.log(JSON.stringify({ info, errs }, null, 2));
await b.close();
