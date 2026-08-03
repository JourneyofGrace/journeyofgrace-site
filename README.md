# Journey of Grace — Static Site POC

Faithful clone of the Journey of Grace Squarespace site, rebuilt as a static site hosted on GitHub Pages with Planning Center Online integration.

## Site Structure

| Page | Description |
|------|-------------|
| `index.html` | Home page with announcement bar, worship times, and upcoming events |
| `about.html` | About Us — history, beliefs, location |
| `visit.html` | Visit — service times, location map |
| `connect.html` | Connect — ministry listings, Planning Center Groups widget |
| `sermons.html` | Sermons — links to SoundCloud, YouTube, Facebook |
| `events.html` | Events — Planning Center Calendar widget |
| `nextstep.html` | Next Step — contact form (Formspree) |
| `spanish.html` | Español — Spanish-language contact form |
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

## Planning Center Integration

This site integrates with Planning Center Online via embeddable widgets:

- **Calendar** (`events.html`) — Shows upcoming church events
- **Groups** (`connect.html`, `youth-group.html`, `life-groups.html`) — Shows small groups and ministries
- **Giving** — Link to Planning Center Giving (configure in `js/main.js`)

To enable widgets, replace placeholder IDs in `js/main.js`:
- `YOUR_CALENDAR_ID` — Your Planning Center Calendar ID
- `YOUR_GROUPS_ID` — Your Planning Center Groups ID
- `YOUR_GIVING_ID` — Your Planning Center Giving ID

## Form Handling

The contact form on `nextstep.html` and `spanish.html` uses [Formspree](https://formspree.io/) as a free form backend. Replace `YOUR_FORM_ID` in the form `action` attribute with your Formspree form ID.

## Deployment

This site uses GitHub Actions for automatic deployment to GitHub Pages.

Push to the `main` branch to trigger a deployment. The site will be available at:
`https://journeyofgrace.github.io/journeyofgrace-site/`

## Local Development

Serve the site locally with any static server:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Migration from Squarespace

### What stays the same
- Planning Center integration (forms, events, groups, giving)
- Church content (sermons, about, visit info)
- Social media links
- All site pages and navigation

### What changes
- Forms use Formspree instead of Squarespace Forms
- Events use Planning Center Calendar instead of Squarespace Events
- Content is managed via Git (HTML/CSS) instead of Squarespace editor
- Hosting is free on GitHub Pages instead of Squarespace monthly fee
- Images are served from Squarespace CDN (no change)

### What's lost
- Squarespace Commerce (cart/store) — would need Snipcart or similar
- Squarespace built-in blog — would need a static site generator (Hugo, Jekyll)
- Squarespace SEO tools — would need manual SEO optimization