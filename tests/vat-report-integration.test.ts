/**
 * Integration Test: VAT Report
 * Task 17.3: Write integration tests untuk Laporan PPN
 * 
 * **Validates: Requirements 13.1, 13.2, 13.3, 13.4, 13.5, 13.7, 13.8**
 * 
 * Tests:
 * - Query PPN Output dan PPN Input
 * - Calculation PPN Kurang/Lebih Bayar
 * - Period filtering
 * - Export to Excel
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
  testName: string;
  passed: boolean;
  message?: string;
}

// Helper: Create Sales Invoice with PPN
async function createSalesInvoiceWithPPN(qty: number, rate: number): Promise<any> {
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
        qty: qty,
        rate: rate,
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

// Helper: Create Purchase Invoice with PPN Input
async function createPurchaseInvoiceWithPPN(qty: number, rate: number): Promise<any> {
  if (!API_KEY || !API_SECRET) {
    throw new Error('API credentials not configured');
  }

  const today = new Date().toISOString().split('T')[0];
  const url = `${ERPNEXT_API_URL}/api/resource/Purchase Invoice`;
  
  const data = {
    company: COMPANY,
    supplier: 'SUPP-00001',
    supplier_name: 'Test Supplier',
    posting_date: today,
    due_date: today,
    items: [
      {
        item_code: 'ITEM-001',
        item_name: 'Test Item',
        qty: qty,
        rate: rate,
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

// Helper: Get VAT Report
async function getVATReport(fromDate: string, toDate: string): Promise<any> {
  if (!API_KEY || !API_SECRET) {
    throw new Error('API credentials not configured');
  }

  const url = `${NEXT_API_URL}/api/finance/reports/vat-report?company=${encodeURIComponent(COMPANY)}&from_date=${fromDate}&to_date=${toDate}`;
  
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

// Helper: Export VAT Report to Excel
async function exportVATReport(fromDate: string, toDate: string): Promise<Response> {
  if (!API_KEY || !API_SECRET) {
    throw new Error('API credentials not configured');
  }

  const url = `${NEXT_API_URL}/api/finance/reports/vat-report/export?company=${encodeURIComponent(COMPANY)}&from_date=${fromDate}&to_date=${toDate}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `token ${API_KEY}:${API_SECRET}`,
    }
  });

  return response;
}

// Helper: Cancel and delete invoice
async function cleanupInvoice(doctype: string, name: string): Promise<void> {
  if (!API_KEY || !API_SECRET) return;

  try {
    // Cancel
    const cancelUrl = `${ERPNEXT_API_URL}/api/resource/${doctype}/${encodeURIComponent(name)}`;
    await fetch(cancelUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${API_KEY}:${API_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ docstatus: 2 })
    });

    // Delete
    await fetch(cancelUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `token ${API_KEY}:${API_SECRET}`,
        'Content-Type': 'application/json',
      }
    });
  } catch (error) {
    console.warn(`Warning: Could not cleanup ${name}`);
  }
}

// Test 1: Query PPN Output
async function testPPNOutputQuery(): Promise<TestResult> {
  let invoiceName: string | null = null;

  try {
    console.log('\n  Test 1: Query PPN Output...');

    // Create sales invoice with PPN (11% of 1,000,000 = 110,000)
    const invoice = await createSalesInvoiceWithPPN(10, 100000);
    invoiceName = invoice.name;
    await submitInvoice('Sales Invoice', invoiceName);

    // Wait for GL Entry posting
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Get report
    const today = new Date().toISOString().split('T')[0];
    const report = await getVATReport(today, today);

    // Verify PPN Output section exists
    if (!report.ppn_output || !Array.isArray(report.ppn_output.invoices)) {
      return {
        testName: 'Query PPN Output',
        passed: false,
        message: 'PPN Output section not found in report'
      };
    }

    // Find our invoice in the report
    const ourInvoice = report.ppn_output.invoices.find((inv: any) => 
      inv.invoice_no === invoiceName
    );

    if (!ourInvoice) {
      return {
        testName: 'Query PPN Output',
        passed: false,
        message: `Invoice ${invoiceName} not found in PPN Output`
      };
    }

    console.log('    ✓ PPN Output query successful');
    console.log(`    ✓ Invoice: ${ourInvoice.invoice_no}`);
    console.log(`    ✓ DPP: ${ourInvoice.dpp}`);
    console.log(`    ✓ PPN: ${ourInvoice.ppn}`);

    // Verify calculation (DPP * 11% = PPN)
    const expectedPPN = Math.round(ourInvoice.dpp * 0.11);
    if (Math.abs(ourInvoice.ppn - expectedPPN) > 1) {
      return {
        testName: 'Query PPN Output',
        passed: false,
        message: `PPN calculation incorrect: ${ourInvoice.ppn} != ${expectedPPN}`
      };
    }

    console.log('    ✓ PPN calculation correct');

    return {
      testName: 'Query PPN Output',
      passed: true
    };

  } catch (error: any) {
    return {
      testName: 'Query PPN Output',
      passed: false,
      message: error.message
    };
  } finally {
    if (invoiceName) {
      await cleanupInvoice('Sales Invoice', invoiceName);
    }
  }
}

// Test 2: Query PPN Input
async function testPPNInputQuery(): Promise<TestResult> {
  let invoiceName: string | null = null;

  try {
    console.log('\n  Test 2: Query PPN Input...');

    // Create purchase invoice with PPN (11% of 500,000 = 55,000)
    const invoice = await createPurchaseInvoiceWithPPN(10, 50000);
    invoiceName = invoice.name;
    await submitInvoice('Purchase Invoice', invoiceName);

    // Wait for GL Entry posting
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Get report
    const today = new Date().toISOString().split('T')[0];
    const report = await getVATReport(today, today);

    // Verify PPN Input section exists
    if (!report.ppn_input || !Array.isArray(report.ppn_input.invoices)) {
      return {
        testName: 'Query PPN Input',
        passed: false,
        message: 'PPN Input section not found in report'
      };
    }

    // Find our invoice in the report
    const ourInvoice = report.ppn_input.invoices.find((inv: any) => 
      inv.invoice_no === invoiceName
    );

    if (!ourInvoice) {
      return {
        testName: 'Query PPN Input',
        passed: false,
        message: `Invoice ${invoiceName} not found in PPN Input`
      };
    }

    console.log('    ✓ PPN Input query successful');
    console.log(`    ✓ Invoice: ${ourInvoice.invoice_no}`);
    console.log(`    ✓ DPP: ${ourInvoice.dpp}`);
    console.log(`    ✓ PPN: ${ourInvoice.ppn}`);

    // Verify calculation (DPP * 11% = PPN)
    const expectedPPN = Math.round(ourInvoice.dpp * 0.11);
    if (Math.abs(ourInvoice.ppn - expectedPPN) > 1) {
      return {
        testName: 'Query PPN Input',
        passed: false,
        message: `PPN calculation incorrect: ${ourInvoice.ppn} != ${expectedPPN}`
      };
    }

    console.log('    ✓ PPN calculation correct');

    return {
      testName: 'Query PPN Input',
      passed: true
    };

  } catch (error: any) {
    return {
      testName: 'Query PPN Input',
      passed: false,
      message: error.message
    };
  } finally {
    if (invoiceName) {
      await cleanupInvoice('Purchase Invoice', invoiceName);
    }
  }
}

// Test 3: Calculation PPN Kurang/Lebih Bayar
async function testPPNKurangLebihBayar(): Promise<TestResult> {
  let salesInvoiceName: string | null = null;
  let purchaseInvoiceName: string | null = null;

  try {
    console.log('\n  Test 3: Calculation PPN Kurang/Lebih Bayar...');

    // Create sales invoice (PPN Output = 11% of 1,000,000 = 110,000)
    const salesInvoice = await createSalesInvoiceWithPPN(10, 100000);
    salesInvoiceName = salesInvoice.name;
    await submitInvoice('Sales Invoice', salesInvoiceName);

    // Create purchase invoice (PPN Input = 11% of 500,000 = 55,000)
    const purchaseInvoice = await createPurchaseInvoiceWithPPN(10, 50000);
    purchaseInvoiceName = purchaseInvoice.name;
    await submitInvoice('Purchase Invoice', purchaseInvoiceName);

    // Wait for GL Entry posting
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Get report
    const today = new Date().toISOString().split('T')[0];
    const report = await getVATReport(today, today);

    // Verify summary exists
    if (!report.summary) {
      return {
        testName: 'PPN Kurang/Lebih Bayar',
        passed: false,
        message: 'Summary section not found in report'
      };
    }

    const totalOutput = report.summary.total_ppn_output || 0;
    const totalInput = report.summary.total_ppn_input || 0;
    const netPayable = report.summary.ppn_kurang_lebih_bayar || 0;

    // Verify calculation: Output - Input = Net Payable
    const expectedNetPayable = totalOutput - totalInput;
    if (Math.abs(netPayable - expectedNetPayable) > 0.01) {
      return {
        testName: 'PPN Kurang/Lebih Bayar',
        passed: false,
        message: `Calculation incorrect: ${netPayable} != ${totalOutput} - ${totalInput}`
      };
    }

    console.log('    ✓ PPN Kurang/Lebih Bayar calculation correct');
    console.log(`    ✓ Total PPN Output: ${totalOutput}`);
    console.log(`    ✓ Total PPN Input: ${totalInput}`);
    console.log(`    ✓ PPN Kurang/Lebih Bayar: ${netPayable}`);

    // Verify our invoices contributed to the totals
    if (totalOutput < 100000) {
      return {
        testName: 'PPN Kurang/Lebih Bayar',
        passed: false,
        message: `Total PPN Output too low: ${totalOutput}`
      };
    }

    if (totalInput < 50000) {
      return {
        testName: 'PPN Kurang/Lebih Bayar',
        passed: false,
        message: `Total PPN Input too low: ${totalInput}`
      };
    }

    return {
      testName: 'PPN Kurang/Lebih Bayar',
      passed: true
    };

  } catch (error: any) {
    return {
      testName: 'PPN Kurang/Lebih Bayar',
      passed: false,
      message: error.message
    };
  } finally {
    if (salesInvoiceName) {
      await cleanupInvoice('Sales Invoice', salesInvoiceName);
    }
    if (purchaseInvoiceName) {
      await cleanupInvoice('Purchase Invoice', purchaseInvoiceName);
    }
  }
}

// Test 4: Period Filtering
async function testPeriodFiltering(): Promise<TestResult> {
  let invoiceName: string | null = null;

  try {
    console.log('\n  Test 4: Period Filtering...');

    // Create invoice today
    const invoice = await createSalesInvoiceWithPPN(10, 100000);
    invoiceName = invoice.name;
    await submitInvoice('Sales Invoice', invoiceName);

    // Wait for GL Entry posting
    await new Promise(resolve => setTimeout(resolve, 1000));

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Get yesterday's date
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Test 1: Report for today should include the invoice
    const reportToday = await getVATReport(todayStr, todayStr);
    const invoiceInToday = reportToday.ppn_output.invoices.find((inv: any) => 
      inv.invoice_no === invoiceName
    );

    if (!invoiceInToday) {
      return {
        testName: 'Period Filtering',
        passed: false,
        message: 'Invoice not found in today\'s report'
      };
    }

    console.log('    ✓ Invoice found in today\'s report');

    // Test 2: Report for yesterday should NOT include the invoice
    const reportYesterday = await getVATReport(yesterdayStr, yesterdayStr);
    const invoiceInYesterday = reportYesterday.ppn_output.invoices.find((inv: any) => 
      inv.invoice_no === invoiceName
    );

    if (invoiceInYesterday) {
      return {
        testName: 'Period Filtering',
        passed: false,
        message: 'Invoice incorrectly found in yesterday\'s report'
      };
    }

    console.log('    ✓ Invoice not in yesterday\'s report');
    console.log('    ✓ Period filtering working correctly');

    return {
      testName: 'Period Filtering',
      passed: true
    };

  } catch (error: any) {
    return {
      testName: 'Period Filtering',
      passed: false,
      message: error.message
    };
  } finally {
    if (invoiceName) {
      await cleanupInvoice('Sales Invoice', invoiceName);
    }
  }
}

// Test 5: Export to Excel
async function testExportToExcel(): Promise<TestResult> {
  try {
    console.log('\n  Test 5: Export to Excel...');

    // Get today's date
    const today = new Date().toISOString().split('T')[0];

    // Test export endpoint
    const response = await exportVATReport(today, today);

    if (!response.ok) {
      return {
        testName: 'Export to Excel',
        passed: false,
        message: `Export failed with status ${response.status}`
      };
    }

    // Verify content type
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('spreadsheet')) {
      return {
        testName: 'Export to Excel',
        passed: false,
        message: `Invalid content type: ${contentType}`
      };
    }

    console.log('    ✓ Export endpoint accessible');
    console.log(`    ✓ Content-Type: ${contentType}`);

    // Verify content disposition header
    const contentDisposition = response.headers.get('content-disposition');
    if (!contentDisposition || !contentDisposition.includes('attachment')) {
      return {
        testName: 'Export to Excel',
        passed: false,
        message: `Invalid content disposition: ${contentDisposition}`
      };
    }

    console.log(`    ✓ Content-Disposition: ${contentDisposition}`);

    // Verify we got some data
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength === 0) {
      return {
        testName: 'Export to Excel',
        passed: false,
        message: 'Export file is empty'
      };
    }

    console.log(`    ✓ File size: ${buffer.byteLength} bytes`);
    console.log('    ✓ Export to Excel working correctly');

    return {
      testName: 'Export to Excel',
      passed: true
    };

  } catch (error: any) {
    return {
      testName: 'Export to Excel',
      passed: false,
      message: error.message
    };
  }
}

// Main test runner
async function runIntegrationTests() {
  console.log('='.repeat(60));
  console.log('🧪 Integration Test: VAT Report');
  console.log('   Task 17.3: Integration tests untuk Laporan PPN');
  console.log('   Validates: Requirements 13.1, 13.2, 13.3, 13.4, 13.5, 13.7, 13.8');
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

  const results: TestResult[] = [];

  // Run all tests
  results.push(await testPPNOutputQuery());
  results.push(await testPPNInputQuery());
  results.push(await testPPNKurangLebihBayar());
  results.push(await testPeriodFiltering());
  results.push(await testExportToExcel());

  // Summary
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Results');
  console.log('='.repeat(60));
  console.log(`Total tests: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    console.log('\n❌ Failed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   ${r.testName}: ${r.message}`);
    });
  }

  if (failed === 0) {
    console.log('\n✅ All integration tests PASSED');
    process.exit(0);
  } else {
    console.log('\n❌ Some integration tests FAILED');
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
