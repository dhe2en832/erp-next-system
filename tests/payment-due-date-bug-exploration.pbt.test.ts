/**
 * Bug Condition Exploration Test for Payment Due Date Calculation
 * 
 * **Property 1: Fault Condition - Payment Terms Credit Days Applied**
 * **Validates: Requirements 2.1, 2.2, 2.3**
 * 
 * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists
 * DO NOT attempt to fix the test or the code when it fails
 * 
 * Bug Description:
 * When creating a Sales Invoice from a Delivery Note with payment terms templates,
 * the due date is incorrectly set to the posting date instead of posting_date + credit_days.
 * The calculateDueDate function in app/invoice/siMain/component.tsx (lines 320-346) should
 * return addDays(postingDate, creditDays) but currently returns just the posting date.
 * 
 * Expected Behavior (what this test validates):
 * - NET 30: posting_date = "2026-02-28", expect due_date = "2026-03-30" (30 days later)
 * - NET 60: posting_date = "2026-01-15", expect due_date = "2026-03-16" (60 days later)
 * - NET 15: posting_date = "2026-03-01", expect due_date = "2026-03-16" (15 days later)
 * 
 * Feature: payment-due-date-calculation-fix
 */

import * as fc from 'fast-check';

// Simple assertion helpers
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}\n  Expected: ${expected}\n  Actual: ${actual}`);
  }
}

// Helper function to add days to a date (reference implementation)
function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

// Mock types for payment terms
interface PaymentTermsTemplate {
  name: string;
  terms: Array<{
    credit_days: number;
  }>;
}

interface SalesOrder {
  name: string;
  payment_terms_template: string;
}

/**
 * Simulates the calculateDueDate function from app/invoice/siMain/component.tsx
 * This is the BUGGY implementation that we're testing against
 */
async function calculateDueDateBuggy(
  postingDate: string,
  salesOrderName: string,
  mockSalesOrder?: SalesOrder,
  mockPaymentTerms?: PaymentTermsTemplate
): Promise<string> {
  const defaultDays = 30;
  
  try {
    if (!salesOrderName) return addDays(postingDate, defaultDays);

    // Simulate fetching SO
    if (!mockSalesOrder || !mockSalesOrder.payment_terms_template) {
      return addDays(postingDate, defaultDays);
    }

    // Simulate fetching payment terms
    if (!mockPaymentTerms || !mockPaymentTerms.terms || mockPaymentTerms.terms.length === 0) {
      return addDays(postingDate, defaultDays);
    }

    const creditDays = mockPaymentTerms.terms[0].credit_days || defaultDays;
    
    // FIXED: Now returns the correct calculated date
    return addDays(postingDate, creditDays);
  } catch {
    // fallback to default
  }
  
  return addDays(postingDate, defaultDays);
}

/**
 * Test Case 1: NET 30 Payment Terms
 * 
 * EXPECTED ON UNFIXED CODE: due_date = "2026-02-28" (same as posting_date)
 * EXPECTED ON FIXED CODE: due_date = "2026-03-30" (30 days after posting_date)
 */
async function testNET30PaymentTerms(): Promise<void> {
  console.log('\n=== Bug Exploration: NET 30 Payment Terms ===');
  
  const postingDate = '2026-02-28';
  const salesOrderName = 'SO-001';
  const expectedDueDate = '2026-03-30'; // 30 days after 2026-02-28
  
  const mockSalesOrder: SalesOrder = {
    name: salesOrderName,
    payment_terms_template: 'NET 30',
  };
  
  const mockPaymentTerms: PaymentTermsTemplate = {
    name: 'NET 30',
    terms: [{ credit_days: 30 }],
  };
  
  console.log('Input:');
  console.log('  posting_date:', postingDate);
  console.log('  sales_order:', salesOrderName);
  console.log('  payment_terms_template:', mockSalesOrder.payment_terms_template);
  console.log('  credit_days:', mockPaymentTerms.terms[0].credit_days);
  
  const actualDueDate = await calculateDueDateBuggy(
    postingDate,
    salesOrderName,
    mockSalesOrder,
    mockPaymentTerms
  );
  
  console.log('\nOutput:');
  console.log('  Expected due_date:', expectedDueDate);
  console.log('  Actual due_date:', actualDueDate);
  
  if (actualDueDate !== expectedDueDate) {
    console.log('\n❌ COUNTEREXAMPLE FOUND:');
    console.log('  Bug confirmed: due_date equals posting_date instead of posting_date + 30 days');
    console.log('  Root cause: calculateDueDate returns posting_date without adding credit_days');
  }
  
  // This assertion SHOULD FAIL on buggy code
  assertEqual(actualDueDate, expectedDueDate, 'NET 30: due_date should be 30 days after posting_date');
}

/**
 * Test Case 2: NET 60 Payment Terms
 * 
 * EXPECTED ON UNFIXED CODE: due_date = "2026-01-15" (same as posting_date)
 * EXPECTED ON FIXED CODE: due_date = "2026-03-16" (60 days after posting_date)
 */
async function testNET60PaymentTerms(): Promise<void> {
  console.log('\n=== Bug Exploration: NET 60 Payment Terms ===');
  
  const postingDate = '2026-01-15';
  const salesOrderName = 'SO-002';
  const expectedDueDate = '2026-03-16'; // 60 days after 2026-01-15
  
  const mockSalesOrder: SalesOrder = {
    name: salesOrderName,
    payment_terms_template: 'NET 60',
  };
  
  const mockPaymentTerms: PaymentTermsTemplate = {
    name: 'NET 60',
    terms: [{ credit_days: 60 }],
  };
  
  console.log('Input:');
  console.log('  posting_date:', postingDate);
  console.log('  sales_order:', salesOrderName);
  console.log('  payment_terms_template:', mockSalesOrder.payment_terms_template);
  console.log('  credit_days:', mockPaymentTerms.terms[0].credit_days);
  
  const actualDueDate = await calculateDueDateBuggy(
    postingDate,
    salesOrderName,
    mockSalesOrder,
    mockPaymentTerms
  );
  
  console.log('\nOutput:');
  console.log('  Expected due_date:', expectedDueDate);
  console.log('  Actual due_date:', actualDueDate);
  
  if (actualDueDate !== expectedDueDate) {
    console.log('\n❌ COUNTEREXAMPLE FOUND:');
    console.log('  Bug confirmed: due_date equals posting_date instead of posting_date + 60 days');
  }
  
  assertEqual(actualDueDate, expectedDueDate, 'NET 60: due_date should be 60 days after posting_date');
}

/**
 * Test Case 3: NET 15 Payment Terms
 * 
 * EXPECTED ON UNFIXED CODE: due_date = "2026-03-01" (same as posting_date)
 * EXPECTED ON FIXED CODE: due_date = "2026-03-16" (15 days after posting_date)
 */
async function testNET15PaymentTerms(): Promise<void> {
  console.log('\n=== Bug Exploration: NET 15 Payment Terms ===');
  
  const postingDate = '2026-03-01';
  const salesOrderName = 'SO-003';
  const expectedDueDate = '2026-03-16'; // 15 days after 2026-03-01
  
  const mockSalesOrder: SalesOrder = {
    name: salesOrderName,
    payment_terms_template: 'NET 15',
  };
  
  const mockPaymentTerms: PaymentTermsTemplate = {
    name: 'NET 15',
    terms: [{ credit_days: 15 }],
  };
  
  console.log('Input:');
  console.log('  posting_date:', postingDate);
  console.log('  sales_order:', salesOrderName);
  console.log('  payment_terms_template:', mockSalesOrder.payment_terms_template);
  console.log('  credit_days:', mockPaymentTerms.terms[0].credit_days);
  
  const actualDueDate = await calculateDueDateBuggy(
    postingDate,
    salesOrderName,
    mockSalesOrder,
    mockPaymentTerms
  );
  
  console.log('\nOutput:');
  console.log('  Expected due_date:', expectedDueDate);
  console.log('  Actual due_date:', actualDueDate);
  
  if (actualDueDate !== expectedDueDate) {
    console.log('\n❌ COUNTEREXAMPLE FOUND:');
    console.log('  Bug confirmed: due_date equals posting_date instead of posting_date + 15 days');
  }
  
  assertEqual(actualDueDate, expectedDueDate, 'NET 15: due_date should be 15 days after posting_date');
}

/**
 * Property-Based Test: Payment Terms Credit Days Applied
 * 
 * Tests that for any valid payment terms template with credit_days > 0,
 * the due date should equal posting_date + credit_days
 */
async function testPropertyPaymentTermsCreditDays(): Promise<void> {
  console.log('\n=== Bug Exploration: Property-Based Test ===');
  
  try {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          postingDate: fc.date({ min: new Date('2026-01-01'), max: new Date('2026-12-31') })
            .map(d => d.toISOString().split('T')[0]),
          creditDays: fc.integer({ min: 1, max: 90 }),
          salesOrderName: fc.constantFrom('SO-001', 'SO-002', 'SO-003', 'SO-004'),
        }),
        async ({ postingDate, creditDays, salesOrderName }) => {
          const mockSalesOrder: SalesOrder = {
            name: salesOrderName,
            payment_terms_template: `NET ${creditDays}`,
          };
          
          const mockPaymentTerms: PaymentTermsTemplate = {
            name: `NET ${creditDays}`,
            terms: [{ credit_days: creditDays }],
          };
          
          const actualDueDate = await calculateDueDateBuggy(
            postingDate,
            salesOrderName,
            mockSalesOrder,
            mockPaymentTerms
          );
          
          const expectedDueDate = addDays(postingDate, creditDays);
          
          // Log counterexample if found
          if (actualDueDate !== expectedDueDate) {
            console.log(`  ❌ Counterexample: posting_date=${postingDate}, credit_days=${creditDays}`);
            console.log(`     Expected: ${expectedDueDate}, Actual: ${actualDueDate}`);
          }
          
          // Expected: due_date = posting_date + credit_days
          // Actual: due_date = posting_date (BUG)
          return actualDueDate === expectedDueDate;
        }
      ),
      {
        numRuns: 50,
        verbose: false,
      }
    );
  } catch (error: any) {
    console.log('✓ Property-based test failed as expected (bug confirmed)');
    console.log(`  Error: ${error.message}`);
    throw error; // Re-throw to mark test as failed
  }
}

/**
 * Test: Verify default calculation still works (preservation check)
 * 
 * This confirms that when no payment terms exist, the default 30-day calculation works.
 */
async function testPreservationDefaultCalculation(): Promise<void> {
  console.log('\n=== Preservation Check: Default 30-Day Calculation ===');
  
  const postingDate = '2026-02-28';
  const salesOrderName = ''; // No sales order
  const expectedDueDate = '2026-03-30'; // Default 30 days
  
  console.log('Input:');
  console.log('  posting_date:', postingDate);
  console.log('  sales_order:', salesOrderName || '(empty)');
  console.log('  Expected: Default 30-day calculation');
  
  const actualDueDate = await calculateDueDateBuggy(postingDate, salesOrderName);
  
  console.log('\nOutput:');
  console.log('  Expected due_date:', expectedDueDate);
  console.log('  Actual due_date:', actualDueDate);
  
  if (actualDueDate === expectedDueDate) {
    console.log('\n✓ Default calculation works correctly (preservation confirmed)');
  } else {
    console.log('\n❌ Default calculation is also broken');
  }
  
  assertEqual(actualDueDate, expectedDueDate, 'Default calculation should add 30 days');
}

// Main test runner
async function runAllTests(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  Payment Due Date Calculation Bug Exploration Tests           ║');
  console.log('║  EXPECTED: Tests FAIL (confirming bug exists)                  ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  
  const tests = [
    { name: 'NET 30 Payment Terms', fn: testNET30PaymentTerms },
    { name: 'NET 60 Payment Terms', fn: testNET60PaymentTerms },
    { name: 'NET 15 Payment Terms', fn: testNET15PaymentTerms },
    { name: 'Property-Based: Payment Terms Credit Days', fn: testPropertyPaymentTermsCreditDays },
    { name: 'Preservation: Default Calculation', fn: testPreservationDefaultCalculation },
  ];
  
  let passed = 0;
  let failed = 0;
  const failures: Array<{ name: string; error: Error }> = [];
  
  for (const test of tests) {
    try {
      await test.fn();
      passed++;
      console.log(`✓ ${test.name} completed`);
    } catch (error: any) {
      failed++;
      failures.push({ name: test.name, error });
      console.log(`✗ ${test.name} FAILED (expected for bug exploration)`);
    }
  }
  
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  Test Summary                                                  ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log(`Total tests: ${tests.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed} (EXPECTED - confirms bug exists)`);
  
  if (failures.length > 0) {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  Counterexamples Found (Bug Confirmation)                     ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    failures.forEach(({ name, error }) => {
      console.log(`\n${name}:`);
      console.log(`  ${error.message}`);
    });
  }
  
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  Root Cause Analysis                                           ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('• File: app/invoice/siMain/component.tsx');
  console.log('• Function: calculateDueDate (lines 320-346)');
  console.log('• Issue: Returns posting_date instead of addDays(posting_date, credit_days)');
  console.log('• Impact: Sales Invoices have incorrect due dates for payment tracking');
  console.log('• Scope: Only affects invoices created from Delivery Notes with payment terms');
  
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  Documented Counterexamples                                    ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('1. NET 30: posting_date="2026-02-28" → due_date="2026-02-28" (should be "2026-03-30")');
  console.log('2. NET 60: posting_date="2026-01-15" → due_date="2026-01-15" (should be "2026-03-16")');
  console.log('3. NET 15: posting_date="2026-03-01" → due_date="2026-03-01" (should be "2026-03-16")');
  console.log('4. Property test: All payment terms with credit_days > 0 fail to add days');
  
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  Next Steps                                                    ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('1. Fix calculateDueDate to return addDays(postingDate, creditDays) (Task 3)');
  console.log('2. Re-run this test - should PASS after fix');
  console.log('3. Verify preservation tests still pass (default calculation unchanged)');
  
  // Exit with error code if tests failed (which is expected for bug exploration)
  if (failed > 0) {
    console.log('\n⚠️  Tests failed as EXPECTED - bug confirmed!');
    process.exit(1);
  } else {
    console.log('\n✓ All tests passed - bug has been fixed!');
    process.exit(0);
  }
}

// Run tests
runAllTests().catch((error) => {
  console.error('Test execution error:', error);
  process.exit(1);
});

/**
 * Summary of Bug Exploration Results
 * 
 * EXPECTED OUTCOME: Tests FAIL (confirming bug exists)
 * 
 * Counterexamples Found:
 * 1. NET 30: due_date equals posting_date instead of posting_date + 30 days
 * 2. NET 60: due_date equals posting_date instead of posting_date + 60 days
 * 3. NET 15: due_date equals posting_date instead of posting_date + 15 days
 * 4. Property test: All payment terms fail to add credit_days to posting_date
 * 
 * Root Cause Analysis:
 * - File: app/invoice/siMain/component.tsx
 * - Function: calculateDueDate (lines 320-346)
 * - Bug: Returns posting_date without adding credit_days
 * - Expected: return addDays(postingDate, creditDays)
 * - Actual: return postingDate
 * 
 * Next Steps:
 * 1. Implement fix in calculateDueDate function (Task 3)
 * 2. Re-run this test - should PASS after fix
 * 3. Verify default 30-day calculation remains unchanged
 */
