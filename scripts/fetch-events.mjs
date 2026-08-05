import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const APP_ID = process.env.PCO_CLIENT_ID || process.env.PCO_APP_ID;
const SECRET = process.env.PCO_SECRET;

function api(apiPath) {
  return new Promise((resolve, reject) => {
    const auth = 'Basic ' + Buffer.from(`${APP_ID}:${SECRET}`).toString('base64');
    const req = https.request(
      { hostname: 'api.planningcenteronline.com', path: apiPath, method: 'GET', headers: { Authorization: auth, Accept: 'application/json' } },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c.toString()));
        res.on('end', () => {
          try { resolve({ status: res.statusCode, json: JSON.parse(body) }); }
          catch { reject(new Error(`bad json ${res.statusCode} for ${apiPath}`)); }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

const CHURCH_CENTER = 'https://journeyofgrace.churchcenter.com';
const GROUPS_DIR = `${CHURCH_CENTER}/groups`;

// Phoenix, AZ is UTC-7 year round (no DST).
const PHX_OFFSET_MS = 7 * 3600 * 1000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function phx(iso) {
  const d = new Date(iso);
  return new Date(d.getTime() - PHX_OFFSET_MS);
}

function pad(n, w) {
  return String(n).padStart(w || 2, '0');
}

function utcBasic(iso) {
  if (!iso) return '';
  return iso.slice(0, 19).replace(/[-:]/g, '') + 'Z';
}

function utcDateOnly(iso) {
  if (!iso) return '';
  return iso.slice(0, 10).replace(/-/g, '');
}

// Build a Google Calendar template URL. For all-day events use date-only
// params (end exclusive); otherwise UTC datetime params.
function googleCalendarLink(name, startsIso, endsIso, allDay, address) {
  const text = encodeURIComponent(name);
  let dates;
  if (allDay) {
    const startD = utcDateOnly(startsIso);
    let endD = utcDateOnly(endsIso) || startD;
    dates = `${startD}/${endD}`;
  } else {
    dates = `${utcBasic(startsIso)}/${utcBasic(endsIso)}`;
  }
  const location = address ? `&location=${encodeURIComponent(address)}` : '';
  return `http://www.google.com/calendar/event?action=TEMPLATE&text=${text}&dates=${dates}${location}`;
}

// Format a 24h hour/minute pair from a Phoenix-local Date as "H:MM AM/PM".
function fmt12(d) {
  let h = d.getUTCHours();
  const m = pad(d.getUTCMinutes());
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ap}`;
}

function fmt24(d) {
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

// Card DOM mirrors the existing events.html `.eventlist-event` structure so the
// shared CSS and js/main.js `initEventExports()` keep working.
function renderCard(ev) {
  const link = ev.link;
  const allDay = !!ev.allDay;
  const dateAttr = ev.dateLocalIso || ''; // YYYY-MM-DD (Phoenix)
  if (!dateAttr) return '';
  const month = MONTHS[ev.month];
  const day = ev.day;
  const wday = DAYS[ev.weekday];
  const monthFull = MONTHS_FULL[ev.month];
  const year = ev.year;

  const time12 = allDay ? 'All Day' : fmt12(ev.startLocal);
  const time24 = allDay ? '' : fmt24(ev.startLocal);
  const start12 = allDay ? 'All Day' : fmt12(ev.startLocal);
  const end12 = allDay ? 'All Day' : fmt12(ev.endLocal);
  const start24 = allDay ? '' : fmt24(ev.startLocal);
  const end24 = allDay ? '' : fmt24(ev.endLocal);

  let addressLi = '';
  if (ev.addressLines && ev.addressLines.length) {
    const lines = ev.addressLines.map((l) => `                  <span class="eventlist-meta-address-line">${esc(l)}</span>`).join('\n');
    const maplink = encodeURIComponent(ev.addressLines.join(' '));
    addressLi = `              <li class="eventlist-meta-item eventlist-meta-address event-meta-item">
${lines}
                <a href="https://maps.google.com/?q=${maplink}" class="eventlist-meta-address-maplink" target="_blank">(map)</a>
              </li>`;
  }

  const exportLi = `            <li class="eventlist-meta-item eventlist-meta-export event-meta-item">
              <a href="${ev.googleUrl}" class="eventlist-meta-export-google" target="_blank" rel="noopener">Google Calendar</a>
              <span class="eventlist-meta-export-divider"></span>
              <a href="/journeyofgrace-site/events" class="eventlist-meta-export-ical">ICS</a>
            </li>`;

  const excerpt = ev.description
    ? `          <div class="eventlist-excerpt"><p class="">${esc(ev.description)}</p></div>`
    : (ev.groupName
      ? `          <div class="eventlist-excerpt"><p class="">Part of the ${esc(ev.groupName)} group.</p></div>`
      : '');

  const thumb = ev.imageUrl
    ? `      <a href="${link}" class="eventlist-column-thumbnail content-fill"><img src="${ev.imageUrl}" data-src="${ev.imageUrl}" data-image="${ev.imageUrl}" data-image-focal-point="0.5,0.5" alt="${esc(ev.name)}" class="eventlist-thumbnail" data-load="false"></a>
`
    : '';

  return `      <article class="eventlist-event ${allDay ? 'eventlist-event--allday ' : ''}eventlist-event--upcoming">
${thumb}
        <a href="${link}" class="eventlist-column-date">
          <div class="eventlist-datetag">
            <div class="eventlist-datetag-inner">
              <div class="eventlist-datetag-startdate eventlist-datetag-startdate--month">${month}</div>
              <div class="eventlist-datetag-startdate eventlist-datetag-startdate--day">${day}</div>
              <div class="eventlist-datetag-time"><span class="event-time-12hr">${time12}</span><span class="event-time-24hr">${time24}</span></div>
              <div class="eventlist-datetag-status"></div>
            </div>
          </div>
        </a>
        <div class="eventlist-column-info">
          <h1 class="eventlist-title"><a href="${link}" class="eventlist-title-link">${esc(ev.name)}</a></h1>
          <ul class="eventlist-meta event-meta">
            <li class="eventlist-meta-item eventlist-meta-date event-meta-item">
              <time class="event-date" datetime="${dateAttr}">${wday}, ${monthFull} ${day}, ${year}</time>
            </li>
            <li class="eventlist-meta-item eventlist-meta-time event-meta-item">
              <span class="event-time-12hr">
                <time class="event-time-12hr-start" datetime="${dateAttr}">${start12}</time>
                <span class="event-datetime-divider"></span>
                <time class="event-time-12hr-end" datetime="${dateAttr}">${end12}</time>
              </span>
              <span class="event-time-24hr">
                <time class="event-time-24hr-start" datetime="${dateAttr}">${start24}</time>
                <span class="event-datetime-divider"></span>
                <time class="event-time-24hr-end" datetime="${dateAttr}">${end24}</time>
              </span>
            </li>
${addressLi}
${exportLi}
          </ul>
${excerpt}
          <a href="${link}" class="eventlist-button sqs-button-element--primary">
            View Event &#8594;
          </a>
        </div>
        <div class="clear"></div>
      </article>`;
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Build a card model from a calendar event instance.
function calendarCard(inst) {
  const a = inst.attributes;
  const startLocal = phx(a.starts_at);
  const endLocal = phx(a.ends_at || a.starts_at);
  const dateLocalIso = `${startLocal.getUTCFullYear()}-${pad(startLocal.getUTCMonth() + 1)}-${pad(startLocal.getUTCDate())}`;
  const locName = typeof a.location === 'string' ? a.location : (a.location && a.location.name) || '';
  const addressLines = [];
  if (locName) addressLines.push(locName);
  addressLines.push('955 East University Drive', 'Mesa, AZ, 85203');
  if (!locName) addressLines.push('United States');
  const eventId = inst.relationships && inst.relationships.event && inst.relationships.event.data && inst.relationships.event.data.id;
  return {
    eventId: eventId || '',
    name: a.name || 'Church Event',
    link: a.church_center_url || `${CHURCH_CENTER}/calendar`,
    allDay: !!a.all_day_event,
    startLocal,
    endLocal,
    month: startLocal.getUTCMonth(),
    day: startLocal.getUTCDate(),
    weekday: startLocal.getUTCDay(),
    year: startLocal.getUTCFullYear(),
    dateLocalIso,
    addressLines,
    description: '',
    googleUrl: googleCalendarLink(a.name, a.starts_at, a.ends_at || a.starts_at, a.all_day_event, addressLines.join(', ')),
  };
}

// PCO default header images are generic placeholders (URL contains /defaults/);
// only surface genuinely uploaded group images on the card.
function realHeaderImage(url) {
  if (!url) return '';
  if (url.indexOf('/defaults/') !== -1) return '';
  return url;
}

// Build a card model from a group event.
function groupCard(ev, groupName, locationName, headerImage) {
  const a = ev.attributes;
  const startLocal = phx(a.starts_at);
  const endLocal = phx(a.ends_at || a.starts_at);
  const dateLocalIso = `${startLocal.getUTCFullYear()}-${pad(startLocal.getUTCMonth() + 1)}-${pad(startLocal.getUTCDate())}`;
  const addressLines = [];
  if (locationName) addressLines.push(locationName);
  addressLines.push('955 East University Drive', 'Mesa, AZ, 85203');
  if (!locationName) addressLines.push('United States');
  const groupId = ev.relationships && ev.relationships.group && ev.relationships.group.data && ev.relationships.group.data.id;
  return {
    name: a.name || 'Group Event',
    link: groupId ? `${GROUPS_DIR}/${groupId}` : `${CHURCH_CENTER}/calendar`,
    allDay: false,
    startLocal,
    endLocal,
    month: startLocal.getUTCMonth(),
    day: startLocal.getUTCDate(),
    weekday: startLocal.getUTCDay(),
    year: startLocal.getUTCFullYear(),
    dateLocalIso,
    addressLines,
    description: (a.description || '').trim(),
    groupName: groupName || '',
    imageUrl: realHeaderImage(headerImage || ''),
    googleUrl: googleCalendarLink(a.name, a.starts_at, a.ends_at || a.starts_at, false, addressLines.join(', ')),
  };
}

// Whitelist = GH Actions variable `PCO_GROUP_WHITELIST`:
// COMMA-separated list (spaces allowed in names) of group identifiers.
// An entry may be a group id token, a group name, or a group type name.
// Entries are matched against group names/types using the closest match,
// so friendly names (e.g. "ROC Youth Group") work even if slightly different
// from the exact name in PCO. FAIL-CLOSED: an empty/unset whitelist matches
// NOTHING (nothing shows) — a whitelist, not a blacklist.
function parseWhitelist() {
  return (process.env.PCO_GROUP_WHITELIST || '')
    .split(',')
    .map((t) => t.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean);
}

// Optional calendar filter = GH Actions variable `PCO_CALENDAR_TAG`:
// comma-separated tag names. Only calendar events carrying at least one of
// these tags are shown. FAIL-CLOSED: empty/unset = no calendar events shown.
function parseCalendarTags() {
  return (process.env.PCO_CALENDAR_TAG || '')
    .split(',')
    .map((t) => t.trim().toLowerCase().replace(/^["']|["']$/g, ''))
    .filter(Boolean);
}

// Collapse a string to lowercase alphanumeric words for fuzzy comparison.
function norm(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ');
}

function bigrams(s) {
  const out = new Set();
  for (let i = 0; i < s.length - 1; i++) out.add(s.slice(i, i + 2));
  return out;
}

// 0..1 similarity: exact = 1, containment = 0.85, else bigram Dice overlap.
function similarity(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.85;
  const A = bigrams(a);
  const B = bigrams(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const g of A) if (B.has(g)) inter++;
  return (2 * inter) / (A.size + B.size);
}

// Resolve the whitelist to the set of matching group ids.
// Order: exact id -> exact name/type -> closest fuzzy name/type match.
function buildMatchedGroupIds(groupsById, whitelist) {
  const matched = new Set();
  if (!whitelist || !whitelist.length) return matched; // fail closed: nothing
  for (const token of whitelist) {
    const t = norm(token);
    const entries = Object.values(groupsById);
    // 1. exact id
    let hit = false;
    for (const g of entries) {
      if (String(g.id) === token.trim()) { matched.add(g.id); hit = true; }
    }
    if (hit) continue;
    // 2. exact name or type
    for (const g of entries) {
      if (norm(g.name) === t || norm(g.typeName) === t) { matched.add(g.id); hit = true; }
    }
    if (hit) continue;
    // 3. closest fuzzy match on name/type
    let bestScore = 0;
    const bestIds = [];
    for (const g of entries) {
      const s = Math.max(similarity(t, norm(g.name)), similarity(t, norm(g.typeName)));
      if (s > bestScore) { bestScore = s; bestIds.length = 0; bestIds.push(g.id); }
      else if (s === bestScore && s > 0) bestIds.push(g.id);
    }
    if (bestScore >= 0.5) bestIds.forEach((id) => matched.add(id));
  }
  return matched;
}

// Does a card's tag set match any configured calendar tag? Empty filter = no.
function inCalendarTag(cardTags, tags) {
  if (!tags || !tags.length) return false; // fail closed
  const card = (cardTags || []).map((t) => t.toLowerCase());
  return tags.some((t) => card.includes(t));
}

async function fetchAll() {
  const today = new Date().toISOString().slice(0, 10);

  // Local verifiability: allow mock data via MOCK=1 (no PCO creds needed).
  if (process.env.MOCK === '1') {
    const mkAllDay = {
      attributes: {
        name: 'Mock All-Day Retreat',
        starts_at: '2026-08-15T07:00:00Z',
        ends_at: '2026-08-16T06:59:59Z',
        all_day_event: true,
        location: '',
        church_center_url: `${CHURCH_CENTER}/calendar/event/998`,
      },
      relationships: { event: { data: { id: 'ev-998' } } },
    };
    const calCards = [
      calendarCard({ attributes: { name: 'Mock Website Sunday', starts_at: '2026-08-10T18:00:00Z', ends_at: null, all_day_event: false, location: 'Fireplace Hall', church_center_url: `${CHURCH_CENTER}/calendar/event/999` }, relationships: { event: { data: { id: 'ev-999' } } } }),
      calendarCard(mkAllDay),
    ];
    const calTagMap = { 'ev-999': ['website'], 'ev-998': ['unlisted'] };
    const tagFilteredCal = calCards.filter((c) => inCalendarTag(calTagMap[c.eventId], parseCalendarTags()));

    // Mock real PCO group names so closest-match can be exercised (e.g. a
    // fuzzy entry like "ROC Youth Club" still resolves to "ROC Youth Group").
    const mockGroups = {
      '1998843': { id: '1998843', name: 'ROC Youth Group', typeName: 'Youth' },
      '1691333': { id: '1691333', name: 'Men\u2019s Breakfast', typeName: 'Fellowship' },
      '734809': { id: '734809', name: 'Sunday Morning Life Group', typeName: 'Life Group' },
    };
    const mkGrp = (starts, groupId, locId, locName, img) => (
      Object.assign(
        groupCard(
          { attributes: { name: mockGroups[groupId].name, starts_at: starts, ends_at: null, description: 'All are welcome!' }, relationships: { group: { data: { id: groupId } }, location: { data: { id: locId } } } },
          mockGroups[groupId].name,
          locName || '',
          img || ''
        ),
        { groupId }
      )
    );
    const grpCards = [
      mkGrp('2026-11-29T18:00:00Z', '1998843', null, '', 'https://groups-production.s3.amazonaws.com/uploads/group/header_image/1998843/medium_real.png'),
      mkGrp('2026-11-29T16:00:00Z', '1691333', '1080835', 'Fireplace Hall', 'https://groups-production.s3.amazonaws.com/defaults/thumbnail_8.png'),
      mkGrp('2026-12-01T02:00:00Z', '734809', null, '', 'https://groups-production.s3.amazonaws.com/uploads/group/header_image/734809/medium_RESTORE.jpg'),
    ];
    const matchedMock = buildMatchedGroupIds(mockGroups, parseWhitelist());
    const whitelistedGrp = grpCards.filter((c) => matchedMock.has(c.groupId));
    if (parseWhitelist().length) {
      console.log(`Group whitelist active (${parseWhitelist().join(', ')}): kept ${whitelistedGrp.length}, dropped ${grpCards.length - whitelistedGrp.length}`);
    }
    return { calCards: tagFilteredCal, grpCards: whitelistedGrp, today };
  }

  const calRes = await api(`/calendar/v2/event_instances?where[starts_at][gt]=${today}&order=starts_at&per_page=30&include=event`);
  if (calRes.status !== 200) throw new Error(`calendar event_instances HTTP ${calRes.status}`);
  const calCards = (calRes.json.data || []).map((inst) => calendarCard(inst));

  // Optional: fetch event tags so calendar events can be whitelisted by tag.
  let calTagMap = {};
  const calTags = parseCalendarTags();
  if (calTags.length) {
    const evRes = await api(`/calendar/v2/events?per_page=100&include=tags`);
    if (evRes.status !== 200) throw new Error(`calendar events (tags) HTTP ${evRes.status}`);
    const tagNames = {};
    for (const t of evRes.json.included || []) {
      if (t.type === 'Tag') tagNames[t.id] = (t.attributes && t.attributes.name) || '';
    }
    for (const ev of evRes.json.data || []) {
      const tagIds = (ev.relationships && ev.relationships.tags && ev.relationships.tags.data || []).map((r) => r.id);
      calTagMap[ev.id] = tagIds.map((id) => tagNames[id]).filter(Boolean);
    }
  }
  const filteredCal = calTags.length ? calCards.filter((c) => inCalendarTag(calTagMap[c.eventId], calTags)) : calCards;
  if (calTags.length) {
    const droppedCal = calCards.length - filteredCal.length;
    console.log(`Calendar tag filter active (${calTags.join(', ')}): kept ${filteredCal.length}, dropped ${droppedCal}`);
  }

  const grpRes = await api(`/groups/v2/events?where[starts_at][gt]=${today}&order=starts_at&per_page=30&include=group,location`);
  if (grpRes.status !== 200) throw new Error(`group events HTTP ${grpRes.status}`);
  const byType = {};
  for (const inc of grpRes.json.included || []) {
    (byType[inc.type] = byType[inc.type] || []).push(inc);
  }
  const groupNames = {};
  const groupImages = {};
  const groupTypes = {};
  for (const g of byType.Group || []) {
    groupNames[g.id] = g.attributes && g.attributes.name;
    const hi = g.attributes && g.attributes.header_image;
    groupImages[g.id] = (hi && hi.original) || (hi && hi.medium) || '';
    const gt = g.relationships && g.relationships.group_type && g.relationships.group_type.data;
    if (gt && gt.id) groupTypes[g.id] = gt.id;
  }
  const locNames = {};
  for (const l of byType.Location || []) locNames[l.id] = l.attributes && l.attributes.name;

  // Resolve group type names in one call, then build per-group descriptors for whitelist matching.
  const typeIds = [...new Set(Object.values(groupTypes).filter(Boolean))];
  const typeNames = {};
  if (typeIds.length) {
    const tr = await api(`/groups/v2/group_types?per_page=100`);
    if (tr.status === 200) {
      for (const t of tr.json.data || []) typeNames[t.id] = t.attributes && t.attributes.name;
    }
  }

  const whitelist = parseWhitelist();
  const groupsById = {};
  for (const ev of grpRes.json.data || []) {
    const gId = ev.relationships && ev.relationships.group && ev.relationships.group.data && ev.relationships.group.data.id;
    if (gId && !(gId in groupsById)) {
      groupsById[gId] = {
        id: gId,
        name: groupNames[gId],
        typeName: groupTypes[gId] ? typeNames[groupTypes[gId]] : '',
      };
    }
  }
  const matchedGroupIds = buildMatchedGroupIds(groupsById, whitelist);
  let kept = 0;
  let dropped = 0;
  const grpCards = (grpRes.json.data || []).map((ev) => {
    const gId = ev.relationships && ev.relationships.group && ev.relationships.group.data && ev.relationships.group.data.id;
    if (!matchedGroupIds.has(gId)) {
      dropped++;
      return null;
    }
    kept++;
    const lId = ev.relationships && ev.relationships.location && ev.relationships.location.data && ev.relationships.location.data.id;
    return groupCard(ev, groupNames[gId], lId ? locNames[lId] : '', groupImages[gId]);
  }).filter(Boolean);

  if (whitelist && whitelist.length) {
    console.log(`Group whitelist active (${whitelist.join(', ')}): kept ${kept}, dropped ${dropped}`);
  } else {
    console.log('Group whitelist not configured — no group events shown (fail closed).');
  }

  return { calCards: filteredCal, grpCards, today };
}

async function regenerate() {
  if (process.env.MOCK !== '1' && (!APP_ID || !SECRET)) {
    throw new Error('Missing PCO_CLIENT_ID / PCO_SECRET environment variables');
  }
  console.log('Fetching upcoming events from Planning Center...');
  const { calCards, grpCards } = await fetchAll();
  console.log(`Calendar events: ${calCards.length}, Group events: ${grpCards.length}`);

  const calHtml = calCards && calCards.length
    ? `    <!-- Upcoming Events -->
    <div class="eventlist eventlist--upcoming">
${calCards.map((c) => renderCard(c)).join('\n')}
    </div>`
    : `    <!-- Upcoming Events -->
    <div class="eventlist eventlist--upcoming">
      <p class="eventlist-empty">No upcoming calendar events right now. Check back soon!</p>
    </div>`;

  const grpHtml = grpCards && grpCards.length
    ? `    <!-- Group Events -->
    <h2 class="eventlist-section-heading">Small Group &amp; Life Group Events</h2>
    <div class="eventlist eventlist--groups">
${grpCards.map((c) => renderCard(c)).join('\n')}
    </div>`
    : `    <!-- Group Events -->
    <h2 class="eventlist-section-heading">Small Group &amp; Life Group Events</h2>
    <div class="eventlist eventlist--groups">
      <p class="eventlist-empty">No upcoming group events right now. Check back soon!</p>
    </div>`;

  const newRegion = `${calHtml}\n${grpHtml}`;

  const eventsFilePath = path.join(__dirname, '../events.html');
  let content = fs.readFileSync(eventsFilePath, 'utf8');

  const upMarker = '<!-- Upcoming Events -->';
  const pastMarker = '<!-- Past Events -->';
  let start = content.indexOf(upMarker);
  const end = content.indexOf(pastMarker);
  if (start < 0 || end < 0 || end < start) {
    throw new Error('Could not find Upcoming/Past Events markers in events.html');
  }

  content = content.slice(0, start) + newRegion + '\n' + content.slice(end);
  fs.writeFileSync(eventsFilePath, content, 'utf8');
  console.log('Successfully updated events.html with latest PCO events!');
}

regenerate().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
