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

    const payload = {
        posting_date: invoice.posting_date,
        due_date: invoice.due_date,
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

    console.log('Updating invoice with dates...');
    res = await fetch(`${API_URL}/api/resource/Sales Invoice/${invoiceId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(payload)
    });
    
    data = await res.json();
    if (!res.ok) {
        console.error('Update failed:', JSON.stringify(data, null, 2));
    } else {
        console.log('Update success! New items:', data.data.items.map(i => i.item_code));
    }
  } catch (err) {
    console.error('Script error:', err);
  }
}

runTest();
