import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fetchLatestSermons() {
  console.log('Fetching latest 5 YouTube videos for Journey of Grace...');
  let videos = [];
  try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('https://www.youtube.com/channel/UCFd2ErAm4sACMG6C-XoxIlA/streams', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    videos = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[href*="/watch?v="]'));
      const map = new Map();
      anchors.forEach(a => {
        const text = (a.innerText || a.textContent || '').trim();
        const aria = a.getAttribute('aria-label') || '';
        // Skip timestamp badges like "1:23:52"
        if (text && !text.match(/^\d+:\d+(:\d+)?$/)) {
          const id = a.href.split('v=')[1]?.split('&')[0];
          if (id && !map.has(id)) {
            // Use the title portion of aria-label or innerText
            let title = text;
            if (aria) {
              // Strip trailing durations like "1 hour, 23 minutes"
              const match = aria.match(/^(.*?)(?:\s+\d+\s+(?:hour|hours|minute|minutes).*)/i);
              if (match && match[1]) {
                title = match[1].trim();
              } else if (!title || title.match(/^\d+:\d+/)) {
                title = aria;
              }
            }
            map.set(id, { id, title: title || 'Journey of Grace Service', url: 'https://www.youtube.com/watch?v=' + id });
          }
        }
      });
      return Array.from(map.values()).slice(0, 5);
    });

    await browser.close();
  } catch (err) {
    console.error('Error scraping YouTube streams:', err);
  }

  if (!videos || videos.length === 0) {
    console.log('Using default fallback video list');
    videos = [
      { id: 'D5fdts_gfxw', title: 'Journey of Grace Worship Service' },
      { id: '-KIJF2xTR_s', title: 'Worship & Teaching Service' },
      { id: 'ZqMOCezDYMo', title: 'Sunday Worship Service' },
      { id: 'OQKTo7kXM0U', title: 'Sunday Worship & Prayer Service' },
      { id: 'AYfnKLhX8wU', title: 'Sunday Morning Message' }
    ];
  }

  console.log('Latest 5 videos found:', videos);

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

  const fullSectionHtml = `<!-- Recent YouTube Sermons Section -->
<div class="sermons-yt-section">
  <div class="sermons-yt-header">
    <h2>Recent YouTube Services & Sermons</h2>
    <a href="https://www.youtube.com/channel/UCFd2ErAm4sACMG6C-XoxIlA" target="_blank" rel="noopener">Visit Our YouTube Channel &rarr;</a>
  </div>
  <div class="sermons-yt-grid">
${cardsHtml}
  </div>
</div>`;

  const sermonsFilePath = path.join(__dirname, '../sermons.html');
  let content = fs.readFileSync(sermonsFilePath, 'utf8');

  const regex = /<!-- Recent YouTube Sermons Section -->[\s\S]*?<\/div>\s*<\/div>/;
  if (regex.test(content)) {
    content = content.replace(regex, fullSectionHtml);
    fs.writeFileSync(sermonsFilePath, content, 'utf8');
    console.log('Successfully updated sermons.html with latest 5 videos!');
  } else {
    console.error('Could not find Recent YouTube Sermons Section marker in sermons.html');
  }
}

fetchLatestSermons();
