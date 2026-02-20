/**
 * Property Test: Real-time Calculation Consistency (Property 15)
 * Task 9.6: Write property test untuk Real-time Calculation Consistency
 * 
 * Validates: Requirements 4.7
 * 
 * Property 15: Real-time Calculation Consistency
 * - Generate random invoice data (items, discount, taxes)
 * - Calculate totals in frontend (using useInvoiceCalculation logic)
 * - Submit to backend API
 * - Verify frontend calculation matches backend calculation (tolerance 0.01)
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
} else {
  console.error('No .env or .env.local file found');
}

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';
const API_KEY = process.env.ERP_API_KEY;
const API_SECRET = process.env.ERP_API_SECRET;
const NEXT_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface InvoiceItem {
  item_code: string;
  item_name: string;
  qty: number;
  rate: number;
  amount: number;
  warehouse: string;
}

interface TaxRow {
  charge_type: string;
  account_head: string;
  description: string;
  rate: number;
}

interface InvoiceData {
  company: string;
  customer: string;
  customer_name: string;
  posting_date: string;
  due_date: string;
  items: InvoiceItem[];
  discount_amount: number;
  discount_percentage: number;
  taxes_and_charges?: string;
  taxes: TaxRow[];
}

interface FrontendCalculation {
  subtotal: number;
  discount_amount: number;
  discount_percentage: number;
  net_total: number;
  total_taxes: number;
  grand_total: number;
}

// Helper: Generate random invoice data
function generateRandomInvoiceData(iteration: number): InvoiceData {
  const itemCount = Math.floor(Math.random() * 5) + 1; // 1-5 items
  const items: InvoiceItem[] = [];
  
  for (let i = 0; i < itemCount; i++) {
    const qty = Math.floor(Math.random() * 10) + 1; // 1-10
    const rate = Math.floor(Math.random() * 100000) + 10000; // 10k-110k
    items.push({
      item_code: `TEST-ITEM-${iteration}-${i}`,
      item_name: `Test Item ${iteration}-${i}`,
      qty: qty,
      rate: rate,
      amount: qty * rate,
      warehouse: 'Finished Goods - BAC'
    });
  }
  
  // Random discount (0%, 5%, 10%, 15%, or fixed amount)
  const discountType = Math.random();
  let discountAmount = 0;
  let discountPercentage = 0;
  
  if (discountType < 0.3) {
    // 30% chance: percentage discount
    discountPercentage = [0, 5, 10, 15][Math.floor(Math.random() * 4)];
  } else if (discountType < 0.5) {
    // 20% chance: fixed amount discount
    discountAmount = Math.floor(Math.random() * 50000) + 10000; // 10k-60k
  }
  // 50% chance: no discount
  
  // Random tax (0%, 11% PPN, or 11% PPN + 2% PPh 23)
  const taxType = Math.random();
  const taxes: TaxRow[] = [];
  
  if (taxType < 0.4) {
    // 40% chance: PPN 11%
    taxes.push({
      charge_type: 'On Net Total',
      account_head: '2210 - Hutang PPN - BAC',
      description: 'PPN 11%',
      rate: 11
    });
  } else if (taxType < 0.6) {
    // 20% chance: PPN 11% + PPh 23 2%
    taxes.push({
      charge_type: 'On Net Total',
      account_head: '2210 - Hutang PPN - BAC',
      description: 'PPN 11%',
      rate: 11
    });
    taxes.push({
      charge_type: 'On Net Total',
      account_head: '2230 - Hutang PPh 23 - BAC',
      description: 'PPh 23 (2%)',
      rate: 2
    });
  }
  // 40% chance: no tax
  
  const today = new Date();
  const dueDate = new Date(today);
  dueDate.setDate(dueDate.getDate() + 30);
  
  return {
    company: 'BAC',
    customer: 'TEST-CUSTOMER',
    customer_name: `Test Customer ${iteration}`,
    posting_date: today.toISOString().split('T')[0],
    due_date: dueDate.toISOString().split('T')[0],
    items: items,
    discount_amount: discountAmount,
    discount_percentage: discountPercentage,
    taxes: taxes
  };
}

// Frontend calculation logic (same as useInvoiceCalculation hook)
function calculateFrontend(data: InvoiceData): FrontendCalculation {
  // 1. Calculate subtotal
  const subtotal = data.items.reduce((sum, item) => {
    return sum + (item.qty * item.rate);
  }, 0);

  // 2. Calculate discount
  let finalDiscountAmount = 0;
  let finalDiscountPercentage = 0;

  if (data.discount_amount > 0) {
    finalDiscountAmount = data.discount_amount;
    finalDiscountPercentage = subtotal > 0 ? (data.discount_amount / subtotal) * 100 : 0;
  } else if (data.discount_percentage > 0) {
    finalDiscountAmount = (data.discount_percentage / 100) * subtotal;
    finalDiscountPercentage = data.discount_percentage;
  }

  // 3. Calculate net total
  const netTotal = subtotal - finalDiscountAmount;

  // 4. Calculate taxes
  let totalTaxes = 0;

  if (data.taxes && data.taxes.length > 0) {
    let runningTotal = netTotal;

    for (const taxRow of data.taxes) {
      const rate = taxRow.rate || 0;
      let taxAmount = 0;

      if (taxRow.charge_type === 'On Net Total') {
        taxAmount = (rate / 100) * netTotal;
      } else if (taxRow.charge_type === 'On Previous Row Total') {
        taxAmount = (rate / 100) * runningTotal;
      }

      runningTotal += taxAmount;
      totalTaxes += taxAmount;
    }
  }

  // 5. Calculate grand total
  const grandTotal = netTotal + totalTaxes;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discount_amount: Math.round(finalDiscountAmount * 100) / 100,
    discount_percentage: Math.round(finalDiscountPercentage * 100) / 100,
    net_total: Math.round(netTotal * 100) / 100,
    total_taxes: Math.round(totalTaxes * 100) / 100,
    grand_total: Math.round(grandTotal * 100) / 100,
  };
}

// Helper: Create invoice via Next.js API
async function createInvoiceViaAPI(data: InvoiceData): Promise<any> {
  const url = `${NEXT_API_URL}/api/sales/invoices`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to create invoice: ${response.status} ${text}`);
  }

  const result = await response.json();
  return result;
}

// Helper: Delete invoice via ERPNext API
async function deleteInvoice(name: string): Promise<void> {
  if (!API_KEY || !API_SECRET) {
    return; // Skip cleanup if no credentials
  }

  const url = `${ERPNEXT_API_URL}/api/resource/Sales Invoice/${encodeURIComponent(name)}`;
  
  try {
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

// Property Test: Real-time calculation consistency
async function testCalculationConsistency(iteration: number): Promise<boolean> {
  let invoiceName: string | null = null;
  
  try {
    // Step 1: Generate random invoice data
    const invoiceData = generateRandomInvoiceData(iteration);
    
    // Step 2: Calculate in frontend
    const frontendCalc = calculateFrontend(invoiceData);
    
    // Step 3: Submit to backend
    const response = await createInvoiceViaAPI(invoiceData);
    
    if (!response.success) {
      throw new Error(`API returned error: ${response.message || 'Unknown error'}`);
    }
    
    const backendData = response.data;
    invoiceName = backendData.name;
    
    // Step 4: Verify calculations match (with tolerance 0.01)
    const tolerance = 0.01;
    
    const subtotalMatch = Math.abs(frontendCalc.subtotal - (backendData.total || 0)) < tolerance;
    const discountMatch = Math.abs(frontendCalc.discount_amount - (backendData.discount_amount || 0)) < tolerance;
    const netTotalMatch = Math.abs(frontendCalc.net_total - (backendData.net_total || 0)) < tolerance;
    const taxesMatch = Math.abs(frontendCalc.total_taxes - (backendData.total_taxes_and_charges || 0)) < tolerance;
    const grandTotalMatch = Math.abs(frontendCalc.grand_total - (backendData.grand_total || 0)) < tolerance;
    
    const allMatch = subtotalMatch && discountMatch && netTotalMatch && taxesMatch && grandTotalMatch;
    
    if (!allMatch) {
      console.error(`❌ Iteration ${iteration} FAILED:`);
      console.error(`   Subtotal match: ${subtotalMatch} (Frontend: ${frontendCalc.subtotal}, Backend: ${backendData.total})`);
      console.error(`   Discount match: ${discountMatch} (Frontend: ${frontendCalc.discount_amount}, Backend: ${backendData.discount_amount})`);
      console.error(`   Net Total match: ${netTotalMatch} (Frontend: ${frontendCalc.net_total}, Backend: ${backendData.net_total})`);
      console.error(`   Taxes match: ${taxesMatch} (Frontend: ${frontendCalc.total_taxes}, Backend: ${backendData.total_taxes_and_charges})`);
      console.error(`   Grand Total match: ${grandTotalMatch} (Frontend: ${frontendCalc.grand_total}, Backend: ${backendData.grand_total})`);
    }
    
    return allMatch;
    
  } catch (error: any) {
    console.error(`❌ Iteration ${iteration} ERROR: ${error.message}`);
    return false;
  } finally {
    // Cleanup: Delete test invoice
    if (invoiceName) {
      try {
        await deleteInvoice(invoiceName);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }
}

// Main test runner
async function runPropertyTest() {
  console.log('='.repeat(60));
  console.log('🧪 Property Test: Real-time Calculation Consistency');
  console.log('   Task 9.6: Property 15 test');
  console.log('   Validates: Requirements 4.7');
  console.log('='.repeat(60));

  console.log(`\n✅ Configuration:`);
  console.log(`   ERPNext API URL: ${ERPNEXT_API_URL}`);
  console.log(`   Next.js API URL: ${NEXT_API_URL}`);
  console.log(`   Running 100 iterations...\n`);

  const iterations = 100;
  let passed = 0;
  let failed = 0;

  for (let i = 1; i <= iterations; i++) {
    const result = await testCalculationConsistency(i);
    
    if (result) {
      passed++;
      if (i % 10 === 0) {
        console.log(`✅ Iteration ${i}/${iterations} - ${passed} passed, ${failed} failed`);
      }
    } else {
      failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Results');
  console.log('='.repeat(60));
  console.log(`Total iterations: ${iterations}`);
  console.log(`Passed: ${passed} (${(passed/iterations*100).toFixed(1)}%)`);
  console.log(`Failed: ${failed} (${(failed/iterations*100).toFixed(1)}%)`);
  
  if (failed === 0) {
    console.log('\n✅ Property Test PASSED');
    console.log('   Frontend and backend calculations are consistent');
    process.exit(0);
  } else {
    console.log('\n❌ Property Test FAILED');
    console.log(`   ${failed} iterations failed`);
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

export { testCalculationConsistency, generateRandomInvoiceData, calculateFrontend };
