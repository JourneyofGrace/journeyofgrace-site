import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const ORIGINAL_URL = 'https://journeyofgrace.church';
const CLONE_URL = 'https://journeyofgrace.github.io/journeyofgrace-site';
const SCREENSHOT_DIR = '/home/jeremiah/Summers Drive/Code/journeyofgrace-site/screenshots';

const pages = [
  { path: '/', name: 'home' },
  { path: '/about-us', name: 'about-us' },
  { path: '/visit-1', name: 'visit' },
  { path: '/connect', name: 'connect' },
  { path: '/sermons', name: 'sermons' },
  { path: '/events', name: 'events' },
  { path: '/nextstep', name: 'nextstep' },
  { path: '/spanish', name: 'spanish' },
  { path: '/kids-min', name: 'kids-min' },
  { path: '/youth-group', name: 'youth-group' },
  { path: '/mens-ministry', name: 'mens-ministry' },
  { path: '/womens-ministry', name: 'womens-ministry' },
  { path: '/life-groups', name: 'life-groups' },
  { path: '/journey-classes', name: 'journey-classes' },
  { path: '/service-teams', name: 'service-teams' },
  { path: '/prximo-paso', name: 'prximo-paso' },
  { path: '/privacy', name: 'privacy' },
  { path: '/plan-your-visit', name: 'plan-your-visit' },
  { path: '/blog', name: 'blog' },
  { path: '/sermon-archive', name: 'sermon-archive' },
];

async function takeScreenshot(browser, url, name, label) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(3000);
    const screenshotPath = path.join(SCREENSHOT_DIR, `${label}-${name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`  OK: ${label}: ${name}`);
  } catch (e) {
    console.error(`  FAIL: ${label}: ${name} - ${e.message}`);
  }
  await page.close();
}

async function main() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  console.log('=== Taking screenshots of ORIGINAL site ===');
  for (const page of pages) {
    const url = ORIGINAL_URL + page.path;
    await takeScreenshot(browser, url, page.name, 'original');
  }

  console.log('\n=== Taking screenshots of CLONE site ===');
  for (const page of pages) {
    const url = CLONE_URL + page.path;
    await takeScreenshot(browser, url, page.name, 'clone');
  }

  await browser.close();
  console.log('\nDone!');
}

main().catch(console.error);
