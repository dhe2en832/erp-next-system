/**
 * Property Test: Tax Template Persistence (Round-trip Property)
 * Task 1.7: Write property test untuk Tax Template persistence
 * 
 * Validates: Requirements 1.5
 * 
 * Property 17: Tax Template Persistence
 * - Generate random tax template data (title, rate, account_head)
 * - Create template, save, retrieve dari database
 * - Verify semua fields match dengan original data
 * - Run dengan minimum 100 iterations
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables - try .env.local first, then .env
const envLocalPath = path.resolve(__dirname, '../.env.local');
const envPath = path.resolve(__dirname, '../.env');

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.error('No .env or .env.local file found');
}

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';
const API_KEY = process.env.ERP_API_KEY;
const API_SECRET = process.env.ERP_API_SECRET;

interface TaxTemplateData {
  title: string;
  company: string;
  is_default: number;
  disabled: number;
  taxes: Array<{
    charge_type: string;
    account_head: string;
    description: string;
    rate: number;
  }>;
}

// Helper: Generate random tax template data
function generateRandomTaxTemplate(iteration: number): TaxTemplateData {
  const rates = [10, 11, 12, 15, 20, 2, 1.5];
  const accounts = [
    '2210 - Hutang PPN - BAC',
    '2230 - Hutang PPh 23 - BAC',
    '2240 - Hutang PPh 4(2) Final - BAC',
    '1410 - Pajak Dibayar Dimuka - BAC'
  ];
  
  const rate = rates[Math.floor(Math.random() * rates.length)];
  const account = accounts[Math.floor(Math.random() * accounts.length)];
  
  return {
    title: `Test Tax Template ${iteration} - ${rate}%`,
    company: 'BAC',
    is_default: 0,
    disabled: 0,
    taxes: [
      {
        charge_type: 'On Net Total',
        account_head: account,
        description: `Test Tax ${rate}%`,
        rate: rate
      }
    ]
  };
}

// Helper: Create tax template via API
async function createTaxTemplate(data: TaxTemplateData): Promise<any> {
  if (!API_KEY || !API_SECRET) {
    throw new Error('API credentials not configured');
  }

  const url = `${ERPNEXT_API_URL}/api/resource/Sales Taxes and Charges Template`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `token ${API_KEY}:${API_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to create template: ${text}`);
  }

  const result = await response.json();
  return result.data;
}

// Helper: Retrieve tax template via API
async function getTaxTemplate(name: string): Promise<any> {
  if (!API_KEY || !API_SECRET) {
    throw new Error('API credentials not configured');
  }

  const url = `${ERPNEXT_API_URL}/api/resource/Sales Taxes and Charges Template/${encodeURIComponent(name)}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `token ${API_KEY}:${API_SECRET}`,
      'Content-Type': 'application/json',
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to retrieve template: ${text}`);
  }

  const result = await response.json();
  return result.data;
}

// Helper: Delete tax template via API
async function deleteTaxTemplate(name: string): Promise<void> {
  if (!API_KEY || !API_SECRET) {
    throw new Error('API credentials not configured');
  }

  const url = `${ERPNEXT_API_URL}/api/resource/Sales Taxes and Charges Template/${encodeURIComponent(name)}`;
  
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `token ${API_KEY}:${API_SECRET}`,
      'Content-Type': 'application/json',
    }
  });

  if (!response.ok && response.status !== 404) {
    const text = await response.text();
    throw new Error(`Failed to delete template: ${text}`);
  }
}

// Property Test: Round-trip persistence
async function testTaxTemplatePersistence(iteration: number): Promise<boolean> {
  let templateName: string | null = null;
  
  try {
    // Step 1: Generate random tax template data
    const originalData = generateRandomTaxTemplate(iteration);
    
    // Step 2: Create template via API
    const created = await createTaxTemplate(originalData);
    templateName = created.name;
    
    // Step 3: Retrieve template from database
    const retrieved = await getTaxTemplate(templateName);
    
    // Step 4: Verify all fields match
    const titleMatch = retrieved.title === originalData.title;
    const companyMatch = retrieved.company === originalData.company;
    const rateMatch = Math.abs(retrieved.taxes[0].rate - originalData.taxes[0].rate) < 0.01;
    const accountMatch = retrieved.taxes[0].account_head === originalData.taxes[0].account_head;
    const descriptionMatch = retrieved.taxes[0].description === originalData.taxes[0].description;
    
    const allMatch = titleMatch && companyMatch && rateMatch && accountMatch && descriptionMatch;
    
    if (!allMatch) {
      console.error(`❌ Iteration ${iteration} FAILED:`);
      console.error(`   Title match: ${titleMatch}`);
      console.error(`   Company match: ${companyMatch}`);
      console.error(`   Rate match: ${rateMatch} (${retrieved.taxes[0].rate} vs ${originalData.taxes[0].rate})`);
      console.error(`   Account match: ${accountMatch}`);
      console.error(`   Description match: ${descriptionMatch}`);
    }
    
    return allMatch;
    
  } catch (error: any) {
    console.error(`❌ Iteration ${iteration} ERROR: ${error.message}`);
    return false;
  } finally {
    // Cleanup: Delete test template
    if (templateName) {
      try {
        await deleteTaxTemplate(templateName);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }
}

// Main test runner
async function runPropertyTest() {
  console.log('='.repeat(60));
  console.log('🧪 Property Test: Tax Template Persistence');
  console.log('   Task 1.7: Round-trip property test');
  console.log('   Validates: Requirements 1.5');
  console.log('='.repeat(60));

  if (!API_KEY || !API_SECRET) {
    console.error('\n❌ Error: API credentials not configured');
    console.error('   Please set ERP_API_KEY and ERP_API_SECRET in .env file');
    process.exit(1);
  }

  console.log(`\n✅ API credentials configured`);
  console.log(`   API URL: ${ERPNEXT_API_URL}`);
  console.log(`   Running 100 iterations...\n`);

  const iterations = 100;
  let passed = 0;
  let failed = 0;

  for (let i = 1; i <= iterations; i++) {
    const result = await testTaxTemplatePersistence(i);
    
    if (result) {
      passed++;
      if (i % 10 === 0) {
        console.log(`✅ Iteration ${i}/${iterations} - ${passed} passed, ${failed} failed`);
      }
    } else {
      failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Results');
  console.log('='.repeat(60));
  console.log(`Total iterations: ${iterations}`);
  console.log(`Passed: ${passed} (${(passed/iterations*100).toFixed(1)}%)`);
  console.log(`Failed: ${failed} (${(failed/iterations*100).toFixed(1)}%)`);
  
  if (failed === 0) {
    console.log('\n✅ Property Test PASSED');
    console.log('   All tax templates persisted correctly');
    process.exit(0);
  } else {
    console.log('\n❌ Property Test FAILED');
    console.log(`   ${failed} iterations failed`);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  runPropertyTest().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { testTaxTemplatePersistence, generateRandomTaxTemplate };
