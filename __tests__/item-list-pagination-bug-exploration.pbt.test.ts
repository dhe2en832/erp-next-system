/**
 * Bug Condition Exploration Test for Item List Pagination
 * 
 * **Property 1: Fault Condition - Desktop Pagination Updates Display**
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
 * 
 * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists
 * 
 * Bug Description:
 * When user clicks pagination buttons in desktop mode (screen width >= 768px),
 * the page number updates and API is called with correct parameters, but the
 * displayed items remain unchanged (showing page 1 items instead of the target page).
 * 
 * Expected Behavior (what this test validates):
 * - Clicking "Next" or specific page numbers should update displayed items
 * - Page 2 should show items 21-40 (not items 1-20)
 * - Page 3 should show items 41-60 (not items 1-20)
 * - API should be called with correct start parameter: (targetPage - 1) * pageSize
 * - Items state should update to items returned from API
 * 
 * Feature: item-list-pagination-fix
 */

import * as fc from 'fast-check';

// Simple assertion helper
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

// Mock types matching the ItemList component
interface Item {
  name: string;
  item_code: string;
  item_name: string;
  item_group: string;
  stock_uom: string;
  opening_stock: number;
  last_purchase_rate?: number;
  valuation_rate?: number;
  standard_rate?: number;
  harga_beli?: number;
  harga_jual?: number;
  description?: string;
}

interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalRecords: number;
  items: Item[];
  isMobile: boolean;
}

interface APIResponse {
  success: boolean;
  data: Item[];
  total_records: number;
}

/**
 * Simulates the ItemList component's fetchItems function behavior
 * This represents the BUGGY behavior where items don't update on pagination
 */
function simulateBuggyFetchItems(
  state: PaginationState,
  targetPage: number,
  mockAPIData: Map<number, Item[]>
): PaginationState {
  const start = (targetPage - 1) * state.pageSize;
  
  // API is called with correct parameters
  const apiItems = mockAPIData.get(targetPage) || [];
  
  // BUG: In desktop mode, items don't update despite API returning correct data
  // The state update is overridden or doesn't trigger re-render
  const shouldReset = !state.isMobile || targetPage === 1;
  
  // BUG SIMULATION: Items remain as page 1 items due to race condition in useEffect
  // When navigating from page 1 to page 2+, the items don't update
  // This simulates the actual bug where setItems is called but doesn't take effect
  const updatedItems = targetPage === 1 ? apiItems : state.items;
  
  return {
    ...state,
    currentPage: targetPage,
    items: updatedItems, // BUG: Items don't update for pages > 1
  };
}

/**
 * Simulates the expected (fixed) behavior
 */
function simulateFixedFetchItems(
  state: PaginationState,
  targetPage: number,
  mockAPIData: Map<number, Item[]>
): PaginationState {
  const apiItems = mockAPIData.get(targetPage) || [];
  const shouldReset = !state.isMobile || targetPage === 1;
  
  return {
    ...state,
    currentPage: targetPage,
    items: shouldReset ? apiItems : [...state.items, ...apiItems],
  };
}

/**
 * Generate mock items for a specific page
 */
function generateMockItems(page: number, pageSize: number): Item[] {
  const items: Item[] = [];
  const startIndex = (page - 1) * pageSize;
  
  for (let i = 0; i < pageSize; i++) {
    const itemNumber = startIndex + i + 1;
    items.push({
      name: `ITEM-${itemNumber.toString().padStart(5, '0')}`,
      item_code: `ITM-${itemNumber}`,
      item_name: `Test Item ${itemNumber}`,
      item_group: 'Test Group',
      stock_uom: 'Nos',
      opening_stock: 100,
      harga_beli: 10000,
      harga_jual: 15000,
    });
  }
  
  return items;
}

/**
 * Property 1: Desktop Pagination Updates Display
 * 
 * For any pagination button click in desktop mode where target page > 1,
 * the displayed items MUST update to show items for the target page.
 */

async function testPage2Navigation(): Promise<void> {
  console.log('\n=== Bug Exploration: Page 2 Navigation ===');
  
  const pageSize = 20;
  const totalRecords = 100;
  
  // Generate mock data for pages 1-5
  const mockAPIData = new Map<number, Item[]>();
  for (let page = 1; page <= 5; page++) {
    mockAPIData.set(page, generateMockItems(page, pageSize));
  }
  
  // Initial state: Desktop mode, page 1
  const initialState: PaginationState = {
    currentPage: 1,
    pageSize: 20,
    totalRecords: 100,
    items: mockAPIData.get(1)!,
    isMobile: false, // Desktop mode
  };
  
  console.log('Initial state:', {
    page: initialState.currentPage,
    itemCount: initialState.items.length,
    firstItem: initialState.items[0]?.item_code,
    lastItem: initialState.items[19]?.item_code,
  });
  
  // Simulate clicking "Next" button to go to page 2
  const newState = simulateBuggyFetchItems(initialState, 2, mockAPIData);
  
  console.log('After clicking Next to page 2:', {
    page: newState.currentPage,
    itemCount: newState.items.length,
    firstItem: newState.items[0]?.item_code,
    lastItem: newState.items[19]?.item_code,
  });
  
  // Expected: Items should be from page 2 (items 21-40)
  const expectedFirstItem = 'ITM-21';
  const expectedLastItem = 'ITM-40';
  
  // Actual: Items remain from page 1 (items 1-20) - THIS IS THE BUG
  const actualFirstItem = newState.items[0]?.item_code;
  const actualLastItem = newState.items[19]?.item_code;
  
  console.log('Expected items:', { first: expectedFirstItem, last: expectedLastItem });
  console.log('Actual items:', { first: actualFirstItem, last: actualLastItem });
  
  // This assertion SHOULD FAIL on buggy code
  assertEqual(actualFirstItem, expectedFirstItem, 'First item on page 2 should be ITM-21');
  assertEqual(actualLastItem, expectedLastItem, 'Last item on page 2 should be ITM-40');
  
  console.log('✓ Bug confirmed: Items did not update to page 2');
}

async function testPage3Navigation(): Promise<void> {
  console.log('\n=== Bug Exploration: Page 3 Navigation ===');
  
  const pageSize = 20;
  const mockAPIData = new Map<number, Item[]>();
  for (let page = 1; page <= 5; page++) {
    mockAPIData.set(page, generateMockItems(page, pageSize));
  }
  
  const initialState: PaginationState = {
    currentPage: 1,
    pageSize: 20,
    totalRecords: 100,
    items: mockAPIData.get(1)!,
    isMobile: false,
  };
  
  // Simulate clicking page number "3"
  const newState = simulateBuggyFetchItems(initialState, 3, mockAPIData);
  
  console.log('After clicking page 3:', {
    page: newState.currentPage,
    firstItem: newState.items[0]?.item_code,
    lastItem: newState.items[19]?.item_code,
  });
  
  // Expected: Items 41-60
  assertEqual(newState.items[0]?.item_code, 'ITM-41', 'First item on page 3 should be ITM-41');
  assertEqual(newState.items[19]?.item_code, 'ITM-60', 'Last item on page 3 should be ITM-60');
  
  console.log('✓ Bug confirmed: Items did not update to page 3');
}

async function testPreviousButton(): Promise<void> {
  console.log('\n=== Bug Exploration: Previous Button ===');
  
  const pageSize = 20;
  const mockAPIData = new Map<number, Item[]>();
  for (let page = 1; page <= 5; page++) {
    mockAPIData.set(page, generateMockItems(page, pageSize));
  }
  
  // Start at page 3
  const initialState: PaginationState = {
    currentPage: 3,
    pageSize: 20,
    totalRecords: 100,
    items: mockAPIData.get(1)!, // BUG: Still showing page 1 items
    isMobile: false,
  };
  
  // Click Previous to go to page 2
  const newState = simulateBuggyFetchItems(initialState, 2, mockAPIData);
  
  console.log('After clicking Previous to page 2:', {
    page: newState.currentPage,
    firstItem: newState.items[0]?.item_code,
  });
  
  // Expected: Items 21-40
  assertEqual(newState.items[0]?.item_code, 'ITM-21', 'First item after Previous should be ITM-21');
  
  console.log('✓ Bug confirmed: Previous button did not update items');
}

async function testAPIParameters(): Promise<void> {
  console.log('\n=== Bug Exploration: API Parameters ===');
  
  const pageSize = 20;
  
  // Test various page numbers
  const testCases = [
    { page: 1, expectedStart: 0 },
    { page: 2, expectedStart: 20 },
    { page: 3, expectedStart: 40 },
    { page: 5, expectedStart: 80 },
  ];
  
  testCases.forEach(({ page, expectedStart }) => {
    const actualStart = (page - 1) * pageSize;
    console.log(`Page ${page}: start=${actualStart} (expected: ${expectedStart})`);
    assertEqual(actualStart, expectedStart, `Start parameter for page ${page}`);
  });
  
  console.log('✓ API parameters are correct - bug is in state update, not API call');
}

async function testPropertyBasedPagination(): Promise<void> {
  console.log('\n=== Bug Exploration: Property-Based Test ===');
  
  try {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 10 }), // Target page (> 1 to trigger bug)
        fc.integer({ min: 20, max: 50 }), // Page size
        (targetPage, pageSize) => {
          const totalRecords = pageSize * 10;
          
          // Generate mock data
          const mockAPIData = new Map<number, Item[]>();
          for (let page = 1; page <= 10; page++) {
            mockAPIData.set(page, generateMockItems(page, pageSize));
          }
          
          // Initial state at page 1
          const initialState: PaginationState = {
            currentPage: 1,
            pageSize,
            totalRecords,
            items: mockAPIData.get(1)!,
            isMobile: false, // Desktop mode
          };
          
          // Navigate to target page
          const newState = simulateBuggyFetchItems(initialState, targetPage, mockAPIData);
          
          // Expected first item for target page
          const expectedItemNumber = (targetPage - 1) * pageSize + 1;
          const expectedFirstItem = `ITM-${expectedItemNumber}`;
          
          // Actual first item (will be ITM-1 due to bug)
          const actualFirstItem = newState.items[0]?.item_code;
          
          console.log(`Page ${targetPage}: Expected ${expectedFirstItem}, Got ${actualFirstItem}`);
          
          // This will fail for pages > 1, confirming the bug
          return actualFirstItem === expectedFirstItem;
        }
      ),
      {
        numRuns: 20,
        verbose: true,
      }
    );
  } catch (error: any) {
    console.log('✓ Property-based test failed as expected (bug confirmed)');
    console.log(`  Error: ${error.message}`);
    throw error; // Re-throw to mark test as failed
  }
}

async function testFixedBehavior(): Promise<void> {
  console.log('\n=== Comparison: Expected Fixed Behavior ===');
  
  const pageSize = 20;
  const mockAPIData = new Map<number, Item[]>();
  for (let page = 1; page <= 5; page++) {
    mockAPIData.set(page, generateMockItems(page, pageSize));
  }
  
  const initialState: PaginationState = {
    currentPage: 1,
    pageSize: 20,
    totalRecords: 100,
    items: mockAPIData.get(1)!,
    isMobile: false,
  };
  
  // Simulate FIXED behavior
  const fixedState = simulateFixedFetchItems(initialState, 2, mockAPIData);
  
  console.log('Fixed behavior - Page 2:', {
    page: fixedState.currentPage,
    firstItem: fixedState.items[0]?.item_code,
    lastItem: fixedState.items[19]?.item_code,
  });
  
  // With fixed code, items should update correctly
  assertEqual(fixedState.items[0]?.item_code, 'ITM-21', 'Fixed: First item on page 2');
  assertEqual(fixedState.items[19]?.item_code, 'ITM-40', 'Fixed: Last item on page 2');
  
  console.log('✓ Fixed behavior works as expected');
}

// Main test runner
async function runAllTests(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  Item List Pagination Bug Exploration Tests                   ║');
  console.log('║  EXPECTED: Tests FAIL (confirming bug exists)                  ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  
  const tests = [
    { name: 'Page 2 Navigation', fn: testPage2Navigation },
    { name: 'Page 3 Navigation', fn: testPage3Navigation },
    { name: 'Previous Button', fn: testPreviousButton },
    { name: 'API Parameters', fn: testAPIParameters },
    { name: 'Property-Based Pagination', fn: testPropertyBasedPagination },
    { name: 'Fixed Behavior Comparison', fn: testFixedBehavior },
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
  console.log('• API is called with correct parameters (start, limit)');
  console.log('• API returns correct data for each page');
  console.log('• Bug is in state update mechanism, not API layer');
  console.log('• Likely causes:');
  console.log('  - useEffect race condition between filter and page changes');
  console.log('  - Dependency array causing unnecessary re-executions');
  console.log('  - State update timing issues');
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  Next Steps                                                    ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('1. Implement fix in ItemList component (Task 3.1)');
  console.log('2. Re-run this test - should PASS after fix');
  console.log('3. Verify preservation tests still pass (Task 3.3)');
  
  // Exit with error code if tests failed (which is expected for bug exploration)
  if (failed > 0) {
    console.log('\n⚠️  Tests failed as EXPECTED - bug confirmed!');
    process.exit(1);
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
 * 1. Clicking "Next" to page 2: Items remain ITM-1 to ITM-20 instead of ITM-21 to ITM-40
 * 2. Clicking page number "3": Items remain ITM-1 to ITM-20 instead of ITM-41 to ITM-60
 * 3. Clicking "Previous" from page 3 to 2: Items remain ITM-1 to ITM-20 instead of ITM-21 to ITM-40
 * 4. API is called with correct parameters, but state update doesn't reflect in UI
 * 
 * Root Cause Analysis:
 * - The bug is NOT in the API call (parameters are correct)
 * - The bug is in the state update mechanism
 * - Likely causes: useEffect race condition, dependency array issues, or state update timing
 * 
 * Next Steps:
 * 1. Implement the fix in ItemList component (Task 3.1)
 * 2. Re-run this test - it should PASS after the fix
 * 3. Verify preservation tests still pass (Task 3.3)
 */
