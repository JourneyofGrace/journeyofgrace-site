import https from 'https';
const APP_ID = process.env.PCO_CLIENT_ID;
const SECRET = process.env.PCO_SECRET;
function api(path) {
  return new Promise((resolve, reject) => {
    const auth = 'Basic ' + Buffer.from(`${APP_ID}:${SECRET}`).toString('base64');
    const req = https.request({ hostname: 'api.planningcenteronline.com', path, method: 'GET', headers: { Authorization: auth, Accept: 'application/json' } }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c.toString()));
      res.on('end', () => { try { resolve({ status: res.statusCode, json: JSON.parse(body) }); } catch { resolve({ status: res.statusCode, raw: body.slice(0, 1500) }); } });
    });
    req.on('error', reject);
    req.end();
  });
}
const now = new Date(Date.now() + 1).toISOString().slice(0, 10);
// test include=tags and group.tags on group events
for (const inc of ['group,location,tags', 'group,location,group.tags', 'group,location,group_type']) {
  const r = await api(`/groups/v2/events?where[starts_at][gt]=${now}&order=starts_at&per_page=2&include=${inc}`);
  const types = (r.json && r.json.included || []).map((i) => i.type).join(',');
  console.log('include=' + inc, '-> status', r.status, 'included:', types);
}
// group_type names via includes on groups list (the earlier event include group gave type 109621 "Life Groups")
const r2 = await api(`/groups/v2/groups?include=group_type&per_page=5`);
const grps = r2.json && r2.json.data || [];
for (const g of grps) {
  const t = g.relationships && g.relationships.group_type && g.relationships.group_type.data && g.relationships.group_type.data.id;
  console.log('group', g.id, JSON.stringify(g.attributes && g.attributes.name), 'header_image?' + !!((g.attributes && g.attributes.header_image && g.attributes.header_image.original)), 'type_id', t);
}
// distinct group_types of interest
for (const tid of ['319051','109621','109622','110369']) {
  const r = await api(`/groups/v2/group_types/${tid}`);
  const d = r.json && r.json.data;
  console.log('group_type', tid, '=', d && d.attributes && d.attributes.name || ('HTTP ' + r.status));
}
