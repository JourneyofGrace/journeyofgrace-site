# Journey of Grace — Static Site Clone

A faithful static clone of the Squarespace site [journeyofgrace.church](https://journeyofgrace.church), hosted on GitHub Pages.

## Overview

This site is a static HTML/CSS/JS clone of the Journey of Grace Squarespace site. It preserves the original design and layout while hosting all assets locally for independence from Squarespace.

### Integrations

- **Planning Center Online (PCO)** — Events, Groups, and Giving widgets (IDs need to be configured in `js/main.js`)
- **Formspree** — Contact form backend (form ID needs to be configured in `js/main.js`)

## Pages

| Page | Description |
|------|-------------|
| `index.html` | Home page |
| `about-us.html` | About Us |
| `visit-1.html` | Visit / Location |
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
| `privacy.html` | Privacy Policy |
| `plan-your-visit.html` | Plan Your Visit |
| `blog.html` | Blog |
| `sermon-archive.html` | Sermon Archive |

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

## Deployment

This site uses GitHub Actions for automatic deployment to GitHub Pages.

The workflow is defined in `.github/workflows/deploy.yml`.

To enable:
1. Push to the `main` branch
2. Go to **Settings > Pages** in the GitHub repository
3. Set source to **GitHub Actions**

## Assets

- `assets/img/` — All images downloaded from the original Squarespace site (113 files)
- `css/` — Squarespace CDN CSS files for styling fidelity
- `js/` — Custom JavaScript for PCO widgets, forms, and interactivity

## Template

Squarespace template: **ryan-albaugh-5n9p**
