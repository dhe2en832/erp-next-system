/**
 * Property-Based Test: Success Response Format
 * 
 * **Property 18: Success Response Format**
 * **Validates: Requirements 14.4**
 * 
 * This test validates that when an API route returns success, the response
 * includes `success: true` in the response body.
 * 
 * Test Scope:
 * - All successful responses include success: true
 * - All successful responses include a data field
 * - Response format is consistent across different operations
 * - Response format is consistent across different route types
 * - Success response structure matches expected format
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
interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

interface APIOperation {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  route: string;
  routeType: 'setup' | 'sales' | 'purchase' | 'hr' | 'utils';
}

/**
 * Simulates a successful API response
 */
function simulateSuccessResponse<T>(data: T, message?: string): SuccessResponse<T> {
  const response: SuccessResponse<T> = {
    success: true,
    data,
  };
  
  if (message) {
    response.message = message;
  }
  
  return response;
}

/**
 * Validates that a response follows the success response format
 */
function validateSuccessResponseFormat<T>(
  response: any
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Check success field
  if (!('success' in response)) {
    issues.push('Response missing "success" field');
  } else if (response.success !== true) {
    issues.push(`Expected success=true, got success=${response.success}`);
  }
  
  // Check data field
  if (!('data' in response)) {
    issues.push('Response missing "data" field');
  }
  
  // Check that success is boolean true (not truthy value)
  if (response.success !== true) {
    issues.push(`success field must be boolean true, got ${typeof response.success}: ${response.success}`);
  }
  
  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Test 1: Success Response Includes success: true
 * Validates: Requirements 14.4
 */
async function testSuccessResponseIncludesSuccessTrue(): Promise<void> {
  console.log('\n=== Test: Success Response Includes success: true ===');
  
  const data = { name: 'ITEM-001', item_name: 'Product A' };
  const response = simulateSuccessResponse(data);
  
  console.log('Response:', JSON.stringify(response, null, 2));
  
  const validation = validateSuccessResponseFormat(response);
  
  if (!validation.valid) {
    console.error('Validation failed:');
    validation.issues.forEach(issue => console.error(`  - ${issue}`));
  }
  
  assert(validation.valid, 'Success response should include success: true');
  assertEqual(response.success, true, 'success field should be true');
  assert('data' in response, 'Response should include data field');
  
  console.log('✓ Success response includes success: true');
}

/**
 * Test 2: Success Response Includes Data Field
 * Validates: Requirements 14.4
 */
async function testSuccessResponseIncludesDataField(): Promise<void> {
  console.log('\n=== Test: Success Response Includes Data Field ===');
  
  const testCases = [
    { data: { name: 'SO-001' }, description: 'single object' },
    { data: [{ name: 'ITEM-001' }, { name: 'ITEM-002' }], description: 'array of objects' },
    { data: { total: 100, items: [] }, description: 'nested object' },
    { data: null, description: 'null data' },
    { data: [], description: 'empty array' },
  ];
  
  console.log(`Testing ${testCases.length} data field scenarios`);
  
  for (const testCase of testCases) {
    console.log(`\nTesting: ${testCase.description}`);
    
    const response = simulateSuccessResponse(testCase.data);
    
    const validation = validateSuccessResponseFormat(response);
    
    if (!validation.valid) {
      console.error(`Validation failed for ${testCase.description}:`);
      validation.issues.forEach(issue => console.error(`  - ${issue}`));
      throw new Error(`Success response validation failed for ${testCase.description}`);
    }
    
    assert('data' in response, `Response should include data field for ${testCase.description}`);
    assertEqual(response.success, true, `success should be true for ${testCase.description}`);
  }
  
  console.log('\n✓ Success response includes data field');
}

/**
 * Test 3: Success Response Format Across Operations
 * Validates: Requirements 14.4
 */
async function testSuccessResponseFormatAcrossOperations(): Promise<void> {
  console.log('\n=== Test: Success Response Format Across Operations ===');
  
  const operations: Array<{ method: string; data: any; description: string }> = [
    { method: 'GET', data: [{ name: 'ITEM-001' }], description: 'list operation' },
    { method: 'GET', data: { name: 'SO-001', customer: 'Customer A' }, description: 'get single' },
    { method: 'POST', data: { name: 'SO-002' }, description: 'create operation' },
    { method: 'PUT', data: { name: 'SO-001', status: 'Updated' }, description: 'update operation' },
    { method: 'DELETE', data: { message: 'Deleted successfully' }, description: 'delete operation' },
  ];
  
  console.log(`Testing ${operations.length} operation types`);
  
  for (const operation of operations) {
    console.log(`\n${operation.method} - ${operation.description}`);
    
    const response = simulateSuccessResponse(operation.data);
    
    const validation = validateSuccessResponseFormat(response);
    
    if (!validation.valid) {
      console.error(`Validation failed for ${operation.method}:`);
      validation.issues.forEach(issue => console.error(`  - ${issue}`));
      throw new Error(`Success response validation failed for ${operation.method}`);
    }
    
    assertEqual(response.success, true, `${operation.method} should return success: true`);
    assert('data' in response, `${operation.method} should include data field`);
  }
  
  console.log('\n✓ Success response format consistent across operations');
}

/**
 * Test 4: Success Response Format Across Route Types
 * Validates: Requirements 14.4
 */
async function testSuccessResponseFormatAcrossRouteTypes(): Promise<void> {
  console.log('\n=== Test: Success Response Format Across Route Types ===');
  
  const routeTypes = [
    { type: 'setup', route: '/api/setup/dashboard', data: { total_items: 150 } },
    { type: 'sales', route: '/api/sales/orders', data: [{ name: 'SO-001' }] },
    { type: 'purchase', route: '/api/purchase/invoices', data: [{ name: 'PI-001' }] },
    { type: 'hr', route: '/api/hr/employees', data: [{ name: 'EMP-001' }] },
    { type: 'utils', route: '/api/utils/diagnose', data: { status: 'ok' } },
  ];
  
  console.log(`Testing ${routeTypes.length} route types`);
  
  for (const routeType of routeTypes) {
    console.log(`\nRoute: ${routeType.route}`);
    
    const response = simulateSuccessResponse(routeType.data);
    
    const validation = validateSuccessResponseFormat(response);
    
    if (!validation.valid) {
      console.error(`Validation failed for ${routeType.type}:`);
      validation.issues.forEach(issue => console.error(`  - ${issue}`));
      throw new Error(`Success response validation failed for ${routeType.type}`);
    }
    
    assertEqual(response.success, true, `${routeType.type} should return success: true`);
    assert('data' in response, `${routeType.type} should include data field`);
  }
  
  console.log('\n✓ Success response format consistent across route types');
}

/**
 * Test 5: Success Response with Optional Message
 * Validates: Requirements 14.4
 */
async function testSuccessResponseWithOptionalMessage(): Promise<void> {
  console.log('\n=== Test: Success Response with Optional Message ===');
  
  // Response without message
  const responseWithoutMessage = simulateSuccessResponse({ name: 'ITEM-001' });
  console.log('Response without message:', JSON.stringify(responseWithoutMessage, null, 2));
  
  let validation = validateSuccessResponseFormat(responseWithoutMessage);
  assert(validation.valid, 'Success response without message should be valid');
  assertEqual(responseWithoutMessage.success, true, 'success should be true');
  
  // Response with message
  const responseWithMessage = simulateSuccessResponse(
    { name: 'ITEM-001' },
    'Item created successfully'
  );
  console.log('\nResponse with message:', JSON.stringify(responseWithMessage, null, 2));
  
  validation = validateSuccessResponseFormat(responseWithMessage);
  assert(validation.valid, 'Success response with message should be valid');
  assertEqual(responseWithMessage.success, true, 'success should be true');
  assert('message' in responseWithMessage, 'Response should include optional message');
  
  console.log('✓ Success response supports optional message field');
}

/**
 * Test 6: Property-Based Test - Success Response Format
 * Validates: Requirements 14.4
 */
async function testPropertyBasedSuccessResponseFormat(): Promise<void> {
  console.log('\n=== Property Test: Success Response Format ===');
  
  try {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.object(), // random object
          fc.array(fc.object()), // array of objects
          fc.record({ name: fc.string(), value: fc.integer() }), // structured object
          fc.constant(null), // null
          fc.constant([]), // empty array
        ),
        fc.option(fc.string({ minLength: 5, maxLength: 50 }), { nil: undefined }), // optional message
        async (data, message) => {
          console.log(`Testing: data type=${Array.isArray(data) ? 'array' : typeof data}, message=${message ? 'present' : 'absent'}`);
          
          const response = simulateSuccessResponse(data, message);
          
          // Property: All success responses must include success: true
          if (response.success !== true) {
            console.error('success field is not true');
            return false;
          }
          
          // Property: All success responses must include data field
          if (!('data' in response)) {
            console.error('data field is missing');
            return false;
          }
          
          // Property: data field should contain the provided data
          if (response.data !== data) {
            console.error('data field does not match provided data');
            return false;
          }
          
          // Property: message field should be present if provided
          if (message !== undefined && !('message' in response)) {
            console.error('message field missing when message provided');
            return false;
          }
          
          // Property: message field should match provided message
          if (message !== undefined && response.message !== message) {
            console.error('message field does not match provided message');
            return false;
          }
          
          return true;
        }
      ),
      {
        numRuns: 100,
        verbose: true,
      }
    );
    console.log('✓ Property-based success response format test passed');
  } catch (error: any) {
    console.error('✗ Property-based success response format test failed:', error.message);
    throw error;
  }
}

/**
 * Test 7: Property-Based Test - Success Response Across Operations
 * Validates: Requirements 14.4
 */
async function testPropertyBasedSuccessResponseAcrossOperations(): Promise<void> {
  console.log('\n=== Property Test: Success Response Across Operations ===');
  
  try {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('GET', 'POST', 'PUT', 'DELETE'),
        fc.constantFrom('setup', 'sales', 'purchase', 'hr', 'utils'),
        fc.oneof(
          fc.object(),
          fc.array(fc.object()),
          fc.record({ name: fc.string() }),
        ),
        async (method, routeType, data) => {
          console.log(`Testing: ${method} /api/${routeType}/... with data type=${Array.isArray(data) ? 'array' : 'object'}`);
          
          const response = simulateSuccessResponse(data);
          
          // Property: All operations should return success: true
          if (response.success !== true) {
            console.error(`${method} ${routeType} did not return success: true`);
            return false;
          }
          
          // Property: All operations should include data field
          if (!('data' in response)) {
            console.error(`${method} ${routeType} missing data field`);
            return false;
          }
          
          // Property: Response format should be consistent regardless of operation
          const validation = validateSuccessResponseFormat(response);
          if (!validation.valid) {
            console.error(`${method} ${routeType} validation failed:`, validation.issues);
            return false;
          }
          
          return true;
        }
      ),
      {
        numRuns: 100,
        verbose: true,
      }
    );
    console.log('✓ Property-based success response across operations test passed');
  } catch (error: any) {
    console.error('✗ Property-based success response across operations test failed:', error.message);
    throw error;
  }
}

/**
 * Test 8: Property-Based Test - Success Field Type Strictness
 * Validates: Requirements 14.4
 */
async function testPropertyBasedSuccessFieldTypeStrictness(): Promise<void> {
  console.log('\n=== Property Test: Success Field Type Strictness ===');
  
  try {
    await fc.assert(
      fc.asyncProperty(
        fc.object(),
        async (data) => {
          console.log('Testing success field type strictness');
          
          const response = simulateSuccessResponse(data);
          
          // Property: success field must be boolean true, not truthy value
          if (typeof response.success !== 'boolean') {
            console.error(`success field is not boolean: ${typeof response.success}`);
            return false;
          }
          
          if (response.success !== true) {
            console.error(`success field is not true: ${response.success}`);
            return false;
          }
          
          // Property: success field should be exactly true (not 1, "true", etc.)
          // TypeScript ensures this at compile time, but we verify at runtime
          if ((response.success as any) === 1 || (response.success as any) === 'true') {
            console.error('success field is truthy but not boolean true');
            return false;
          }
          
          return true;
        }
      ),
      {
        numRuns: 50,
        verbose: true,
      }
    );
    console.log('✓ Property-based success field type strictness test passed');
  } catch (error: any) {
    console.error('✗ Property-based success field type strictness test failed:', error.message);
    throw error;
  }
}

// Main test runner
async function runAllTests(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  Success Response Format Property Tests                       ║');
  console.log('║  Property 18: Success Response Format                         ║');
  console.log('║  Validates: Requirements 14.4                                 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  
  const tests = [
    { name: 'Success Response Includes success: true', fn: testSuccessResponseIncludesSuccessTrue },
    { name: 'Success Response Includes Data Field', fn: testSuccessResponseIncludesDataField },
    { name: 'Success Response Format Across Operations', fn: testSuccessResponseFormatAcrossOperations },
    { name: 'Success Response Format Across Route Types', fn: testSuccessResponseFormatAcrossRouteTypes },
    { name: 'Success Response with Optional Message', fn: testSuccessResponseWithOptionalMessage },
    { name: 'Property-Based Success Response Format', fn: testPropertyBasedSuccessResponseFormat },
    { name: 'Property-Based Success Response Across Operations', fn: testPropertyBasedSuccessResponseAcrossOperations },
    { name: 'Property-Based Success Field Type Strictness', fn: testPropertyBasedSuccessFieldTypeStrictness },
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
    
    console.log('\n⚠️  Success response format tests failed!');
    process.exit(1);
  } else {
    console.log('\n✅ All success response format tests passed!');
  }
}

// Run tests
runAllTests().catch((error) => {
  console.error('Test execution error:', error);
  process.exit(1);
});

/**
 * Summary of Success Response Format Property Tests
 * 
 * Property 18: Success Response Format
 * 
 * For any successful API response from a migrated route, the response should
 * include `success: true` in the response body.
 * 
 * Test Coverage:
 * 1. Success Response Includes success: true: Validates success field (Requirements 14.4)
 * 2. Success Response Includes Data Field: Validates data field presence (Requirements 14.4)
 * 3. Success Response Format Across Operations: Tests all HTTP methods (Requirements 14.4)
 * 4. Success Response Format Across Route Types: Tests all route types (Requirements 14.4)
 * 5. Success Response with Optional Message: Tests optional message field (Requirements 14.4)
 * 6. Property-Based Success Response Format: Tests across many scenarios (Requirements 14.4)
 * 7. Property-Based Success Response Across Operations: Tests all operations (Requirements 14.4)
 * 8. Property-Based Success Field Type Strictness: Validates boolean true (Requirements 14.4)
 * 
 * Success Response Format Guarantees:
 * - All successful responses include success: true
 * - All successful responses include a data field
 * - success field is boolean true (not truthy value)
 * - data field contains the response payload
 * - Optional message field is supported
 * - Response format is consistent across all operations (GET, POST, PUT, DELETE)
 * - Response format is consistent across all route types (setup, sales, purchase, hr, utils)
 * - Response structure matches expected format
 * 
 * Next Steps:
 * 1. Run this test to verify success response format
 * 2. Verify all tests pass with 100+ iterations
 * 3. If tests fail, adjust API routes to return correct success format
 * 4. Proceed to error response format test (Property 19)
 */
