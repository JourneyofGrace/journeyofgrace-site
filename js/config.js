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
 * Planning Center People / Form embed URL (e.g., https://journeyofgrace.churchcenter.com/people/forms/123456)
 * Planning Center is the church's only form provider; there is no email fallback.
 */
/*
 * Planning Center Online API integration parameters.
 * Configurable via GitHub Repository Secrets (PCO_CLIENT_ID, PCO_SECRET) or environment settings.
 */
window.JOG_CONFIG.planningCenter.clientId = window.JOG_CONFIG.planningCenter.clientId || "";
window.JOG_CONFIG.planningCenter.workerUrl = window.JOG_CONFIG.planningCenter.workerUrl || "";
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
  "connection-card.html": "https://journeyofgrace.churchcenter.com/people/forms/1242125",
  "event-facility-request.html": "https://journeyofgrace.churchcenter.com/calendar/forms/23761"
};

/*
 * Optional per-page embed canvas overrides (width x height in px).
 *
 * By default the embedded Planning Center forms are drawn on a 480px-wide,
 * ~885px-tall canvas and then scaled to fit. A couple of pages embed very
 * long forms (e.g. the Connection Card) and staff asked for a bigger embed so
 * nothing scrolls inside the iframe. Add a page here to draw that page's form
 * on a wider/taller canvas instead.
 */
window.JOG_CONFIG.planningCenter.pageFormCanvas =
  window.JOG_CONFIG.planningCenter.pageFormCanvas || {
    "connection-card.html": { w: 820, h: 3400 },
    "event-facility-request.html": { w: 820, h: 1700 }
  };




