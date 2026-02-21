/**
 * Debug script to test Accounting Period creation
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
const envLocalPath = path.resolve(__dirname, '../.env.local');
const envPath = path.resolve(__dirname, '../.env');

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';
const API_KEY = process.env.ERP_API_KEY;
const API_SECRET = process.env.ERP_API_SECRET;
const COMPANY = process.env.ERP_DEFAULT_COMPANY || 'Berkat Abadi Cirebon';

async function testAccountingPeriodCreation() {
  console.log('Testing Accounting Period Creation');
  console.log('API URL:', ERPNEXT_API_URL);
  console.log('Company:', COMPANY);
  
  const testPeriod = {
    period_name: 'Test Period Debug 2024-01',
    company: COMPANY,
    start_date: '2024-01-01',
    end_date: '2024-01-31',
    period_type: 'Monthly',
    status: 'Open',
    remarks: 'Debug test period'
  };
  
  console.log('\nCreating period with data:', JSON.stringify(testPeriod, null, 2));
  
  try {
    const url = `${ERPNEXT_API_URL}/api/resource/Accounting Period`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `token ${API_KEY}:${API_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPeriod)
    });
    
    console.log('\nResponse status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const text = await response.text();
    console.log('\nResponse body:', text.substring(0, 1000));
    
    if (response.ok) {
      const data = JSON.parse(text);
      console.log('\n✅ Success! Created period:', data.data.name);
      
      // Try to retrieve it
      const getUrl = `${ERPNEXT_API_URL}/api/resource/Accounting Period/${data.data.name}`;
      const getResponse = await fetch(getUrl, {
        method: 'GET',
        headers: {
          'Authorization': `token ${API_KEY}:${API_SECRET}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (getResponse.ok) {
        const retrieved = await getResponse.json();
        console.log('\n✅ Retrieved period:', JSON.stringify(retrieved.data, null, 2));
        
        // Clean up
        const deleteUrl = `${ERPNEXT_API_URL}/api/resource/Accounting Period/${data.data.name}`;
        await fetch(deleteUrl, {
          method: 'DELETE',
          headers: {
            'Authorization': `token ${API_KEY}:${API_SECRET}`,
            'Content-Type': 'application/json',
          }
        });
        console.log('\n✅ Cleaned up test period');
      }
    } else {
      console.log('\n❌ Failed to create period');
    }
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  }
}

testAccountingPeriodCreation();
