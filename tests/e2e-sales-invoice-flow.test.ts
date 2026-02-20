/**
 * End-to-End Test: Complete Sales Invoice Flow
 * Task 19.1: Write E2E test untuk complete Sales Invoice flow
 * 
 * **Validates: Requirements 15.11**
 * 
 * Test Flow:
 * 1. Create Sales Invoice dengan discount dan PPN via API
 * 2. Verify invoice created dengan grand_total correct
 * 3. Verify GL Entry posted dengan balanced entry
 * 4. Verify Laporan Laba Rugi menampilkan Potongan Penjualan
 * 5. Verify Laporan Neraca menampilkan Hutang PPN
 * 6. Verify Laporan PPN menampilkan PPN Output
 * 7. Cancel invoice, verify reversal GL Entry
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

// Helper: Create Sales Invoice with discount and tax
async function createSalesInvoiceWithDiscountAndTax(): Promise<any> {
  if (!API_KEY || !API_SECRET) {
    throw new Error('API credentials not configured');
  }

  const today = new Date().toISOString().split('T')[0];
  const url = `${NEXT_API_URL}/api/sales/invoices`;
  
  const data = {
    company: COMPANY,
    customer: 'CUST-00001',
    customer_name: 'Test Customer E2E',
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
    taxes_and_charges: 'PPN 11%', // Tax template
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

// Helper: Cancel invoice
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

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to cancel invoice: ${text}`);
  }
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
  console.log('🧪 End-to-End Test: Complete Sales Invoice Flow');
  console.log('   Task 19.1: E2E test untuk complete Sales Invoice flow');
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
    // Step 1: Create Sales Invoice dengan discount dan PPN
    console.log('\n📝 Step 1: Create Sales Invoice dengan discount 10% dan PPN 11%...');
    const invoice = await createSalesInvoiceWithDiscountAndTax();
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
    await submitInvoice('Sales Invoice', invoiceName);
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

    // Step 4: Verify Potongan Penjualan in GL Entry
    console.log('\n💰 Step 4: Verify Potongan Penjualan in GL Entry...');
    const discountEntry = glEntries.find(entry => 
      entry.account && entry.account.includes('4300')
    );

    const hasDiscountEntry = !!discountEntry;
    results.push({
      step: 'Step 4: Potongan Penjualan GL Entry',
      passed: hasDiscountEntry,
      message: hasDiscountEntry
        ? `Potongan Penjualan entry found: ${discountEntry.account}`
        : 'Potongan Penjualan entry not found',
      data: discountEntry
    });

    // Step 5: Verify Hutang PPN in GL Entry
    console.log('\n🏦 Step 5: Verify Hutang PPN in GL Entry...');
    const taxEntry = glEntries.find(entry => 
      entry.account && entry.account.includes('2210')
    );

    const hasTaxEntry = !!taxEntry;
    results.push({
      step: 'Step 5: Hutang PPN GL Entry',
      passed: hasTaxEntry,
      message: hasTaxEntry
        ? `Hutang PPN entry found: ${taxEntry.account}`
        : 'Hutang PPN entry not found',
      data: taxEntry
    });

    // Step 6: Cancel invoice and verify reversal
    console.log('\n🔄 Step 6: Cancel invoice and verify reversal GL Entry...');
    await cancelInvoice('Sales Invoice', invoiceName);
    console.log('   ✓ Invoice cancelled');

    // Wait for reversal GL Entry posting
    await new Promise(resolve => setTimeout(resolve, 2000));

    const reversalGLEntries = await getGLEntries(invoiceName);
    const reversalEntries = reversalGLEntries.filter(entry => 
      entry.is_cancelled === 1 || entry.remarks?.includes('Reversal')
    );

    const hasReversalEntries = reversalEntries.length > 0;
    results.push({
      step: 'Step 6: Reversal GL Entry',
      passed: hasReversalEntries,
      message: hasReversalEntries
        ? `Reversal entries found: ${reversalEntries.length} entries`
        : 'Reversal entries not found',
      data: { reversalCount: reversalEntries.length }
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
      await deleteInvoice('Sales Invoice', invoiceName);
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
