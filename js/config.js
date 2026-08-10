/*
 * Site configuration for Journey of Grace — edit values here, no code changes needed.
 */

window.JOG_CONFIG = window.JOG_CONFIG || {};
window.JOG_CONFIG.planningCenter = window.JOG_CONFIG.planningCenter || {};

/*
 * Live Church Calendar embed (shows upcoming events at the top of events.html).
 * See docs/planning-center.md for full instructions.
 *
 * HOW TO GET calendarEmbedUrl (2 minutes, done by church staff in Planning Center):
 *   1. In Planning Center, open Calendar > Events (top navigation).
 *   2. Select "Actions" (top right) > "Share events" > "Embed" > "Continue".
 *   3. Pick a style (List recommended) and optional campus/category filters.
 *   4. Choose the "iFrame" code type, copy the code, and paste the URL from
 *      src="..." here (the whole <iframe> snippet also works).
 *
 * IMPORTANT: Events must be published to Church Center first
 * (Calendar > event > Church Center visibility = "Published"), otherwise the
 * embed will be empty.
 *
 * Leave calendarEmbedUrl as "" to hide the embed; upcoming events are rendered
 * directly on the page by scripts/fetch-events.mjs instead.
 */
window.JOG_CONFIG.planningCenter.calendarEmbedUrl =
  window.JOG_CONFIG.planningCenter.calendarEmbedUrl || "";

/*
 * "View the full calendar" link on events.html. Points to the church's public
 * Church Center calendar. Safe to leave as-is.
 */
window.JOG_CONFIG.planningCenter.calendarLink =
  window.JOG_CONFIG.planningCenter.calendarLink ||
  "https://journeyofgrace.churchcenter.com/calendar";

/*
 * Generic embed fallback for Planning Center forms. Per-page form embeds are
 * configured in `pageForms` below; `visitorFormUrl` is used when a page renders
 * a form without a matching entry.
 */
window.JOG_CONFIG.planningCenter.visitorFormUrl =
  window.JOG_CONFIG.planningCenter.visitorFormUrl || "";

/*
 * Per-page Planning Center form embeds.
 *
 * Each contact form on the site swaps its static self-hosted form for a
 * Planning Center People form embed. The map is keyed by the page's file name
 * (window.location.pathname basename). Values are the form's public URL
 * (https://journeyofgrace.churchcenter.com/people/forms/<form_id>) — the form
 * page detects the iframe and renders without the site chrome. (There is no
 * "/people/forms/embed/<id>" route; that path 404s.)
 *
 * A page without an entry (but rendering a form) logs an explicit error: staff
 * must add an entry here. Form fields are created in Planning Center > People > Forms.
 */
window.JOG_CONFIG.planningCenter.pageForms = window.JOG_CONFIG.planningCenter.pageForms || {
  "visit.html": "https://journeyofgrace.churchcenter.com/people/forms/1284759",
  "plan-your-visit.html": "https://journeyofgrace.churchcenter.com/people/forms/1284759",
  "nextstep.html": "https://journeyofgrace.churchcenter.com/people/forms/1286060",
  "spanish.html": "https://journeyofgrace.churchcenter.com/people/forms/1286061",
  "connection-card.html": "https://journeyofgrace.churchcenter.com/people/forms/1242125"
};

/*
 * Optional per-page relay-mode forms (themed static forms).
 *
 * Pages listed here keep their own styled static form (matching the site's
 * colors and layout) instead of swapping in a Planning Center iframe. On
 * submit the values are posted to the server-side relay (/api/forms/:id/
 * submit), which forwards them to the Planning Center People API. Values are
 * matched to PCO form fields by label, so the input `name` attributes should
 * match the PCO form field labels ("Name", "Email Address", ...).
 *
 * Values are form IDs (same IDs as the embed URLs above). The relay must
 * have the form ID in its PCO_FORM_ID allowlist (api/.env) and valid
 * PCO_CLIENT_ID / PCO_SECRET credentials.
 *
 * Leave this map empty ({}) to keep the default iframe embed behavior.
 */
window.JOG_CONFIG.planningCenter.relayForms = window.JOG_CONFIG.planningCenter.relayForms || {
  "connection-card.html": "1242125",
  // "nextstep.html": "1286060",
};

/*
 * Optional per-page embed canvas overrides (width x height in px).
 *
 * By default the embedded Planning Center forms are drawn on a 480px-wide,
 * ~885px-tall canvas and then scaled to fit. A couple of pages embed very
 * long forms (e.g. the Connection Card) and staff asked for a bigger embed so
 * nothing scrolls inside the iframe. Add a page here to draw that page's form
 * on a wider/taller canvas instead. The values are the iframe's internal
 * canvas; it is CSS-transformed to fill the card while keeping full content
 * height (see fitPcoForm in js/main.js).
 */
window.JOG_CONFIG.planningCenter.pageFormCanvas =
  window.JOG_CONFIG.planningCenter.pageFormCanvas || {
    // Connection Card: wider + slightly shorter embed so more of the form is
    // visible at once. 960 is a comfortable reading width and the form's own
    // content is ~3139px tall there, so 3170 keeps a little air with no inner
    // scrollbar (no-embed pages scroll the page instead).
    "connection-card.html": { w: 960, h: 3170 }
  };




