/**
 * Property Test 21: Currency Formatting Consistency
 * Task 17.5: Write property test untuk Currency Formatting Consistency
 * 
 * **Validates: Requirements 11.5, 12.5**
 * 
 * Property:
 * - Generate random currency values
 * - Verify format output matches pattern: /^Rp\s[\d{1,3}(\.\d{3})*,\d{2}$/
 * - Test di semua reports (Profit & Loss, Balance Sheet, VAT Report)
 * - Run dengan minimum 100 iterations
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
const NEXT_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const COMPANY = process.env.ERP_DEFAULT_COMPANY || 'BAC';

interface TestIteration {
  iteration: number;
  passed: boolean;
  message?: string;
  invalidFormats?: string[];
}

// Currency format pattern: Rp 1.000.000,00
// Pattern explanation:
// - Starts with "Rp "
// - Followed by digits with thousand separators (.)
// - Ends with comma and 2 decimal places
const CURRENCY_PATTERN = /^Rp\s[\d]{1,3}(?:\.\d{3})*,\d{2}$/;

// Helper: Generate random amount (100 - 100,000,000)
function generateRandomAmount(): number {
  return Math.floor(Math.random() * 99999900) + 100;
}

// Helper: Create Sales Invoice with random amount
async function createSalesInvoice(amount: number): Promise<any> {
  if (!API_KEY || !API_SECRET) {
    throw new Error('API credentials not configured');
  }

  const today = new Date().toISOString().split('T')[0];
  const url = `${ERPNEXT_API_URL}/api/resource/Sales Invoice`;
  
  const data = {
    company: COMPANY,
    customer: 'CUST-00001',
    customer_name: 'Test Customer',
    posting_date: today,
    due_date: today,
    items: [
      {
        item_code: 'ITEM-001',
        item_name: 'Test Item',
        qty: 1,
        rate: amount,
        warehouse: 'Gudang Utama - BAC'
      }
    ],
    discount_percentage: 10,
    taxes_and_charges: 'PPN 11%',
    taxes: [
      {
        charge_type: 'On Net Total',
        account_head: '2210 - Hutang PPN - BAC',
        description: 'PPN 11%',
        rate: 11
      }
    ],
    currency: 'IDR',
    selling_price_list: 'Standard Jual',
    territory: 'Semua Wilayah',
    docstatus: 0
  };

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
    throw new Error(`Failed to create sales invoice: ${text}`);
  }

  const result = await response.json();
  return result.data;
}

// Helper: Submit invoice
async function submitInvoice(name: string): Promise<void> {
  if (!API_KEY || !API_SECRET) {
    throw new Error('API credentials not configured');
  }

  const url = `${ERPNEXT_API_URL}/api/resource/Sales Invoice/${encodeURIComponent(name)}`;
  
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${API_KEY}:${API_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ docstatus: 1 })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to submit invoice: ${text}`);
  }
}

// Helper: Get Profit & Loss Report
async function getProfitLossReport(date: string): Promise<any> {
  if (!API_KEY || !API_SECRET) {
    throw new Error('API credentials not configured');
  }

  const url = `${NEXT_API_URL}/api/finance/reports/profit-loss?company=${encodeURIComponent(COMPANY)}&from_date=${date}&to_date=${date}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `token ${API_KEY}:${API_SECRET}`,
      'Content-Type': 'application/json',
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to get profit loss report: ${text}`);
  }

  const result = await response.json();
  return result.data;
}

// Helper: Get Balance Sheet Report
async function getBalanceSheetReport(date: string): Promise<any> {
  if (!API_KEY || !API_SECRET) {
    throw new Error('API credentials not configured');
  }

  const url = `${NEXT_API_URL}/api/finance/reports/balance-sheet?company=${encodeURIComponent(COMPANY)}&as_of_date=${date}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `token ${API_KEY}:${API_SECRET}`,
      'Content-Type': 'application/json',
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to get balance sheet report: ${text}`);
  }

  const result = await response.json();
  return result.data;
}

// Helper: Get VAT Report
async function getVATReport(date: string): Promise<any> {
  if (!API_KEY || !API_SECRET) {
    throw new Error('API credentials not configured');
  }

  const url = `${NEXT_API_URL}/api/finance/reports/vat-report?company=${encodeURIComponent(COMPANY)}&from_date=${date}&to_date=${date}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `token ${API_KEY}:${API_SECRET}`,
      'Content-Type': 'application/json',
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to get VAT report: ${text}`);
  }

  const result = await response.json();
  return result.data;
}

// Helper: Cleanup invoice
async function cleanupInvoice(name: string): Promise<void> {
  if (!API_KEY || !API_SECRET) return;

  try {
    const url = `${ERPNEXT_API_URL}/api/resource/Sales Invoice/${encodeURIComponent(name)}`;
    
    // Cancel
    await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${API_KEY}:${API_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ docstatus: 2 })
    });

    // Delete
    await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `token ${API_KEY}:${API_SECRET}`,
        'Content-Type': 'application/json',
      }
    });
  } catch (error) {
    // Ignore cleanup errors
  }
}

// Helper: Validate currency format in object
function validateCurrencyFormats(obj: any, path: string = ''): string[] {
  const invalidFormats: string[] = [];

  if (obj === null || obj === undefined) {
    return invalidFormats;
  }

  if (typeof obj === 'string') {
    // Check if this looks like a formatted currency string
    if (obj.startsWith('Rp ') || obj.startsWith('Rp')) {
      if (!CURRENCY_PATTERN.test(obj)) {
        invalidFormats.push(`${path}: "${obj}"`);
      }
    }
  } else if (typeof obj === 'object') {
    // Check if this is a formatted field (usually ends with _formatted or has 'formatted' in key)
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const newPath = path ? `${path}.${key}` : key;
        
        // Only check formatted fields
        if (key.includes('formatted') || key.endsWith('_formatted')) {
          const value = obj[key];
          
          if (typeof value === 'string' && (value.startsWith('Rp ') || value.startsWith('Rp'))) {
            if (!CURRENCY_PATTERN.test(value)) {
              invalidFormats.push(`${newPath}: "${value}"`);
            }
          } else if (typeof value === 'object') {
            invalidFormats.push(...validateCurrencyFormats(value, newPath));
          }
        } else if (typeof obj[key] === 'object') {
          // Recursively check nested objects
          invalidFormats.push(...validateCurrencyFormats(obj[key], newPath));
        }
      }
    }
  }

  return invalidFormats;
}

// Property Test: Currency Formatting Consistency
async function testCurrencyFormattingConsistency(iteration: number): Promise<TestIteration> {
  let invoiceName: string | null = null;

  try {
    // Generate random amount
    const amount = generateRandomAmount();

    // Create and submit invoice
    const invoice = await createSalesInvoice(amount);
    invoiceName = invoice.name;
    
    if (!invoiceName) {
      throw new Error('Invoice name is null');
    }
    
    await submitInvoice(invoiceName);

    // Wait for GL Entry posting
    await new Promise(resolve => setTimeout(resolve, 1000));

    const today = new Date().toISOString().split('T')[0];
    const invalidFormats: string[] = [];

    // Test Profit & Loss Report
    const profitLoss = await getProfitLossReport(today);
    invalidFormats.push(...validateCurrencyFormats(profitLoss, 'ProfitLoss'));

    // Test Balance Sheet Report
    const balanceSheet = await getBalanceSheetReport(today);
    invalidFormats.push(...validateCurrencyFormats(balanceSheet, 'BalanceSheet'));

    // Test VAT Report
    const vatReport = await getVATReport(today);
    invalidFormats.push(...validateCurrencyFormats(vatReport, 'VATReport'));

    if (invalidFormats.length > 0) {
      return {
        iteration,
        passed: false,
        message: `Found ${invalidFormats.length} invalid currency formats`,
        invalidFormats
      };
    }

    return {
      iteration,
      passed: true
    };

  } catch (error: any) {
    return {
      iteration,
      passed: false,
      message: error.message
    };
  } finally {
    if (invoiceName) {
      await cleanupInvoice(invoiceName);
    }
  }
}

// Main test runner
async function runPropertyTest() {
  console.log('='.repeat(60));
  console.log('🧪 Property Test 21: Currency Formatting Consistency');
  console.log('   Task 17.5: Property test untuk Currency Formatting');
  console.log('   Validates: Requirements 11.5, 12.5');
  console.log('='.repeat(60));

  if (!API_KEY || !API_SECRET) {
    console.error('\n❌ Error: API credentials not configured');
    console.error('   Please set ERP_API_KEY and ERP_API_SECRET in .env file');
    process.exit(1);
  }

  console.log(`\n✅ API credentials configured`);
  console.log(`   ERPNext URL: ${ERPNEXT_API_URL}`);
  console.log(`   Next.js API URL: ${NEXT_API_URL}`);
  console.log(`   Company: ${COMPANY}`);
  console.log(`\n📋 Currency format pattern: Rp 1.000.000,00`);
  console.log(`   Pattern: ${CURRENCY_PATTERN}`);
  console.log(`\n📋 Running property test with 100 iterations...\n`);

  const iterations = 100;
  const results: TestIteration[] = [];

  for (let i = 1; i <= iterations; i++) {
    const result = await testCurrencyFormattingConsistency(i);
    results.push(result);

    if (result.passed) {
      if (i % 10 === 0) {
        console.log(`✅ Iteration ${i}/${iterations} - PASSED`);
      }
    } else {
      console.log(`❌ Iteration ${i}/${iterations} - FAILED`);
      if (result.message) {
        console.log(`   ${result.message}`);
      }
      if (result.invalidFormats && result.invalidFormats.length > 0) {
        console.log('   Invalid formats:');
        result.invalidFormats.slice(0, 5).forEach(format => {
          console.log(`     - ${format}`);
        });
        if (result.invalidFormats.length > 5) {
          console.log(`     ... and ${result.invalidFormats.length - 5} more`);
        }
      }
    }
  }

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log('\n' + '='.repeat(60));
  console.log('📊 Property Test Results');
  console.log('='.repeat(60));
  console.log(`Total iterations: ${iterations}`);
  console.log(`Passed: ${passed} (${(passed/iterations*100).toFixed(1)}%)`);
  console.log(`Failed: ${failed} (${(failed/iterations*100).toFixed(1)}%)`);

  if (failed > 0) {
    console.log('\n❌ Failed iterations:');
    const failedResults = results.filter(r => !r.passed);
    failedResults.slice(0, 10).forEach(r => {
      console.log(`   Iteration ${r.iteration}: ${r.message}`);
      if (r.invalidFormats && r.invalidFormats.length > 0) {
        r.invalidFormats.slice(0, 3).forEach(format => {
          console.log(`     - ${format}`);
        });
      }
    });
    if (failedResults.length > 10) {
      console.log(`   ... and ${failedResults.length - 10} more failed iterations`);
    }
  }
  
  if (failed === 0) {
    console.log('\n✅ Property Test PASSED - All 100 iterations successful');
    console.log('   Property holds: All currency values formatted correctly');
    console.log('   Format: Rp 1.000.000,00 (Indonesian Rupiah)');
    process.exit(0);
  } else {
    console.log('\n❌ Property Test FAILED');
    console.log(`   ${failed} out of ${iterations} iterations failed`);
    console.log('   Some currency values are not formatted correctly');
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

export { runPropertyTest };
