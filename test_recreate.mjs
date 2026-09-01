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
    const invoiceId = 'ACC-SINV-2026-00573';
    console.log("Fetching invoice to get payload...");
    let res = await fetch(`${API_URL}/api/resource/Sales Invoice/${invoiceId}`, { headers: getHeaders() });
    let data = await res.json();
    if(!data.data) { console.error("Not found"); return; }
    const oldInvoice = data.data;

    console.log("Deleting old invoice...");
    res = await fetch(`${API_URL}/api/resource/Sales Invoice/${invoiceId}`, { method: 'DELETE', headers: getHeaders() });
    if (!res.ok) {
        console.error("Delete failed!", await extractFrappeError(res));
    } else {
        console.log("Deleted successfully.");
    }

    console.log("Creating new invoice...");
    const payload = {
        customer: oldInvoice.customer,
        project: oldInvoice.project,
        company: oldInvoice.company,
        items: [
            {
                item_code: 'Service',
                qty: 1,
                rate: 250,
                price_list_rate: 250,
                amount: 250,
                description: 'Recreated via script'
            }
        ],
        remarks: 'Recreated test'
    };

    res = await fetch(`${API_URL}/api/resource/Sales Invoice`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(payload) });
    data = await res.json();
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
