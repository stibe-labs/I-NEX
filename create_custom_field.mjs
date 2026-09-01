// No import needed for fetch in Node 22

const API_URL = 'https://inex.frappe.cloud';
const API_KEY = 'd7eebdb398d3ea3';
const API_SECRET = '3d82cdb07e0006e';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Authorization': `token ${API_KEY}:${API_SECRET}`,
});

async function run() {
  try {
    const payload = {
      dt: 'Item',
      fieldname: 'custom_unit_qty',
      label: 'Unit Qty',
      fieldtype: 'Float',
      insert_after: 'item_group',
      in_list_view: 1,
      in_standard_filter: 0
    };

    const res = await fetch(`${API_URL}/api/resource/Custom Field`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Error creating Custom Field:', err);
      return;
    }

    const data = await res.json();
    console.log('Custom Field created successfully:', data.data.name);
  } catch (e) {
    console.error('Failed', e);
  }
}

run();
