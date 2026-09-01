const API_URL = 'https://inext.frappe.cloud';
const API_KEY = 'd7eebdb398d3ea3';
const API_SECRET = '3d82cdb07e0006e';
const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Authorization': `token ${API_KEY}:${API_SECRET}`,
});

async function extractFrappeError(res) {
    const data = await res.json();
    return data;
}

async function runTest() {
  try {
    const payload = {
        customer: 'JOSHI MATHEW',
        project: 'PROJ-0725',
        company: 'INEX',
        items: [
            {
                item_code: 'Service',
                qty: 1,
                rate: 250,
                price_list_rate: 250,
                amount: 250,
                description: 'Recreated via script with INEX'
            }
        ],
        remarks: 'Recreated test'
    };

    let res = await fetch(`${API_URL}/api/resource/Sales Invoice`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(payload) });
    let data = await res.json();
    if (!res.ok) {
        console.error("Create failed!", data);
    } else {
        console.log("Created successfully! New ID:", data.data.name);
    }
  } catch (err) {
    console.error('Script error:', err);
  }
}

runTest();
