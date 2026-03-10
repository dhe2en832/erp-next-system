/**
 * Test script to query naming series counter directly from ERPNext
 * Run with: npx tsx test-naming-series-query.ts
 */

const SITE_ID = 'cirebon-batasku-cloud';
const ERPNEXT_API_URL = `https://${SITE_ID.replace(/-/g, '.')}`;

// Load environment from .env.local
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '.env.local') });

const API_KEY = process.env.SITE_CIREBON_BATASKU_CLOUD_API_KEY;
const API_SECRET = process.env.SITE_CIREBON_BATASKU_CLOUD_API_SECRET;

if (!API_KEY || !API_SECRET) {
  console.error('Error: SITE_CIREBON_BATASKU_CLOUD_API_KEY and SITE_CIREBON_BATASKU_CLOUD_API_SECRET must be set');
  console.error('API_KEY:', API_KEY ? 'Found' : 'Missing');
  console.error('API_SECRET:', API_SECRET ? 'Found' : 'Missing');
  process.exit(1);
}

const headers = {
  Authorization: `token ${API_KEY}:${API_SECRET}`,
  'Content-Type': 'application/json',
};

async function queryNamingSeries() {
  console.log('🔍 Querying naming series counter from tabSeries...\n');
  
  try {
    // Query using frappe.db.sql via API
    const res = await fetch(`${ERPNEXT_API_URL}/api/method/frappe.client.get_list`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        doctype: 'Series',
        fields: ['name', 'current'],
        filters: [['name', 'like', 'HR-EMP%']],
        limit_page_length: 100
      }),
    });
    
    const data = await res.json();
    
    if (res.ok && data.message) {
      console.log('✅ Found naming series records:');
      console.log(JSON.stringify(data.message, null, 2));
    } else {
      console.log('❌ Failed to query naming series');
      console.log('Response:', JSON.stringify(data, null, 2));
    }
  } catch (err: any) {
    console.log('❌ Exception:', err.message);
  }
}

async function queryEmployees() {
  console.log('\n🔍 Querying existing employees...\n');
  
  try {
    const res = await fetch(`${ERPNEXT_API_URL}/api/resource/Employee?fields=["name","creation"]&limit_page_length=20&order_by=name desc`, {
      headers,
    });
    
    const data = await res.json();
    
    if (res.ok && data.data) {
      console.log(`✅ Found ${data.data.length} employees (showing last 20):`);
      data.data.forEach((emp: any) => {
        console.log(`  - ${emp.name} (created: ${emp.creation})`);
      });
      
      // Find highest number
      let maxNumber = 0;
      for (const emp of data.data) {
        const match = emp.name.match(/HR-EMP-(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNumber) maxNumber = num;
        }
      }
      console.log(`\n📊 Highest employee number: ${maxNumber}`);
      console.log(`📊 Next employee should be: HR-EMP-${String(maxNumber + 1).padStart(5, '0')}`);
    } else {
      console.log('❌ Failed to query employees');
      console.log('Response:', JSON.stringify(data, null, 2));
    }
  } catch (err: any) {
    console.log('❌ Exception:', err.message);
  }
}

async function testAutoInsert() {
  console.log('\n🧪 Testing auto-insert (let ERPNext generate ID)...\n');
  
  try {
    const res = await fetch(`${ERPNEXT_API_URL}/api/resource/Employee`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        first_name: 'TEST AUTO',
        employee_name: 'TEST AUTO',
        gender: 'Male',
        date_of_birth: '2000-01-01',
        date_of_joining: '2026-03-08',
        status: 'Active',
      }),
    });
    
    const data = await res.json();
    
    if (res.ok) {
      console.log('✅ Auto-insert SUCCESS!');
      console.log('Generated ID:', data.data.name);
      
      // Clean up
      await fetch(`${ERPNEXT_API_URL}/api/resource/Employee/${data.data.name}`, {
        method: 'DELETE',
        headers,
      });
      console.log('Cleaned up test employee');
    } else {
      console.log('❌ Auto-insert FAILED');
      console.log('Error:', data.message || data.exc || JSON.stringify(data).substring(0, 500));
    }
  } catch (err: any) {
    console.log('❌ Exception:', err.message);
  }
}

async function main() {
  console.log(`Testing site: ${SITE_ID}`);
  console.log(`API URL: ${ERPNEXT_API_URL}\n`);
  console.log('='.repeat(60));
  
  await queryNamingSeries();
  await queryEmployees();
  await testAutoInsert();
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Test complete');
}

main().catch(console.error);
