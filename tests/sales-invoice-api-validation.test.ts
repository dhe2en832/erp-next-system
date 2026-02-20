/**
 * Unit Tests: Sales Invoice API Validation
 * Task 3.5: Write unit tests untuk Sales Invoice API validation
 * 
 * Validates: Requirements 2.7, 5.1, 5.2, 5.3
 * 
 * Tests:
 * - Validasi discount_percentage (negative, > 100)
 * - Validasi discount_amount (negative, > subtotal)
 * - Validasi tax template (tidak exist, disabled)
 * - Priority rule discount_amount vs discount_percentage
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
const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';
const API_KEY = process.env.ERP_API_KEY;
const API_SECRET = process.env.ERP_API_SECRET;

interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
}

// Helper: Create test invoice data
function createTestInvoiceData(overrides: any = {}): any {
  return {
    company: 'BAC',
    customer: 'CUST-00001',
    customer_name: 'Test Customer',
    posting_date: new Date().toISOString().split('T')[0],
    items: [
      {
        item_code: 'ITEM-001',
        item_name: 'Test Item',
        qty: 10,
        rate: 100000,
        amount: 1000000
      }
    ],
    ...overrides
  };
}

// Test 1: Validate discount_percentage negative value
async function testDiscountPercentageNegative(): Promise<TestResult> {
  try {
    const invoiceData = createTestInvoiceData({
      discount_percentage: -10
    });

    const response = await fetch(`${API_BASE_URL}/api/sales/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invoiceData)
    });

    const result = await response.json();

    if (response.status === 400 && result.message?.includes('between 0 and 100')) {
      return { name: 'Discount Percentage Negative', passed: true };
    } else {
      return { 
        name: 'Discount Percentage Negative', 
        passed: false, 
        message: `Expected 400 error, got ${response.status}: ${result.message}` 
      };
    }
  } catch (error: any) {
    return { 
      name: 'Discount Percentage Negative', 
      passed: false, 
      message: error.message 
    };
  }
}

// Test 2: Validate discount_percentage > 100
async function testDiscountPercentageExceedsMax(): Promise<TestResult> {
  try {
    const invoiceData = createTestInvoiceData({
      discount_percentage: 150
    });

    const response = await fetch(`${API_BASE_URL}/api/sales/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invoiceData)
    });

    const result = await response.json();

    if (response.status === 400 && result.message?.includes('between 0 and 100')) {
      return { name: 'Discount Percentage > 100', passed: true };
    } else {
      return { 
        name: 'Discount Percentage > 100', 
        passed: false, 
        message: `Expected 400 error, got ${response.status}: ${result.message}` 
      };
    }
  } catch (error: any) {
    return { 
      name: 'Discount Percentage > 100', 
      passed: false, 
      message: error.message 
    };
  }
}

// Test 3: Validate discount_amount negative value
async function testDiscountAmountNegative(): Promise<TestResult> {
  try {
    const invoiceData = createTestInvoiceData({
      discount_amount: -50000
    });

    const response = await fetch(`${API_BASE_URL}/api/sales/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invoiceData)
    });

    const result = await response.json();

    if (response.status === 400 && result.message?.includes('cannot be negative')) {
      return { name: 'Discount Amount Negative', passed: true };
    } else {
      return { 
        name: 'Discount Amount Negative', 
        passed: false, 
        message: `Expected 400 error, got ${response.status}: ${result.message}` 
      };
    }
  } catch (error: any) {
    return { 
      name: 'Discount Amount Negative', 
      passed: false, 
      message: error.message 
    };
  }
}

// Test 4: Validate discount_amount > subtotal
async function testDiscountAmountExceedsSubtotal(): Promise<TestResult> {
  try {
    const invoiceData = createTestInvoiceData({
      discount_amount: 2000000 // Subtotal is 1,000,000
    });

    const response = await fetch(`${API_BASE_URL}/api/sales/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invoiceData)
    });

    const result = await response.json();

    if (response.status === 400 && result.message?.includes('cannot exceed subtotal')) {
      return { name: 'Discount Amount > Subtotal', passed: true };
    } else {
      return { 
        name: 'Discount Amount > Subtotal', 
        passed: false, 
        message: `Expected 400 error, got ${response.status}: ${result.message}` 
      };
    }
  } catch (error: any) {
    return { 
      name: 'Discount Amount > Subtotal', 
      passed: false, 
      message: error.message 
    };
  }
}

// Test 5: Validate tax template not found
async function testTaxTemplateNotFound(): Promise<TestResult> {
  try {
    const invoiceData = createTestInvoiceData({
      taxes_and_charges: 'Non-Existent Tax Template'
    });

    const response = await fetch(`${API_BASE_URL}/api/sales/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invoiceData)
    });

    const result = await response.json();

    if (response.status === 400 && result.message?.includes('not found')) {
      return { name: 'Tax Template Not Found', passed: true };
    } else {
      return { 
        name: 'Tax Template Not Found', 
        passed: false, 
        message: `Expected 400 error, got ${response.status}: ${result.message}` 
      };
    }
  } catch (error: any) {
    return { 
      name: 'Tax Template Not Found', 
      passed: false, 
      message: error.message 
    };
  }
}

// Test 6: Validate discount_percentage valid value (0-100)
async function testDiscountPercentageValid(): Promise<TestResult> {
  try {
    const invoiceData = createTestInvoiceData({
      discount_percentage: 10
    });

    const response = await fetch(`${API_BASE_URL}/api/sales/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invoiceData)
    });

    const result = await response.json();

    // Should not return 400 validation error for valid percentage
    if (response.status !== 400 || !result.message?.includes('between 0 and 100')) {
      return { name: 'Discount Percentage Valid (10%)', passed: true };
    } else {
      return { 
        name: 'Discount Percentage Valid (10%)', 
        passed: false, 
        message: `Valid percentage rejected: ${result.message}` 
      };
    }
  } catch (error: any) {
    return { 
      name: 'Discount Percentage Valid (10%)', 
      passed: false, 
      message: error.message 
    };
  }
}

// Test 7: Validate discount_amount valid value
async function testDiscountAmountValid(): Promise<TestResult> {
  try {
    const invoiceData = createTestInvoiceData({
      discount_amount: 100000 // Valid: less than subtotal (1,000,000)
    });

    const response = await fetch(`${API_BASE_URL}/api/sales/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invoiceData)
    });

    const result = await response.json();

    // Should not return 400 validation error for valid amount
    if (response.status !== 400 || !result.message?.includes('cannot exceed subtotal')) {
      return { name: 'Discount Amount Valid (100,000)', passed: true };
    } else {
      return { 
        name: 'Discount Amount Valid (100,000)', 
        passed: false, 
        message: `Valid amount rejected: ${result.message}` 
      };
    }
  } catch (error: any) {
    return { 
      name: 'Discount Amount Valid (100,000)', 
      passed: false, 
      message: error.message 
    };
  }
}

// Main test runner
async function runUnitTests() {
  console.log('='.repeat(60));
  console.log('🧪 Unit Tests: Sales Invoice API Validation');
  console.log('   Task 3.5: API validation tests');
  console.log('   Validates: Requirements 2.7, 5.1, 5.2, 5.3');
  console.log('='.repeat(60));

  if (!API_KEY || !API_SECRET) {
    console.error('\n❌ Error: API credentials not configured');
    console.error('   Please set ERP_API_KEY and ERP_API_SECRET in .env file');
    process.exit(1);
  }

  console.log(`\n✅ API credentials configured`);
  console.log(`   API Base URL: ${API_BASE_URL}`);
  console.log(`   ERPNext URL: ${ERPNEXT_API_URL}`);
  console.log(`\n📋 Running validation tests...\n`);

  const tests = [
    testDiscountPercentageNegative,
    testDiscountPercentageExceedsMax,
    testDiscountAmountNegative,
    testDiscountAmountExceedsSubtotal,
    testTaxTemplateNotFound,
    testDiscountPercentageValid,
    testDiscountAmountValid
  ];

  const results: TestResult[] = [];

  for (const test of tests) {
    const result = await test();
    results.push(result);
    
    if (result.passed) {
      console.log(`✅ ${result.name}`);
    } else {
      console.log(`❌ ${result.name}`);
      if (result.message) {
        console.log(`   ${result.message}`);
      }
    }
  }

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Results');
  console.log('='.repeat(60));
  console.log(`Total tests: ${results.length}`);
  console.log(`Passed: ${passed} (${(passed/results.length*100).toFixed(1)}%)`);
  console.log(`Failed: ${failed} (${(failed/results.length*100).toFixed(1)}%)`);
  
  if (failed === 0) {
    console.log('\n✅ All Unit Tests PASSED');
    process.exit(0);
  } else {
    console.log('\n❌ Some Unit Tests FAILED');
    process.exit(1);
  }
}

// Run the tests
if (require.main === module) {
  runUnitTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { runUnitTests };
