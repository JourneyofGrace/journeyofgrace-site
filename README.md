# Journey of Grace — Journey of Grace Website

The official website for Journey of Grace Church of the Nazarene (Mesa, AZ), hosted on GitHub Pages.

## Overview

This is a self-contained static HTML/CSS/JS website. It was originally derived from the church's Squarespace site, but has since been rebuilt as a fully independent, custom site: our own markup, our own stylesheet (`css/style.css`), and our own JavaScript (`js/main.js`). All assets are hosted locally in this repository — no reliance on Squarespace.

### Integrations

- **Planning Center Online (PCO)** — Events, Groups, and Giving widgets (IDs need to be configured in `js/main.js`)
- **Formspree** — Contact form backend (form ID needs to be configured in `js/main.js`)

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

## Pages

| Page | Description |
|------|-------------|
| `index.html` | Home page (full-screen intro video hero) |
| `about-us.html` | About Us |
| `visit.html` | Visit / Location (Leaflet map) |
| `connect.html` | Connect / Ministries |
| `sermons.html` | Sermons |
| `events.html` | Events (PCO calendar) |
| `nextstep.html` | Next Step (Formspree form) |
| `spanish.html` | Spanish Ministry (Formspree form) |
| `kids-min.html` | Kids Ministry |
| `youth-group.html` | Youth Group |
| `mens-ministry.html` | Men's Ministry |
| `womens-ministry.html` | Women's Ministry |
| `life-groups.html` | Life Groups |
| `journey-classes.html` | Journey Classes |
| `service-teams.html` | Service Teams |
| `plan-your-visit.html` | Plan Your Visit |
| `privacy.html` | Privacy Policy |
| `sermon-archive.html` | Sermon Archive |
| `404.html` | Not Found |

## Setup

### Configure PCO Widget IDs

Edit `js/main.js` and replace the placeholders:

- `YOUR_CALENDAR_ID` — Your PCO Calendar ID
- `YOUR_GROUPS_ID` — Your PCO Groups ID
- `YOUR_GIVING_ID` — Your PCO Giving ID

### Configure Formspree Form ID

Edit `js/main.js` and replace `YOUR_FORM_ID` with your Formspree form ID.

### Local Development

Serve the repository root with any static file server:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080` in your browser.

Note: page and asset URLs use the GitHub Pages base path `/journeyofgrace-site/`, so for local testing either serve from the parent directory (`python3 -m http.server 8080 --directory ..`) and open `/journeyofgrace-site/`, or a base-path rewrite.

#### Docker

The site can also be run in a container (served by nginx under the same `/journeyofgrace-site/` base path, so no markup changes are needed):

```bash
docker build -f docker/Dockerfile -t journeyofgrace-site .
docker run --rm -p 8080:80 journeyofgrace-site
```

Then open `http://localhost:8080/journeyofgrace-site/`. The nginx config in `docker/nginx.conf` maps extensionless page links (`/journeyofgrace-site/about-us`) to their `.html` files, mirroring GitHub Pages clean-URL behaviour.

## Deployment

This site uses GitHub Actions for automatic deployment to GitHub Pages.

The workflow is defined in `.github/workflows/deploy.yml`.

To enable:
1. Push to the `main` branch
2. Go to **Settings > Pages** in the GitHub repository
3. Set source to **GitHub Actions**

## Assets

- `assets/img/` — Images (including the logo and original site imagery)
- `assets/videos/` — Self-hosted homepage intro video (`journey-of-grace-intro.mp4`)
- `assets/vendor-sqsp/` — Self-hosted vendor assets (Leaflet, fonts, etc.)
- `css/` — Custom stylesheets (`style.css`, plus `site.css`/`custom.css`/`clean-visit.css`)
- `js/` — Custom JavaScript for PCO widgets, forms, video hero, and interactivity
