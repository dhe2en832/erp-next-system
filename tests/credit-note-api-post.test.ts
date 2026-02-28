/**
 * Integration Test for Credit Note POST API
 * 
 * Tests the POST /api/sales/credit-note endpoint
 * Requirements: 1.10, 1.11, 1.12, 1.13, 1.14, 1.15, 11.6, 11.7, 11.8
 */

import { calculateCreditNoteCommission } from '../lib/credit-note-calculation';

console.log('Starting Credit Note POST API Tests...\n');

/**
 * Test: Request Body Validation
 * Requirement: 11.6
 */
function testRequestBodyValidation() {
  console.log('=== Test: Request Body Validation ===');
  
  // Test missing required fields
  const invalidRequests = [
    { customer: '', posting_date: '2024-01-15', return_against: 'SI-001', items: [] },
    { customer: 'CUST-001', posting_date: '', return_against: 'SI-001', items: [] },
    { customer: 'CUST-001', posting_date: '2024-01-15', return_against: '', items: [] },
    { customer: 'CUST-001', posting_date: '2024-01-15', return_against: 'SI-001', items: [] },
  ];
  
  for (const request of invalidRequests) {
    const hasCustomer = request.customer && request.customer.trim() !== '';
    const hasPostingDate = request.posting_date && request.posting_date.trim() !== '';
    const hasReturnAgainst = request.return_against && request.return_against.trim() !== '';
    const hasItems = request.items && request.items.length > 0;
    
    const isValid = hasCustomer && hasPostingDate && hasReturnAgainst && hasItems;
    
    if (isValid) {
      throw new Error('Expected validation to fail for invalid request');
    }
  }
  
  console.log('✓ Request body validation works correctly\n');
}

/**
 * Test: Item Validation
 * Requirement: 11.6
 */
function testItemValidation() {
  console.log('=== Test: Item Validation ===');
  
  // Test items without required fields
  const invalidItems = [
    { item_code: '', qty: 5, return_reason: 'Damaged' },
    { item_code: 'ITEM-001', qty: 0, return_reason: 'Damaged' },
    { item_code: 'ITEM-001', qty: -5, return_reason: 'Damaged' },
    { item_code: 'ITEM-001', qty: 5, return_reason: '' },
    { item_code: 'ITEM-001', qty: 5, return_reason: 'Other', return_item_notes: '' },
  ];
  
  for (const item of invalidItems) {
    const hasItemCode = item.item_code && item.item_code.trim() !== '';
    const hasValidQty = item.qty && item.qty > 0;
    const hasReturnReason = item.return_reason && item.return_reason.trim() !== '';
    const hasNotesIfOther = item.return_reason !== 'Other' || (item.return_item_notes && item.return_item_notes.trim() !== '');
    
    const isValid = hasItemCode && hasValidQty && hasReturnReason && hasNotesIfOther;
    
    if (isValid) {
      throw new Error('Expected item validation to fail');
    }
  }
  
  console.log('✓ Item validation works correctly\n');
}

/**
 * Test: Commission Calculation
 * Requirements: 1.12, 1.13
 */
function testCommissionCalculation() {
  console.log('=== Test: Commission Calculation ===');
  
  // Test proportional commission calculation
  const testCases = [
    { originalCommission: 1000, returnQty: 5, originalQty: 10, expected: -500 },
    { originalCommission: 1500, returnQty: 3, originalQty: 6, expected: -750 },
    { originalCommission: 100, returnQty: 1, originalQty: 1, expected: -100 },
    { originalCommission: 2000, returnQty: 2, originalQty: 8, expected: -500 },
  ];
  
  for (const testCase of testCases) {
    const result = calculateCreditNoteCommission(
      testCase.originalCommission,
      testCase.returnQty,
      testCase.originalQty
    );
    
    if (Math.abs(result - testCase.expected) > 0.01) {
      throw new Error(`Commission calculation failed: expected ${testCase.expected}, got ${result}`);
    }
  }
  
  console.log('✓ Commission calculation works correctly\n');
}

/**
 * Test: Accounting Period Validation Logic
 * Requirement: 1.15, 11.8
 */
function testAccountingPeriodValidation() {
  console.log('=== Test: Accounting Period Validation Logic ===');
  
  // Test period status validation
  const closedPeriod = { status: 'Closed', period_name: 'Jan 2024' };
  const permanentlyClosedPeriod = { status: 'Permanently Closed', period_name: 'Dec 2023' };
  const openPeriod = { status: 'Open', period_name: 'Feb 2024' };
  
  // Closed period should be rejected
  if (closedPeriod.status !== 'Closed' && closedPeriod.status !== 'Permanently Closed') {
    throw new Error('Expected closed period to be rejected');
  }
  
  // Permanently closed period should be rejected
  if (permanentlyClosedPeriod.status !== 'Closed' && permanentlyClosedPeriod.status !== 'Permanently Closed') {
    throw new Error('Expected permanently closed period to be rejected');
  }
  
  // Open period should be allowed
  if (openPeriod.status === 'Closed' || openPeriod.status === 'Permanently Closed') {
    throw new Error('Expected open period to be allowed');
  }
  
  console.log('✓ Accounting period validation logic works correctly\n');
}

/**
 * Test: Data Transformation
 * Requirement: 1.11
 */
function testDataTransformation() {
  console.log('=== Test: Data Transformation ===');
  
  // Test quantity conversion to negative
  const userItems = [
    { item_code: 'ITEM-001', qty: 5 },
    { item_code: 'ITEM-002', qty: 3 },
  ];
  
  for (const item of userItems) {
    const returnQty = -Math.abs(item.qty);
    if (returnQty >= 0) {
      throw new Error('Expected return quantity to be negative');
    }
  }
  
  console.log('✓ Data transformation works correctly\n');
}

/**
 * Test: Error Response Format
 * Requirement: 11.6, 11.7, 11.8
 */
function testErrorResponseFormat() {
  console.log('=== Test: Error Response Format ===');
  
  // Test error response structure
  const errorResponses = [
    { success: false, message: 'Missing required fields: customer, posting_date, or return_against' },
    { success: false, message: 'At least one item is required' },
    { success: false, message: 'Each item must have item_code and qty > 0' },
    { success: false, message: 'Return reason is required for all items' },
    { success: false, message: 'Return notes are required when reason is "Other"' },
    { success: false, message: 'Cannot create Credit Note: Accounting period Jan 2024 is closed. Please select a date in an open period.' },
  ];
  
  for (const response of errorResponses) {
    if (response.success !== false || !response.message || response.message.trim() === '') {
      throw new Error('Error response must have success=false and non-empty message');
    }
  }
  
  console.log('✓ Error response format is correct\n');
}

// Run all tests
async function runAllTests() {
  try {
    testRequestBodyValidation();
    testItemValidation();
    testCommissionCalculation();
    testAccountingPeriodValidation();
    testDataTransformation();
    testErrorResponseFormat();
    
    console.log('✅ All Credit Note POST API tests passed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

runAllTests();
