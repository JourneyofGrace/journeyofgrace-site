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
| People/event forms (embeds) | Connection Card, Event & Facility Request, Next Step, Visit, Spanish pages | **Working now** (see "People & event forms" below) |

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

That is the whole calendar integration: **one value in one file**.

---

## People & event forms

Several pages embed a Church Center form (instead of a popup or an email-forwarding
form) and display it inline — scaled to fit the page so nothing scrolls inside the
iframe. Everything is configured in [`js/config.js`](../js/config.js), under
`planningCenter`:

```js
pageForms: {
  "visit.html":                 "https://journeyofgrace.churchcenter.com/people/forms/1284759",
  "plan-your-visit.html":       "https://journeyofgrace.churchcenter.com/people/forms/1284759",
  "nextstep.html":              "https://journeyofgrace.churchcenter.com/people/forms/1286060",
  "spanish.html":               "https://journeyofgrace.churchcenter.com/people/forms/1286061",
  "connection-card.html":       "https://journeyofgrace.churchcenter.com/people/forms/1292063",
}
pageFormCanvas: {
  "connection-card.html":       { w: 820, h: 3400 },  // long connection card -> no inner scroll
}
```

* **`pageForms`** — maps each page to the form embedded on it. To change what form a
  page shows (or add a new page/form), update this map. Any page with a
  `form.self-hosted-form` block gets its form swapped for this embed automatically.
* **`pageFormCanvas`** — the embed is drawn at its natural canvas size (480×885 default)
  and scaled to the page width. If a form is very long (e.g. the Connection Card),
  raise its `h` here so the whole form fits without an inner scrollbar. Bump `w` to make
  wide forms readable.

The Events page also points visitors to the **Event & Facility Request form**: there is a
short "fill out an Event & Facility Request form" link near the top of the events page that
links to `event-facility-request.html`. Because Church Center serves
`/calendar/forms/<id>` with `X-Frame-Options: SAMEORIGIN` (unlike
`/people/forms/<id>`), that page does **not** embed the form: it explains the process and
points to the live form via a prominent link that opens
`https://journeyofgrace.churchcenter.com/calendar/forms/23761` in a new tab.

> To change the form its title/description/fields edit the form in
> **Planning Center > People > Forms** (or **Calendar > Forms** for the facility request
> form). For a *new* page, add a `pageForms` entry and put a
> `<form class="self-hosted-form">` block on that page — the embed replaces it.
> Note: only `/people/forms/` embeds are frameable; any form under `/calendar/forms/`
> must be linked out instead (its server sends `X-Frame-Options: SAMEORIGIN`).

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

## Custom form submission via the relay (optional)

If you want a fully custom-styled form that still records real submissions into the
form, add the relay sidecar (`api/relay.mjs`, see the README "Form submission relay"
section). The browser never talks to Planning Center directly — it POSTs JSON to our
own relay, which forwards to the People API with a server-side credential.

The relay is reachable from the browser through nginx at the same origin:
`POST /api/forms/{form_id}/submit` (nginx proxies `/api/` to the `api` compose
service; no CORS needed). The relay container must have the form id in its
`PCO_FORM_ID` allowlist (`api/.env`).

Two payload styles are accepted:

1. **Themed static forms (relay mode).** A page whose form is listed in
   `planningCenter.relayForms` (js/config.js) keeps its own styled form instead
   of the PCO iframe. On submit, js/main.js posts label-keyed values:

   ```json
   {
     "data": {
       "values": {
         "Name": "Jane Doe",
         "Email Address": "jane@example.com",
         "Message": "Hello!"
       }
     }
   }
   ```

   The relay resolves each label to the form's `form_field_id` (via
   `GET /people/v2/forms/{id}/fields`, matching case/punctuation-insensitively),
   splits "Name" into `person_attributes.first_name`/`last_name`, maps the email
   field to `person_attributes.emails_attributes`, resolves option-type fields
   (checkboxes/dropdown) from option label to option **id**, and builds one
   `FormSubmissionValue` per field in the JSON:API `included` array. The input
   `name` attributes on the static form should therefore match the PCO form
   field labels ("Name", "Email Address", ...).

2. **Prebuilt JSON:API payload** (forwarded verbatim):

   - `data.attributes.form_values` — each answer keyed to the form's `form_field_id`
     (enumerate via `GET /api/planningcenteronline.com/people/v2/forms/{id}/form_fields`;
     for option/checkbox fields the value must be the **id** of the selected option).
   - Identify the submitter with either `data.attributes.person_id` (existing person) or
     `data.attributes.person_attributes: { first_name, last_name, emails_attributes:
     [{ location, address }] }` — the API auto-matches or auto-creates the person.

Why a relay and not a direct browser call:

- A Personal Access Token used client-side is disabled by Planning Center if found in
  public JS; the token must live in an env var on the server (`api/.env`) only.
- GH Actions cron jobs are batch runners with no always-on HTTP endpoint, so they
  cannot receive live submissions. The relay (`docker compose up -d api`) is the
  always-on piece; GH cron remains for batch refreshes.

Enabling relay mode for a page:

1. Add the page to `planningCenter.relayForms` in js/config.js (e.g.
   `"nextstep.html": "1286060"`).
2. Make sure the form id is in the relay's `PCO_FORM_ID` allowlist (api/.env).
3. Set the PCO_CLIENT_ID / PCO_SECRET credentials in api/.env (same pair as
   the GitHub secrets).
4. Test locally with `MOCK=1` first (dry-run logs the payload, never touches PCO).

---

## Testing locally

```bash
# serve the repo root; pages use .html URLs with plain http.server
npm run content
python3 -m http.server 8126
# then open http://localhost:8126/events.html
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
