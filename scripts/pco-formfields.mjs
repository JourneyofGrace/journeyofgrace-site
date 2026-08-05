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

// Step 1: dump the FULL attribute set of the existing populated form (Plan Your Visit)
console.log('\n== GET /people/v2/forms/1284759 (populated Visit form — full attrs) ==');
try {
  const r = await api('/people/v2/forms/1284759');
  console.log('status', r.status);
  const f = r.json && r.json.data;
  if (f) {
    console.log('attribute keys:', Object.keys(f.attributes).join(', '));
    console.log('form_structure:', JSON.stringify(f.attributes.form_structure, null, 1).slice(0, 6000));
  } else {
    console.log('resp', JSON.stringify(r.json || r.raw).slice(0, 2000));
  }
} catch (e) { console.log('ERR', e.message); }

// Step 2: dump the two new empty forms to see their current form_structure
for (const id of ['1286060', '1286061']) {
  console.log(`\n== GET /people/v2/forms/${id} ==`);
  try {
    const r = await api(`/people/v2/forms/${id}`);
    const f = r.json && r.json.data;
    if (f) {
      console.log('name:', f.attributes && f.attributes.name, '| keys:', f.attributes && Object.keys(f.attributes).join(', '));
      console.log('form_structure:', JSON.stringify(f.attributes && f.attributes.form_structure).slice(0, 2000));
    } else {
      console.log('status', r.status, '|', JSON.stringify(r.json || r.raw).slice(0, 1500));
    }
  } catch (e) { console.log('ERR', e.message); }
}
