const https = require('https');
const http = require('http');
const url = require('url');

// Configuration from environment variables
const PCO_APP_ID = process.env.PCO_APP_ID || process.env.PCO_CLIENT_ID;
const PCO_SECRET = process.env.PCO_SECRET;
const PORT = process.env.PORT || 3000;
const PCO_WORKFLOW_ID = process.env.PCO_WORKFLOW_ID || '764898'; // "First-Time Visitor Follow-up" Workflow ID

if (!PCO_APP_ID || !PCO_SECRET) {
  console.warn('[PCO Worker] Warning: PCO_APP_ID or PCO_SECRET is not set in environment variables.');
}

function makePcoRequest(path, method, payload = null) {
  return new Promise((resolve, reject) => {
    const authHeader = 'Basic ' + Buffer.from(`${PCO_APP_ID}:${PCO_SECRET}`).toString('base64');
    const dataString = payload ? JSON.stringify(payload) : null;

    const options = {
      hostname: 'api.planningcenteronline.com',
      path: path,
      method: method,
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      }
    };

    if (dataString) {
      options.headers['Content-Length'] = Buffer.byteLength(dataString);
    }

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk.toString(); });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject({ statusCode: res.statusCode, error: parsed });
          }
        } catch (e) {
          reject({ statusCode: res.statusCode, error: body });
        }
      });
    });

    req.on('error', reject);
    if (dataString) req.write(dataString);
    req.end();
  });
}

const server = http.createServer((req, res) => {
  // CORS Headers for static frontend requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const reqUrl = url.parse(req.url, true);

  // Health check endpoint
  if (req.method === 'GET' && reqUrl.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', pcoConfigured: !!(PCO_APP_ID && PCO_SECRET) }));
    return;
  }

  // Handle Visitor Registration Submission to Planning Center People API & Workflows
  if (req.method === 'POST' && (reqUrl.pathname === '/api/register-visitor' || reqUrl.pathname === '/submit')) {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        let payload = {};
        if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
          payload = JSON.parse(body);
        } else {
          const querystring = require('querystring');
          payload = querystring.parse(body);
        }

        const fullName = (payload.Name || payload.name || '').trim();
        const email = (payload.Email || payload.email || '').trim();
        const phone = (payload.Phone || payload.phone || '').trim();
        const familyInfo = (payload['Tell Us About Your Family'] || payload.family || '').trim();

        const nameParts = fullName.split(' ');
        const firstName = nameParts[0] || 'Visitor';
        const lastName = nameParts.slice(1).join(' ') || 'Guest';

        if (!PCO_APP_ID || !PCO_SECRET) {
          throw new Error('Planning Center API credentials not configured.');
        }

        // 1. Create or Update Person in Planning Center People
        const personResp = await makePcoRequest('/people/v2/people', 'POST', {
          data: {
            type: 'Person',
            attributes: {
              first_name: firstName,
              last_name: lastName,
              medical_notes: familyInfo ? `Family / Visitor Notes: ${familyInfo}` : undefined
            }
          }
        });

        const personId = personResp.data.id;

        // 2. Add Email Address if provided
        if (email && personId) {
          try {
            await makePcoRequest(`/people/v2/people/${personId}/emails`, 'POST', {
              data: {
                type: 'Email',
                attributes: { address: email, location: 'Home' }
              }
            });
          } catch (e) {
            console.warn('[PCO Email Warning]', e);
          }
        }

        // 3. Add Phone Number if provided
        if (phone && personId) {
          try {
            await makePcoRequest(`/people/v2/people/${personId}/phone_numbers`, 'POST', {
              data: {
                type: 'PhoneNumber',
                attributes: { number: phone, location: 'Mobile' }
              }
            });
          } catch (e) {
            console.warn('[PCO Phone Warning]', e);
          }
        }

        // 4. Create Card in "First-Time Visitor Follow-up" Workflow
        let workflowCardId = null;
        if (personId && PCO_WORKFLOW_ID) {
          try {
            const cardResp = await makePcoRequest(`/people/v2/workflows/${PCO_WORKFLOW_ID}/cards`, 'POST', {
              data: {
                type: 'WorkflowCard',
                attributes: {
                  person_id: personId
                }
              }
            });
            workflowCardId = cardResp.data ? cardResp.data.id : null;
          } catch (e) {
            console.warn('[PCO Workflow Card Warning]', e);
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Successfully registered visitor in Planning Center!',
          personId: personId,
          workflowCardId: workflowCardId
        }));

      } catch (err) {
        console.error('[PCO Worker Error]', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message || err.error }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(PORT, () => {
  console.log(`[PCO Integration Server] Running on port ${PORT}`);
});
