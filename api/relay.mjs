#!/usr/bin/env node
/**
 * Journey of Grace - Planning Center form submission relay (sidecar).
 *
 * Why: Church Center forms (SPA) cannot be submitted directly from a purely
 * static page (Cloudflare Turnstile + CORS + no classic form action). The
 * official People API needs a secret token, which can never live in static
 * client JS. This tiny dependency-free relay holds the token as a server-side
 * environment variable and forwards form submissions to the People API
 * `POST /people/v2/forms/{form_id}/form_submissions` endpoint.
 *
 * The token NEVER leaves this process: client pages only ever talk to
 * /api/forms/:id/submit on the same origin (or a configured CORS origin).
 *
 * Two payload styles are accepted at POST /api/forms/:id/submit:
 *   1. Native relay mode (used by the site's themed static forms):
 *      { data: { values: { "Name": "Jane", "Email Address": "j@x.com", ... } } }
 *      Labels are matched to the form's fields server-side (GET /fields),
 *      "Name" feeds person_attributes.first_name/last_name, the email field
 *      feeds person emails, and option-type values are resolved to option ids.
 *   2. Prebuilt JSON:API payload: forwarded verbatim to PCO (backward compat,
 *      see docs/planning-center.md).
 *
 * Environment (see api/.env.example; set in a gitignored api/.env one API here):
 *   PCO_CLIENT_ID / PCO_SECRET   - Planning Center Personal Access Token pair
 *                                  (client_id + secret, HTTP Basic auth).
 *                                  Generate at developer.planning.center.
 *   PCO_FORM_ID                  - comma-separated allowlist of form ids this
 *                                  relay will accept (required; prevents open proxy).
 *   PORT                         - listen port (default 3000).
 *   ALLOWED_ORIGIN               - optional CORS allow-origin (default *).
 *   MOCK                         - "1" to dry-run locally WITHOUT touching PCO
 *                                  (logs the payload and responds ok).
 */
import http from 'node:http';

const PORT = Number(process.env.PORT || 3000);
const MOCK = process.env.MOCK === '1' || process.env.MOCK === 'true';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

const clientId = (process.env.PCO_CLIENT_ID || '').trim();
const secret = (process.env.PCO_SECRET || '').trim();
const formAllowlist = (process.env.PCO_FORM_ID || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const PCO_SUBMIT = (formId) =>
  `https://api.planningcenteronline.com/people/v2/forms/${encodeURIComponent(formId)}/form_submissions?include=person`;
const PCO_PERSON_ADDRESSES = (personId) =>
  `https://api.planningcenteronline.com/people/v2/people/${encodeURIComponent(personId)}/addresses`;
const PCO_PERSON_PHONES = (personId) =>
  `https://api.planningcenteronline.com/people/v2/people/${encodeURIComponent(personId)}/phone_numbers`;
const PCO_FIELDS = (formId) =>
  `https://api.planningcenteronline.com/people/v2/forms/${encodeURIComponent(formId)}/fields?per_page=100`;
const PCO_FIELD_OPTIONS = (formId, fieldId) =>
  `https://api.planningcenteronline.com/people/v2/forms/${encodeURIComponent(formId)}/fields/${encodeURIComponent(fieldId)}/options?per_page=100`;

// Field types whose submitted value must be an OPTION ID, not the label text.
const OPTION_FIELD_TYPES = new Set([
  'checkboxes', 'dropdown', 'workflow_checkboxes', 'workflow_dropdown',
]);

// Lowercase + strip punctuation so site field names ("City or Neighborhood")
// can be matched to PCO form field labels ("City or neighborhood").
function normalizeKey(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

async function pcoGet(url, auth) {
  const res = await fetch(url, {
    headers: { 'Authorization': auth, 'Accept': 'application/json' },
  });
  const text = await res.text();
  let body = null;
  try { body = JSON.parse(text); } catch { /* non-JSON body */ }
  if (!res.ok) {
    const err = new Error(`PCO GET ${url} -> ${res.status}: ${(text || '').slice(0, 300)}`);
    err.pcoStatus = res.status;
    throw err;
  }
  return body;
}

/**
 * Build a PCO FormSubmission payload from label-keyed values sent by the
 * static site (e.g. { data: { values: { "Name": "Jane", "Email Address": "..." } } }).
 *
 * "Name"/"Nombre" and the email field are IMPLICIT person fields on PCO forms
 * (there is no custom field for them) and always feed person_attributes.
 * Every other label is resolved to its FormField id (GET /forms/{id}/fields);
 * option-type fields are resolved label -> option id, and checkbox groups
 * (array values) emit one FormSubmissionValue per selected option.
 */
async function buildSubmissionPayload(formId, values, auth) {
  const fieldsRes = await pcoGet(PCO_FIELDS(formId), auth);
  const fields = (fieldsRes.data || []).map((f) => ({
    id: f.id,
    label: (f.attributes && f.attributes.label) || '',
    fieldType: (f.attributes && f.attributes.field_type) || 'string',
  }));

  const byKey = new Map();
  for (const f of fields) byKey.set(normalizeKey(f.label), f);

  const person = {};
  const included = [];
  let address = null;
  let phone = null;

  // The paper card's address lines (Street/City/State/Zip) are written to
  // the person's Address list after the submission (see the submit handler).
  // They are ALSO written as a FormSubmissionValue (value must be an object of
  // street_line_1/city/state/zip — a plain string makes PCO 500) so the
  // address shows up on the form submission itself.
  const addressField = fields.find((f) => f.fieldType === 'address');
  if (addressField) {
    const parts = {};
    for (const key of ['Street', 'City', 'State', 'Zip']) {
      const part = String(values[key] || '').trim();
      if (part) parts[key] = part;
    }
    if (Object.keys(parts).length) {
      address = {
        street_line_1: parts.Street || '',
        city: parts.City || '',
        state: parts.State || '',
        zip: parts.Zip || '',
      };
      included.push({
        type: 'FormSubmissionValue',
        attributes: { value: address },
        relationships: { form_field: { data: { type: 'FormField', id: addressField.id } } },
      });
      for (const key of ['Street', 'City', 'State', 'Zip']) delete values[key];
    }
  }

  for (const [label, rawValue] of Object.entries(values)) {
    const norm = normalizeKey(label);
    const picked = Array.isArray(rawValue) ? rawValue : [rawValue];
    const nonEmpty = picked
      .map((v) => String(v == null ? '' : v).trim())
      .filter(Boolean);
    if (!nonEmpty.length) continue; // PCO silently drops blank values anyway

    // Implicit person fields: never custom fields on the form.
    if (norm === 'name' || norm === 'nombre') {
      const parts = nonEmpty[0].split(/\s+/);
      person.first_name = parts.shift();
      if (parts.length) person.last_name = parts.join(' ');
      continue;
    }
    if (/email|correo/.test(norm)) {
      person.emails_attributes = [{ location: 'Work', address: nonEmpty[0] }];
      continue;
    }

    const field = byKey.get(norm);
    if (!field) {
      // Phone has no implicit person slot on form submissions, so map it to a
      // phone_number custom field when the form has one (the visit forms do);
      // otherwise collect it here and write it to the person's phone list
      // after the submission (see the submit handler).
      if (/phone/.test(norm)) {
        const phoneField = fields.find((f) => f.fieldType === 'phone_number');
        if (phoneField) {
          for (const v of nonEmpty) {
            included.push({
              type: 'FormSubmissionValue',
              attributes: { value: { number: v, location: 'Mobile' } },
              relationships: { form_field: { data: { type: 'FormField', id: phoneField.id } } },
            });
          }
          continue;
        }
        phone = nonEmpty[0];
        continue;
      }
      console.warn(`[relay] no field on form ${formId} matching "${label}"`);
      continue;
    }

    const pushValue = (value) => {
      included.push({
        type: 'FormSubmissionValue',
        attributes: { value },
        relationships: { form_field: { data: { type: 'FormField', id: field.id } } },
      });
    };

    if (OPTION_FIELD_TYPES.has(field.fieldType)) {
      // One FormSubmissionValue per selected option, resolved to option ids.
      const optsRes = await pcoGet(PCO_FIELD_OPTIONS(formId, field.id), auth);
      const opts = (optsRes && optsRes.data) || [];
      for (const v of nonEmpty) {
        const hit = opts.find((o) =>
          normalizeKey(o.attributes && o.attributes.label) === normalizeKey(v));
        pushValue(hit ? hit.id : v);
      }
    } else if (field.fieldType === 'boolean') {
      pushValue(nonEmpty[0] === 'true' ? 'true' : 'false');
    } else if (field.fieldType === 'phone_number') {
      // Phone-number fields expect structured number/location attributes on
      // the submission value (PCO 422s on a bare string).
      for (const v of nonEmpty) {
        included.push({
          type: 'FormSubmissionValue',
          attributes: { value: { number: v, location: 'Mobile' } },
          relationships: { form_field: { data: { type: 'FormField', id: field.id } } },
        });
      }
    } else {
      for (const v of nonEmpty) pushValue(v);
    }
  }

  const data = { type: 'FormSubmission', attributes: {} };
  if (person.first_name || person.last_name) data.attributes.person_attributes = person;
  return { data, included, address, phone };
}

function missingCreds() {
  const missing = [];
  if (!clientId) missing.push('PCO_CLIENT_ID');
  if (!secret) missing.push('PCO_SECRET');
  if (!formAllowlist.length) missing.push('PCO_FORM_ID');
  return missing;
}

function send(res, status, body, requestOrigin) {
  const buf = Buffer.from(JSON.stringify(body), 'utf8');
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': buf.length,
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin',
  });
  res.end(buf);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1e6) {
        reject(new Error('payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const method = req.method || 'GET';

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    return res.end();
  }

  if (method === 'GET' && url.pathname === '/api/health') {
    return send(res, 200, {
      ok: true,
      mock: MOCK,
      creds: missingCreds().length === 0,
      forms: formAllowlist,
    });
  }

  if (method === 'POST' && /^\/api\/forms\/[^/]+\/submit$/.test(url.pathname)) {
    const formId = url.pathname.split('/')[3];

    if (!formAllowlist.includes(formId)) {
      return send(res, 403, { ok: false, error: `form ${formId} is not allowlisted` });
    }
    if (!MOCK && missingCreds().length) {
      return send(res, 500, {
        ok: false,
        error: `Missing required environment variables: ${missingCreds().join(', ')}. ` +
          'Set them in api/.env (see api/.env.example). They must hold the Planning Center ' +
          'Personal Access Token; they are never exposed to the browser.',
      });
    }

    let payload;
    try {
      payload = JSON.parse(await readBody(req));
    } catch (e) {
      return send(res, 400, { ok: false, error: 'invalid JSON body' });
    }
    if (!payload || typeof payload !== 'object' || !payload.data) {
      return send(res, 400, {
        ok: false,
        error: "body must be an object with a 'data' property mirroring the " +
          'PCO FormSubmission payload (see docs/planning-center.md)',
      });
    }

    // Native relay mode: the site sends { data: { values: { label: value } } }
    // and the relay builds the PCO payload server-side (label -> field id,
    // Name -> person_attributes, option labels -> option ids).
    const labelKeyed =
      payload.data && typeof payload.data === 'object' &&
      typeof payload.data.values === 'object' && payload.data.values !== null &&
      !payload.data.attributes;

    if (MOCK) {
      console.log('[relay][mock] would POST', PCO_SUBMIT(formId));
      console.log('[relay][mock] payload', JSON.stringify(payload));
      if (labelKeyed) {
        console.log('[relay][mock] label-keyed values', JSON.stringify(payload.data.values));
      }
      return send(res, 200, { ok: true, mock: true, formId });
    }

    const auth = 'Basic ' + Buffer.from(`${clientId}:${secret}`).toString('base64');
    try {
      const outbound = labelKeyed
        ? await buildSubmissionPayload(formId, payload.data.values, auth)
        : payload;

      const pco = await fetch(PCO_SUBMIT(formId), {
        method: 'POST',
        headers: {
          'Authorization': auth,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(outbound),
      });
      const text = await pco.text();
      let pcoBody = null;
      try { pcoBody = JSON.parse(text); } catch { pcoBody = text.slice(0, 500); }
      console.log(`[relay] PCO respond placeholder -> ${pco.status}`);
      if (!pco.ok) {
        console.log(`[relay] PCO error body: ${JSON.stringify(pcoBody).slice(0, 600)}`);
      }

      // The address field cannot be written as a FormSubmissionValue (PCO
      // 500s), and phone numbers on forms without a phone_number field have
      // no value slot either, so once the submission exists, write both to
      // the matched/created person's profile lists.
      let addressStatus = null;
      let phoneStatus = null;
      if (pco.ok && (outbound.address || outbound.phone)) {
        const personId = Array.isArray(pcoBody.included)
          ? (pcoBody.included.find((i) => i.type === 'Person') || {}).id
          : null;
        if (personId) {
          if (outbound.address) {
            try {
              const addrRes = await fetch(PCO_PERSON_ADDRESSES(personId), {
                method: 'POST',
                headers: {
                  'Authorization': auth,
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                },
                body: JSON.stringify({
                  data: {
                    type: 'Address',
                    attributes: {
                      location: 'Home',
                      street_line_1: outbound.address.street_line_1,
                      city: outbound.address.city,
                      state: outbound.address.state,
                      zip: outbound.address.zip,
                      country_code: 'US',
                    },
                  },
                }),
              });
              const addrText = await addrRes.text();
              let addrBody = null;
              try { addrBody = JSON.parse(addrText); } catch { addrBody = addrText.slice(0, 500); }
              addressStatus = addrRes.status;
              console.log(`[relay] address write for person ${personId} -> ${addrRes.status}`);
              if (!addrRes.ok) {
                console.error('[relay] address write failed', addrBody && addrBody.errors);
              }
            } catch (err) {
              addressStatus = 'error';
              console.error('[relay] address write request failed', err && err.message);
            }
          }
          if (outbound.phone) {
            try {
              const phoneRes = await fetch(PCO_PERSON_PHONES(personId), {
                method: 'POST',
                headers: {
                  'Authorization': auth,
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                },
                body: JSON.stringify({
                  data: {
                    type: 'PhoneNumber',
                    attributes: { number: outbound.phone, location: 'Mobile' },
                  },
                }),
              });
              const phoneText = await phoneRes.text();
              let phoneBody = null;
              try { phoneBody = JSON.parse(phoneText); } catch { phoneBody = phoneText.slice(0, 500); }
              phoneStatus = phoneRes.status;
              console.log(`[relay] phone write for person ${personId} -> ${phoneRes.status}`);
              if (!phoneRes.ok) {
                console.error('[relay] phone write failed', phoneBody && phoneBody.errors);
              }
            } catch (err) {
              phoneStatus = 'error';
              console.error('[relay] phone write request failed', err && err.message);
            }
          }
        } else {
          console.warn('[relay] no Person in submission response; skipping profile writes');
        }
      }

      return send(res, pco.ok ? 200 : 502, {
        ok: pco.ok,
        pcoStatus: pco.status,
        addressStatus,
        phoneStatus,
        pcoBody,
      });
    } catch (err) {
      console.error('[relay] PCO request failed', err && err.message);
      return send(res, 502, { ok: false, error: 'upstream request failed', detail: err && err.message });
    }
  }

  return send(res, 404, { ok: false, error: 'not found' });
});

server.listen(PORT, () => {
  const mode = MOCK ? 'MOCK' : 'LIVE';
  const credStatus = MOCK || missingCreds().length === 0 ? 'configured' : `missing: ${missingCreds().join(', ')}`;
  console.log(`[relay] ${mode} listening on :${PORT} (creds: ${credStatus}, forms: [${formAllowlist.join(', ')}])`);
});
