import https from 'https';

const APP_ID = process.env.PCO_CLIENT_ID;
const SECRET = process.env.PCO_SECRET;

function api(path) {
  return new Promise((resolve, reject) => {
    const auth = 'Basic ' + Buffer.from(`${APP_ID}:${SECRET}`).toString('base64');
    const req = https.request(
      { hostname: 'api.planningcenteronline.com', path, method: 'GET', headers: { Authorization: auth, Accept: 'application/json' } },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c.toString()));
        res.on('end', () => {
          try { resolve({ status: res.statusCode, json: JSON.parse(body) }); }
          catch { resolve({ status: res.statusCode, raw: body.slice(0, 1500) }); }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

const now = new Date(Date.now() + 1).toISOString().slice(0, 10);
const r = await api(`/groups/v2/events?where[starts_at][gt]=${now}&order=starts_at&per_page=3&include=group,location`);
const inc = r.json && r.json.included || [];
const ev = r.json && r.json.data && r.json.data[0];
console.log('event[0] image:', JSON.stringify(ev && ev.attributes && ev.attributes.image));
const grp = inc.find((i) => i.type === 'Group');
if (grp) {
  console.log('group header_image:', JSON.stringify(grp.attributes && grp.attributes.header_image));
  console.log('group public_url:', (grp.attributes && grp.attributes.public_church_center_web_url));
  const gt = grp.relationships && grp.relationships.group_type && grp.relationships.group_type.data;
  console.log('group_type rel:', JSON.stringify(gt));
}

// group_type name + tags
const gtId = grp && grp.relationships && grp.relationships.group_type && grp.relationships.group_type.data && grp.relationships.group_type.data.id;
if (gtId) {
  const gtRes = await api(`/groups/v2/group_types/${gtId}`);
  console.log('group_type:', JSON.stringify(gtRes.json && gtRes.json.data && { id: gtRes.json.data.id, name: gtRes.json.data.attributes && gtRes.json.data.attributes.name }));
}
// tags endpoint attempt
const gid = grp && grp.id || '1998843';
const t1 = await api(`/groups/v2/groups/${gid}/tags`);
console.log('groups/tags status:', t1.status, JSON.stringify(t1.json).slice(0, 200));

// group_type_list of a known small-group-type group
for (const id of ['1998843','1691333','734809']) {
  const g = await api(`/groups/v2/groups/${id}`);
  const gd = g.json && g.json.data;
  if (gd) {
    const gt2 = gd.relationships && gd.relationships.group_type && gd.relationships.group_type.data && gd.relationships.group_type.data.id;
    const img = gd.attributes && gd.attributes.header_image;
    console.log(`\ngroup ${id}: "${gd.attributes.name}"\n  header_image=${JSON.stringify(img)}\n  group_type_id=${gt2}\n  attrs keys = ${Object.keys(gd.attributes).join(',')}`);
  }
}
