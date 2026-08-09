#!/usr/bin/env node
// Builds page content into HTML from Markdown sources.
//
// For each file in content/<page>.md whose matching <page>.html exists in the
// repo root, this renders the markdown and injects it between the markers
// `<!-- JOG-CONTENT-START -->` and `<!-- JOG-CONTENT-END -->` in that page.
// If the matching <page>.html does not exist, the page is created on the fly
// from scripts/templates/page.html (so a new markdown file automatically
// produces a new page).  Header/footer are handled separately by
// scripts/layout.mjs via the `<!-- JOG-HEADER -->` / `<!-- JOG-FOOTER -->`
// markers in the template.
//
// Standard markdown schema (everything else is ordinary CommonMark-ish text):
//   - A leading blockquote is the featured Scripture verse:
//       > verse text
//       > {cite} **Reference (VER)** https://www.blueletterbible.org/...
//     It renders as `<blockquote class="jog-verse">` with the open-book icon.
//   - `##` = `<section class="jog-section">` with `.jog-section-heading`.
//     Prefix with `::full` to add the `.jog-section-full` modifier.
//   - `###` inside a section opens a `.jog-service-card`; a section made only
//     of `###` groups wraps them in `.jog-service-grid` (2-column cards).
//   - `-` lists become `.jog-list`; `![alt](src)` image lines become a
//     `.jog-photo-grid` (consecutive images are grouped); paragraphs become
//     `.jog-lead`.
//   - `::gallery <dir>` renders every image file found in `<dir>` (sorted by
//     name) as a `.jog-photo-grid`, so dropping files into that folder updates
//     the page. A missing/empty folder produces no gallery at all (handy for a
//     page whose gallery is "disabled" until images are added).
//   - `::cta <href> <label>` emits a centered `.jog-actions` / `.jog-cta`
//     button (e.g. `::cta connect Get Connected`).
//   - `::ministry <heading>` followed by a `- [name](href)` list emits a
//     ministry section of `.jog-ministry-tile` links (Connect page).
//   - `::verse-rotation` followed by two or more `>` Scripture blockquotes
//     (blank-line separated, each with an optional `{cite}` line) renders ONE
//     of them, rotating per build day so every new site generation features a
//     different verse (used by the 404 "lost and found" page). Works in both
//     the standard and editorial renderers.
//
// Editorial schema (first line: `<!-- mode: editorial -->`, used by About Us):
//   - `::kicker <text>` places a small uppercase eyebrow before the next
//     `##` / `#` heading.
//   - `#`/`##` headings open an editorial block; `---` inserts an ornamental
//     horizontal-rule block.
//   - `::lead <text>` = drop-cap lead paragraph; `::quote <text>` +
//     `::attrib <name>` = pull quote; `::beliefs` + `-` items = ruled creed.
//   - `::address` + following lines until a blank line = postal address
//     paragraph (lines joined with `<br>`).
//   - `::staff` blocks carry front-matter fields then bio paragraphs:
//       ::staff
//       img: assets/img/vendor/<file>.jpg
//       role: Lead Pastor
//       name: Kurtis Strunk
//       email: kurtis@journeyofgrace.church
//       quote: “…”
//       attrib: — Kurtis
//
//       Bio paragraph one.
//       Bio paragraph two.
//       ::staff
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CONTENT_DIR = path.join(ROOT, 'content');
const TEMPLATE_PATH = path.join(ROOT, 'scripts', 'templates', 'page.html');

const DEFAULT_BANNER =
  'assets/img/vendor/1575586881910-22IJ3FLVGLBY4LN5P0A4-DSCF0854.jpg';

const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

function inlineMd(s) {
  const link = (m, label, href) => {
    const external = /^https?:/i.test(href);
    const mailto = /^mailto:/i.test(href);
    return external
      ? `<a href="${href}" target="_blank" rel="noopener">${label}</a>`
      : mailto
        ? `<a href="${href}" target="_blank" rel="noopener">${label}</a>`
        : `<a href="${href}">${label}</a>`;
  };
  return s
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*(?![*])/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, link);
}

const VERSE_ICON =
  '      <svg class="jog-verse-icon" viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">\n' +
  '        <path d="M12 5.5C10.5 4.2 8.3 3.8 4 4.2v14.6c4.3-.4 6.5 0 8 1.2 1.5-1.2 3.7-1.6 8-1.2V4.2c-4.3-.4-6.5 0-8 1.3z"/>\n' +
  '        <path d="M12 5.5v14.5"/>\n' +
  '      </svg>\n';

const ARROW_ICON =
  '<svg class="jog-ministry-tile-arrow" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>';

// ---------------------------------------------------------------------------
// `::verse-rotation` (shared by both renderers)
// ---------------------------------------------------------------------------
// Lists Scripture blockquotes (blank-line separated) after the directive; each
// build day rotates to the next verse, so every new site generation swaps in a
// fresh featured verse. Used by the 404 page ("lost and found" theme).

const rotationVerseHtml = (block) => {
  const citeIdx = block.findIndex((l) => l.startsWith('{cite}'));
  let text, citeText = null, citeUrl = null;
  if (citeIdx === -1) {
    text = block.join(' ');
  } else {
    text = block.slice(0, citeIdx).join(' ');
    const citeLine = block[citeIdx].replace(/^\{cite\}\s*/, '');
    const urlMatch = citeLine.match(/(https?:\/\/[^\s]+)\s*$/);
    citeUrl = urlMatch ? urlMatch[1] : null;
    citeText = citeLine.replace(urlMatch ? urlMatch[1] : '', '').trim();
  }
  const cite = citeText && citeUrl
    ? `<cite class="jog-verse-ref"><a href="${citeUrl}" target="_blank" rel="noopener">${inlineMd(escapeHtml(citeText))}</a></cite>`
    : '';
  return [
    '      <blockquote class="jog-verse">',
    VERSE_ICON.trimEnd(),
    `        <p class="jog-verse-text">${inlineMd(escapeHtml(text))}</p>`,
    `        ${cite}`,
    '      </blockquote>',
  ].join('\n');
};

// Collects every consecutive `> ` block after the directive line (separated by
// blank lines). Returns { html, count, nextIndex }.
const rotationVerses = (lines, i) => {
  i++;
  const blocks = [];
  let cur = [];
  while (i < lines.length) {
    const t = lines[i].trim();
    if (t === '') {
      if (cur.length) { blocks.push(cur); cur = []; }
      i++;
      continue;
    }
    if (/^>\s?/.test(t)) {
      cur.push(t.replace(/^>\s?/, ''));
      i++;
      continue;
    }
    break;
  }
  if (cur.length) blocks.push(cur);
  const picked = blocks.length
    ? blocks[Math.floor(Date.now() / 86400000) % blocks.length]
    : null;
  return { html: picked ? rotationVerseHtml(picked) : '', count: blocks.length, nextIndex: i };
};

// ---------------------------------------------------------------------------
// Standard (jog-) renderer
// ---------------------------------------------------------------------------
function renderStandard(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  const state = { section: false, grid: false, card: false, fullNext: false };
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

  // Emits a `.jog-photo-grid` for the given [{alt, src}] list. When the list is
  // empty the grid is omitted entirely (a gallery is "disabled" until the page's
  // image folder has files in it). Honors the pending `::full` modifier.
  const emitPhotoGrid = (imgs, note) => {
    const full = state.fullNext;
    state.fullNext = false;
    if (!imgs.length) {
      if (note) console.log(`  note: ${note}`);
      return;
    }
    if (!state.section) {
      out.push(`      <section class="jog-section${full ? ' jog-section-full' : ''}">`);
      state.section = true;
    }
    out.push('        <div class="jog-photo-grid">');
    for (const img of imgs) {
      out.push(`          <img src="${img.src}" alt="${escapeHtml(img.alt)}" loading="lazy" />`);
    }
    out.push('        </div>');
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '::verse-rotation') {
      const rot = rotationVerses(lines, i);
      i = rot.nextIndex;
      if (rot.html) {
        out.push(rot.html);
        console.log(`  note: verse rotation - 1 of ${rot.count} verses`);
      }
      continue;
    }

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
      const full = state.fullNext ? ' jog-section-full' : '';
      state.fullNext = false;
      out.push(`      <section class="jog-section${full}">`);
      out.push(`        <h2 class="jog-section-heading">${inlineMd(escapeHtml(line.replace(/^##\s/, '')))}</h2>`);
      state.section = true;
      i++;
      continue;
    }

    if (/^###\s/.test(line)) {
      if (!state.section) {
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

    if (/^!(?:\[([^\]]*)\]\(([^)\s]+)\))/.test(line)) {
      // Consecutive image lines -> photo grid (inside the open section).
      const imgs = [];
      while (i < lines.length && /^!\[[^\]]*\]\([^)\s]+\)/.test(lines[i])) {
        const m = lines[i].match(/^!\[([^\]]*)\]\(([^)\s]+)\)/);
        imgs.push({
          alt: m[1] || '',
          src: m[2],
        });
        i++;
      }
      emitPhotoGrid(imgs);
      continue;
    }

    if (/^::gallery\s+/.test(line)) {
      // `::gallery <dir>` renders every image file found in <dir> (sorted by
      // name) as a `.jog-photo-grid`, so adding/removing files in that folder
      // updates the page. Missing or empty folder -> gallery omitted entirely.
      const dir = line.replace(/^::gallery\s+/, '').trim().replace(/\/+$/, '');
      const target = path.resolve(ROOT, dir);
      let files = [];
      let missing = false;
      try {
        files = fs
          .readdirSync(target)
          .filter((f) => !f.startsWith('.'))
          .filter((f) => /\.(jpe?g|png|webp|gif)$/i.test(f))
          .sort();
      } catch (err) {
        missing = true;
      }
      const imgs = files.map((f) => ({ alt: f.replace(/\.([^.]+)$/, ''), src: `${dir}/${f}` }));
      emitPhotoGrid(imgs, missing
        ? `gallery folder not found (${dir}), leaving gallery off`
        : `gallery folder ${dir} is empty, leaving gallery off`);
      i++;
      continue;
    }

    if (/^::full\s*$/.test(line)) {
      state.fullNext = true;
      i++;
      continue;
    }

    if (/^::cta\s/.test(line)) {
      const rest = line.replace(/^::cta\s+/, '');
      // Optional `[attr]` / `[attr="value"]` tokens become attributes on the <a>.
      const attrs = [];
      const clean = rest.replace(/\[([^\]]+)\]/g, (_, g) => {
        attrs.push(g.split('"').join('&quot;'));
        return '';
      });
      const sp = clean.indexOf(' ');
      const href = sp === -1 ? clean : clean.slice(0, sp);
      const label = sp === -1 ? clean : clean.slice(sp + 1).trim();
      closeSection();
      out.push('      <div class="jog-actions">');
      out.push(`        <a class="jog-cta" href="${href}"${attrs.length ? ' ' + attrs.join(' ') : ''}>${inlineMd(escapeHtml(label))}</a>`);
      out.push('      </div>');
      i++;
      continue;
    }

    if (/^::ministry\s/.test(line)) {
      closeSection();
      const heading = line.replace(/^::ministry\s+/, '');
      out.push('      <section class="jog-ministry">');
      out.push(`        <h2 class="jog-ministry-heading">${inlineMd(escapeHtml(heading))}</h2>`);
      out.push('        <div class="jog-ministry-grid">');
      i++;
      while (i < lines.length && /^-\s/.test(lines[i])) {
        const item = lines[i].replace(/^-\s/, '');
        const m = item.match(/^\[([^\]]+)\]\(([^)\s]+)\)/);
        if (m) {
          out.push(`          <a class="jog-ministry-tile" href="${m[2]}">`);
          out.push(`            <span class="jog-ministry-tile-name">${inlineMd(escapeHtml(m[1]))}</span>`);
          out.push(`            ${ARROW_ICON}`);
          out.push('          </a>');
        }
        i++;
      }
      out.push('        </div>');
      out.push('      </section>');
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

// ---------------------------------------------------------------------------
// Editorial renderer (about-us)
// ---------------------------------------------------------------------------
function renderEditorial(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out = [];

  const htmlBlockClose = () => {
    out.push('          </div>');
    out.push('        </div>');
    out.push('      </div>');
  };
  const hrBlock = () => {
    out.push(
      '      <div class="jog-block website-component-block jog-block-website-component jog-block-horizontalrule horizontalrule-block">\n' +
        '        <div class="jog-block-content">\n' +
        '          <div>\n' +
        '            <hr />\n' +
        '          </div>\n' +
        '        </div>\n' +
        '      </div>'
    );
  };
  const spacerBlock = () => {
    out.push(
      '      <div class="jog-block website-component-block jog-block-website-component jog-block-spacer spacer-block sized vsize-1">\n' +
        '        <div class="jog-block-content">&nbsp;</div>\n' +
        '      </div>'
    );
  };
  const staffImageBlock = (src) => {
    out.push(
      '      <div class="jog-block image-block jog-block-image about-staff-card">\n' +
        '        <div class="jog-block-content">\n' +
        '          <div class="image-block-outer-wrapper layout-caption-below design-layout-inline combination-animation-none individual-animation-none individual-text-animation-none" data-test="image-block-inline-outer-wrapper">\n' +
        '            <figure class="jog-block-image-figure intrinsic">\n' +
        '              <div class="image-block-wrapper" data-animation-role="image">\n' +
        `                <div class="jog-image-shape-container-element has-aspect-ratio">\n` +
        `                  <img alt="" src="${src}" width="1000" height="1000" loading="lazy" decoding="async" style="display:block;object-fit: cover; width: 100%; height: 100%; object-position: 50% 50%" />\n` +
        '                </div>\n' +
        '              </div>\n' +
        '            </figure>\n' +
        '          </div>\n' +
        '        </div>\n' +
        '      </div>'
    );
  };
  const staffBioBlock = (st) => {
    out.push('      <div class="jog-block html-block jog-block-html about-staff-bio">');
    out.push('        <div class="jog-block-content">');
    out.push('          <div class="jog-html-content">');
    out.push(`            <p class="about-role">${inlineMd(escapeHtml(st.role))}</p>`);
    const nameHtml = st.email
      ? `<a href="mailto:${st.email}">${inlineMd(escapeHtml(st.name))}</a>`
      : inlineMd(escapeHtml(st.name));
    out.push(`            <h2 class="about-staff-name">${nameHtml}</h2>`);
    if (st.quote) {
      const attr = st.attrib
        ? `<span class="about-quote-attrib">${inlineMd(escapeHtml(st.attrib))}</span>`
        : '';
      out.push(`            <p class="about-quote">${inlineMd(escapeHtml(st.quote))} ${attr}</p>`);
    }
    out.push('            <div class="jog-block website-component-block jog-block-website-component jog-block-horizontalrule horizontalrule-block">');
    out.push('              <div class="jog-block-content">');
    out.push('                <div><hr /></div>');
    out.push('              </div>');
    out.push('            </div>');
    for (const b of st.bios) out.push(`            <p>${inlineMd(escapeHtml(b))}</p>`);
    out.push('          </div>');
    out.push('        </div>');
    out.push('      </div>');
  };

  let sectionOpen = false;
  const closeSection = () => {
    if (sectionOpen) {
      htmlBlockClose();
      sectionOpen = false;
    }
  };

  spacerBlock();

  let pendingKicker = null;
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();

    if (line === '') { i++; continue; }

    if (line === '::verse-rotation') {
      closeSection();
      const rot = rotationVerses(lines, i);
      i = rot.nextIndex;
      if (rot.html) {
        out.push(rot.html);
        console.log(`  note: verse rotation - 1 of ${rot.count} verses`);
      }
      continue;
    }

    if (line === '::staff') {
      closeSection();
      i++;
      const st = { img: '', role: '', name: '', email: '', quote: '', attrib: '', bios: [] };
      const fieldRe = /^([a-z-]+):\s*(.*)$/;
      while (i < lines.length && lines[i].trim() !== '') {
        const t = lines[i].trim();
        const m = t.match(fieldRe);
        if (m) st[m[1]] = m[2].trim();
        else st.bios.push(t);
        i++;
      }
      while (i < lines.length && lines[i].trim() === '') i++;
      while (i < lines.length && lines[i].trim() !== '::staff') {
        const t = lines[i].trim();
        if (t !== '') st.bios.push(t);
        i++;
      }
      if (i < lines.length && lines[i].trim() === '::staff') i++;
      spacerBlock();
      staffImageBlock(st.img);
      staffBioBlock(st);
      continue;
    }

    if (line.startsWith('::kicker ')) {
      pendingKicker = line.slice('::kicker '.length).trim();
      i++;
      continue;
    }

    if (/^#+\s/.test(line)) {
      const hashes = line.match(/^(#+)/)[1].length;
      const text = line.replace(/^#+\s/, '');
      closeSection();
      out.push('      <div class="jog-block html-block jog-block-html">');
      out.push('        <div class="jog-block-content">');
      out.push('          <div class="jog-html-content">');
      if (pendingKicker) {
        out.push(`            <p class="about-kicker">${inlineMd(escapeHtml(pendingKicker))}</p>`);
        pendingKicker = null;
      }
      const tag = hashes === 1 ? 'h1' : 'h2';
      out.push(`            <${tag}>${inlineMd(escapeHtml(text))}</${tag}>`);
      sectionOpen = true;
      i++;
      continue;
    }

    if (/^-{3,}$/.test(line)) {
      closeSection();
      hrBlock();
      i++;
      continue;
    }

    if (line.startsWith('::quote ')) {
      if (!sectionOpen) {
        out.push('      <div class="jog-block html-block jog-block-html">');
        out.push('        <div class="jog-block-content">');
        out.push('          <div class="jog-html-content">');
        sectionOpen = true;
      }
      const text = line.slice('::quote '.length).trim();
      let attr = '';
      const j = i + 1;
      if (j < lines.length && lines[j].trim().startsWith('::attrib ')) {
        attr = lines[j].trim().slice('::attrib '.length).trim();
        i = j;
      }
      const attrHtml = attr
        ? `<span class="about-quote-attrib">${inlineMd(escapeHtml(attr))}</span>`
        : '';
      out.push(`            <p class="about-quote">${inlineMd(escapeHtml(text))} ${attrHtml}</p>`);
      i++;
      continue;
    }
    if (line.startsWith('::attrib ')) { i++; continue; }

    if (line.startsWith('::lead ')) {
      if (!sectionOpen) {
        out.push('      <div class="jog-block html-block jog-block-html">');
        out.push('        <div class="jog-block-content">');
        out.push('          <div class="jog-html-content">');
        sectionOpen = true;
      }
      out.push(`            <p class="about-lead">${inlineMd(escapeHtml(line.slice('::lead '.length).trim()))}</p>`);
      i++;
      continue;
    }

    if (line === '::beliefs') {
      if (!sectionOpen) {
        out.push('      <div class="jog-block html-block jog-block-html">');
        out.push('        <div class="jog-block-content">');
        out.push('          <div class="jog-html-content">');
        sectionOpen = true;
      }
      i++;
      const items = [];
      while (i < lines.length && /^-\s/.test(lines[i])) {
        items.push(lines[i].replace(/^-\s/, '').trim());
        i++;
      }
      const lis = items.map((it) => {
        const m = it.match(/^\*\*(.+?)\*\*\s*(.*)$/);
        if (m) {
          const title = escapeHtml(m[1].trim().replace(/\.$/, ''));
          const bodyText = inlineMd(escapeHtml(m[2].trim())).replace(/^We\b/, '<span class="about-belief-we">We</span>');
          const body = m[2].trim() ? `\n                <p>${bodyText}</p>` : '';
          return `              <li>\n                <h3 class="about-belief-title">${title}</h3>${body}\n              </li>`;
        }
        return `              <li><p>${inlineMd(escapeHtml(it))}</p></li>`;
      }).join('\n');
      out.push('            <ul class="about-beliefs">');
      out.push(lis);
      out.push('            </ul>');
      continue;
    }

    if (line === '::address') {
      if (!sectionOpen) {
        out.push('      <div class="jog-block html-block jog-block-html">');
        out.push('        <div class="jog-block-content">');
        out.push('          <div class="jog-html-content">');
        sectionOpen = true;
      }
      i++;
      const addressLines = [];
      while (i < lines.length && lines[i].trim() !== '') {
        addressLines.push(lines[i].trim());
        i++;
      }
      out.push(`            <p class="about-address">${addressLines.map((l) => escapeHtml(l)).join('<br>')}</p>`);
      continue;
    }

    if (/^-\s/.test(line)) {
      if (!sectionOpen) {
        out.push('      <div class="jog-block html-block jog-block-html">');
        out.push('        <div class="jog-block-content">');
        out.push('          <div class="jog-html-content">');
        sectionOpen = true;
      }
      const items = [];
      while (i < lines.length && /^-\s/.test(lines[i])) {
        items.push(lines[i].replace(/^-\s/, '').trim());
        i++;
      }
      const lis = items.map((it) => `              <li>${inlineMd(escapeHtml(it))}</li>`).join('\n');
      out.push('            <ul class="jog-list">');
      out.push(lis);
      out.push('            </ul>');
      continue;
    }

    if (!sectionOpen) {
      out.push('      <div class="jog-block html-block jog-block-html">');
      out.push('        <div class="jog-block-content">');
      out.push('          <div class="jog-html-content">');
      sectionOpen = true;
    }
    out.push(`            <p>${inlineMd(escapeHtml(line))}</p>`);
    i++;
  }
  closeSection();

  return out.join('\n');
}

// ---------------------------------------------------------------------------
// Front matter + auto page creation
// ---------------------------------------------------------------------------
function parseFront(mdRaw) {
  const lines = mdRaw.replace(/\r\n/g, '\n').split('\n');
  let mode = 'standard';
  const meta = {};
  let idx = 0;
  while (idx < lines.length && /^\s*<!--/.test(lines[idx])) {
    const m = lines[idx].match(/<!--\s*([a-zA-Z]+)\s*:\s*([\s\S]*?)-->\s*/);
    if (m) {
      if (m[1] === 'mode' && m[2].trim() === 'editorial') mode = 'editorial';
      else meta[m[1]] = m[2].trim();
    }
    idx++;
  }
  return { md: lines.slice(idx).join('\n'), mode, meta };
}

function humanizePage(name) {
  const base = String(name)
    .split('.')[0]
    .replace(/[-_]+/g, ' ')
    .replace(/^./, (c) => c.toUpperCase())
    .replace(/\s[a-z0-9]/g, (c) => c.toUpperCase());
  return base.replace('Mens ', 'Men\u2019s ').replace('Womens ', 'Women\u2019s ');
}

function createPageFromTemplate(pageName, meta) {
  const page = `${pageName}.html`;
  if (!fs.existsSync(TEMPLATE_PATH)) {
    console.error(`  ERROR could not create ${page}: template missing (${TEMPLATE_PATH})`);
    return false;
  }
  let tpl = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  const label = meta.label || humanizePage(pageName);
  const title = meta.title || label;
  const desc = meta.desc || 'Journey of Grace';
  const banner = meta.banner || DEFAULT_BANNER;
  tpl = tpl
    .replaceAll('{{PAGE_ID}}', pageName)
    .replaceAll('{{TITLE}}', title)
    .replaceAll('{{OG_DESC}}', desc)
    .replaceAll('{{BANNER_IMG}}', banner)
    .replaceAll('{{PAGE_LABEL}}', label);
  fs.writeFileSync(path.join(ROOT, page), tpl);
  return true;
}

function render(md) {
  const { md: clean, mode } = parseFront(md);
  return mode === 'editorial' ? renderEditorial(clean) : renderStandard(clean);
}

// ---------------------------------------------------------------------------
const pages = fs.existsSync(CONTENT_DIR)
  ? fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.md'))
  : [];

let any = false;
let created = 0;
for (const f of pages) {
  const page = f.replace(/\.md$/, '.html');
  const htmlPath = path.join(ROOT, page);
  if (!fs.existsSync(htmlPath)) {
    const pageName = f.replace(/\.md$/, '');
    const raw = fs.readFileSync(path.join(CONTENT_DIR, f), 'utf8');
    const { meta } = parseFront(raw);
    if (!createPageFromTemplate(pageName, meta)) continue;
    created++;
    console.log(`  NEW  ${page} (created from md)`);
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

if (!any && created === 0) {
  console.log('content: no markdown sources, nothing to do');
  process.exit(0);
}
console.log(created > 0 ? `\ncontent: ${created} page(s) auto-created` : '');
