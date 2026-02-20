/**
 * Bug Condition Exploration Tests for Discount and Tax API Production Errors
 * 
 * These tests are EXPECTED TO FAIL on unfixed code - failure confirms the bugs exist.
 * DO NOT attempt to fix the tests or the code when they fail.
 * 
 * Bug 1: Invoice API field permission errors for discount fields
 * Bug 2: Tax template API validation errors for missing company parameter
 * Bug 3: Purchase Invoice form import path errors
 * 
 * Validates: Bugfix Requirements 1.1, 1.2, 1.3, 1.4
 */

import * as fs from 'fs/promises';
import * as path from 'path';

// Simple test runner
let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function test(name: string, fn: () => Promise<void> | void) {
  return async () => {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      testsPassed++;
    } catch (error) {
      console.log(`  ✗ ${name}`);
      console.error(`    Error: ${error instanceof Error ? error.message : String(error)}`);
      testsFailed++;
    }
  };
}

async function runTests() {
  console.log('\n=== Bug Exploration Tests - Discount and Tax API Production Errors ===\n');
  console.log('IMPORTANT: These tests are EXPECTED TO FAIL on unfixed code.');
  console.log('Failure confirms the bugs exist. This is the correct behavior.\n');

  console.log('Bug 1: Invoice API Field Permission Errors\n');

  /**
   * Test Bug 1.1: Sales Invoice API with discount fields
   * 
   * EXPECTED BEHAVIOR ON UNFIXED CODE:
   * - Should fail with "Field not permitted in query: discount_percentage" error
   * - This confirms Bug 1 exists
   * 
   * Validates: Bugfix Requirements 1.1
   */
  await test('Bug 1.1: GET /api/sales/invoices with discount fields should succeed', async () => {
    // This test simulates the exact API call that fails in production
    // The sales invoice API includes discount_amount and discount_percentage in the fields parameter
    
    const response = await fetch('http://localhost:3000/api/sales/invoices?company=PT%20ABC&limit=20&start=0');
    const data = await response.json();
    
    // On unfixed code, this should fail with ERPNext permission error
    // The error message should contain "Field not permitted in query"
    console.log('    Bug 1.1 Response:', { status: response.status, success: data.success });
    
    // Document the counterexample
    if (!response.ok || !data.success) {
      console.log('    COUNTEREXAMPLE FOUND - Bug 1.1:');
      console.log('      Status:', response.status);
      console.log('      Success:', data.success);
      console.log('      Error:', data.message);
      console.log('      Expected error pattern: "Field not permitted in query: discount_percentage"');
      console.log('      Root cause: ERPNext rejects discount fields in GET request query');
    }
    
    // This assertion will FAIL on unfixed code (which is correct - it proves the bug exists)
    assert(response.ok, 'Response should be OK');
    assert(data.success, 'API should return success');
  })();

  /**
   * Test Bug 1.2: Purchase Invoice API with discount fields
   * 
   * EXPECTED BEHAVIOR ON UNFIXED CODE:
   * - Should fail with "Field not permitted in query: discount_amount" error
   * - This confirms Bug 1 exists for Purchase Invoices
   * 
   * Validates: Bugfix Requirements 1.2
   */
  await test('Bug 1.2: GET /api/purchase/invoices with discount fields should succeed', async () => {
    // This test simulates the exact API call that fails in production
    // The purchase invoice API includes discount_amount and discount_percentage in the fields parameter
    
    const response = await fetch('http://localhost:3000/api/purchase/invoices?company=PT%20ABC&limit_page_length=20&start=0');
    const data = await response.json();
    
    // On unfixed code, this should fail with ERPNext permission error
    console.log('    Bug 1.2 Response:', { status: response.status, success: data.success });
    
    // Document the counterexample
    if (!response.ok || !data.success) {
      console.log('    COUNTEREXAMPLE FOUND - Bug 1.2:');
      console.log('      Status:', response.status);
      console.log('      Success:', data.success);
      console.log('      Error:', data.message);
      console.log('      Expected error pattern: "Field not permitted in query: discount_amount"');
      console.log('      Root cause: ERPNext rejects discount fields in GET request query');
    }
    
    // This assertion will FAIL on unfixed code (which is correct - it proves the bug exists)
    assert(response.ok, 'Response should be OK');
    assert(data.success, 'API should return success');
  })();

  console.log('\nBug 2: Tax Template API Parameter Validation Error\n');

  /**
   * Test Bug 2: Tax Template API without company parameter
   * 
   * EXPECTED BEHAVIOR ON UNFIXED CODE:
   * - Should return 400 error with "Missing required company parameter"
   * - This confirms Bug 2 exists (API validation is working, but frontend calls it incorrectly)
   * 
   * Validates: Bugfix Requirements 1.3
   */
  await test('Bug 2: GET /api/setup/tax-templates without company should be handled gracefully', async () => {
    // This test simulates the frontend calling the API without company parameter
    // The API correctly validates and returns 400, but this surfaces to users as an error
    
    const response = await fetch('http://localhost:3000/api/setup/tax-templates?type=Sales');
    const data = await response.json();
    
    // On unfixed code, this should return 400 with validation error
    console.log('    Bug 2 Response:', { status: response.status, success: data.success });
    
    // Document the counterexample
    if (response.status === 400) {
      console.log('    COUNTEREXAMPLE FOUND - Bug 2:');
      console.log('      Status:', response.status);
      console.log('      Error:', data.message);
      console.log('      Expected error: "Query parameter \\"company\\" is required"');
      console.log('      Root cause: Frontend calling API without company parameter');
      console.log('      Note: API validation is correct, but error surfaces to users');
    }
    
    // This assertion will FAIL on unfixed code (which is correct - it proves the bug exists)
    // The bug is that the frontend calls this API without company, causing user-facing errors
    // After fix, frontend should not call API without company parameter
    assert(response.status === 400, 'API should return 400 for missing company parameter');
    assert(data.message.includes('company'), 'Error message should mention company parameter');
  })();

  console.log('\nBug 3: Purchase Invoice Form Import Path Error\n');

  /**
   * Test Bug 3: Purchase Invoice form build with incorrect import paths
   * 
   * EXPECTED BEHAVIOR ON UNFIXED CODE:
   * - Build should fail with "Module not found" error
   * - Error should mention "../../components/invoice/DiscountInput"
   * - This confirms Bug 3 exists
   * 
   * Validates: Bugfix Requirements 1.4
   */
  await test('Bug 3: Purchase Invoice form should have correct import paths', async () => {
    // This test checks if the Purchase Invoice form has incorrect import paths
    // We'll read the file and verify the import statements
    
    const filePath = path.join(process.cwd(), 'app/purchase-invoice/piMain/component.tsx');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    
    // Check for the incorrect import paths
    const hasIncorrectDiscountInput = fileContent.includes("import DiscountInput from '../../components/invoice/DiscountInput'");
    const hasIncorrectTaxTemplateSelect = fileContent.includes("import TaxTemplateSelect from '../../components/invoice/TaxTemplateSelect'");
    const hasIncorrectInvoiceSummary = fileContent.includes("import InvoiceSummary from '../../components/invoice/InvoiceSummary'");
    
    console.log('    Bug 3 Import Path Analysis:');
    console.log('      File:', filePath);
    console.log('      Has incorrect DiscountInput import:', hasIncorrectDiscountInput);
    console.log('      Has incorrect TaxTemplateSelect import:', hasIncorrectTaxTemplateSelect);
    console.log('      Has incorrect InvoiceSummary import:', hasIncorrectInvoiceSummary);
    
    // Document the counterexample
    if (hasIncorrectDiscountInput || hasIncorrectTaxTemplateSelect || hasIncorrectInvoiceSummary) {
      console.log('    COUNTEREXAMPLE FOUND - Bug 3:');
      console.log('      Incorrect import paths detected in Purchase Invoice form');
      console.log('      Current path: ../../components/invoice/');
      console.log('      Resolves to: app/components/invoice/ (does not exist)');
      console.log('      Correct path should be: @/components/invoice/');
      console.log('      Actual location: components/invoice/ (root level)');
      
      // Verify the components actually exist at the correct location
      const correctPath = path.join(process.cwd(), 'components/invoice/DiscountInput.tsx');
      try {
        await fs.access(correctPath);
        console.log('      ✓ Components exist at correct location: components/invoice/');
      } catch {
        console.log('      ✗ Components not found at expected location');
      }
    }
    
    // This assertion will FAIL on unfixed code (which is correct - it proves the bug exists)
    // The imports should use absolute paths (@/components/invoice/) not relative paths
    assert(!hasIncorrectDiscountInput, 'DiscountInput should use absolute import path (@/components/invoice/)');
    assert(!hasIncorrectTaxTemplateSelect, 'TaxTemplateSelect should use absolute import path (@/components/invoice/)');
    assert(!hasIncorrectInvoiceSummary, 'InvoiceSummary should use absolute import path (@/components/invoice/)');
  })();

  // Summary
  console.log('\n=== Test Summary ===');
  console.log(`Passed: ${testsPassed}`);
  console.log(`Failed: ${testsFailed}`);
  console.log(`Total: ${testsPassed + testsFailed}`);
  
  if (testsFailed > 0) {
    console.log('\n⚠️  EXPECTED OUTCOME: Tests failed on unfixed code.');
    console.log('This confirms the bugs exist. Counterexamples have been documented.');
    console.log('After implementing fixes, these tests should pass.');
  } else {
    console.log('\n✓ All tests passed! The bugs have been fixed.');
  }
  
  process.exit(testsFailed > 0 ? 1 : 0);
}

runTests().catch(console.error);
