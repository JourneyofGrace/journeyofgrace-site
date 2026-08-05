# Journey of Grace — Journey of Grace Website

The official website for Journey of Grace Church of the Nazarene (Mesa, AZ), hosted on GitHub Pages.

## Overview

This is a self-contained static HTML/CSS/JS website. It was originally derived from the church's Squarespace site, but has since been rebuilt as a fully independent, custom site: our own markup, our own stylesheet (`css/style.css`), and our own JavaScript (`js/main.js`). All assets are hosted locally in this repository — no reliance on Squarespace.

### Integrations

- **Planning Center Online (PCO)** — Events, Groups, and Giving widgets (IDs need to be configured in `js/main.js`)
- **Formspree** — Contact form backend (form ID needs to be configured in `js/main.js`)

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
| `prximo-paso.html` | Próximo Paso |
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
