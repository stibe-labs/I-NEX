const fetch = require('node-fetch');

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
    // 1. Fetch the invoice
    const invoiceId = 'ACC-SINV-2026-00573';
    console.log("Fetching invoice:", invoiceId);
    let res = await fetch(`${API_URL}/api/resource/Sales Invoice/${invoiceId}`, {
      headers: getHeaders()
    });
    let data = await res.json();
    if (!res.ok) {
        console.error("Failed to fetch:", data);
        return;
    }
    const invoice = data.data;
    console.log("Current items:", invoice.items.map(i => i.item_code));

    // 2. Try to update it with a new payload (without row names)
    const payload = {
        items: [
            {
                item_code: 'Service',
                qty: 1,
                rate: 250,
                price_list_rate: 250,
                amount: 250,
                description: 'Test Update from API'
            }
        ]
    };

    console.log("Updating invoice...");
    res = await fetch(`${API_URL}/api/resource/Sales Invoice/${invoiceId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(payload)
    });
    
    data = await res.json();
    if (!res.ok) {
        console.error("Update failed:", JSON.stringify(data, null, 2));
    } else {
        console.log("Update success!", data.data.items.map(i => i.item_code));
    }

  } catch (err) {
    console.error("Script error:", err);
  }
}

runTest();
