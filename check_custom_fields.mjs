const API_URL = 'https://inex.hnatax.in';
const API_KEY = 'd7eebdb398d3ea3';
const API_SECRET = '3d82cdb07e0006e';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Authorization': `token ${API_KEY}:${API_SECRET}`,
});

async function run() {
  try {
    const res = await fetch(`${API_URL}/api/resource/Custom Field?filters=[["dt","=","Item"]]&limit=100`, {
      headers: getHeaders()
    });
    const data = await res.json();
    console.log("Custom fields on Item:", data.data);
  } catch (e) {
    console.error(e);
  }
}
run();
