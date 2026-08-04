const https = require('https');
const http = require('http');
const url = require('url');

// Configuration from environment variables
const PCO_APP_ID = process.env.PCO_APP_ID || process.env.PCO_CLIENT_ID;
const PCO_SECRET = process.env.PCO_SECRET;
const PORT = process.env.PORT || 3000;

if (!PCO_APP_ID || !PCO_SECRET) {
  console.warn('[PCO Worker] Warning: PCO_APP_ID or PCO_SECRET is not set in environment variables.');
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

  // Handle Visitor Registration Submission to Planning Center People API
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

        // Construct Planning Center People JSON:API payload
        const pcoPayload = JSON.stringify({
          data: {
            type: 'Person',
            attributes: {
              first_name: firstName,
              last_name: lastName,
              medical_notes: familyInfo ? `Family Info: ${familyInfo}` : undefined
            }
          }
        });

        const authHeader = 'Basic ' + Buffer.from(`${PCO_APP_ID}:${PCO_SECRET}`).toString('base64');

        const pcoReq = https.request({
          hostname: 'api.planningcenteronline.com',
          path: '/people/v2/people',
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(pcoPayload)
          }
        }, (pcoRes) => {
          let pcoResponseBody = '';
          pcoRes.on('data', c => { pcoResponseBody += c; });
          pcoRes.on('end', () => {
            if (pcoRes.statusCode >= 200 && pcoRes.statusCode < 300) {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, message: 'Successfully registered in Planning Center!' }));
            } else {
              console.error('[PCO Error]', pcoRes.statusCode, pcoResponseBody);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: 'Failed to create record in Planning Center.' }));
            }
          });
        });

        pcoReq.on('error', (err) => {
          console.error('[PCO Network Error]', err);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: err.message }));
        });

        pcoReq.write(pcoPayload);
        pcoReq.end();

      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
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
