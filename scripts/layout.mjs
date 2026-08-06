import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const header = readFileSync(join(root, 'partials', 'header.html'), 'utf8');
const footer = readFileSync(join(root, 'partials', 'footer.html'), 'utf8');

const HEADER_MARK = /^[ \t]*<!-- JOG-HEADER -->[ \t]*\r?\n?/m;
const FOOTER_MARK = /^[ \t]*<!-- JOG-FOOTER -->[ \t]*\r?\n?/m;

function replaceHeader(html) {
  if (HEADER_MARK.test(html)) return html.replace(HEADER_MARK, header);
  const lines = html.split('\n');
  const start = lines.findIndex((l) => l.includes('<!-- Header Navigation -->'));
  if (start === -1) return null;
  const mainAt = lines.findIndex(
    (l, i) =>
      i > start &&
      /id="mainContent"|<main class="main-content"|<main class="main-wrapper"|<!-- Hero Banner -->|<section class="hero-banner"/.test(l)
  );
  if (mainAt === -1) return null;
  return lines.slice(0, start).join('\n') + '\n' + header + lines.slice(mainAt).join('\n');
}

function replaceFooter(html) {
  if (FOOTER_MARK.test(html)) return html.replace(FOOTER_MARK, footer);
  const lines = html.split('\n');
  const start = lines.findIndex((l) => l.trimStart().startsWith('<footer'));
  if (start === -1) return html; // no footer (e.g. index)
  const end = lines.findIndex((l, i) => i > start && l.trimStart().startsWith('</footer>'));
  if (end === -1) return null;
  return lines.slice(0, start).join('\n') + '\n' + footer + lines.slice(end + 1).join('\n');
}

let errors = 0;
let stamped = 0;
let skipped = 0;

for (const file of readdirSync(root).filter((f) => f.endsWith('.html'))) {
  const path = join(root, file);
  let html = readFileSync(path, 'utf8');
  const hasMarkOrBlock = HEADER_MARK.test(html) || FOOTER_MARK.test(html) || html.includes('<!-- Header Navigation -->');

  const nextHeader = replaceHeader(html);
  const nextFooter = nextHeader === null ? null : replaceFooter(nextHeader);
  if (nextHeader === null || nextFooter === null) {
    console.error(`  ERROR ${file}: could not locate header/footer block`);
    errors++;
    continue;
  }
  if (nextHeader === html && nextFooter === html) {
    console.log(`  same  ${file}`);
    skipped++;
    continue;
  }
  writeFileSync(path, nextFooter === html ? nextHeader : nextFooter);
  stamped++;
  console.log(`  ok    ${file}`);
}

if (errors > 0) {
  console.error(`\nlayout: ${errors} page(s) failed.`);
  process.exit(1);
}
console.log(`\nlayout: ${stamped} updated, ${skipped} unchanged (from partials/header.html + partials/footer.html)`);