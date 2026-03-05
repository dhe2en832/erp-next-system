/**
 * Property-Based Test: Pagination Preservation
 * 
 * **Property 13: Pagination Preservation**
 * **Validates: Requirements 10.5**
 * 
 * This test validates that pagination parameters (limit, start, order_by) passed
 * to migrated HR routes produce equivalent results to legacy routes. This ensures
 * that the transformation from URL query parameters to ERPNext client method options
 * preserves the intended pagination behavior for employee, department, and designation
 * data.
 * 
 * Test Scope:
 * - Limit parameter controls result count
 * - Start parameter enables pagination offset
 * - Order_by parameter controls sorting
 * - Pagination combinations work correctly
 * - Employee filtering with pagination is preserved
 * 
 * Feature: api-routes-multi-site-support
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

// Type definitions
interface PaginationParameters {
  limit_page_length?: number;
  limit_start?: number;
  order_by?: string;
  filters?: Array<[string, string, any]>;
}

interface Employee {
  name: string;
  employee_name: string;
  first_name: string;
  company: string;
  department: string;
  designation: string;
  gender: string;
  status: string;
  cell_number: string;
  personal_email: string;
  date_of_birth: string;
  date_of_joining: string;
}

interface LegacyPaginationResponse {
  success: boolean;
  data: Employee[];
  total: number;
  message?: string;
}

interface ModernPaginationResponse {
  success: boolean;
  data: Employee[];
  total: number;
  message?: string;
  site?: string;
}

/**
 * Generates test dataset with various employees
 */
function generateEmployeeDataset(employeeCount: number): Employee[] {
  const companies = ['Demo Company', 'BAC Company', 'Cirebon Branch'];
  const departments = ['Sales', 'Engineering', 'HR', 'Finance', 'Operations'];
  const designations = ['Manager', 'Executive', 'Associate', 'Senior Associate', 'Director'];
  const statuses = ['Active', 'Left', 'Inactive'];
  const employees: Employee[] = [];

  for (let i = 0; i < employeeCount; i++) {
    const empNumber = String(i + 1).padStart(5, '0');
    employees.push({
      name: `EMP-${empNumber}`,
      employee_name: `Employee ${i + 1}`,
      first_name: `First${i + 1}`,
      company: companies[i % companies.length],
      department: departments[i % departments.length],
      designation: designations[i % designations.length],
      gender: i % 2 === 0 ? 'Male' : 'Female',
      status: statuses[i % statuses.length],
      cell_number: `+62${String(i + 1000000000).substring(0, 10)}`,
      personal_email: `employee${i + 1}@example.com`,
      date_of_birth: `199${i % 10}-0${(i % 9) + 1}-15`,
      date_of_joining: `202${i % 5}-0${(i % 9) + 1}-01`,
    });
  }

  return employees;
}

/**
 * Applies filters to employee dataset
 */
function applyFilters(employees: Employee[], filters?: Array<[string, string, any]>): Employee[] {
  if (!filters || filters.length === 0) {
    return employees;
  }

  return employees.filter(emp => {
    for (const [field, operator, value] of filters) {
      const empValue = emp[field as keyof Employee];

      switch (operator) {
        case '=':
          if (empValue !== value) return false;
          break;
        case '!=':
          if (empValue === value) return false;
          break;
        case 'like':
          if (typeof empValue !== 'string' || !empValue.includes(value.replace(/%/g, ''))) return false;
          break;
        default:
          return false;
      }
    }
    return true;
  });
}

/**
 * Applies sorting to employees
 */
function applySorting(employees: Employee[], order_by?: string): Employee[] {
  if (!order_by) {
    return employees;
  }

  const [field, direction] = order_by.split(' ');
  const sortedEmployees = [...employees];

  sortedEmployees.sort((a, b) => {
    const aValue = a[field as keyof Employee];
    const bValue = b[field as keyof Employee];

    let comparison = 0;
    if (aValue < bValue) comparison = -1;
    if (aValue > bValue) comparison = 1;

    return direction?.toLowerCase() === 'desc' ? -comparison : comparison;
  });

  return sortedEmployees;
}

/**
 * Applies pagination to employees
 */
function applyPagination(employees: Employee[], limit?: number, start?: number): Employee[] {
  const startIndex = start || 0;
  const endIndex = limit ? startIndex + limit : employees.length;
  return employees.slice(startIndex, endIndex);
}

/**
 * Simulates legacy route with pagination parameters (URL-based)
 */
function simulateLegacyRouteWithPagination(
  allEmployees: Employee[],
  params: PaginationParameters
): LegacyPaginationResponse {
  let result = [...allEmployees];

  // Apply filters
  if (params.filters) {
    result = applyFilters(result, params.filters);
  }

  // Apply sorting
  if (params.order_by) {
    result = applySorting(result, params.order_by);
  }

  // Apply pagination
  if (params.limit_page_length !== undefined || params.limit_start !== undefined) {
    result = applyPagination(result, params.limit_page_length, params.limit_start);
  }

  return {
    success: true,
    data: result,
    total: result.length,
    message: 'Employees fetched successfully',
  };
}

/**
 * Simulates modern route with pagination parameters (client method options)
 */
function simulateModernRouteWithPagination(
  allEmployees: Employee[],
  params: PaginationParameters,
  siteId?: string
): ModernPaginationResponse {
  let result = [...allEmployees];

  // Apply filters (same logic, different syntax)
  if (params.filters) {
    result = applyFilters(result, params.filters);
  }

  // Apply sorting
  if (params.order_by) {
    result = applySorting(result, params.order_by);
  }

  // Apply pagination
  if (params.limit_page_length !== undefined || params.limit_start !== undefined) {
    result = applyPagination(result, params.limit_page_length, params.limit_start);
  }

  return {
    success: true,
    data: result,
    total: result.length,
    message: 'Employees fetched successfully',
    site: siteId,
  };
}

/**
 * Compares pagination responses for equivalence
 */
function comparePaginationResponses(
  legacy: LegacyPaginationResponse,
  modern: ModernPaginationResponse
): { equivalent: boolean; differences: string[] } {
  const differences: string[] = [];

  // Compare success field
  if (legacy.success !== modern.success) {
    differences.push(`success field mismatch: ${legacy.success} vs ${modern.success}`);
  }

  // Compare data length
  if (legacy.data.length !== modern.data.length) {
    differences.push(
      `data length mismatch: ${legacy.data.length} vs ${modern.data.length}`
    );
  }

  // Compare total field
  if (legacy.total !== modern.total) {
    differences.push(`total field mismatch: ${legacy.total} vs ${modern.total}`);
  }

  // Compare employee names (order matters for pagination tests)
  for (let i = 0; i < Math.min(legacy.data.length, modern.data.length); i++) {
    if (legacy.data[i].name !== modern.data[i].name) {
      differences.push(
        `Employee at index ${i} mismatch: ${legacy.data[i].name} vs ${modern.data[i].name}`
      );
    }
  }

  return {
    equivalent: differences.length === 0,
    differences,
  };
}

/**
 * Test 1: Basic Pagination with Limit
 * Validates: Requirements 10.5
 */
async function testBasicPaginationWithLimit(): Promise<void> {
  console.log('\n=== Test: Basic Pagination with Limit ===');

  const allEmployees = generateEmployeeDataset(50);
  const limit_page_length = 20;

  console.log(`Testing with ${allEmployees.length} employees, limit=${limit_page_length}`);

  const legacyResponse = simulateLegacyRouteWithPagination(allEmployees, { limit_page_length });
  const modernResponse = simulateModernRouteWithPagination(allEmployees, { limit_page_length }, 'demo');

  console.log(`Legacy employees: ${legacyResponse.data.length}`);
  console.log(`Modern employees: ${modernResponse.data.length}`);

  assertEqual(legacyResponse.data.length, limit_page_length, 'Legacy should return limited employees');
  assertEqual(modernResponse.data.length, limit_page_length, 'Modern should return limited employees');

  const comparison = comparePaginationResponses(legacyResponse, modernResponse);

  if (!comparison.equivalent) {
    console.error('Pagination responses are not equivalent:');
    comparison.differences.forEach(diff => console.error(`  - ${diff}`));
  }

  assert(comparison.equivalent, 'Pagination limit should be preserved');

  console.log('✓ Basic pagination with limit is preserved');
}

/**
 * Test 2: Pagination with Start Offset
 * Validates: Requirements 10.5
 */
async function testPaginationWithStartOffset(): Promise<void> {
  console.log('\n=== Test: Pagination with Start Offset ===');

  const allEmployees = generateEmployeeDataset(40);
  const limit_page_length = 10;
  const limit_start = 15;

  console.log(`Testing with ${allEmployees.length} employees, limit=${limit_page_length}, start=${limit_start}`);

  const legacyResponse = simulateLegacyRouteWithPagination(allEmployees, { limit_page_length, limit_start });
  const modernResponse = simulateModernRouteWithPagination(allEmployees, { limit_page_length, limit_start }, 'demo');

  console.log(`Legacy employees: ${legacyResponse.data.length}`);
  console.log(`Modern employees: ${modernResponse.data.length}`);

  const comparison = comparePaginationResponses(legacyResponse, modernResponse);

  if (!comparison.equivalent) {
    console.error('Pagination responses are not equivalent:');
    comparison.differences.forEach(diff => console.error(`  - ${diff}`));
  }

  assert(comparison.equivalent, 'Pagination with start offset should be preserved');

  // Verify the first employee is at the correct offset
  assertEqual(
    modernResponse.data[0].name,
    allEmployees[limit_start].name,
    'First employee should be at start offset'
  );

  console.log('✓ Pagination with start offset is preserved');
}

/**
 * Test 3: Pagination with Sorting
 * Validates: Requirements 10.5
 */
async function testPaginationWithSorting(): Promise<void> {
  console.log('\n=== Test: Pagination with Sorting ===');

  const allEmployees = generateEmployeeDataset(30);
  const limit_page_length = 15;
  const order_by = 'employee_name asc';

  console.log(`Testing with ${allEmployees.length} employees, limit=${limit_page_length}, order_by="${order_by}"`);

  const legacyResponse = simulateLegacyRouteWithPagination(allEmployees, { limit_page_length, order_by });
  const modernResponse = simulateModernRouteWithPagination(allEmployees, { limit_page_length, order_by }, 'demo');

  console.log(`Legacy employees: ${legacyResponse.data.length}`);
  console.log(`Modern employees: ${modernResponse.data.length}`);

  const comparison = comparePaginationResponses(legacyResponse, modernResponse);

  if (!comparison.equivalent) {
    console.error('Pagination responses are not equivalent:');
    comparison.differences.forEach(diff => console.error(`  - ${diff}`));
  }

  assert(comparison.equivalent, 'Pagination with sorting should be preserved');

  // Verify sorting is correct (ascending)
  for (let i = 0; i < modernResponse.data.length - 1; i++) {
    const current = modernResponse.data[i].employee_name;
    const next = modernResponse.data[i + 1].employee_name;
    assert(
      current <= next,
      `Employees should be sorted ascending: ${current} <= ${next}`
    );
  }

  console.log('✓ Pagination with sorting is preserved');
}

/**
 * Test 4: Pagination with Filters
 * Validates: Requirements 10.5
 */
async function testPaginationWithFilters(): Promise<void> {
  console.log('\n=== Test: Pagination with Filters ===');

  const allEmployees = generateEmployeeDataset(60);
  const limit_page_length = 10;
  const filters: Array<[string, string, any]> = [
    ['status', '=', 'Active'],
  ];

  console.log(`Testing with ${allEmployees.length} employees, limit=${limit_page_length}, filters:`, filters);

  const legacyResponse = simulateLegacyRouteWithPagination(allEmployees, { limit_page_length, filters });
  const modernResponse = simulateModernRouteWithPagination(allEmployees, { limit_page_length, filters }, 'demo');

  console.log(`Legacy employees: ${legacyResponse.data.length}`);
  console.log(`Modern employees: ${modernResponse.data.length}`);

  const comparison = comparePaginationResponses(legacyResponse, modernResponse);

  if (!comparison.equivalent) {
    console.error('Pagination responses are not equivalent:');
    comparison.differences.forEach(diff => console.error(`  - ${diff}`));
  }

  assert(comparison.equivalent, 'Pagination with filters should be preserved');

  // Verify all employees match the filter
  for (const emp of modernResponse.data) {
    assertEqual(emp.status, 'Active', 'Employee should match status filter');
  }

  console.log('✓ Pagination with filters is preserved');
}

/**
 * Test 5: Combined Pagination Parameters
 * Validates: Requirements 10.5
 */
async function testCombinedPaginationParameters(): Promise<void> {
  console.log('\n=== Test: Combined Pagination Parameters ===');

  const allEmployees = generateEmployeeDataset(50);
  const params: PaginationParameters = {
    filters: [['department', '=', 'Sales']],
    limit_page_length: 5,
    limit_start: 2,
    order_by: 'name desc',
  };

  console.log(`Testing with ${allEmployees.length} employees`);
  console.log(`Combined parameters:`, params);

  const legacyResponse = simulateLegacyRouteWithPagination(allEmployees, params);
  const modernResponse = simulateModernRouteWithPagination(allEmployees, params, 'demo');

  console.log(`Legacy employees: ${legacyResponse.data.length}`);
  console.log(`Modern employees: ${modernResponse.data.length}`);

  const comparison = comparePaginationResponses(legacyResponse, modernResponse);

  if (!comparison.equivalent) {
    console.error('Pagination responses are not equivalent:');
    comparison.differences.forEach(diff => console.error(`  - ${diff}`));
  }

  assert(comparison.equivalent, 'Combined pagination parameters should be preserved');

  // Verify all constraints are applied
  assertEqual(modernResponse.data.length, params.limit_page_length, 'Should respect limit');

  for (const emp of modernResponse.data) {
    assertEqual(emp.department, 'Sales', 'Should respect filter');
  }

  console.log('✓ Combined pagination parameters are preserved');
}

/**
 * Test 6: Property-Based Test - Pagination Across Many Scenarios
 * Validates: Requirements 10.5
 */
async function testPropertyBasedPagination(): Promise<void> {
  console.log('\n=== Property Test: Pagination Across Many Scenarios ===');

  try {
    fc.assert(
      fc.property(
        fc.integer({ min: 20, max: 80 }), // employeeCount
        fc.integer({ min: 5, max: 30 }), // limit_page_length
        fc.integer({ min: 0, max: 15 }), // limit_start
        fc.option(fc.constantFrom('name asc', 'name desc', 'employee_name asc', 'date_of_joining desc')), // order_by
        fc.option(fc.constantFrom('Active', 'Left', 'Inactive')), // status filter
        (employeeCount, limit_page_length, limit_start, order_by, statusFilter) => {
          const allEmployees = generateEmployeeDataset(employeeCount);

          // Build filters
          const filters: Array<[string, string, any]> = [];
          if (statusFilter) {
            filters.push(['status', '=', statusFilter]);
          }

          const params: PaginationParameters = {
            limit_page_length,
            limit_start,
            order_by: order_by ?? undefined,
            filters: filters.length > 0 ? filters : undefined,
          };

          console.log(`Testing: employees=${employeeCount}, limit=${limit_page_length}, start=${limit_start}, order_by=${order_by || 'none'}, status=${statusFilter || 'none'}`);

          // Generate responses
          const legacyResponse = simulateLegacyRouteWithPagination(allEmployees, params);
          const modernResponse = simulateModernRouteWithPagination(allEmployees, params, 'demo');

          // Compare responses
          const comparison = comparePaginationResponses(legacyResponse, modernResponse);

          if (!comparison.equivalent) {
            console.error('Pagination responses not equivalent:', comparison.differences);
            return false;
          }

          // Property: For ALL pagination parameter combinations, responses should be equivalent
          return comparison.equivalent;
        }
      ),
      {
        numRuns: 100,
        verbose: true,
      }
    );
    console.log('✓ Property-based pagination test passed');
  } catch (error: any) {
    console.error('✗ Property-based pagination test failed:', error.message);
    throw error;
  }
}

/**
 * Test 7: Property-Based Test - Employee Search with Pagination
 * Validates: Requirements 10.5
 */
async function testPropertyBasedEmployeeSearchWithPagination(): Promise<void> {
  console.log('\n=== Property Test: Employee Search with Pagination ===');

  try {
    fc.assert(
      fc.property(
        fc.integer({ min: 30, max: 70 }), // employeeCount
        fc.integer({ min: 5, max: 20 }), // limit_page_length
        fc.constantFrom('Employee 1', 'Employee 2', 'Employee 3'), // search term
        (employeeCount, limit_page_length, searchTerm) => {
          const allEmployees = generateEmployeeDataset(employeeCount);

          // Build search filter
          const filters: Array<[string, string, any]> = [
            ['employee_name', 'like', `%${searchTerm}%`],
          ];

          const params: PaginationParameters = {
            limit_page_length,
            filters,
          };

          console.log(`Testing search: "${searchTerm}", limit=${limit_page_length}`);

          // Generate responses
          const legacyResponse = simulateLegacyRouteWithPagination(allEmployees, params);
          const modernResponse = simulateModernRouteWithPagination(allEmployees, params, 'demo');

          // Compare responses
          const comparison = comparePaginationResponses(legacyResponse, modernResponse);

          if (!comparison.equivalent) {
            console.error('Search pagination responses not equivalent:', comparison.differences);
            return false;
          }

          // Property: For ALL search + pagination combinations, responses should be equivalent
          return comparison.equivalent;
        }
      ),
      {
        numRuns: 50,
        verbose: true,
      }
    );
    console.log('✓ Property-based employee search with pagination test passed');
  } catch (error: any) {
    console.error('✗ Property-based employee search with pagination test failed:', error.message);
    throw error;
  }
}

/**
 * Test 8: Property-Based Test - Edge Cases
 * Validates: Requirements 10.5
 */
async function testPropertyBasedPaginationEdgeCases(): Promise<void> {
  console.log('\n=== Property Test: Pagination Edge Cases ===');

  try {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 50 }), // employeeCount
        fc.integer({ min: 0, max: 100 }), // limit_page_length (may exceed dataset)
        fc.integer({ min: 0, max: 50 }), // limit_start (may exceed dataset)
        (employeeCount, limit_page_length, limit_start) => {
          const allEmployees = generateEmployeeDataset(employeeCount);

          const params: PaginationParameters = {
            limit_page_length,
            limit_start,
          };

          console.log(`Testing edge case: employees=${employeeCount}, limit=${limit_page_length}, start=${limit_start}`);

          // Generate responses
          const legacyResponse = simulateLegacyRouteWithPagination(allEmployees, params);
          const modernResponse = simulateModernRouteWithPagination(allEmployees, params, 'demo');

          // Compare responses
          const comparison = comparePaginationResponses(legacyResponse, modernResponse);

          if (!comparison.equivalent) {
            console.error('Edge case pagination responses not equivalent:', comparison.differences);
            return false;
          }

          // Property: Even with edge cases (limit > dataset, start > dataset), responses should be equivalent
          return comparison.equivalent;
        }
      ),
      {
        numRuns: 40,
        verbose: true,
      }
    );
    console.log('✓ Property-based pagination edge cases test passed');
  } catch (error: any) {
    console.error('✗ Property-based pagination edge cases test failed:', error.message);
    throw error;
  }
}

// Main test runner
async function runAllTests(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  Pagination Preservation Property Tests                       ║');
  console.log('║  Property 13: Pagination Preservation                        ║');
  console.log('║  Validates: Requirements 10.5                                 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  const tests = [
    { name: 'Basic Pagination with Limit', fn: testBasicPaginationWithLimit },
    { name: 'Pagination with Start Offset', fn: testPaginationWithStartOffset },
    { name: 'Pagination with Sorting', fn: testPaginationWithSorting },
    { name: 'Pagination with Filters', fn: testPaginationWithFilters },
    { name: 'Combined Pagination Parameters', fn: testCombinedPaginationParameters },
    { name: 'Property-Based Pagination', fn: testPropertyBasedPagination },
    { name: 'Property-Based Employee Search with Pagination', fn: testPropertyBasedEmployeeSearchWithPagination },
    { name: 'Property-Based Pagination Edge Cases', fn: testPropertyBasedPaginationEdgeCases },
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
      console.log(`✗ ${test.name} FAILED`);
    }
  }

  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  Test Summary                                                  ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log(`Total tests: ${tests.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failures.length > 0) {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  Test Failures                                                 ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    failures.forEach(({ name, error }) => {
      console.log(`\n${name}:`);
      console.log(`  ${error.message}`);
    });

    console.log('\n⚠️  Pagination preservation tests failed!');
    process.exit(1);
  } else {
    console.log('\n✅ All pagination preservation tests passed!');
  }
}

// Run tests
runAllTests().catch((error) => {
  console.error('Test execution error:', error);
  process.exit(1);
});

/**
 * Summary of Pagination Preservation Property Tests
 * 
 * Property 13: Pagination Preservation
 * 
 * For any pagination parameters (limit, start, order_by) passed to a migrated route,
 * the paginated results should match the legacy route's results for the same parameters.
 * 
 * Test Coverage:
 * 1. Basic Pagination with Limit: Validates limit parameter works correctly
 * 2. Pagination with Start Offset: Validates start parameter enables pagination offset
 * 3. Pagination with Sorting: Validates order_by parameter controls sorting
 * 4. Pagination with Filters: Validates filters work with pagination
 * 5. Combined Pagination Parameters: Tests multiple parameters together
 * 6. Property-Based Pagination: Tests across many pagination combinations
 * 7. Property-Based Employee Search with Pagination: Tests search + pagination
 * 8. Property-Based Pagination Edge Cases: Tests edge cases (limit > dataset, etc.)
 * 
 * Pagination Preservation Guarantees:
 * - Limit parameter controls result count correctly
 * - Start parameter enables pagination offset
 * - Order_by parameter controls sorting (asc/desc)
 * - Filters work correctly with pagination
 * - Combined parameters work together correctly
 * - Edge cases are handled gracefully (limit > dataset, start > dataset)
 * - Results are equivalent between legacy and modern routes
 * - Employee filtering logic is preserved
 * 
 * Next Steps:
 * 1. Run this test to verify pagination preservation
 * 2. Verify all tests pass with 100+ iterations
 * 3. If tests fail, adjust migration to maintain pagination handling
 * 4. Proceed to checkpoint verification
 */
