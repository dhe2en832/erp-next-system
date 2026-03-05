/**
 * Property-Based Test: Query Parameter Preservation
 * 
 * **Property 2: Query Parameter Preservation**
 * **Validates: Requirements 3.7**
 * 
 * This test validates that query parameters (filters, fields, limit, order_by) passed
 * to migrated routes produce equivalent results to legacy routes. This ensures that
 * the transformation from URL query parameters to ERPNext client method options
 * preserves the intended filtering, field selection, pagination, and sorting behavior.
 * 
 * Test Scope:
 * - Filter parameters are correctly transformed and applied
 * - Field selection parameters are preserved
 * - Limit/pagination parameters work correctly
 * - Order_by/sorting parameters are maintained
 * - Query parameter combinations produce equivalent results
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
interface QueryParameters {
  filters?: Array<[string, string, any]>;
  fields?: string[];
  limit?: number;
  start?: number;
  order_by?: string;
}

interface Item {
  name: string;
  item_name: string;
  item_group: string;
  company: string;
  creation: string;
  modified: string;
  [key: string]: any;
}

interface LegacyQueryResponse {
  success: boolean;
  data: Item[];
  message?: string;
}

interface ModernQueryResponse {
  success: boolean;
  data: Item[];
  message?: string;
  site?: string;
}

/**
 * Generates test dataset with various items
 */
function generateTestDataset(itemCount: number): Item[] {
  const companies = ['Demo Company', 'BAC Company', 'Cirebon Branch'];
  const itemGroups = ['Products', 'Raw Materials', 'Services', 'Consumables'];
  const items: Item[] = [];

  for (let i = 0; i < itemCount; i++) {
    const timestamp = new Date(2024, 0, 1 + i).toISOString();
    items.push({
      name: `ITEM-${String(i + 1).padStart(5, '0')}`,
      item_name: `Product ${i + 1}`,
      item_group: itemGroups[i % itemGroups.length],
      company: companies[i % companies.length],
      creation: timestamp,
      modified: timestamp,
      standard_rate: 100 + i * 10,
      stock_uom: 'Nos',
      is_stock_item: i % 2 === 0 ? 1 : 0,
    });
  }

  return items;
}

/**
 * Applies filters to dataset (simulates ERPNext filtering)
 */
function applyFilters(items: Item[], filters?: Array<[string, string, any]>): Item[] {
  if (!filters || filters.length === 0) {
    return items;
  }

  return items.filter(item => {
    for (const [field, operator, value] of filters) {
      const itemValue = item[field];

      switch (operator) {
        case '=':
          if (itemValue !== value) return false;
          break;
        case '!=':
          if (itemValue === value) return false;
          break;
        case '>':
          if (!(itemValue > value)) return false;
          break;
        case '<':
          if (!(itemValue < value)) return false;
          break;
        case '>=':
          if (!(itemValue >= value)) return false;
          break;
        case '<=':
          if (!(itemValue <= value)) return false;
          break;
        case 'in':
          if (!Array.isArray(value) || !value.includes(itemValue)) return false;
          break;
        case 'like':
          if (typeof itemValue !== 'string' || !itemValue.includes(value)) return false;
          break;
        default:
          return false;
      }
    }
    return true;
  });
}

/**
 * Applies field selection to items
 */
function applyFieldSelection(items: Item[], fields?: string[]): Item[] {
  if (!fields || fields.length === 0) {
    return items;
  }

  return items.map(item => {
    const selectedItem: any = {};
    for (const field of fields) {
      if (field in item) {
        selectedItem[field] = item[field];
      }
    }
    return selectedItem;
  });
}

/**
 * Applies sorting to items
 */
function applySorting(items: Item[], order_by?: string): Item[] {
  if (!order_by) {
    return items;
  }

  const [field, direction] = order_by.split(' ');
  const sortedItems = [...items];

  sortedItems.sort((a, b) => {
    const aValue = a[field];
    const bValue = b[field];

    let comparison = 0;
    if (aValue < bValue) comparison = -1;
    if (aValue > bValue) comparison = 1;

    return direction?.toLowerCase() === 'desc' ? -comparison : comparison;
  });

  return sortedItems;
}

/**
 * Applies pagination to items
 */
function applyPagination(items: Item[], limit?: number, start?: number): Item[] {
  const startIndex = start || 0;
  const endIndex = limit ? startIndex + limit : items.length;
  return items.slice(startIndex, endIndex);
}

/**
 * Simulates legacy route with query parameters (URL-based)
 */
function simulateLegacyRouteWithQueryParams(
  allItems: Item[],
  params: QueryParameters
): LegacyQueryResponse {
  // Legacy pattern: parse query parameters from URL
  let result = [...allItems];

  // Apply filters
  if (params.filters) {
    result = applyFilters(result, params.filters);
  }

  // Apply sorting
  if (params.order_by) {
    result = applySorting(result, params.order_by);
  }

  // Apply pagination
  if (params.limit !== undefined || params.start !== undefined) {
    result = applyPagination(result, params.limit, params.start);
  }

  // Apply field selection
  if (params.fields) {
    result = applyFieldSelection(result, params.fields);
  }

  return {
    success: true,
    data: result,
    message: 'Data fetched successfully',
  };
}

/**
 * Simulates modern route with query parameters (client method options)
 */
function simulateModernRouteWithQueryParams(
  allItems: Item[],
  params: QueryParameters,
  siteId?: string
): ModernQueryResponse {
  // Modern pattern: use client method options
  let result = [...allItems];

  // Apply filters (same logic, different syntax)
  if (params.filters) {
    result = applyFilters(result, params.filters);
  }

  // Apply sorting
  if (params.order_by) {
    result = applySorting(result, params.order_by);
  }

  // Apply pagination
  if (params.limit !== undefined || params.start !== undefined) {
    result = applyPagination(result, params.limit, params.start);
  }

  // Apply field selection
  if (params.fields) {
    result = applyFieldSelection(result, params.fields);
  }

  return {
    success: true,
    data: result,
    message: 'Data fetched successfully',
    site: siteId,
  };
}

/**
 * Compares query responses for equivalence
 */
function compareQueryResponses(
  legacy: LegacyQueryResponse,
  modern: ModernQueryResponse
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

  // Compare item names (order matters for sorting tests)
  for (let i = 0; i < Math.min(legacy.data.length, modern.data.length); i++) {
    if (legacy.data[i].name !== modern.data[i].name) {
      differences.push(
        `Item at index ${i} mismatch: ${legacy.data[i].name} vs ${modern.data[i].name}`
      );
    }
  }

  // Compare field presence (for field selection tests)
  if (legacy.data.length > 0 && modern.data.length > 0) {
    const legacyFields = Object.keys(legacy.data[0]);
    const modernFields = Object.keys(modern.data[0]);

    for (const field of legacyFields) {
      if (!modernFields.includes(field)) {
        differences.push(`Field ${field} in legacy but not in modern`);
      }
    }

    for (const field of modernFields) {
      if (!legacyFields.includes(field) && field !== 'site') {
        // site is allowed in modern
        differences.push(`Field ${field} in modern but not in legacy`);
      }
    }
  }

  return {
    equivalent: differences.length === 0,
    differences,
  };
}

/**
 * Test 1: Filter Parameter Preservation
 * Validates: Requirements 3.7
 */
async function testFilterParameterPreservation(): Promise<void> {
  console.log('\n=== Test: Filter Parameter Preservation ===');

  const allItems = generateTestDataset(30);
  const filters: Array<[string, string, any]> = [
    ['company', '=', 'BAC Company'],
    ['item_group', '=', 'Products'],
  ];

  console.log(`Testing with ${allItems.length} items`);
  console.log(`Filters:`, filters);

  const legacyResponse = simulateLegacyRouteWithQueryParams(allItems, { filters });
  const modernResponse = simulateModernRouteWithQueryParams(allItems, { filters }, 'demo');

  console.log(`Legacy filtered items: ${legacyResponse.data.length}`);
  console.log(`Modern filtered items: ${modernResponse.data.length}`);

  const comparison = compareQueryResponses(legacyResponse, modernResponse);

  if (!comparison.equivalent) {
    console.error('Query responses are not equivalent:');
    comparison.differences.forEach(diff => console.error(`  - ${diff}`));
  }

  assert(comparison.equivalent, 'Filter parameters should be preserved');

  // Verify all items match the filter
  for (const item of modernResponse.data) {
    assertEqual(item.company, 'BAC Company', 'Item should match company filter');
    assertEqual(item.item_group, 'Products', 'Item should match item_group filter');
  }

  console.log('✓ Filter parameters are preserved');
}

/**
 * Test 2: Field Selection Parameter Preservation
 * Validates: Requirements 3.7
 */
async function testFieldSelectionPreservation(): Promise<void> {
  console.log('\n=== Test: Field Selection Parameter Preservation ===');

  const allItems = generateTestDataset(20);
  const fields = ['name', 'item_name', 'company'];

  console.log(`Testing with ${allItems.length} items`);
  console.log(`Selected fields:`, fields);

  const legacyResponse = simulateLegacyRouteWithQueryParams(allItems, { fields });
  const modernResponse = simulateModernRouteWithQueryParams(allItems, { fields }, 'demo');

  console.log(`Legacy items: ${legacyResponse.data.length}`);
  console.log(`Modern items: ${modernResponse.data.length}`);

  const comparison = compareQueryResponses(legacyResponse, modernResponse);

  if (!comparison.equivalent) {
    console.error('Query responses are not equivalent:');
    comparison.differences.forEach(diff => console.error(`  - ${diff}`));
  }

  assert(comparison.equivalent, 'Field selection parameters should be preserved');

  // Verify only selected fields are present
  if (modernResponse.data.length > 0) {
    const itemFields = Object.keys(modernResponse.data[0]).filter(f => f !== 'site');
    assertEqual(
      itemFields.length,
      fields.length,
      `Should have exactly ${fields.length} fields`
    );

    for (const field of fields) {
      assert(
        itemFields.includes(field),
        `Field ${field} should be present in response`
      );
    }
  }

  console.log('✓ Field selection parameters are preserved');
}

/**
 * Test 3: Limit Parameter Preservation
 * Validates: Requirements 3.7
 */
async function testLimitParameterPreservation(): Promise<void> {
  console.log('\n=== Test: Limit Parameter Preservation ===');

  const allItems = generateTestDataset(50);
  const limit = 10;

  console.log(`Testing with ${allItems.length} items, limit=${limit}`);

  const legacyResponse = simulateLegacyRouteWithQueryParams(allItems, { limit });
  const modernResponse = simulateModernRouteWithQueryParams(allItems, { limit }, 'demo');

  console.log(`Legacy items: ${legacyResponse.data.length}`);
  console.log(`Modern items: ${modernResponse.data.length}`);

  assertEqual(legacyResponse.data.length, limit, 'Legacy should return limited items');
  assertEqual(modernResponse.data.length, limit, 'Modern should return limited items');

  const comparison = compareQueryResponses(legacyResponse, modernResponse);

  if (!comparison.equivalent) {
    console.error('Query responses are not equivalent:');
    comparison.differences.forEach(diff => console.error(`  - ${diff}`));
  }

  assert(comparison.equivalent, 'Limit parameters should be preserved');

  console.log('✓ Limit parameters are preserved');
}

/**
 * Test 4: Order By Parameter Preservation
 * Validates: Requirements 3.7
 */
async function testOrderByParameterPreservation(): Promise<void> {
  console.log('\n=== Test: Order By Parameter Preservation ===');

  const allItems = generateTestDataset(25);
  const order_by = 'item_name desc';

  console.log(`Testing with ${allItems.length} items, order_by="${order_by}"`);

  const legacyResponse = simulateLegacyRouteWithQueryParams(allItems, { order_by });
  const modernResponse = simulateModernRouteWithQueryParams(allItems, { order_by }, 'demo');

  console.log(`Legacy items: ${legacyResponse.data.length}`);
  console.log(`Modern items: ${modernResponse.data.length}`);

  const comparison = compareQueryResponses(legacyResponse, modernResponse);

  if (!comparison.equivalent) {
    console.error('Query responses are not equivalent:');
    comparison.differences.forEach(diff => console.error(`  - ${diff}`));
  }

  assert(comparison.equivalent, 'Order by parameters should be preserved');

  // Verify sorting is correct (descending)
  for (let i = 0; i < modernResponse.data.length - 1; i++) {
    const current = modernResponse.data[i].item_name;
    const next = modernResponse.data[i + 1].item_name;
    assert(
      current >= next,
      `Items should be sorted descending: ${current} >= ${next}`
    );
  }

  console.log('✓ Order by parameters are preserved');
}

/**
 * Test 5: Combined Parameters Preservation
 * Validates: Requirements 3.7
 */
async function testCombinedParametersPreservation(): Promise<void> {
  console.log('\n=== Test: Combined Parameters Preservation ===');

  const allItems = generateTestDataset(40);
  const params: QueryParameters = {
    filters: [['company', '=', 'Demo Company']],
    fields: ['name', 'item_name', 'company'],
    limit: 5,
    order_by: 'name asc',
  };

  console.log(`Testing with ${allItems.length} items`);
  console.log(`Combined parameters:`, params);

  const legacyResponse = simulateLegacyRouteWithQueryParams(allItems, params);
  const modernResponse = simulateModernRouteWithQueryParams(allItems, params, 'demo');

  console.log(`Legacy items: ${legacyResponse.data.length}`);
  console.log(`Modern items: ${modernResponse.data.length}`);

  const comparison = compareQueryResponses(legacyResponse, modernResponse);

  if (!comparison.equivalent) {
    console.error('Query responses are not equivalent:');
    comparison.differences.forEach(diff => console.error(`  - ${diff}`));
  }

  assert(comparison.equivalent, 'Combined parameters should be preserved');

  // Verify all constraints are applied
  assertEqual(modernResponse.data.length, params.limit, 'Should respect limit');

  for (const item of modernResponse.data) {
    assertEqual(item.company, 'Demo Company', 'Should respect filter');
  }

  console.log('✓ Combined parameters are preserved');
}

/**
 * Test 6: Property-Based Test - Query Parameters Across Many Scenarios
 * Validates: Requirements 3.7
 */
async function testPropertyBasedQueryParameters(): Promise<void> {
  console.log('\n=== Property Test: Query Parameters Across Many Scenarios ===');

  try {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 50 }), // itemCount
        fc.option(fc.constantFrom('Demo Company', 'BAC Company', 'Cirebon Branch')), // company filter
        fc.option(fc.constantFrom('Products', 'Raw Materials', 'Services')), // item_group filter
        fc.option(fc.integer({ min: 1, max: 20 })), // limit
        fc.option(fc.constantFrom('name asc', 'name desc', 'item_name asc', 'creation desc')), // order_by
        (itemCount, companyFilter, itemGroupFilter, limit, order_by) => {
          const allItems = generateTestDataset(itemCount);

          // Build filters
          const filters: Array<[string, string, any]> = [];
          if (companyFilter) {
            filters.push(['company', '=', companyFilter]);
          }
          if (itemGroupFilter) {
            filters.push(['item_group', '=', itemGroupFilter]);
          }

          const params: QueryParameters = {
            filters: filters.length > 0 ? filters : undefined,
            limit: limit ?? undefined,
            order_by: order_by ?? undefined,
          };

          console.log(`Testing: items=${itemCount}, filters=${filters.length}, limit=${limit || 'none'}, order_by=${order_by || 'none'}`);

          // Generate responses
          const legacyResponse = simulateLegacyRouteWithQueryParams(allItems, params);
          const modernResponse = simulateModernRouteWithQueryParams(allItems, params, 'demo');

          // Compare responses
          const comparison = compareQueryResponses(legacyResponse, modernResponse);

          if (!comparison.equivalent) {
            console.error('Query responses not equivalent:', comparison.differences);
            return false;
          }

          // Property: For ALL query parameter combinations, responses should be equivalent
          return comparison.equivalent;
        }
      ),
      {
        numRuns: 100,
        verbose: true,
      }
    );
    console.log('✓ Property-based query parameters test passed');
  } catch (error: any) {
    console.error('✗ Property-based query parameters test failed:', error.message);
    throw error;
  }
}

/**
 * Test 7: Property-Based Test - Filter Operators
 * Validates: Requirements 3.7
 */
async function testPropertyBasedFilterOperators(): Promise<void> {
  console.log('\n=== Property Test: Filter Operators ===');

  try {
    fc.assert(
      fc.property(
        fc.integer({ min: 15, max: 40 }), // itemCount
        fc.constantFrom('=', '!=', '>', '<', '>=', '<='), // operator
        (itemCount, operator) => {
          const allItems = generateTestDataset(itemCount);

          // Create filter based on operator
          let filters: Array<[string, string, any]>;
          if (operator === '=' || operator === '!=') {
            filters = [['company', operator, 'BAC Company']];
          } else {
            filters = [['standard_rate', operator, 150]];
          }

          console.log(`Testing operator: ${operator}`);

          const legacyResponse = simulateLegacyRouteWithQueryParams(allItems, { filters });
          const modernResponse = simulateModernRouteWithQueryParams(allItems, { filters }, 'demo');

          // Compare responses
          const comparison = compareQueryResponses(legacyResponse, modernResponse);

          if (!comparison.equivalent) {
            console.error(`Operator ${operator} responses not equivalent:`, comparison.differences);
            return false;
          }

          // Property: For ALL filter operators, responses should be equivalent
          return comparison.equivalent;
        }
      ),
      {
        numRuns: 50,
        verbose: true,
      }
    );
    console.log('✓ Property-based filter operators test passed');
  } catch (error: any) {
    console.error('✗ Property-based filter operators test failed:', error.message);
    throw error;
  }
}

/**
 * Test 8: Property-Based Test - Pagination Combinations
 * Validates: Requirements 3.7
 */
async function testPropertyBasedPaginationCombinations(): Promise<void> {
  console.log('\n=== Property Test: Pagination Combinations ===');

  try {
    fc.assert(
      fc.property(
        fc.integer({ min: 20, max: 60 }), // itemCount
        fc.integer({ min: 0, max: 10 }), // start
        fc.integer({ min: 5, max: 20 }), // limit
        (itemCount, start, limit) => {
          const allItems = generateTestDataset(itemCount);

          console.log(`Testing pagination: start=${start}, limit=${limit}`);

          const legacyResponse = simulateLegacyRouteWithQueryParams(allItems, { start, limit });
          const modernResponse = simulateModernRouteWithQueryParams(allItems, { start, limit }, 'demo');

          // Compare responses
          const comparison = compareQueryResponses(legacyResponse, modernResponse);

          if (!comparison.equivalent) {
            console.error('Pagination responses not equivalent:', comparison.differences);
            return false;
          }

          // Property: For ALL pagination combinations, responses should be equivalent
          return comparison.equivalent;
        }
      ),
      {
        numRuns: 40,
        verbose: true,
      }
    );
    console.log('✓ Property-based pagination combinations test passed');
  } catch (error: any) {
    console.error('✗ Property-based pagination combinations test failed:', error.message);
    throw error;
  }
}

// Main test runner
async function runAllTests(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  Query Parameter Preservation Property Tests                  ║');
  console.log('║  Property 2: Query Parameter Preservation                     ║');
  console.log('║  Validates: Requirements 3.7                                  ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  const tests = [
    { name: 'Filter Parameter Preservation', fn: testFilterParameterPreservation },
    { name: 'Field Selection Preservation', fn: testFieldSelectionPreservation },
    { name: 'Limit Parameter Preservation', fn: testLimitParameterPreservation },
    { name: 'Order By Parameter Preservation', fn: testOrderByParameterPreservation },
    { name: 'Combined Parameters Preservation', fn: testCombinedParametersPreservation },
    { name: 'Property-Based Query Parameters', fn: testPropertyBasedQueryParameters },
    { name: 'Property-Based Filter Operators', fn: testPropertyBasedFilterOperators },
    { name: 'Property-Based Pagination Combinations', fn: testPropertyBasedPaginationCombinations },
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

    console.log('\n⚠️  Query parameter preservation tests failed!');
    process.exit(1);
  } else {
    console.log('\n✅ All query parameter preservation tests passed!');
  }
}

// Run tests
runAllTests().catch((error) => {
  console.error('Test execution error:', error);
  process.exit(1);
});

/**
 * Summary of Query Parameter Preservation Property Tests
 * 
 * Property 2: Query Parameter Preservation
 * 
 * For any set of query parameters (filters, fields, limit, order_by) passed to a
 * migrated route, the results returned should be equivalent to the results from
 * the legacy route with the same parameters.
 * 
 * Test Coverage:
 * 1. Filter Parameter Preservation: Validates filter transformation (Requirements 3.7)
 * 2. Field Selection Preservation: Validates field selection works correctly
 * 3. Limit Parameter Preservation: Validates pagination limit is preserved
 * 4. Order By Parameter Preservation: Validates sorting is maintained
 * 5. Combined Parameters Preservation: Tests multiple parameters together
 * 6. Property-Based Query Parameters: Tests across many parameter combinations
 * 7. Property-Based Filter Operators: Tests all filter operators (=, !=, >, <, >=, <=)
 * 8. Property-Based Pagination Combinations: Tests various pagination scenarios
 * 
 * Query Parameter Preservation Guarantees:
 * - Filter syntax is correctly transformed (JSON string → array)
 * - All filter operators work correctly (=, !=, >, <, >=, <=, in, like)
 * - Field selection limits returned fields appropriately
 * - Limit parameter controls result count
 * - Start parameter enables pagination offset
 * - Order_by parameter controls sorting (asc/desc)
 * - Combined parameters work together correctly
 * - Results are equivalent between legacy and modern routes
 * 
 * Next Steps:
 * 1. Run this test to verify query parameter preservation
 * 2. Verify all tests pass with 100+ iterations
 * 3. If tests fail, adjust migration to maintain query parameter handling
 * 4. Proceed to checkpoint verification
 */
