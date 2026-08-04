import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const pages = [
  'index.html', 'about-us.html', 'events.html', 'sermons.html',
  'connect.html', 'kids-min.html', 'youth-group.html', 'nextstep.html',
  'spanish.html', 'journey-classes.html', 'life-groups.html',
  'mens-ministry.html', 'womens-ministry.html', 'service-teams.html',
  'privacy.html', 'visit.html'
];

const auditDir = path.resolve('screenshots/audit/site-check');
if (!fs.existsSync(auditDir)) {
  fs.mkdirSync(auditDir, { recursive: true });
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
      await page.screenshot({ path: path.join(auditDir, `${name}-verified.png`), fullPage: false });
      console.log('Verified screenshot saved:', name);
      await page.close();
    } catch (e) {
      console.error('Error snapshotting:', p, e.message);
    }
  }

  await browser.close();
  console.log('Site-wide audit snapshotting complete!');
}

run();
