import https from 'https';

const APP_ID = process.env.PCO_CLIENT_ID || process.env.PCO_APP_ID;
const SECRET = process.env.PCO_SECRET;

function api(path, opts) {
  opts = opts || {};
  return new Promise((resolve, reject) => {
    const auth = 'Basic ' + Buffer.from(`${APP_ID}:${SECRET}`).toString('base64');
    const body = opts.body ? JSON.stringify(opts.body) : null;
    const req = https.request(
      {
        hostname: 'api.planningcenteronline.com',
        path,
        method: opts.method || 'GET',
        headers: { Authorization: auth, Accept: 'application/json', 'Content-Type': 'application/json', 'Content-Length': body ? Buffer.byteLength(body) : 0 },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c.toString()));
        res.on('end', () => {
          try { resolve({ status: res.statusCode, json: JSON.parse(data) }); }
          catch { resolve({ status: res.statusCode, raw: data.slice(0, 2000) }); }
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

console.log('== forms: id/name/public_url ==');
try {
  const r = await api('/people/v2/forms?per_page=100');
  console.log('status', r.status);
  for (const f of r.json && r.json.data || []) {
    console.log(f.id, '|', (f.attributes && f.attributes.name) || '', '|', (f.attributes && f.attributes.public_url) || 'NO_PUBLIC_URL');
  }
} catch (e) { console.log('ERR', e.message); }

console.log('\n== groups/v2/events upcoming (where starts_at>now, order -starts_at) ==');
try {
  const now = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10);
  const r = await api(`/groups/v2/events?where[starts_at][gt]=${now}&order=-starts_at&per_page=10`);
  console.log('status', r.status);
  const rows = (r.json && r.json.data || []).map((e) => ({
    id: e.id,
    name: e.attributes.name,
    starts_at: e.attributes.starts_at,
    ends_at: e.attributes.ends_at,
    description: (e.attributes.description || '').slice(0, 120),
    group_id: e.relationships && e.relationships.group && e.relationships.group.data && e.relationships.group.data.id,
    location: e.relationships && e.relationships.location && e.relationships.location.data && e.relationships.location.data.id,
  }));
  console.log('count', rows.length);
  console.log(JSON.stringify(rows, null, 1));
} catch (e) { console.log('ERR', e.message); }

console.log('\n== calendar v1 access check ==');
try {
  for (const p of ['/calendar/v1/calendars?per_page=5', '/calendar/v1/events/18441760', '/calendar/v1/event_instances?per_page=3']) {
    const r = await api(p);
    console.log(r.status, p, '|', JSON.stringify(r.json || r.raw).slice(0, 300));
  }
} catch (e) { console.log('ERR', e.message); }

console.log('\n== calendar/v2/events full attr union + include==');
try {
  const r = await api('/calendar/v2/events?per_page=30&include=owner,calendar,location');
  const evs = r.json && r.json.data || [];
  console.log('status', r.status, 'count', evs.length);
  const attrKeys = new Set();
  const relKeys = new Set();
  const samples = [];
  for (const e of evs) {
    Object.keys(e.attributes || {}).forEach((k) => attrKeys.add(k));
    Object.keys(e.relationships || {}).forEach((k) => relKeys.add(k));
    samples.push({ id: e.id, name: (e.attributes.name || '').slice(0, 40), all: e.attributes });
  }
  console.log('attr keys:', [...attrKeys].sort().join(','));
  console.log('rel keys:', [...relKeys].sort().join(','));
  const withTime = samples.filter((s) => s.all.starts_at || s.all.starts_at_override || s.all.starts);
  console.log('events with any start-ish key:', withTime.length, 'of', samples.length);
  console.log('sample1 full attrs:', JSON.stringify(samples[0].all, null, 1).slice(0, 1500));
  const inc = r.json && r.json.included || [];
  const itypes = {};
  for (const i of inc) { (itypes[i.type] = itypes[i.type] || []).push(i); }
  console.log('include types:', Object.keys(itypes).join(','), 'counts', Object.fromEntries(Object.entries(itypes).map(([k, v]) => [k, v.length])));
} catch (e) { console.log('ERR', e.message); }

console.log('\n== calendar v2 event_instances deep (upcoming filter + includes) ==');
try {
  const now = new Date().toISOString().slice(0, 10);
  const tries = [
    `/calendar/v2/event_instances?where[published_starts_at][gt]=${now}&per_page=3&include=location,event`,
    `/calendar/v2/event_instances?where[starts_at][gt]=${now}&per_page=3&include=location,event`,
    `/calendar/v2/event_instances?order=published_starts_at&per_page=3&include=location,event`,
  ];
  for (const p of tries) {
    const r = await api(p);
    const d = r.json && r.json.data || [];
    const inc = r.json && r.json.included || [];
    const itypes = {};
    for (const i of inc) { (itypes[i.type] = itypes[i.type] || []).push(i); }
    console.log(r.status, p, '| count:', d.length, '| includeTypes:', Object.keys(itypes).join(','));
    if (d[0]) {
      const s = d[0];
      console.log('   first name:', s.attributes.name, '| ps:', s.attributes.published_starts_at, '| pe:', s.attributes.published_ends_at);
      console.log('   rels:', JSON.stringify(s.relationships, null, 1).slice(0, 800));
      for (const t of Object.keys(itypes)) {
        if (t.toLowerCase().includes('location')) {
          console.log('   ' + t + ':', itypes[t].slice(0, 5).map((x) => x.id + '=' + (x.attributes.name)).join(' | '));
        }
      }
      if (d[0].attributes.church_center_url) console.log('   cc_url:', d[0].attributes.church_center_url);
      if (d[0].attributes.all_day_event !== undefined) console.log('   all_day:', d[0].attributes.all_day_event);
    }
  }
} catch (e) { console.log('ERR', e.message); }

console.log('\n== group event with location/group includes (capitalized types) ==');
try {
  const now = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10);
  const r = await api(`/groups/v2/events?where[starts_at][gt]=${now}&order=starts_at&per_page=5&include=location,group`);
  console.log('status', r.status);
  const inc = r.json && r.json.included || [];
  const byType = {};
  for (const i of inc) { (byType[i.type] = byType[i.type] || []).push(i); }
  console.log('included types:', Object.keys(byType).join(','));
  for (const t of Object.keys(byType)) {
    console.log(t + ':', byType[t].slice(0, 10).map((x) => x.id + '=' + (x.attributes && x.attributes.name)).join(' | '));
  }
} catch (e) { console.log('ERR', e.message); }
