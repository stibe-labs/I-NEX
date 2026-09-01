const API_URL = 'https://inex.hnatax.in';
const API_KEY = 'd7eebdb398d3ea3';
const API_SECRET = '3d82cdb07e0006e';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Authorization': `token ${API_KEY}:${API_SECRET}`,
});

async function testOptimizedFetch() {
  console.log('Fetching Sales Invoice Items via REST...');
  const res2 = await fetch(`${API_URL}/api/resource/Sales Invoice Item?fields=["name","parent","item_name","project"]&limit=10`, { headers: getHeaders() });
  
  if (res2.ok) {
    const data = await res2.json();
    console.log(`Found ${data.data?.length} Sales Invoice Items.`);
  } else {
    console.error("Failed:", res2.status, await res2.text());
  }
}

testOptimizedFetch().catch(console.error);
