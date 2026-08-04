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
 * Leave calendarEmbedUrl as "" to hide the embed; a "coming soon" note with a
 * link to the full calendar shows instead.
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
 * Recipient email address for self-hosted contact forms (FormSubmit).
 * Can be overridden globally via JS config or populated during CI build.
 */
window.JOG_CONFIG.formRecipientEmail =
  window.JOG_CONFIG.formRecipientEmail || "office@journeyofgrace.church";

/*
 * Planning Center People / Form Embed URL (e.g., https://journeyofgrace.churchcenter.com/people/forms/embed/123456)
 * Leave empty ("") to use the default HTML form with FormSubmit/email forwarding.
 */
/*
 * Planning Center Online API integration parameters.
 * Configurable via GitHub Repository Secrets (PCO_CLIENT_ID, PCO_SECRET) or environment settings.
 */
window.JOG_CONFIG.planningCenter.clientId = window.JOG_CONFIG.planningCenter.clientId || "";
window.JOG_CONFIG.planningCenter.workerUrl = window.JOG_CONFIG.planningCenter.workerUrl || "";
window.JOG_CONFIG.planningCenter.visitorFormUrl =
  window.JOG_CONFIG.planningCenter.visitorFormUrl || "";




