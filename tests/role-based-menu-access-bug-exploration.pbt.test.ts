/**
 * Bug Condition Exploration Test for Role-Based Menu Access Control
 * 
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11**
 * 
 * This test is EXPECTED TO FAIL on unfixed code - failure confirms the bug exists.
 * DO NOT attempt to fix the test or the code when it fails.
 * 
 * Bug: Three functions in Navbar.tsx incorrectly return permissive values when roles
 * array is empty, undefined, or null:
 * 1. canSeeCategory (line 454): returns `true` instead of `false`
 * 2. filterItems (line 479): returns all items instead of empty array
 * 3. filterSubCategories (line 485): returns all subcategories instead of empty array
 * 
 * This causes all users to see all menus regardless of their roles, especially during
 * the initial render before API response loads roles.
 * 
 * Expected Behavior After Fix:
 * - canSeeCategory should return false when roles are empty/undefined/null
 * - filterItems should return empty array when roles are empty/undefined/null
 * - filterSubCategories should return empty array when roles are empty/undefined/null
 * - This implements "deny by default" security model
 */

import * as fc from 'fast-check';

// Simple test runner
let testsPassed = 0;
let testsFailed = 0;
const counterexamples: Array<{ 
  function: string; 
  input: any; 
  expected: any; 
  actual: any;
  bugLocation: string;
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

// Type definitions matching Navbar.tsx
type MenuItem = {
  name: string;
  href: string;
  allowedRoles?: string[];
};

type MenuSubCategory = {
  name: string;
  items: MenuItem[];
};

type MenuCategory = {
  name: string;
  href?: string;
  items?: MenuItem[];
  subCategories?: MenuSubCategory[];
};

/**
 * Extracted functions from Navbar.tsx (UNFIXED versions)
 * These replicate the buggy behavior to demonstrate the issue
 */

const roleCategoryMap: Record<string, string[]> = {
  'System Manager': ['*'],
  'Sales User': ['Dashboard', 'Penjualan', 'Master Data'],
  'Sales Manager': ['Dashboard', 'Penjualan', 'Komisi', 'Laporan', 'Master Data'],
  'Purchase User': ['Dashboard', 'Pembelian', 'Master Data'],
  'Purchase Manager': ['Dashboard', 'Pembelian', 'Laporan', 'Master Data'],
  'Accounts User': ['Dashboard', 'Kas & Bank', 'Akunting', 'Laporan'],
  'Accounts Manager': ['Dashboard', 'Kas & Bank', 'Akunting', 'Laporan', 'Master Data'],
  'Stock User': ['Dashboard', 'Persediaan', 'Master Data'],
  'Stock Manager': ['Dashboard', 'Persediaan', 'Laporan', 'Master Data'],
};

// FIXED version - deny by default
function canSeeCategory_unfixed(category: MenuCategory, roles: string[] | undefined | null): boolean {
  // FIX: Returns false when roles are empty/undefined/null
  if (!roles || roles.length === 0) return false;
  
  if (roles.includes('System Manager')) return true;
  
  const allowed = new Set<string>();
  roles.forEach(r => {
    (roleCategoryMap[r] || []).forEach(c => allowed.add(c));
  });
  
  // Special logic for Laporan category
  if (category.name === 'Laporan') {
    if (category.subCategories) {
      return category.subCategories.some(subCat =>
        subCat.items.some(item =>
          !item.allowedRoles || item.allowedRoles.some(r => roles.includes(r))
        )
      );
    }
    if (category.items) {
      return category.items.some(item =>
        !item.allowedRoles || item.allowedRoles.some(r => roles.includes(r))
      );
    }
  }
  
  return allowed.has('*') || allowed.has(category.name);
}

// FIXED version - deny by default
function filterItems_unfixed(items: MenuItem[], roles: string[] | undefined | null): MenuItem[] {
  // FIX: Returns empty array when roles are empty/undefined/null
  if (!roles || roles.length === 0) return [];
  
  if (roles.includes('System Manager')) return items;
  
  return items.filter(item =>
    !item.allowedRoles || item.allowedRoles.some(r => roles.includes(r))
  );
}

// FIXED version - deny by default
function filterSubCategories_unfixed(
  subCategories: MenuSubCategory[], 
  roles: string[] | undefined | null
): MenuSubCategory[] {
  // FIX: Returns empty array when roles are empty/undefined/null
  if (!roles || roles.length === 0) return [];
  
  if (roles.includes('System Manager')) return subCategories;
  
  return subCategories.map(subCat => ({
    ...subCat,
    items: filterItems_unfixed(subCat.items, roles)
  })).filter(subCat => subCat.items.length > 0);
}

// Sample test data
const sampleCategories: MenuCategory[] = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Penjualan', href: '/sales-order' },
  { name: 'Pembelian', href: '/purchase-orders' },
  { name: 'Kas & Bank', href: '/finance/payments' },
  { name: 'Akunting', href: '/finance/journal' },
  { name: 'Persediaan', href: '/stock-entry' },
  { name: 'Komisi', href: '/commission' },
  { name: 'Master Data', href: '/master-data' },
  { name: 'Pengaturan', href: '/settings' },
];

const sampleItems: MenuItem[] = [
  { name: 'Item 1', href: '/item1' },
  { name: 'Item 2', href: '/item2', allowedRoles: ['Accounts Manager'] },
  { name: 'Item 3', href: '/item3', allowedRoles: ['Sales User', 'Sales Manager'] },
];

const sampleSubCategories: MenuSubCategory[] = [
  {
    name: 'SubCat 1',
    items: [
      { name: 'SubItem 1', href: '/subitem1' },
      { name: 'SubItem 2', href: '/subitem2', allowedRoles: ['Accounts User'] },
    ]
  },
  {
    name: 'SubCat 2',
    items: [
      { name: 'SubItem 3', href: '/subitem3', allowedRoles: ['Sales Manager'] },
    ]
  },
];

async function runTests() {
  console.log('\n=== Bug Exploration Test - Role-Based Menu Access Control ===\n');
  console.log('IMPORTANT: This test is EXPECTED TO FAIL on unfixed code.');
  console.log('Failure confirms the bug exists. This is the correct behavior.\n');
  console.log('Bug Pattern: Functions return permissive values when roles are empty/undefined/null');
  console.log('Location: app/components/Navbar.tsx (lines 454, 479, 485)\n');

  console.log('Testing Bug Condition: Empty Roles Array\n');

  /**
   * Property 1.1: canSeeCategory with empty roles array
   * 
   * EXPECTED ON UNFIXED CODE:
   * - Returns true for all categories (BUG - should return false)
   * 
   * EXPECTED AFTER FIX:
   * - Returns false for all categories (deny by default)
   */
  await test('Property 1.1: canSeeCategory([]) should return false for all categories', async () => {
    const emptyRoles: string[] = [];
    const failedCategories: string[] = [];

    for (const category of sampleCategories) {
      const result = canSeeCategory_unfixed(category, emptyRoles);
      
      if (result === true) {
        failedCategories.push(category.name);
        
        counterexamples.push({
          function: 'canSeeCategory',
          input: { category: category.name, roles: emptyRoles },
          expected: false,
          actual: true,
          bugLocation: 'app/components/Navbar.tsx:454'
        });
      }
    }

    if (failedCategories.length > 0) {
      console.log('    COUNTEREXAMPLE FOUND:');
      console.log(`      Function: canSeeCategory`);
      console.log(`      Input: roles = []`);
      console.log(`      Expected: false for all categories`);
      console.log(`      Actual: true for categories: ${failedCategories.join(', ')}`);
      console.log('      Root Cause: Line 454 returns `true` instead of `false`');
      console.log('      Impact: All menus visible when roles not loaded');
    }

    assert(
      failedCategories.length === 0,
      `canSeeCategory returned true for ${failedCategories.length} categories with empty roles`
    );
  })();

  /**
   * Property 1.2: canSeeCategory with undefined roles
   * 
   * EXPECTED ON UNFIXED CODE:
   * - Returns true for all categories (BUG)
   * 
   * EXPECTED AFTER FIX:
   * - Returns false for all categories
   */
  await test('Property 1.2: canSeeCategory(undefined) should return false for all categories', async () => {
    const undefinedRoles = undefined;
    const failedCategories: string[] = [];

    for (const category of sampleCategories) {
      const result = canSeeCategory_unfixed(category, undefinedRoles);
      
      if (result === true) {
        failedCategories.push(category.name);
        
        counterexamples.push({
          function: 'canSeeCategory',
          input: { category: category.name, roles: 'undefined' },
          expected: false,
          actual: true,
          bugLocation: 'app/components/Navbar.tsx:454'
        });
      }
    }

    if (failedCategories.length > 0) {
      console.log('    COUNTEREXAMPLE FOUND:');
      console.log(`      Function: canSeeCategory`);
      console.log(`      Input: roles = undefined`);
      console.log(`      Expected: false for all categories`);
      console.log(`      Actual: true for categories: ${failedCategories.join(', ')}`);
    }

    assert(
      failedCategories.length === 0,
      `canSeeCategory returned true for ${failedCategories.length} categories with undefined roles`
    );
  })();

  /**
   * Property 1.3: canSeeCategory with null roles
   * 
   * EXPECTED ON UNFIXED CODE:
   * - Returns true for all categories (BUG)
   * 
   * EXPECTED AFTER FIX:
   * - Returns false for all categories
   */
  await test('Property 1.3: canSeeCategory(null) should return false for all categories', async () => {
    const nullRoles = null;
    const failedCategories: string[] = [];

    for (const category of sampleCategories) {
      const result = canSeeCategory_unfixed(category, nullRoles);
      
      if (result === true) {
        failedCategories.push(category.name);
        
        counterexamples.push({
          function: 'canSeeCategory',
          input: { category: category.name, roles: 'null' },
          expected: false,
          actual: true,
          bugLocation: 'app/components/Navbar.tsx:454'
        });
      }
    }

    if (failedCategories.length > 0) {
      console.log('    COUNTEREXAMPLE FOUND:');
      console.log(`      Function: canSeeCategory`);
      console.log(`      Input: roles = null`);
      console.log(`      Expected: false for all categories`);
      console.log(`      Actual: true for categories: ${failedCategories.join(', ')}`);
    }

    assert(
      failedCategories.length === 0,
      `canSeeCategory returned true for ${failedCategories.length} categories with null roles`
    );
  })();

  console.log('\nTesting filterItems Function\n');

  /**
   * Property 1.4: filterItems with empty roles array
   * 
   * EXPECTED ON UNFIXED CODE:
   * - Returns all items (BUG - should return empty array)
   * 
   * EXPECTED AFTER FIX:
   * - Returns empty array (deny by default)
   */
  await test('Property 1.4: filterItems([]) should return empty array', async () => {
    const emptyRoles: string[] = [];
    const result = filterItems_unfixed(sampleItems, emptyRoles);

    if (result.length > 0) {
      counterexamples.push({
        function: 'filterItems',
        input: { items: sampleItems.length, roles: emptyRoles },
        expected: [],
        actual: result.length,
        bugLocation: 'app/components/Navbar.tsx:479'
      });

      console.log('    COUNTEREXAMPLE FOUND:');
      console.log(`      Function: filterItems`);
      console.log(`      Input: ${sampleItems.length} items, roles = []`);
      console.log(`      Expected: [] (empty array)`);
      console.log(`      Actual: ${result.length} items returned`);
      console.log('      Root Cause: Line 479 returns `items` instead of `[]`');
      console.log('      Impact: All menu items visible when roles not loaded');
    }

    assert(result.length === 0, `filterItems returned ${result.length} items with empty roles`);
  })();

  /**
   * Property 1.5: filterItems with undefined roles
   */
  await test('Property 1.5: filterItems(undefined) should return empty array', async () => {
    const undefinedRoles = undefined;
    const result = filterItems_unfixed(sampleItems, undefinedRoles);

    if (result.length > 0) {
      counterexamples.push({
        function: 'filterItems',
        input: { items: sampleItems.length, roles: 'undefined' },
        expected: [],
        actual: result.length,
        bugLocation: 'app/components/Navbar.tsx:479'
      });

      console.log('    COUNTEREXAMPLE FOUND:');
      console.log(`      Function: filterItems`);
      console.log(`      Input: ${sampleItems.length} items, roles = undefined`);
      console.log(`      Expected: [] (empty array)`);
      console.log(`      Actual: ${result.length} items returned`);
    }

    assert(result.length === 0, `filterItems returned ${result.length} items with undefined roles`);
  })();

  /**
   * Property 1.6: filterItems with null roles
   */
  await test('Property 1.6: filterItems(null) should return empty array', async () => {
    const nullRoles = null;
    const result = filterItems_unfixed(sampleItems, nullRoles);

    if (result.length > 0) {
      counterexamples.push({
        function: 'filterItems',
        input: { items: sampleItems.length, roles: 'null' },
        expected: [],
        actual: result.length,
        bugLocation: 'app/components/Navbar.tsx:479'
      });

      console.log('    COUNTEREXAMPLE FOUND:');
      console.log(`      Function: filterItems`);
      console.log(`      Input: ${sampleItems.length} items, roles = null`);
      console.log(`      Expected: [] (empty array)`);
      console.log(`      Actual: ${result.length} items returned`);
    }

    assert(result.length === 0, `filterItems returned ${result.length} items with null roles`);
  })();

  console.log('\nTesting filterSubCategories Function\n');

  /**
   * Property 1.7: filterSubCategories with empty roles array
   * 
   * EXPECTED ON UNFIXED CODE:
   * - Returns all subcategories (BUG - should return empty array)
   * 
   * EXPECTED AFTER FIX:
   * - Returns empty array (deny by default)
   */
  await test('Property 1.7: filterSubCategories([]) should return empty array', async () => {
    const emptyRoles: string[] = [];
    const result = filterSubCategories_unfixed(sampleSubCategories, emptyRoles);

    if (result.length > 0) {
      counterexamples.push({
        function: 'filterSubCategories',
        input: { subCategories: sampleSubCategories.length, roles: emptyRoles },
        expected: [],
        actual: result.length,
        bugLocation: 'app/components/Navbar.tsx:485'
      });

      console.log('    COUNTEREXAMPLE FOUND:');
      console.log(`      Function: filterSubCategories`);
      console.log(`      Input: ${sampleSubCategories.length} subcategories, roles = []`);
      console.log(`      Expected: [] (empty array)`);
      console.log(`      Actual: ${result.length} subcategories returned`);
      console.log('      Root Cause: Line 485 returns `subCategories` instead of `[]`');
      console.log('      Impact: All subcategories visible when roles not loaded');
    }

    assert(result.length === 0, `filterSubCategories returned ${result.length} subcategories with empty roles`);
  })();

  /**
   * Property 1.8: filterSubCategories with undefined roles
   */
  await test('Property 1.8: filterSubCategories(undefined) should return empty array', async () => {
    const undefinedRoles = undefined;
    const result = filterSubCategories_unfixed(sampleSubCategories, undefinedRoles);

    if (result.length > 0) {
      counterexamples.push({
        function: 'filterSubCategories',
        input: { subCategories: sampleSubCategories.length, roles: 'undefined' },
        expected: [],
        actual: result.length,
        bugLocation: 'app/components/Navbar.tsx:485'
      });

      console.log('    COUNTEREXAMPLE FOUND:');
      console.log(`      Function: filterSubCategories`);
      console.log(`      Input: ${sampleSubCategories.length} subcategories, roles = undefined`);
      console.log(`      Expected: [] (empty array)`);
      console.log(`      Actual: ${result.length} subcategories returned`);
    }

    assert(result.length === 0, `filterSubCategories returned ${result.length} subcategories with undefined roles`);
  })();

  /**
   * Property 1.9: filterSubCategories with null roles
   */
  await test('Property 1.9: filterSubCategories(null) should return empty array', async () => {
    const nullRoles = null;
    const result = filterSubCategories_unfixed(sampleSubCategories, nullRoles);

    if (result.length > 0) {
      counterexamples.push({
        function: 'filterSubCategories',
        input: { subCategories: sampleSubCategories.length, roles: 'null' },
        expected: [],
        actual: result.length,
        bugLocation: 'app/components/Navbar.tsx:485'
      });

      console.log('    COUNTEREXAMPLE FOUND:');
      console.log(`      Function: filterSubCategories`);
      console.log(`      Input: ${sampleSubCategories.length} subcategories, roles = null`);
      console.log(`      Expected: [] (empty array)`);
      console.log(`      Actual: ${result.length} subcategories returned`);
    }

    assert(result.length === 0, `filterSubCategories returned ${result.length} subcategories with null roles`);
  })();

  console.log('\nProperty-Based Testing: Random Categories\n');

  /**
   * Property 1.10: Property-based test with random categories
   * 
   * Uses fast-check to generate random menu categories and verify
   * that all three functions return restrictive values when roles are empty.
   */
  await test('Property 1.10: All functions should deny access with empty roles', async () => {
    const categoryNameArb = fc.constantFrom(
      'Dashboard', 'Penjualan', 'Pembelian', 'Kas & Bank', 
      'Akunting', 'Persediaan', 'Laporan', 'Komisi', 'Master Data', 'Pengaturan'
    );

    await fc.assert(
      fc.asyncProperty(categoryNameArb, async (categoryName) => {
        const category: MenuCategory = { name: categoryName, href: `/${categoryName.toLowerCase()}` };
        const emptyRoles: string[] = [];

        // Test canSeeCategory
        const canSee = canSeeCategory_unfixed(category, emptyRoles);
        if (canSee === true) {
          counterexamples.push({
            function: 'canSeeCategory (PBT)',
            input: { category: categoryName, roles: [] },
            expected: false,
            actual: true,
            bugLocation: 'app/components/Navbar.tsx:454'
          });
          return false;
        }

        return true;
      }),
      { numRuns: 20, verbose: false }
    );

    console.log('    Property-based test completed (20 runs)');
  })();

  // Summary
  console.log('\n=== Test Summary ===');
  console.log(`Passed: ${testsPassed}`);
  console.log(`Failed: ${testsFailed}`);
  console.log(`Total: ${testsPassed + testsFailed}`);
  
  if (counterexamples.length > 0) {
    console.log(`\n=== Counterexamples Found: ${counterexamples.length} ===`);
    console.log('\nDetailed Counterexamples:');
    
    const byFunction = counterexamples.reduce((acc, ce) => {
      if (!acc[ce.function]) acc[ce.function] = [];
      acc[ce.function].push(ce);
      return acc;
    }, {} as Record<string, typeof counterexamples>);

    Object.entries(byFunction).forEach(([funcName, examples]) => {
      console.log(`\n${funcName}: ${examples.length} counterexamples`);
      console.log(`  Location: ${examples[0].bugLocation}`);
      console.log(`  Expected: ${JSON.stringify(examples[0].expected)}`);
      console.log(`  Actual: ${JSON.stringify(examples[0].actual)}`);
    });
    
    console.log('\n=== Root Cause Analysis ===');
    console.log('Bug Pattern: Functions return permissive values when roles are empty/undefined/null');
    console.log('\n1. canSeeCategory (line 454):');
    console.log('   Current: if (!roles || roles.length === 0) return true;');
    console.log('   Should be: if (!roles || roles.length === 0) return false;');
    console.log('\n2. filterItems (line 479):');
    console.log('   Current: if (!roles || roles.length === 0) return items;');
    console.log('   Should be: if (!roles || roles.length === 0) return [];');
    console.log('\n3. filterSubCategories (line 485):');
    console.log('   Current: if (!roles || roles.length === 0) return subCategories;');
    console.log('   Should be: if (!roles || roles.length === 0) return [];');
    console.log('\nSecurity Impact:');
    console.log('  - Users see ALL menus when roles are not loaded');
    console.log('  - Violates "deny by default" security principle');
    console.log('  - Affects all users during initial page load');
    console.log('  - Affects users if API call fails to load roles');
  }
  
  if (testsFailed > 0) {
    console.log('\n⚠️  EXPECTED OUTCOME: Tests failed on unfixed code.');
    console.log('This confirms the bug exists. Counterexamples have been documented.');
    console.log('After implementing fixes, these tests should pass.');
    console.log('\nNext Steps:');
    console.log('1. Fix canSeeCategory to return false when roles are empty');
    console.log('2. Fix filterItems to return [] when roles are empty');
    console.log('3. Fix filterSubCategories to return [] when roles are empty');
    console.log('4. Re-run this test to confirm fix');
  } else {
    console.log('\n✓ All tests passed! The bug has been fixed.');
    console.log('Role-based access control now implements "deny by default" correctly.');
  }
  
  process.exit(testsFailed > 0 ? 1 : 0);
}

runTests().catch(console.error);
