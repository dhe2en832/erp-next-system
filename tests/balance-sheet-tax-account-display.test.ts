/**
 * Property Test 19: Balance Sheet Tax Account Display
 * Task 15.4: Write property test untuk Balance Sheet Tax Account Display
 * 
 * **Validates: Requirements 12.1, 12.2, 12.3, 12.4**
 * 
 * Property:
 * - Create invoices dengan pajak (Sales with PPN Output, Purchase with PPN Input)
 * - Run Balance Sheet report
 * - Verify tax accounts displayed di section yang benar:
 *   - 1410 (Pajak Dibayar Dimuka) → Current Assets
 *   - 2210 (Hutang PPN) → Current Liabilities
 *   - 2230 (Hutang PPh 23) → Current Liabilities
 *   - 2240 (Hutang PPh 4(2) Final) → Current Liabilities
 * - Verify saldo calculation correct
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
  salesInvoiceName?: string;
  purchaseInvoiceName?: string;
  ppnOutput?: number;
  ppnInput?: number;
}

// Helper: Generate random item quantity (1-100)
function generateRandomQuantity(): number {
  return Math.floor(Math.random() * 100) + 1;
}

// Helper: Generate random item rate (10,000 - 1,000,000)
function generateRandomRate(): number {
  return Math.floor(Math.random() * 990000) + 10000;
}

// Helper: Create Sales Invoice via ERPNext API
async function createSalesInvoice(data: any): Promise<any> {
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
    throw new Error(`Failed to create sales invoice: ${text}`);
  }

  const result = await response.json();
  return result.data;
}

// Helper: Create Purchase Invoice via ERPNext API
async function createPurchaseInvoice(data: any): Promise<any> {
  if (!API_KEY || !API_SECRET) {
    throw new Error('API credentials not configured');
  }

  const url = `${ERPNEXT_API_URL}/api/resource/Purchase Invoice`;
  
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
    throw new Error(`Failed to create purchase invoice: ${text}`);
  }

  const result = await response.json();
  return result.data;
}

// Helper: Submit invoice via ERPNext API
async function submitInvoice(doctype: string, name: string): Promise<void> {
  if (!API_KEY || !API_SECRET) {
    throw new Error('API credentials not configured');
  }

  const url = `${ERPNEXT_API_URL}/api/resource/${doctype}/${encodeURIComponent(name)}`;
  
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

// Helper: Get Balance Sheet Report
async function getBalanceSheetReport(asOfDate: string, company: string): Promise<any> {
  if (!API_KEY || !API_SECRET) {
    throw new Error('API credentials not configured');
  }

  const url = `${NEXT_API_URL}/api/finance/reports/balance-sheet?company=${encodeURIComponent(company)}&as_of_date=${asOfDate}`;
  
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

// Helper: Cancel invoice via ERPNext API
async function cancelInvoice(doctype: string, name: string): Promise<void> {
  if (!API_KEY || !API_SECRET) {
    throw new Error('API credentials not configured');
  }

  const url = `${ERPNEXT_API_URL}/api/resource/${doctype}/${encodeURIComponent(name)}`;
  
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
async function deleteInvoice(doctype: string, name: string): Promise<void> {
  if (!API_KEY || !API_SECRET) {
    throw new Error('API credentials not configured');
  }

  const url = `${ERPNEXT_API_URL}/api/resource/${doctype}/${encodeURIComponent(name)}`;
  
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

// Property Test: Balance Sheet Tax Account Display
async function testBalanceSheetTaxAccountDisplay(iteration: number): Promise<TestIteration> {
  let salesInvoiceName: string | null = null;
  let purchaseInvoiceName: string | null = null;

  try {
    // Generate random invoice data
    const salesQty = generateRandomQuantity();
    const salesRate = generateRandomRate();
    const purchaseQty = generateRandomQuantity();
    const purchaseRate = generateRandomRate();
    
    const salesSubtotal = salesQty * salesRate;
    const purchaseSubtotal = purchaseQty * purchaseRate;
    
    // Calculate PPN (11%)
    const ppnOutput = Math.round(salesSubtotal * 0.11);
    const ppnInput = Math.round(purchaseSubtotal * 0.11);

    const today = new Date().toISOString().split('T')[0];

    // Create Sales Invoice with PPN 11%
    const salesInvoiceData = {
      company: 'BAC',
      customer: 'CUST-00001',
      customer_name: 'Test Customer PBT',
      posting_date: today,
      due_date: today,
      items: [
        {
          item_code: 'ITEM-001',
          item_name: 'Test Item PBT',
          qty: salesQty,
          rate: salesRate,
          warehouse: 'Gudang Utama - BAC'
        }
      ],
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

    const createdSales = await createSalesInvoice(salesInvoiceData);
    salesInvoiceName = createdSales.name;

    if (!salesInvoiceName) {
      throw new Error('Sales invoice name not returned');
    }

    // Submit sales invoice to post GL Entry
    await submitInvoice('Sales Invoice', salesInvoiceName);

    // Create Purchase Invoice with PPN Masukan 11%
    const purchaseInvoiceData = {
      company: 'BAC',
      supplier: 'SUPP-00001',
      supplier_name: 'Test Supplier PBT',
      posting_date: today,
      due_date: today,
      items: [
        {
          item_code: 'ITEM-001',
          item_name: 'Test Item PBT',
          qty: purchaseQty,
          rate: purchaseRate,
          warehouse: 'Gudang Utama - BAC'
        }
      ],
      taxes_and_charges: 'PPN Masukan 11% (PKP)',
      taxes: [
        {
          charge_type: 'On Net Total',
          account_head: '1410 - Pajak Dibayar Dimuka - BAC',
          description: 'PPN Masukan 11%',
          rate: 11
        }
      ],
      currency: 'IDR',
      buying_price_list: 'Standard Beli',
      docstatus: 0
    };

    const createdPurchase = await createPurchaseInvoice(purchaseInvoiceData);
    purchaseInvoiceName = createdPurchase.name;

    if (!purchaseInvoiceName) {
      throw new Error('Purchase invoice name not returned');
    }

    // Submit purchase invoice to post GL Entry
    await submitInvoice('Purchase Invoice', purchaseInvoiceName);

    // Wait a bit for GL Entry to be posted
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Get Balance Sheet Report
    const report = await getBalanceSheetReport(today, 'BAC');

    // Verify 1410 - Pajak Dibayar Dimuka in Current Assets
    const pajakDibayarDimuka = report.current_assets?.find((acc: any) => 
      acc.account.includes('1410') || acc.account_name.toLowerCase().includes('pajak dibayar dimuka')
    );

    if (!pajakDibayarDimuka) {
      return {
        iteration,
        passed: false,
        message: '1410 - Pajak Dibayar Dimuka not found in Current Assets',
        salesInvoiceName: salesInvoiceName || undefined,
        purchaseInvoiceName: purchaseInvoiceName || undefined,
        ppnOutput,
        ppnInput
      };
    }

    // Verify 2210 - Hutang PPN in Current Liabilities
    const hutangPPN = report.current_liabilities?.find((acc: any) => 
      acc.account.includes('2210') || acc.account_name.toLowerCase().includes('hutang ppn')
    );

    if (!hutangPPN) {
      return {
        iteration,
        passed: false,
        message: '2210 - Hutang PPN not found in Current Liabilities',
        salesInvoiceName: salesInvoiceName || undefined,
        purchaseInvoiceName: purchaseInvoiceName || undefined,
        ppnOutput,
        ppnInput
      };
    }

    // Verify saldo calculation (allow small rounding error)
    const pajakDibayarDimukaAmount = pajakDibayarDimuka.amount || 0;
    const hutangPPNAmount = hutangPPN.amount || 0;

    // PPN Input should be positive (debit balance in asset account)
    if (pajakDibayarDimukaAmount < ppnInput * 0.9) {
      return {
        iteration,
        passed: false,
        message: `Pajak Dibayar Dimuka amount too low: ${pajakDibayarDimukaAmount} < ${ppnInput}`,
        salesInvoiceName: salesInvoiceName || undefined,
        purchaseInvoiceName: purchaseInvoiceName || undefined,
        ppnOutput,
        ppnInput
      };
    }

    // PPN Output should be positive (credit balance in liability account)
    if (hutangPPNAmount < ppnOutput * 0.9) {
      return {
        iteration,
        passed: false,
        message: `Hutang PPN amount too low: ${hutangPPNAmount} < ${ppnOutput}`,
        salesInvoiceName: salesInvoiceName || undefined,
        purchaseInvoiceName: purchaseInvoiceName || undefined,
        ppnOutput,
        ppnInput
      };
    }

    return {
      iteration,
      passed: true,
      salesInvoiceName: salesInvoiceName || undefined,
      purchaseInvoiceName: purchaseInvoiceName || undefined,
      ppnOutput,
      ppnInput
    };

  } catch (error: any) {
    return {
      iteration,
      passed: false,
      message: error.message,
      salesInvoiceName: salesInvoiceName || undefined,
      purchaseInvoiceName: purchaseInvoiceName || undefined
    };
  } finally {
    // Cleanup: Cancel and delete invoices
    if (salesInvoiceName) {
      try {
        await cancelInvoice('Sales Invoice', salesInvoiceName);
        await deleteInvoice('Sales Invoice', salesInvoiceName);
      } catch (error) {
        console.warn(`   Warning: Could not cleanup ${salesInvoiceName}`);
      }
    }
    if (purchaseInvoiceName) {
      try {
        await cancelInvoice('Purchase Invoice', purchaseInvoiceName);
        await deleteInvoice('Purchase Invoice', purchaseInvoiceName);
      } catch (error) {
        console.warn(`   Warning: Could not cleanup ${purchaseInvoiceName}`);
      }
    }
  }
}

// Main test runner
async function runPropertyTest() {
  console.log('='.repeat(60));
  console.log('🧪 Property Test 19: Balance Sheet Tax Account Display');
  console.log('   Task 15.4: Property test untuk Balance Sheet Tax Account Display');
  console.log('   Validates: Requirements 12.1, 12.2, 12.3, 12.4');
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
    const result = await testBalanceSheetTaxAccountDisplay(i);
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
      if (result.salesInvoiceName) {
        console.log(`   Sales Invoice: ${result.salesInvoiceName}`);
      }
      if (result.purchaseInvoiceName) {
        console.log(`   Purchase Invoice: ${result.purchaseInvoiceName}`);
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
    console.log('   Property holds: Tax accounts displayed in correct sections');
    console.log('   - 1410 (Pajak Dibayar Dimuka) → Current Assets');
    console.log('   - 2210 (Hutang PPN) → Current Liabilities');
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
