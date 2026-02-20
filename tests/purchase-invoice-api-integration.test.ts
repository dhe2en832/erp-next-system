/**
 * Integration Tests: Purchase Invoice API
 * Task 4.5: Write integration tests untuk Purchase Invoice API
 * 
 * Validates: Requirements 3.4, 3.5, 3.8, 15.4
 * 
 * Tests:
 * - Create invoice dengan discount_percentage
 * - Create invoice dengan discount_amount
 * - Create invoice dengan PPN Masukan 11%
 * - Create invoice dengan discount + PPN Masukan
 * - GET invoice lama (backward compatibility)
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

interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
  invoiceName?: string;
}

// Helper: Create invoice via ERPNext API
async function createInvoice(data: any): Promise<any> {
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
    throw new Error(`Failed to create invoice: ${text}`);
  }

  const result = await response.json();
  return result.data;
}

// Helper: Get invoice via ERPNext API
async function getInvoice(name: string): Promise<any> {
  if (!API_KEY || !API_SECRET) {
    throw new Error('API credentials not configured');
  }

  const url = `${ERPNEXT_API_URL}/api/resource/Purchase Invoice/${encodeURIComponent(name)}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `token ${API_KEY}:${API_SECRET}`,
      'Content-Type': 'application/json',
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to get invoice: ${text}`);
  }

  const result = await response.json();
  return result.data;
}

// Helper: Delete invoice via ERPNext API
async function deleteInvoice(name: string): Promise<void> {
  if (!API_KEY || !API_SECRET) {
    throw new Error('API credentials not configured');
  }

  const url = `${ERPNEXT_API_URL}/api/resource/Purchase Invoice/${encodeURIComponent(name)}`;
  
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

// Helper: Create base invoice data
function createBaseInvoiceData(): any {
  return {
    company: 'BAC',
    supplier: 'SUPP-00001',
    supplier_name: 'Test Supplier Integration',
    posting_date: new Date().toISOString().split('T')[0],
    due_date: new Date().toISOString().split('T')[0],
    items: [
      {
        item_code: 'ITEM-001',
        item_name: 'Test Item',
        qty: 10,
        rate: 100000,
        warehouse: 'Gudang Utama - BAC'
      }
    ],
    currency: 'IDR',
    buying_price_list: 'Standard Beli',
    docstatus: 0
  };
}

// Test 1: Create invoice with discount_percentage
async function testCreateInvoiceWithDiscountPercentage(): Promise<TestResult> {
  let invoiceName: string | null = null;

  try {
    const invoiceData = {
      ...createBaseInvoiceData(),
      discount_percentage: 10,
      apply_discount_on: 'Net Total'
    };

    const created = await createInvoice(invoiceData);
    invoiceName = created.name;

    if (!invoiceName) {
      throw new Error('Invoice name not returned');
    }

    // Verify discount was applied
    const retrieved = await getInvoice(invoiceName);

    const hasDiscount = retrieved.discount_percentage === 10;
    const discountAmountCorrect = Math.abs(retrieved.discount_amount - 100000) < 1; // 10% of 1,000,000
    const netTotalCorrect = Math.abs(retrieved.net_total - 900000) < 1; // 1,000,000 - 100,000

    if (hasDiscount && discountAmountCorrect && netTotalCorrect) {
      return {
        name: 'Create Invoice with Discount Percentage',
        passed: true,
        invoiceName: invoiceName || undefined
      };
    } else {
      return {
        name: 'Create Invoice with Discount Percentage',
        passed: false,
        message: `Discount not applied correctly: percentage=${retrieved.discount_percentage}, amount=${retrieved.discount_amount}, net_total=${retrieved.net_total}`,
        invoiceName: invoiceName || undefined
      };
    }
  } catch (error: any) {
    return {
      name: 'Create Invoice with Discount Percentage',
      passed: false,
      message: error.message,
      invoiceName: invoiceName || undefined
    };
  }
}

// Test 2: Create invoice with discount_amount
async function testCreateInvoiceWithDiscountAmount(): Promise<TestResult> {
  let invoiceName: string | null = null;

  try {
    const invoiceData = {
      ...createBaseInvoiceData(),
      discount_amount: 150000,
      apply_discount_on: 'Net Total'
    };

    const created = await createInvoice(invoiceData);
    invoiceName = created.name;

    if (!invoiceName) {
      throw new Error('Invoice name not returned');
    }

    // Verify discount was applied
    const retrieved = await getInvoice(invoiceName);

    const hasDiscount = Math.abs(retrieved.discount_amount - 150000) < 1;
    const netTotalCorrect = Math.abs(retrieved.net_total - 850000) < 1; // 1,000,000 - 150,000

    if (hasDiscount && netTotalCorrect) {
      return {
        name: 'Create Invoice with Discount Amount',
        passed: true,
        invoiceName: invoiceName || undefined
      };
    } else {
      return {
        name: 'Create Invoice with Discount Amount',
        passed: false,
        message: `Discount not applied correctly: amount=${retrieved.discount_amount}, net_total=${retrieved.net_total}`,
        invoiceName: invoiceName || undefined
      };
    }
  } catch (error: any) {
    return {
      name: 'Create Invoice with Discount Amount',
      passed: false,
      message: error.message,
      invoiceName: invoiceName || undefined
    };
  }
}

// Test 3: Create invoice with PPN Masukan 11%
async function testCreateInvoiceWithPPNMasukan(): Promise<TestResult> {
  let invoiceName: string | null = null;

  try {
    const invoiceData = {
      ...createBaseInvoiceData(),
      taxes_and_charges: 'PPN Masukan 11% (PKP)',
      taxes: [
        {
          charge_type: 'On Net Total',
          account_head: '1410 - Pajak Dibayar Dimuka - BAC',
          description: 'PPN Masukan 11%',
          rate: 11
        }
      ]
    };

    const created = await createInvoice(invoiceData);
    invoiceName = created.name;

    if (!invoiceName) {
      throw new Error('Invoice name not returned');
    }

    // Verify tax was applied
    const retrieved = await getInvoice(invoiceName);

    const hasTax = retrieved.taxes_and_charges === 'PPN Masukan 11% (PKP)';
    const taxAmountCorrect = Math.abs(retrieved.total_taxes_and_charges - 110000) < 1; // 11% of 1,000,000
    const grandTotalCorrect = Math.abs(retrieved.grand_total - 1110000) < 1; // 1,000,000 + 110,000

    if (hasTax && taxAmountCorrect && grandTotalCorrect) {
      return {
        name: 'Create Invoice with PPN Masukan 11%',
        passed: true,
        invoiceName: invoiceName || undefined
      };
    } else {
      return {
        name: 'Create Invoice with PPN Masukan 11%',
        passed: false,
        message: `Tax not applied correctly: template=${retrieved.taxes_and_charges}, tax_amount=${retrieved.total_taxes_and_charges}, grand_total=${retrieved.grand_total}`,
        invoiceName: invoiceName || undefined
      };
    }
  } catch (error: any) {
    return {
      name: 'Create Invoice with PPN Masukan 11%',
      passed: false,
      message: error.message,
      invoiceName: invoiceName || undefined
    };
  }
}

// Test 4: Create invoice with discount + PPN Masukan
async function testCreateInvoiceWithDiscountAndPPN(): Promise<TestResult> {
  let invoiceName: string | null = null;

  try {
    const invoiceData = {
      ...createBaseInvoiceData(),
      discount_percentage: 10,
      apply_discount_on: 'Net Total',
      taxes_and_charges: 'PPN Masukan 11% (PKP)',
      taxes: [
        {
          charge_type: 'On Net Total',
          account_head: '1410 - Pajak Dibayar Dimuka - BAC',
          description: 'PPN Masukan 11%',
          rate: 11
        }
      ]
    };

    const created = await createInvoice(invoiceData);
    invoiceName = created.name;

    if (!invoiceName) {
      throw new Error('Invoice name not returned');
    }

    // Verify discount and tax were applied
    const retrieved = await getInvoice(invoiceName);

    // Calculation: subtotal 1,000,000 - discount 100,000 = 900,000 + tax 99,000 = 999,000
    const discountCorrect = Math.abs(retrieved.discount_amount - 100000) < 1;
    const netTotalCorrect = Math.abs(retrieved.net_total - 900000) < 1;
    const taxAmountCorrect = Math.abs(retrieved.total_taxes_and_charges - 99000) < 1; // 11% of 900,000
    const grandTotalCorrect = Math.abs(retrieved.grand_total - 999000) < 1;

    if (discountCorrect && netTotalCorrect && taxAmountCorrect && grandTotalCorrect) {
      return {
        name: 'Create Invoice with Discount + PPN Masukan',
        passed: true,
        invoiceName: invoiceName || undefined
      };
    } else {
      return {
        name: 'Create Invoice with Discount + PPN Masukan',
        passed: false,
        message: `Calculation incorrect: discount=${retrieved.discount_amount}, net_total=${retrieved.net_total}, tax=${retrieved.total_taxes_and_charges}, grand_total=${retrieved.grand_total}`,
        invoiceName: invoiceName || undefined
      };
    }
  } catch (error: any) {
    return {
      name: 'Create Invoice with Discount + PPN Masukan',
      passed: false,
      message: error.message,
      invoiceName: invoiceName || undefined
    };
  }
}

// Test 5: GET old invoice (backward compatibility)
async function testGetOldInvoiceBackwardCompatibility(): Promise<TestResult> {
  let invoiceName: string | null = null;

  try {
    // Create invoice without discount/tax (simulating old invoice)
    const invoiceData = createBaseInvoiceData();

    const created = await createInvoice(invoiceData);
    invoiceName = created.name;

    if (!invoiceName) {
      throw new Error('Invoice name not returned');
    }

    // Retrieve invoice
    const retrieved = await getInvoice(invoiceName);

    // Verify default values for backward compatibility
    const discountAmountIsZero = (retrieved.discount_amount || 0) === 0;
    const discountPercentageIsZero = (retrieved.discount_percentage || 0) === 0;
    const taxesIsEmptyOrZero = (retrieved.total_taxes_and_charges || 0) === 0;

    if (discountAmountIsZero && discountPercentageIsZero && taxesIsEmptyOrZero) {
      return {
        name: 'GET Old Invoice (Backward Compatibility)',
        passed: true,
        invoiceName: invoiceName || undefined
      };
    } else {
      return {
        name: 'GET Old Invoice (Backward Compatibility)',
        passed: false,
        message: `Old invoice has non-zero values: discount_amount=${retrieved.discount_amount}, discount_percentage=${retrieved.discount_percentage}, taxes=${retrieved.total_taxes_and_charges}`,
        invoiceName: invoiceName || undefined
      };
    }
  } catch (error: any) {
    return {
      name: 'GET Old Invoice (Backward Compatibility)',
      passed: false,
      message: error.message,
      invoiceName: invoiceName || undefined
    };
  }
}

// Main test runner
async function runIntegrationTests() {
  console.log('='.repeat(60));
  console.log('🧪 Integration Tests: Purchase Invoice API');
  console.log('   Task 4.5: Integration tests');
  console.log('   Validates: Requirements 3.4, 3.5, 3.8, 15.4');
  console.log('='.repeat(60));

  if (!API_KEY || !API_SECRET) {
    console.error('\n❌ Error: API credentials not configured');
    console.error('   Please set ERP_API_KEY and ERP_API_SECRET in .env file');
    process.exit(1);
  }

  console.log(`\n✅ API credentials configured`);
  console.log(`   ERPNext URL: ${ERPNEXT_API_URL}`);
  console.log(`\n📋 Running integration tests...\n`);

  const tests = [
    testCreateInvoiceWithDiscountPercentage,
    testCreateInvoiceWithDiscountAmount,
    testCreateInvoiceWithPPNMasukan,
    testCreateInvoiceWithDiscountAndPPN,
    testGetOldInvoiceBackwardCompatibility
  ];

  const results: TestResult[] = [];
  const createdInvoices: string[] = [];

  for (const test of tests) {
    const result = await test();
    results.push(result);
    
    if (result.invoiceName) {
      createdInvoices.push(result.invoiceName);
    }
    
    if (result.passed) {
      console.log(`✅ ${result.name}`);
      if (result.invoiceName) {
        console.log(`   Invoice: ${result.invoiceName}`);
      }
    } else {
      console.log(`❌ ${result.name}`);
      if (result.message) {
        console.log(`   ${result.message}`);
      }
      if (result.invoiceName) {
        console.log(`   Invoice: ${result.invoiceName}`);
      }
    }
  }

  // Cleanup: Delete created invoices
  console.log(`\n🧹 Cleaning up ${createdInvoices.length} test invoices...`);
  for (const invoiceName of createdInvoices) {
    try {
      await deleteInvoice(invoiceName);
      console.log(`   Deleted: ${invoiceName}`);
    } catch (error: any) {
      console.warn(`   Failed to delete ${invoiceName}: ${error.message}`);
    }
  }

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Results');
  console.log('='.repeat(60));
  console.log(`Total tests: ${results.length}`);
  console.log(`Passed: ${passed} (${(passed/results.length*100).toFixed(1)}%)`);
  console.log(`Failed: ${failed} (${(failed/results.length*100).toFixed(1)}%)`);
  
  if (failed === 0) {
    console.log('\n✅ All Integration Tests PASSED');
    process.exit(0);
  } else {
    console.log('\n❌ Some Integration Tests FAILED');
    process.exit(1);
  }
}

// Run the tests
if (require.main === module) {
  runIntegrationTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { runIntegrationTests };
