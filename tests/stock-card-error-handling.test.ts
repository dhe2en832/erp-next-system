/**
 * Unit tests for Stock Card Report Error Handling
 * 
 * Tests error handling functionality including:
 * - Parameter validation (company, item_code)
 * - Date format validation
 * - Date range validation
 * - Pagination parameter validation
 * - Indonesian error messages
 * 
 * Requirements: 8.3, 12.2, 12.3, 12.6
 * Task: 2.5 Implement error handling
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

/**
 * Simple assertion helper
 */
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

/**
 * Test: Missing company parameter returns 400 with Indonesian message
 * Requirement: 12.3, 12.6
 */
async function testMissingCompanyParameter(): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/inventory/reports/stock-card?item_code=TEST-ITEM-001`
  );
  
  const data = await response.json();
  
  assert(response.status === 400, 'Status should be 400 Bad Request');
  assert(data.success === false, 'Response should indicate failure');
  assert(data.message.includes('company'), 'Error message should mention company parameter');
  assert(data.message.includes('wajib'), 'Error message should be in Indonesian');
}

/**
 * Test: Missing item_code parameter returns 400 with Indonesian message
 * Requirement: 12.3, 12.6
 */
async function testMissingItemCodeParameter(): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/inventory/reports/stock-card?company=${encodeURIComponent(TEST_COMPANY)}`
  );
  
  const data = await response.json();
  
  assert(response.status === 400, 'Status should be 400 Bad Request');
  assert(data.success === false, 'Response should indicate failure');
  assert(data.message.includes('item_code'), 'Error message should mention item_code parameter');
  assert(data.message.includes('wajib'), 'Error message should be in Indonesian');
}

/**
 * Test: Invalid from_date format returns 400 with Indonesian message
 * Requirement: 12.2, 12.6
 */
async function testInvalidFromDateFormat(): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/inventory/reports/stock-card?` +
    `company=${encodeURIComponent(TEST_COMPANY)}` +
    `&item_code=TEST-ITEM-001` +
    `&from_date=01/01/2024` // Wrong format (should be YYYY-MM-DD)
  );
  
  const data = await response.json();
  
  assert(response.status === 400, 'Status should be 400 Bad Request');
  assert(data.success === false, 'Response should indicate failure');
  assert(data.message.includes('tanggal'), 'Error message should mention date');
  assert(data.message.includes('format'), 'Error message should mention format');
  assert(data.message.includes('YYYY-MM-DD'), 'Error message should specify correct format');
}

/**
 * Test: Invalid to_date format returns 400 with Indonesian message
 * Requirement: 12.2, 12.6
 */
async function testInvalidToDateFormat(): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/inventory/reports/stock-card?` +
    `company=${encodeURIComponent(TEST_COMPANY)}` +
    `&item_code=TEST-ITEM-001` +
    `&to_date=31-12-2024` // Wrong format (should be YYYY-MM-DD)
  );
  
  const data = await response.json();
  
  assert(response.status === 400, 'Status should be 400 Bad Request');
  assert(data.success === false, 'Response should indicate failure');
  assert(data.message.includes('tanggal'), 'Error message should mention date');
  assert(data.message.includes('format'), 'Error message should mention format');
}

/**
 * Test: Invalid date (non-existent date) returns 400
 * Requirement: 12.2, 12.6
 */
async function testInvalidDate(): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/inventory/reports/stock-card?` +
    `company=${encodeURIComponent(TEST_COMPANY)}` +
    `&item_code=TEST-ITEM-001` +
    `&from_date=2024-02-30` // February 30th doesn't exist
  );
  
  const data = await response.json();
  
  assert(response.status === 400, 'Status should be 400 Bad Request');
  assert(data.success === false, 'Response should indicate failure');
  assert(data.message.includes('format') || data.message.includes('tidak valid'), 'Error message should indicate invalid date');
}

/**
 * Test: End date before start date returns 400 with Indonesian message
 * Requirement: 12.2, 12.6
 */
async function testInvalidDateRange(): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/inventory/reports/stock-card?` +
    `company=${encodeURIComponent(TEST_COMPANY)}` +
    `&item_code=TEST-ITEM-001` +
    `&from_date=2024-12-31` +
    `&to_date=2024-01-01` // End date before start date
  );
  
  const data = await response.json();
  
  assert(response.status === 400, 'Status should be 400 Bad Request');
  assert(data.success === false, 'Response should indicate failure');
  assert(data.message.includes('tanggal'), 'Error message should mention date');
  assert(data.message.includes('setelah') || data.message.includes('sama dengan'), 'Error message should explain date order');
}

/**
 * Test: Invalid page number (less than 1) returns 400
 * Requirement: 12.6
 */
async function testInvalidPageNumber(): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/inventory/reports/stock-card?` +
    `company=${encodeURIComponent(TEST_COMPANY)}` +
    `&item_code=TEST-ITEM-001` +
    `&page=0` // Page must be >= 1
  );
  
  const data = await response.json();
  
  assert(response.status === 400, 'Status should be 400 Bad Request');
  assert(data.success === false, 'Response should indicate failure');
  assert(data.message.includes('halaman'), 'Error message should mention page');
}

/**
 * Test: Invalid limit (too large) returns 400
 * Requirement: 12.6
 */
async function testInvalidLimitTooLarge(): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/inventory/reports/stock-card?` +
    `company=${encodeURIComponent(TEST_COMPANY)}` +
    `&item_code=TEST-ITEM-001` +
    `&limit=2000` // Limit must be <= 1000
  );
  
  const data = await response.json();
  
  assert(response.status === 400, 'Status should be 400 Bad Request');
  assert(data.success === false, 'Response should indicate failure');
  assert(data.message.includes('batas') || data.message.includes('limit'), 'Error message should mention limit');
}

/**
 * Test: Invalid limit (less than 1) returns 400
 * Requirement: 12.6
 */
async function testInvalidLimitTooSmall(): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/inventory/reports/stock-card?` +
    `company=${encodeURIComponent(TEST_COMPANY)}` +
    `&item_code=TEST-ITEM-001` +
    `&limit=0` // Limit must be >= 1
  );
  
  const data = await response.json();
  
  assert(response.status === 400, 'Status should be 400 Bad Request');
  assert(data.success === false, 'Response should indicate failure');
  assert(data.message.includes('batas') || data.message.includes('limit'), 'Error message should mention limit');
}

/**
 * Test: Valid date format passes validation
 * Requirement: 12.2, 12.6
 */
async function testValidDateFormat(): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/inventory/reports/stock-card?` +
    `company=${encodeURIComponent(TEST_COMPANY)}` +
    `&item_code=TEST-ITEM-001` +
    `&from_date=2024-01-01` +
    `&to_date=2024-12-31`
  );
  
  // Should not return 400 for date format issues
  // (may return other errors like 401 if not authenticated, but not 400 for date format)
  if (response.status === 400) {
    const data = await response.json();
    assert(
      !data.message.includes('format') && !data.message.includes('tanggal'),
      'Should not return date format error for valid dates'
    );
  }
}

/**
 * Test: Valid date range passes validation
 * Requirement: 12.2, 12.6
 */
async function testValidDateRange(): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/inventory/reports/stock-card?` +
    `company=${encodeURIComponent(TEST_COMPANY)}` +
    `&item_code=TEST-ITEM-001` +
    `&from_date=2024-01-01` +
    `&to_date=2024-01-01` // Same date is valid
  );
  
  // Should not return 400 for date range issues
  if (response.status === 400) {
    const data = await response.json();
    assert(
      !data.message.includes('setelah') && !data.message.toLowerCase().includes('range'),
      'Should not return date range error for valid range'
    );
  }
}

/**
 * Test: All error messages are in Indonesian
 * Requirement: 12.3
 */
async function testErrorMessagesInIndonesian(): Promise<void> {
  // Test various error scenarios and check for Indonesian keywords
  const testCases = [
    {
      url: `${API_BASE_URL}/api/inventory/reports/stock-card?item_code=TEST`,
      expectedKeywords: ['wajib', 'company']
    },
    {
      url: `${API_BASE_URL}/api/inventory/reports/stock-card?company=Test&item_code=TEST&from_date=invalid`,
      expectedKeywords: ['format', 'tanggal']
    },
    {
      url: `${API_BASE_URL}/api/inventory/reports/stock-card?company=Test&item_code=TEST&page=-1`,
      expectedKeywords: ['halaman']
    }
  ];
  
  for (const testCase of testCases) {
    const response = await fetch(testCase.url);
    
    if (response.status === 400) {
      const data = await response.json();
      const hasIndonesianKeyword = testCase.expectedKeywords.some(keyword => 
        data.message.toLowerCase().includes(keyword.toLowerCase())
      );
      
      assert(
        hasIndonesianKeyword,
        `Error message should contain Indonesian keywords: ${testCase.expectedKeywords.join(', ')}`
      );
    }
  }
}

// Main test runner
async function runAllTests(): Promise<void> {
  console.log('\n=== Stock Card Report - Error Handling Tests ===\n');
  
  const tests = [
    { name: 'Missing company parameter', fn: testMissingCompanyParameter },
    { name: 'Missing item_code parameter', fn: testMissingItemCodeParameter },
    { name: 'Invalid from_date format', fn: testInvalidFromDateFormat },
    { name: 'Invalid to_date format', fn: testInvalidToDateFormat },
    { name: 'Invalid date (non-existent)', fn: testInvalidDate },
    { name: 'Invalid date range (end before start)', fn: testInvalidDateRange },
    { name: 'Invalid page number (< 1)', fn: testInvalidPageNumber },
    { name: 'Invalid limit (too large)', fn: testInvalidLimitTooLarge },
    { name: 'Invalid limit (too small)', fn: testInvalidLimitTooSmall },
    { name: 'Valid date format passes', fn: testValidDateFormat },
    { name: 'Valid date range passes', fn: testValidDateRange },
    { name: 'Error messages in Indonesian', fn: testErrorMessagesInIndonesian }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      await test.fn();
      console.log(`✓ ${test.name}`);
      passed++;
    } catch (error) {
      console.error(`✗ ${test.name}`);
      console.error(`  ${error instanceof Error ? error.message : String(error)}`);
      failed++;
    }
  }
  
  console.log(`\n=== Test Summary ===`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${tests.length}`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

export { runAllTests };
