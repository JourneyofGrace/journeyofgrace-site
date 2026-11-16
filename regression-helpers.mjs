// Shared helpers for the Playwright regression suites.

// Third-party embeds (Planning Center / Church Center form iframes). Errors
// thrown inside these embeds are not our code and must not fail the suites.
// Church Center currently throws a React hydration error (#418) from its own
// bundle, and its version/timing varies independently of this repo.
const THIRD_PARTY_HOSTS = [
  'churchcenter.com',
  'churchcenteronline.com',
  'planningcenter.com'
];

export function isThirdPartyUrl(url) {
  let host = '';
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch (e) {
    return false;
  }
  return THIRD_PARTY_HOSTS.some(d => host === d || host.endsWith('.' + d));
}

// Stack frames look like "at fn (https://host/path.js:12:34)". Only inspect
// real frame locations so documentation links in the message text (for
// example https://react.dev/errors/418) are ignored.
export function isThirdPartyPageError(err) {
  const urls = String((err && err.stack) || '').match(/https?:\/\/[^\s)"']+:\d+:\d+/g) || [];
  return urls.length > 0 && urls.every(isThirdPartyUrl);
}

export function isThirdPartyConsole(message) {
  const loc = (message.location && message.location() && message.location().url) || '';
  return isThirdPartyUrl(loc);
}
