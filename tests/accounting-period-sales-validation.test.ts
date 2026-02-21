/**
 * Unit Test for Sales Module Validation
 * Tests the Sales Invoice validation check for accounting period closing
 * 
 * Requirement 11.1: Validate that all sales invoices in the period are processed
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
  const periodName = `TEST-SALES-VAL-${suffix}-${Date.now()}`;
  
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
 * Test: Sales Invoice Validation - Draft Invoice Detection
 * Requirement 11.1: Detect unprocessed (draft) sales invoices in the period
 */
async function testSalesInvoiceDraftDetection() {
  console.log('\n=== Test: Sales Invoice Draft Detection ===');
  
  const period = await createTestPeriod('DRAFT');
  let draftInvoice: any = null;
  
  try {
    // Create a draft sales invoice within the period
    const invoiceResult = await erpnextRequest('POST', '/api/resource/Sales Invoice', {
      company: COMPANY,
      customer: 'Test Customer',
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
    console.log(`Created draft sales invoice: ${draftInvoice.name}`);
    
    // Run validation
    const result = await validatePeriod(period.name, COMPANY);
    
    // Find the sales invoice check
    const salesCheck = result.validations.find(
      (v: any) => v.check_name === 'Sales Invoices Processed'
    );
    
    console.log('Sales invoice check result:', salesCheck);
    
    // Assertions
    if (!salesCheck) {
      throw new Error('Sales invoice check not found in validation results');
    }
    
    if (salesCheck.passed) {
      throw new Error('Expected sales invoice check to fail with draft invoice, but it passed');
    }
    
    if (salesCheck.severity !== 'error') {
      throw new Error(`Expected severity 'error', got '${salesCheck.severity}'`);
    }
    
    if (!salesCheck.message.includes('unprocessed')) {
      throw new Error(`Expected message to mention 'unprocessed', got: ${salesCheck.message}`);
    }
    
    if (!Array.isArray(salesCheck.details) || salesCheck.details.length === 0) {
      throw new Error('Expected details array with unprocessed invoices');
    }
    
    // Verify the draft invoice is in the details
    const foundInvoice = salesCheck.details.find((d: any) => d.name === draftInvoice.name);
    if (!foundInvoice) {
      throw new Error('Draft invoice not found in validation details');
    }
    
    console.log('✓ Sales invoice draft detection works correctly');
    
    // Cleanup
    if (draftInvoice) {
      await cleanup('Sales Invoice', draftInvoice.name);
    }
    await cleanup('Accounting Period', period.name);
    
  } catch (error) {
    if (draftInvoice) {
      await cleanup('Sales Invoice', draftInvoice.name);
    }
    await cleanup('Accounting Period', period.name);
    throw error;
  }
}

/**
 * Test: Sales Invoice Validation - Clean Period
 * Requirement 11.1: Verify check passes when all sales invoices are processed
 */
async function testSalesInvoiceCleanPeriod() {
  console.log('\n=== Test: Sales Invoice Validation - Clean Period ===');
  
  const period = await createTestPeriod('CLEAN');
  
  try {
    // Run validation without creating any sales invoices
    const result = await validatePeriod(period.name, COMPANY);
    
    // Find the sales invoice check
    const salesCheck = result.validations.find(
      (v: any) => v.check_name === 'Sales Invoices Processed'
    );
    
    console.log('Sales invoice check result (clean period):', salesCheck);
    
    // Assertions
    if (!salesCheck) {
      throw new Error('Sales invoice check not found in validation results');
    }
    
    if (!salesCheck.passed) {
      throw new Error('Expected sales invoice check to pass for clean period');
    }
    
    if (salesCheck.details.length !== 0) {
      throw new Error('Expected empty details array for clean period');
    }
    
    if (!salesCheck.message.includes('processed')) {
      throw new Error(`Expected success message to mention 'processed', got: ${salesCheck.message}`);
    }
    
    console.log('✓ Sales invoice validation passes for clean period');
    
    // Cleanup
    await cleanup('Accounting Period', period.name);
    
  } catch (error) {
    await cleanup('Accounting Period', period.name);
    throw error;
  }
}

/**
 * Test: Sales Invoice Validation - Submitted Invoice
 * Requirement 11.1: Verify submitted invoices don't trigger validation failure
 */
async function testSalesInvoiceSubmittedInvoice() {
  console.log('\n=== Test: Sales Invoice Validation - Submitted Invoice ===');
  
  const period = await createTestPeriod('SUBMITTED');
  let submittedInvoice: any = null;
  
  try {
    // Create a sales invoice
    const invoiceResult = await erpnextRequest('POST', '/api/resource/Sales Invoice', {
      company: COMPANY,
      customer: 'Test Customer',
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
    console.log(`Created sales invoice: ${submittedInvoice.name}`);
    
    // Submit the invoice
    await erpnextRequest('PUT', `/api/resource/Sales Invoice/${submittedInvoice.name}`, {
      docstatus: 1,
    });
    console.log(`Submitted sales invoice: ${submittedInvoice.name}`);
    
    // Run validation
    const result = await validatePeriod(period.name, COMPANY);
    
    // Find the sales invoice check
    const salesCheck = result.validations.find(
      (v: any) => v.check_name === 'Sales Invoices Processed'
    );
    
    console.log('Sales invoice check result (with submitted invoice):', salesCheck);
    
    // Assertions
    if (!salesCheck) {
      throw new Error('Sales invoice check not found in validation results');
    }
    
    if (!salesCheck.passed) {
      throw new Error('Expected sales invoice check to pass with submitted invoice');
    }
    
    if (salesCheck.details.length !== 0) {
      throw new Error('Expected empty details array when all invoices are submitted');
    }
    
    console.log('✓ Sales invoice validation passes with submitted invoices');
    
    // Cleanup - cancel first, then delete
    if (submittedInvoice) {
      await erpnextRequest('PUT', `/api/resource/Sales Invoice/${submittedInvoice.name}`, {
        docstatus: 2,
      });
      await cleanup('Sales Invoice', submittedInvoice.name);
    }
    await cleanup('Accounting Period', period.name);
    
  } catch (error) {
    if (submittedInvoice) {
      try {
        await erpnextRequest('PUT', `/api/resource/Sales Invoice/${submittedInvoice.name}`, {
          docstatus: 2,
        });
        await cleanup('Sales Invoice', submittedInvoice.name);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
    }
    await cleanup('Accounting Period', period.name);
    throw error;
  }
}

/**
 * Test: Sales Invoice Validation - Outside Period
 * Requirement 11.1: Verify invoices outside period date range are not checked
 */
async function testSalesInvoiceOutsidePeriod() {
  console.log('\n=== Test: Sales Invoice Validation - Outside Period ===');
  
  const period = await createTestPeriod('OUTSIDE');
  let outsideInvoice: any = null;
  
  try {
    // Create a draft sales invoice OUTSIDE the period (period is Feb 2024)
    const invoiceResult = await erpnextRequest('POST', '/api/resource/Sales Invoice', {
      company: COMPANY,
      customer: 'Test Customer',
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
    console.log(`Created draft sales invoice outside period: ${outsideInvoice.name}`);
    
    // Run validation
    const result = await validatePeriod(period.name, COMPANY);
    
    // Find the sales invoice check
    const salesCheck = result.validations.find(
      (v: any) => v.check_name === 'Sales Invoices Processed'
    );
    
    console.log('Sales invoice check result (invoice outside period):', salesCheck);
    
    // Assertions
    if (!salesCheck) {
      throw new Error('Sales invoice check not found in validation results');
    }
    
    // Should pass because the draft invoice is outside the period
    if (!salesCheck.passed) {
      throw new Error('Expected sales invoice check to pass when draft invoice is outside period');
    }
    
    if (salesCheck.details.length !== 0) {
      throw new Error('Expected empty details array when draft invoice is outside period');
    }
    
    console.log('✓ Sales invoice validation correctly ignores invoices outside period');
    
    // Cleanup
    if (outsideInvoice) {
      await cleanup('Sales Invoice', outsideInvoice.name);
    }
    await cleanup('Accounting Period', period.name);
    
  } catch (error) {
    if (outsideInvoice) {
      await cleanup('Sales Invoice', outsideInvoice.name);
    }
    await cleanup('Accounting Period', period.name);
    throw error;
  }
}

// Run all tests
async function runAllTests() {
  console.log('Starting Sales Module Validation Tests...\n');
  console.log('Requirement 11.1: Validate all sales invoices in period are processed\n');
  
  const tests = [
    { name: 'Sales Invoice Draft Detection', fn: testSalesInvoiceDraftDetection },
    { name: 'Sales Invoice Clean Period', fn: testSalesInvoiceCleanPeriod },
    { name: 'Sales Invoice Submitted Invoice', fn: testSalesInvoiceSubmittedInvoice },
    { name: 'Sales Invoice Outside Period', fn: testSalesInvoiceOutsidePeriod },
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
    console.log('  - Test customer/item do not exist in ERPNext');
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
  testSalesInvoiceDraftDetection,
  testSalesInvoiceCleanPeriod,
  testSalesInvoiceSubmittedInvoice,
  testSalesInvoiceOutsidePeriod,
};
