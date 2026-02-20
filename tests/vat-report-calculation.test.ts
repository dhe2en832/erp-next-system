/**
 * Property Test 20: VAT Report Calculation
 * 
 * **Validates: Requirements 13.3, 13.4, 13.5**
 * 
 * This property test verifies that the VAT Report correctly calculates:
 * - Total PPN Output from sales invoices
 * - Total PPN Input from purchase invoices
 * - PPN Kurang/Lebih Bayar = Output - Input
 * 
 * Test Strategy:
 * 1. Generate random sales and purchase invoices with PPN
 * 2. Submit invoices to create GL entries
 * 3. Run VAT report for the period
 * 4. Verify calculation: Output - Input = Net Payable
 * 5. Run with minimum 100 iterations
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const ERP_API_KEY = process.env.ERP_API_KEY;
const ERP_API_SECRET = process.env.ERP_API_SECRET;
const ERP_COMPANY = process.env.ERP_DEFAULT_COMPANY || process.env.ERP_COMPANY || 'BAC';

interface TestInvoice {
  type: 'sales' | 'purchase';
  name: string;
  items: Array<{ qty: number; rate: number }>;
  ppn_amount: number;
}

/**
 * Generate random invoice data with PPN
 */
function generateRandomInvoice(type: 'sales' | 'purchase'): Omit<TestInvoice, 'name'> {
  const numItems = Math.floor(Math.random() * 3) + 1; // 1-3 items
  const items = [];
  let subtotal = 0;

  for (let i = 0; i < numItems; i++) {
    const qty = Math.floor(Math.random() * 10) + 1; // 1-10 qty
    const rate = Math.floor(Math.random() * 100000) + 10000; // 10k-110k rate
    items.push({ qty, rate });
    subtotal += qty * rate;
  }

  // PPN 11% on subtotal
  const ppn_amount = subtotal * 0.11;

  return {
    type,
    items,
    ppn_amount,
  };
}

/**
 * Create sales invoice with PPN via API
 */
async function createSalesInvoice(invoiceData: Omit<TestInvoice, 'name'>): Promise<string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (ERP_API_KEY && ERP_API_SECRET) {
    headers['Authorization'] = `token ${ERP_API_KEY}:${ERP_API_SECRET}`;
  }

  const payload = {
    company: ERP_COMPANY,
    customer: 'CUST-001',
    customer_name: 'Test Customer',
    posting_date: new Date().toISOString().split('T')[0],
    items: invoiceData.items.map((item, idx) => ({
      item_code: `ITEM-${idx + 1}`,
      item_name: `Test Item ${idx + 1}`,
      qty: item.qty,
      rate: item.rate,
      warehouse: `Gudang Utama - ${ERP_COMPANY}`,
    })),
    taxes_and_charges: 'PPN 11%',
    taxes: [
      {
        charge_type: 'On Net Total',
        account_head: `2210 - Hutang PPN - ${ERP_COMPANY}`,
        description: 'PPN 11%',
        rate: 11,
      },
    ],
  };

  const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Sales Invoice`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create sales invoice: ${error.message || response.statusText}`);
  }

  const result = await response.json();
  const invoiceName = result.data.name;

  // Submit the invoice
  const submitResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Sales Invoice/${invoiceName}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ docstatus: 1 }),
  });

  if (!submitResponse.ok) {
    const error = await submitResponse.json();
    throw new Error(`Failed to submit sales invoice: ${error.message || submitResponse.statusText}`);
  }

  return invoiceName;
}

/**
 * Create purchase invoice with PPN via API
 */
async function createPurchaseInvoice(invoiceData: Omit<TestInvoice, 'name'>): Promise<string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (ERP_API_KEY && ERP_API_SECRET) {
    headers['Authorization'] = `token ${ERP_API_KEY}:${ERP_API_SECRET}`;
  }

  const payload = {
    company: ERP_COMPANY,
    supplier: 'SUPP-001',
    supplier_name: 'Test Supplier',
    posting_date: new Date().toISOString().split('T')[0],
    items: invoiceData.items.map((item, idx) => ({
      item_code: `ITEM-${idx + 1}`,
      item_name: `Test Item ${idx + 1}`,
      qty: item.qty,
      rate: item.rate,
      warehouse: `Gudang Utama - ${ERP_COMPANY}`,
    })),
    taxes_and_charges: 'PPN Masukan 11% (PKP)',
    taxes: [
      {
        charge_type: 'On Net Total',
        account_head: `1410 - Pajak Dibayar Dimuka - ${ERP_COMPANY}`,
        description: 'PPN Masukan 11%',
        rate: 11,
      },
    ],
  };

  const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Purchase Invoice`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create purchase invoice: ${error.message || response.statusText}`);
  }

  const result = await response.json();
  const invoiceName = result.data.name;

  // Submit the invoice
  const submitResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Purchase Invoice/${invoiceName}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ docstatus: 1 }),
  });

  if (!submitResponse.ok) {
    const error = await submitResponse.json();
    throw new Error(`Failed to submit purchase invoice: ${error.message || submitResponse.statusText}`);
  }

  return invoiceName;
}

/**
 * Fetch VAT report data
 */
async function fetchVatReport(fromDate: string, toDate: string): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (ERP_API_KEY && ERP_API_SECRET) {
    headers['Authorization'] = `token ${ERP_API_KEY}:${ERP_API_SECRET}`;
  }

  const url = `${API_BASE_URL}/api/finance/reports/vat-report?company=${ERP_COMPANY}&from_date=${fromDate}&to_date=${toDate}`;
  const response = await fetch(url, { headers });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to fetch VAT report: ${error.message || response.statusText}`);
  }

  const result = await response.json();
  return result.data;
}

/**
 * Cancel invoice (cleanup)
 */
async function cancelInvoice(invoiceType: 'Sales Invoice' | 'Purchase Invoice', invoiceName: string): Promise<void> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (ERP_API_KEY && ERP_API_SECRET) {
    headers['Authorization'] = `token ${ERP_API_KEY}:${ERP_API_SECRET}`;
  }

  try {
    await fetch(`${ERPNEXT_API_URL}/api/resource/${invoiceType}/${invoiceName}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ docstatus: 2 }), // 2 = Cancelled
    });
  } catch (error) {
    console.error(`Failed to cancel ${invoiceType} ${invoiceName}:`, error);
  }
}

/**
 * Run property test
 */
async function runPropertyTest(iterations: number = 100): Promise<void> {
  console.log(`\n🧪 Property Test 20: VAT Report Calculation`);
  console.log(`Running ${iterations} iterations...\n`);

  let passed = 0;
  let failed = 0;
  const failures: Array<{ iteration: number; error: string }> = [];

  for (let i = 1; i <= iterations; i++) {
    const createdInvoices: Array<{ type: 'Sales Invoice' | 'Purchase Invoice'; name: string }> = [];

    try {
      // Generate random number of sales and purchase invoices
      const numSalesInvoices = Math.floor(Math.random() * 3) + 1; // 1-3 sales invoices
      const numPurchaseInvoices = Math.floor(Math.random() * 3) + 1; // 1-3 purchase invoices

      let expectedPpnOutput = 0;
      let expectedPpnInput = 0;

      // Create sales invoices
      for (let j = 0; j < numSalesInvoices; j++) {
        const invoiceData = generateRandomInvoice('sales');
        const invoiceName = await createSalesInvoice(invoiceData);
        createdInvoices.push({ type: 'Sales Invoice', name: invoiceName });
        expectedPpnOutput += invoiceData.ppn_amount;
      }

      // Create purchase invoices
      for (let j = 0; j < numPurchaseInvoices; j++) {
        const invoiceData = generateRandomInvoice('purchase');
        const invoiceName = await createPurchaseInvoice(invoiceData);
        createdInvoices.push({ type: 'Purchase Invoice', name: invoiceName });
        expectedPpnInput += invoiceData.ppn_amount;
      }

      // Wait a bit for GL entries to be posted
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Fetch VAT report
      const today = new Date().toISOString().split('T')[0];
      const reportData = await fetchVatReport(today, today);

      // Verify calculation
      const actualPpnOutput = reportData.summary.total_ppn_output;
      const actualPpnInput = reportData.summary.total_ppn_input;
      const actualNetPayable = reportData.summary.ppn_kurang_lebih_bayar;
      const expectedNetPayable = expectedPpnOutput - expectedPpnInput;

      // Allow small rounding error (0.01)
      const outputDiff = Math.abs(actualPpnOutput - expectedPpnOutput);
      const inputDiff = Math.abs(actualPpnInput - expectedPpnInput);
      const netPayableDiff = Math.abs(actualNetPayable - expectedNetPayable);

      if (outputDiff > 0.01 || inputDiff > 0.01 || netPayableDiff > 0.01) {
        throw new Error(
          `Calculation mismatch:\n` +
          `  Expected PPN Output: ${expectedPpnOutput.toFixed(2)}, Actual: ${actualPpnOutput.toFixed(2)} (diff: ${outputDiff.toFixed(2)})\n` +
          `  Expected PPN Input: ${expectedPpnInput.toFixed(2)}, Actual: ${actualPpnInput.toFixed(2)} (diff: ${inputDiff.toFixed(2)})\n` +
          `  Expected Net Payable: ${expectedNetPayable.toFixed(2)}, Actual: ${actualNetPayable.toFixed(2)} (diff: ${netPayableDiff.toFixed(2)})`
        );
      }

      passed++;
      if (i % 10 === 0) {
        console.log(`✓ Iteration ${i}/${iterations} passed`);
      }
    } catch (error) {
      failed++;
      failures.push({
        iteration: i,
        error: error instanceof Error ? error.message : String(error),
      });
      console.error(`✗ Iteration ${i}/${iterations} failed: ${error instanceof Error ? error.message : error}`);
    } finally {
      // Cleanup: cancel all created invoices
      for (const invoice of createdInvoices) {
        await cancelInvoice(invoice.type, invoice.name);
      }
    }
  }

  // Print summary
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Test Summary:`);
  console.log(`  Total iterations: ${iterations}`);
  console.log(`  Passed: ${passed} (${((passed / iterations) * 100).toFixed(1)}%)`);
  console.log(`  Failed: ${failed} (${((failed / iterations) * 100).toFixed(1)}%)`);
  console.log(`${'='.repeat(60)}\n`);

  if (failures.length > 0) {
    console.log(`Failures:`);
    failures.forEach(f => {
      console.log(`  Iteration ${f.iteration}: ${f.error}`);
    });
    console.log();
  }

  if (failed > 0) {
    throw new Error(`Property test failed: ${failed}/${iterations} iterations failed`);
  }

  console.log(`✅ Property Test 20 PASSED: All ${iterations} iterations successful\n`);
}

// Run the test
const iterations = parseInt(process.env.TEST_ITERATIONS || '100', 10);
runPropertyTest(iterations)
  .then(() => {
    console.log('✅ VAT Report Calculation property test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ VAT Report Calculation property test failed:', error);
    process.exit(1);
  });
