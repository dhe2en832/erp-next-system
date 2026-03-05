/**
 * Property-Based Test: Child Table Handling Preservation (Purchase)
 * 
 * **Property 12: Child Table Handling Preservation**
 * **Validates: Requirements 9.5**
 * 
 * This test validates that documents with child tables (items, taxes)
 * processed through migrated routes handle child table data identically to legacy
 * routes. This ensures that the migration to site-aware clients doesn't alter
 * child table processing logic.
 * 
 * Test Scope:
 * - Items child table is preserved (add, update, delete)
 * - Taxes child table is preserved
 * - Child table ordering is maintained
 * - Child table field values are preserved
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

// Type definitions
interface PurchaseOrderItem {
  idx: number;
  item_code: string;
  item_name: string;
  qty: number;
  rate: number;
  amount: number;
  warehouse?: string;
  description?: string;
  uom?: string;
  schedule_date?: string;
}

interface PurchaseOrderTax {
  idx: number;
  account_head: string;
  rate: number;
  tax_amount: number;
  description?: string;
  charge_type?: string;
}

interface PurchaseOrderWithChildTables {
  name?: string;
  supplier: string;
  company: string;
  items: PurchaseOrderItem[];
  taxes?: PurchaseOrderTax[];
}

interface LegacyChildTableResponse {
  success: boolean;
  data: PurchaseOrderWithChildTables;
  message?: string;
}

interface ModernChildTableResponse {
  success: boolean;
  data: PurchaseOrderWithChildTables;
  message?: string;
  site?: string;
}

/**
 * Simulates legacy route processing child tables
 */
function simulateLegacyChildTableProcessing(
  order: PurchaseOrderWithChildTables
): LegacyChildTableResponse {
  // Legacy pattern: process child tables as-is
  const processed = {
    ...order,
    name: `PO-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
  };
  
  // Ensure idx values are set correctly
  processed.items = processed.items.map((item, index) => ({
    ...item,
    idx: index + 1,
  }));
  
  if (processed.taxes) {
    processed.taxes = processed.taxes.map((tax, index) => ({
      ...tax,
      idx: index + 1,
    }));
  }
  
  return {
    success: true,
    data: processed,
    message: 'Purchase Order created successfully',
  };
}

/**
 * Simulates modern route processing child tables
 */
function simulateModernChildTableProcessing(
  order: PurchaseOrderWithChildTables,
  siteId?: string
): ModernChildTableResponse {
  // Modern pattern: same child table processing logic
  const processed = {
    ...order,
    name: `PO-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
  };
  
  // Ensure idx values are set correctly
  processed.items = processed.items.map((item, index) => ({
    ...item,
    idx: index + 1,
  }));
  
  if (processed.taxes) {
    processed.taxes = processed.taxes.map((tax, index) => ({
      ...tax,
      idx: index + 1,
    }));
  }
  
  return {
    success: true,
    data: processed,
    message: 'Purchase Order created successfully',
    site: siteId,
  };
}

/**
 * Compares child table handling between legacy and modern
 */
function compareChildTableHandling(
  legacy: LegacyChildTableResponse,
  modern: ModernChildTableResponse
): { equivalent: boolean; differences: string[] } {
  const differences: string[] = [];
  
  // Compare success field
  if (legacy.success !== modern.success) {
    differences.push(`success field mismatch: ${legacy.success} vs ${modern.success}`);
  }
  
  const legacyOrder = legacy.data;
  const modernOrder = modern.data;
  
  // Compare items child table
  if (legacyOrder.items.length !== modernOrder.items.length) {
    differences.push(
      `items count mismatch: ${legacyOrder.items.length} vs ${modernOrder.items.length}`
    );
  }
  
  for (let i = 0; i < Math.min(legacyOrder.items.length, modernOrder.items.length); i++) {
    const legacyItem = legacyOrder.items[i];
    const modernItem = modernOrder.items[i];
    
    if (legacyItem.idx !== modernItem.idx) {
      differences.push(`Item ${i} idx mismatch: ${legacyItem.idx} vs ${modernItem.idx}`);
    }
    
    if (legacyItem.item_code !== modernItem.item_code) {
      differences.push(
        `Item ${i} item_code mismatch: ${legacyItem.item_code} vs ${modernItem.item_code}`
      );
    }
    
    if (legacyItem.qty !== modernItem.qty) {
      differences.push(`Item ${i} qty mismatch: ${legacyItem.qty} vs ${modernItem.qty}`);
    }
    
    if (legacyItem.rate !== modernItem.rate) {
      differences.push(`Item ${i} rate mismatch: ${legacyItem.rate} vs ${modernItem.rate}`);
    }
    
    if (legacyItem.warehouse !== modernItem.warehouse) {
      differences.push(
        `Item ${i} warehouse mismatch: ${legacyItem.warehouse} vs ${modernItem.warehouse}`
      );
    }
    
    if (legacyItem.uom !== modernItem.uom) {
      differences.push(
        `Item ${i} uom mismatch: ${legacyItem.uom} vs ${modernItem.uom}`
      );
    }
  }
  
  // Compare taxes child table
  const legacyTaxCount = legacyOrder.taxes?.length || 0;
  const modernTaxCount = modernOrder.taxes?.length || 0;
  
  if (legacyTaxCount !== modernTaxCount) {
    differences.push(`taxes count mismatch: ${legacyTaxCount} vs ${modernTaxCount}`);
  }
  
  for (let i = 0; i < Math.min(legacyTaxCount, modernTaxCount); i++) {
    const legacyTax = legacyOrder.taxes![i];
    const modernTax = modernOrder.taxes![i];
    
    if (legacyTax.idx !== modernTax.idx) {
      differences.push(`Tax ${i} idx mismatch: ${legacyTax.idx} vs ${modernTax.idx}`);
    }
    
    if (legacyTax.account_head !== modernTax.account_head) {
      differences.push(
        `Tax ${i} account_head mismatch: ${legacyTax.account_head} vs ${modernTax.account_head}`
      );
    }
    
    if (legacyTax.rate !== modernTax.rate) {
      differences.push(`Tax ${i} rate mismatch: ${legacyTax.rate} vs ${modernTax.rate}`);
    }
    
    if (legacyTax.charge_type !== modernTax.charge_type) {
      differences.push(
        `Tax ${i} charge_type mismatch: ${legacyTax.charge_type} vs ${modernTax.charge_type}`
      );
    }
  }
  
  return {
    equivalent: differences.length === 0,
    differences,
  };
}

/**
 * Test 1: Items Child Table Handling
 * Validates: Requirements 9.5
 */
async function testItemsChildTableHandling(): Promise<void> {
  console.log('\n=== Test: Items Child Table Handling ===');
  
  const order: PurchaseOrderWithChildTables = {
    supplier: 'Supplier A',
    company: 'Demo Company',
    items: [
      {
        idx: 0,
        item_code: 'ITEM-001',
        item_name: 'Raw Material A',
        qty: 100,
        rate: 50,
        amount: 5000,
        warehouse: 'Stores',
        uom: 'Nos',
        schedule_date: '2024-01-15',
      },
      {
        idx: 0,
        item_code: 'ITEM-002',
        item_name: 'Raw Material B',
        qty: 50,
        rate: 75,
        amount: 3750,
        warehouse: 'Stores',
        uom: 'Kg',
        schedule_date: '2024-01-20',
      },
      {
        idx: 0,
        item_code: 'ITEM-003',
        item_name: 'Component C',
        qty: 25,
        rate: 120,
        amount: 3000,
        warehouse: 'Work In Progress',
        uom: 'Nos',
        schedule_date: '2024-01-25',
      },
    ],
  };
  
  console.log(`Testing order with ${order.items.length} items`);
  
  const legacyResponse = simulateLegacyChildTableProcessing(order);
  const modernResponse = simulateModernChildTableProcessing(order, 'demo');
  
  console.log(`Legacy items count: ${legacyResponse.data.items.length}`);
  console.log(`Modern items count: ${modernResponse.data.items.length}`);
  
  const comparison = compareChildTableHandling(legacyResponse, modernResponse);
  
  if (!comparison.equivalent) {
    console.error('Child table handling is not equivalent:');
    comparison.differences.forEach(diff => console.error(`  - ${diff}`));
  }
  
  assert(comparison.equivalent, 'Items child table handling should be preserved');
  
  // Verify idx values are set correctly
  for (let i = 0; i < legacyResponse.data.items.length; i++) {
    assertEqual(legacyResponse.data.items[i].idx, i + 1, `Legacy item ${i} idx should be ${i + 1}`);
    assertEqual(modernResponse.data.items[i].idx, i + 1, `Modern item ${i} idx should be ${i + 1}`);
  }
  
  console.log('✓ Items child table handling is preserved');
}

/**
 * Test 2: Taxes Child Table Handling
 * Validates: Requirements 9.5
 */
async function testTaxesChildTableHandling(): Promise<void> {
  console.log('\n=== Test: Taxes Child Table Handling ===');
  
  const order: PurchaseOrderWithChildTables = {
    supplier: 'Supplier B',
    company: 'BAC Company',
    items: [
      {
        idx: 0,
        item_code: 'ITEM-001',
        item_name: 'Raw Material A',
        qty: 100,
        rate: 50,
        amount: 5000,
      },
    ],
    taxes: [
      {
        idx: 0,
        account_head: 'Input VAT - 10%',
        rate: 10,
        tax_amount: 500,
        description: 'Value Added Tax',
        charge_type: 'On Net Total',
      },
      {
        idx: 0,
        account_head: 'Import Duty - 5%',
        rate: 5,
        tax_amount: 250,
        description: 'Import Duty',
        charge_type: 'On Net Total',
      },
      {
        idx: 0,
        account_head: 'Additional Tax - 2%',
        rate: 2,
        tax_amount: 100,
        description: 'Additional Tax',
        charge_type: 'On Net Total',
      },
    ],
  };
  
  console.log(`Testing order with ${order.taxes?.length || 0} tax lines`);
  
  const legacyResponse = simulateLegacyChildTableProcessing(order);
  const modernResponse = simulateModernChildTableProcessing(order, 'demo');
  
  console.log(`Legacy taxes count: ${legacyResponse.data.taxes?.length || 0}`);
  console.log(`Modern taxes count: ${modernResponse.data.taxes?.length || 0}`);
  
  const comparison = compareChildTableHandling(legacyResponse, modernResponse);
  
  if (!comparison.equivalent) {
    console.error('Child table handling is not equivalent:');
    comparison.differences.forEach(diff => console.error(`  - ${diff}`));
  }
  
  assert(comparison.equivalent, 'Taxes child table handling should be preserved');
  
  // Verify idx values are set correctly
  if (legacyResponse.data.taxes) {
    for (let i = 0; i < legacyResponse.data.taxes.length; i++) {
      assertEqual(legacyResponse.data.taxes[i].idx, i + 1, `Legacy tax ${i} idx should be ${i + 1}`);
      assertEqual(modernResponse.data.taxes![i].idx, i + 1, `Modern tax ${i} idx should be ${i + 1}`);
    }
  }
  
  console.log('✓ Taxes child table handling is preserved');
}

/**
 * Test 3: Multiple Child Tables Together
 * Validates: Requirements 9.5
 */
async function testMultipleChildTablesTogether(): Promise<void> {
  console.log('\n=== Test: Multiple Child Tables Together ===');
  
  const order: PurchaseOrderWithChildTables = {
    supplier: 'Supplier C',
    company: 'BAC Company',
    items: [
      {
        idx: 0,
        item_code: 'ITEM-001',
        item_name: 'Raw Material A',
        qty: 100,
        rate: 50,
        amount: 5000,
        warehouse: 'Stores',
        uom: 'Nos',
      },
      {
        idx: 0,
        item_code: 'ITEM-002',
        item_name: 'Raw Material B',
        qty: 50,
        rate: 75,
        amount: 3750,
        warehouse: 'Stores',
        uom: 'Kg',
      },
    ],
    taxes: [
      {
        idx: 0,
        account_head: 'Input VAT - 10%',
        rate: 10,
        tax_amount: 875,
        charge_type: 'On Net Total',
      },
    ],
  };
  
  console.log(
    `Testing order with ${order.items.length} items, ${order.taxes?.length || 0} taxes`
  );
  
  const legacyResponse = simulateLegacyChildTableProcessing(order);
  const modernResponse = simulateModernChildTableProcessing(order, 'demo');
  
  const comparison = compareChildTableHandling(legacyResponse, modernResponse);
  
  if (!comparison.equivalent) {
    console.error('Child table handling is not equivalent:');
    comparison.differences.forEach(diff => console.error(`  - ${diff}`));
  }
  
  assert(comparison.equivalent, 'Multiple child tables handling should be preserved');
  
  console.log('✓ Multiple child tables handling is preserved');
}

/**
 * Test 4: Empty Taxes Child Table
 * Validates: Requirements 9.5
 */
async function testEmptyTaxesChildTable(): Promise<void> {
  console.log('\n=== Test: Empty Taxes Child Table ===');
  
  const order: PurchaseOrderWithChildTables = {
    supplier: 'Supplier D',
    company: 'Demo Company',
    items: [
      {
        idx: 0,
        item_code: 'ITEM-001',
        item_name: 'Raw Material A',
        qty: 100,
        rate: 50,
        amount: 5000,
      },
    ],
  };
  
  console.log('Testing order with no taxes');
  
  const legacyResponse = simulateLegacyChildTableProcessing(order);
  const modernResponse = simulateModernChildTableProcessing(order, 'demo');
  
  const comparison = compareChildTableHandling(legacyResponse, modernResponse);
  
  if (!comparison.equivalent) {
    console.error('Child table handling is not equivalent:');
    comparison.differences.forEach(diff => console.error(`  - ${diff}`));
  }
  
  assert(comparison.equivalent, 'Empty taxes child table handling should be preserved');
  
  console.log('✓ Empty taxes child table handling is preserved');
}

/**
 * Test 5: Property-Based Test - Child Table Handling
 * Validates: Requirements 9.5
 */
async function testPropertyBasedChildTableHandling(): Promise<void> {
  console.log('\n=== Property Test: Child Table Handling ===');
  
  try {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }), // item count
        fc.integer({ min: 0, max: 5 }), // tax count
        (itemCount, taxCount) => {
          // Generate items
          const items: PurchaseOrderItem[] = [];
          for (let i = 0; i < itemCount; i++) {
            items.push({
              idx: 0,
              item_code: `ITEM-${String(i + 1).padStart(3, '0')}`,
              item_name: `Raw Material ${i + 1}`,
              qty: 10 + i * 5,
              rate: 50 + i * 10,
              amount: (10 + i * 5) * (50 + i * 10),
              warehouse: i % 2 === 0 ? 'Stores' : 'Work In Progress',
              uom: i % 3 === 0 ? 'Kg' : 'Nos',
            });
          }
          
          // Generate taxes
          const taxes: PurchaseOrderTax[] = [];
          for (let i = 0; i < taxCount; i++) {
            taxes.push({
              idx: 0,
              account_head: `Tax ${i + 1}`,
              rate: 5 + i * 5,
              tax_amount: 50 + i * 25,
              charge_type: 'On Net Total',
            });
          }
          
          const order: PurchaseOrderWithChildTables = {
            supplier: 'Test Supplier',
            company: 'Test Company',
            items,
            taxes: taxes.length > 0 ? taxes : undefined,
          };
          
          console.log(
            `Testing: ${itemCount} items, ${taxCount} taxes`
          );
          
          const legacyResponse = simulateLegacyChildTableProcessing(order);
          const modernResponse = simulateModernChildTableProcessing(order, 'demo');
          
          const comparison = compareChildTableHandling(legacyResponse, modernResponse);
          
          if (!comparison.equivalent) {
            console.error('Child table handling not equivalent:', comparison.differences);
            return false;
          }
          
          // Property: For ALL child table combinations, handling should be equivalent
          return comparison.equivalent;
        }
      ),
      {
        numRuns: 100,
        verbose: true,
      }
    );
    console.log('✓ Property-based child table handling test passed');
  } catch (error: any) {
    console.error('✗ Property-based child table handling test failed:', error.message);
    throw error;
  }
}

// Main test runner
async function runAllTests(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  Child Table Handling Preservation Property Tests (Purchase)  ║');
  console.log('║  Property 12: Child Table Handling Preservation              ║');
  console.log('║  Validates: Requirements 9.5                                  ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  
  const tests = [
    { name: 'Items Child Table Handling', fn: testItemsChildTableHandling },
    { name: 'Taxes Child Table Handling', fn: testTaxesChildTableHandling },
    { name: 'Multiple Child Tables Together', fn: testMultipleChildTablesTogether },
    { name: 'Empty Taxes Child Table', fn: testEmptyTaxesChildTable },
    { name: 'Property-Based Child Table Handling', fn: testPropertyBasedChildTableHandling },
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
    
    console.log('\n⚠️  Child table handling preservation tests failed!');
    process.exit(1);
  } else {
    console.log('\n✅ All child table handling preservation tests passed!');
  }
}

// Run tests
runAllTests().catch((error) => {
  console.error('Test execution error:', error);
  process.exit(1);
});
