const https = require('https');
https.get('https://inext.frappe.cloud/api/resource/Project?limit_page_length=1&fields=["*"]', {
  headers: { 'Authorization': 'token d7eebdb398d3ea3:3d82cdb07e0006e' }
}, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    const json = JSON.parse(data);
    console.log(Object.keys(json.data[0]).join(', '));
  });
});
