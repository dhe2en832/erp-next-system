/**
 * Unit Test for Purchase Module Validation
 * Tests the Purchase Invoice validation check for accounting period closing
 * 
 * Requirement 11.2: Validate that all purchase invoices in the period are processed
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

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';
const API_KEY = process.env.ERP_API_KEY;
const API_SECRET = process.env.ERP_API_SECRET;
const COMPANY = process.env.ERP_DEFAULT_COMPANY || 'Batasku';

if (!API_KEY || !API_SECRET) {
  throw new Error('ERP API credentials not configured');
}

const authString = Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64');
const headers = {
  Authorization: `Basic ${authString}`,
  'Content-Type': 'application/json',
};

// Helper to make ERPNext API calls
async function erpnextRequest(method: string, endpoint: string, body?: any): Promise<any> {
  const url = `${ERPNEXT_API_URL}${endpoint}`;
  const options: RequestInit = {
    method,
    headers,
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(url, options);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ERPNext API error: ${response.status} ${errorText}`);
  }
  
  return await response.json();
}

// Helper to create test period
async function createTestPeriod(suffix: string): Promise<any> {
  const periodName = `TEST-PURCHASE-VAL-${suffix}-${Date.now()}`;
  
  const result = await erpnextRequest('POST', '/api/resource/Accounting Period', {
    period_name: periodName,
    company: COMPANY,
    start_date: '2024-02-01',
    end_date: '2024-02-29',
    period_type: 'Monthly',
    status: 'Open',
  });
  
  return result.data;
}

// Helper to call validation endpoint
async function validatePeriod(periodName: string, company: string): Promise<any> {
  const response = await fetch('http://localhost:3000/api/accounting-period/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ period_name: periodName, company }),
  });
  
  return await response.json();
}

// Helper to cleanup
async function cleanup(doctype: string, name: string) {
  try {
    await erpnextRequest('DELETE', `/api/resource/${doctype}/${name}`);
  } catch (error) {
    // Ignore cleanup errors
  }
}

/**
 * Test: Purchase Invoice Validation - Draft Invoice Detection
 * Requirement 11.2: Detect unprocessed (draft) purchase invoices in the period
 */
async function testPurchaseInvoiceDraftDetection() {
  console.log('\n=== Test: Purchase Invoice Draft Detection ===');
  
  const period = await createTestPeriod('DRAFT');
  let draftInvoice: any = null;
  
  try {
    // Create a draft purchase invoice within the period
    const invoiceResult = await erpnextRequest('POST', '/api/resource/Purchase Invoice', {
      company: COMPANY,
      supplier: 'Test Supplier',
      posting_date: '2024-02-15',
      items: [
        {
          item_code: 'Test Item',
          qty: 1,
          rate: 1000,
        },
      ],
    });
    
    draftInvoice = invoiceResult.data;
    console.log(`Created draft purchase invoice: ${draftInvoice.name}`);
    
    // Run validation
    const result = await validatePeriod(period.name, COMPANY);
    
    // Find the purchase invoice check
    const purchaseCheck = result.validations.find(
      (v: any) => v.check_name === 'Purchase Invoices Processed'
    );
    
    console.log('Purchase invoice check result:', purchaseCheck);
    
    // Assertions
    if (!purchaseCheck) {
      throw new Error('Purchase invoice check not found in validation results');
    }
    
    if (purchaseCheck.passed) {
      throw new Error('Expected purchase invoice check to fail with draft invoice, but it passed');
    }
    
    if (purchaseCheck.severity !== 'error') {
      throw new Error(`Expected severity 'error', got '${purchaseCheck.severity}'`);
    }
    
    if (!purchaseCheck.message.includes('unprocessed')) {
      throw new Error(`Expected message to mention 'unprocessed', got: ${purchaseCheck.message}`);
    }
    
    if (!Array.isArray(purchaseCheck.details) || purchaseCheck.details.length === 0) {
      throw new Error('Expected details array with unprocessed invoices');
    }
    
    // Verify the draft invoice is in the details
    const foundInvoice = purchaseCheck.details.find((d: any) => d.name === draftInvoice.name);
    if (!foundInvoice) {
      throw new Error('Draft invoice not found in validation details');
    }
    
    console.log('✓ Purchase invoice draft detection works correctly');
    
    // Cleanup
    if (draftInvoice) {
      await cleanup('Purchase Invoice', draftInvoice.name);
    }
    await cleanup('Accounting Period', period.name);
    
  } catch (error) {
    if (draftInvoice) {
      await cleanup('Purchase Invoice', draftInvoice.name);
    }
    await cleanup('Accounting Period', period.name);
    throw error;
  }
}

/**
 * Test: Purchase Invoice Validation - Clean Period
 * Requirement 11.2: Verify check passes when all purchase invoices are processed
 */
async function testPurchaseInvoiceCleanPeriod() {
  console.log('\n=== Test: Purchase Invoice Validation - Clean Period ===');
  
  const period = await createTestPeriod('CLEAN');
  
  try {
    // Run validation without creating any purchase invoices
    const result = await validatePeriod(period.name, COMPANY);
    
    // Find the purchase invoice check
    const purchaseCheck = result.validations.find(
      (v: any) => v.check_name === 'Purchase Invoices Processed'
    );
    
    console.log('Purchase invoice check result (clean period):', purchaseCheck);
    
    // Assertions
    if (!purchaseCheck) {
      throw new Error('Purchase invoice check not found in validation results');
    }
    
    if (!purchaseCheck.passed) {
      throw new Error('Expected purchase invoice check to pass for clean period');
    }
    
    if (purchaseCheck.details.length !== 0) {
      throw new Error('Expected empty details array for clean period');
    }
    
    if (!purchaseCheck.message.includes('processed')) {
      throw new Error(`Expected success message to mention 'processed', got: ${purchaseCheck.message}`);
    }
    
    console.log('✓ Purchase invoice validation passes for clean period');
    
    // Cleanup
    await cleanup('Accounting Period', period.name);
    
  } catch (error) {
    await cleanup('Accounting Period', period.name);
    throw error;
  }
}

/**
 * Test: Purchase Invoice Validation - Submitted Invoice
 * Requirement 11.2: Verify submitted invoices don't trigger validation failure
 */
async function testPurchaseInvoiceSubmittedInvoice() {
  console.log('\n=== Test: Purchase Invoice Validation - Submitted Invoice ===');
  
  const period = await createTestPeriod('SUBMITTED');
  let submittedInvoice: any = null;
  
  try {
    // Create a purchase invoice
    const invoiceResult = await erpnextRequest('POST', '/api/resource/Purchase Invoice', {
      company: COMPANY,
      supplier: 'Test Supplier',
      posting_date: '2024-02-15',
      items: [
        {
          item_code: 'Test Item',
          qty: 1,
          rate: 1000,
        },
      ],
    });
    
    submittedInvoice = invoiceResult.data;
    console.log(`Created purchase invoice: ${submittedInvoice.name}`);
    
    // Submit the invoice
    await erpnextRequest('PUT', `/api/resource/Purchase Invoice/${submittedInvoice.name}`, {
      docstatus: 1,
    });
    console.log(`Submitted purchase invoice: ${submittedInvoice.name}`);
    
    // Run validation
    const result = await validatePeriod(period.name, COMPANY);
    
    // Find the purchase invoice check
    const purchaseCheck = result.validations.find(
      (v: any) => v.check_name === 'Purchase Invoices Processed'
    );
    
    console.log('Purchase invoice check result (with submitted invoice):', purchaseCheck);
    
    // Assertions
    if (!purchaseCheck) {
      throw new Error('Purchase invoice check not found in validation results');
    }
    
    if (!purchaseCheck.passed) {
      throw new Error('Expected purchase invoice check to pass with submitted invoice');
    }
    
    if (purchaseCheck.details.length !== 0) {
      throw new Error('Expected empty details array when all invoices are submitted');
    }
    
    console.log('✓ Purchase invoice validation passes with submitted invoices');
    
    // Cleanup - cancel first, then delete
    if (submittedInvoice) {
      await erpnextRequest('PUT', `/api/resource/Purchase Invoice/${submittedInvoice.name}`, {
        docstatus: 2,
      });
      await cleanup('Purchase Invoice', submittedInvoice.name);
    }
    await cleanup('Accounting Period', period.name);
    
  } catch (error) {
    if (submittedInvoice) {
      try {
        await erpnextRequest('PUT', `/api/resource/Purchase Invoice/${submittedInvoice.name}`, {
          docstatus: 2,
        });
        await cleanup('Purchase Invoice', submittedInvoice.name);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
    }
    await cleanup('Accounting Period', period.name);
    throw error;
  }
}

/**
 * Test: Purchase Invoice Validation - Outside Period
 * Requirement 11.2: Verify invoices outside period date range are not checked
 */
async function testPurchaseInvoiceOutsidePeriod() {
  console.log('\n=== Test: Purchase Invoice Validation - Outside Period ===');
  
  const period = await createTestPeriod('OUTSIDE');
  let outsideInvoice: any = null;
  
  try {
    // Create a draft purchase invoice OUTSIDE the period (period is Feb 2024)
    const invoiceResult = await erpnextRequest('POST', '/api/resource/Purchase Invoice', {
      company: COMPANY,
      supplier: 'Test Supplier',
      posting_date: '2024-03-15', // March, outside Feb period
      items: [
        {
          item_code: 'Test Item',
          qty: 1,
          rate: 1000,
        },
      ],
    });
    
    outsideInvoice = invoiceResult.data;
    console.log(`Created draft purchase invoice outside period: ${outsideInvoice.name}`);
    
    // Run validation
    const result = await validatePeriod(period.name, COMPANY);
    
    // Find the purchase invoice check
    const purchaseCheck = result.validations.find(
      (v: any) => v.check_name === 'Purchase Invoices Processed'
    );
    
    console.log('Purchase invoice check result (invoice outside period):', purchaseCheck);
    
    // Assertions
    if (!purchaseCheck) {
      throw new Error('Purchase invoice check not found in validation results');
    }
    
    // Should pass because the draft invoice is outside the period
    if (!purchaseCheck.passed) {
      throw new Error('Expected purchase invoice check to pass when draft invoice is outside period');
    }
    
    if (purchaseCheck.details.length !== 0) {
      throw new Error('Expected empty details array when draft invoice is outside period');
    }
    
    console.log('✓ Purchase invoice validation correctly ignores invoices outside period');
    
    // Cleanup
    if (outsideInvoice) {
      await cleanup('Purchase Invoice', outsideInvoice.name);
    }
    await cleanup('Accounting Period', period.name);
    
  } catch (error) {
    if (outsideInvoice) {
      await cleanup('Purchase Invoice', outsideInvoice.name);
    }
    await cleanup('Accounting Period', period.name);
    throw error;
  }
}

// Run all tests
async function runAllTests() {
  console.log('Starting Purchase Module Validation Tests...\n');
  console.log('Requirement 11.2: Validate all purchase invoices in period are processed\n');
  
  const tests = [
    { name: 'Purchase Invoice Draft Detection', fn: testPurchaseInvoiceDraftDetection },
    { name: 'Purchase Invoice Clean Period', fn: testPurchaseInvoiceCleanPeriod },
    { name: 'Purchase Invoice Submitted Invoice', fn: testPurchaseInvoiceSubmittedInvoice },
    { name: 'Purchase Invoice Outside Period', fn: testPurchaseInvoiceOutsidePeriod },
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      await test.fn();
      passed++;
    } catch (error: any) {
      console.error(`✗ Test failed: ${test.name}`);
      console.error(`  Error: ${error.message}`);
      failed++;
    }
  }
  
  console.log('\n=== Test Summary ===');
  console.log(`Total: ${tests.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\n⚠ Some tests failed. This may be expected if:');
    console.log('  - Next.js dev server is not running');
    console.log('  - ERPNext backend is not accessible');
    console.log('  - Test supplier/item do not exist in ERPNext');
    process.exit(1);
  }
}

// Run tests if executed directly
if (require.main === module) {
  runAllTests().catch((error) => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

export {
  testPurchaseInvoiceDraftDetection,
  testPurchaseInvoiceCleanPeriod,
  testPurchaseInvoiceSubmittedInvoice,
  testPurchaseInvoiceOutsidePeriod,
};
