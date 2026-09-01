const API_URL = 'https://inext.frappe.cloud';
const API_KEY = 'd7eebdb398d3ea3';
const API_SECRET = '3d82cdb07e0006e';
const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Authorization': `token ${API_KEY}:${API_SECRET}`,
});

async function runTest() {
  try {
    const projectId = 'PROJ-0725';
    let res = await fetch(`${API_URL}/api/resource/Project/${projectId}`, { headers: getHeaders() });
    let data = await res.json();
    const proj = data.data;

    console.log('Project Company:', proj.company);
  } catch (err) {
    console.error('Script error:', err);
  }
}

runTest();
