/**
 * Unit tests for Credit Note validation utilities
 * 
 * Tests validation functions for Credit Note form data
 * 
 * Requirements: 5.1, 5.2, 5.3, 11.1, 11.2, 11.3, 11.5
 */

import {
  validateReturnQuantity,
  validateReturnReason,
  validateRequiredFields,
  validateDateFormat,
  convertDateToAPIFormat,
  convertDateToDisplayFormat,
} from '../lib/credit-note-validation';
import { CreditNoteFormData } from '../types/credit-note';

// Simple assertion helper
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

function assertContains(str: string | undefined, substring: string, message: string) {
  if (!str || !str.includes(substring)) {
    throw new Error(`${message}\nExpected "${str}" to contain "${substring}"`);
  }
}


// Test functions
async function testValidateReturnQuantity() {
  console.log('\n=== Test: validateReturnQuantity ===');
  
  // Valid: positive quantity within remaining
  let result = validateReturnQuantity(5, 10);
  assert(result.valid === true, 'Should be valid for positive quantity within remaining');
  
  // Invalid: zero quantity
  result = validateReturnQuantity(0, 10);
  assert(result.valid === false, 'Should be invalid for zero quantity');
  assertEqual(result.message, 'Jumlah retur harus lebih besar dari 0', 'Zero quantity error message');
  
  // Invalid: negative quantity
  result = validateReturnQuantity(-5, 10);
  assert(result.valid === false, 'Should be invalid for negative quantity');
  
  // Invalid: quantity exceeding remaining
  result = validateReturnQuantity(15, 10);
  assert(result.valid === false, 'Should be invalid for quantity exceeding remaining');
  assertContains(result.message, 'melebihi jumlah yang dapat diretur', 'Exceeding quantity error message');
  
  // Valid: quantity equal to remaining
  result = validateReturnQuantity(10, 10);
  assert(result.valid === true, 'Should be valid for quantity equal to remaining');
  
  // Valid: decimal quantities
  result = validateReturnQuantity(5.5, 10.5);
  assert(result.valid === true, 'Should handle decimal quantities');
  
  // Invalid: decimal quantity exceeding remaining
  result = validateReturnQuantity(10.6, 10.5);
  assert(result.valid === false, 'Should be invalid for decimal quantity exceeding remaining');
  
  console.log('✓ All validateReturnQuantity tests passed');
}

async function testValidateReturnReason() {
  console.log('\n=== Test: validateReturnReason ===');
  
  // Valid: valid reason without notes
  let result = validateReturnReason('Damaged', '');
  assert(result.valid === true, 'Should be valid for valid reason without notes');
  
  // Valid: "Other" reason with notes
  result = validateReturnReason('Other', 'Customer changed mind');
  assert(result.valid === true, 'Should be valid for "Other" reason with notes');
  
  // Invalid: empty reason
  result = validateReturnReason('', '');
  assert(result.valid === false, 'Should be invalid for empty reason');
  assertEqual(result.message, 'Alasan retur harus dipilih', 'Empty reason error message');
  
  // Invalid: "Other" reason without notes
  result = validateReturnReason('Other', '');
  assert(result.valid === false, 'Should be invalid for "Other" reason without notes');
  assertContains(result.message, 'Catatan tambahan wajib diisi', 'Other without notes error message');
  
  // Invalid: "Other" reason with whitespace-only notes
  result = validateReturnReason('Other', '   ');
  assert(result.valid === false, 'Should be invalid for "Other" reason with whitespace-only notes');
  
  // Valid: all valid return reasons
  const validReasons = ['Damaged', 'Quality Issue', 'Wrong Item', 'Customer Request', 'Expired'];
  validReasons.forEach(reason => {
    result = validateReturnReason(reason, '');
    assert(result.valid === true, `Should be valid for reason: ${reason}`);
  });
  
  console.log('✓ All validateReturnReason tests passed');
}

async function testValidateRequiredFields() {
  console.log('\n=== Test: validateRequiredFields ===');
  
  const validFormData: CreditNoteFormData = {
    customer: 'CUST-001',
    customer_name: 'Test Customer',
    posting_date: '31/12/2024',
    sales_invoice: 'SINV-001',
    items: [
      {
        item_code: 'ITEM-001',
        item_name: 'Test Item',
        qty: 5,
        rate: 100,
        amount: 500,
        uom: 'Nos',
        warehouse: 'Main - TC',
        sales_invoice_item: 'SINV-001-ITEM-001',
        delivered_qty: 10,
        returned_qty: 0,
        remaining_qty: 10,
        return_reason: 'Damaged',
        return_notes: '',
        custom_komisi_sales: 50,
        selected: true,
      },
    ],
  };
  
  // Valid: complete form data
  let result = validateRequiredFields(validFormData);
  assert(result.valid === true, 'Should be valid for complete form data');
  
  // Invalid: missing customer
  result = validateRequiredFields({ ...validFormData, customer: '' });
  assert(result.valid === false, 'Should be invalid for missing customer');
  assertContains(result.message, 'Customer harus dipilih', 'Missing customer error message');
  
  // Invalid: missing posting date
  result = validateRequiredFields({ ...validFormData, posting_date: '' });
  assert(result.valid === false, 'Should be invalid for missing posting date');
  assertContains(result.message, 'Tanggal posting harus diisi', 'Missing posting date error message');
  
  // Invalid: missing sales invoice
  result = validateRequiredFields({ ...validFormData, sales_invoice: '' });
  assert(result.valid === false, 'Should be invalid for missing sales invoice');
  assertContains(result.message, 'Sales Invoice harus dipilih', 'Missing sales invoice error message');
  
  // Invalid: empty items array
  result = validateRequiredFields({ ...validFormData, items: [] });
  assert(result.valid === false, 'Should be invalid for empty items array');
  assertContains(result.message, 'Minimal satu item harus dipilih', 'Empty items error message');
  
  // Invalid: no items selected
  result = validateRequiredFields({
    ...validFormData,
    items: [{ ...validFormData.items[0], selected: false }],
  });
  assert(result.valid === false, 'Should be invalid when no items are selected');
  
  // Invalid: selected item has zero quantity
  result = validateRequiredFields({
    ...validFormData,
    items: [{ ...validFormData.items[0], qty: 0 }],
  });
  assert(result.valid === false, 'Should be invalid when selected item has zero quantity');
  
  // Invalid: selected item quantity exceeds remaining
  result = validateRequiredFields({
    ...validFormData,
    items: [{ ...validFormData.items[0], qty: 15, remaining_qty: 10 }],
  });
  assert(result.valid === false, 'Should be invalid when selected item quantity exceeds remaining');
  assertContains(result.message, 'melebihi jumlah yang dapat diretur', 'Exceeding quantity error message');
  
  console.log('✓ All validateRequiredFields tests passed');
}

async function testValidateDateFormat() {
  console.log('\n=== Test: validateDateFormat ===');
  
  // Valid: correct DD/MM/YYYY format
  let result = validateDateFormat('31/12/2024');
  assert(result.valid === true, 'Should be valid for correct DD/MM/YYYY format');
  
  // Invalid: empty date
  result = validateDateFormat('');
  assert(result.valid === false, 'Should be invalid for empty date');
  assertEqual(result.message, 'Tanggal tidak boleh kosong', 'Empty date error message');
  
  // Invalid: YYYY-MM-DD format
  result = validateDateFormat('2024-12-31');
  assert(result.valid === false, 'Should be invalid for YYYY-MM-DD format');
  assertEqual(result.message, 'Format tanggal harus DD/MM/YYYY', 'Wrong format error message');
  
  // Invalid: invalid month
  result = validateDateFormat('31/13/2024');
  assert(result.valid === false, 'Should be invalid for invalid month');
  assertContains(result.message, 'Bulan harus antara 01-12', 'Invalid month error message');
  
  // Invalid: invalid day
  result = validateDateFormat('32/12/2024');
  assert(result.valid === false, 'Should be invalid for invalid day');
  assertContains(result.message, 'Hari harus antara 01-31', 'Invalid day error message');
  
  // Invalid: invalid date (e.g., Feb 30)
  result = validateDateFormat('30/02/2024');
  assert(result.valid === false, 'Should be invalid for invalid date (Feb 30)');
  assertEqual(result.message, 'Tanggal tidak valid', 'Invalid date error message');
  
  // Valid: leap year date
  result = validateDateFormat('29/02/2024');
  assert(result.valid === true, 'Should be valid for leap year date');
  
  // Invalid: non-leap year Feb 29
  result = validateDateFormat('29/02/2023');
  assert(result.valid === false, 'Should be invalid for non-leap year Feb 29');
  
  // Invalid: single digit day/month without leading zero
  result = validateDateFormat('1/1/2024');
  assert(result.valid === false, 'Should be invalid for single digit without leading zero');
  
  // Valid: date with leading zeros
  result = validateDateFormat('01/01/2024');
  assert(result.valid === true, 'Should be valid for date with leading zeros');
  
  console.log('✓ All validateDateFormat tests passed');
}

async function testDateConversion() {
  console.log('\n=== Test: Date Conversion ===');
  
  // Convert DD/MM/YYYY to YYYY-MM-DD
  let result = convertDateToAPIFormat('31/12/2024');
  assertEqual(result, '2024-12-31', 'Should convert DD/MM/YYYY to YYYY-MM-DD');
  
  result = convertDateToAPIFormat('01/01/2024');
  assertEqual(result, '2024-01-01', 'Should handle dates with leading zeros');
  
  // Convert YYYY-MM-DD to DD/MM/YYYY
  result = convertDateToDisplayFormat('2024-12-31');
  assertEqual(result, '31/12/2024', 'Should convert YYYY-MM-DD to DD/MM/YYYY');
  
  result = convertDateToDisplayFormat('2024-01-01');
  assertEqual(result, '01/01/2024', 'Should handle dates with leading zeros');
  
  // Round trip conversion
  const original = '31/12/2024';
  const apiFormat = convertDateToAPIFormat(original);
  const backToDisplay = convertDateToDisplayFormat(apiFormat);
  assertEqual(backToDisplay, original, 'Should maintain date integrity through conversion cycle');
  
  // Multiple dates round trip
  const dates = ['01/01/2024', '15/06/2024', '31/12/2024'];
  dates.forEach(date => {
    const api = convertDateToAPIFormat(date);
    const display = convertDateToDisplayFormat(api);
    assertEqual(display, date, `Should maintain integrity for date: ${date}`);
  });
  
  console.log('✓ All date conversion tests passed');
}

// Main test runner
async function runTests() {
  console.log('Starting Credit Note Validation Tests...\n');
  
  try {
    await testValidateReturnQuantity();
    await testValidateReturnReason();
    await testValidateRequiredFields();
    await testValidateDateFormat();
    await testDateConversion();
    
    console.log('\n✅ All tests passed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
runTests();
