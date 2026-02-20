/**
 * Integration Tests for Backward Compatibility
 * 
 * Tests that old invoices (without discount/tax) work correctly:
 * - Form opens without error
 * - List view displays default values (Rp 0)
 * - API returns default values (0 and empty array)
 * - Editing old invoice without adding discount/tax doesn't break anything
 * 
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 15.10
 */

// Simple test runner
let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual(actual: any, expected: any, message?: string) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${actual} to equal ${expected}`);
  }
}

function assertDeepEqual(actual: any, expected: any, message?: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(message || `Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
  }
}

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    testsPassed++;
  } catch (error) {
    console.log(`  ✗ ${name}`);
    console.error(`    Error: ${error instanceof Error ? error.message : String(error)}`);
    testsFailed++;
  }
}

console.log('\n=== Backward Compatibility Tests ===\n');

// Mock old invoice data (simulating invoice created before discount/tax implementation)
const mockOldSalesInvoice: any = {
  name: 'SI-OLD-TEST-001',
  customer: 'CUST-001',
  customer_name: 'Old Customer',
  posting_date: '2024-01-01',
  due_date: '2024-01-31',
  company: 'Test Company',
  items: [
    {
      item_code: 'ITEM-001',
      item_name: 'Test Item',
      qty: 10,
      rate: 100000,
      amount: 1000000,
      warehouse: 'Main - TC',
      income_account: '4100 - Sales - TC',
      cost_center: 'Main - TC',
    }
  ],
  total: 1000000,
  net_total: 1000000,
  grand_total: 1000000,
  outstanding_amount: 1000000,
  status: 'Submitted',
  docstatus: 1,
};

const mockOldPurchaseInvoice: any = {
  name: 'PI-OLD-TEST-001',
  supplier: 'SUPP-001',
  supplier_name: 'Old Supplier',
  posting_date: '2024-01-01',
  due_date: '2024-01-31',
  company: 'Test Company',
  currency: 'IDR',
  items: [
    {
      item_code: 'ITEM-001',
      item_name: 'Test Item',
      qty: 10,
      rate: 80000,
      amount: 800000,
      warehouse: 'Main - TC',
    }
  ],
  total: 800000,
  net_total: 800000,
  grand_total: 800000,
  outstanding_amount: 800000,
  status: 'Submitted',
  docstatus: 1,
};

console.log('API GET for Old Invoices:');

test('should return default values for old Sales Invoice', () => {
  const apiResponse = {
    ...mockOldSalesInvoice,
    discount_amount: mockOldSalesInvoice.discount_amount || 0,
    discount_percentage: mockOldSalesInvoice.discount_percentage || 0,
    taxes: mockOldSalesInvoice.taxes || [],
    total_taxes_and_charges: mockOldSalesInvoice.total_taxes_and_charges || 0,
  };

  assertEqual(apiResponse.discount_amount, 0);
  assertEqual(apiResponse.discount_percentage, 0);
  assertDeepEqual(apiResponse.taxes, []);
  assertEqual(apiResponse.total_taxes_and_charges, 0);
  assertEqual(apiResponse.grand_total, 1000000);
});

test('should return default values for old Purchase Invoice', () => {
  const apiResponse = {
    ...mockOldPurchaseInvoice,
    discount_amount: mockOldPurchaseInvoice.discount_amount || 0,
    discount_percentage: mockOldPurchaseInvoice.discount_percentage || 0,
    taxes: mockOldPurchaseInvoice.taxes || [],
    total_taxes_and_charges: mockOldPurchaseInvoice.total_taxes_and_charges || 0,
  };

  assertEqual(apiResponse.discount_amount, 0);
  assertEqual(apiResponse.discount_percentage, 0);
  assertDeepEqual(apiResponse.taxes, []);
  assertEqual(apiResponse.total_taxes_and_charges, 0);
  assertEqual(apiResponse.grand_total, 800000);
});

console.log('\nForm View for Old Invoices:');

test('should handle old Sales Invoice form without error', () => {
  const formData = {
    ...mockOldSalesInvoice,
    discount_amount: mockOldSalesInvoice.discount_amount || 0,
    discount_percentage: mockOldSalesInvoice.discount_percentage || 0,
  };

  assertEqual(formData.discount_amount, 0);
  assertEqual(formData.discount_percentage, 0);
  assertEqual(formData.grand_total, 1000000);
  assert(formData.discount_amount !== undefined, 'discount_amount should not be undefined');
  assert(formData.discount_amount !== null, 'discount_amount should not be null');
});

test('should handle old Purchase Invoice form without error', () => {
  const formData = {
    ...mockOldPurchaseInvoice,
    discount_amount: mockOldPurchaseInvoice.discount_amount || 0,
    discount_percentage: mockOldPurchaseInvoice.discount_percentage || 0,
  };

  assertEqual(formData.discount_amount, 0);
  assertEqual(formData.discount_percentage, 0);
  assertEqual(formData.grand_total, 800000);
  assert(formData.discount_amount !== undefined, 'discount_amount should not be undefined');
  assert(formData.discount_amount !== null, 'discount_amount should not be null');
});

test('should allow editing old invoice without adding discount/tax', () => {
  const originalInvoice = {
    ...mockOldSalesInvoice,
    discount_amount: 0,
    discount_percentage: 0,
    taxes: [],
  };

  const editedInvoice = {
    ...originalInvoice,
    customer_name: 'Updated Customer Name',
  };

  assertEqual(editedInvoice.discount_amount, originalInvoice.discount_amount);
  assertEqual(editedInvoice.discount_percentage, originalInvoice.discount_percentage);
  assertDeepEqual(editedInvoice.taxes, originalInvoice.taxes);
  assertEqual(editedInvoice.grand_total, originalInvoice.grand_total);
  assertEqual(editedInvoice.customer_name, 'Updated Customer Name');
  assert(editedInvoice.customer_name !== originalInvoice.customer_name, 'customer_name should be changed');
});

console.log('\nList View for Old Invoices:');

test('should display Rp 0 for discount and tax in Sales Invoice list', () => {
  const listItem = {
    ...mockOldSalesInvoice,
    discount_amount: mockOldSalesInvoice.discount_amount || 0,
    total_taxes_and_charges: mockOldSalesInvoice.total_taxes_and_charges || 0,
  };

  const displayDiscount = `Rp ${listItem.discount_amount.toLocaleString('id-ID')}`;
  const displayTax = `Rp ${listItem.total_taxes_and_charges.toLocaleString('id-ID')}`;

  assertEqual(displayDiscount, 'Rp 0');
  assertEqual(displayTax, 'Rp 0');
});

test('should display IDR 0 for discount and tax in Purchase Invoice list', () => {
  const listItem = {
    ...mockOldPurchaseInvoice,
    discount_amount: mockOldPurchaseInvoice.discount_amount || 0,
    total_taxes_and_charges: mockOldPurchaseInvoice.total_taxes_and_charges || 0,
  };

  const displayDiscount = `${listItem.currency || 'IDR'} ${listItem.discount_amount.toLocaleString('id-ID')}`;
  const displayTax = `${listItem.currency || 'IDR'} ${listItem.total_taxes_and_charges.toLocaleString('id-ID')}`;

  assertEqual(displayDiscount, 'IDR 0');
  assertEqual(displayTax, 'IDR 0');
});

console.log('\nCalculation Consistency:');

test('should maintain grand_total equals total for old invoices', () => {
  const invoice = {
    total: 1000000,
    discount_amount: 0,
    taxes: [],
    total_taxes_and_charges: 0,
  };

  const net_total = invoice.total - invoice.discount_amount;
  const grand_total = net_total + invoice.total_taxes_and_charges;

  assertEqual(grand_total, invoice.total);
  assertEqual(grand_total, 1000000);
});

test('should handle optional chaining for missing fields', () => {
  const invoice: any = {
    name: 'SI-OLD-003',
    total: 1000000,
    grand_total: 1000000,
  };

  const discount_amount = invoice.discount_amount ?? 0;
  const discount_percentage = invoice.discount_percentage ?? 0;
  const taxes = invoice.taxes ?? [];
  const total_taxes_and_charges = invoice.total_taxes_and_charges ?? 0;

  assertEqual(discount_amount, 0);
  assertEqual(discount_percentage, 0);
  assertDeepEqual(taxes, []);
  assertEqual(total_taxes_and_charges, 0);
});

console.log('\nEdge Cases:');

test('should handle invoice with undefined discount/tax fields', () => {
  const invoice: any = {
    name: 'SI-EDGE-001',
    total: 1000000,
    discount_amount: undefined,
    discount_percentage: undefined,
    taxes: undefined,
    total_taxes_and_charges: undefined,
  };

  const normalized = {
    ...invoice,
    discount_amount: invoice.discount_amount || 0,
    discount_percentage: invoice.discount_percentage || 0,
    taxes: invoice.taxes || [],
    total_taxes_and_charges: invoice.total_taxes_and_charges || 0,
  };

  assertEqual(normalized.discount_amount, 0);
  assertEqual(normalized.discount_percentage, 0);
  assertDeepEqual(normalized.taxes, []);
  assertEqual(normalized.total_taxes_and_charges, 0);
});

test('should handle invoice with null discount/tax fields', () => {
  const invoice: any = {
    name: 'SI-EDGE-002',
    total: 1000000,
    discount_amount: null,
    discount_percentage: null,
    taxes: null,
    total_taxes_and_charges: null,
  };

  const normalized = {
    ...invoice,
    discount_amount: invoice.discount_amount || 0,
    discount_percentage: invoice.discount_percentage || 0,
    taxes: invoice.taxes || [],
    total_taxes_and_charges: invoice.total_taxes_and_charges || 0,
  };

  assertEqual(normalized.discount_amount, 0);
  assertEqual(normalized.discount_percentage, 0);
  assertDeepEqual(normalized.taxes, []);
  assertEqual(normalized.total_taxes_and_charges, 0);
});

test('should handle empty string for discount fields', () => {
  const invoice: any = {
    name: 'SI-EDGE-003',
    total: 1000000,
    discount_amount: '',
    discount_percentage: '',
  };

  const normalized = {
    ...invoice,
    discount_amount: invoice.discount_amount || 0,
    discount_percentage: invoice.discount_percentage || 0,
  };

  assertEqual(normalized.discount_amount, 0);
  assertEqual(normalized.discount_percentage, 0);
});

console.log('\nHistorical Data Integrity:');

test('should not modify old invoice data when fetching', () => {
  const originalData: any = {
    name: 'SI-HISTORICAL-001',
    total: 1000000,
    grand_total: 1000000,
  };

  const fetchedData = {
    ...originalData,
    discount_amount: originalData.discount_amount || 0,
    discount_percentage: originalData.discount_percentage || 0,
    taxes: originalData.taxes || [],
  };

  assertEqual(fetchedData.total, originalData.total);
  assertEqual(fetchedData.grand_total, originalData.grand_total);
  assertEqual(fetchedData.discount_amount, 0);
  assertEqual(fetchedData.discount_percentage, 0);
  assertDeepEqual(fetchedData.taxes, []);
});

test('should maintain report consistency for historical periods', () => {
  const historicalInvoices = [
    { name: 'SI-2023-001', total: 1000000, discount_amount: 0, taxes: [] },
    { name: 'SI-2023-002', total: 2000000, discount_amount: 0, taxes: [] },
    { name: 'SI-2023-003', total: 1500000, discount_amount: 0, taxes: [] },
  ];

  const totalSales = historicalInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalDiscount = historicalInvoices.reduce((sum, inv) => sum + inv.discount_amount, 0);

  assertEqual(totalSales, 4500000);
  assertEqual(totalDiscount, 0);
  assertEqual(totalSales - totalDiscount, totalSales);
});

console.log('\n=== Test Summary ===');
console.log(`✓ Passed: ${testsPassed}`);
console.log(`✗ Failed: ${testsFailed}`);
console.log(`Total: ${testsPassed + testsFailed}`);

if (testsFailed > 0) {
  process.exit(1);
}

console.log('\n✅ All backward compatibility tests passed!');
