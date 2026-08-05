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

console.log('\n== calendar/v2/events attributes dump ==');
try {
  const r = await api('/calendar/v2/events?per_page=5&include=location');
  console.log('status', r.status);
  const list = r.json && r.json.data || [];
  console.log('count', list.length);
  if (list[0]) {
    console.log('top-level keys:', Object.keys(list[0]).join(','));
    console.log('attrs:', JSON.stringify(list[0].attributes, null, 1).slice(0, 1800));
    console.log('rels:', JSON.stringify(list[0].relationships, null, 1).slice(0, 1200));
  }
  const inc = r.json && r.json.included || [];
  if (inc.length) {
    const byType = {};
    for (const i of inc) { (byType[i.type] = byType[i.type] || []).push(i); }
    console.log('included types:', Object.keys(byType).join(','));
    for (const t of Object.keys(byType)) {
      console.log(t + ':', byType[t].slice(0, 5).map((x) => x.id + '=' + ((x.attributes && (x.attributes.name || x.attributes.name_plural || x.attributes.title)) || '?')).join(' | '));
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
