# Planning Center Integration

Journey of Grace uses **Planning Center (Church Center)** for events, groups, and giving.
This page explains how the site shows Planning Center content and how to configure it —
it is intentionally designed so that **no code changes are ever needed**; everything is
configured in one file: [`js/config.js`](../js/config.js).

---

## What is already wired up

| Feature | Where it appears | Status |
| --- | --- | --- |
| Live event calendar embed (iframe) | Top of the Events page | Ready — needs the embed URL (2-minute setup below) |
| "View the full calendar" link | Events page | **Working now** (links to the public Church Center calendar) |
| Giving | Header nav → "Giving" | Working (Church Center giving link) |

The embed container and JavaScript are in place on `events.html`. Nothing else on the
site is affected if you leave the embed empty — the embed section is hidden and
upcoming events are rendered directly on the page from the PCO API instead.

---

## Configuration in one place

Open [`js/config.js`](../js/config.js):

```js
window.JOG_CONFIG = {
  planningCenter: {
    calendarEmbedUrl: "",  // <-- paste the embed URL here
    calendarLink: "https://journeyofgrace.churchcenter.com/calendar",
  },
};
```

* `calendarEmbedUrl` — the iframe `src` from Planning Center (see below). Empty = no embed.
* `calendarLink` — the "View Full Calendar" button target. Safe to leave as-is.

That is the whole integration: **one value in one file**.

---

## How to get the embed URL (2 minutes, no developer needed)

1. In **Planning Center Calendar**, open the **Events** page (top navigation).
2. Select **Actions** (top right of the calendar) → **Share events** → **Embed** → **Continue**.
3. Pick a style:
   - **List** — chronological list of upcoming events (recommended, works on mobile).
   - **Month** — month grid; mobile visitors automatically see the List view.
   - **Gallery** — thumbnail cards.
4. (Optional) Narrow it down with campus/category filters, or check *Include filter bar*.
5. Choose the **iFrame** code type, copy the code, and paste the URL from
   `src="..."` into `calendarEmbedUrl` in `js/config.js`.
   (You may paste the **entire `<iframe>` snippet** instead — the site accepts either.)

**Important:** only events published to Church Center are visible to the public.
In Calendar, open each event and set **Church Center visibility = "Published"**
(Calendar → Events → event → Church Center tab). Until an event is published, the
embed will look empty.

Then commit and push — GitHub Pages auto-deploys (below).

---

## If you want the simplest possible version (no embed at all)

The Events page already links to the public Church Center calendar. You can also just
link it from any button, e.g.:

```html
<a href="https://journeyofgrace.churchcenter.com/calendar">View Upcoming Events</a>
```

---

## Groups (small groups)

Event *dates/times* live in **Planning Center Calendar** (that is what the embed shows).
The **Groups** product manages small-group *signups* and has its own public page:
<https://journeyofgrace.churchcenter.com/groups>.

If you want a "Join a Group" button on the Life Groups page, link to that URL — it is
public and requires no configuration. (The Church Center admin can also generate a
groups embed code, same *Share* flow, but it cannot be keyed to a bare "ID" without a
backend server.)

---

## Why an iframe instead of the Planning Center API?

Planning Center's API requires OAuth credentials that must live on a server —
they **cannot** be hidden in a static site's JavaScript (any visitor could read them).
GitHub Pages is a static host with no server, so the officially supported, public
mechanism is the **Church Center embed code**, which needs no credentials at all.

The old placeholder constants (`YOUR_CALENDAR_ID`, `YOUR_GROUPS_ID`, `YOUR_GIVING_ID`
in `js/main.js`) pointed at a made-up hostname and never worked — they were removed
and replaced by this config-driven embed.

---

## Testing locally

```bash
# serve the repo root; site lives under /journeyofgrace-site/
python3 -m http.server 8187
# then open http://127.0.0.1:8187/journeyofgrace-site/events.html
```

## Deploying

Push to `main` — the GitHub Actions workflow (`.github/workflows/deploy.yml`)
auto-deploys to <https://journeyofgrace.github.io/journeyofgrace-site/>.

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| Embed section is hidden on the Events page | `calendarEmbedUrl` is empty — events are rendered directly on the page instead; paste the embed URL to show the live embed. |
| Embed iframe is blank/empty | Events are not **published** in Church Center (see above). |
| "We seem to have strayed off course" (404) | The URL isn't a valid embed URL — re-copy it from Calendar → Actions → Share events → Embed → iFrame. |
| Calendar looks unstyled / tiny | Iframes are fixed-size; the embed handles its own styling. If it looks squished, paste the code from the "List" style, which adapts to container width. |
