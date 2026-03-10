/**
 * Test actual employee insert on Cirebon site
 * This will attempt to create a real employee to see if naming series works
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '.env.local') });

const SITE_ID = 'cirebon-batasku-cloud';
const ERPNEXT_API_URL = `https://${SITE_ID.replace(/-/g, '.')}`;
const API_KEY = process.env.SITE_CIREBON_BATASKU_CLOUD_API_KEY;
const API_SECRET = process.env.SITE_CIREBON_BATASKU_CLOUD_API_SECRET;

const headers = {
  Authorization: `token ${API_KEY}:${API_SECRET}`,
  'Content-Type': 'application/json',
};

async function main() {
  console.log('🧪 Testing actual employee insert on Cirebon site...\n');
  
  // First, check current employees
  console.log('📊 Checking current employees...');
  const listRes = await fetch(`${ERPNEXT_API_URL}/api/resource/Employee?fields=["name"]&limit_page_length=20&order_by=name desc`, {
    headers,
  });
  const listData = await listRes.json();
  console.log(`Found ${listData.data?.length || 0} employees (showing last 20)`);
  if (listData.data && listData.data.length > 0) {
    console.log(`Latest: ${listData.data[0].name}`);
  }
  
  // Try to insert
  console.log('\n🔧 Attempting to insert new employee...');
  const insertRes = await fetch(`${ERPNEXT_API_URL}/api/resource/Employee`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      first_name: 'TEST REAL INSERT',
      employee_name: 'TEST REAL INSERT',
      gender: 'Male',
      date_of_birth: '2000-01-01',
      date_of_joining: '2026-03-08',
      status: 'Active',
    }),
  });
  
  const insertData = await insertRes.json();
  
  if (insertRes.ok) {
    console.log('✅ INSERT SUCCESS!');
    console.log(`Created employee: ${insertData.data.name}`);
    
    // Clean up
    console.log('\n🧹 Cleaning up test employee...');
    const deleteRes = await fetch(`${ERPNEXT_API_URL}/api/resource/Employee/${insertData.data.name}`, {
      method: 'DELETE',
      headers,
    });
    
    if (deleteRes.ok) {
      console.log('✅ Test employee deleted');
    } else {
      console.log('⚠️  Could not delete test employee');
    }
  } else {
    console.log('❌ INSERT FAILED');
    console.log('Status:', insertRes.status);
    console.log('Error:', insertData.message || insertData.exc?.substring(0, 500));
    
    // Check if it's duplicate entry
    const errorStr = JSON.stringify(insertData);
    if (errorStr.includes('Duplicate entry')) {
      console.log('\n⚠️  DUPLICATE ENTRY ERROR DETECTED!');
      console.log('This means naming series counter is out of sync.');
      console.log('You need to run fix_employee_naming_series.py on the server.');
    }
  }
}

main().catch(console.error);
