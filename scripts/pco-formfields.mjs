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

const FORMS = {
  '1286060': { description: 'Next steps for new visitors and current attenders at Journey of Grace Church.' },
  '1286061': { description: 'Próximos pasos para nuevos visitantes y asistentes actuales en Journey of Grace Church.' },
};

for (const [formId, attrs] of Object.entries(FORMS)) {
  console.log(`\n== form ${formId}: pre-PATCH state ==`);
  const g = await api(`/people/v2/forms/${formId}`);
  const fa = g.json && g.json.data && g.json.data.attributes;
  console.log('active:', fa.active, '| description:', fa.description, '| archived:', fa.archived);

  console.log('PATCH active=true + description...');
  const r = await api(`/people/v2/forms/${formId}`, {
    method: 'PATCH',
    body: { data: { type: 'Form', id: formId, attributes: { active: true, description: attrs.description } } },
  });
  console.log('PATCH status', r.status);
  if (r.json && r.json.data) {
    const a2 = r.json.data.attributes;
    console.log('post: active:', a2.active, '| description:', a2.description, '| public_url:', a2.public_url);
  } else {
    console.log('resp', JSON.stringify(r.json || r.raw).slice(0, 1500));
  }
}
