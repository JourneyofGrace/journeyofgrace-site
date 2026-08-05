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
          catch { resolve({ status: res.statusCode, raw: data.slice(0, 3000) }); }
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

console.log('\n== full single form raw (relationships + links) ==');
try {
  const r = await api('/people/v2/forms/1284759');
  const f = r.json && r.json.data;
  console.log('status', r.status);
  if (f) {
    console.log('relationships:', JSON.stringify(f.relationships, null, 1).slice(0, 2000));
    console.log('links:', JSON.stringify(f.links, null, 1).slice(0, 1000));
  }
} catch (e) { console.log('ERR', e.message); }

// Candidate sub-resource endpoints for form fields
console.log('\n== candidate field endpoints (404/200 check) ==');
const candidates = [
  '/people/v2/forms/1284759/form_fields?per_page=5',
  '/people/v2/forms/1284759/fields?per_page=5',
  '/people/v2/forms/1284759/form_field_groups?per_page=5',
  '/people/v2/form_fields?per_page=5',
  '/people/v2/fields?per_page=5',
  '/people/v2/forms/1284759/definitions?per_page=5',
];
for (const p of candidates) {
  try {
    const r = await api(p);
    const k = r.json && r.json.data && r.json.data[0] ? Object.keys(r.json.data[0]).slice(0, 6).join(',') : '';
    const n = r.json && r.json.data ? r.json.data.length : '';
    console.log(r.status, p, '| count:', n, '| keys:', k);
    if (r.status !== 200 && r.json && r.json.errors) {
      console.log('   detail:', (r.json.errors[0] && (r.json.errors[0].detail || r.json.errors[0].title)) || '');
    }
  } catch (e) { console.log('ERR', p, e.message); }
}
