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
    const projectId = '1307';
    console.log('Fetching invoices for project:', projectId);
    
    // Test what getLinkedSalesInvoices returns
    let res = await fetch(`${API_URL}/api/resource/Sales Invoice?filters=[["project","=","${encodeURIComponent(projectId)}"]]&fields=["name","docstatus"]&limit=100`, {
      headers: getHeaders()
    });
    
    let data = await res.json();
    console.log("Invoices:", data);

  } catch (err) {
    console.error('Script error:', err);
  }
}

runTest();
