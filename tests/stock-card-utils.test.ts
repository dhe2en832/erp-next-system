/**
 * Unit tests for Stock Card utility functions
 * 
 * Tests Requirements: 1.2, 1.3, 1.4, 12.2
 * Task: 3. Create utility functions
 */

import {
  calculateRunningBalance,
  formatStockCardDate,
  classifyTransactionDirection,
  getPartyInfo,
  validateDateRange
} from '../lib/stock-card-utils';
import { StockLedgerEntry } from '../types/stock-card';

/**
 * Simple assertion helper
 */
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

/**
 * Test: Calculate running balance for a sequence of transactions
 * Requirement: 1.3
 */
async function testCalculateRunningBalance(): Promise<void> {
  console.log('Testing calculateRunningBalance...');
  
  const transactions: StockLedgerEntry[] = [
    {
      name: 'SLE-001',
      actual_qty: 10,
      posting_date: '2024-01-01',
      posting_time: '10:00:00',
      item_code: 'ITEM-001',
      warehouse: 'Main Store',
      qty_after_transaction: 10,
      voucher_type: 'Purchase Receipt',
      voucher_no: 'PR-001',
      stock_uom: 'Nos',
      valuation_rate: 100,
      stock_value_difference: 1000,
      company: 'Test Company'
    },
    {
      name: 'SLE-002',
      actual_qty: -5,
      posting_date: '2024-01-02',
      posting_time: '11:00:00',
      item_code: 'ITEM-001',
      warehouse: 'Main Store',
      qty_after_transaction: 5,
      voucher_type: 'Sales Invoice',
      voucher_no: 'SI-001',
      stock_uom: 'Nos',
      valuation_rate: 100,
      stock_value_difference: -500,
      company: 'Test Company'
    },
    {
      name: 'SLE-003',
      actual_qty: 3,
      posting_date: '2024-01-03',
      posting_time: '12:00:00',
      item_code: 'ITEM-001',
      warehouse: 'Main Store',
      qty_after_transaction: 8,
      voucher_type: 'Purchase Receipt',
      voucher_no: 'PR-002',
      stock_uom: 'Nos',
      valuation_rate: 100,
      stock_value_difference: 300,
      company: 'Test Company'
    }
  ];

  const balance1 = calculateRunningBalance(transactions, transactions[0]);
  assert(balance1 === 10, `Expected balance 10, got ${balance1}`);
  
  const balance2 = calculateRunningBalance(transactions, transactions[1]);
  assert(balance2 === 5, `Expected balance 5, got ${balance2}`);
  
  const balance3 = calculateRunningBalance(transactions, transactions[2]);
  assert(balance3 === 8, `Expected balance 8, got ${balance3}`);
  
  console.log('✓ Running balance calculation works correctly');
}

/**
 * Test: Calculate running balance with single transaction
 * Requirement: 1.3
 */
async function testCalculateRunningBalanceSingle(): Promise<void> {
  console.log('Testing calculateRunningBalance with single transaction...');
  
  const transactions: StockLedgerEntry[] = [
    {
      name: 'SLE-001',
      actual_qty: 10,
      posting_date: '2024-01-01',
      posting_time: '10:00:00',
      item_code: 'ITEM-001',
      warehouse: 'Main Store',
      qty_after_transaction: 10,
      voucher_type: 'Purchase Receipt',
      voucher_no: 'PR-001',
      stock_uom: 'Nos',
      valuation_rate: 100,
      stock_value_difference: 1000,
      company: 'Test Company'
    }
  ];

  const balance = calculateRunningBalance(transactions, transactions[0]);
  assert(balance === 10, `Expected balance 10, got ${balance}`);
  
  console.log('✓ Single transaction balance calculation works correctly');
}

/**
 * Test: Format date and time correctly
 * Requirement: 1.4
 */
async function testFormatStockCardDate(): Promise<void> {
  console.log('Testing formatStockCardDate...');
  
  const result1 = formatStockCardDate('2024-01-15', '14:30:00');
  assert(result1.includes('15'), `Expected date to contain '15', got ${result1}`);
  assert(result1.includes('Jan'), `Expected date to contain 'Jan', got ${result1}`);
  assert(result1.includes('2024'), `Expected date to contain '2024', got ${result1}`);
  assert(result1.includes('14:30'), `Expected time '14:30', got ${result1}`);
  
  const result2 = formatStockCardDate('2024-01-15');
  assert(result2.includes('15'), `Expected date to contain '15', got ${result2}`);
  assert(!result2.includes(':'), `Expected no time separator, got ${result2}`);
  
  const result3 = formatStockCardDate('invalid-date');
  assert(result3 === '-', `Expected '-' for invalid date, got ${result3}`);
  
  const result4 = formatStockCardDate('');
  assert(result4 === '-', `Expected '-' for empty date, got ${result4}`);
  
  console.log('✓ Date formatting works correctly');
}

/**
 * Test: Classify transaction direction
 * Requirement: 1.4
 */
async function testClassifyTransactionDirection(): Promise<void> {
  console.log('Testing classifyTransactionDirection...');
  
  assert(classifyTransactionDirection(10) === 'in', 'Positive quantity should be "in"');
  assert(classifyTransactionDirection(1) === 'in', 'Positive quantity should be "in"');
  assert(classifyTransactionDirection(-10) === 'out', 'Negative quantity should be "out"');
  assert(classifyTransactionDirection(-1) === 'out', 'Negative quantity should be "out"');
  assert(classifyTransactionDirection(0) === 'in', 'Zero quantity should be "in"');
  
  console.log('✓ Transaction direction classification works correctly');
}

/**
 * Test: Get party information from entry
 * Requirement: 1.2
 */
async function testGetPartyInfo(): Promise<void> {
  console.log('Testing getPartyInfo...');
  
  // Test enriched party information
  const entry1: StockLedgerEntry = {
    name: 'SLE-001',
    posting_date: '2024-01-01',
    posting_time: '10:00:00',
    item_code: 'ITEM-001',
    warehouse: 'Main Store',
    actual_qty: 10,
    qty_after_transaction: 10,
    voucher_type: 'Sales Invoice',
    voucher_no: 'SI-001',
    stock_uom: 'Nos',
    valuation_rate: 100,
    stock_value_difference: 1000,
    company: 'Test Company',
    party_type: 'Customer',
    party_name: 'ABC Corp'
  };
  
  const result1 = getPartyInfo(entry1);
  assert(result1.party_type === 'Customer', `Expected 'Customer', got ${result1.party_type}`);
  assert(result1.party_name === 'ABC Corp', `Expected 'ABC Corp', got ${result1.party_name}`);
  
  // Test Sales Invoice without enriched data
  const entry2: StockLedgerEntry = {
    name: 'SLE-002',
    posting_date: '2024-01-01',
    posting_time: '10:00:00',
    item_code: 'ITEM-001',
    warehouse: 'Main Store',
    actual_qty: -10,
    qty_after_transaction: 0,
    voucher_type: 'Sales Invoice',
    voucher_no: 'SI-001',
    stock_uom: 'Nos',
    valuation_rate: 100,
    stock_value_difference: -1000,
    company: 'Test Company'
  };
  
  const result2 = getPartyInfo(entry2);
  assert(result2.party_type === 'Customer', `Expected 'Customer', got ${result2.party_type}`);
  
  // Test Purchase Receipt
  const entry3: StockLedgerEntry = {
    name: 'SLE-003',
    posting_date: '2024-01-01',
    posting_time: '10:00:00',
    item_code: 'ITEM-001',
    warehouse: 'Main Store',
    actual_qty: 10,
    qty_after_transaction: 10,
    voucher_type: 'Purchase Receipt',
    voucher_no: 'PR-001',
    stock_uom: 'Nos',
    valuation_rate: 100,
    stock_value_difference: 1000,
    company: 'Test Company'
  };
  
  const result3 = getPartyInfo(entry3);
  assert(result3.party_type === 'Supplier', `Expected 'Supplier', got ${result3.party_type}`);
  
  // Test Stock Entry (no party)
  const entry4: StockLedgerEntry = {
    name: 'SLE-004',
    posting_date: '2024-01-01',
    posting_time: '10:00:00',
    item_code: 'ITEM-001',
    warehouse: 'Main Store',
    actual_qty: 10,
    qty_after_transaction: 10,
    voucher_type: 'Stock Entry',
    voucher_no: 'STE-001',
    stock_uom: 'Nos',
    valuation_rate: 100,
    stock_value_difference: 1000,
    company: 'Test Company'
  };
  
  const result4 = getPartyInfo(entry4);
  assert(result4.party_type === null, `Expected null, got ${result4.party_type}`);
  assert(result4.party_name === null, `Expected null, got ${result4.party_name}`);
  
  console.log('✓ Party information extraction works correctly');
}

/**
 * Test: Validate date range
 * Requirement: 12.2
 */
async function testValidateDateRange(): Promise<void> {
  console.log('Testing validateDateRange...');
  
  // Valid date range
  const result1 = validateDateRange('01/01/2024', '31/01/2024');
  assert(result1.isValid === true, 'Valid date range should pass');
  assert(result1.message === '', `Expected empty message, got ${result1.message}`);
  
  // Same start and end date
  const result2 = validateDateRange('15/01/2024', '15/01/2024');
  assert(result2.isValid === true, 'Same dates should be valid');
  
  // End date before start date
  const result3 = validateDateRange('31/01/2024', '01/01/2024');
  assert(result3.isValid === false, 'End date before start date should fail');
  assert(result3.message === 'Tanggal akhir harus setelah tanggal awal', 
    `Expected Indonesian error message, got ${result3.message}`);
  
  // Empty dates
  const result4 = validateDateRange('', '');
  assert(result4.isValid === false, 'Empty dates should fail');
  assert(result4.message === 'Tanggal awal dan tanggal akhir wajib diisi',
    `Expected Indonesian error message, got ${result4.message}`);
  
  // Invalid format
  const result5 = validateDateRange('2024-01-01', '2024-01-31');
  assert(result5.isValid === false, 'Wrong format should fail');
  assert(result5.message.includes('Format tanggal tidak valid'),
    `Expected format error message, got ${result5.message}`);
  
  // Invalid date values
  const result6 = validateDateRange('32/01/2024', '31/01/2024');
  assert(result6.isValid === false, 'Invalid date should fail');
  assert(result6.message === 'Tanggal tidak valid',
    `Expected invalid date message, got ${result6.message}`);
  
  // Leap year
  const result7 = validateDateRange('29/02/2024', '01/03/2024');
  assert(result7.isValid === true, 'Leap year date should be valid');
  
  console.log('✓ Date range validation works correctly');
}

/**
 * Main test runner
 */
async function runTests(): Promise<void> {
  console.log('\n=== Stock Card Utilities Tests ===\n');
  
  try {
    await testCalculateRunningBalance();
    await testCalculateRunningBalanceSingle();
    await testFormatStockCardDate();
    await testClassifyTransactionDirection();
    await testGetPartyInfo();
    await testValidateDateRange();
    
    console.log('\n✅ All tests passed!\n');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
runTests();
