# Journey of Grace — Static Site POC

Proof-of-concept static site for Journey of Grace church, replacing Squarespace with a GitHub Pages-hosted static site integrated with Planning Center Online.

## Pages

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

## Planning Center Integration

This site integrates with Planning Center Online via embeddable widgets:

- **Calendar** (`events.html`) — Shows upcoming church events
- **Groups** (`connect.html`) — Shows small groups and ministries
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

### What changes
- Forms use Formspree instead of Squarespace Forms
- Events use Planning Center Calendar instead of Squarespace Events
- Content is managed via Git (Markdown/HTML) instead of Squarespace editor
- Hosting is free on GitHub Pages instead of Squarespace monthly fee

### What's lost
- Squarespace Commerce (cart/store) — would need Snipcart or similar
- Squarespace built-in blog — would need a static site generator (Hugo, Jekyll)
- Squarespace SEO tools — would need manual SEO optimization