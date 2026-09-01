const API_URL = 'https://inex.hnatax.in';
const API_KEY = 'd7eebdb398d3ea3';
const API_SECRET = '3d82cdb07e0006e';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Authorization': `token ${API_KEY}:${API_SECRET}`,
});

async function testOptimizedFetch() {
  const res = await fetch(`${API_URL}/api/resource/Project?fields=["name","notes","total_billed_amount","total_costing_amount"]&limit=5000`, { headers: getHeaders() });
  const projects = (await res.json()).data;
  
  let missingConsumption = 0;
  for (const p of projects) {
    const hasData = p.total_billed_amount > 0 || p.total_costing_amount > 0 || p.notes?.includes('Cash:') || p.notes?.includes('Profit:');
    if (hasData) {
      if (!p.notes || !p.notes.includes('Consumption:')) {
        missingConsumption++;
      }
    }
  }
  
  console.log(`Out of ${projects.length} projects, ${missingConsumption} are missing consumption in notes but have financial data.`);
}

testOptimizedFetch().catch(console.error);
