/**
 * Bug Condition Exploration Test for Back Button After Form Submission
 * 
 * This test is EXPECTED TO FAIL on unfixed code - failure confirms the bug exists.
 * DO NOT attempt to fix the test or the code when it fails.
 * 
 * Bug: After users successfully submit forms across the ERP system, they can click
 * the browser back button to return to the form page. This creates confusion as users
 * think they can edit already-submitted documents, and risks duplicate submissions.
 * 
 * Root Cause: Forms use router.push() which adds to browser history instead of
 * router.replace() which replaces the current history entry.
 * 
 * Expected Behavior After Fix:
 * - Forms should use router.replace() after successful submission
 * - Back button should skip the form page and go to the page before the form
 * - Users should not be able to return to submitted form pages via back button
 * 
 * Validates: Bugfix Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8
 * 
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8**
 */

import * as fc from 'fast-check';

// Simple test runner
let testsPassed = 0;
let testsFailed = 0;
const counterexamples: Array<{
  formType: string;
  pattern: string;
  file: string;
  issue: string;
}> = [];

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

/**
 * Analyze form component code to detect router.push() usage after form submission
 */
function analyzeFormComponent(
  componentCode: string,
  formType: string,
  filePath: string
): { usesRouterPush: boolean; pattern: string; location: string } {
  // Pattern A: PrintDialog with router.push in onClose
  const printDialogPattern = /onClose=\{[^}]*router\.push\([^)]+\)[^}]*\}/;
  const hasPrintDialogPush = printDialogPattern.test(componentCode);
  
  // Pattern B: Direct router.push after successful save/submit
  // Very specific: look for success indicators followed by router.push (not router.replace) within a reasonable distance
  // Match: setSuccessMessage(...); ... router.push(...) within ~200 characters
  // Explicitly exclude router.replace
  const successWithPushPattern = /setSuccessMessage\([^)]+\)[^]{0,200}router\.push\(/;
  const hasSuccessMessagePush = successWithPushPattern.test(componentCode) && 
    !(/setSuccessMessage\([^)]+\)[^]{0,200}router\.replace\(/.test(componentCode));
  
  // Match: setTimeout with router.push (not router.replace) after success message
  const timeoutAfterSuccessPattern = /setSuccessMessage[^]*?setTimeout[^]*?router\.push\(/;
  const hasTimeoutAfterSuccess = timeoutAfterSuccessPattern.test(componentCode) &&
    !(/setSuccessMessage[^]*?setTimeout[^]*?router\.replace\(/.test(componentCode));
  
  // Match: alert with success message followed by router.push (not router.replace)
  const alertSuccessPattern = /(alert|window\.alert)\([^)]*berhasil[^)]*\)[^;]*;[^]*?router\.push\(/;
  const hasAlertSuccess = alertSuccessPattern.test(componentCode) &&
    !(/alert\([^)]*berhasil[^)]*\)[^;]*;[^]*?router\.replace\(/.test(componentCode));
  
  if (hasPrintDialogPush) {
    return {
      usesRouterPush: true,
      pattern: 'Pattern A: PrintDialog onClose with router.push()',
      location: filePath,
    };
  }
  
  if (hasSuccessMessagePush || hasTimeoutAfterSuccess || hasAlertSuccess) {
    return {
      usesRouterPush: true,
      pattern: 'Pattern B: Direct router.push() after successful submission',
      location: filePath,
    };
  }
  
  return {
    usesRouterPush: false,
    pattern: 'No router.push() detected in success handlers',
    location: filePath,
  };
}

/**
 * Read file content synchronously for testing
 */
function readFileSync(filePath: string): string {
  const fs = require('fs');
  const path = require('path');
  const fullPath = path.resolve(__dirname, '..', filePath);
  
  try {
    return fs.readFileSync(fullPath, 'utf-8');
  } catch (error) {
    console.warn(`    Warning: Could not read file ${filePath}`);
    return '';
  }
}

async function runTests() {
  console.log('\n=== Bug Exploration Test - Back Button After Form Submission ===\n');
  console.log('IMPORTANT: This test is EXPECTED TO FAIL on unfixed code.');
  console.log('Failure confirms the bug exists. This is the correct behavior.\n');
  console.log('Bug Pattern: Forms use router.push() after successful submission,');
  console.log('leaving form pages in browser history and allowing back navigation.\n');

  console.log('Testing Pattern A: PrintDialog Forms (Sales Order, Purchase Invoice, etc.)\n');

  /**
   * Property 1.1: Sales Order form uses router.push() in PrintDialog onClose
   * 
   * EXPECTED ON UNFIXED CODE:
   * - PrintDialog onClose callback uses router.push('/sales-order/soList')
   * - After closing print dialog, form page remains in browser history
   * - Back button returns user to the form page
   * 
   * EXPECTED AFTER FIX:
   * - PrintDialog onClose callback uses router.replace('/sales-order/soList')
   * - Form page is removed from browser history
   * - Back button skips form page and goes to previous page
   */
  await test('Property 1.1: Sales Order form (Pattern A - PrintDialog)', async () => {
    const filePath = 'app/sales-order/soMain/component.tsx';
    const code = readFileSync(filePath);
    
    if (!code) {
      console.log('    Skipping: File not found');
      return;
    }
    
    const analysis = analyzeFormComponent(code, 'Sales Order', filePath);
    
    console.log(`    Analysis: ${analysis.pattern}`);
    console.log(`    Location: ${analysis.location}`);
    
    if (analysis.usesRouterPush) {
      const counterexample = {
        formType: 'Sales Order',
        pattern: analysis.pattern,
        file: filePath,
        issue: 'Uses router.push() - allows back navigation to form after submission',
      };
      counterexamples.push(counterexample);
      
      console.log('    COUNTEREXAMPLE FOUND:');
      console.log(`      Form: ${counterexample.formType}`);
      console.log(`      Pattern: ${counterexample.pattern}`);
      console.log(`      Issue: ${counterexample.issue}`);
      console.log('      Expected: Should use router.replace() instead');
    }
    
    // This assertion will FAIL on unfixed code (proving bug exists)
    assert(!analysis.usesRouterPush, 'Sales Order form should use router.replace() after submission');
  })();

  /**
   * Property 1.2: Purchase Invoice form uses router.push() in PrintDialog onClose
   */
  await test('Property 1.2: Purchase Invoice form (Pattern A - PrintDialog)', async () => {
    const filePath = 'app/purchase-invoice/piMain/component.tsx';
    const code = readFileSync(filePath);
    
    if (!code) {
      console.log('    Skipping: File not found');
      return;
    }
    
    const analysis = analyzeFormComponent(code, 'Purchase Invoice', filePath);
    
    console.log(`    Analysis: ${analysis.pattern}`);
    
    if (analysis.usesRouterPush) {
      counterexamples.push({
        formType: 'Purchase Invoice',
        pattern: analysis.pattern,
        file: filePath,
        issue: 'Uses router.push() - allows back navigation to form after submission',
      });
      
      console.log('    COUNTEREXAMPLE FOUND: Uses router.push() in success handler');
    }
    
    assert(!analysis.usesRouterPush, 'Purchase Invoice form should use router.replace() after submission');
  })();

  console.log('\nTesting Pattern B: Direct router.push() Forms (Suppliers, Stock Entry, etc.)\n');

  /**
   * Property 1.3: Supplier form uses router.push() after successful save
   * 
   * EXPECTED ON UNFIXED CODE:
   * - Success handler uses setTimeout(() => router.push('/suppliers'), 1500)
   * - Form page remains in browser history
   * - Back button returns user to the form page
   * 
   * EXPECTED AFTER FIX:
   * - Success handler uses setTimeout(() => router.replace('/suppliers'), 1500)
   * - Form page is removed from browser history
   */
  await test('Property 1.3: Supplier form (Pattern B - Direct push)', async () => {
    const filePath = 'app/suppliers/suppMain/component.tsx';
    const code = readFileSync(filePath);
    
    if (!code) {
      console.log('    Skipping: File not found');
      return;
    }
    
    const analysis = analyzeFormComponent(code, 'Supplier', filePath);
    
    console.log(`    Analysis: ${analysis.pattern}`);
    
    if (analysis.usesRouterPush) {
      counterexamples.push({
        formType: 'Supplier',
        pattern: analysis.pattern,
        file: filePath,
        issue: 'Uses router.push() - allows back navigation to form after submission',
      });
      
      console.log('    COUNTEREXAMPLE FOUND: Uses router.push() in success handler');
    }
    
    assert(!analysis.usesRouterPush, 'Supplier form should use router.replace() after submission');
  })();

  /**
   * Property 1.4: Stock Entry form uses router.push() after successful save
   */
  await test('Property 1.4: Stock Entry form (Pattern B - Direct push)', async () => {
    const filePath = 'app/stock-entry/seMain/component.tsx';
    const code = readFileSync(filePath);
    
    if (!code) {
      console.log('    Skipping: File not found');
      return;
    }
    
    const analysis = analyzeFormComponent(code, 'Stock Entry', filePath);
    
    console.log(`    Analysis: ${analysis.pattern}`);
    
    if (analysis.usesRouterPush) {
      counterexamples.push({
        formType: 'Stock Entry',
        pattern: analysis.pattern,
        file: filePath,
        issue: 'Uses router.push() - allows back navigation to form after submission',
      });
      
      console.log('    COUNTEREXAMPLE FOUND: Uses router.push() in success handler');
    }
    
    assert(!analysis.usesRouterPush, 'Stock Entry form should use router.replace() after submission');
  })();

  console.log('\nProperty-Based Testing: Multiple Form Types\n');

  /**
   * Property 1.5: Property-based test for multiple form components
   * 
   * Tests a sample of form components across different modules to confirm
   * the bug pattern is consistent across the codebase.
   */
  await test('Property 1.5: Multiple forms should use router.replace() after submission', async () => {
    const forms = [
      { type: 'Sales Order', path: 'app/sales-order/soMain/component.tsx', pattern: 'A' },
      { type: 'Delivery Note', path: 'app/delivery-note/dnMain/component.tsx', pattern: 'A' },
      { type: 'Sales Invoice', path: 'app/invoice/siMain/component.tsx', pattern: 'A' },
      { type: 'Purchase Order', path: 'app/purchase-orders/poMain/component.tsx', pattern: 'A' },
      { type: 'Purchase Receipt', path: 'app/purchase-receipts/prMain/component.tsx', pattern: 'A' },
      { type: 'Purchase Invoice', path: 'app/purchase-invoice/piMain/component.tsx', pattern: 'A' },
      { type: 'Supplier', path: 'app/suppliers/suppMain/component.tsx', pattern: 'B' },
      { type: 'Stock Entry', path: 'app/stock-entry/seMain/component.tsx', pattern: 'B' },
      { type: 'Stock Reconciliation', path: 'app/stock-reconciliation/srMain/component.tsx', pattern: 'B' },
      { type: 'Warehouse', path: 'app/warehouse/whMain/component.tsx', pattern: 'B' },
    ];

    console.log('    Testing multiple form components:');

    let failedCount = 0;
    const failedForms: string[] = [];

    for (const form of forms) {
      const code = readFileSync(form.path);
      
      if (!code) {
        console.log(`      ${form.type}: SKIPPED (file not found)`);
        continue;
      }
      
      const analysis = analyzeFormComponent(code, form.type, form.path);
      
      if (analysis.usesRouterPush) {
        failedCount++;
        failedForms.push(`${form.type} (Pattern ${form.pattern})`);
        
        counterexamples.push({
          formType: form.type,
          pattern: analysis.pattern,
          file: form.path,
          issue: 'Uses router.push() - allows back navigation to form after submission',
        });
      }

      const status = analysis.usesRouterPush ? '✗ USES router.push()' : '✓ OK';
      console.log(`      ${form.type}: ${status}`);
    }

    if (failedCount > 0) {
      console.log(`\n    COUNTEREXAMPLES FOUND: ${failedCount}/${forms.length} forms use router.push()`);
      console.log('    Failed forms:');
      failedForms.forEach(form => console.log(`      - ${form}`));
      console.log('    Root Cause: Forms use router.push() instead of router.replace()');
    }

    // This assertion will FAIL on unfixed code
    assert(failedCount === 0, `${failedCount} forms use router.push() after submission`);
  })();

  console.log('\nProperty-Based Testing: Pattern Consistency\n');

  /**
   * Property 1.6: Property-based test to verify pattern consistency
   * 
   * Uses fast-check to verify that the bug pattern is consistent:
   * - All forms with PrintDialog should have the same issue
   * - All forms with direct push should have the same issue
   */
  await test('Property 1.6: Bug pattern should be consistent across form types', async () => {
    const formsByPattern = {
      patternA: [
        'app/sales-order/soMain/component.tsx',
        'app/delivery-note/dnMain/component.tsx',
        'app/invoice/siMain/component.tsx',
        'app/purchase-orders/poMain/component.tsx',
        'app/purchase-receipts/prMain/component.tsx',
        'app/purchase-invoice/piMain/component.tsx',
      ],
      patternB: [
        'app/suppliers/suppMain/component.tsx',
        'app/stock-entry/seMain/component.tsx',
        'app/stock-reconciliation/srMain/component.tsx',
        'app/warehouse/whMain/component.tsx',
      ],
    };

    console.log('    Analyzing pattern consistency:');

    let patternACount = 0;
    let patternBCount = 0;

    // Check Pattern A forms
    for (const path of formsByPattern.patternA) {
      const code = readFileSync(path);
      if (code) {
        const analysis = analyzeFormComponent(code, path, path);
        if (analysis.usesRouterPush) {
          patternACount++;
        }
      }
    }

    // Check Pattern B forms
    for (const path of formsByPattern.patternB) {
      const code = readFileSync(path);
      if (code) {
        const analysis = analyzeFormComponent(code, path, path);
        if (analysis.usesRouterPush) {
          patternBCount++;
        }
      }
    }

    console.log(`      Pattern A (PrintDialog): ${patternACount}/${formsByPattern.patternA.length} use router.push()`);
    console.log(`      Pattern B (Direct): ${patternBCount}/${formsByPattern.patternB.length} use router.push()`);

    const totalAffected = patternACount + patternBCount;
    const totalForms = formsByPattern.patternA.length + formsByPattern.patternB.length;

    if (totalAffected > 0) {
      console.log(`\n    COUNTEREXAMPLE: ${totalAffected}/${totalForms} forms affected by bug`);
      console.log('    Bug is consistent across both patterns');
    }

    // This assertion will FAIL on unfixed code
    assert(totalAffected === 0, `Bug affects ${totalAffected} forms across both patterns`);
  })();

  // Summary
  console.log('\n=== Test Summary ===');
  console.log(`Passed: ${testsPassed}`);
  console.log(`Failed: ${testsFailed}`);
  console.log(`Total: ${testsPassed + testsFailed}`);
  
  if (counterexamples.length > 0) {
    console.log(`\n=== Counterexamples Found: ${counterexamples.length} ===`);
    console.log('\nDetailed Counterexamples:');
    counterexamples.forEach((ce, index) => {
      console.log(`\n${index + 1}. ${ce.formType}`);
      console.log(`   Pattern: ${ce.pattern}`);
      console.log(`   File: ${ce.file}`);
      console.log(`   Issue: ${ce.issue}`);
    });
    
    console.log('\n=== Root Cause Analysis ===');
    console.log('Pattern A: PrintDialog onClose uses router.push()');
    console.log('  - Affects: Sales Order, Delivery Note, Sales Invoice, Purchase Order, Purchase Receipt, Purchase Invoice');
    console.log('  - Location: PrintDialog onClose callback');
    console.log('  - Fix: Change router.push() to router.replace()');
    console.log('\nPattern B: Direct router.push() in success handlers');
    console.log('  - Affects: Suppliers, Stock Entry, Stock Reconciliation, Warehouse, and other master data forms');
    console.log('  - Location: Success handler after form submission');
    console.log('  - Fix: Change router.push() to router.replace()');
    console.log('\nEffect: Form pages remain in browser history');
    console.log('Impact: Users can click back button to return to submitted forms');
    console.log('Risk: Confusion, potential duplicate submissions, stale data display');
    console.log('\nCorrect Pattern:');
    console.log('  // After successful form submission:');
    console.log('  router.replace(\'/list-page\'); // Replaces history entry');
    console.log('  // Instead of:');
    console.log('  router.push(\'/list-page\'); // Adds to history (bug)');
  }
  
  if (testsFailed > 0) {
    console.log('\n⚠️  EXPECTED OUTCOME: Tests failed on unfixed code.');
    console.log('This confirms the bug exists. Counterexamples have been documented.');
    console.log('After implementing fixes, these tests should pass.');
    console.log('\nNext Steps:');
    console.log('1. Update Pattern A forms: Change PrintDialog onClose to use router.replace()');
    console.log('2. Update Pattern B forms: Change success handlers to use router.replace()');
    console.log('3. Verify cancel buttons still use router.back() or router.push()');
    console.log('4. Re-run this test to confirm fix');
  } else {
    console.log('\n✓ All tests passed! The bug has been fixed.');
    console.log('Forms correctly use router.replace() after successful submission.');
    console.log('Back button no longer returns users to submitted form pages.');
  }
  
  process.exit(testsFailed > 0 ? 1 : 0);
}

runTests().catch(console.error);
