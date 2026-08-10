import fs from 'fs';

const API_URL = 'https://inext.frappe.cloud';
const API_KEY = 'd7eebdb398d3ea3';
const API_SECRET = '3d82cdb07e0006e';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Authorization': `token ${API_KEY}:${API_SECRET}`,
});

const generateTestData = () => {
  const variations = [];
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  const longStr = Array(500).fill('A').join('');
  
  // 1-10: Basic valid variations
  for(let i = 1; i <= 10; i++) {
    variations.push({
      job_card: `test data ${String(i).padStart(2, '0')}`,
      customer_name: `Customer ${i}`,
      phone: `+91999999990${i}`,
      model: `Model ${i}`,
      imei: `12345678901234${i}`,
      cost: String(100 * i),
      profit: String(50 * i),
      complaint: 'Broken screen',
      status: 'Open'
    });
  }

  // 11-20: Missing optional fields & Boundary lengths
  for(let i = 11; i <= 20; i++) {
    variations.push({
      job_card: `test data ${i}`,
      customer_name: `Customer ${i}`,
      phone: '',
      model: '',
      imei: '',
      cost: '',
      profit: '',
      complaint: '',
      status: 'Open'
    });
  }

  // 21-30: Special characters and emojis
  for(let i = 21; i <= 30; i++) {
    variations.push({
      job_card: `test data ${i} 🚀!@#`,
      customer_name: `Customer ${i} <script>alert(1)</script>`,
      phone: `+91 !@# $ %`,
      model: `Model ${i} 'OR 1=1--`,
      imei: `IMEI!@#`,
      cost: '-1000',
      profit: '999999999999',
      complaint: `Complaint ${i} \n\n 🎉`,
      status: 'Open'
    });
  }

  // 31-40: Very long strings
  for(let i = 31; i <= 40; i++) {
    variations.push({
      job_card: `test data ${i}`,
      customer_name: `Customer ${i} ${longStr.substring(0, 100)}`,
      phone: longStr.substring(0, 20),
      model: longStr.substring(0, 50),
      imei: longStr.substring(0, 50),
      cost: '100',
      profit: '100',
      complaint: longStr,
      status: 'Open'
    });
  }
  
  // 41-50: Duplicate names but different cases, trailing spaces
  for(let i = 41; i <= 50; i++) {
    variations.push({
      job_card: `TEST DATA 01`, // intentionally duplicate of 01 but upper
      customer_name: `CUSTOMER 1  `,
      phone: `12345`,
      model: `M`,
      imei: `1`,
      cost: '1',
      profit: '1',
      complaint: 'Dup test',
      status: 'Open'
    });
  }

  return variations;
};

const runTests = async () => {
  const tests = generateTestData();
  const results = [];
  
  for (let i = 0; i < 50; i++) {
    const data = tests[i];
    
    // Simulate CustomerDetails payload
    const projectData = {
      project_name: `${data.job_card} ${data.customer_name}`.trim(),
      company: 'INEX',
      status: 'Open',
      custom_phone: data.phone,
      custom_model_name: data.model,
      custom_imei_number: data.imei,
      notes: `Complaint: ${data.complaint}\nCost: ${data.cost}\nProfit: ${data.profit}`
    };

    console.log(`[${i+1}/50] Testing creation of: ${projectData.project_name}`);
    
    try {
      const res = await fetch(`${API_URL}/api/resource/Project`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(projectData),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(()=>null);
        const errText = errJson ? JSON.stringify(errJson) : await res.text();
        results.push({ testId: i+1, success: false, name: projectData.project_name, error: errText });
        console.log(`   ❌ Failed`);
      } else {
        const responseJson = await res.json();
        results.push({ testId: i+1, success: true, name: projectData.project_name, projectId: responseJson.data.name });
        console.log(`   ✅ Success`);
      }
    } catch (e) {
      results.push({ testId: i+1, success: false, name: projectData.project_name, error: e.message });
      console.log(`   ❌ Error: ${e.message}`);
    }
    
    // Slight delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 200));
  }

  fs.writeFileSync('test_results.json', JSON.stringify(results, null, 2));
  console.log('Testing complete. Results saved to test_results.json');
};

runTests();
