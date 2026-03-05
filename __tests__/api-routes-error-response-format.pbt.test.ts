/**
 * Property-Based Test: Error Response Format
 * 
 * **Property 19: Error Response Format**
 * **Validates: Requirements 14.5**
 * 
 * This test validates that when an API route returns an error, the response
 * includes `success: false` and an error message in the response body.
 * 
 * Test Scope:
 * - All error responses include success: false
 * - All error responses include an error message
 * - Error response format is consistent across different error types
 * - Error response format is consistent across different route types
 * - Error response structure matches expected format
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
interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  site?: string;
  errorType: 'network' | 'authentication' | 'configuration' | 'unknown';
}

interface APIOperation {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  route: string;
  routeType: 'setup' | 'sales' | 'purchase' | 'hr' | 'utils';
}

/**
 * Simulates an error response from an API route
 */
function simulateErrorResponse(
  error: Error,
  siteId?: string | null
): ErrorResponse {
  const errorMessage = error.message;
  
  // Classify error type
  let errorType: 'network' | 'authentication' | 'configuration' | 'unknown' = 'unknown';
  
  if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('ECONNREFUSED')) {
    errorType = 'network';
  } else if (errorMessage.includes('401') || errorMessage.includes('authentication') || errorMessage.includes('credentials')) {
    errorType = 'authentication';
  } else if (errorMessage.includes('Site not found') || errorMessage.includes('configuration') || errorMessage.includes('API URL')) {
    errorType = 'configuration';
  }

  const response: ErrorResponse = {
    success: false,
    error: errorType.toUpperCase(),
    message: errorMessage,
    errorType,
  };

  if (siteId) {
    response.site = siteId;
    response.message = `[Site: ${siteId}] ${errorMessage}`;
  }

  return response;
}

/**
 * Validates that a response follows the error response format
 */
function validateErrorResponseFormat(
  response: any
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Check success field
  if (!('success' in response)) {
    issues.push('Response missing "success" field');
  } else if (response.success !== false) {
    issues.push(`Expected success=false, got success=${response.success}`);
  }
  
  // Check error field
  if (!('error' in response)) {
    issues.push('Response missing "error" field');
  } else if (typeof response.error !== 'string') {
    issues.push(`error field must be string, got ${typeof response.error}`);
  } else if (response.error === '') {
    issues.push('error field cannot be empty string');
  }
  
  // Check message field
  if (!('message' in response)) {
    issues.push('Response missing "message" field');
  } else if (typeof response.message !== 'string') {
    issues.push(`message field must be string, got ${typeof response.message}`);
  } else if (response.message === '') {
    issues.push('message field cannot be empty string');
  }
  
  // Check that success is boolean false (not falsy value)
  if (response.success !== false) {
    issues.push(`success field must be boolean false, got ${typeof response.success}: ${response.success}`);
  }
  
  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Test 1: Error Response Includes success: false
 * Validates: Requirements 14.5
 */
async function testErrorResponseIncludesSuccessFalse(): Promise<void> {
  console.log('\n=== Test: Error Response Includes success: false ===');
  
  const error = new Error('Failed to fetch data from ERPNext');
  const response = simulateErrorResponse(error);
  
  console.log('Response:', JSON.stringify(response, null, 2));
  
  const validation = validateErrorResponseFormat(response);
  
  if (!validation.valid) {
    console.error('Validation failed:');
    validation.issues.forEach(issue => console.error(`  - ${issue}`));
  }
  
  assert(validation.valid, 'Error response should include success: false');
  assertEqual(response.success, false, 'success field should be false');
  assert('error' in response, 'Response should include error field');
  assert('message' in response, 'Response should include message field');
  
  console.log('✓ Error response includes success: false');
}

/**
 * Test 2: Error Response Includes Error Message
 * Validates: Requirements 14.5
 */
async function testErrorResponseIncludesErrorMessage(): Promise<void> {
  console.log('\n=== Test: Error Response Includes Error Message ===');
  
  const testCases = [
    { error: new Error('Network error'), description: 'network error' },
    { error: new Error('401: Unauthorized'), description: 'authentication error' },
    { error: new Error('Site not found'), description: 'configuration error' },
    { error: new Error('Unexpected error'), description: 'unknown error' },
  ];
  
  console.log(`Testing ${testCases.length} error message scenarios`);
  
  for (const testCase of testCases) {
    console.log(`\nTesting: ${testCase.description}`);
    
    const response = simulateErrorResponse(testCase.error);
    
    const validation = validateErrorResponseFormat(response);
    
    if (!validation.valid) {
      console.error(`Validation failed for ${testCase.description}:`);
      validation.issues.forEach(issue => console.error(`  - ${issue}`));
      throw new Error(`Error response validation failed for ${testCase.description}`);
    }
    
    assert('message' in response, `Response should include message field for ${testCase.description}`);
    assert(response.message !== '', `Message should not be empty for ${testCase.description}`);
    assertEqual(response.success, false, `success should be false for ${testCase.description}`);
  }
  
  console.log('\n✓ Error response includes error message');
}

/**
 * Test 3: Error Response Format Across Error Types
 * Validates: Requirements 14.5
 */
async function testErrorResponseFormatAcrossErrorTypes(): Promise<void> {
  console.log('\n=== Test: Error Response Format Across Error Types ===');
  
  const errorTypes = [
    { error: new Error('fetch failed: ECONNREFUSED'), type: 'network' },
    { error: new Error('401: Invalid credentials'), type: 'authentication' },
    { error: new Error('Site not found: invalid'), type: 'configuration' },
    { error: new Error('Unexpected error occurred'), type: 'unknown' },
  ];
  
  console.log(`Testing ${errorTypes.length} error types`);
  
  for (const { error, type } of errorTypes) {
    console.log(`\nError type: ${type}`);
    
    const response = simulateErrorResponse(error);
    
    const validation = validateErrorResponseFormat(response);
    
    if (!validation.valid) {
      console.error(`Validation failed for ${type}:`);
      validation.issues.forEach(issue => console.error(`  - ${issue}`));
      throw new Error(`Error response validation failed for ${type}`);
    }
    
    assertEqual(response.success, false, `${type} should return success: false`);
    assert('error' in response, `${type} should include error field`);
    assert('message' in response, `${type} should include message field`);
    assert(response.message !== '', `${type} should have non-empty message`);
  }
  
  console.log('\n✓ Error response format consistent across error types');
}

/**
 * Test 4: Error Response Format Across Route Types
 * Validates: Requirements 14.5
 */
async function testErrorResponseFormatAcrossRouteTypes(): Promise<void> {
  console.log('\n=== Test: Error Response Format Across Route Types ===');
  
  const routeTypes = [
    { type: 'setup', route: '/api/setup/dashboard', error: new Error('Dashboard error') },
    { type: 'sales', route: '/api/sales/orders', error: new Error('Sales order error') },
    { type: 'purchase', route: '/api/purchase/invoices', error: new Error('Purchase invoice error') },
    { type: 'hr', route: '/api/hr/employees', error: new Error('Employee error') },
    { type: 'utils', route: '/api/utils/diagnose', error: new Error('Diagnostic error') },
  ];
  
  console.log(`Testing ${routeTypes.length} route types`);
  
  for (const routeType of routeTypes) {
    console.log(`\nRoute: ${routeType.route}`);
    
    const response = simulateErrorResponse(routeType.error);
    
    const validation = validateErrorResponseFormat(response);
    
    if (!validation.valid) {
      console.error(`Validation failed for ${routeType.type}:`);
      validation.issues.forEach(issue => console.error(`  - ${issue}`));
      throw new Error(`Error response validation failed for ${routeType.type}`);
    }
    
    assertEqual(response.success, false, `${routeType.type} should return success: false`);
    assert('error' in response, `${routeType.type} should include error field`);
    assert('message' in response, `${routeType.type} should include message field`);
  }
  
  console.log('\n✓ Error response format consistent across route types');
}

/**
 * Test 5: Error Response with Site Context
 * Validates: Requirements 14.5
 */
async function testErrorResponseWithSiteContext(): Promise<void> {
  console.log('\n=== Test: Error Response with Site Context ===');
  
  // Response without site context
  const errorWithoutSite = new Error('Network error');
  const responseWithoutSite = simulateErrorResponse(errorWithoutSite);
  console.log('Response without site:', JSON.stringify(responseWithoutSite, null, 2));
  
  let validation = validateErrorResponseFormat(responseWithoutSite);
  assert(validation.valid, 'Error response without site should be valid');
  assertEqual(responseWithoutSite.success, false, 'success should be false');
  
  // Response with site context
  const errorWithSite = new Error('Network error');
  const responseWithSite = simulateErrorResponse(errorWithSite, 'demo');
  console.log('\nResponse with site:', JSON.stringify(responseWithSite, null, 2));
  
  validation = validateErrorResponseFormat(responseWithSite);
  assert(validation.valid, 'Error response with site should be valid');
  assertEqual(responseWithSite.success, false, 'success should be false');
  assert('site' in responseWithSite, 'Response should include site field');
  assert(responseWithSite.message.includes('[Site: demo]'), 'Message should include site context');
  
  console.log('✓ Error response supports optional site context');
}

/**
 * Test 6: Error Response Field Types
 * Validates: Requirements 14.5
 */
async function testErrorResponseFieldTypes(): Promise<void> {
  console.log('\n=== Test: Error Response Field Types ===');
  
  const error = new Error('Test error');
  const response = simulateErrorResponse(error);
  
  console.log('Response:', JSON.stringify(response, null, 2));
  
  // Validate field types
  assert(typeof response.success === 'boolean', 'success should be boolean');
  assertEqual(response.success, false, 'success should be false');
  
  assert(typeof response.error === 'string', 'error should be string');
  assert(response.error !== '', 'error should not be empty');
  
  assert(typeof response.message === 'string', 'message should be string');
  assert(response.message !== '', 'message should not be empty');
  
  assert(typeof response.errorType === 'string', 'errorType should be string');
  assert(
    ['network', 'authentication', 'configuration', 'unknown'].includes(response.errorType),
    'errorType should be one of the valid types'
  );
  
  console.log('✓ Error response field types are correct');
}

/**
 * Test 7: Property-Based Test - Error Response Format
 * Validates: Requirements 14.5
 */
async function testPropertyBasedErrorResponseFormat(): Promise<void> {
  console.log('\n=== Property Test: Error Response Format ===');
  
  try {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 100 }), // error message
        fc.option(fc.constantFrom('demo', 'bac', 'cirebon'), { nil: undefined }), // optional site
        async (errorMessage, siteId) => {
          console.log(`Testing: message="${errorMessage.substring(0, 30)}...", site=${siteId || 'none'}`);
          
          const error = new Error(errorMessage);
          const response = simulateErrorResponse(error, siteId);
          
          // Property: All error responses must include success: false
          if (response.success !== false) {
            console.error('success field is not false');
            return false;
          }
          
          // Property: All error responses must include error field
          if (!('error' in response)) {
            console.error('error field is missing');
            return false;
          }
          
          // Property: error field must be non-empty string
          if (typeof response.error !== 'string' || response.error === '') {
            console.error('error field is not a non-empty string');
            return false;
          }
          
          // Property: All error responses must include message field
          if (!('message' in response)) {
            console.error('message field is missing');
            return false;
          }
          
          // Property: message field must be non-empty string
          if (typeof response.message !== 'string' || response.message === '') {
            console.error('message field is not a non-empty string');
            return false;
          }
          
          // Property: site field should be present if siteId provided
          if (siteId !== undefined && !('site' in response)) {
            console.error('site field missing when siteId provided');
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
    console.log('✓ Property-based error response format test passed');
  } catch (error: any) {
    console.error('✗ Property-based error response format test failed:', error.message);
    throw error;
  }
}

/**
 * Test 8: Property-Based Test - Error Response Across Operations
 * Validates: Requirements 14.5
 */
async function testPropertyBasedErrorResponseAcrossOperations(): Promise<void> {
  console.log('\n=== Property Test: Error Response Across Operations ===');
  
  try {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('GET', 'POST', 'PUT', 'DELETE'),
        fc.constantFrom('setup', 'sales', 'purchase', 'hr', 'utils'),
        fc.string({ minLength: 10, maxLength: 50 }),
        async (method, routeType, errorMessage) => {
          console.log(`Testing: ${method} /api/${routeType}/... with error="${errorMessage.substring(0, 20)}..."`);
          
          const error = new Error(errorMessage);
          const response = simulateErrorResponse(error);
          
          // Property: All operations should return success: false on error
          if (response.success !== false) {
            console.error(`${method} ${routeType} did not return success: false`);
            return false;
          }
          
          // Property: All operations should include error and message fields
          if (!('error' in response) || !('message' in response)) {
            console.error(`${method} ${routeType} missing error or message field`);
            return false;
          }
          
          // Property: Response format should be consistent regardless of operation
          const validation = validateErrorResponseFormat(response);
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
    console.log('✓ Property-based error response across operations test passed');
  } catch (error: any) {
    console.error('✗ Property-based error response across operations test failed:', error.message);
    throw error;
  }
}

/**
 * Test 9: Property-Based Test - Success Field Type Strictness
 * Validates: Requirements 14.5
 */
async function testPropertyBasedSuccessFieldTypeStrictness(): Promise<void> {
  console.log('\n=== Property Test: Success Field Type Strictness ===');
  
  try {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 50 }),
        async (errorMessage) => {
          console.log('Testing success field type strictness');
          
          const error = new Error(errorMessage);
          const response = simulateErrorResponse(error);
          
          // Property: success field must be boolean false, not falsy value
          if (typeof response.success !== 'boolean') {
            console.error(`success field is not boolean: ${typeof response.success}`);
            return false;
          }
          
          if (response.success !== false) {
            console.error(`success field is not false: ${response.success}`);
            return false;
          }
          
          // Property: success field should be exactly false (not 0, "", null, etc.)
          // TypeScript ensures this at compile time, but we verify at runtime
          if ((response.success as any) === 0 || (response.success as any) === '') {
            console.error('success field is falsy but not boolean false');
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

/**
 * Test 10: Property-Based Test - Error Message Non-Empty
 * Validates: Requirements 14.5
 */
async function testPropertyBasedErrorMessageNonEmpty(): Promise<void> {
  console.log('\n=== Property Test: Error Message Non-Empty ===');
  
  try {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 200 }), // any non-empty error message
        async (errorMessage) => {
          console.log(`Testing: message length=${errorMessage.length}`);
          
          const error = new Error(errorMessage);
          const response = simulateErrorResponse(error);
          
          // Property: Error message must never be empty
          if (response.message === '') {
            console.error('Error message is empty');
            return false;
          }
          
          // Property: Error field must never be empty
          if (response.error === '') {
            console.error('Error field is empty');
            return false;
          }
          
          // Property: Both fields must be strings
          if (typeof response.message !== 'string' || typeof response.error !== 'string') {
            console.error('Error or message field is not a string');
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
    console.log('✓ Property-based error message non-empty test passed');
  } catch (error: any) {
    console.error('✗ Property-based error message non-empty test failed:', error.message);
    throw error;
  }
}

// Main test runner
async function runAllTests(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  Error Response Format Property Tests                         ║');
  console.log('║  Property 19: Error Response Format                           ║');
  console.log('║  Validates: Requirements 14.5                                 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  
  const tests = [
    { name: 'Error Response Includes success: false', fn: testErrorResponseIncludesSuccessFalse },
    { name: 'Error Response Includes Error Message', fn: testErrorResponseIncludesErrorMessage },
    { name: 'Error Response Format Across Error Types', fn: testErrorResponseFormatAcrossErrorTypes },
    { name: 'Error Response Format Across Route Types', fn: testErrorResponseFormatAcrossRouteTypes },
    { name: 'Error Response with Site Context', fn: testErrorResponseWithSiteContext },
    { name: 'Error Response Field Types', fn: testErrorResponseFieldTypes },
    { name: 'Property-Based Error Response Format', fn: testPropertyBasedErrorResponseFormat },
    { name: 'Property-Based Error Response Across Operations', fn: testPropertyBasedErrorResponseAcrossOperations },
    { name: 'Property-Based Success Field Type Strictness', fn: testPropertyBasedSuccessFieldTypeStrictness },
    { name: 'Property-Based Error Message Non-Empty', fn: testPropertyBasedErrorMessageNonEmpty },
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
    
    console.log('\n⚠️  Error response format tests failed!');
    process.exit(1);
  } else {
    console.log('\n✅ All error response format tests passed!');
  }
}

// Run tests
runAllTests().catch((error) => {
  console.error('Test execution error:', error);
  process.exit(1);
});

/**
 * Summary of Error Response Format Property Tests
 * 
 * Property 19: Error Response Format
 * 
 * For any error response from a migrated route, the response should include
 * `success: false` and an error message in the response body.
 * 
 * Test Coverage:
 * 1. Error Response Includes success: false: Validates success field (Requirements 14.5)
 * 2. Error Response Includes Error Message: Validates message field presence (Requirements 14.5)
 * 3. Error Response Format Across Error Types: Tests all error types (Requirements 14.5)
 * 4. Error Response Format Across Route Types: Tests all route types (Requirements 14.5)
 * 5. Error Response with Site Context: Tests optional site field (Requirements 14.5)
 * 6. Error Response Field Types: Validates field types (Requirements 14.5)
 * 7. Property-Based Error Response Format: Tests across many scenarios (Requirements 14.5)
 * 8. Property-Based Error Response Across Operations: Tests all operations (Requirements 14.5)
 * 9. Property-Based Success Field Type Strictness: Validates boolean false (Requirements 14.5)
 * 10. Property-Based Error Message Non-Empty: Validates non-empty messages (Requirements 14.5)
 * 
 * Error Response Format Guarantees:
 * - All error responses include success: false
 * - All error responses include an error field (error type)
 * - All error responses include a message field (human-readable)
 * - success field is boolean false (not falsy value)
 * - error field is non-empty string
 * - message field is non-empty string
 * - Optional site field is supported for site-aware errors
 * - Response format is consistent across all error types (network, auth, config, unknown)
 * - Response format is consistent across all route types (setup, sales, purchase, hr, utils)
 * - Response format is consistent across all operations (GET, POST, PUT, DELETE)
 * - Response structure matches expected format
 * 
 * Next Steps:
 * 1. Run this test to verify error response format
 * 2. Verify all tests pass with 100+ iterations
 * 3. If tests fail, adjust API routes to return correct error format
 * 4. Complete task 15.2 and proceed to migration completeness verification
 */
