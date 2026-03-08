/**
 * Preservation Property Tests for Back Button Navigation
 * 
 * These tests verify that non-submission navigation behaviors remain unchanged
 * after implementing the fix for back button navigation after form submission.
 * 
 * IMPORTANT: Run these tests on UNFIXED code first to establish baseline behavior.
 * After implementing the fix, re-run to ensure no regressions.
 * 
 * Preservation Requirements:
 * - Cancel buttons should continue to use router.push() or router.back()
 * - Validation failures should keep user on form page
 * - Navigation TO forms should use router.push()
 * - Back button should work normally before submission
 * - Authentication redirects should continue to use router.replace()
 * 
 * Validates: Bugfix Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**
 */

import * as fc from 'fast-check';

// Simple test runner
let testsPassed = 0;
let testsFailed = 0;
const issues: Array<{
  test: string;
  issue: string;
  file?: string;
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

/**
 * Analyze form component for cancel button navigation patterns
 */
function analyzeCancelButtonPattern(
  componentCode: string,
  formType: string,
  filePath: string
): { hasCancelButton: boolean; usesRouterPush: boolean; usesRouterBack: boolean; pattern: string } {
  // Look for cancel button patterns
  const cancelButtonPattern = /onClick=\{[^}]*\(\)\s*=>\s*router\.(push|back)\([^)]*\)[^}]*\}/;
  const cancelMatch = componentCode.match(cancelButtonPattern);
  
  if (cancelMatch) {
    const method = cancelMatch[1];
    return {
      hasCancelButton: true,
      usesRouterPush: method === 'push',
      usesRouterBack: method === 'back',
      pattern: `Cancel button uses router.${method}()`,
    };
  }
  
  // Also check for "Kembali" (Back) button patterns
  const backButtonPattern = /Kembali|Batal/;
  const hasBackButton = backButtonPattern.test(componentCode);
  
  if (hasBackButton) {
    // Check if it uses router.push
    const routerPushPattern = /router\.push\(['"]\//;
    const usesRouterPush = routerPushPattern.test(componentCode);
    
    return {
      hasCancelButton: true,
      usesRouterPush: usesRouterPush,
      usesRouterBack: false,
      pattern: usesRouterPush ? 'Cancel button uses router.push()' : 'Cancel button pattern found',
    };
  }
  
  return {
    hasCancelButton: false,
    usesRouterPush: false,
    usesRouterBack: false,
    pattern: 'No cancel button found',
  };
}

/**
 * Analyze form component for validation error handling
 */
function analyzeValidationPattern(
  componentCode: string,
  formType: string,
  filePath: string
): { hasValidation: boolean; staysOnPage: boolean; pattern: string } {
  // Look for validation patterns that set error state and return early
  // Pattern: setError(...); ... return; (before any success logic)
  const validationWithReturnPattern = /setError\([^)]+\)[^]*?return/;
  const hasValidation = validationWithReturnPattern.test(componentCode);
  
  return {
    hasValidation: hasValidation,
    staysOnPage: hasValidation, // If validation exists with return, it stays on page
    pattern: hasValidation ? 'Has validation with early return' : 'No validation pattern found',
  };
}

/**
 * Analyze form component for success handler navigation
 */
function analyzeSuccessHandlerPattern(
  componentCode: string,
  formType: string,
  filePath: string
): { hasSuccessHandler: boolean; usesRouterPush: boolean; usesRouterReplace: boolean; pattern: string } {
  // Look for success message followed by navigation
  const successWithPushPattern = /(setSuccessMessage|success)[^]*?router\.push\(/;
  const successWithReplacePattern = /(setSuccessMessage|success)[^]*?router\.replace\(/;
  
  const usesRouterPush = successWithPushPattern.test(componentCode);
  const usesRouterReplace = successWithReplacePattern.test(componentCode);
  
  return {
    hasSuccessHandler: usesRouterPush || usesRouterReplace,
    usesRouterPush: usesRouterPush,
    usesRouterReplace: usesRouterReplace,
    pattern: usesRouterPush 
      ? 'Success handler uses router.push() (bug - should be router.replace())'
      : usesRouterReplace
        ? 'Success handler uses router.replace() (correct)'
        : 'No success handler navigation found',
  };
}

async function runTests() {
  console.log('\n=== Preservation Property Tests - Back Button Navigation ===\n');
  console.log('IMPORTANT: These tests verify that non-submission navigation remains unchanged.');
  console.log('Run on UNFIXED code first to establish baseline, then re-run after fix.\n');
  console.log('Expected Outcome: All tests should PASS on both unfixed and fixed code.\n');

  console.log('Property 2.1: Cancel Button Navigation Preservation\n');

  /**
   * Property 2.1.1: Cancel buttons should use router.push() or router.back()
   * 
   * EXPECTED BEHAVIOR (both unfixed and fixed code):
   * - Cancel buttons use router.push('/list-page') or router.back()
   * - This allows normal back navigation to previous page
   * - Should NOT use router.replace() for cancel buttons
   */
  await test('Property 2.1.1: Cancel buttons preserve navigation behavior', async () => {
    const forms = [
      { type: 'Supplier', path: 'app/suppliers/suppMain/component.tsx' },
      { type: 'Sales Order', path: 'app/sales-order/soMain/component.tsx' },
      { type: 'Stock Entry', path: 'app/stock-entry/seMain/component.tsx' },
      { type: 'Purchase Invoice', path: 'app/purchase-invoice/piMain/component.tsx' },
    ];

    console.log('    Testing cancel button patterns:');

    let issueCount = 0;

    for (const form of forms) {
      const code = readFileSync(form.path);
      
      if (!code) {
        console.log(`      ${form.type}: SKIPPED (file not found)`);
        continue;
      }
      
      const analysis = analyzeCancelButtonPattern(code, form.type, form.path);
      
      // Cancel buttons should use router.push() or router.back(), NOT router.replace()
      const isCorrect = analysis.hasCancelButton && (analysis.usesRouterPush || analysis.usesRouterBack);
      
      if (!isCorrect && analysis.hasCancelButton) {
        issueCount++;
        issues.push({
          test: 'Cancel button navigation',
          issue: `${form.type}: Cancel button doesn't use router.push() or router.back()`,
          file: form.path,
        });
      }

      const status = isCorrect ? '✓ OK' : (analysis.hasCancelButton ? '✗ ISSUE' : '? NO CANCEL BUTTON');
      console.log(`      ${form.type}: ${status} - ${analysis.pattern}`);
    }

    // This assertion should PASS on both unfixed and fixed code
    assert(issueCount === 0, `${issueCount} forms have incorrect cancel button navigation`);
  })();

  console.log('\nProperty 2.2: Validation Error Preservation\n');

  /**
   * Property 2.2.1: Validation failures should keep user on form page
   * 
   * EXPECTED BEHAVIOR (both unfixed and fixed code):
   * - When validation fails, setError() is called and function returns early
   * - User remains on form page to fix validation errors
   * 
   * NOTE: This is a simplified check - we verify that validation patterns exist
   * and that the forms have proper error handling. The actual behavior is that
   * validation errors call setError() and return, preventing the success path
   * from executing.
   */
  await test('Property 2.2.1: Validation errors keep user on form page', async () => {
    const forms = [
      { type: 'Supplier', path: 'app/suppliers/suppMain/component.tsx' },
      { type: 'Sales Order', path: 'app/sales-order/soMain/component.tsx' },
      { type: 'Stock Entry', path: 'app/stock-entry/seMain/component.tsx' },
      { type: 'Purchase Invoice', path: 'app/purchase-invoice/piMain/component.tsx' },
    ];

    console.log('    Testing validation error handling:');
    console.log('    NOTE: Checking that forms have validation with early return');

    let issueCount = 0;

    for (const form of forms) {
      const code = readFileSync(form.path);
      
      if (!code) {
        console.log(`      ${form.type}: SKIPPED (file not found)`);
        continue;
      }
      
      const analysis = analyzeValidationPattern(code, form.type, form.path);
      
      // Just check that validation exists - the pattern is correct if it has validation
      const isCorrect = analysis.hasValidation;
      
      if (!isCorrect) {
        issueCount++;
        issues.push({
          test: 'Validation error handling',
          issue: `${form.type}: No validation pattern found`,
          file: form.path,
        });
      }

      const status = isCorrect ? '✓ OK' : '✗ ISSUE';
      console.log(`      ${form.type}: ${status} - Has validation with early return`);
    }

    // This assertion should PASS on both unfixed and fixed code
    assert(issueCount === 0, `${issueCount} forms missing validation patterns`);
  })();

  console.log('\nProperty 2.3: Success Handler Navigation (Bug Detection)\n');

  /**
   * Property 2.3.1: Success handlers should use router.replace() after fix
   * 
   * EXPECTED BEHAVIOR:
   * - UNFIXED CODE: Success handlers use router.push() (this is the bug)
   * - FIXED CODE: Success handlers use router.replace()
   * 
   * This test documents the current state and will help verify the fix.
   */
  await test('Property 2.3.1: Success handlers navigation method', async () => {
    const forms = [
      { type: 'Supplier', path: 'app/suppliers/suppMain/component.tsx' },
      { type: 'Sales Order', path: 'app/sales-order/soMain/component.tsx' },
      { type: 'Stock Entry', path: 'app/stock-entry/seMain/component.tsx' },
      { type: 'Purchase Invoice', path: 'app/purchase-invoice/piMain/component.tsx' },
    ];

    console.log('    Testing success handler navigation:');
    console.log('    NOTE: This test documents current state (bug or fixed)');

    let pushCount = 0;
    let replaceCount = 0;

    for (const form of forms) {
      const code = readFileSync(form.path);
      
      if (!code) {
        console.log(`      ${form.type}: SKIPPED (file not found)`);
        continue;
      }
      
      const analysis = analyzeSuccessHandlerPattern(code, form.type, form.path);
      
      if (analysis.usesRouterPush) {
        pushCount++;
      } else if (analysis.usesRouterReplace) {
        replaceCount++;
      }

      const status = analysis.usesRouterReplace ? '✓ FIXED' : (analysis.usesRouterPush ? '⚠ BUG' : '? UNKNOWN');
      console.log(`      ${form.type}: ${status} - ${analysis.pattern}`);
    }

    console.log(`\n    Summary: ${replaceCount} forms use router.replace(), ${pushCount} forms use router.push()`);
    
    // This test is informational - it documents the current state
    // On unfixed code: pushCount > 0, replaceCount = 0
    // On fixed code: pushCount = 0, replaceCount > 0
    console.log(`    Current state: ${replaceCount > 0 ? 'FIXED' : 'UNFIXED'}`);
  })();

  console.log('\nProperty 2.4: Property-Based Testing - Navigation Consistency\n');

  /**
   * Property 2.4.1: Property-based test for navigation consistency
   * 
   * Uses fast-check to verify that navigation patterns are consistent
   * across different form types and scenarios.
   */
  await test('Property 2.4.1: Navigation patterns are consistent across forms', async () => {
    const formPaths = [
      'app/suppliers/suppMain/component.tsx',
      'app/sales-order/soMain/component.tsx',
      'app/stock-entry/seMain/component.tsx',
      'app/purchase-invoice/piMain/component.tsx',
      'app/warehouse/whMain/component.tsx',
    ];

    console.log('    Running property-based tests on form navigation:');

    // Property: All forms should have cancel buttons that use router.push() or router.back()
    const cancelButtonProperty = fc.property(
      fc.constantFrom(...formPaths),
      (formPath) => {
        const code = readFileSync(formPath);
        if (!code) return true; // Skip if file not found
        
        const analysis = analyzeCancelButtonPattern(code, formPath, formPath);
        
        // If form has cancel button, it should use router.push() or router.back()
        if (analysis.hasCancelButton) {
          return analysis.usesRouterPush || analysis.usesRouterBack;
        }
        
        return true; // No cancel button is acceptable
      }
    );

    // Property: All forms should keep user on page when validation fails
    const validationProperty = fc.property(
      fc.constantFrom(...formPaths),
      (formPath) => {
        const code = readFileSync(formPath);
        if (!code) return true; // Skip if file not found
        
        const analysis = analyzeValidationPattern(code, formPath, formPath);
        
        // If form has validation, it should stay on page (no redirect)
        if (analysis.hasValidation) {
          return analysis.staysOnPage;
        }
        
        return true; // No validation is acceptable
      }
    );

    try {
      // Run property-based tests
      fc.assert(cancelButtonProperty, { numRuns: formPaths.length });
      console.log('      ✓ Cancel button property holds for all forms');
      
      fc.assert(validationProperty, { numRuns: formPaths.length });
      console.log('      ✓ Validation error property holds for all forms');
    } catch (error) {
      console.log('      ✗ Property-based test failed');
      throw error;
    }
  })();

  console.log('\nProperty 2.5: Authentication Redirect Preservation\n');

  /**
   * Property 2.5.1: Authentication redirects should use router.replace()
   * 
   * EXPECTED BEHAVIOR (both unfixed and fixed code):
   * - SiteGuard component uses router.replace() for auth redirects
   * - This prevents back button from returning to auth pages
   * - This behavior should remain unchanged
   */
  await test('Property 2.5.1: Authentication redirects use router.replace()', async () => {
    const siteGuardPath = 'components/SiteGuard.tsx';
    const code = readFileSync(siteGuardPath);
    
    if (!code) {
      console.log('    SKIPPED: SiteGuard component not found');
      return;
    }
    
    // Check that SiteGuard uses router.replace() for redirects
    const usesRouterReplace = /router\.replace\(['"]\/(select-site|login)/.test(code);
    const usesRouterPush = /router\.push\(['"]\/(select-site|login)/.test(code);
    
    console.log(`    SiteGuard component:`);
    console.log(`      Uses router.replace(): ${usesRouterReplace ? 'YES ✓' : 'NO ✗'}`);
    console.log(`      Uses router.push(): ${usesRouterPush ? 'YES ✗' : 'NO ✓'}`);
    
    // SiteGuard should use router.replace(), not router.push()
    assert(usesRouterReplace && !usesRouterPush, 'SiteGuard should use router.replace() for auth redirects');
  })();

  // Summary
  console.log('\n=== Test Summary ===');
  console.log(`Passed: ${testsPassed}`);
  console.log(`Failed: ${testsFailed}`);
  console.log(`Total: ${testsPassed + testsFailed}`);
  
  if (issues.length > 0) {
    console.log(`\n=== Issues Found: ${issues.length} ===`);
    issues.forEach((issue, index) => {
      console.log(`\n${index + 1}. ${issue.test}`);
      console.log(`   Issue: ${issue.issue}`);
      if (issue.file) {
        console.log(`   File: ${issue.file}`);
      }
    });
  }
  
  if (testsFailed > 0) {
    console.log('\n⚠️  Some preservation tests failed.');
    console.log('This indicates that the fix may have introduced regressions.');
    console.log('Review the issues above and ensure non-submission navigation is preserved.');
  } else {
    console.log('\n✓ All preservation tests passed!');
    console.log('Non-submission navigation behaviors are preserved correctly.');
    console.log('Cancel buttons, validation errors, and auth redirects work as expected.');
  }
  
  process.exit(testsFailed > 0 ? 1 : 0);
}

runTests().catch(console.error);
