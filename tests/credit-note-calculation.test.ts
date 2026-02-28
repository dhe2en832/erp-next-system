/**
 * Unit Tests for Credit Note Calculation Utilities
 * 
 * Tests the calculation functions for credit note amounts and commissions
 * 
 * Requirements: 1.12, 1.13, 5.2, 7.12
 */

import {
  calculateCreditNoteCommission,
  calculateCreditNoteTotal,
  calculateRemainingQty,
  calculateTotalCommissionAdjustment,
  calculateItemAmount
} from '../lib/credit-note-calculation';
import { CreditNoteFormItem } from '../types/credit-note';

// Simple assertion helpers
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual(actual: any, expected: any, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}\nExpected: ${expected}\nActual: ${actual}`);
  }
}

function assertLessThan(actual: number, expected: number, message: string) {
  if (actual >= expected) {
    throw new Error(`${message}\nExpected ${actual} to be less than ${expected}`);
  }
}

// Test functions
async function testCalculateCreditNoteCommission() {
  console.log('\n=== Test: calculateCreditNoteCommission ===');
  
  // Partial return: 5 out of 10 items with 1000 commission
  let result = calculateCreditNoteCommission(1000, 5, 10);
  assertEqual(result, -500, 'Should calculate proportional commission for partial return');
  
  // Full return: all 10 items with 1000 commission
  result = calculateCreditNoteCommission(1000, 10, 10);
  assertEqual(result, -1000, 'Should calculate proportional commission for full return');
  
  // Small partial return: 1 out of 10 items with 1000 commission
  result = calculateCreditNoteCommission(1000, 1, 10);
  assertEqual(result, -100, 'Should calculate proportional commission for small partial return');
  
  // Decimal quantities: 2.5 out of 5 items with 500 commission
  result = calculateCreditNoteCommission(500, 2.5, 5);
  assertEqual(result, -250, 'Should handle decimal quantities');
  
  // Decimal commission: 3 out of 6 items with 1500.50 commission
  result = calculateCreditNoteCommission(1500.50, 3, 6);
  assertEqual(result, -750.25, 'Should handle decimal commission values');
  
  // Edge case: zero original quantity (avoid division by zero)
  result = calculateCreditNoteCommission(1000, 5, 0);
  assertEqual(result, 0, 'Should return 0 when original quantity is 0');
  
  // All results should be negative
  result = calculateCreditNoteCommission(1000, 5, 10);
  assertLessThan(result, 0, 'Should return negative value');
  
  // Floating point precision: 1 out of 3 items with 100 commission
  result = calculateCreditNoteCommission(100, 1, 3);
  assertEqual(result, -33.33, 'Should round to 2 decimal places');
  
  console.log('✓ All calculateCreditNoteCommission tests passed');
}

async function testCalculateCreditNoteTotal() {
  console.log('\n=== Test: calculateCreditNoteTotal ===');
  
  // Single selected item
  // Single selected item
  const singleItem: CreditNoteFormItem[] = [
    {
      item_code: 'ITEM-001',
      item_name: 'Test Item',
      qty: 5,
      rate: 100,
      amount: 500,
      uom: 'Nos',
      warehouse: 'Main',
      sales_invoice_item: 'SI-ITEM-001',
      delivered_qty: 10,
      returned_qty: 0,
      remaining_qty: 10,
      return_reason: 'Damaged',
      custom_komisi_sales: 50,
      selected: true
    }
  ];
  
  let result = calculateCreditNoteTotal(singleItem);
  assertEqual(result, 500, 'Should calculate total for single selected item');
  
  // Multiple selected items
  const multipleItems: CreditNoteFormItem[] = [
    {
      item_code: 'ITEM-001',
      item_name: 'Item 1',
      qty: 5,
      rate: 100,
      amount: 500,
      uom: 'Nos',
      warehouse: 'Main',
      sales_invoice_item: 'SI-ITEM-001',
      delivered_qty: 10,
      returned_qty: 0,
      remaining_qty: 10,
      return_reason: 'Damaged',
      custom_komisi_sales: 50,
      selected: true
    },
    {
      item_code: 'ITEM-002',
      item_name: 'Item 2',
      qty: 3,
      rate: 200,
      amount: 600,
      uom: 'Nos',
      warehouse: 'Main',
      sales_invoice_item: 'SI-ITEM-002',
      delivered_qty: 5,
      returned_qty: 0,
      remaining_qty: 5,
      return_reason: 'Quality Issue',
      custom_komisi_sales: 60,
      selected: true
    }
  ];
  
  result = calculateCreditNoteTotal(multipleItems);
  assertEqual(result, 1100, 'Should calculate total for multiple selected items');
  
  // Exclude unselected items
  const mixedItems: CreditNoteFormItem[] = [
    { ...multipleItems[0], selected: true },
    { ...multipleItems[1], selected: false }
  ];
  
  result = calculateCreditNoteTotal(mixedItems);
  assertEqual(result, 500, 'Should exclude unselected items from total');
  
  // Empty items array
  result = calculateCreditNoteTotal([]);
  assertEqual(result, 0, 'Should return 0 for empty items array');
  
  // No items selected
  const unselectedItems: CreditNoteFormItem[] = [
    { ...singleItem[0], selected: false }
  ];
  
  result = calculateCreditNoteTotal(unselectedItems);
  assertEqual(result, 0, 'Should return 0 when no items are selected');
  
  // Decimal quantities and rates
  const decimalItem: CreditNoteFormItem[] = [
    {
      item_code: 'ITEM-001',
      item_name: 'Item 1',
      qty: 2.5,
      rate: 150.50,
      amount: 376.25,
      uom: 'Nos',
      warehouse: 'Main',
      sales_invoice_item: 'SI-ITEM-001',
      delivered_qty: 10,
      returned_qty: 0,
      remaining_qty: 10,
      return_reason: 'Damaged',
      custom_komisi_sales: 37.63,
      selected: true
    }
  ];
  
  result = calculateCreditNoteTotal(decimalItem);
  assertEqual(result, 376.25, 'Should handle decimal quantities and rates');
  
  // Rounding to 2 decimal places
  const roundingItem: CreditNoteFormItem[] = [
    {
      item_code: 'ITEM-001',
      item_name: 'Item 1',
      qty: 1,
      rate: 10.333,
      amount: 10.333,
      uom: 'Nos',
      warehouse: 'Main',
      sales_invoice_item: 'SI-ITEM-001',
      delivered_qty: 10,
      returned_qty: 0,
      remaining_qty: 10,
      return_reason: 'Damaged',
      custom_komisi_sales: 1.03,
      selected: true
    }
  ];
  
  result = calculateCreditNoteTotal(roundingItem);
  assertEqual(result, 10.33, 'Should round to 2 decimal places');
  
  console.log('✓ All calculateCreditNoteTotal tests passed');
}

async function testCalculateRemainingQty() {
  console.log('\n=== Test: calculateRemainingQty ===');
  
  // Nothing returned yet
  let result = calculateRemainingQty(10, 0);
  assertEqual(result, 10, 'Should calculate remaining quantity when nothing returned');
  
  // Partial return
  result = calculateRemainingQty(10, 3);
  assertEqual(result, 7, 'Should calculate remaining quantity with partial return');
  
  // Fully returned
  result = calculateRemainingQty(10, 10);
  assertEqual(result, 0, 'Should return 0 when fully returned');
  
  // Decimal quantities
  result = calculateRemainingQty(10.5, 3.2);
  assertEqual(result, 7.3, 'Should handle decimal quantities');
  
  // Edge case: returned exceeds original (shouldn't happen but handle gracefully)
  result = calculateRemainingQty(10, 15);
  assertEqual(result, 0, 'Should return 0 when returned exceeds original');
  
  // Zero original quantity
  result = calculateRemainingQty(0, 0);
  assertEqual(result, 0, 'Should handle zero original quantity');
  
  console.log('✓ All calculateRemainingQty tests passed');
}

async function testCalculateTotalCommissionAdjustment() {
  console.log('\n=== Test: calculateTotalCommissionAdjustment ===');
  
  // Single selected item
  const singleItem: CreditNoteFormItem[] = [
    {
      item_code: 'ITEM-001',
      item_name: 'Item 1',
      qty: 5,
      rate: 100,
      amount: 500,
      uom: 'Nos',
      warehouse: 'Main',
      sales_invoice_item: 'SI-ITEM-001',
      delivered_qty: 10,
      returned_qty: 0,
      remaining_qty: 10,
      return_reason: 'Damaged',
      custom_komisi_sales: 1000,
      selected: true
    }
  ];
  
  let result = calculateTotalCommissionAdjustment(singleItem);
  assertEqual(result, -500, 'Should calculate total commission for single selected item');
  
  // Multiple selected items
  const multipleItems: CreditNoteFormItem[] = [
    {
      item_code: 'ITEM-001',
      item_name: 'Item 1',
      qty: 5,
      rate: 100,
      amount: 500,
      uom: 'Nos',
      warehouse: 'Main',
      sales_invoice_item: 'SI-ITEM-001',
      delivered_qty: 10,
      returned_qty: 0,
      remaining_qty: 10,
      return_reason: 'Damaged',
      custom_komisi_sales: 1000,
      selected: true
    },
    {
      item_code: 'ITEM-002',
      item_name: 'Item 2',
      qty: 3,
      rate: 200,
      amount: 600,
      uom: 'Nos',
      warehouse: 'Main',
      sales_invoice_item: 'SI-ITEM-002',
      delivered_qty: 6,
      returned_qty: 0,
      remaining_qty: 6,
      return_reason: 'Quality Issue',
      custom_komisi_sales: 600,
      selected: true
    }
  ];
  
  result = calculateTotalCommissionAdjustment(multipleItems);
  assertEqual(result, -800, 'Should calculate total commission for multiple selected items');
  
  // Exclude unselected items
  const mixedItems: CreditNoteFormItem[] = [
    { ...multipleItems[0], selected: true },
    { ...multipleItems[1], selected: false }
  ];
  
  result = calculateTotalCommissionAdjustment(mixedItems);
  assertEqual(result, -500, 'Should exclude unselected items');
  
  // Empty items array
  result = calculateTotalCommissionAdjustment([]);
  assertEqual(result, 0, 'Should return 0 for empty items array');
  
  // Result should be negative
  result = calculateTotalCommissionAdjustment(singleItem);
  assertLessThan(result, 0, 'Should return negative value');
  
  console.log('✓ All calculateTotalCommissionAdjustment tests passed');
}

async function testCalculateItemAmount() {
  console.log('\n=== Test: calculateItemAmount ===');
  
  // Basic calculation
  let result = calculateItemAmount(5, 100);
  assertEqual(result, 500, 'Should calculate amount from quantity and rate');
  
  // Decimal quantities
  result = calculateItemAmount(2.5, 200);
  assertEqual(result, 500, 'Should handle decimal quantities');
  
  // Decimal rates
  result = calculateItemAmount(3, 150.50);
  assertEqual(result, 451.5, 'Should handle decimal rates');
  
  // Zero quantity
  result = calculateItemAmount(0, 100);
  assertEqual(result, 0, 'Should return 0 for zero quantity');
  
  // Zero rate
  result = calculateItemAmount(5, 0);
  assertEqual(result, 0, 'Should return 0 for zero rate');
  
  // Rounding to 2 decimal places
  result = calculateItemAmount(1, 10.333);
  assertEqual(result, 10.33, 'Should round to 2 decimal places');
  
  console.log('✓ All calculateItemAmount tests passed');
}

// Main test runner
async function runTests() {
  console.log('Starting Credit Note Calculation Tests...\n');
  
  try {
    await testCalculateCreditNoteCommission();
    await testCalculateCreditNoteTotal();
    await testCalculateRemainingQty();
    await testCalculateTotalCommissionAdjustment();
    await testCalculateItemAmount();
    
    console.log('\n✅ All tests passed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
runTests();
