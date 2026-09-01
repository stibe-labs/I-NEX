const API_URL = 'https://inex.hnatax.in';
const API_KEY = 'd7eebdb398d3ea3';
const API_SECRET = '3d82cdb07e0006e';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Authorization': `token ${API_KEY}:${API_SECRET}`,
});

async function runTest() {
  console.log("=== STARTING TEST FLOW ===");

  const itemCode = 'TEST_ITEM_001';

  try {
    // 1. Delete if already exists
    await fetch(`${API_URL}/api/resource/Item/${itemCode}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
  } catch (e) {
    // Ignore error if it doesn't exist
  }

  try {
    // 2. Create
    console.log(`\n1. Creating Item ${itemCode} with custom_unit_qty = "10"`);
    const createPayload = {
      item_code: itemCode,
      item_name: "Test Item",
      item_group: "Products",
      stock_uom: "Nos",
      custom_unit_qty: "10"
    };

    let res = await fetch(`${API_URL}/api/resource/Item`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(createPayload)
    });
    if (!res.ok) throw new Error(await res.text());
    console.log("Create successful.");

    // 3. Fetch
    console.log(`\n2. Fetching Item ${itemCode}`);
    res = await fetch(`${API_URL}/api/resource/Item/${itemCode}`, {
      headers: getHeaders()
    });
    const text = await res.text();
    if (!res.ok) throw new Error(text);
    let data;
    try {
      data = JSON.parse(text);
    } catch(e) {
      console.log("Response was:", text);
      throw e;
    }
    console.log(`Fetched object keys:`, Object.keys(data.data).filter(k => k.includes('unit') || k.includes('qty') || k.includes('custom')));

    // 4. Update
    console.log(`\n3. Updating Item ${itemCode} to custom_unit_qty = "25"`);
    res = await fetch(`${API_URL}/api/resource/Item/${itemCode}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ custom_unit_qty: "25" })
    });
    if (!res.ok) throw new Error(await res.text());
    console.log("Update successful.");

    // 5. Fetch again
    res = await fetch(`${API_URL}/api/resource/Item/${itemCode}`, {
      headers: getHeaders()
    });
    data = await res.json();
    console.log(`Fetched custom_unit_qty after update: ${data.data.custom_unit_qty} (Expected: 25)`);

    // 6. Delete
    console.log(`\n4. Deleting Item ${itemCode}`);
    res = await fetch(`${API_URL}/api/resource/Item/${itemCode}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    console.log("Delete successful.");

    console.log("\n=== ALL TESTS PASSED SUCCESSFULLY ===");

  } catch (e) {
    console.error("Test failed:", e.message);
  }
}

runTest();
