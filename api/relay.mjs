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
  `https://api.planningcenteronline.com/people/v2/forms/${encodeURIComponent(formId)}/form_submissions`;

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

    if (MOCK) {
      console.log('[relay][mock] would POST', PCO_SUBMIT(formId));
      console.log('[relay][mock] payload', JSON.stringify(payload));
      return send(res, 200, { ok: true, mock: true, formId });
    }

    const auth = 'Basic ' + Buffer.from(`${clientId}:${secret}`).toString('base64');
    try {
      const pco = await fetch(PCO_SUBMIT(formId), {
        method: 'POST',
        headers: {
          'Authorization': auth,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const text = await pco.text();
      let pcoBody = null;
      try { pcoBody = JSON.parse(text); } catch { pcoBody = text.slice(0, 500); }
      console.log(`[relay] PCO respond placeholder -> ${pco.status}`);
      return send(res, pco.ok ? 200 : 502, { ok: pco.ok, pcoStatus: pco.status, pcoBody });
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
