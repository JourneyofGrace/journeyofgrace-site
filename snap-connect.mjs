import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 2000 } });
await p.goto('http://localhost:8126/journeyofgrace-site/connect.html', { waitUntil: 'networkidle' });
await p.waitForTimeout(800);
await p.evaluate(() => { document.querySelectorAll('*').forEach(e => e.getAnimations()?.forEach(a => a.cancel())); });
await p.screenshot({ path: '/tmp/opencode/vl/connect-new-full.png', fullPage: true });
console.log('saved, scrollH:', await p.evaluate(() => document.documentElement.scrollHeight));
await b.close();
