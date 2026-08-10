import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHANNEL = 'UCFd2ErAm4sACMG6C-XoxIlA';
const GRID_URL = `https://www.youtube.com/channel/${CHANNEL}/streams`;
const WATCH_URL = (id) => `https://www.youtube.com/watch?v=${id}`;

const UPCOMING_RE = /scheduled for|premieres|premiering|upcoming|live (now|in)|\bwaiting\b/i;
const RELATIVE_RE = /(\d+)\s*(minute|hour|day|week|month|year)s?\s+ago/i;
const AGE_MINUTES = { minute: 1, hour: 60, day: 1440, week: 10080, month: 43200, year: 525600 };

function relativeAgeMinutes(text) {
  const m = text.match(RELATIVE_RE);
  if (!m) return Infinity;
  return parseInt(m[1], 10) * (AGE_MINUTES[m[2].toLowerCase()] || Infinity);
}

function formatScheduled(text) {
  const m = text.match(/Scheduled for\s+(\d{1,2})\/(\d{1,2})\/(\d{2})/i);
  if (m) {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const mon = months[parseInt(m[1], 10) - 1];
    if (mon) return `Scheduled for ${mon} ${parseInt(m[2], 10)}, 20${m[3]}`;
  }
  return text.replace(/^Scheduled for\s+/i, 'Scheduled for ');
}

async function dismissConsent(page) {
  const selectors = [
    'button[aria-label="Accept all"]',
    'button[aria-label^="Accept the use of cookies"]',
    'tp-yt-paper-button:has-text("Accept all")',
    'button:has-text("Accept all")'
  ];
  for (const sel of selectors) {
    if (await page.locator(sel).count()) {
      try { await page.locator(sel).first().click({ timeout: 2000 }); } catch { /* noop */ }
    }
  }
  await page.waitForTimeout(500);
}

async function scrapeGridItems(page) {
  const collectItems = () => page.evaluate(() => {
    const items = [];
    const seen = new Set();
    for (const container of document.querySelectorAll('yt-lockup-view-model, ytd-rich-grid-media')) {
      const meta = container.querySelector('yt-lockup-metadata-view-model') || container;
      const titleA = meta.querySelector('a[href*="/watch?v="]');
      if (!titleA) continue;
      const m = (titleA.getAttribute('href') || '').match(/v=([\w-]{6,})/);
      if (!m || seen.has(m[1])) continue;
      seen.add(m[1]);
      const lines = [];
      for (const el of meta.querySelectorAll('span, a')) {
        const t = (el.innerText || '').trim();
        if (t && el.querySelectorAll('span, a').length === 0 && t !== '\u2022') lines.push(t);
      }
      items.push({
        id: m[1],
        title: (titleA.innerText || '').trim() || (titleA.getAttribute('title') || '').trim(),
        lines: [...new Set(lines)]
      });
      if (items.length >= 10) break;
    }
    return items;
  });
  const scrapePass = async () => {
    await page.goto(GRID_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await dismissConsent(page);
    for (let i = 0; i < 8; i++) {
      await page.evaluate(() => window.scrollBy(0, 2500));
      await page.waitForTimeout(900);
    }
    await page.waitForTimeout(1500);
    return collectItems();
  };
  const first = await scrapePass();
  if (first.length < 3) {
    console.log('Grid scrape returned few items (' + first.length + '); retrying once...');
    await page.goto('about:blank');
    await page.waitForTimeout(500);
    const second = await scrapePass();
    return second.length > first.length ? second : first;
  }
  return first;
}

async function fetchVideoMeta(page, id) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await page.goto(WATCH_URL(id), { waitUntil: 'domcontentloaded', timeout: 30000 });
      await dismissConsent(page);
      await page.waitForSelector('meta[property="og:title"]', { state: 'attached', timeout: 12000 });
      await page.waitForSelector('meta[itemprop="datePublished"]', { state: 'attached', timeout: 12000 });
      await page.waitForTimeout(800);
      return page.evaluate(() => ({
        title: (document.querySelector('meta[property="og:title"]')?.content || 'Journey of Grace Service').trim(),
        date: (document.querySelector('meta[itemprop="datePublished"]')?.content || '').trim(),
        info: Array.from(document.querySelectorAll('#info-container yt-formatted-string')).map(e => (e.innerText || '').trim()).join(' | ')
      }));
    } catch (err) {
      if (attempt === 1) console.error('  failed meta for ' + id + ':', err.message);
    }
  }
  return null;
}

async function fetchLatestSermons() {
  console.log('Fetching latest YouTube videos for Journey of Grace...');
  const browser = await chromium.launch({ headless: true });
  let videos = [];
  let upcoming = null;
  try {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1200, height: 900 });

    const items = await scrapeGridItems(page);
    console.log('Grid items (newest first):', items.map(i => i.id));

    const upcomingItem = items.find(it => UPCOMING_RE.test(it.lines.join(' ')));
    if (upcomingItem) {
      upcoming = {
        id: upcomingItem.id,
        title: upcomingItem.title,
        when: formatScheduled(upcomingItem.lines.join(' '))
      };
      console.log('Upcoming livestream detected:', upcoming);
    }
    const published = items
      .filter(it => !UPCOMING_RE.test(it.lines.join(' ')) && /views|ago/i.test(it.lines.join(' ')))
      .sort((a, b) => relativeAgeMinutes(a.lines.join(' ')) - relativeAgeMinutes(b.lines.join(' ')))
      .slice(0, 5)
      .map(({ id, title }) => ({ id, title }));
    console.log('Latest 5 videos (by publish date, newest first):', published);

    if (published.length === 0) {
      console.log('Grid yielded no published videos; falling back to per-video meta fetch...');
      const metas = [];
      for (const it of items) {
        const meta = await fetchVideoMeta(page, it.id);
        if (meta) metas.push({ id: it.id, ...meta });
      }
      const upEntries = metas.filter(m => m.info && UPCOMING_RE.test(m.info));
      if (upEntries.length) {
        const u = upEntries[0];
        const sched = (u.info.match(/Scheduled for\s+([A-Z][a-z]{2}\s+\d{1,2},?\s*\d{4})/i) || [])[1];
        upcoming = { id: u.id, title: u.title, when: sched ? 'Scheduled for ' + sched : 'Scheduled' };
        console.log('Upcoming livestream detected:', upcoming);
      }
      videos = metas
        .filter(m => m.date && !UPCOMING_RE.test(m.info || ''))
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
        .slice(0, 5)
        .map(({ id, title }) => ({ id, title }));
      console.log('Fallback latest 5 videos:', videos);
    } else {
      videos = published;
    }
  } catch (err) {
    console.error('Error scraping YouTube:', err);
  } finally {
    await browser.close();
  }

  if (!videos || videos.length === 0) {
    console.error('No published videos scraped (grid or meta fetch failed); keeping existing sermons.html content');
    process.exitCode = 1;
    return;
  }

  const cardsHtml = videos.map(v => `    <a href="https://www.youtube.com/watch?v=${v.id}" target="_blank" rel="noopener" class="sermon-yt-card">
      <div class="sermon-yt-thumb">
        <img src="https://img.youtube.com/vi/${v.id}/hqdefault.jpg" alt="${v.title}" />
        <div class="sermon-yt-play-btn">
          <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        </div>
      </div>
      <div class="sermon-yt-info">
        <h3 class="sermon-yt-title">${v.title}</h3>
        <div class="sermon-yt-meta">
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
          Watch Full Service on YouTube
        </div>
      </div>
    </a>`).join('\n');

  const upcomingHtml = upcoming ? `<!-- Upcoming Service Section -->
<div class="sermons-yt-section sermons-upcoming-section">
  <div class="sermons-yt-header">
    <h2>Upcoming Service</h2>
    <a href="https://www.youtube.com/watch?v=${upcoming.id}" target="_blank" rel="noopener">Set Reminder &rarr;</a>
  </div>
  <a href="https://www.youtube.com/watch?v=${upcoming.id}" target="_blank" rel="noopener" class="sermons-upcoming-card">
    <div class="sermon-yt-thumb">
      <span class="sermons-upcoming-badge">Upcoming</span>
      <img src="https://img.youtube.com/vi/${upcoming.id}/hqdefault.jpg" alt="${upcoming.title}" />
    </div>
    <div class="sermon-yt-info">
      <h3 class="sermon-yt-title">${upcoming.title}</h3>
      <p class="sermons-upcoming-when">${upcoming.when}</p>
      <div class="sermon-yt-meta">
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
        Watch the Service Live on YouTube
      </div>
    </div>
  </a>
</div>

` : '';

  const fullSectionHtml = `<!-- Recent YouTube Sermons Section -->
<div class="sermons-yt-section">
  <div class="sermons-yt-header">
    <h2>Recent Worship Services & Sermons</h2>
    <a href="https://www.youtube.com/channel/${CHANNEL}" target="_blank" rel="noopener">Visit Our YouTube Channel &rarr;</a>
  </div>
  <div class="sermons-yt-grid">
${cardsHtml}
  </div>
</div>`;

  const fullRegionHtml = upcomingHtml + fullSectionHtml;

  const sermonsFilePath = path.join(__dirname, '../sermons.html');
  let content = fs.readFileSync(sermonsFilePath, 'utf8');

  const upcomingMarker = '<!-- Upcoming Service Section -->';
  const marker = '<!-- Recent YouTube Sermons Section -->';
  const boundary = 'jog-block-horizontalrule';
  let start = content.indexOf(upcomingMarker);
  const recentStart = content.indexOf(marker);
  if (start < 0 || (recentStart >= 0 && recentStart < start)) start = recentStart;
  const end = start >= 0 ? content.indexOf(boundary, start) : -1;

  if (start >= 0 && end > start) {
    content = content.slice(0, start) + fullRegionHtml + '\n' + content.slice(end);
    fs.writeFileSync(sermonsFilePath, content, 'utf8');
    console.log('Successfully updated sermons.html with latest 5 videos (deduplicated, newest first)!');
  } else {
    console.error('Could not find Upcoming/Recent section marker or horizontal-rule boundary in sermons.html');
    process.exitCode = 1;
  }
}

fetchLatestSermons();
