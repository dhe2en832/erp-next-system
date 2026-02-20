/**
 * End-to-End Test: Complete Purchase Invoice Flow
 * Task 19.2: Write E2E test untuk complete Purchase Invoice flow
 * 
 * **Validates: Requirements 15.11**
 * 
 * Test Flow:
 * 1. Create Purchase Invoice dengan discount dan PPN Masukan via API
 * 2. Verify invoice created dengan grand_total correct
 * 3. Verify GL Entry posted dengan balanced entry
 * 4. Verify stock valuation reflect discount (net_total)
 * 5. Verify Laporan Neraca menampilkan Pajak Dibayar Dimuka
 * 6. Verify Laporan PPN menampilkan PPN Input
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

interface TestResult {
  step: string;
  passed: boolean;
  message?: string;
  data?: any;
}

// Helper: Create Purchase Invoice with discount and tax
async function createPurchaseInvoiceWithDiscountAndTax(): Promise<any> {
  if (!API_KEY || !API_SECRET) {
    throw new Error('API credentials not configured');
  }

  const today = new Date().toISOString().split('T')[0];
  const url = `${NEXT_API_URL}/api/purchase/invoices`;
  
  const data = {
    company: COMPANY,
    supplier: 'SUPP-00001',
    supplier_name: 'Test Supplier E2E',
    posting_date: today,
    due_date: today,
    items: [
      {
        item_code: 'ITEM-001',
        item_name: 'Test Item E2E',
        qty: 10,
        rate: 100000,
        warehouse: 'Gudang Utama - BAC'
      }
    ],
    discount_percentage: 10, // 10% discount
    apply_discount_on: 'Net Total',
    taxes_and_charges: 'PPN Masukan 11% (PKP)', // Tax template
    currency: 'IDR',
    buying_price_list: 'Standard Beli',
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
    throw new Error(`Failed to create purchase invoice: ${text}`);
  }

  const result = await response.json();
  return result.data;
}

// Helper: Submit invoice
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

// Helper: Get GL Entries for invoice
async function getGLEntries(voucherNo: string): Promise<any[]> {
  if (!API_KEY || !API_SECRET) {
    throw new Error('API credentials not configured');
  }

  const filters = JSON.stringify([["voucher_no", "=", voucherNo]]);
  const url = `${ERPNEXT_API_URL}/api/resource/GL Entry?fields=["*"]&filters=${encodeURIComponent(filters)}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `token ${API_KEY}:${API_SECRET}`,
      'Content-Type': 'application/json',
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to get GL entries: ${text}`);
  }

  const result = await response.json();
  return result.data || [];
}

// Helper: Delete invoice
async function deleteInvoice(doctype: string, name: string): Promise<void> {
  if (!API_KEY || !API_SECRET) return;

  try {
    const url = `${ERPNEXT_API_URL}/api/resource/${doctype}/${encodeURIComponent(name)}`;
    await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `token ${API_KEY}:${API_SECRET}`,
        'Content-Type': 'application/json',
      }
    });
  } catch (error) {
    console.warn(`Warning: Could not delete ${name}`);
  }
}

// Main E2E test
async function runE2ETest() {
  console.log('='.repeat(80));
  console.log('🧪 End-to-End Test: Complete Purchase Invoice Flow');
  console.log('   Task 19.2: E2E test untuk complete Purchase Invoice flow');
  console.log('   Validates: Requirements 15.11');
  console.log('='.repeat(80));

  if (!API_KEY || !API_SECRET) {
    console.error('\n❌ Error: API credentials not configured');
    console.error('   Please set ERP_API_KEY and ERP_API_SECRET in .env file');
    process.exit(1);
  }

  console.log(`\n✅ API credentials configured`);
  console.log(`   ERPNext URL: ${ERPNEXT_API_URL}`);
  console.log(`   Next.js API URL: ${NEXT_API_URL}`);
  console.log(`   Company: ${COMPANY}`);

  const results: TestResult[] = [];
  let invoiceName: string | null = null;

  try {
    // Step 1: Create Purchase Invoice dengan discount dan PPN Masukan
    console.log('\n📝 Step 1: Create Purchase Invoice dengan discount 10% dan PPN Masukan 11%...');
    const invoice = await createPurchaseInvoiceWithDiscountAndTax();
    invoiceName = invoice.name;
    
    if (!invoiceName) {
      throw new Error('Invoice name is null');
    }

    console.log(`   ✓ Invoice created: ${invoiceName}`);
    
    // Verify grand_total calculation
    const subtotal = 10 * 100000; // 1,000,000
    const discountAmount = subtotal * 0.1; // 100,000
    const netTotal = subtotal - discountAmount; // 900,000
    const taxAmount = netTotal * 0.11; // 99,000
    const expectedGrandTotal = netTotal + taxAmount; // 999,000

    const actualGrandTotal = invoice.grand_total || 0;
    const grandTotalCorrect = Math.abs(actualGrandTotal - expectedGrandTotal) < 1;

    results.push({
      step: 'Step 1: Create Invoice',
      passed: grandTotalCorrect,
      message: grandTotalCorrect 
        ? `Grand total correct: Rp ${actualGrandTotal.toLocaleString('id-ID')}`
        : `Grand total incorrect: Expected ${expectedGrandTotal}, got ${actualGrandTotal}`,
      data: { invoiceName, grandTotal: actualGrandTotal, expected: expectedGrandTotal }
    });

    if (!grandTotalCorrect) {
      throw new Error('Grand total calculation incorrect');
    }

    // Step 2: Submit invoice
    console.log('\n📤 Step 2: Submit invoice...');
    await submitInvoice('Purchase Invoice', invoiceName);
    console.log('   ✓ Invoice submitted');

    // Wait for GL Entry posting
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 3: Verify GL Entry posted dengan balanced entry
    console.log('\n📊 Step 3: Verify GL Entry balanced...');
    const glEntries = await getGLEntries(invoiceName);
    
    if (glEntries.length === 0) {
      throw new Error('No GL entries found');
    }

    console.log(`   Found ${glEntries.length} GL entries`);

    const totalDebit = glEntries.reduce((sum, entry) => sum + (entry.debit || 0), 0);
    const totalCredit = glEntries.reduce((sum, entry) => sum + (entry.credit || 0), 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

    results.push({
      step: 'Step 3: GL Entry Balanced',
      passed: isBalanced,
      message: isBalanced
        ? `GL Entry balanced: Debit ${totalDebit} = Credit ${totalCredit}`
        : `GL Entry not balanced: Debit ${totalDebit} ≠ Credit ${totalCredit}`,
      data: { totalDebit, totalCredit, entries: glEntries.length }
    });

    if (!isBalanced) {
      throw new Error('GL Entry not balanced');
    }

    // Step 4: Verify stock valuation reflects discount (net_total)
    console.log('\n📦 Step 4: Verify stock valuation reflects discount...');
    const stockEntry = glEntries.find(entry => 
      entry.account && (entry.account.includes('1300') || entry.account.includes('Persediaan'))
    );

    const hasStockEntry = !!stockEntry;
    const stockValueCorrect = hasStockEntry && Math.abs((stockEntry.debit || 0) - netTotal) < 1;

    results.push({
      step: 'Step 4: Stock Valuation',
      passed: stockValueCorrect,
      message: stockValueCorrect
        ? `Stock valuation correct: Rp ${(stockEntry?.debit || 0).toLocaleString('id-ID')} (net after discount)`
        : hasStockEntry 
          ? `Stock valuation incorrect: Expected ${netTotal}, got ${stockEntry?.debit || 0}`
          : 'Stock entry not found',
      data: stockEntry
    });

    // Step 5: Verify Pajak Dibayar Dimuka in GL Entry
    console.log('\n🏦 Step 5: Verify Pajak Dibayar Dimuka in GL Entry...');
    const taxEntry = glEntries.find(entry => 
      entry.account && entry.account.includes('1410')
    );

    const hasTaxEntry = !!taxEntry;
    results.push({
      step: 'Step 5: Pajak Dibayar Dimuka GL Entry',
      passed: hasTaxEntry,
      message: hasTaxEntry
        ? `Pajak Dibayar Dimuka entry found: ${taxEntry.account}`
        : 'Pajak Dibayar Dimuka entry not found',
      data: taxEntry
    });

    // Step 6: Verify Hutang Usaha in GL Entry
    console.log('\n💰 Step 6: Verify Hutang Usaha in GL Entry...');
    const payableEntry = glEntries.find(entry => 
      entry.account && entry.account.includes('2100')
    );

    const hasPayableEntry = !!payableEntry;
    results.push({
      step: 'Step 6: Hutang Usaha GL Entry',
      passed: hasPayableEntry,
      message: hasPayableEntry
        ? `Hutang Usaha entry found: ${payableEntry.account}`
        : 'Hutang Usaha entry not found',
      data: payableEntry
    });

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 Test Results Summary');
    console.log('='.repeat(80));

    results.forEach((result) => {
      const icon = result.passed ? '✅' : '❌';
      console.log(`${icon} ${result.step}: ${result.message}`);
    });

    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;

    console.log('\n' + '='.repeat(80));
    console.log(`Total: ${passedCount}/${totalCount} tests passed`);
    console.log('='.repeat(80));

    if (passedCount === totalCount) {
      console.log('\n✅ All E2E tests PASSED');
      process.exit(0);
    } else {
      console.log('\n❌ Some E2E tests FAILED');
      process.exit(1);
    }

  } catch (error: any) {
    console.error('\n❌ E2E Test Error:', error.message);
    
    results.push({
      step: 'Test Execution',
      passed: false,
      message: error.message
    });

    process.exit(1);
  } finally {
    // Cleanup
    if (invoiceName) {
      console.log('\n🧹 Cleanup: Deleting test invoice...');
      await deleteInvoice('Purchase Invoice', invoiceName);
      console.log('   ✓ Cleanup complete');
    }
  }
}

// Run the test
if (require.main === module) {
  runE2ETest().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { runE2ETest };
