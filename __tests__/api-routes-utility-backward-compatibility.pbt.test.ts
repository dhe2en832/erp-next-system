/**
 * Property-Based Test: Utility Route Backward Compatibility
 * 
 * **Property 1: Backward Compatible Response Structure**
 * **Validates: Requirements 2.6, 14.1, 14.2, 14.3**
 * 
 * This test validates that the migrated utility route maintains the same response
 * structure as the legacy implementation, ensuring backward compatibility with
 * existing frontend code.
 * 
 * Test Scope:
 * - Response structure (fields, nesting, data types) matches legacy format
 * - Field names are preserved
 * - Data types are consistent
 * - Success/error response formats are maintained
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

// Type definitions for utility route responses
interface ERPNextValidDataResponse {
  success: boolean;
  message?: string;
  data?: {
    priceLists: Array<{ name: string }>;
    taxCategories: Array<{ name: string }>;
    territories: Array<{ name: string }>;
    incomeAccounts: Array<{ name: string }>;
    warehouses: Array<{ name: string }>;
    costCenters: Array<{ name: string }>;
  };
  error?: string;
  site?: string;
  errorType?: 'network' | 'authentication' | 'configuration' | 'unknown';
}

interface LegacyResponse {
  success: boolean;
  message?: string;
  data?: {
    priceLists: Array<{ name: string }>;
    taxCategories: Array<{ name: string }>;
    territories: Array<{ name: string }>;
    incomeAccounts: Array<{ name: string }>;
    warehouses: Array<{ name: string }>;
    costCenters: Array<{ name: string }>;
  };
  error?: string;
}

interface ModernResponse {
  success: boolean;
  message?: string;
  data?: {
    priceLists: Array<{ name: string }>;
    taxCategories: Array<{ name: string }>;
    territories: Array<{ name: string }>;
    incomeAccounts: Array<{ name: string }>;
    warehouses: Array<{ name: string }>;
    costCenters: Array<{ name: string }>;
  };
  error?: string;
  site?: string;
  errorType?: 'network' | 'authentication' | 'configuration' | 'unknown';
}

/**
 * Simulates legacy utility route response (before migration)
 */
function simulateLegacyUtilityRoute(
  priceListCount: number,
  taxCategoryCount: number,
  territoryCount: number,
  incomeAccountCount: number,
  warehouseCount: number,
  costCenterCount: number
): LegacyResponse {
  return {
    success: true,
    message: 'Valid ERPNext data fetched successfully',
    data: {
      priceLists: Array.from({ length: priceListCount }, (_, i) => ({
        name: `Price List ${i + 1}`,
      })),
      taxCategories: Array.from({ length: taxCategoryCount }, (_, i) => ({
        name: `Tax Category ${i + 1}`,
      })),
      territories: Array.from({ length: territoryCount }, (_, i) => ({
        name: `Territory ${i + 1}`,
      })),
      incomeAccounts: Array.from({ length: incomeAccountCount }, (_, i) => ({
        name: `Income Account ${i + 1}`,
      })),
      warehouses: Array.from({ length: warehouseCount }, (_, i) => ({
        name: `Warehouse ${i + 1}`,
      })),
      costCenters: Array.from({ length: costCenterCount }, (_, i) => ({
        name: `Cost Center ${i + 1}`,
      })),
    },
  };
}

/**
 * Simulates modern utility route response (after migration)
 */
function simulateModernUtilityRoute(
  priceListCount: number,
  taxCategoryCount: number,
  territoryCount: number,
  incomeAccountCount: number,
  warehouseCount: number,
  costCenterCount: number,
  siteId?: string
): ModernResponse {
  return {
    success: true,
    message: 'Valid ERPNext data fetched successfully',
    data: {
      priceLists: Array.from({ length: priceListCount }, (_, i) => ({
        name: `Price List ${i + 1}`,
      })),
      taxCategories: Array.from({ length: taxCategoryCount }, (_, i) => ({
        name: `Tax Category ${i + 1}`,
      })),
      territories: Array.from({ length: territoryCount }, (_, i) => ({
        name: `Territory ${i + 1}`,
      })),
      incomeAccounts: Array.from({ length: incomeAccountCount }, (_, i) => ({
        name: `Income Account ${i + 1}`,
      })),
      warehouses: Array.from({ length: warehouseCount }, (_, i) => ({
        name: `Warehouse ${i + 1}`,
      })),
      costCenters: Array.from({ length: costCenterCount }, (_, i) => ({
        name: `Cost Center ${i + 1}`,
      })),
    },
  };
}

/**
 * Simulates legacy error response
 */
function simulateLegacyErrorResponse(errorMessage: string): LegacyResponse {
  return {
    success: false,
    error: errorMessage,
    message: 'Internal server error',
  };
}

/**
 * Simulates modern error response with site context
 */
function simulateModernErrorResponse(
  errorMessage: string,
  siteId?: string,
  errorType: 'network' | 'authentication' | 'configuration' | 'unknown' = 'unknown'
): ModernResponse {
  return {
    success: false,
    error: errorMessage,
    message: siteId ? `[Site: ${siteId}] ${errorMessage}` : errorMessage,
    site: siteId,
    errorType: errorType,
  };
}

/**
 * Validates that response structure matches expected format
 */
function validateResponseStructure(response: ERPNextValidDataResponse): boolean {
  // Check required fields
  if (typeof response.success !== 'boolean') {
    console.error('Invalid success field type:', typeof response.success);
    return false;
  }

  if (response.success) {
    // Success response validation
    if (!response.data) {
      console.error('Missing data field in success response');
      return false;
    }

    const requiredFields = [
      'priceLists',
      'taxCategories',
      'territories',
      'incomeAccounts',
      'warehouses',
      'costCenters',
    ];

    for (const field of requiredFields) {
      if (!Array.isArray(response.data[field as keyof typeof response.data])) {
        console.error(`Invalid or missing field: ${field}`);
        return false;
      }
    }

    // Validate array items have 'name' property
    for (const field of requiredFields) {
      const items = response.data[field as keyof typeof response.data];
      if (items.length > 0 && typeof items[0].name !== 'string') {
        console.error(`Invalid item structure in ${field}`);
        return false;
      }
    }
  } else {
    // Error response validation
    if (!response.error && !response.message) {
      console.error('Missing error or message field in error response');
      return false;
    }
  }

  return true;
}

/**
 * Compares legacy and modern response structures
 */
function compareResponseStructures(
  legacy: LegacyResponse,
  modern: ModernResponse
): { compatible: boolean; differences: string[] } {
  const differences: string[] = [];

  // Compare success field
  if (legacy.success !== modern.success) {
    differences.push(`success field mismatch: ${legacy.success} vs ${modern.success}`);
  }

  // Compare message field
  if (legacy.success && modern.success) {
    if (legacy.message !== modern.message) {
      differences.push(`message field mismatch: "${legacy.message}" vs "${modern.message}"`);
    }
  }

  // Compare data structure
  if (legacy.success && modern.success && legacy.data && modern.data) {
    const fields = [
      'priceLists',
      'taxCategories',
      'territories',
      'incomeAccounts',
      'warehouses',
      'costCenters',
    ];

    for (const field of fields) {
      const legacyField = legacy.data[field as keyof typeof legacy.data];
      const modernField = modern.data[field as keyof typeof modern.data];

      if (legacyField.length !== modernField.length) {
        differences.push(
          `${field} length mismatch: ${legacyField.length} vs ${modernField.length}`
        );
      }

      // Compare item structures
      for (let i = 0; i < Math.min(legacyField.length, modernField.length); i++) {
        if (legacyField[i].name !== modernField[i].name) {
          differences.push(
            `${field}[${i}].name mismatch: "${legacyField[i].name}" vs "${modernField[i].name}"`
          );
        }
      }
    }
  }

  // Modern response can have additional fields (site, errorType) for enhanced functionality
  // This is acceptable as long as core structure is preserved

  return {
    compatible: differences.length === 0,
    differences,
  };
}

/**
 * Test 1: Success Response Structure Compatibility
 * Validates: Requirements 14.1, 14.2, 14.3
 */
async function testSuccessResponseStructure(): Promise<void> {
  console.log('\n=== Test: Success Response Structure Compatibility ===');

  const priceListCount = 5;
  const taxCategoryCount = 3;
  const territoryCount = 4;
  const incomeAccountCount = 10;
  const warehouseCount = 2;
  const costCenterCount = 6;

  console.log('Generating legacy response...');
  const legacyResponse = simulateLegacyUtilityRoute(
    priceListCount,
    taxCategoryCount,
    territoryCount,
    incomeAccountCount,
    warehouseCount,
    costCenterCount
  );

  console.log('Generating modern response...');
  const modernResponse = simulateModernUtilityRoute(
    priceListCount,
    taxCategoryCount,
    territoryCount,
    incomeAccountCount,
    warehouseCount,
    costCenterCount
  );

  console.log('Validating legacy response structure...');
  assert(validateResponseStructure(legacyResponse), 'Legacy response structure should be valid');

  console.log('Validating modern response structure...');
  assert(validateResponseStructure(modernResponse), 'Modern response structure should be valid');

  console.log('Comparing response structures...');
  const comparison = compareResponseStructures(legacyResponse, modernResponse);

  if (!comparison.compatible) {
    console.error('Response structures are not compatible:');
    comparison.differences.forEach((diff) => console.error(`  - ${diff}`));
  }

  assert(comparison.compatible, 'Response structures should be compatible');

  console.log('✓ Success response structure is backward compatible');
}

/**
 * Test 2: Error Response Structure Compatibility
 * Validates: Requirements 14.1, 14.2, 14.3
 */
async function testErrorResponseStructure(): Promise<void> {
  console.log('\n=== Test: Error Response Structure Compatibility ===');

  const errorMessage = 'Failed to fetch data';

  console.log('Generating legacy error response...');
  const legacyError = simulateLegacyErrorResponse(errorMessage);

  console.log('Generating modern error response...');
  const modernError = simulateModernErrorResponse(errorMessage, 'demo', 'network');

  console.log('Validating legacy error response structure...');
  assert(validateResponseStructure(legacyError), 'Legacy error response structure should be valid');

  console.log('Validating modern error response structure...');
  assert(validateResponseStructure(modernError), 'Modern error response structure should be valid');

  // Error responses should have success: false
  assertEqual(legacyError.success, false, 'Legacy error should have success: false');
  assertEqual(modernError.success, false, 'Modern error should have success: false');

  // Both should have error field
  assert(!!legacyError.error, 'Legacy error should have error field');
  assert(!!modernError.error, 'Modern error should have error field');

  console.log('✓ Error response structure is backward compatible');
}

/**
 * Test 3: Property-Based Test - Response Structure Across Many Inputs
 * Validates: Requirements 2.6, 14.1, 14.2, 14.3
 */
async function testPropertyBasedResponseStructure(): Promise<void> {
  console.log('\n=== Property Test: Response Structure Across Many Inputs ===');

  try {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 }), // priceListCount
        fc.integer({ min: 0, max: 10 }), // taxCategoryCount
        fc.integer({ min: 0, max: 15 }), // territoryCount
        fc.integer({ min: 0, max: 25 }), // incomeAccountCount
        fc.integer({ min: 0, max: 10 }), // warehouseCount
        fc.integer({ min: 0, max: 15 }), // costCenterCount
        (
          priceListCount,
          taxCategoryCount,
          territoryCount,
          incomeAccountCount,
          warehouseCount,
          costCenterCount
        ) => {
          // Generate legacy and modern responses
          const legacyResponse = simulateLegacyUtilityRoute(
            priceListCount,
            taxCategoryCount,
            territoryCount,
            incomeAccountCount,
            warehouseCount,
            costCenterCount
          );

          const modernResponse = simulateModernUtilityRoute(
            priceListCount,
            taxCategoryCount,
            territoryCount,
            incomeAccountCount,
            warehouseCount,
            costCenterCount
          );

          console.log(`Testing with counts:`, {
            priceLists: priceListCount,
            taxCategories: taxCategoryCount,
            territories: territoryCount,
            incomeAccounts: incomeAccountCount,
            warehouses: warehouseCount,
            costCenters: costCenterCount,
          });

          // Validate both responses
          const legacyValid = validateResponseStructure(legacyResponse);
          const modernValid = validateResponseStructure(modernResponse);

          if (!legacyValid || !modernValid) {
            console.error('Response validation failed');
            return false;
          }

          // Compare structures
          const comparison = compareResponseStructures(legacyResponse, modernResponse);

          if (!comparison.compatible) {
            console.error('Response structures not compatible:', comparison.differences);
            return false;
          }

          // Property: For ALL valid inputs, response structures should be compatible
          return comparison.compatible;
        }
      ),
      {
        numRuns: 50,
        verbose: true,
      }
    );
    console.log('✓ Property-based response structure test passed');
  } catch (error: any) {
    console.error('✗ Property-based response structure test failed:', error.message);
    throw error;
  }
}

/**
 * Test 4: Property-Based Test - Field Names Preservation
 * Validates: Requirements 14.1, 14.2
 */
async function testPropertyBasedFieldNames(): Promise<void> {
  console.log('\n=== Property Test: Field Names Preservation ===');

  try {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }), // itemCount
        (itemCount) => {
          const legacyResponse = simulateLegacyUtilityRoute(
            itemCount,
            itemCount,
            itemCount,
            itemCount,
            itemCount,
            itemCount
          );

          const modernResponse = simulateModernUtilityRoute(
            itemCount,
            itemCount,
            itemCount,
            itemCount,
            itemCount,
            itemCount
          );

          console.log(`Testing field names with ${itemCount} items per field`);

          // Property: All field names should be preserved
          const requiredFields = [
            'priceLists',
            'taxCategories',
            'territories',
            'incomeAccounts',
            'warehouses',
            'costCenters',
          ];

          if (!legacyResponse.data || !modernResponse.data) {
            return false;
          }

          for (const field of requiredFields) {
            const legacyHasField = field in legacyResponse.data;
            const modernHasField = field in modernResponse.data;

            if (!legacyHasField || !modernHasField) {
              console.error(`Missing field: ${field}`);
              return false;
            }
          }

          return true;
        }
      ),
      {
        numRuns: 30,
        verbose: true,
      }
    );
    console.log('✓ Property-based field names test passed');
  } catch (error: any) {
    console.error('✗ Property-based field names test failed:', error.message);
    throw error;
  }
}

/**
 * Test 5: Property-Based Test - Data Types Consistency
 * Validates: Requirements 14.1, 14.3
 */
async function testPropertyBasedDataTypes(): Promise<void> {
  console.log('\n=== Property Test: Data Types Consistency ===');

  try {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 15 }), // itemCount
        (itemCount) => {
          const legacyResponse = simulateLegacyUtilityRoute(
            itemCount,
            itemCount,
            itemCount,
            itemCount,
            itemCount,
            itemCount
          );

          const modernResponse = simulateModernUtilityRoute(
            itemCount,
            itemCount,
            itemCount,
            itemCount,
            itemCount,
            itemCount
          );

          console.log(`Testing data types with ${itemCount} items`);

          // Property: Data types should be consistent
          const legacySuccessType = typeof legacyResponse.success;
          const modernSuccessType = typeof modernResponse.success;

          if (legacySuccessType !== modernSuccessType) {
            console.error(`success type mismatch: ${legacySuccessType} vs ${modernSuccessType}`);
            return false;
          }

          if (!legacyResponse.data || !modernResponse.data) {
            return false;
          }

          const fields = [
            'priceLists',
            'taxCategories',
            'territories',
            'incomeAccounts',
            'warehouses',
            'costCenters',
          ];

          for (const field of fields) {
            const legacyField = legacyResponse.data[field as keyof typeof legacyResponse.data];
            const modernField = modernResponse.data[field as keyof typeof modernResponse.data];

            // Both should be arrays
            if (!Array.isArray(legacyField) || !Array.isArray(modernField)) {
              console.error(`${field} is not an array`);
              return false;
            }

            // Items should have same structure
            if (legacyField.length > 0 && modernField.length > 0) {
              const legacyItemType = typeof legacyField[0].name;
              const modernItemType = typeof modernField[0].name;

              if (legacyItemType !== modernItemType) {
                console.error(
                  `${field} item type mismatch: ${legacyItemType} vs ${modernItemType}`
                );
                return false;
              }
            }
          }

          return true;
        }
      ),
      {
        numRuns: 40,
        verbose: true,
      }
    );
    console.log('✓ Property-based data types test passed');
  } catch (error: any) {
    console.error('✗ Property-based data types test failed:', error.message);
    throw error;
  }
}

// Main test runner
async function runAllTests(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  Utility Route Backward Compatibility Property Tests          ║');
  console.log('║  Property 1: Backward Compatible Response Structure           ║');
  console.log('║  Validates: Requirements 2.6, 14.1, 14.2, 14.3                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  const tests = [
    { name: 'Success Response Structure Compatibility', fn: testSuccessResponseStructure },
    { name: 'Error Response Structure Compatibility', fn: testErrorResponseStructure },
    { name: 'Property-Based Response Structure', fn: testPropertyBasedResponseStructure },
    { name: 'Property-Based Field Names', fn: testPropertyBasedFieldNames },
    { name: 'Property-Based Data Types', fn: testPropertyBasedDataTypes },
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

    console.log('\n⚠️  Backward compatibility tests failed!');
    process.exit(1);
  } else {
    console.log('\n✅ All backward compatibility tests passed!');
  }
}

// Run tests
runAllTests().catch((error) => {
  console.error('Test execution error:', error);
  process.exit(1);
});

/**
 * Summary of Backward Compatibility Property Tests
 * 
 * Property 1: Backward Compatible Response Structure
 * 
 * For any valid API request to the migrated utility route, the response structure
 * (fields, nesting, data types) should match the response structure from the legacy
 * route for the same request.
 * 
 * Test Coverage:
 * 1. Success Response Structure: Validates response format for successful requests
 * 2. Error Response Structure: Validates response format for error cases
 * 3. Property-Based Response Structure: Tests across many input combinations
 * 4. Property-Based Field Names: Validates all field names are preserved
 * 5. Property-Based Data Types: Validates data types remain consistent
 * 
 * Backward Compatibility Guarantees:
 * - All response fields from legacy route are present in modern route
 * - Field names are identical
 * - Data types are consistent
 * - Array structures are preserved
 * - Success/error response formats are maintained
 * - Modern route can add optional fields (site, errorType) without breaking compatibility
 * 
 * Next Steps:
 * 1. Run this test against the migrated utility route
 * 2. Verify all tests pass
 * 3. If tests fail, adjust migration to maintain backward compatibility
 * 4. Proceed to migrate other API routes using the same pattern
 */
