# Journey of Grace — Journey of Grace Website

The official website for Journey of Grace Church of the Nazarene (Mesa, AZ), hosted on GitHub Pages.

## Overview

This is a self-contained static HTML/CSS/JS website. It was originally derived from the
church's Squarespace site, but has since been rebuilt as a fully independent, custom site:
our own markup, our own stylesheets (`css/style.css`, `css/about.css`), and our own
JavaScript (`js/main.js`). All assets are hosted locally in this repository — no reliance
on Squarespace.

### Page text lives in Markdown

Almost every page's body text is written as Markdown in `content/<page>.md` and is
injected into the matching `<page>.html` by the build. To edit a page's copy, edit the
Markdown — the HTML is regenerated.

```bash
npm run content   # = scripts/build-content.mjs && scripts/layout.mjs
npm run build     # = npm run content && scripts/fetch-sermons.mjs
```

- `scripts/build-content.mjs` — turns each `content/<page>.md` into the page's body HTML
  (between the `<!-- JOG-CONTENT-START -->` / `<!-- JOG-CONTENT-END -->` markers) and
  injects the banner/breadcrumb into templates created from an `.md` with no matching HTML.
- `scripts/layout.mjs` — injects the shared header/footer (`partials/header.html`,
  `partials/footer.html`) via the `<!-- JOG-HEADER -->` / `<!-- JOG-FOOTER -->` markers
  (or the legacy line-scan fallback on hand-authored pages).

### Markdown schema (build-content.mjs)

| Markdown | Rendered as |
| --- | --- |
| Leading `> "verse text"` followed by `> {cite} **Ref (VER)** url` | Featured verse card |
| `## Heading` | Content section with heading |
| `### Name` | Service/program card in a grid |
| `- item` | Bulleted list |
| Blank-line paragraph | Lead/body paragraph |
| `::lead text` | Drop-cap lead paragraph (editorial mode) |
| `::quote text` | Pull quote (editorial mode) |
| `::attrib attribution` | Quote attribution (editorial mode) |
| `::beliefs` then `- item` lines | Numbered-style beliefs list (editorial mode) |
| `::kicker text` | Small overline before a heading (editorial mode) |
| `::staff` ... `::staff` | Staff card: `img:`/`role:`/`name:`/`email:`/`quote:`/`attrib:` fields, then bio paragraphs (editorial mode, one card per image) |
| `::cta <href> <label>` | Call-to-action button |
| `::full` | Next section renders full-width (e.g. photo grid) |
| `::ministry <heading>` then `- [Name](href)` lines | Ministry tile grid (Connect page) |
| `::gallery <dir>` | Auto photo grid from `assets/img/gallery/<dir>/` (sorted images; hidden when empty/missing) |
| `---` | Horizontal rule (fleuron) |

Editorial pages (e.g. about-us) start the file with `<!-- mode: editorial -->` to get the
journal-style layout (kickers, drop caps, pull quotes, staff cards). All pages support
front-matter comments `<!-- title: ... -->`, `<!-- label: ... -->`, `<!-- desc: ... -->`,
`<!-- banner: ... -->` (used by auto page-creation).

### Auto page-creation

Dropping a new `content/<page>.md` and running `npm run content` generates a full new
`<page>.html` (head, banner, breadcrumb, header/footer) from `scripts/templates/page.html`.
No HTML authoring needed — the Markdown **is** the page content.

### Photo galleries

Gallery photos live in `assets/img/gallery/<page>/`. Add images to that folder and list
`::gallery assets/img/gallery/<page>` in the page's Markdown; the grid is built for you
(and hidden automatically if the folder is empty). Keep filenames **without a leading
underscore** so GitHub Pages (Jekyll) serves them. Clicking any gallery or staff photo
opens it full-size in the built-in lightbox.

## Pages

| Page | Description | Content source |
|------|-------------|----------------|
| `index.html` | Home page (full-screen intro video hero; intentionally **no footer**) | Hand-authored |
| `about-us.html` | About Us, beliefs, staff | `content/about-us.md` (editorial + staff cards) |
| `connect.html` | Connect / Ministries | `content/connect.md` |
| `kids-min.html` | Kids Ministry | `content/kids-min.md` (+ gallery) |
| `youth-group.html` | Youth Group | `content/youth-group.md` (+ gallery) |
| `mens-ministry.html` | Men's Ministry | `content/mens-ministry.md` (+ gallery) |
| `womens-ministry.html` | Women's Ministry | `content/womens-ministry.md` (+ gallery, off when empty) |
| `life-groups.html` | Life Groups | `content/life-groups.md` |
| `journey-classes.html` | Journey Classes | `content/journey-classes.md` |
| `service-teams.html` | Service Teams | `content/service-teams.md` |
| `spanish.html` | Spanish Ministry | `content/spanish.md` |
| `events.html` | Events (Planning Center calendar + API list, see CI below) | Script-driven |
| `sermons.html` | Sermons (YouTube, refreshed by CI) | Script-driven |
| `sermon-archive.html` | Sermon Archive | Script-driven |
| `nextstep.html` | Next Step (Planning Center form) | Hand-authored (PCO form embed) |
| `connection-card.html` | Connection Card (Planning Center form) | Hand-authored (PCO form embed) |
| `event-facility-request.html` | Event & Facility Request (links out to PCO form) | Hand-authored (form not frameable) |
| `visit.html` / `plan-your-visit.html` | Visit / Location (Leaflet map, visitor form) | Hand-authored |
| `privacy.html` | Privacy Policy | Hand-authored |
| `404.html` | Not Found | Hand-authored |

## Integrations

All Planning Center configuration lives in **one file**: [`js/config.js`](js/config.js)
(see [`docs/planning-center.md`](docs/planning-center.md) for a staff-facing guide).

- **Church Center calendar** — live calendar embed + "View the full calendar" link on the Events page
- **Giving** — header nav "Giving" button (Church Center modal)
- **People Forms** — per-page form embeds (`planningCenter.pageForms`): Next Step, Connection Card, Event & Facility Request, Visit, Spanish
- **Form sizing** — `planningCenter.pageFormCanvas` overrides per-page embed canvas size so long forms (e.g. the Connection Card) don't scroll inside the iframe
- **YouTube sermons** — `scripts/fetch-sermons.mjs` pulls the latest sermons; run by CI

## Events page filtering (fail-closed whitelist)

The Events page (`events.html`) is regenerated from Planning Center by
`scripts/fetch-events.mjs` in CI (see `.github/workflows/deploy.yml`). Two
repository **variables** control what appears. Both are whitelists — **nothing
shows unless explicitly listed**: if a variable is empty/unset, that section
renders a "no upcoming events" message instead of listing everything.

| Variable | Contents | Effect |
|----------|----------|--------|
| `PCO_GROUP_WHITELIST` | Comma-separated group **ids**, **names**, or **type names** | Only events from matching groups are shown. Name entries use closest-match, so friendly names (e.g. `ROC Youth Group`, `Men's Breakfast`) resolve even if they differ slightly from the exact name in PCO. |
| `PCO_CALENDAR_TAG` | Comma-separated **tag names** | Only calendar events carrying at least one of these tags are shown. |

Both must be set as **Actions variables** (not secrets):

```bash
gh variable set PCO_GROUP_WHITELIST -b "ROC Youth Group, Men's Breakfast" --repo JourneyOfGrace/journeyofgrace-site
gh variable set PCO_CALENDAR_TAG -b "website" --repo JourneyOfGrace/journeyofgrace-site
```

Group identifiers are matched in this order: exact id match → exact name/type
match → closest fuzzy name/type match (bigram similarity score ≥ 0.5), so
entries like `ROC Youth Club` still resolve to the `ROC Youth Group`.

To preview locally without PCO credentials, run with mock data:

```bash
MOCK=1 node scripts/fetch-events.mjs                            # everything empty -> both sections show placeholders
MOCK=1 PCO_CALENDAR_TAG=website PCO_GROUP_WHITELIST="ROC Youth Group, Men's Breakfast" node scripts/fetch-events.mjs
```

## Setup

### Local Development

After editing any `content/*.md`, rebuild the HTML:

```bash
npm run content
```

Serve the repository root with any static file server:

```bash
python3 -m http.server 8126
```

Then open `http://localhost:8126/<page>.html` in your browser.

**Note on links:** page links are extensionless (`href="about-us"`). This works on
GitHub Pages and the nginx (Docker) config, which map extensionless links to `.html` files.
`python3 -m http.server` does **not** do that — use the `.html` URLs locally
(`http://localhost:8126/about-us.html`).

### Check the site (Playwright)

Repo-root `verify-*.mjs` scripts open each page headlessly and assert structure,
rendering, and zero console errors (run from the repo root after `npm ci`):

```bash
node verify-about.mjs
node verify-mini.mjs
node verify-mobile.mjs
node verify-nextstep.mjs
node verify-ccpage.mjs
node verify-event.mjs
node verify-lightbox.mjs
node verify-formscroll.mjs
node audit-all.mjs
```

The local-only suites configured for the CI regression pipeline can be run in one shot:

```bash
npm run test:regression
```

### Docker

The site can be run in a container. The build is **multi-stage**: a `node:20-alpine`
builder runs `npm run content` to render `content/*.md` into the static HTML, then tags
the tiny `nginx:alpine` runtime (which also maps extensionless links like GitHub Pages).
No package installation is needed to build (the build scripts use only Node built-ins).

Compose (recommended):

```bash
docker compose up -d        # build + start on http://localhost:8080/journeyofgrace-site/
docker compose down
```

Or with Docker directly:

```bash
docker build -f docker/Dockerfile -t journeyofgrace-site .
docker run --rm -p 8080:80 journeyofgrace-site
```

Then open `http://localhost:8080/journeyofgrace-site/`. If `8080` is already in use on
your host, change the `ports` mapping in `docker-compose.yml` (e.g. `8095:80`).

## Deployment

The site deploys to GitHub Pages at
<https://journeyofgrace.github.io/journeyofgrace-site/>.

A CI workflow (`.github/workflows/deploy.yml`) runs on pushes to `main` (and on a
schedule) to refresh `sermons.html` (latest YouTube sermons) and `events.html`
(Planning Center events), committing the refreshed files back and triggering a redeploy.
It needs the `PCO_CLIENT_ID` / `PCO_SECRET` secrets and the whitelist variables above.

## Assets

- `content/` — Markdown source of page text (see the schema above)
- `assets/img/gallery/<page>/` — per-page photo galleries (Jekyll-safe filenames)
- `assets/img/` — Images (including the logo and original site imagery)
- `assets/videos/` — Self-hosted homepage intro video (`journey-of-grace-intro.mp4`)
- `assets/vendor/` — Self-hosted vendor assets (Leaflet, fonts, etc.)
- `css/` — Custom stylesheets (`style.css`, `about.css`, plus `site.css`/`custom.css`/`clean-visit.css`)
- `js/` — Custom JavaScript (`main.js`) + site configuration (`config.js`)
- `scripts/` — Build/migration tooling (`build-content.mjs`, `layout.mjs`, `fetch-sermons.mjs`, `fetch-events.mjs`)
- `partials/` — Shared header/footer injected by `layout.mjs`
