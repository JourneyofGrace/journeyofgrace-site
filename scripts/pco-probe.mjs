import https from 'https';

const APP_ID = process.env.PCO_CLIENT_ID || process.env.PCO_APP_ID;
const SECRET = process.env.PCO_SECRET;

function api(path) {
  return new Promise((resolve, reject) => {
    const auth = 'Basic ' + Buffer.from(`${APP_ID}:${SECRET}`).toString('base64');
    const req = https.request(
      { hostname: 'api.planningcenteronline.com', path, method: 'GET', headers: { Authorization: auth, Accept: 'application/json' } },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c.toString()));
        res.on('end', () => {
          try { resolve({ status: res.statusCode, json: JSON.parse(body) }); }
          catch { resolve({ status: res.statusCode, raw: body.slice(0, 2000) }); }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

const summarize = (data, attrs) => (data && data.data || []).map((r) => {
  const a = r.attributes || {};
  const out = { id: r.id };
  for (const k of attrs) if (a[k] !== undefined) out[k] = a[k];
  return out;
});

console.log('== /people/v2/forms (list) ==');
try {
  const r = await api('/people/v2/forms?per_page=100');
  console.log('status', r.status);
  console.log(JSON.stringify(summarize(r.json, ['name']), null, 1));
} catch (e) { console.log('ERR', e.message); }

console.log('== /people/v2/forms/1284759 (structure keys) ==');
try {
  const r = await api('/people/v2/forms/1284759');
  console.log('status', r.status);
  const f = r.json && r.json.data;
  if (f) {
    const a = f.attributes || {};
    console.log('name:', a.name);
    const fs = a.form_structure;
    console.log('form_structure type:', typeof fs, fs ? (Array.isArray(fs) ? 'array' : Object.keys(fs)) : 'none');
    const json = JSON.stringify(a);
    console.log('keys:', Object.keys(a));
    console.log('structure (compact, first 2500 chars):');
    console.log(typeof fs === 'object' ? JSON.stringify(fs).slice(0, 2500) : String(fs).slice(0, 2500));
  } else {
    console.log('raw:', JSON.stringify(r.json).slice(0, 1000));
  }
} catch (e) { console.log('ERR', e.message); }

console.log('== /groups/v2/events ==');
try {
  const r = await api('/groups/v2/events?per_page=3');
  console.log('status', r.status);
  const list = r.json && r.json.data;
  if (list && list.length) {
    console.log('first event full record (first 2500 chars):');
    console.log(JSON.stringify(list[0]).slice(0, 2500));
    console.log('compact all:', JSON.stringify(list.map((e) => ({ id: e.id, attrs: e.attributes || {} }))).slice(0, 2000));
  } else {
    console.log('response:', JSON.stringify(r.json).slice(0, 2000));
  }
} catch (e) { console.log('ERR', e.message); }

console.log('== /groups/v2/groups (names/ids) ==');
try {
  const r = await api('/groups/v2/groups?per_page=100');
  console.log('status', r.status);
  console.log(JSON.stringify(summarize(r.json, ['name', 'public', 'state']), null, 1));
} catch (e) { console.log('ERR', e.message); }
