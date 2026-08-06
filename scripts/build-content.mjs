#!/usr/bin/env node
// Builds page content into HTML from Markdown sources.
//
// For each file in content/<page>.md whose matching <page>.html exists in the
// repo root, this renders the markdown and injects it between the markers
// `<!-- JOG-CONTENT-START -->` and `<!-- JOG-CONTENT-END -->` in that page.
// Header/footer are handled separately by scripts/layout.mjs.
//
// Markdown schema (everything else is ordinary CommonMark-ish text):
//   - A leading blockquote is the featured Scripture verse:
//       > verse text
//       > {cite} **Reference (VER)** https://www.blueletterbible.org/...
//     It renders as `<blockquote class="jog-verse">` with the open-book icon.
//   - `##` = `<section class="jog-section">` with `.jog-section-heading`.
//   - `###` inside a section opens a `.jog-service-card`; a section made only
//     of `###` groups wraps them in `.jog-service-grid` (2-column cards).
//   - `-` lists become `.jog-list`; paragraphs become `.jog-lead`.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CONTENT_DIR = path.join(ROOT, 'content');

const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

function inlineMd(s) {
  return s
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*(?![*])/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}

const VERSE_ICON =
  '      <svg class="jog-verse-icon" viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">\n' +
  '        <path d="M12 5.5C10.5 4.2 8.3 3.8 4 4.2v14.6c4.3-.4 6.5 0 8 1.2 1.5-1.2 3.7-1.6 8-1.2V4.2c-4.3-.4-6.5 0-8 1.3z"/>\n' +
  '        <path d="M12 5.5v14.5"/>\n' +
  '      </svg>\n';

function render(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  const state = { section: false, grid: false, card: false };
  const closeCard = () => {
    if (state.card) { out.push('        </div>'); state.card = false; }
  };
  const closeGrid = () => {
    if (state.grid) { out.push('        </div>'); state.grid = false; }
  };
  const closeSection = () => {
    closeCard();
    closeGrid();
    if (state.section) { out.push('      </section>'); state.section = false; }
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (/^>\s?/.test(line)) {
      const quote = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      const citeIdx = quote.findIndex((l) => l.startsWith('{cite}'));
      let text, citeText = null, citeUrl = null;
      if (citeIdx === -1) {
        text = quote.join(' ');
      } else {
        text = quote.slice(0, citeIdx).join(' ');
        const citeLine = quote[citeIdx].replace(/^\{cite\}\s*/, '');
        const urlMatch = citeLine.match(/(https?:\/\/[^\s]+)\s*$/);
        citeUrl = urlMatch ? urlMatch[1] : null;
        citeText = citeLine.replace(urlMatch ? urlMatch[1] : '', '').trim();
      }
      // The featured verse is only expected as the first block of the file.
      const cite = citeText && citeUrl
        ? `<cite class="jog-verse-ref"><a href="${citeUrl}" target="_blank" rel="noopener">${inlineMd(escapeHtml(citeText))}</a></cite>`
        : '';
      out.push('      <blockquote class="jog-verse">');
      out.push(VERSE_ICON.trimEnd());
      out.push(`        <p class="jog-verse-text">${inlineMd(escapeHtml(text))}</p>`);
      out.push(`        ${cite}`);
      out.push('      </blockquote>');
      continue;
    }

    if (/^##\s/.test(line)) {
      closeSection();
      out.push('      <section class="jog-section">');
      out.push(`        <h2 class="jog-section-heading">${inlineMd(escapeHtml(line.replace(/^##\s/, '')))}</h2>`);
      state.section = true;
      i++;
      continue;
    }

    if (/^###\s/.test(line)) {
      if (!state.section) {
        // An h3 outside a section is not expected; treat as its own section card.
        out.push('      <section class="jog-section">');
        state.section = true;
      }
      if (!state.grid) { out.push('        <div class="jog-service-grid">'); state.grid = true; }
      closeCard();
      out.push('          <div class="jog-service-card">');
      out.push(`            <h3 class="jog-service-heading">${inlineMd(escapeHtml(line.replace(/^###\s/, '')))}</h3>`);
      state.card = true;
      i++;
      continue;
    }

    if (/^-\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^-\s/.test(lines[i])) {
        items.push(escapeHtml(lines[i].replace(/^-\s/, '')));
        i++;
      }
      const lis = items.map((it) => `            <li>${inlineMd(it)}</li>`).join('\n');
      out.push('        <ul class="jog-list">');
      out.push(lis);
      out.push('        </ul>');
      continue;
    }

    if (line.trim() === '') {
      i++;
      continue;
    }

    out.push(`        <p class="jog-lead">${inlineMd(escapeHtml(line.trim()))}</p>`);
    i++;
  }
  closeSection();

  return out.join('\n');
}

const pages = fs.existsSync(CONTENT_DIR)
  ? fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.md'))
  : [];

let any = false;
for (const f of pages) {
  const page = f.replace(/\.md$/, '.html');
  const htmlPath = path.join(ROOT, page);
  if (!fs.existsSync(htmlPath)) {
    console.error(`  WARN content/${f}: no ${page} in repo root`);
    continue;
  }
  const md = fs.readFileSync(path.join(CONTENT_DIR, f), 'utf8');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const start = '<!-- JOG-CONTENT-START -->';
  const end = '<!-- JOG-CONTENT-END -->';
  const si = html.indexOf(start);
  const ei = html.indexOf(end);
  if (si === -1 || ei === -1 || ei < si) {
    console.error(`  WARN content/${f}: ${page} missing JOG-CONTENT markers (start=${si}, end=${ei})`);
    continue;
  }
  const before = html.slice(0, si + start.length);
  const after = html.slice(ei);
  const rendered = render(md);
  const next = `${before}\n${rendered}\n${after}`;
  any = true;
  const label = next === html ? 'same' : 'ok  ';
  fs.writeFileSync(htmlPath, next);
  console.log(`  ${label} ${page}`);
}

if (!any) {
  console.log('content: no markdown sources, nothing to do');
  process.exit(0);
}
