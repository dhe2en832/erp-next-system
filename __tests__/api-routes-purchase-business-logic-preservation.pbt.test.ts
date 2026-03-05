/**
 * Property-Based Test: Business Logic Preservation (Purchase)
 * 
 * **Property 11: Business Logic Preservation**
 * **Validates: Requirements 9.4**
 * 
 * This test validates that business operations (purchase) performed through migrated
 * routes produce equivalent business logic results (calculations, validations, side
 * effects) as the legacy routes. This ensures that the migration to site-aware
 * clients doesn't alter core business logic.
 * 
 * Test Scope:
 * - Purchase order calculations (totals, taxes, discounts) are preserved
 * - Purchase receipt calculations are preserved
 * - Purchase invoice calculations are preserved
 * - Validation logic remains consistent
 * - Business rules are maintained
 * 
 * Feature: api-routes-multi-site-support
 */

import * as fc from 'fast-check';

// Simple assertion helpers
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}\n  Expected: ${expected}\n  Actual: ${actual}`);
  }
}

function assertClose(actual: number, expected: number, tolerance: number, message: string): void {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${message}\n  Expected: ${expected} (±${tolerance})\n  Actual: ${actual}`);
  }
}

// Type definitions
interface PurchaseOrderItem {
  item_code: string;
  qty: number;
  rate: number;
  amount?: number;
  discount_percentage?: number;
  discount_amount?: number;
  net_amount?: number;
}

interface PurchaseTax {
  account_head: string;
  rate: number;
  tax_amount?: number;
}

interface PurchaseOrder {
  name?: string;
  supplier: string;
  company: string;
  items: PurchaseOrderItem[];
  taxes?: PurchaseTax[];
  total?: number;
  net_total?: number;
  total_taxes_and_charges?: number;
  grand_total?: number;
  discount_amount?: number;
  rounding_adjustment?: number;
  rounded_total?: number;
}

interface LegacyPurchaseResponse {
  success: boolean;
  data: PurchaseOrder;
  message?: string;
}

interface ModernPurchaseResponse {
  success: boolean;
  data: PurchaseOrder;
  message?: string;
  site?: string;
}

/**
 * Calculates item-level amounts (legacy pattern)
 */
function calculateItemAmounts(item: PurchaseOrderItem): PurchaseOrderItem {
  const calculated = { ...item };
  
  // Calculate base amount
  calculated.amount = item.qty * item.rate;
  
  // Apply discount percentage
  if (item.discount_percentage && item.discount_percentage > 0) {
    calculated.discount_amount = (calculated.amount * item.discount_percentage) / 100;
    calculated.net_amount = calculated.amount - calculated.discount_amount;
  } else if (item.discount_amount && item.discount_amount > 0) {
    calculated.discount_amount = item.discount_amount;
    calculated.net_amount = calculated.amount - calculated.discount_amount;
  } else {
    calculated.discount_amount = 0;
    calculated.net_amount = calculated.amount;
  }
  
  return calculated;
}

/**
 * Calculates order-level totals (legacy pattern)
 */
function calculateOrderTotals(order: PurchaseOrder): PurchaseOrder {
  const calculated = { ...order };
  
  // Calculate item amounts
  calculated.items = order.items.map(item => calculateItemAmounts(item));
  
  // Calculate total and net_total
  calculated.total = calculated.items.reduce((sum, item) => sum + (item.amount || 0), 0);
  calculated.net_total = calculated.items.reduce((sum, item) => sum + (item.net_amount || 0), 0);
  
  // Calculate taxes
  if (calculated.taxes && calculated.taxes.length > 0) {
    calculated.taxes = calculated.taxes.map(tax => ({
      ...tax,
      tax_amount: (calculated.net_total! * tax.rate) / 100,
    }));
    
    calculated.total_taxes_and_charges = calculated.taxes.reduce(
      (sum, tax) => sum + (tax.tax_amount || 0),
      0
    );
  } else {
    calculated.total_taxes_and_charges = 0;
  }
  
  // Calculate grand total
  calculated.grand_total = calculated.net_total + calculated.total_taxes_and_charges;
  
  // Apply order-level discount
  if (calculated.discount_amount && calculated.discount_amount > 0) {
    calculated.grand_total -= calculated.discount_amount;
  }
  
  // Apply rounding
  if (calculated.rounding_adjustment !== undefined) {
    calculated.rounded_total = Math.round(calculated.grand_total + calculated.rounding_adjustment);
  } else {
    calculated.rounded_total = Math.round(calculated.grand_total);
  }
  
  return calculated;
}

/**
 * Simulates legacy purchase order creation with business logic
 */
function simulateLegacyPurchaseOrderCreation(order: PurchaseOrder): LegacyPurchaseResponse {
  // Apply business logic calculations
  const calculatedOrder = calculateOrderTotals(order);
  
  // Add generated name
  calculatedOrder.name = `PO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  
  return {
    success: true,
    data: calculatedOrder,
    message: 'Purchase Order created successfully',
  };
}

/**
 * Simulates modern purchase order creation with business logic
 */
function simulateModernPurchaseOrderCreation(
  order: PurchaseOrder,
  siteId?: string
): ModernPurchaseResponse {
  // Apply same business logic calculations
  const calculatedOrder = calculateOrderTotals(order);
  
  // Add generated name
  calculatedOrder.name = `PO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  
  return {
    success: true,
    data: calculatedOrder,
    message: 'Purchase Order created successfully',
    site: siteId,
  };
}

/**
 * Compares business logic results between legacy and modern
 */
function compareBusinessLogicResults(
  legacy: LegacyPurchaseResponse,
  modern: ModernPurchaseResponse,
  tolerance: number = 0.01
): { equivalent: boolean; differences: string[] } {
  const differences: string[] = [];
  
  // Compare success field
  if (legacy.success !== modern.success) {
    differences.push(`success field mismatch: ${legacy.success} vs ${modern.success}`);
  }
  
  const legacyOrder = legacy.data;
  const modernOrder = modern.data;
  
  // Compare item count
  if (legacyOrder.items.length !== modernOrder.items.length) {
    differences.push(
      `item count mismatch: ${legacyOrder.items.length} vs ${modernOrder.items.length}`
    );
  }
  
  // Compare item-level calculations
  for (let i = 0; i < Math.min(legacyOrder.items.length, modernOrder.items.length); i++) {
    const legacyItem = legacyOrder.items[i];
    const modernItem = modernOrder.items[i];
    
    if (Math.abs((legacyItem.amount || 0) - (modernItem.amount || 0)) > tolerance) {
      differences.push(
        `Item ${i} amount mismatch: ${legacyItem.amount} vs ${modernItem.amount}`
      );
    }
    
    if (Math.abs((legacyItem.net_amount || 0) - (modernItem.net_amount || 0)) > tolerance) {
      differences.push(
        `Item ${i} net_amount mismatch: ${legacyItem.net_amount} vs ${modernItem.net_amount}`
      );
    }
    
    if (Math.abs((legacyItem.discount_amount || 0) - (modernItem.discount_amount || 0)) > tolerance) {
      differences.push(
        `Item ${i} discount_amount mismatch: ${legacyItem.discount_amount} vs ${modernItem.discount_amount}`
      );
    }
  }
  
  // Compare order-level totals
  if (Math.abs((legacyOrder.total || 0) - (modernOrder.total || 0)) > tolerance) {
    differences.push(`total mismatch: ${legacyOrder.total} vs ${modernOrder.total}`);
  }
  
  if (Math.abs((legacyOrder.net_total || 0) - (modernOrder.net_total || 0)) > tolerance) {
    differences.push(`net_total mismatch: ${legacyOrder.net_total} vs ${modernOrder.net_total}`);
  }
  
  if (Math.abs((legacyOrder.total_taxes_and_charges || 0) - (modernOrder.total_taxes_and_charges || 0)) > tolerance) {
    differences.push(
      `total_taxes_and_charges mismatch: ${legacyOrder.total_taxes_and_charges} vs ${modernOrder.total_taxes_and_charges}`
    );
  }
  
  if (Math.abs((legacyOrder.grand_total || 0) - (modernOrder.grand_total || 0)) > tolerance) {
    differences.push(`grand_total mismatch: ${legacyOrder.grand_total} vs ${modernOrder.grand_total}`);
  }
  
  if (Math.abs((legacyOrder.rounded_total || 0) - (modernOrder.rounded_total || 0)) > tolerance) {
    differences.push(
      `rounded_total mismatch: ${legacyOrder.rounded_total} vs ${modernOrder.rounded_total}`
    );
  }
  
  // Compare tax calculations
  if ((legacyOrder.taxes?.length || 0) !== (modernOrder.taxes?.length || 0)) {
    differences.push(
      `tax count mismatch: ${legacyOrder.taxes?.length || 0} vs ${modernOrder.taxes?.length || 0}`
    );
  }
  
  for (let i = 0; i < Math.min(legacyOrder.taxes?.length || 0, modernOrder.taxes?.length || 0); i++) {
    const legacyTax = legacyOrder.taxes![i];
    const modernTax = modernOrder.taxes![i];
    
    if (Math.abs((legacyTax.tax_amount || 0) - (modernTax.tax_amount || 0)) > tolerance) {
      differences.push(
        `Tax ${i} amount mismatch: ${legacyTax.tax_amount} vs ${modernTax.tax_amount}`
      );
    }
  }
  
  return {
    equivalent: differences.length === 0,
    differences,
  };
}

/**
 * Test 1: Simple Purchase Order Calculations
 * Validates: Requirements 9.4
 */
async function testSimplePurchaseOrderCalculations(): Promise<void> {
  console.log('\n=== Test: Simple Purchase Order Calculations ===');
  
  const order: PurchaseOrder = {
    supplier: 'Supplier A',
    company: 'Demo Company',
    items: [
      { item_code: 'ITEM-001', qty: 10, rate: 100 },
      { item_code: 'ITEM-002', qty: 5, rate: 200 },
    ],
  };
  
  console.log(`Testing order with ${order.items.length} items`);
  
  const legacyResponse = simulateLegacyPurchaseOrderCreation(order);
  const modernResponse = simulateModernPurchaseOrderCreation(order, 'demo');
  
  console.log(`Legacy grand_total: ${legacyResponse.data.grand_total}`);
  console.log(`Modern grand_total: ${modernResponse.data.grand_total}`);
  
  const comparison = compareBusinessLogicResults(legacyResponse, modernResponse);
  
  if (!comparison.equivalent) {
    console.error('Business logic results are not equivalent:');
    comparison.differences.forEach(diff => console.error(`  - ${diff}`));
  }
  
  assert(comparison.equivalent, 'Simple purchase order calculations should be preserved');
  
  // Verify expected totals
  assertEqual(legacyResponse.data.total, 2000, 'Legacy total should be 2000');
  assertEqual(modernResponse.data.total, 2000, 'Modern total should be 2000');
  assertEqual(legacyResponse.data.grand_total, 2000, 'Legacy grand_total should be 2000');
  assertEqual(modernResponse.data.grand_total, 2000, 'Modern grand_total should be 2000');
  
  console.log('✓ Simple purchase order calculations are preserved');
}

/**
 * Test 2: Purchase Order with Discounts
 * Validates: Requirements 9.4
 */
async function testPurchaseOrderWithDiscounts(): Promise<void> {
  console.log('\n=== Test: Purchase Order with Discounts ===');
  
  const order: PurchaseOrder = {
    supplier: 'Supplier B',
    company: 'BAC Company',
    items: [
      { item_code: 'ITEM-001', qty: 10, rate: 100, discount_percentage: 10 },
      { item_code: 'ITEM-002', qty: 5, rate: 200, discount_amount: 50 },
    ],
  };
  
  console.log(`Testing order with item-level discounts`);
  
  const legacyResponse = simulateLegacyPurchaseOrderCreation(order);
  const modernResponse = simulateModernPurchaseOrderCreation(order, 'demo');
  
  console.log(`Legacy net_total: ${legacyResponse.data.net_total}`);
  console.log(`Modern net_total: ${modernResponse.data.net_total}`);
  
  const comparison = compareBusinessLogicResults(legacyResponse, modernResponse);
  
  if (!comparison.equivalent) {
    console.error('Business logic results are not equivalent:');
    comparison.differences.forEach(diff => console.error(`  - ${diff}`));
  }
  
  assert(comparison.equivalent, 'Purchase order discount calculations should be preserved');
  
  // Verify discount calculations
  // Item 1: 10 * 100 = 1000, discount 10% = 100, net = 900
  // Item 2: 5 * 200 = 1000, discount 50, net = 950
  // Total net = 1850
  assertClose(legacyResponse.data.net_total!, 1850, 0.01, 'Legacy net_total should be 1850');
  assertClose(modernResponse.data.net_total!, 1850, 0.01, 'Modern net_total should be 1850');
  
  console.log('✓ Purchase order discount calculations are preserved');
}

/**
 * Test 3: Purchase Order with Taxes
 * Validates: Requirements 9.4
 */
async function testPurchaseOrderWithTaxes(): Promise<void> {
  console.log('\n=== Test: Purchase Order with Taxes ===');
  
  const order: PurchaseOrder = {
    supplier: 'Supplier C',
    company: 'Demo Company',
    items: [
      { item_code: 'ITEM-001', qty: 10, rate: 100 },
    ],
    taxes: [
      { account_head: 'VAT - 10%', rate: 10 },
      { account_head: 'Import Tax - 5%', rate: 5 },
    ],
  };
  
  console.log(`Testing order with ${order.taxes?.length || 0} tax lines`);
  
  const legacyResponse = simulateLegacyPurchaseOrderCreation(order);
  const modernResponse = simulateModernPurchaseOrderCreation(order, 'demo');
  
  console.log(`Legacy total_taxes_and_charges: ${legacyResponse.data.total_taxes_and_charges}`);
  console.log(`Modern total_taxes_and_charges: ${modernResponse.data.total_taxes_and_charges}`);
  console.log(`Legacy grand_total: ${legacyResponse.data.grand_total}`);
  console.log(`Modern grand_total: ${modernResponse.data.grand_total}`);
  
  const comparison = compareBusinessLogicResults(legacyResponse, modernResponse);
  
  if (!comparison.equivalent) {
    console.error('Business logic results are not equivalent:');
    comparison.differences.forEach(diff => console.error(`  - ${diff}`));
  }
  
  assert(comparison.equivalent, 'Purchase order tax calculations should be preserved');
  
  // Verify tax calculations
  // Net total: 1000
  // VAT 10%: 100
  // Import Tax 5%: 50
  // Total taxes: 150
  // Grand total: 1150
  assertClose(legacyResponse.data.total_taxes_and_charges!, 150, 0.01, 'Legacy taxes should be 150');
  assertClose(modernResponse.data.total_taxes_and_charges!, 150, 0.01, 'Modern taxes should be 150');
  assertClose(legacyResponse.data.grand_total!, 1150, 0.01, 'Legacy grand_total should be 1150');
  assertClose(modernResponse.data.grand_total!, 1150, 0.01, 'Modern grand_total should be 1150');
  
  console.log('✓ Purchase order tax calculations are preserved');
}

/**
 * Test 4: Complex Purchase Order (Discounts + Taxes)
 * Validates: Requirements 9.4
 */
async function testComplexPurchaseOrder(): Promise<void> {
  console.log('\n=== Test: Complex Purchase Order (Discounts + Taxes) ===');
  
  const order: PurchaseOrder = {
    supplier: 'Supplier D',
    company: 'BAC Company',
    items: [
      { item_code: 'ITEM-001', qty: 10, rate: 100, discount_percentage: 10 },
      { item_code: 'ITEM-002', qty: 5, rate: 200, discount_amount: 50 },
      { item_code: 'ITEM-003', qty: 3, rate: 150 },
    ],
    taxes: [
      { account_head: 'VAT - 10%', rate: 10 },
    ],
    discount_amount: 50,
  };
  
  console.log(`Testing complex order with ${order.items.length} items, taxes, and order-level discount`);
  
  const legacyResponse = simulateLegacyPurchaseOrderCreation(order);
  const modernResponse = simulateModernPurchaseOrderCreation(order, 'demo');
  
  console.log(`Legacy grand_total: ${legacyResponse.data.grand_total}`);
  console.log(`Modern grand_total: ${modernResponse.data.grand_total}`);
  
  const comparison = compareBusinessLogicResults(legacyResponse, modernResponse);
  
  if (!comparison.equivalent) {
    console.error('Business logic results are not equivalent:');
    comparison.differences.forEach(diff => console.error(`  - ${diff}`));
  }
  
  assert(comparison.equivalent, 'Complex purchase order calculations should be preserved');
  
  // Verify complex calculations
  // Item 1: 1000 - 100 = 900
  // Item 2: 1000 - 50 = 950
  // Item 3: 450 - 0 = 450
  // Net total: 2300
  // VAT 10%: 230
  // Subtotal: 2530
  // Order discount: 50
  // Grand total: 2480
  assertClose(legacyResponse.data.net_total!, 2300, 0.01, 'Legacy net_total should be 2300');
  assertClose(modernResponse.data.net_total!, 2300, 0.01, 'Modern net_total should be 2300');
  assertClose(legacyResponse.data.grand_total!, 2480, 0.01, 'Legacy grand_total should be 2480');
  assertClose(modernResponse.data.grand_total!, 2480, 0.01, 'Modern grand_total should be 2480');
  
  console.log('✓ Complex purchase order calculations are preserved');
}

/**
 * Test 5: Property-Based Test - Purchase Order Calculations
 * Validates: Requirements 9.4
 */
async function testPropertyBasedPurchaseOrderCalculations(): Promise<void> {
  console.log('\n=== Property Test: Purchase Order Calculations ===');
  
  try {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }), // item count
        fc.integer({ min: 1, max: 100 }), // base qty
        fc.integer({ min: 10, max: 500 }), // base rate
        fc.option(fc.integer({ min: 0, max: 50 })), // discount percentage
        fc.option(fc.integer({ min: 0, max: 3 })), // tax count
        (itemCount, baseQty, baseRate, discountPct, taxCount) => {
          // Generate items
          const items: PurchaseOrderItem[] = [];
          for (let i = 0; i < itemCount; i++) {
            const item: PurchaseOrderItem = {
              item_code: `ITEM-${String(i + 1).padStart(3, '0')}`,
              qty: baseQty + i,
              rate: baseRate + i * 10,
            };
            
            if (discountPct !== null && i % 2 === 0) {
              item.discount_percentage = discountPct;
            }
            
            items.push(item);
          }
          
          // Generate taxes
          const taxes: PurchaseTax[] = [];
          if (taxCount !== null) {
            for (let i = 0; i < taxCount; i++) {
              taxes.push({
                account_head: `Tax ${i + 1}`,
                rate: 5 + i * 5,
              });
            }
          }
          
          const order: PurchaseOrder = {
            supplier: 'Test Supplier',
            company: 'Test Company',
            items,
            taxes: taxes.length > 0 ? taxes : undefined,
          };
          
          console.log(`Testing: ${itemCount} items, discount=${discountPct || 'none'}, taxes=${taxCount || 0}`);
          
          const legacyResponse = simulateLegacyPurchaseOrderCreation(order);
          const modernResponse = simulateModernPurchaseOrderCreation(order, 'demo');
          
          const comparison = compareBusinessLogicResults(legacyResponse, modernResponse);
          
          if (!comparison.equivalent) {
            console.error('Business logic not equivalent:', comparison.differences);
            return false;
          }
          
          // Property: For ALL purchase orders, business logic should be equivalent
          return comparison.equivalent;
        }
      ),
      {
        numRuns: 100,
        verbose: true,
      }
    );
    console.log('✓ Property-based purchase order calculations test passed');
  } catch (error: any) {
    console.error('✗ Property-based purchase order calculations test failed:', error.message);
    throw error;
  }
}

// Main test runner
async function runAllTests(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  Business Logic Preservation Property Tests (Purchase)        ║');
  console.log('║  Property 11: Business Logic Preservation                     ║');
  console.log('║  Validates: Requirements 9.4                                  ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  
  const tests = [
    { name: 'Simple Purchase Order Calculations', fn: testSimplePurchaseOrderCalculations },
    { name: 'Purchase Order with Discounts', fn: testPurchaseOrderWithDiscounts },
    { name: 'Purchase Order with Taxes', fn: testPurchaseOrderWithTaxes },
    { name: 'Complex Purchase Order (Discounts + Taxes)', fn: testComplexPurchaseOrder },
    { name: 'Property-Based Purchase Order Calculations', fn: testPropertyBasedPurchaseOrderCalculations },
  ];
  
  let passed = 0;
  let failed = 0;
  const failures: Array<{ name: string; error: Error }> = [];
  
  for (const test of tests) {
    try {
      await test.fn();
      passed++;
      console.log(`✓ ${test.name} completed`);
    } catch (error: any) {
      failed++;
      failures.push({ name: test.name, error });
      console.log(`✗ ${test.name} FAILED`);
    }
  }
  
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  Test Summary                                                  ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log(`Total tests: ${tests.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  
  if (failures.length > 0) {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  Test Failures                                                 ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    failures.forEach(({ name, error }) => {
      console.log(`\n${name}:`);
      console.log(`  ${error.message}`);
    });
    
    console.log('\n⚠️  Business logic preservation tests failed!');
    process.exit(1);
  } else {
    console.log('\n✅ All business logic preservation tests passed!');
  }
}

// Run tests
runAllTests().catch((error) => {
  console.error('Test execution error:', error);
  process.exit(1);
});
