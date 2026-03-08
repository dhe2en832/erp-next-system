/**
 * Script to fix Employee naming series counter using direct SQL update
 * Run with: npx tsx fix-naming-series-direct.ts
 */

const ERPNEXT_API_URL = process.env.ERPNEXT_URL || process.env.ERPNEXT_API_URL || 'http://localhost:8000';
const API_KEY = process.env.ERP_API_KEY;
const API_SECRET = process.env.ERP_API_SECRET;

if (!API_KEY || !API_SECRET) {
  console.error('Error: ERP_API_KEY and ERP_API_SECRET must be set');
  process.exit(1);
}

const headers = {
  Authorization: `token ${API_KEY}:${API_SECRET}`,
  'Content-Type': 'application/json',
};

async function main() {
  console.log('🔍 Fetching existing employees...');
  
  const res = await fetch(`${ERPNEXT_API_URL}/api/resource/Employee?fields=["name"]&limit_page_length=999999&order_by=name desc`, {
    headers,
  });
  const data = await res.json();
  const employees = data.data || [];
  
  let maxNumber = 0;
  for (const emp of employees) {
    const match = emp.name.match(/HR-EMP-(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNumber) maxNumber = num;
    }
  }
  
  console.log(`Found ${employees.length} employees`);
  console.log(`Highest ID number: ${maxNumber}`);
  const nextNumber = maxNumber + 1;
  console.log(`Next number should be: ${nextNumber}`);
  
  // Try using frappe.client.set_value to update tabSeries
  console.log('\n📝 Method 1: Using frappe.client.set_value...');
  try {
    const setValueRes = await fetch(`${ERPNEXT_API_URL}/api/method/frappe.client.set_value`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        doctype: 'Series',
        name: 'HR-EMP-',
        fieldname: 'current',
        value: nextNumber
      }),
    });
    
    const setValueData = await setValueRes.json();
    if (setValueRes.ok) {
      console.log('✅ Method 1 SUCCESS!');
      console.log('Response:', setValueData);
    } else {
      console.log('❌ Method 1 FAILED');
      console.log('Error:', setValueData);
    }
  } catch (err: any) {
    console.log('❌ Method 1 EXCEPTION:', err.message);
  }
  
  // Try using frappe.db.sql to update directly
  console.log('\n📝 Method 2: Using frappe.db.sql...');
  try {
    const sqlRes = await fetch(`${ERPNEXT_API_URL}/api/method/frappe.db.sql`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: `UPDATE tabSeries SET current = ${nextNumber} WHERE name = 'HR-EMP-'`
      }),
    });
    
    const sqlData = await sqlRes.json();
    if (sqlRes.ok) {
      console.log('✅ Method 2 SUCCESS!');
      console.log('Response:', sqlData);
    } else {
      console.log('❌ Method 2 FAILED');
      console.log('Error:', sqlData);
    }
  } catch (err: any) {
    console.log('❌ Method 2 EXCEPTION:', err.message);
  }
  
  // Try using custom method to update series
  console.log('\n📝 Method 3: Using frappe.model.naming.update_series...');
  try {
    const updateRes = await fetch(`${ERPNEXT_API_URL}/api/method/frappe.model.naming.update_series`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        prefix: 'HR-EMP-',
        current_value: nextNumber
      }),
    });
    
    const updateData = await updateRes.json();
    if (updateRes.ok) {
      console.log('✅ Method 3 SUCCESS!');
      console.log('Response:', updateData);
    } else {
      console.log('❌ Method 3 FAILED');
      console.log('Error:', updateData);
    }
  } catch (err: any) {
    console.log('❌ Method 3 EXCEPTION:', err.message);
  }
  
  // Test insert after all attempts
  console.log('\n🧪 Final test: Employee insert...');
  const testRes = await fetch(`${ERPNEXT_API_URL}/api/resource/Employee`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      first_name: 'FINAL TEST',
      employee_name: 'FINAL TEST',
      gender: 'Male',
      date_of_birth: '2000-01-01',
      date_of_joining: '2026-03-08',
      status: 'Active',
    }),
  });
  
  const testData = await testRes.json();
  if (testRes.ok) {
    console.log('✅ Final test SUCCESS!');
    console.log('Created employee:', testData.data.name);
    
    // Clean up
    await fetch(`${ERPNEXT_API_URL}/api/resource/Employee/${testData.data.name}`, {
      method: 'DELETE',
      headers,
    });
    console.log('Cleaned up test employee');
  } else {
    console.log('❌ Final test FAILED');
    console.log('Error:', testData.message || testData.exc);
  }
}

main().catch(console.error);
