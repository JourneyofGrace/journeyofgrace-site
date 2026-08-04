import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const pages = [
  'index.html', 'about-us.html', 'events.html', 'sermons.html',
  'connect.html', 'kids-min.html', 'youth-group.html', 'nextstep.html',
  'spanish.html', 'journey-classes.html', 'life-groups.html',
  'mens-ministry.html', 'womens-ministry.html', 'service-teams.html',
  'privacy.html'
];

const baselineDir = path.resolve('screenshots/baseline');
if (!fs.existsSync(baselineDir)) {
  fs.mkdirSync(baselineDir, { recursive: true });
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  for (const p of pages) {
    try {
      const page = await context.newPage();
      const fileUrl = `file://${path.resolve(p)}`;
      await page.goto(fileUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(1000);
      const name = p.replace('.html', '');
      await page.screenshot({ path: path.join(baselineDir, `${name}-desktop.png`), fullPage: false });
      console.log('Saved baseline:', name);
      await page.close();
    } catch (e) {
      console.error('Error snapshotting:', p, e.message);
    }
  }

  await browser.close();
  console.log('Baseline snapshotting complete!');
}

run();
