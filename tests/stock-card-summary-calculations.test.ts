/**
 * Unit tests for Stock Card Report Summary Calculations
 * 
 * Tests the summary calculation functionality including:
 * - Opening balance calculation
 * - Total incoming quantity calculation
 * - Total outgoing quantity calculation
 * - Closing balance calculation
 * - Transaction count
 * 
 * Requirements: 1.5, 1.6
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
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const TEST_COMPANY = 'BAC';

interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
}

const testResults: TestResult[] = [];

// Helper function to run a test
async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
  try {
    await testFn();
    testResults.push({ name, passed: true });
    console.log(`✓ ${name}`);
  } catch (error) {
    testResults.push({ 
      name, 
      passed: false, 
      message: error instanceof Error ? error.message : String(error)
    });
    console.error(`✗ ${name}`);
    console.error(`  Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Helper function to assert
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function testSummaryDataStructure(): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/inventory/reports/stock-card?` +
    `company=${encodeURIComponent(TEST_COMPANY)}` +
    `&item_code=TEST-ITEM-001`
  );
  
  const data = await response.json();
  
  assert(data.success === true, 'Response should be successful');
  assert(data.summary !== undefined, 'Summary should be defined');
  assert('opening_balance' in data.summary, 'Summary should have opening_balance');
  assert('closing_balance' in data.summary, 'Summary should have closing_balance');
  assert('total_in' in data.summary, 'Summary should have total_in');
  assert('total_out' in data.summary, 'Summary should have total_out');
  assert('transaction_count' in data.summary, 'Summary should have transaction_count');
  assert('item_code' in data.summary, 'Summary should have item_code');
  assert('item_name' in data.summary, 'Summary should have item_name');
  assert('uom' in data.summary, 'Summary should have uom');
}

async function testNumericValues(): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/inventory/reports/stock-card?` +
    `company=${encodeURIComponent(TEST_COMPANY)}` +
    `&item_code=TEST-ITEM-001`
  );
  
  const data = await response.json();
  
  assert(typeof data.summary.opening_balance === 'number', 'opening_balance should be a number');
  assert(typeof data.summary.closing_balance === 'number', 'closing_balance should be a number');
  assert(typeof data.summary.total_in === 'number', 'total_in should be a number');
  assert(typeof data.summary.total_out === 'number', 'total_out should be a number');
  assert(typeof data.summary.transaction_count === 'number', 'transaction_count should be a number');
}

async function testTotalInCalculation(): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/inventory/reports/stock-card?` +
    `company=${encodeURIComponent(TEST_COMPANY)}` +
    `&item_code=TEST-ITEM-001`
  );
  
  const data = await response.json();
  
  if (data.success && data.data.length > 0) {
    // Calculate expected total_in from data
    const expectedTotalIn = data.data
      .filter((entry: any) => entry.actual_qty > 0)
      .reduce((sum: number, entry: any) => sum + entry.actual_qty, 0);
    
    assert(
      Math.abs(data.summary.total_in - expectedTotalIn) < 0.01,
      `total_in should equal sum of positive actual_qty values. Expected: ${expectedTotalIn}, Got: ${data.summary.total_in}`
    );
  }
}

async function testTotalOutCalculation(): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/inventory/reports/stock-card?` +
    `company=${encodeURIComponent(TEST_COMPANY)}` +
    `&item_code=TEST-ITEM-001`
  );
  
  const data = await response.json();
  
  if (data.success && data.data.length > 0) {
    // Calculate expected total_out from data
    const expectedTotalOut = data.data
      .filter((entry: any) => entry.actual_qty < 0)
      .reduce((sum: number, entry: any) => sum + Math.abs(entry.actual_qty), 0);
    
    assert(
      Math.abs(data.summary.total_out - expectedTotalOut) < 0.01,
      `total_out should equal sum of absolute negative actual_qty values. Expected: ${expectedTotalOut}, Got: ${data.summary.total_out}`
    );
  }
}

async function testTotalOutIsPositive(): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/inventory/reports/stock-card?` +
    `company=${encodeURIComponent(TEST_COMPANY)}` +
    `&item_code=TEST-ITEM-001`
  );
  
  const data = await response.json();
  
  if (data.success) {
    assert(
      data.summary.total_out >= 0,
      `total_out should always be positive or zero. Got: ${data.summary.total_out}`
    );
  }
}

async function testClosingBalanceWithTransactions(): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/inventory/reports/stock-card?` +
    `company=${encodeURIComponent(TEST_COMPANY)}` +
    `&item_code=TEST-ITEM-001`
  );
  
  const data = await response.json();
  
  if (data.success && data.data.length > 0) {
    const lastEntry = data.data[data.data.length - 1];
    assert(
      data.summary.closing_balance === lastEntry.qty_after_transaction,
      `closing_balance should equal qty_after_transaction of last entry. Expected: ${lastEntry.qty_after_transaction}, Got: ${data.summary.closing_balance}`
    );
  }
}

async function testTransactionCount(): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/inventory/reports/stock-card?` +
    `company=${encodeURIComponent(TEST_COMPANY)}` +
    `&item_code=TEST-ITEM-001`
  );
  
  const data = await response.json();
  
  if (data.success) {
    assert(
      data.summary.transaction_count === data.data.length,
      `transaction_count should equal number of entries. Expected: ${data.data.length}, Got: ${data.summary.transaction_count}`
    );
  }
}

async function testItemCodeInSummary(): Promise<void> {
  const itemCode = 'TEST-ITEM-001';
  const response = await fetch(
    `${API_BASE_URL}/api/inventory/reports/stock-card?` +
    `company=${encodeURIComponent(TEST_COMPANY)}` +
    `&item_code=${itemCode}`
  );
  
  const data = await response.json();
  
  if (data.success) {
    assert(
      data.summary.item_code === itemCode,
      `item_code in summary should match requested item. Expected: ${itemCode}, Got: ${data.summary.item_code}`
    );
  }
}

async function testItemNameInSummary(): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/inventory/reports/stock-card?` +
    `company=${encodeURIComponent(TEST_COMPANY)}` +
    `&item_code=TEST-ITEM-001`
  );
  
  const data = await response.json();
  
  if (data.success) {
    assert(data.summary.item_name !== undefined, 'item_name should be defined');
    assert(typeof data.summary.item_name === 'string', 'item_name should be a string');
    assert(data.summary.item_name.length > 0, 'item_name should not be empty');
  }
}

async function testUomInSummary(): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/inventory/reports/stock-card?` +
    `company=${encodeURIComponent(TEST_COMPANY)}` +
    `&item_code=TEST-ITEM-001`
  );
  
  const data = await response.json();
  
  if (data.success) {
    assert(data.summary.uom !== undefined, 'uom should be defined');
    assert(typeof data.summary.uom === 'string', 'uom should be a string');
  }
}

async function testBalanceConsistency(): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/inventory/reports/stock-card?` +
    `company=${encodeURIComponent(TEST_COMPANY)}` +
    `&item_code=TEST-ITEM-001` +
    `&from_date=2024-01-01` +
    `&to_date=2024-12-31`
  );
  
  const data = await response.json();
  
  if (data.success && data.data.length > 0) {
    const { opening_balance, closing_balance, total_in, total_out } = data.summary;
    const calculatedClosing = opening_balance + total_in - total_out;
    
    assert(
      Math.abs(closing_balance - calculatedClosing) < 0.01,
      `Balance equation should hold: closing = opening + total_in - total_out. ` +
      `Opening: ${opening_balance}, Total In: ${total_in}, Total Out: ${total_out}, ` +
      `Expected Closing: ${calculatedClosing}, Actual Closing: ${closing_balance}`
    );
  }
}

async function testMissingCompanyError(): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/inventory/reports/stock-card?item_code=TEST-ITEM-001`
  );
  
  const data = await response.json();
  
  assert(data.success === false, 'Response should indicate failure');
  assert(response.status === 400, 'Status should be 400 Bad Request');
}

async function testMissingItemCodeError(): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/inventory/reports/stock-card?company=${encodeURIComponent(TEST_COMPANY)}`
  );
  
  const data = await response.json();
  
  assert(data.success === false, 'Response should indicate failure');
  assert(response.status === 400, 'Status should be 400 Bad Request');
}

// Main test runner
async function runAllTests(): Promise<void> {
  console.log('\n=== Stock Card Report - Summary Calculations Tests ===\n');
  
  console.log('Summary Data Structure Tests:');
  await runTest('should return summary with all required fields', testSummaryDataStructure);
  await runTest('should return numeric values for all quantity fields', testNumericValues);
  
  console.log('\nTotal In Calculation Tests:');
  await runTest('should sum all positive actual_qty values', testTotalInCalculation);
  
  console.log('\nTotal Out Calculation Tests:');
  await runTest('should sum absolute values of all negative actual_qty values', testTotalOutCalculation);
  await runTest('should always return positive value for total_out', testTotalOutIsPositive);
  
  console.log('\nClosing Balance Tests:');
  await runTest('should equal qty_after_transaction of last entry when transactions exist', testClosingBalanceWithTransactions);
  
  console.log('\nTransaction Count Tests:');
  await runTest('should equal the number of entries in data array', testTransactionCount);
  
  console.log('\nItem Information Tests:');
  await runTest('should include item_code in summary', testItemCodeInSummary);
  await runTest('should include item_name in summary', testItemNameInSummary);
  await runTest('should include uom in summary', testUomInSummary);
  
  console.log('\nBalance Consistency Tests:');
  await runTest('should maintain balance equation: closing = opening + total_in - total_out', testBalanceConsistency);
  
  console.log('\nError Handling Tests:');
  await runTest('should return error when company is missing', testMissingCompanyError);
  await runTest('should return error when item_code is missing', testMissingItemCodeError);
  
  // Print summary
  console.log('\n=== Test Summary ===');
  const passed = testResults.filter(r => r.passed).length;
  const failed = testResults.filter(r => !r.passed).length;
  console.log(`Total: ${testResults.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\nFailed tests:');
    testResults.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}`);
      if (r.message) {
        console.log(`    ${r.message}`);
      }
    });
    process.exit(1);
  } else {
    console.log('\n✓ All tests passed!');
    process.exit(0);
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
