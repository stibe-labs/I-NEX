
const API_URL = 'https://inext.frappe.cloud';
const API_KEY = 'd7eebdb398d3ea3';
const API_SECRET = '3d82cdb07e0006e';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Authorization': `token ${API_KEY}:${API_SECRET}`,
});

async function run() {
    const projectData = {
        project_name: 'Test Customer 5',
        company: 'INEX',
        status: 'Open',
        custom_phone: '15544',
        custom_model_name: 'test',
        custom_imei_number: '123',
        total_billed_amount: 100,
        notes: 'Test'
    };
    
    try {
        const res = await fetch(`${API_URL}/api/resource/Project`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(projectData),
        });
        const text = await res.text();
        console.log("Status:", res.status);
        console.log("Response:", text);
    } catch (e) {
        console.error("Error", e);
    }
}
run();
