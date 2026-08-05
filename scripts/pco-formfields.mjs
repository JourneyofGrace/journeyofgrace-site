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
          catch { resolve({ status: res.statusCode, raw: data.slice(0, 4000) }); }
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

const FORMS = {
  '1286060': [
    { field_type: 'text', label: 'Full Name', required: true, sequence: 0 },
    { field_type: 'email', label: 'Email Address', required: true, sequence: 1 },
    { field_type: 'phone_number', label: 'Phone Number', required: false, sequence: 2 },
    { field_type: 'text_area', label: 'Tell us how to help you take your next step', required: false, sequence: 3 },
  ],
  '1286061': [
    { field_type: 'text', label: 'Nombre Completo', required: true, sequence: 0 },
    { field_type: 'email', label: 'Correo Electrónico', required: true, sequence: 1 },
    { field_type: 'phone_number', label: 'Número de Teléfono', required: false, sequence: 2 },
    { field_type: 'text_area', label: 'Cuéntanos cómo podemos ayudarte a dar tu próximo paso', required: false, sequence: 3 },
  ],
};

for (const [formId, fields] of Object.entries(FORMS)) {
  console.log(`\n== POST fields to form ${formId} ==`);
  for (const f of fields) {
    try {
      const r = await api(`/people/v2/forms/${formId}/fields`, {
        method: 'POST',
        body: { data: { type: 'FormField', attributes: { field_type: f.field_type, label: f.label, required: f.required, sequence: f.sequence } } },
      });
      const d = r.json && r.json.data;
      if (d) {
        console.log('OK  ', f.field_type, '|', f.label, '-> id', d.id);
      } else {
        console.log('FAIL', f.label, '| status', r.status, '|', JSON.stringify(r.json || r.raw).slice(0, 1200));
      }
    } catch (e) { console.log('ERR ', f.label, e.message); }
  }
}
