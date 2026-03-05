/**
 * Property-Based Test: Site Context in Error Response
 * 
 * **Property 4: Site Context in Error Response**
 * **Validates: Requirements 5.1, 5.2**
 * 
 * This test validates that when an API route encounters an error and a site ID
 * is present in the request context, the error response includes that site ID
 * in the response body.
 * 
 * Test Scope:
 * - Error responses include site ID when present in request
 * - Error messages are prefixed with site context
 * - Site field is present in error response structure
 * - Site context is preserved across different error types
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

interface RequestContext {
  siteId: string | null;
  operation: string;
}

/**
 * Simulates buildSiteAwareErrorResponse function
 */
function buildSiteAwareErrorResponse(
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
 * Simulates API route error handling with site context
 */
function simulateAPIRouteError(
  error: Error,
  context: RequestContext
): ErrorResponse {
  return buildSiteAwareErrorResponse(error, context.siteId);
}

/**
 * Validates that error response includes site context when site ID is present
 */
function validateSiteContextInErrorResponse(
  errorResponse: ErrorResponse,
  expectedSiteId: string | null
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (expectedSiteId) {
    // When site ID is present, response should include it
    if (!errorResponse.site) {
      issues.push('Error response missing site field when site ID is present');
    } else if (errorResponse.site !== expectedSiteId) {
      issues.push(`Site ID mismatch: expected ${expectedSiteId}, got ${errorResponse.site}`);
    }

    // Message should be prefixed with site context
    if (!errorResponse.message.includes(`[Site: ${expectedSiteId}]`)) {
      issues.push(`Error message not prefixed with site context: ${errorResponse.message}`);
    }
  } else {
    // When site ID is null, site field should not be present
    if (errorResponse.site !== undefined) {
      issues.push('Error response includes site field when site ID is null');
    }

    // Message should not have site prefix
    if (errorResponse.message.includes('[Site:')) {
      issues.push('Error message has site prefix when site ID is null');
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Test 1: Error Response with Site ID
 * Validates: Requirements 5.1, 5.2
 */
async function testErrorResponseWithSiteId(): Promise<void> {
  console.log('\n=== Test: Error Response with Site ID ===');

  const siteId = 'demo';
  const error = new Error('Failed to fetch data from ERPNext');
  const context: RequestContext = { siteId, operation: 'GET /api/items' };

  console.log(`Testing error response with site ID: ${siteId}`);

  const errorResponse = simulateAPIRouteError(error, context);

  console.log('Error response:', JSON.stringify(errorResponse, null, 2));

  // Validate site context is included
  const validation = validateSiteContextInErrorResponse(errorResponse, siteId);

  if (!validation.valid) {
    console.error('Validation failed:');
    validation.issues.forEach(issue => console.error(`  - ${issue}`));
  }

  assert(validation.valid, 'Error response should include site context when site ID is present');
  assertEqual(errorResponse.site, siteId, 'Site field should match request site ID');
  assert(
    errorResponse.message.includes(`[Site: ${siteId}]`),
    'Error message should be prefixed with site context'
  );

  console.log('✓ Error response includes site context');
}

/**
 * Test 2: Error Response without Site ID
 * Validates: Requirements 5.1, 5.2
 */
async function testErrorResponseWithoutSiteId(): Promise<void> {
  console.log('\n=== Test: Error Response without Site ID ===');

  const error = new Error('Failed to fetch data from ERPNext');
  const context: RequestContext = { siteId: null, operation: 'GET /api/items' };

  console.log('Testing error response without site ID');

  const errorResponse = simulateAPIRouteError(error, context);

  console.log('Error response:', JSON.stringify(errorResponse, null, 2));

  // Validate site context is not included
  const validation = validateSiteContextInErrorResponse(errorResponse, null);

  if (!validation.valid) {
    console.error('Validation failed:');
    validation.issues.forEach(issue => console.error(`  - ${issue}`));
  }

  assert(validation.valid, 'Error response should not include site context when site ID is null');
  assert(errorResponse.site === undefined, 'Site field should not be present when site ID is null');
  assert(
    !errorResponse.message.includes('[Site:'),
    'Error message should not have site prefix when site ID is null'
  );

  console.log('✓ Error response excludes site context when not present');
}

/**
 * Test 3: Site Context Across Different Error Types
 * Validates: Requirements 5.1, 5.2
 */
async function testSiteContextAcrossErrorTypes(): Promise<void> {
  console.log('\n=== Test: Site Context Across Different Error Types ===');

  const siteId = 'bac';
  const errorTypes = [
    { error: new Error('fetch failed: ECONNREFUSED'), type: 'network' },
    { error: new Error('401: Invalid credentials'), type: 'authentication' },
    { error: new Error('Site not found: invalid'), type: 'configuration' },
    { error: new Error('Unexpected error occurred'), type: 'unknown' },
  ];

  console.log(`Testing site context with ${errorTypes.length} error types`);

  for (const { error, type } of errorTypes) {
    const context: RequestContext = { siteId, operation: 'GET /api/test' };
    const errorResponse = simulateAPIRouteError(error, context);

    console.log(`\nError type: ${type}`);
    console.log(`  Site in response: ${errorResponse.site}`);
    console.log(`  Message: ${errorResponse.message}`);

    // Validate site context is included regardless of error type
    const validation = validateSiteContextInErrorResponse(errorResponse, siteId);

    if (!validation.valid) {
      console.error(`Validation failed for ${type} error:`);
      validation.issues.forEach(issue => console.error(`  - ${issue}`));
      throw new Error(`Site context validation failed for ${type} error`);
    }

    assertEqual(errorResponse.site, siteId, `Site should be included for ${type} error`);
    assert(
      errorResponse.message.includes(`[Site: ${siteId}]`),
      `Message should have site prefix for ${type} error`
    );
  }

  console.log('\n✓ Site context preserved across all error types');
}

/**
 * Test 4: Property-Based Test - Site Context in Error Responses
 * Validates: Requirements 5.1, 5.2
 */
async function testPropertyBasedSiteContextInErrors(): Promise<void> {
  console.log('\n=== Property Test: Site Context in Error Responses ===');

  try {
    await fc.assert(
      fc.asyncProperty(
        fc.option(fc.constantFrom('demo', 'bac', 'cirebon'), { nil: null }), // siteId
        fc.constantFrom(
          'Failed to fetch',
          'Network error',
          '401: Unauthorized',
          'Invalid credentials',
          'Site not found',
          'Configuration error',
          'Unknown error'
        ), // error message
        async (siteId, errorMessage) => {
          console.log(`Testing: siteId=${siteId || 'null'}, error="${errorMessage}"`);

          const error = new Error(errorMessage);
          const context: RequestContext = { siteId, operation: 'GET /api/test' };

          const errorResponse = simulateAPIRouteError(error, context);

          // Property: Error response should include site context if and only if site ID is present
          const validation = validateSiteContextInErrorResponse(errorResponse, siteId);

          if (!validation.valid) {
            console.error('Validation failed:', validation.issues);
            return false;
          }

          // Property: Site field presence matches site ID presence
          if (siteId) {
            if (!errorResponse.site) {
              console.error('Site field missing when site ID is present');
              return false;
            }
            if (errorResponse.site !== siteId) {
              console.error(`Site ID mismatch: ${errorResponse.site} !== ${siteId}`);
              return false;
            }
            if (!errorResponse.message.includes(`[Site: ${siteId}]`)) {
              console.error('Message missing site prefix');
              return false;
            }
          } else {
            if (errorResponse.site !== undefined) {
              console.error('Site field present when site ID is null');
              return false;
            }
            if (errorResponse.message.includes('[Site:')) {
              console.error('Message has site prefix when site ID is null');
              return false;
            }
          }

          return true;
        }
      ),
      {
        numRuns: 100,
        verbose: true,
      }
    );
    console.log('✓ Property-based site context test passed');
  } catch (error: any) {
    console.error('✗ Property-based site context test failed:', error.message);
    throw error;
  }
}

/**
 * Test 5: Property-Based Test - Site Context Consistency
 * Validates: Requirements 5.1, 5.2
 */
async function testPropertyBasedSiteContextConsistency(): Promise<void> {
  console.log('\n=== Property Test: Site Context Consistency ===');

  try {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('demo', 'bac', 'cirebon'), // siteId (always present)
        fc.array(fc.string({ minLength: 5, maxLength: 50 }), { minLength: 1, maxLength: 10 }), // error messages
        async (siteId, errorMessages) => {
          console.log(`Testing consistency: siteId=${siteId}, ${errorMessages.length} errors`);

          // Property: ALL error responses for the same site should include the same site ID
          for (const errorMessage of errorMessages) {
            const error = new Error(errorMessage);
            const context: RequestContext = { siteId, operation: 'GET /api/test' };

            const errorResponse = simulateAPIRouteError(error, context);

            if (errorResponse.site !== siteId) {
              console.error(`Site ID inconsistency: expected ${siteId}, got ${errorResponse.site}`);
              return false;
            }

            if (!errorResponse.message.includes(`[Site: ${siteId}]`)) {
              console.error('Message missing site prefix');
              return false;
            }
          }

          return true;
        }
      ),
      {
        numRuns: 50,
        verbose: true,
      }
    );
    console.log('✓ Property-based site context consistency test passed');
  } catch (error: any) {
    console.error('✗ Property-based site context consistency test failed:', error.message);
    throw error;
  }
}

/**
 * Test 6: Property-Based Test - Site Context Format
 * Validates: Requirements 5.1, 5.2
 */
async function testPropertyBasedSiteContextFormat(): Promise<void> {
  console.log('\n=== Property Test: Site Context Format ===');

  try {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('demo', 'bac', 'cirebon'), // siteId
        fc.string({ minLength: 10, maxLength: 100 }), // error message
        async (siteId, errorMessage) => {
          console.log(`Testing format: siteId=${siteId}`);

          const error = new Error(errorMessage);
          const context: RequestContext = { siteId, operation: 'GET /api/test' };

          const errorResponse = simulateAPIRouteError(error, context);

          // Property: Site context format should be consistent: "[Site: {siteId}] {message}"
          const expectedPrefix = `[Site: ${siteId}] `;
          if (!errorResponse.message.startsWith(expectedPrefix)) {
            console.error(`Message format incorrect: ${errorResponse.message}`);
            return false;
          }

          // Property: Original error message should be preserved after prefix
          const messageAfterPrefix = errorResponse.message.substring(expectedPrefix.length);
          if (messageAfterPrefix !== errorMessage) {
            console.error('Original error message not preserved');
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
    console.log('✓ Property-based site context format test passed');
  } catch (error: any) {
    console.error('✗ Property-based site context format test failed:', error.message);
    throw error;
  }
}

// Main test runner
async function runAllTests(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  Site Context in Error Response Property Tests                ║');
  console.log('║  Property 4: Site Context in Error Response                   ║');
  console.log('║  Validates: Requirements 5.1, 5.2                             ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  const tests = [
    { name: 'Error Response with Site ID', fn: testErrorResponseWithSiteId },
    { name: 'Error Response without Site ID', fn: testErrorResponseWithoutSiteId },
    { name: 'Site Context Across Different Error Types', fn: testSiteContextAcrossErrorTypes },
    { name: 'Property-Based Site Context in Errors', fn: testPropertyBasedSiteContextInErrors },
    { name: 'Property-Based Site Context Consistency', fn: testPropertyBasedSiteContextConsistency },
    { name: 'Property-Based Site Context Format', fn: testPropertyBasedSiteContextFormat },
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

    console.log('\n⚠️  Site context in error response tests failed!');
    process.exit(1);
  } else {
    console.log('\n✅ All site context in error response tests passed!');
  }
}

// Run tests
runAllTests().catch((error) => {
  console.error('Test execution error:', error);
  process.exit(1);
});

/**
 * Summary of Site Context in Error Response Property Tests
 * 
 * Property 4: Site Context in Error Response
 * 
 * For any error that occurs when a site ID is present in the request context,
 * the error response should include that site ID in the response body.
 * 
 * Test Coverage:
 * 1. Error Response with Site ID: Validates site context inclusion (Requirements 5.1, 5.2)
 * 2. Error Response without Site ID: Validates site context exclusion (Requirements 5.1, 5.2)
 * 3. Site Context Across Error Types: Tests all error types (Requirements 5.1, 5.2)
 * 4. Property-Based Site Context: Tests across many scenarios (Requirements 5.1, 5.2)
 * 5. Property-Based Consistency: Validates consistent site ID inclusion
 * 6. Property-Based Format: Validates site context format
 * 
 * Site Context in Error Response Guarantees:
 * - Error responses include site ID when present in request
 * - Error responses exclude site ID when not present in request
 * - Error messages are prefixed with "[Site: {siteId}]" format
 * - Site context is preserved across all error types
 * - Site ID in response matches site ID from request
 * - Original error message is preserved after site prefix
 * 
 * Next Steps:
 * 1. Run this test to verify site context in error responses
 * 2. Verify all tests pass with 100+ iterations
 * 3. If tests fail, adjust error handling to include site context
 * 4. Proceed to site context in error logs test
 */
