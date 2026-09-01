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
    const invoiceId = 'ACC-SINV-2026-00573';
    let res = await fetch(`${API_URL}/api/resource/Sales Invoice/${invoiceId}`, { headers: getHeaders() });
    let data = await res.json();
    const invoice = data.data;

    console.log('Project for invoice:', invoice.project);
  } catch (err) {
    console.error('Script error:', err);
  }
}

runTest();
