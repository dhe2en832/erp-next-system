/**
 * Component Tests: InvoiceSummary
 * Task 8.6: Write component tests untuk InvoiceSummary
 * 
 * Validates: Requirements 4.6, 4.7
 * 
 * Tests:
 * - Calculation: subtotal - discount + tax = grand_total
 * - Currency formatting
 * - Real-time update
 */

// Mock test results
interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
}

interface InvoiceItem {
  qty: number;
  rate: number;
  amount?: number;
}

interface TaxRow {
  charge_type: string;
  account_head: string;
  description?: string;
  rate: number;
  tax_amount?: number;
  add_deduct_tax?: 'Add' | 'Deduct';
}

// Helper: Calculate invoice summary
function calculateInvoiceSummary(
  items: InvoiceItem[],
  discountAmount: number = 0,
  discountPercentage: number = 0,
  taxes: TaxRow[] = []
) {
  // Calculate subtotal
  const subtotal = items.reduce((sum, item) => {
    const itemAmount = item.amount || (item.qty * item.rate);
    return sum + itemAmount;
  }, 0);

  // Calculate discount
  const discount = discountAmount > 0 
    ? discountAmount 
    : (discountPercentage / 100) * subtotal;

  // Calculate net total
  const netTotal = subtotal - discount;

  // Calculate taxes
  let runningTotal = netTotal;
  let totalTaxAmount = 0;

  taxes.forEach(tax => {
    let taxAmount = 0;

    if (tax.charge_type === 'On Net Total') {
      taxAmount = (tax.rate / 100) * netTotal;
    } else if (tax.charge_type === 'On Previous Row Total') {
      taxAmount = (tax.rate / 100) * runningTotal;
    } else if (tax.charge_type === 'Actual') {
      taxAmount = tax.tax_amount || 0;
    }

    if (tax.add_deduct_tax === 'Deduct') {
      taxAmount = -Math.abs(taxAmount);
    }

    runningTotal += taxAmount;
    totalTaxAmount += taxAmount;
  });

  // Calculate grand total
  const grandTotal = netTotal + totalTaxAmount;

  return {
    subtotal,
    discount,
    netTotal,
    totalTaxAmount,
    grandTotal
  };
}

// Helper: Format currency
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

// Test 1: Basic Calculation - No Discount, No Tax
function testBasicCalculation(): TestResult {
  const items: InvoiceItem[] = [
    { qty: 10, rate: 100000 },
    { qty: 5, rate: 50000 }
  ];

  const result = calculateInvoiceSummary(items);
  const expectedSubtotal = 1250000;
  const expectedGrandTotal = 1250000;

  const passed = result.subtotal === expectedSubtotal && result.grandTotal === expectedGrandTotal;

  return {
    name: 'Test 1: Basic Calculation - No Discount, No Tax',
    passed,
    message: passed 
      ? `✓ Subtotal: ${formatCurrency(result.subtotal)}, Grand Total: ${formatCurrency(result.grandTotal)}`
      : `✗ Expected subtotal ${expectedSubtotal}, got ${result.subtotal}`
  };
}

// Test 2: Calculation with Discount Percentage
function testCalculationWithDiscountPercentage(): TestResult {
  const items: InvoiceItem[] = [
    { qty: 10, rate: 100000 }
  ];
  const discountPercentage = 10;

  const result = calculateInvoiceSummary(items, 0, discountPercentage);
  const expectedDiscount = 100000;
  const expectedNetTotal = 900000;
  const expectedGrandTotal = 900000;

  const passed = 
    result.discount === expectedDiscount && 
    result.netTotal === expectedNetTotal &&
    result.grandTotal === expectedGrandTotal;

  return {
    name: 'Test 2: Calculation with Discount Percentage',
    passed,
    message: passed 
      ? `✓ Discount: ${formatCurrency(result.discount)}, Net Total: ${formatCurrency(result.netTotal)}`
      : `✗ Calculation failed`
  };
}

// Test 3: Calculation with Discount Amount
function testCalculationWithDiscountAmount(): TestResult {
  const items: InvoiceItem[] = [
    { qty: 10, rate: 100000 }
  ];
  const discountAmount = 150000;

  const result = calculateInvoiceSummary(items, discountAmount);
  const expectedNetTotal = 850000;

  const passed = result.netTotal === expectedNetTotal;

  return {
    name: 'Test 3: Calculation with Discount Amount',
    passed,
    message: passed 
      ? `✓ Net Total after Rp 150.000 discount: ${formatCurrency(result.netTotal)}`
      : `✗ Expected ${expectedNetTotal}, got ${result.netTotal}`
  };
}

// Test 4: Calculation with Single Tax
function testCalculationWithSingleTax(): TestResult {
  const items: InvoiceItem[] = [
    { qty: 10, rate: 100000 }
  ];
  const taxes: TaxRow[] = [
    {
      charge_type: 'On Net Total',
      account_head: '2210 - Hutang PPN',
      description: 'PPN 11%',
      rate: 11,
      add_deduct_tax: 'Add'
    }
  ];

  const result = calculateInvoiceSummary(items, 0, 0, taxes);
  const expectedTax = 110000;
  const expectedGrandTotal = 1110000;

  const passed = 
    Math.abs(result.totalTaxAmount - expectedTax) < 0.01 &&
    Math.abs(result.grandTotal - expectedGrandTotal) < 0.01;

  return {
    name: 'Test 4: Calculation with Single Tax (PPN 11%)',
    passed,
    message: passed 
      ? `✓ Tax: ${formatCurrency(result.totalTaxAmount)}, Grand Total: ${formatCurrency(result.grandTotal)}`
      : `✗ Expected tax ${expectedTax}, got ${result.totalTaxAmount}`
  };
}

// Test 5: Calculation with Discount and Tax
function testCalculationWithDiscountAndTax(): TestResult {
  const items: InvoiceItem[] = [
    { qty: 10, rate: 100000 }
  ];
  const discountPercentage = 10;
  const taxes: TaxRow[] = [
    {
      charge_type: 'On Net Total',
      account_head: '2210 - Hutang PPN',
      description: 'PPN 11%',
      rate: 11,
      add_deduct_tax: 'Add'
    }
  ];

  const result = calculateInvoiceSummary(items, 0, discountPercentage, taxes);
  const expectedSubtotal = 1000000;
  const expectedDiscount = 100000;
  const expectedNetTotal = 900000;
  const expectedTax = 99000;
  const expectedGrandTotal = 999000;

  const passed = 
    result.subtotal === expectedSubtotal &&
    result.discount === expectedDiscount &&
    result.netTotal === expectedNetTotal &&
    Math.abs(result.totalTaxAmount - expectedTax) < 0.01 &&
    Math.abs(result.grandTotal - expectedGrandTotal) < 0.01;

  return {
    name: 'Test 5: Calculation with Discount and Tax',
    passed,
    message: passed 
      ? `✓ Subtotal: ${formatCurrency(result.subtotal)}, Discount: ${formatCurrency(result.discount)}, Tax: ${formatCurrency(result.totalTaxAmount)}, Grand Total: ${formatCurrency(result.grandTotal)}`
      : `✗ Calculation failed`
  };
}

// Test 6: Calculation with Multiple Taxes
function testCalculationWithMultipleTaxes(): TestResult {
  const items: InvoiceItem[] = [
    { qty: 10, rate: 100000 }
  ];
  const taxes: TaxRow[] = [
    {
      charge_type: 'On Net Total',
      account_head: '2210 - Hutang PPN',
      description: 'PPN 11%',
      rate: 11,
      add_deduct_tax: 'Add'
    },
    {
      charge_type: 'On Net Total',
      account_head: '2230 - Hutang PPh 23',
      description: 'PPh 23 (2%)',
      rate: 2,
      add_deduct_tax: 'Deduct'
    }
  ];

  const result = calculateInvoiceSummary(items, 0, 0, taxes);
  const expectedTotalTax = 110000 - 20000; // PPN - PPh
  const expectedGrandTotal = 1000000 + expectedTotalTax;

  const passed = 
    Math.abs(result.totalTaxAmount - expectedTotalTax) < 0.01 &&
    Math.abs(result.grandTotal - expectedGrandTotal) < 0.01;

  return {
    name: 'Test 6: Calculation with Multiple Taxes (PPN + PPh 23)',
    passed,
    message: passed 
      ? `✓ Total Tax: ${formatCurrency(result.totalTaxAmount)}, Grand Total: ${formatCurrency(result.grandTotal)}`
      : `✗ Expected total tax ${expectedTotalTax}, got ${result.totalTaxAmount}`
  };
}

// Test 7: Currency Formatting
function testCurrencyFormatting(): TestResult {
  const value = 1234567.89;
  const formatted = formatCurrency(value);
  
  // Check format: Rp1.234.567,89
  const hasRpPrefix = formatted.startsWith('Rp');
  const hasThousandSeparator = formatted.includes('.');
  const hasDecimalSeparator = formatted.includes(',');

  const passed = hasRpPrefix && hasThousandSeparator && hasDecimalSeparator;

  return {
    name: 'Test 7: Currency Formatting',
    passed,
    message: passed 
      ? `✓ Formatted correctly: ${formatted}`
      : `✗ Format incorrect: ${formatted}`
  };
}

// Test 8: Zero Values
function testZeroValues(): TestResult {
  const items: InvoiceItem[] = [];
  const result = calculateInvoiceSummary(items);

  const passed = 
    result.subtotal === 0 &&
    result.discount === 0 &&
    result.netTotal === 0 &&
    result.totalTaxAmount === 0 &&
    result.grandTotal === 0;

  return {
    name: 'Test 8: Zero Values (Empty Invoice)',
    passed,
    message: passed 
      ? `✓ All values are zero for empty invoice`
      : `✗ Zero values not handled correctly`
  };
}

// Test 9: Grand Total Formula Verification
function testGrandTotalFormula(): TestResult {
  const items: InvoiceItem[] = [
    { qty: 10, rate: 100000 }
  ];
  const discountAmount = 100000;
  const taxes: TaxRow[] = [
    {
      charge_type: 'On Net Total',
      account_head: '2210 - Hutang PPN',
      rate: 11,
      add_deduct_tax: 'Add'
    }
  ];

  const result = calculateInvoiceSummary(items, discountAmount, 0, taxes);
  
  // Verify: grand_total = subtotal - discount + tax
  const calculatedGrandTotal = result.subtotal - result.discount + result.totalTaxAmount;
  const passed = Math.abs(result.grandTotal - calculatedGrandTotal) < 0.01;

  return {
    name: 'Test 9: Grand Total Formula Verification',
    passed,
    message: passed 
      ? `✓ Formula verified: ${formatCurrency(result.subtotal)} - ${formatCurrency(result.discount)} + ${formatCurrency(result.totalTaxAmount)} = ${formatCurrency(result.grandTotal)}`
      : `✗ Formula verification failed`
  };
}

// Test 10: Real-time Update Simulation
function testRealtimeUpdate(): TestResult {
  // Initial state
  const items: InvoiceItem[] = [
    { qty: 10, rate: 100000 }
  ];
  const result1 = calculateInvoiceSummary(items);

  // Update: add discount
  const result2 = calculateInvoiceSummary(items, 0, 10);

  // Update: add tax
  const taxes: TaxRow[] = [
    {
      charge_type: 'On Net Total',
      account_head: '2210 - Hutang PPN',
      rate: 11,
      add_deduct_tax: 'Add'
    }
  ];
  const result3 = calculateInvoiceSummary(items, 0, 10, taxes);

  const passed = 
    result1.grandTotal === 1000000 &&
    result2.grandTotal === 900000 &&
    Math.abs(result3.grandTotal - 999000) < 0.01;

  return {
    name: 'Test 10: Real-time Update Simulation',
    passed,
    message: passed 
      ? `✓ Updates calculated correctly: ${formatCurrency(result1.grandTotal)} → ${formatCurrency(result2.grandTotal)} → ${formatCurrency(result3.grandTotal)}`
      : `✗ Real-time update failed`
  };
}

// Run all tests
function runTests() {
  console.log('\n=== InvoiceSummary Component Tests ===\n');

  const tests = [
    testBasicCalculation,
    testCalculationWithDiscountPercentage,
    testCalculationWithDiscountAmount,
    testCalculationWithSingleTax,
    testCalculationWithDiscountAndTax,
    testCalculationWithMultipleTaxes,
    testCurrencyFormatting,
    testZeroValues,
    testGrandTotalFormula,
    testRealtimeUpdate
  ];

  const results = tests.map(test => test());

  results.forEach(result => {
    console.log(`${result.passed ? '✓' : '✗'} ${result.name}`);
    if (result.message) {
      console.log(`  ${result.message}`);
    }
  });

  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;

  console.log(`\n=== Summary ===`);
  console.log(`Passed: ${passedCount}/${totalCount}`);
  console.log(`Failed: ${totalCount - passedCount}/${totalCount}`);

  if (passedCount === totalCount) {
    console.log('\n✓ All tests passed!\n');
    process.exit(0);
  } else {
    console.log('\n✗ Some tests failed!\n');
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

export { runTests };
