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

// Desired final field sets (sequence order matters for the rendered form).
const PLANS = {
  '1286060': [
    { label: 'Full Name', field_type: 'text', required: true, seq: 0, existsSeq: 0 },
    { label: 'Email Address', field_type: 'text', required: true, seq: 1 },
    { label: 'Phone Number', field_type: 'phone_number', required: false, seq: 2, existsSeq: 2 },
    { label: "Tell us how you'd like to take your next step", field_type: 'text', required: false, seq: 3 },
  ],
  '1286061': [
    { label: 'Nombre Completo', field_type: 'text', required: true, seq: 0, existsSeq: 0 },
    { label: 'Correo Electrónico', field_type: 'text', required: true, seq: 1 },
    { label: 'Número de Teléfono', field_type: 'phone_number', required: false, seq: 2, existsSeq: 2 },
    { label: 'Cuéntanos cómo te gustaría dar tu próximo paso', field_type: 'text', required: false, seq: 3 },
  ],
};

for (const [formId, plan] of Object.entries(PLANS)) {
  console.log(`\n== form ${formId}: current fields ==`);
  const cur = await api(`/people/v2/forms/${formId}/fields`);
  const existing = (cur.json && cur.json.data || []).map((f) => ({ id: f.id, label: f.attributes.label, type: f.attributes.field_type, seq: f.attributes.sequence }));
  console.log(JSON.stringify(existing, null, 1));

  for (const want of plan) {
    const match = existing.find((f) => f.label === want.label);
    if (match) {
      console.log(`EXISTS ${match.type} "${match.label}" (id ${match.id}) — skipping`);
      continue;
    }
    const r = await api(`/people/v2/forms/${formId}/fields`, {
      method: 'POST',
      body: { data: { type: 'FormField', attributes: { field_type: want.field_type, label: want.label, required: want.required, sequence: want.seq } } },
    });
    const d = r.json && r.json.data;
    if (d) console.log(`ADDED  ${want.field_type} "${want.label}" (seq ${want.seq}) -> id ${d.id}`);
    else console.log(`FAIL   "${want.label}": status ${r.status} ${JSON.stringify(r.json || r.raw).slice(0, 800)}`);
  }
}

console.log('\n== final verification (fields per form) ==');
for (const formId of Object.keys(PLANS)) {
  const r = await api(`/people/v2/forms/${formId}/fields?per_page=100`);
  const list = (r.json && r.json.data || []).sort((a, b) => a.attributes.sequence - b.attributes.sequence)
    .map((f) => `${f.attributes.sequence}.${f.attributes.field_type}:"${f.attributes.label}"${f.attributes.required ? '(req)' : ''}`);
  console.log(formId + ':', list.join(' | '));
}
