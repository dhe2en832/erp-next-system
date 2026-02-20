/**
 * Property Test 18: Profit Loss Report Discount Display
 * Task 14.5: Write property test untuk Profit Loss Report Discount Display
 * 
 * **Validates: Requirements 11.1, 11.3**
 * 
 * Property:
 * - Create sales invoices dengan diskon
 * - Run Profit Loss report
 * - Verify "Potongan Penjualan" line exists
 * - Verify Net Sales = Gross Sales - Potongan Penjualan
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

interface TestIteration {
  iteration: number;
  passed: boolean;
  message?: string;
  invoiceName?: string;
  discountAmount?: number;
  grossSales?: number;
  salesDiscount?: number;
  netSales?: number;
}

// Helper: Generate random discount percentage (1-50%)
function generateRandomDiscountPercentage(): number {
  return Math.floor(Math.random() * 50) + 1;
}

// Helper: Generate random item quantity (1-100)
function generateRandomQuantity(): number {
  return Math.floor(Math.random() * 100) + 1;
}

// Helper: Generate random item rate (10,000 - 1,000,000)
function generateRandomRate(): number {
  return Math.floor(Math.random() * 990000) + 10000;
}

// Helper: Create invoice via ERPNext API
async function createInvoice(data: any): Promise<any> {
  if (!API_KEY || !API_SECRET) {
    throw new Error('API credentials not configured');
  }

  const url = `${ERPNEXT_API_URL}/api/resource/Sales Invoice`;
  
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
    throw new Error(`Failed to create invoice: ${text}`);
  }

  const result = await response.json();
  return result.data;
}

// Helper: Submit invoice via ERPNext API
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
async function getProfitLossReport(fromDate: string, toDate: string, company: string): Promise<any> {
  if (!API_KEY || !API_SECRET) {
    throw new Error('API credentials not configured');
  }

  const url = `${NEXT_API_URL}/api/finance/reports/profit-loss?company=${encodeURIComponent(company)}&from_date=${fromDate}&to_date=${toDate}`;
  
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

// Helper: Cancel invoice via ERPNext API
async function cancelInvoice(name: string): Promise<void> {
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
    body: JSON.stringify({ docstatus: 2 })
  });

  if (!response.ok && response.status !== 404) {
    const text = await response.text();
    console.warn(`Warning: Failed to cancel invoice: ${text}`);
  }
}

// Helper: Delete invoice via ERPNext API
async function deleteInvoice(name: string): Promise<void> {
  if (!API_KEY || !API_SECRET) {
    throw new Error('API credentials not configured');
  }

  const url = `${ERPNEXT_API_URL}/api/resource/Sales Invoice/${encodeURIComponent(name)}`;
  
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `token ${API_KEY}:${API_SECRET}`,
      'Content-Type': 'application/json',
    }
  });

  if (!response.ok && response.status !== 404) {
    const text = await response.text();
    console.warn(`Warning: Failed to delete invoice: ${text}`);
  }
}

// Property Test: Profit Loss Report Discount Display
async function testProfitLossReportDiscountDisplay(iteration: number): Promise<TestIteration> {
  let invoiceName: string | null = null;

  try {
    // Generate random invoice data
    const qty = generateRandomQuantity();
    const rate = generateRandomRate();
    const discountPercentage = generateRandomDiscountPercentage();
    
    const subtotal = qty * rate;
    const discountAmount = Math.round(subtotal * discountPercentage / 100);
    const netTotal = subtotal - discountAmount;

    const today = new Date().toISOString().split('T')[0];

    // Create invoice with discount
    const invoiceData = {
      company: 'BAC',
      customer: 'CUST-00001',
      customer_name: 'Test Customer PBT',
      posting_date: today,
      due_date: today,
      items: [
        {
          item_code: 'ITEM-001',
          item_name: 'Test Item PBT',
          qty: qty,
          rate: rate,
          warehouse: 'Gudang Utama - BAC'
        }
      ],
      discount_percentage: discountPercentage,
      apply_discount_on: 'Net Total',
      currency: 'IDR',
      selling_price_list: 'Standard Jual',
      territory: 'Semua Wilayah',
      docstatus: 0
    };

    const created = await createInvoice(invoiceData);
    invoiceName = created.name;

    if (!invoiceName) {
      throw new Error('Invoice name not returned');
    }

    // Submit invoice to post GL Entry
    await submitInvoice(invoiceName);

    // Wait a bit for GL Entry to be posted
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Get Profit & Loss Report
    const report = await getProfitLossReport(today, today, 'BAC');

    // Verify "Potongan Penjualan" line exists in income_accounts
    const salesDiscountLine = report.income_accounts?.find((acc: any) => 
      acc.account.includes('4300') || acc.account_name.toLowerCase().includes('potongan penjualan')
    );

    if (!salesDiscountLine) {
      return {
        iteration,
        passed: false,
        message: 'Potongan Penjualan line not found in report',
        invoiceName: invoiceName || undefined,
        discountAmount
      };
    }

    // Verify Net Sales calculation
    const grossSales = report.summary?.gross_sales || 0;
    const salesDiscount = report.summary?.sales_discount || 0;
    const netSales = report.summary?.net_sales || 0;

    // Allow small rounding error (0.01)
    const netSalesCorrect = Math.abs(netSales - (grossSales - salesDiscount)) < 0.01;

    if (!netSalesCorrect) {
      return {
        iteration,
        passed: false,
        message: `Net Sales calculation incorrect: ${netSales} != ${grossSales} - ${salesDiscount}`,
        invoiceName: invoiceName || undefined,
        discountAmount,
        grossSales,
        salesDiscount,
        netSales
      };
    }

    // Verify discount amount is reflected in report
    const discountInReportCorrect = Math.abs(salesDiscount - discountAmount) < 1;

    if (!discountInReportCorrect) {
      return {
        iteration,
        passed: false,
        message: `Discount amount mismatch: report=${salesDiscount}, expected=${discountAmount}`,
        invoiceName: invoiceName || undefined,
        discountAmount,
        grossSales,
        salesDiscount,
        netSales
      };
    }

    return {
      iteration,
      passed: true,
      invoiceName: invoiceName || undefined,
      discountAmount,
      grossSales,
      salesDiscount,
      netSales
    };

  } catch (error: any) {
    return {
      iteration,
      passed: false,
      message: error.message,
      invoiceName: invoiceName || undefined
    };
  } finally {
    // Cleanup: Cancel and delete invoice
    if (invoiceName) {
      try {
        await cancelInvoice(invoiceName);
        await deleteInvoice(invoiceName);
      } catch (error) {
        console.warn(`   Warning: Could not cleanup ${invoiceName}`);
      }
    }
  }
}

// Main test runner
async function runPropertyTest() {
  console.log('='.repeat(60));
  console.log('🧪 Property Test 18: Profit Loss Report Discount Display');
  console.log('   Task 14.5: Property test untuk Profit Loss Report');
  console.log('   Validates: Requirements 11.1, 11.3');
  console.log('='.repeat(60));

  if (!API_KEY || !API_SECRET) {
    console.error('\n❌ Error: API credentials not configured');
    console.error('   Please set ERP_API_KEY and ERP_API_SECRET in .env file');
    process.exit(1);
  }

  console.log(`\n✅ API credentials configured`);
  console.log(`   ERPNext URL: ${ERPNEXT_API_URL}`);
  console.log(`   Next.js API URL: ${NEXT_API_URL}`);
  console.log(`\n📋 Running property test with 100 iterations...\n`);

  const iterations = 100;
  const results: TestIteration[] = [];

  for (let i = 1; i <= iterations; i++) {
    const result = await testProfitLossReportDiscountDisplay(i);
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
      if (result.invoiceName) {
        console.log(`   Invoice: ${result.invoiceName}`);
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
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   Iteration ${r.iteration}: ${r.message}`);
    });
  }
  
  if (failed === 0) {
    console.log('\n✅ Property Test PASSED - All 100 iterations successful');
    console.log('   Property holds: Net Sales = Gross Sales - Potongan Penjualan');
    process.exit(0);
  } else {
    console.log('\n❌ Property Test FAILED');
    console.log(`   ${failed} out of ${iterations} iterations failed`);
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
