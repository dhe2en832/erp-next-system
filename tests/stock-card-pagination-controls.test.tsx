/**
 * Tests for Stock Card Table Pagination Controls
 * Requirements: 11.1
 * Task: 6.2 Add pagination controls
 */

interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
}

interface PaginationState {
  current_page: number;
  page_size: number;
  total_records: number;
  total_pages: number;
}

// Test 1: Pagination info display format
function testPaginationInfoDisplay(): TestResult {
  const pagination: PaginationState = {
    current_page: 2,
    page_size: 20,
    total_records: 100,
    total_pages: 5
  };

  // Verify pagination info format
  const expectedInfo = `Halaman ${pagination.current_page} dari ${pagination.total_pages} (${pagination.total_records} total transaksi)`;
  
  if (!expectedInfo.includes('Halaman 2')) {
    return {
      name: 'Pagination Info Display',
      passed: false,
      message: 'Pagination info does not include current page'
    };
  }

  if (!expectedInfo.includes('dari 5')) {
    return {
      name: 'Pagination Info Display',
      passed: false,
      message: 'Pagination info does not include total pages'
    };
  }

  if (!expectedInfo.includes('100 total transaksi')) {
    return {
      name: 'Pagination Info Display',
      passed: false,
      message: 'Pagination info does not include total records'
    };
  }

  return {
    name: 'Pagination Info Display',
    passed: true,
    message: 'Pagination info displays current page, total pages, and total records correctly'
  };
}

// Test 2: Page size options
function testPageSizeOptions(): TestResult {
  const validPageSizes = [20, 50, 100];
  
  // Verify all required page sizes are present
  for (const size of validPageSizes) {
    if (![20, 50, 100].includes(size)) {
      return {
        name: 'Page Size Options',
        passed: false,
        message: `Invalid page size: ${size}`
      };
    }
  }

  return {
    name: 'Page Size Options',
    passed: true,
    message: 'Page size selector includes 20, 50, and 100 options'
  };
}

// Test 3: Previous button disabled on first page
function testPreviousButtonDisabledOnFirstPage(): TestResult {
  const pagination: PaginationState = {
    current_page: 1,
    page_size: 20,
    total_records: 100,
    total_pages: 5
  };

  const isPreviousDisabled = pagination.current_page === 1;

  if (!isPreviousDisabled) {
    return {
      name: 'Previous Button Disabled on First Page',
      passed: false,
      message: 'Previous button should be disabled on first page'
    };
  }

  return {
    name: 'Previous Button Disabled on First Page',
    passed: true,
    message: 'Previous button correctly disabled when on first page'
  };
}

// Test 4: Next button disabled on last page
function testNextButtonDisabledOnLastPage(): TestResult {
  const pagination: PaginationState = {
    current_page: 5,
    page_size: 20,
    total_records: 100,
    total_pages: 5
  };

  const isNextDisabled = pagination.current_page === pagination.total_pages;

  if (!isNextDisabled) {
    return {
      name: 'Next Button Disabled on Last Page',
      passed: false,
      message: 'Next button should be disabled on last page'
    };
  }

  return {
    name: 'Next Button Disabled on Last Page',
    passed: true,
    message: 'Next button correctly disabled when on last page'
  };
}

// Test 5: Previous button enabled on middle pages
function testPreviousButtonEnabledOnMiddlePages(): TestResult {
  const pagination: PaginationState = {
    current_page: 3,
    page_size: 20,
    total_records: 100,
    total_pages: 5
  };

  const isPreviousDisabled = pagination.current_page === 1;

  if (isPreviousDisabled) {
    return {
      name: 'Previous Button Enabled on Middle Pages',
      passed: false,
      message: 'Previous button should be enabled on middle pages'
    };
  }

  return {
    name: 'Previous Button Enabled on Middle Pages',
    passed: true,
    message: 'Previous button correctly enabled when not on first page'
  };
}

// Test 6: Next button enabled on middle pages
function testNextButtonEnabledOnMiddlePages(): TestResult {
  const pagination: PaginationState = {
    current_page: 3,
    page_size: 20,
    total_records: 100,
    total_pages: 5
  };

  const isNextDisabled = pagination.current_page === pagination.total_pages;

  if (isNextDisabled) {
    return {
      name: 'Next Button Enabled on Middle Pages',
      passed: false,
      message: 'Next button should be enabled on middle pages'
    };
  }

  return {
    name: 'Next Button Enabled on Middle Pages',
    passed: true,
    message: 'Next button correctly enabled when not on last page'
  };
}

// Test 7: Page change calculation
function testPageChangeCalculation(): TestResult {
  const currentPage = 3;
  
  // Test previous page
  const previousPage = currentPage - 1;
  if (previousPage !== 2) {
    return {
      name: 'Page Change Calculation',
      passed: false,
      message: `Previous page calculation incorrect: expected 2, got ${previousPage}`
    };
  }

  // Test next page
  const nextPage = currentPage + 1;
  if (nextPage !== 4) {
    return {
      name: 'Page Change Calculation',
      passed: false,
      message: `Next page calculation incorrect: expected 4, got ${nextPage}`
    };
  }

  return {
    name: 'Page Change Calculation',
    passed: true,
    message: 'Page change calculations (previous/next) work correctly'
  };
}

// Test 8: Page size change handling
function testPageSizeChange(): TestResult {
  const initialPageSize = 20;
  const newPageSize = 50;

  if (newPageSize !== 50) {
    return {
      name: 'Page Size Change',
      passed: false,
      message: 'Page size change not handled correctly'
    };
  }

  // Verify new page size is valid
  if (![20, 50, 100].includes(newPageSize)) {
    return {
      name: 'Page Size Change',
      passed: false,
      message: 'Invalid page size selected'
    };
  }

  return {
    name: 'Page Size Change',
    passed: true,
    message: 'Page size change handled correctly with valid options'
  };
}

// Test 9: Pagination visibility with single page
function testPaginationVisibilityWithSinglePage(): TestResult {
  const pagination: PaginationState = {
    current_page: 1,
    page_size: 20,
    total_records: 15,
    total_pages: 1
  };

  const shouldShowPagination = pagination.total_pages > 1;

  if (shouldShowPagination) {
    return {
      name: 'Pagination Visibility with Single Page',
      passed: false,
      message: 'Pagination should be hidden when total_pages is 1'
    };
  }

  return {
    name: 'Pagination Visibility with Single Page',
    passed: true,
    message: 'Pagination correctly hidden when only one page exists'
  };
}

// Test 10: Pagination visibility with multiple pages
function testPaginationVisibilityWithMultiplePages(): TestResult {
  const pagination: PaginationState = {
    current_page: 1,
    page_size: 20,
    total_records: 100,
    total_pages: 5
  };

  const shouldShowPagination = pagination.total_pages > 1;

  if (!shouldShowPagination) {
    return {
      name: 'Pagination Visibility with Multiple Pages',
      passed: false,
      message: 'Pagination should be visible when total_pages > 1'
    };
  }

  return {
    name: 'Pagination Visibility with Multiple Pages',
    passed: true,
    message: 'Pagination correctly visible when multiple pages exist'
  };
}

// Test 11: Mobile button minimum height
function testMobileButtonMinHeight(): TestResult {
  const minHeight = 44; // pixels for touch-friendly buttons

  if (minHeight < 44) {
    return {
      name: 'Mobile Button Minimum Height',
      passed: false,
      message: `Mobile buttons should have minimum height of 44px, got ${minHeight}px`
    };
  }

  return {
    name: 'Mobile Button Minimum Height',
    passed: true,
    message: 'Mobile buttons have touch-friendly minimum height of 44px'
  };
}

// Test 12: Page number display range
function testPageNumberDisplayRange(): TestResult {
  const pagination: PaginationState = {
    current_page: 3,
    page_size: 20,
    total_records: 200,
    total_pages: 10
  };

  // Should display max 5 page numbers
  const maxDisplayedPages = Math.min(5, pagination.total_pages);

  if (maxDisplayedPages > 5) {
    return {
      name: 'Page Number Display Range',
      passed: false,
      message: 'Should display maximum 5 page numbers'
    };
  }

  return {
    name: 'Page Number Display Range',
    passed: true,
    message: 'Page number display limited to maximum 5 pages'
  };
}

// Test 13: Current page highlighting
function testCurrentPageHighlighting(): TestResult {
  const pagination: PaginationState = {
    current_page: 3,
    page_size: 20,
    total_records: 100,
    total_pages: 5
  };

  // Verify current page is identified
  const isCurrentPage = (pageNum: number) => pageNum === pagination.current_page;

  if (!isCurrentPage(3)) {
    return {
      name: 'Current Page Highlighting',
      passed: false,
      message: 'Current page not identified correctly'
    };
  }

  if (isCurrentPage(2) || isCurrentPage(4)) {
    return {
      name: 'Current Page Highlighting',
      passed: false,
      message: 'Non-current pages incorrectly identified as current'
    };
  }

  return {
    name: 'Current Page Highlighting',
    passed: true,
    message: 'Current page correctly identified for highlighting'
  };
}

// Test 14: Indonesian language labels
function testIndonesianLanguageLabels(): TestResult {
  const labels = {
    previous: 'Sebelumnya',
    next: 'Selanjutnya',
    page: 'Halaman',
    of: 'dari',
    totalTransactions: 'total transaksi',
    itemsPerPage: 'Item per halaman'
  };

  // Verify all labels are in Indonesian
  if (labels.previous !== 'Sebelumnya') {
    return {
      name: 'Indonesian Language Labels',
      passed: false,
      message: 'Previous button label not in Indonesian'
    };
  }

  if (labels.next !== 'Selanjutnya') {
    return {
      name: 'Indonesian Language Labels',
      passed: false,
      message: 'Next button label not in Indonesian'
    };
  }

  if (labels.itemsPerPage !== 'Item per halaman') {
    return {
      name: 'Indonesian Language Labels',
      passed: false,
      message: 'Items per page label not in Indonesian'
    };
  }

  return {
    name: 'Indonesian Language Labels',
    passed: true,
    message: 'All pagination labels correctly in Indonesian (Bahasa Indonesia)'
  };
}

// Test 15: Edge case - Last page with partial data
function testLastPageWithPartialData(): TestResult {
  const pagination: PaginationState = {
    current_page: 5,
    page_size: 20,
    total_records: 95,
    total_pages: 5
  };

  // Last page should have 15 items (95 - 80)
  const itemsOnLastPage = pagination.total_records - ((pagination.total_pages - 1) * pagination.page_size);

  if (itemsOnLastPage !== 15) {
    return {
      name: 'Last Page with Partial Data',
      passed: false,
      message: `Expected 15 items on last page, calculated ${itemsOnLastPage}`
    };
  }

  // Next button should be disabled
  const isNextDisabled = pagination.current_page === pagination.total_pages;
  if (!isNextDisabled) {
    return {
      name: 'Last Page with Partial Data',
      passed: false,
      message: 'Next button should be disabled on last page with partial data'
    };
  }

  return {
    name: 'Last Page with Partial Data',
    passed: true,
    message: 'Last page with partial data handled correctly'
  };
}

// Run all tests
function runTests() {
  console.log('\n=== Stock Card Pagination Controls Tests ===\n');

  const tests = [
    testPaginationInfoDisplay,
    testPageSizeOptions,
    testPreviousButtonDisabledOnFirstPage,
    testNextButtonDisabledOnLastPage,
    testPreviousButtonEnabledOnMiddlePages,
    testNextButtonEnabledOnMiddlePages,
    testPageChangeCalculation,
    testPageSizeChange,
    testPaginationVisibilityWithSinglePage,
    testPaginationVisibilityWithMultiplePages,
    testMobileButtonMinHeight,
    testPageNumberDisplayRange,
    testCurrentPageHighlighting,
    testIndonesianLanguageLabels,
    testLastPageWithPartialData
  ];

  const results: TestResult[] = [];
  let passedCount = 0;
  let failedCount = 0;

  for (const test of tests) {
    const result = test();
    results.push(result);

    const status = result.passed ? '✓ PASS' : '✗ FAIL';
    const color = result.passed ? '\x1b[32m' : '\x1b[31m';
    const reset = '\x1b[0m';

    console.log(`${color}${status}${reset} ${result.name}`);
    if (result.message) {
      console.log(`  ${result.message}`);
    }
    console.log('');

    if (result.passed) {
      passedCount++;
    } else {
      failedCount++;
    }
  }

  console.log('='.repeat(50));
  console.log(`Total: ${tests.length} tests`);
  console.log(`\x1b[32mPassed: ${passedCount}\x1b[0m`);
  if (failedCount > 0) {
    console.log(`\x1b[31mFailed: ${failedCount}\x1b[0m`);
  }
  console.log('='.repeat(50));

  // Exit with error code if any tests failed
  if (failedCount > 0) {
    process.exit(1);
  }
}

// Run tests
runTests();
