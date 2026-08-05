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

// Probe candidate field_type enums on form 1286060. POST then DELETE successful
// ones so we leave no junk behind.
const candidates = [
  'text', 'textarea', 'text_area', 'paragraph', 'long_text', 'multi_line',
  'email', 'email_address', 'email_text', 'emails', 'emailaddy', 'email_add',
  'phone', 'phone_number', 'phonenumber', 'mobile',
  'select', 'dropdown', 'single_select', 'choice', 'choose_one',
  'radio', 'radio_buttons', 'radio_group', 'multiple_choice', 'checkboxes',
  'checkbox', 'boolean', 'yes_no',
  'number', 'numeric', 'integer', 'float',
  'date', 'datetime', 'date_time', 'day', 'month_year',
  'url', 'website', 'link', 'social',
  'name', 'full_name', 'first_last_name', 'person_name',
  'address', 'address_line', 'street_address',
  'notes', 'comment', 'message', 'long_answer', 'short_answer',
];

for (const t of candidates) {
  try {
    const r = await api(`/people/v2/forms/1286060/fields`, {
      method: 'POST',
      body: { data: { type: 'FormField', attributes: { field_type: t, label: 'probe ' + t, required: false } } },
    });
    const d = r.json && r.json.data;
    if (d) {
      console.log('VALID ', t, '-> id', d.id);
      const del = await api(`/people/v2/forms/1286060/fields/${d.id}`, { method: 'DELETE' });
      console.log('       cleanup DELETE status', del.status);
    } else {
      console.log('invalid', t, '(' + (r.status || '?') + ')');
    }
  } catch (e) { console.log('ERR ', t, e.message); }
}
