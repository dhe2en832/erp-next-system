/**
 * End-to-End Test: Discount + Multiple Taxes
 * Task 19.3: Write E2E test untuk kombinasi discount + multiple taxes
 * 
 * **Validates: Requirements 15.8**
 * 
 * Test Flow:
 * 1. Create invoice dengan discount + PPN + PPh 23
 * 2. Verify calculation: subtotal - discount + PPN - PPh 23 = grand_total
 * 3. Verify GL Entry untuk semua accounts (Piutang, Potongan, Pendapatan, Hutang PPN, Hutang PPh)
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

// Helper: Create Sales Invoice with discount and multiple taxes
async function createInvoiceWithDiscountAndMultipleTaxes(): Promise<any> {
  if (!API_KEY || !API_SECRET) {
    throw new Error('API credentials not configured');
  }

  const today = new Date().toISOString().split('T')[0];
  const url = `${NEXT_API_URL}/api/sales/invoices`;
  
  const data = {
    company: COMPANY,
    customer: 'CUST-00001',
    customer_name: 'Test Customer E2E Multiple Taxes',
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
    taxes_and_charges: 'PPN 11% + PPh 23 (2%)', // Multiple taxes template
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
  console.log('🧪 End-to-End Test: Discount + Multiple Taxes');
  console.log('   Task 19.3: E2E test untuk kombinasi discount + multiple taxes');
  console.log('   Validates: Requirements 15.8');
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
    // Step 1: Create invoice dengan discount + PPN + PPh 23
    console.log('\n📝 Step 1: Create invoice dengan discount 10% + PPN 11% + PPh 23 (2%)...');
    const invoice = await createInvoiceWithDiscountAndMultipleTaxes();
    invoiceName = invoice.name;
    
    if (!invoiceName) {
      throw new Error('Invoice name is null');
    }

    console.log(`   ✓ Invoice created: ${invoiceName}`);
    
    // Step 2: Verify calculation: subtotal - discount + PPN - PPh 23 = grand_total
    console.log('\n🧮 Step 2: Verify calculation with multiple taxes...');
    
    const subtotal = 10 * 100000; // 1,000,000
    const discountAmount = subtotal * 0.1; // 100,000
    const netTotal = subtotal - discountAmount; // 900,000
    const ppnAmount = netTotal * 0.11; // 99,000
    const pph23Amount = netTotal * 0.02; // 18,000
    const expectedGrandTotal = netTotal + ppnAmount - pph23Amount; // 900,000 + 99,000 - 18,000 = 981,000

    console.log(`   Subtotal: Rp ${subtotal.toLocaleString('id-ID')}`);
    console.log(`   Discount (10%): Rp ${discountAmount.toLocaleString('id-ID')}`);
    console.log(`   Net Total: Rp ${netTotal.toLocaleString('id-ID')}`);
    console.log(`   PPN 11%: Rp ${ppnAmount.toLocaleString('id-ID')}`);
    console.log(`   PPh 23 (2%): Rp ${pph23Amount.toLocaleString('id-ID')}`);
    console.log(`   Expected Grand Total: Rp ${expectedGrandTotal.toLocaleString('id-ID')}`);

    const actualGrandTotal = invoice.grand_total || 0;
    const grandTotalCorrect = Math.abs(actualGrandTotal - expectedGrandTotal) < 1;

    results.push({
      step: 'Step 2: Grand Total Calculation',
      passed: grandTotalCorrect,
      message: grandTotalCorrect 
        ? `Grand total correct: Rp ${actualGrandTotal.toLocaleString('id-ID')}`
        : `Grand total incorrect: Expected ${expectedGrandTotal}, got ${actualGrandTotal}`,
      data: { 
        invoiceName, 
        subtotal,
        discountAmount,
        netTotal,
        ppnAmount,
        pph23Amount,
        expectedGrandTotal,
        actualGrandTotal 
      }
    });

    if (!grandTotalCorrect) {
      throw new Error('Grand total calculation incorrect');
    }

    // Step 3: Submit invoice
    console.log('\n📤 Step 3: Submit invoice...');
    await submitInvoice('Sales Invoice', invoiceName);
    console.log('   ✓ Invoice submitted');

    // Wait for GL Entry posting
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 4: Verify GL Entry untuk semua accounts
    console.log('\n📊 Step 4: Verify GL Entry untuk semua accounts...');
    const glEntries = await getGLEntries(invoiceName);
    
    if (glEntries.length === 0) {
      throw new Error('No GL entries found');
    }

    console.log(`   Found ${glEntries.length} GL entries`);

    // Verify balanced entry
    const totalDebit = glEntries.reduce((sum, entry) => sum + (entry.debit || 0), 0);
    const totalCredit = glEntries.reduce((sum, entry) => sum + (entry.credit || 0), 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

    results.push({
      step: 'Step 4a: GL Entry Balanced',
      passed: isBalanced,
      message: isBalanced
        ? `GL Entry balanced: Debit ${totalDebit} = Credit ${totalCredit}`
        : `GL Entry not balanced: Debit ${totalDebit} ≠ Credit ${totalCredit}`,
      data: { totalDebit, totalCredit, entries: glEntries.length }
    });

    // Verify Piutang Usaha (Debit)
    const receivableEntry = glEntries.find(entry => 
      entry.account && entry.account.includes('1200') && entry.debit > 0
    );
    const hasReceivableEntry = !!receivableEntry;
    
    results.push({
      step: 'Step 4b: Piutang Usaha Entry',
      passed: hasReceivableEntry,
      message: hasReceivableEntry
        ? `Piutang Usaha entry found: ${receivableEntry.account} (Debit: ${receivableEntry.debit})`
        : 'Piutang Usaha entry not found',
      data: receivableEntry
    });

    // Verify Potongan Penjualan (Debit)
    const discountEntry = glEntries.find(entry => 
      entry.account && entry.account.includes('4300') && entry.debit > 0
    );
    const hasDiscountEntry = !!discountEntry;
    
    results.push({
      step: 'Step 4c: Potongan Penjualan Entry',
      passed: hasDiscountEntry,
      message: hasDiscountEntry
        ? `Potongan Penjualan entry found: ${discountEntry.account} (Debit: ${discountEntry.debit})`
        : 'Potongan Penjualan entry not found',
      data: discountEntry
    });

    // Verify Pendapatan Penjualan (Credit)
    const revenueEntry = glEntries.find(entry => 
      entry.account && entry.account.includes('4100') && entry.credit > 0
    );
    const hasRevenueEntry = !!revenueEntry;
    
    results.push({
      step: 'Step 4d: Pendapatan Penjualan Entry',
      passed: hasRevenueEntry,
      message: hasRevenueEntry
        ? `Pendapatan Penjualan entry found: ${revenueEntry.account} (Credit: ${revenueEntry.credit})`
        : 'Pendapatan Penjualan entry not found',
      data: revenueEntry
    });

    // Verify Hutang PPN (Credit)
    const ppnEntry = glEntries.find(entry => 
      entry.account && entry.account.includes('2210') && entry.credit > 0
    );
    const hasPPNEntry = !!ppnEntry;
    
    results.push({
      step: 'Step 4e: Hutang PPN Entry',
      passed: hasPPNEntry,
      message: hasPPNEntry
        ? `Hutang PPN entry found: ${ppnEntry.account} (Credit: ${ppnEntry.credit})`
        : 'Hutang PPN entry not found',
      data: ppnEntry
    });

    // Verify Hutang PPh 23 (Credit)
    const pph23Entry = glEntries.find(entry => 
      entry.account && entry.account.includes('2230') && entry.credit > 0
    );
    const hasPPh23Entry = !!pph23Entry;
    
    results.push({
      step: 'Step 4f: Hutang PPh 23 Entry',
      passed: hasPPh23Entry,
      message: hasPPh23Entry
        ? `Hutang PPh 23 entry found: ${pph23Entry.account} (Credit: ${pph23Entry.credit})`
        : 'Hutang PPh 23 entry not found',
      data: pph23Entry
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
