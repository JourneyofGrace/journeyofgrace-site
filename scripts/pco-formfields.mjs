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

// Remove the redundant custom Full Name / Email fields we added (PCO already
// provides standard "Your name / Last name / Email address" identity fields),
// keeping Phone Number + the "next step" message field.
const DELETIONS = {
  '1286060': ['Full Name', 'Email Address'],
  '1286061': ['Nombre Completo', 'Correo Electrónico'],
};

for (const [formId, labelsToDelete] of Object.entries(DELETIONS)) {
  console.log(`\n== form ${formId}: list fields ==`);
  const r = await api(`/people/v2/forms/${formId}/fields`);
  const fields = r.json && r.json.data || [];
  for (const f of fields) {
    const label = f.attributes.label;
    if (labelsToDelete.includes(label)) {
      const d = await api(`/people/v2/forms/${formId}/fields/${f.id}`, { method: 'DELETE' });
      console.log(`DELETE "${label}" (id ${f.id}) -> status ${d.status}`);
    } else {
      console.log(`keep   "${label}" (id ${f.id}, ${f.attributes.field_type})`);
    }
  }
}

console.log('\n== final state ==');
for (const formId of Object.keys(DELETIONS)) {
  const r = await api(`/people/v2/forms/${formId}/fields?per_page=100`);
  const list = (r.json && r.json.data || []).sort((a, b) => a.attributes.sequence - b.attributes.sequence)
    .map((f) => `${f.attributes.sequence}.${f.attributes.field_type}:"${f.attributes.label}"${f.attributes.required ? '(req)' : ''}`);
  console.log(formId + ':', list.join(' | '));
}
