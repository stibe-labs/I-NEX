const https = require('https');
https.get('https://inext.frappe.cloud/api/resource/Project?fields=["name","notes"]&limit_page_length=50', {
  headers: { 'Authorization': 'token d7eebdb398d3ea3:3d82cdb07e0006e' }
}, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    const json = JSON.parse(data);
    const projs = json.data.filter(p => p.notes && p.notes.includes('undefined'));
    console.log(JSON.stringify(projs, null, 2));
  });
});
