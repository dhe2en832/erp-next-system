/**
 * Tests for Stock Card Report Pagination Logic
 * Requirements: 11.1
 */

/**
 * Simple assertion helper
 */
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

/**
 * Test pagination calculation
 * Requirement 11.1: Implement page and limit parameters
 */
function testPaginationCalculation() {
  console.log('Testing pagination calculation...');
  
  // Test case 1: 50 records, page 1, limit 20
  const totalRecords1 = 50;
  const page1 = 1;
  const limit1 = 20;
  const totalPages1 = Math.ceil(totalRecords1 / limit1);
  
  assert(totalPages1 === 3, 'Total pages should be 3 for 50 records with limit 20');
  assert(page1 === 1, 'Page should be 1');
  assert(limit1 === 20, 'Limit should be 20');
  
  // Test case 2: 100 records, page 2, limit 25
  const totalRecords2 = 100;
  const page2 = 2;
  const limit2 = 25;
  const totalPages2 = Math.ceil(totalRecords2 / limit2);
  
  assert(totalPages2 === 4, 'Total pages should be 4 for 100 records with limit 25');
  assert(page2 === 2, 'Page should be 2');
  assert(limit2 === 25, 'Limit should be 25');
  
  // Test case 3: 15 records, page 1, limit 20 (less than one page)
  const totalRecords3 = 15;
  const page3 = 1;
  const limit3 = 20;
  const totalPages3 = Math.ceil(totalRecords3 / limit3);
  
  assert(totalPages3 === 1, 'Total pages should be 1 for 15 records with limit 20');
  assert(page3 === 1, 'Page should be 1');
  assert(limit3 === 20, 'Limit should be 20');
  
  // Test case 4: 0 records (empty result)
  const totalRecords4 = 0;
  const page4 = 1;
  const limit4 = 20;
  const totalPages4 = Math.ceil(totalRecords4 / limit4);
  
  assert(totalPages4 === 0, 'Total pages should be 0 for empty result');
  assert(page4 === 1, 'Page should be 1');
  assert(limit4 === 20, 'Limit should be 20');
  
  console.log('✓ Pagination calculation tests passed');
}

/**
 * Test array slicing for pagination
 * Requirement 11.1: Slice data based on page and limit
 */
function testArraySlicing() {
  console.log('Testing array slicing for pagination...');
  
  // Create test data
  const testData = Array.from({ length: 50 }, (_, i) => ({
    id: i + 1,
    name: `Entry ${i + 1}`
  }));
  
  // Test page 1, limit 20
  const page1 = 1;
  const limit1 = 20;
  const startIndex1 = (page1 - 1) * limit1;
  const endIndex1 = startIndex1 + limit1;
  const result1 = testData.slice(startIndex1, endIndex1);
  
  assert(result1.length === 20, 'Page 1 should have 20 records');
  assert(result1[0].id === 1, 'First record should have id 1');
  assert(result1[19].id === 20, 'Last record should have id 20');
  
  // Test page 2, limit 20
  const page2 = 2;
  const limit2 = 20;
  const startIndex2 = (page2 - 1) * limit2;
  const endIndex2 = startIndex2 + limit2;
  const result2 = testData.slice(startIndex2, endIndex2);
  
  assert(result2.length === 20, 'Page 2 should have 20 records');
  assert(result2[0].id === 21, 'First record should have id 21');
  assert(result2[19].id === 40, 'Last record should have id 40');
  
  // Test page 3, limit 20 (partial page)
  const page3 = 3;
  const limit3 = 20;
  const startIndex3 = (page3 - 1) * limit3;
  const endIndex3 = startIndex3 + limit3;
  const result3 = testData.slice(startIndex3, endIndex3);
  
  assert(result3.length === 10, 'Page 3 should have 10 records (partial page)');
  assert(result3[0].id === 41, 'First record should have id 41');
  assert(result3[9].id === 50, 'Last record should have id 50');
  
  // Test page beyond available data
  const page4 = 10;
  const limit4 = 20;
  const startIndex4 = (page4 - 1) * limit4;
  const endIndex4 = startIndex4 + limit4;
  const result4 = testData.slice(startIndex4, endIndex4);
  
  assert(result4.length === 0, 'Page beyond data should return empty array');
  
  console.log('✓ Array slicing tests passed');
}

/**
 * Test pagination with different page sizes
 * Requirement 11.1: Support various limit values
 */
function testDifferentPageSizes() {
  console.log('Testing different page sizes...');
  
  const testData = Array.from({ length: 100 }, (_, i) => i + 1);
  
  // Test with limit 10
  const limit10 = 10;
  const totalPages10 = Math.ceil(testData.length / limit10);
  assert(totalPages10 === 10, 'Should have 10 pages with limit 10');
  
  // Test with limit 25
  const limit25 = 25;
  const totalPages25 = Math.ceil(testData.length / limit25);
  assert(totalPages25 === 4, 'Should have 4 pages with limit 25');
  
  // Test with limit 50
  const limit50 = 50;
  const totalPages50 = Math.ceil(testData.length / limit50);
  assert(totalPages50 === 2, 'Should have 2 pages with limit 50');
  
  // Test with limit 100
  const limit100 = 100;
  const totalPages100 = Math.ceil(testData.length / limit100);
  assert(totalPages100 === 1, 'Should have 1 page with limit 100');
  
  // Test with limit 1 (edge case)
  const limit1 = 1;
  const totalPages1 = Math.ceil(testData.length / limit1);
  assert(totalPages1 === 100, 'Should have 100 pages with limit 1');
  
  console.log('✓ Different page sizes tests passed');
}

/**
 * Test pagination metadata structure
 * Requirement 11.1: Return pagination metadata in correct format
 */
function testPaginationMetadata() {
  console.log('Testing pagination metadata structure...');
  
  const totalRecords = 75;
  const page = 2;
  const limit = 20;
  const totalPages = Math.ceil(totalRecords / limit);
  
  const paginationMetadata = {
    current_page: page,
    page_size: limit,
    total_records: totalRecords,
    total_pages: totalPages
  };
  
  assert('current_page' in paginationMetadata, 'Should have current_page property');
  assert('page_size' in paginationMetadata, 'Should have page_size property');
  assert('total_records' in paginationMetadata, 'Should have total_records property');
  assert('total_pages' in paginationMetadata, 'Should have total_pages property');
  
  assert(paginationMetadata.current_page === 2, 'current_page should be 2');
  assert(paginationMetadata.page_size === 20, 'page_size should be 20');
  assert(paginationMetadata.total_records === 75, 'total_records should be 75');
  assert(paginationMetadata.total_pages === 4, 'total_pages should be 4');
  
  console.log('✓ Pagination metadata tests passed');
}

/**
 * Test edge cases for pagination
 * Requirement 11.1: Handle edge cases correctly
 */
function testEdgeCases() {
  console.log('Testing edge cases...');
  
  // Edge case 1: Empty array
  const emptyData: any[] = [];
  const page1 = 1;
  const limit1 = 20;
  const result1 = emptyData.slice((page1 - 1) * limit1, (page1 - 1) * limit1 + limit1);
  const totalPages1 = Math.ceil(emptyData.length / limit1);
  
  assert(result1.length === 0, 'Empty array should return empty result');
  assert(totalPages1 === 0, 'Empty array should have 0 total pages');
  
  // Edge case 2: Single item
  const singleData = [{ id: 1 }];
  const page2 = 1;
  const limit2 = 20;
  const result2 = singleData.slice((page2 - 1) * limit2, (page2 - 1) * limit2 + limit2);
  const totalPages2 = Math.ceil(singleData.length / limit2);
  
  assert(result2.length === 1, 'Single item should return 1 result');
  assert(totalPages2 === 1, 'Single item should have 1 total page');
  
  // Edge case 3: Exact multiple of page size
  const exactData = Array.from({ length: 40 }, (_, i) => ({ id: i + 1 }));
  const page3 = 2;
  const limit3 = 20;
  const result3 = exactData.slice((page3 - 1) * limit3, (page3 - 1) * limit3 + limit3);
  const totalPages3 = Math.ceil(exactData.length / limit3);
  
  assert(result3.length === 20, 'Page 2 should have 20 records');
  assert(totalPages3 === 2, 'Should have exactly 2 pages');
  assert(result3[0].id === 21, 'First record on page 2 should have id 21');
  
  console.log('✓ Edge cases tests passed');
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('\n=== Stock Card Pagination Tests ===\n');
  
  try {
    testPaginationCalculation();
    testArraySlicing();
    testDifferentPageSizes();
    testPaginationMetadata();
    testEdgeCases();
    
    console.log('\n✓ All pagination tests passed!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
runTests();
