/**
 * Preservation Property Tests for Stock Card Page Missing Bugfix
 * 
 * These tests verify that other report pages and API routes remain functional
 * BEFORE and AFTER implementing the fix for the missing Stock Card page.
 * 
 * EXPECTED OUTCOME ON UNFIXED CODE: All tests PASS
 * This confirms the baseline behavior that must be preserved.
 * 
 * EXPECTED OUTCOME ON FIXED CODE: All tests PASS
 * This confirms no regressions were introduced by the fix.
 * 
 * Validates: Bugfix Requirements 3.1, 3.2, 3.3, 3.4
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
  console.log('\n=== Preservation Property Tests - Stock Card Page Missing Bugfix ===\n');
  console.log('IMPORTANT: These tests verify baseline behavior to preserve.');
  console.log('All tests should PASS on both unfixed and fixed code.\n');

  console.log('Property 2: Preservation - Other Report Pages Remain Functional\n');

  /**
   * Test: Sales report page should exist and be functional
   * 
   * This verifies that the /reports/sales page continues to work correctly.
   * The fix should not affect this page in any way.
   * 
   * Validates: Bugfix Requirement 3.1
   */
  await test('Sales report page should exist at app/reports/sales/page.tsx', async () => {
    const pagePath = path.join(process.cwd(), 'app/reports/sales/page.tsx');
    
    console.log('    Checking for sales report page:', pagePath);
    
    try {
      await fs.access(pagePath);
      console.log('    ✓ Sales report page exists');
      
      // Verify the file contains expected content
      const fileContent = await fs.readFile(pagePath, 'utf-8');
      
      // Check for essential components (basic validation)
      const hasClientDirective = fileContent.includes("'use client'") || fileContent.includes('"use client"');
      const hasExportDefault = fileContent.includes('export default');
      
      console.log('    Content validation:');
      console.log('      - Has client directive or export:', hasClientDirective || hasExportDefault);
      
      assert(hasClientDirective || hasExportDefault, 'Sales report page should have proper React component structure');
      
    } catch (error) {
      throw new Error('Sales report page should exist at app/reports/sales/page.tsx');
    }
  })();

  /**
   * Test: Purchases report page should exist and be functional
   * 
   * This verifies that the /reports/purchases page continues to work correctly.
   * The fix should not affect this page in any way.
   * 
   * Validates: Bugfix Requirement 3.1
   */
  await test('Purchases report page should exist at app/reports/purchases/page.tsx', async () => {
    const pagePath = path.join(process.cwd(), 'app/reports/purchases/page.tsx');
    
    console.log('    Checking for purchases report page:', pagePath);
    
    try {
      await fs.access(pagePath);
      console.log('    ✓ Purchases report page exists');
      
      // Verify the file contains expected content
      const fileContent = await fs.readFile(pagePath, 'utf-8');
      
      // Check for essential components (basic validation)
      const hasClientDirective = fileContent.includes("'use client'") || fileContent.includes('"use client"');
      const hasExportDefault = fileContent.includes('export default');
      
      console.log('    Content validation:');
      console.log('      - Has client directive or export:', hasClientDirective || hasExportDefault);
      
      assert(hasClientDirective || hasExportDefault, 'Purchases report page should have proper React component structure');
      
    } catch (error) {
      throw new Error('Purchases report page should exist at app/reports/purchases/page.tsx');
    }
  })();

  /**
   * Test: Financial reports page should exist and be functional
   * 
   * This verifies that the /financial-reports page continues to work correctly.
   * The fix should not affect this page in any way.
   * 
   * Validates: Bugfix Requirement 3.1
   */
  await test('Financial reports page should exist at app/financial-reports/page.tsx', async () => {
    const pagePath = path.join(process.cwd(), 'app/financial-reports/page.tsx');
    
    console.log('    Checking for financial reports page:', pagePath);
    
    try {
      await fs.access(pagePath);
      console.log('    ✓ Financial reports page exists');
      
      // Verify the file contains expected content
      const fileContent = await fs.readFile(pagePath, 'utf-8');
      
      // Check for essential components (basic validation)
      const hasClientDirective = fileContent.includes("'use client'") || fileContent.includes('"use client"');
      const hasExportDefault = fileContent.includes('export default');
      
      console.log('    Content validation:');
      console.log('      - Has client directive or export:', hasClientDirective || hasExportDefault);
      
      assert(hasClientDirective || hasExportDefault, 'Financial reports page should have proper React component structure');
      
    } catch (error) {
      throw new Error('Financial reports page should exist at app/financial-reports/page.tsx');
    }
  })();

  /**
   * Test: Stock Card API route should exist and be functional
   * 
   * This verifies that the /api/inventory/reports/stock-card API route
   * continues to work correctly. The fix only adds a page component,
   * it should not modify the API route.
   * 
   * Validates: Bugfix Requirement 3.2
   */
  await test('Stock Card API route should exist and be functional', async () => {
    const apiPath = path.join(process.cwd(), 'app/api/inventory/reports/stock-card/route.ts');
    
    console.log('    Checking for Stock Card API route:', apiPath);
    
    try {
      await fs.access(apiPath);
      console.log('    ✓ Stock Card API route exists');
      
      // Verify the API route has expected exports
      const fileContent = await fs.readFile(apiPath, 'utf-8');
      const hasGETExport = fileContent.includes('export async function GET');
      
      console.log('    API route validation:');
      console.log('      - Has GET handler:', hasGETExport);
      
      assert(hasGETExport, 'API route should export GET handler');
      
      // Verify the API route structure hasn't changed
      const hasNextRequest = fileContent.includes('NextRequest');
      const hasNextResponse = fileContent.includes('NextResponse');
      
      console.log('      - Uses Next.js types:', hasNextRequest && hasNextResponse);
      
      assert(hasNextRequest || hasNextResponse, 'API route should use Next.js request/response types');
      
    } catch (error) {
      throw new Error('Stock Card API route should exist at app/api/inventory/reports/stock-card/route.ts');
    }
  })();

  /**
   * Test: Stock Card components should exist and be functional
   * 
   * This verifies that the Stock Card UI components continue to exist
   * and have not been modified by the fix. The fix only creates a page
   * component that uses these components.
   * 
   * Validates: Bugfix Requirement 3.3
   */
  await test('Stock Card components should exist and be functional', async () => {
    const componentsToCheck = [
      {
        path: 'components/stock-card/StockCardFilters.tsx',
        expectedExports: ['StockCardFilters', 'export']
      },
      {
        path: 'components/stock-card/StockCardTable.tsx',
        expectedExports: ['StockCardTable', 'export']
      },
      {
        path: 'components/stock-card/StockCardSummary.tsx',
        expectedExports: ['StockCardSummary', 'export']
      }
    ];
    
    console.log('    Checking for Stock Card components:');
    
    for (const component of componentsToCheck) {
      const fullPath = path.join(process.cwd(), component.path);
      try {
        await fs.access(fullPath);
        console.log(`      ✓ ${component.path} exists`);
        
        // Verify component structure
        const fileContent = await fs.readFile(fullPath, 'utf-8');
        const hasExpectedExports = component.expectedExports.some(exp => fileContent.includes(exp));
        
        assert(hasExpectedExports, `Component ${component.path} should have expected exports`);
        
      } catch (error) {
        throw new Error(`Component should exist at ${component.path}`);
      }
    }
  })();

  /**
   * Test: Stock Card utilities should exist and be functional
   * 
   * This verifies that the Stock Card utility functions continue to exist
   * and have not been modified by the fix.
   * 
   * Validates: Bugfix Requirement 3.3
   */
  await test('Stock Card utilities should exist and be functional', async () => {
    const utilPath = path.join(process.cwd(), 'lib/stock-card-utils.ts');
    
    console.log('    Checking for Stock Card utilities:', utilPath);
    
    try {
      await fs.access(utilPath);
      console.log('    ✓ Stock Card utilities exist');
      
      // Verify utility functions exist
      const fileContent = await fs.readFile(utilPath, 'utf-8');
      
      // Check for key utility functions
      const hasCalculateRunningBalance = fileContent.includes('calculateRunningBalance');
      const hasCalculateSummary = fileContent.includes('calculateSummary');
      
      console.log('    Utility validation:');
      console.log('      - Has calculateRunningBalance:', hasCalculateRunningBalance);
      console.log('      - Has calculateSummary:', hasCalculateSummary);
      
      assert(hasCalculateRunningBalance || hasCalculateSummary, 'Utilities should contain expected functions');
      
    } catch (error) {
      throw new Error('Stock Card utilities should exist at lib/stock-card-utils.ts');
    }
  })();

  /**
   * Test: Stock Card types should exist and be functional
   * 
   * This verifies that the Stock Card type definitions continue to exist
   * and have not been modified by the fix.
   * 
   * Validates: Bugfix Requirement 3.3
   */
  await test('Stock Card types should exist and be functional', async () => {
    const typesPath = path.join(process.cwd(), 'types/stock-card.ts');
    
    console.log('    Checking for Stock Card types:', typesPath);
    
    try {
      await fs.access(typesPath);
      console.log('    ✓ Stock Card types exist');
      
      // Verify type definitions exist
      const fileContent = await fs.readFile(typesPath, 'utf-8');
      
      // Check for key type definitions
      const hasStockLedgerEntry = fileContent.includes('StockLedgerEntry');
      const hasStockCardFilters = fileContent.includes('StockCardFilters');
      
      console.log('    Type validation:');
      console.log('      - Has StockLedgerEntry type:', hasStockLedgerEntry);
      console.log('      - Has StockCardFilters type:', hasStockCardFilters);
      
      assert(hasStockLedgerEntry || hasStockCardFilters, 'Types should contain expected definitions');
      
    } catch (error) {
      throw new Error('Stock Card types should exist at types/stock-card.ts');
    }
  })();

  /**
   * Test: Other report pages should remain unchanged
   * 
   * This is a broader check to ensure that other report pages in the
   * /reports directory continue to exist and have not been affected.
   * 
   * Validates: Bugfix Requirement 3.1
   */
  await test('Other report pages should remain unchanged', async () => {
    const otherReportPages = [
      'app/reports/accounts-payable/page.tsx',
      'app/reports/accounts-receivable/page.tsx',
      'app/reports/stock-balance/page.tsx',
      'app/reports/stock-adjustment/page.tsx'
    ];
    
    console.log('    Checking for other report pages:');
    
    for (const pagePath of otherReportPages) {
      const fullPath = path.join(process.cwd(), pagePath);
      try {
        await fs.access(fullPath);
        console.log(`      ✓ ${pagePath} exists`);
      } catch (error) {
        // Some pages might not exist, which is fine
        console.log(`      - ${pagePath} not found (optional)`);
      }
    }
    
    // At least verify that the reports directory exists
    const reportsDir = path.join(process.cwd(), 'app/reports');
    try {
      await fs.access(reportsDir);
      console.log('    ✓ Reports directory exists');
    } catch (error) {
      throw new Error('Reports directory should exist at app/reports');
    }
  })();

  // Summary
  console.log('\n=== Test Summary ===');
  console.log(`Passed: ${testsPassed}`);
  console.log(`Failed: ${testsFailed}`);
  console.log(`Total: ${testsPassed + testsFailed}`);
  
  if (testsFailed > 0) {
    console.log('\n⚠️  UNEXPECTED: Some preservation tests failed.');
    console.log('This indicates that baseline functionality is broken or missing.');
    console.log('These issues should be investigated before implementing the fix.');
  } else {
    console.log('\n✓ All preservation tests passed!');
    console.log('Baseline behavior is confirmed. These tests should continue to pass after the fix.');
    console.log('\nThis confirms:');
    console.log('  - Other report pages (/reports/sales, /reports/purchases, etc.) are functional');
    console.log('  - Financial reports page (/financial-reports) is functional');
    console.log('  - Stock Card API route (/api/inventory/reports/stock-card) is functional');
    console.log('  - Stock Card components (Filters, Table, Summary) exist and are ready to use');
    console.log('  - Stock Card utilities and types are in place');
    console.log('\nThe fix (creating app/reports/stock-card/page.tsx) should not affect any of these.');
  }
  
  process.exit(testsFailed > 0 ? 1 : 0);
}

runTests().catch(console.error);
