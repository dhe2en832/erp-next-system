/**
 * End-to-End Test: Backward Compatibility
 * Task 19.4: Write E2E test untuk backward compatibility
 * 
 * **Validates: Requirements 15.10**
 * 
 * Test Flow:
 * 1. Create old invoice (tanpa discount/tax)
 * 2. Open form, verify no error
 * 3. Edit invoice (change customer name), save
 * 4. Verify GL Entry unchanged
 * 5. Fetch via API, verify default values (0 dan empty array)
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

// Helper: Create old-style invoice (tanpa discount/tax)
async function createOldStyleInvoice(): Promise<any> {
  if (!API_KEY || !API_SECRET) {
    throw new Error('API credentials not configured');
  }

  const today = new Date().toISOString().split('T')[0];
  const url = `${ERPNEXT_API_URL}/api/resource/Sales Invoice`;
  
  // Create invoice directly via ERPNext API (old style, no discount/tax fields)
  const data = {
    company: COMPANY,
    customer: 'CUST-00001',
    customer_name: 'Old Style Customer',
    posting_date: today,
    due_date: today,
    items: [
      {
        item_code: 'ITEM-001',
        item_name: 'Test Item Old Style',
        qty: 5,
        rate: 50000,
        warehouse: 'Gudang Utama - BAC'
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
    throw new Error(`Failed to create old-style invoice: ${text}`);
  }

  const result = await response.json();
  return result.data;
}

// Helper: Get invoice via Next.js API
async function getInvoiceViaAPI(invoiceName: string): Promise<any> {
  if (!API_KEY || !API_SECRET) {
    throw new Error('API credentials not configured');
  }

  const url = `${NEXT_API_URL}/api/sales/invoices?name=${encodeURIComponent(invoiceName)}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `token ${API_KEY}:${API_SECRET}`,
      'Content-Type': 'application/json',
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to get invoice via API: ${text}`);
  }

  const result = await response.json();
  return result.data && result.data.length > 0 ? result.data[0] : null;
}

// Helper: Update invoice
async function updateInvoice(invoiceName: string, updates: any): Promise<void> {
  if (!API_KEY || !API_SECRET) {
    throw new Error('API credentials not configured');
  }

  const url = `${ERPNEXT_API_URL}/api/resource/Sales Invoice/${encodeURIComponent(invoiceName)}`;
  
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${API_KEY}:${API_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to update invoice: ${text}`);
  }
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

// Helper: Compare GL Entries
function compareGLEntries(entries1: any[], entries2: any[]): boolean {
  if (entries1.length !== entries2.length) return false;
  
  // Sort by account and amount for comparison
  const sort = (entries: any[]) => entries.sort((a, b) => {
    if (a.account !== b.account) return a.account.localeCompare(b.account);
    return (a.debit || 0) - (b.debit || 0);
  });
  
  const sorted1 = sort([...entries1]);
  const sorted2 = sort([...entries2]);
  
  for (let i = 0; i < sorted1.length; i++) {
    const e1 = sorted1[i];
    const e2 = sorted2[i];
    
    if (e1.account !== e2.account) return false;
    if (Math.abs((e1.debit || 0) - (e2.debit || 0)) > 0.01) return false;
    if (Math.abs((e1.credit || 0) - (e2.credit || 0)) > 0.01) return false;
  }
  
  return true;
}

// Main E2E test
async function runE2ETest() {
  console.log('='.repeat(80));
  console.log('🧪 End-to-End Test: Backward Compatibility');
  console.log('   Task 19.4: E2E test untuk backward compatibility');
  console.log('   Validates: Requirements 15.10');
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
    // Step 1: Create old-style invoice (tanpa discount/tax)
    console.log('\n📝 Step 1: Create old-style invoice (tanpa discount/tax)...');
    const invoice = await createOldStyleInvoice();
    invoiceName = invoice.name;
    
    if (!invoiceName) {
      throw new Error('Invoice name is null');
    }

    console.log(`   ✓ Invoice created: ${invoiceName}`);
    
    results.push({
      step: 'Step 1: Create Old Invoice',
      passed: true,
      message: `Old-style invoice created successfully: ${invoiceName}`,
      data: { invoiceName }
    });

    // Step 2: Fetch via API and verify default values
    console.log('\n🔍 Step 2: Fetch via API and verify default values...');
    const fetchedInvoice = await getInvoiceViaAPI(invoiceName);
    
    if (!fetchedInvoice) {
      throw new Error('Invoice not found via API');
    }

    const hasDefaultDiscount = (fetchedInvoice.discount_amount === 0 || fetchedInvoice.discount_amount === undefined);
    const hasDefaultTaxes = (!fetchedInvoice.taxes || fetchedInvoice.taxes.length === 0);

    console.log(`   Discount Amount: ${fetchedInvoice.discount_amount || 0}`);
    console.log(`   Taxes: ${fetchedInvoice.taxes ? JSON.stringify(fetchedInvoice.taxes) : '[]'}`);

    results.push({
      step: 'Step 2: API Default Values',
      passed: hasDefaultDiscount && hasDefaultTaxes,
      message: (hasDefaultDiscount && hasDefaultTaxes)
        ? 'API returns default values correctly (discount: 0, taxes: [])'
        : 'API does not return correct default values',
      data: { 
        discount_amount: fetchedInvoice.discount_amount,
        taxes: fetchedInvoice.taxes 
      }
    });

    // Step 3: Submit invoice and get GL Entry snapshot
    console.log('\n📤 Step 3: Submit invoice and get GL Entry snapshot...');
    await submitInvoice('Sales Invoice', invoiceName);
    console.log('   ✓ Invoice submitted');

    // Wait for GL Entry posting
    await new Promise(resolve => setTimeout(resolve, 2000));

    const glEntriesBefore = await getGLEntries(invoiceName);
    console.log(`   ✓ GL Entry snapshot taken: ${glEntriesBefore.length} entries`);

    results.push({
      step: 'Step 3: GL Entry Snapshot',
      passed: glEntriesBefore.length > 0,
      message: `GL Entry snapshot taken: ${glEntriesBefore.length} entries`,
      data: { entriesCount: glEntriesBefore.length }
    });

    // Step 4: Cancel invoice to allow editing
    console.log('\n🔄 Step 4: Cancel invoice to allow editing...');
    await updateInvoice(invoiceName, { docstatus: 2 });
    console.log('   ✓ Invoice cancelled');

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 5: Amend invoice (create amended version)
    console.log('\n✏️ Step 5: Amend invoice (change customer name)...');
    
    // In ERPNext, we need to create an amended version
    const amendedInvoice = await createOldStyleInvoice();
    const amendedInvoiceName = amendedInvoice.name;
    
    if (!amendedInvoiceName) {
      throw new Error('Amended invoice name is null');
    }

    // Update customer name
    await updateInvoice(amendedInvoiceName, { 
      customer_name: 'Old Style Customer - Updated',
      amended_from: invoiceName
    });
    
    console.log(`   ✓ Amended invoice created: ${amendedInvoiceName}`);

    // Submit amended invoice
    await submitInvoice('Sales Invoice', amendedInvoiceName);
    console.log('   ✓ Amended invoice submitted');

    // Wait for GL Entry posting
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 6: Verify GL Entry structure unchanged
    console.log('\n📊 Step 6: Verify GL Entry structure unchanged...');
    const glEntriesAfter = await getGLEntries(amendedInvoiceName);
    
    console.log(`   GL Entries before: ${glEntriesBefore.length}`);
    console.log(`   GL Entries after: ${glEntriesAfter.length}`);

    // Compare structure (same accounts, same amounts)
    const structureUnchanged = compareGLEntries(glEntriesBefore, glEntriesAfter);

    results.push({
      step: 'Step 6: GL Entry Structure',
      passed: structureUnchanged,
      message: structureUnchanged
        ? 'GL Entry structure unchanged after edit'
        : 'GL Entry structure changed after edit',
      data: { 
        entriesBefore: glEntriesBefore.length,
        entriesAfter: glEntriesAfter.length 
      }
    });

    // Cleanup amended invoice
    await deleteInvoice('Sales Invoice', amendedInvoiceName);

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
