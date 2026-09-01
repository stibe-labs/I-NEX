const API_URL = 'https://inext.frappe.cloud';
const API_KEY = 'd7eebdb398d3ea3';
const API_SECRET = '3d82cdb07e0006e';
const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Authorization': `token ${API_KEY}:${API_SECRET}`,
});
async function runTest() {
    let res = await fetch(`${API_URL}/api/resource/Sales Invoice?filters=[["project","=","PROJ-0725"]]&fields=["name","docstatus"]`, { headers: getHeaders() });
    let data = await res.json();
    console.log("Invoices:", data);
}
runTest();
