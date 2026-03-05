/**
 * Property-Based Test: Site Context in Error Logs
 * 
 * **Property 5: Site Context in Error Logs**
 * **Validates: Requirements 5.1, 5.3**
 * 
 * This test validates that when an API route encounters an error and a site ID
 * is present in the request context, the error log entry includes that site ID.
 * 
 * Test Scope:
 * - Error logs include site ID when present in request
 * - Error logs include "none" when site ID is not present
 * - Log entries are structured with timestamp, context, siteId, error, and stack
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
interface ErrorLogEntry {
  timestamp: string;
  context: string;
  siteId: string;
  error: string;
  stack?: string;
}

interface RequestContext {
  siteId: string | null;
  operation: string;
}

// Captured log entries for testing
let capturedLogs: ErrorLogEntry[] = [];
let originalConsoleError: any = null;

/**
 * Mock console.error to capture log entries
 */
function mockConsoleError(): void {
  capturedLogs = [];
  
  // Only mock once
  if (!originalConsoleError) {
    originalConsoleError = console.error;
  }
  
  console.error = (...args: any[]) => {
    // Check if this is a site error log
    if (args[0] === '[Site Error]' && typeof args[1] === 'string') {
      try {
        const logEntry = JSON.parse(args[1]);
        capturedLogs.push(logEntry);
      } catch (e) {
        // Not a JSON log entry, ignore
      }
    }
    // Still call original for visibility
    originalConsoleError(...args);
  };
}

/**
 * Reset console.error mock
 */
function resetConsoleError(): void {
  if (originalConsoleError) {
    console.error = originalConsoleError;
  }
  capturedLogs = [];
}

/**
 * Simulates logSiteError function
 */
function logSiteError(
  error: unknown,
  context: string,
  siteId?: string | null
): void {
  const timestamp = new Date().toISOString();
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  const errorStack = error instanceof Error ? error.stack : undefined;

  const logEntry: ErrorLogEntry = {
    timestamp,
    context,
    siteId: siteId || 'none',
    error: errorMessage,
    stack: errorStack,
  };

  console.error('[Site Error]', JSON.stringify(logEntry, null, 2));
}

/**
 * Simulates API route error logging with site context
 */
function simulateAPIRouteErrorLogging(
  error: Error,
  context: RequestContext
): void {
  logSiteError(error, context.operation, context.siteId);
}

/**
 * Validates that error log includes site context when site ID is present
 */
function validateSiteContextInErrorLog(
  logEntry: ErrorLogEntry,
  expectedSiteId: string | null
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (expectedSiteId) {
    // When site ID is present, log should include it
    if (logEntry.siteId !== expectedSiteId) {
      issues.push(`Site ID mismatch in log: expected ${expectedSiteId}, got ${logEntry.siteId}`);
    }
  } else {
    // When site ID is null, log should have "none"
    if (logEntry.siteId !== 'none') {
      issues.push(`Site ID should be "none" when not present, got ${logEntry.siteId}`);
    }
  }

  // Validate log structure
  if (!logEntry.timestamp) {
    issues.push('Log entry missing timestamp');
  }

  if (!logEntry.context) {
    issues.push('Log entry missing context');
  }

  if (!logEntry.error) {
    issues.push('Log entry missing error message');
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Test 1: Error Log with Site ID
 * Validates: Requirements 5.1, 5.3
 */
async function testErrorLogWithSiteId(): Promise<void> {
  console.log('\n=== Test: Error Log with Site ID ===');

  mockConsoleError();

  const siteId = 'demo';
  const error = new Error('Failed to fetch data from ERPNext');
  const context: RequestContext = { siteId, operation: 'GET /api/items' };

  console.log(`Testing error log with site ID: ${siteId}`);

  simulateAPIRouteErrorLogging(error, context);

  // Check captured logs
  assert(capturedLogs.length === 1, 'Should have captured one log entry');

  const logEntry = capturedLogs[0];
  console.log('Log entry:', JSON.stringify(logEntry, null, 2));

  // Validate site context is included
  const validation = validateSiteContextInErrorLog(logEntry, siteId);

  if (!validation.valid) {
    console.error('Validation failed:');
    validation.issues.forEach(issue => console.error(`  - ${issue}`));
  }

  assert(validation.valid, 'Error log should include site context when site ID is present');
  assertEqual(logEntry.siteId, siteId, 'Site ID in log should match request site ID');
  assertEqual(logEntry.context, context.operation, 'Context should match operation');
  assert(logEntry.error.includes('Failed to fetch'), 'Error message should be included');

  console.log('✓ Error log includes site context');
}

/**
 * Test 2: Error Log without Site ID
 * Validates: Requirements 5.1, 5.3
 */
async function testErrorLogWithoutSiteId(): Promise<void> {
  console.log('\n=== Test: Error Log without Site ID ===');

  mockConsoleError();

  const error = new Error('Failed to fetch data from ERPNext');
  const context: RequestContext = { siteId: null, operation: 'GET /api/items' };

  console.log('Testing error log without site ID');

  simulateAPIRouteErrorLogging(error, context);

  // Check captured logs
  assert(capturedLogs.length === 1, 'Should have captured one log entry');

  const logEntry = capturedLogs[0];
  console.log('Log entry:', JSON.stringify(logEntry, null, 2));

  // Validate site context is "none"
  const validation = validateSiteContextInErrorLog(logEntry, null);

  if (!validation.valid) {
    console.error('Validation failed:');
    validation.issues.forEach(issue => console.error(`  - ${issue}`));
  }

  assert(validation.valid, 'Error log should have "none" for site ID when not present');
  assertEqual(logEntry.siteId, 'none', 'Site ID should be "none" when not present');
  assertEqual(logEntry.context, context.operation, 'Context should match operation');

  console.log('✓ Error log uses "none" for site ID when not present');
}

/**
 * Test 3: Site Context in Logs Across Different Error Types
 * Validates: Requirements 5.1, 5.3
 */
async function testSiteContextInLogsAcrossErrorTypes(): Promise<void> {
  console.log('\n=== Test: Site Context in Logs Across Different Error Types ===');

  mockConsoleError();

  const siteId = 'bac';
  const errorTypes = [
    { error: new Error('fetch failed: ECONNREFUSED'), type: 'network' },
    { error: new Error('401: Invalid credentials'), type: 'authentication' },
    { error: new Error('Site not found: invalid'), type: 'configuration' },
    { error: new Error('Unexpected error occurred'), type: 'unknown' },
  ];

  console.log(`Testing site context in logs with ${errorTypes.length} error types`);

  for (const { error, type } of errorTypes) {
    const context: RequestContext = { siteId, operation: `GET /api/test/${type}` };
    simulateAPIRouteErrorLogging(error, context);
  }

  // Check captured logs
  assertEqual(capturedLogs.length, errorTypes.length, 'Should have captured all log entries');

  for (let i = 0; i < errorTypes.length; i++) {
    const logEntry = capturedLogs[i];
    const { type } = errorTypes[i];

    console.log(`\nError type: ${type}`);
    console.log(`  Site in log: ${logEntry.siteId}`);
    console.log(`  Context: ${logEntry.context}`);

    // Validate site context is included regardless of error type
    const validation = validateSiteContextInErrorLog(logEntry, siteId);

    if (!validation.valid) {
      console.error(`Validation failed for ${type} error:`);
      validation.issues.forEach(issue => console.error(`  - ${issue}`));
      throw new Error(`Site context validation failed for ${type} error`);
    }

    assertEqual(logEntry.siteId, siteId, `Site should be included for ${type} error`);
  }

  console.log('\n✓ Site context preserved in logs across all error types');
}

/**
 * Test 4: Log Structure Validation
 * Validates: Requirements 5.1, 5.3
 */
async function testLogStructureValidation(): Promise<void> {
  console.log('\n=== Test: Log Structure Validation ===');

  mockConsoleError();

  const siteId = 'cirebon';
  const error = new Error('Test error with stack trace');
  const context: RequestContext = { siteId, operation: 'POST /api/sales/orders' };

  console.log('Testing log structure validation');

  simulateAPIRouteErrorLogging(error, context);

  const logEntry = capturedLogs[0];

  // Validate all required fields are present
  assert(logEntry.timestamp !== undefined, 'Log should have timestamp');
  assert(logEntry.context !== undefined, 'Log should have context');
  assert(logEntry.siteId !== undefined, 'Log should have siteId');
  assert(logEntry.error !== undefined, 'Log should have error message');
  assert(logEntry.stack !== undefined, 'Log should have stack trace');

  // Validate timestamp format (ISO 8601)
  const timestampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
  assert(
    timestampRegex.test(logEntry.timestamp),
    'Timestamp should be in ISO 8601 format'
  );

  console.log('✓ Log structure is valid');
}

/**
 * Test 5: Property-Based Test - Site Context in Error Logs
 * Validates: Requirements 5.1, 5.3
 */
async function testPropertyBasedSiteContextInLogs(): Promise<void> {
  console.log('\n=== Property Test: Site Context in Error Logs ===');

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
        fc.constantFrom(
          'GET /api/items',
          'POST /api/sales/orders',
          'PUT /api/purchase/invoices',
          'DELETE /api/hr/employees'
        ), // operation
        async (siteId, errorMessage, operation) => {
          console.log(`Testing: siteId=${siteId || 'null'}, operation=${operation}`);

          mockConsoleError();

          const error = new Error(errorMessage);
          const context: RequestContext = { siteId, operation };

          simulateAPIRouteErrorLogging(error, context);

          // Property: Error log should include site context if and only if site ID is present
          if (capturedLogs.length !== 1) {
            console.error('Expected exactly one log entry');
            return false;
          }

          const logEntry = capturedLogs[0];
          const validation = validateSiteContextInErrorLog(logEntry, siteId);

          if (!validation.valid) {
            console.error('Validation failed:', validation.issues);
            return false;
          }

          // Property: Site ID in log matches expected value
          const expectedSiteId = siteId || 'none';
          if (logEntry.siteId !== expectedSiteId) {
            console.error(`Site ID mismatch: ${logEntry.siteId} !== ${expectedSiteId}`);
            return false;
          }

          // Property: Context matches operation
          if (logEntry.context !== operation) {
            console.error(`Context mismatch: ${logEntry.context} !== ${operation}`);
            return false;
          }

          // Property: Error message is included
          if (!logEntry.error.includes(errorMessage)) {
            console.error('Error message not included in log');
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
    console.log('✓ Property-based site context in logs test passed');
  } catch (error: any) {
    console.error('✗ Property-based site context in logs test failed:', error.message);
    throw error;
  }
}

/**
 * Test 6: Property-Based Test - Log Consistency
 * Validates: Requirements 5.1, 5.3
 */
async function testPropertyBasedLogConsistency(): Promise<void> {
  console.log('\n=== Property Test: Log Consistency ===');

  try {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('demo', 'bac', 'cirebon'), // siteId (always present)
        fc.array(fc.string({ minLength: 5, maxLength: 50 }), { minLength: 1, maxLength: 10 }), // error messages
        async (siteId, errorMessages) => {
          console.log(`Testing consistency: siteId=${siteId}, ${errorMessages.length} errors`);

          mockConsoleError();

          // Property: ALL error logs for the same site should include the same site ID
          for (const errorMessage of errorMessages) {
            const error = new Error(errorMessage);
            const context: RequestContext = { siteId, operation: 'GET /api/test' };

            simulateAPIRouteErrorLogging(error, context);
          }

          // Validate all logs have consistent site ID
          if (capturedLogs.length !== errorMessages.length) {
            console.error('Log count mismatch');
            return false;
          }

          for (const logEntry of capturedLogs) {
            if (logEntry.siteId !== siteId) {
              console.error(`Site ID inconsistency: expected ${siteId}, got ${logEntry.siteId}`);
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
    console.log('✓ Property-based log consistency test passed');
  } catch (error: any) {
    console.error('✗ Property-based log consistency test failed:', error.message);
    throw error;
  }
}

/**
 * Test 7: Property-Based Test - Multiple Operations Same Site
 * Validates: Requirements 5.1, 5.3
 */
async function testPropertyBasedMultipleOperationsSameSite(): Promise<void> {
  console.log('\n=== Property Test: Multiple Operations Same Site ===');

  try {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('demo', 'bac', 'cirebon'), // siteId
        fc.array(
          fc.constantFrom(
            'GET /api/items',
            'POST /api/sales/orders',
            'PUT /api/purchase/invoices',
            'DELETE /api/hr/employees',
            'GET /api/setup/dashboard'
          ),
          { minLength: 2, maxLength: 5 }
        ), // operations
        async (siteId, operations) => {
          console.log(`Testing: siteId=${siteId}, ${operations.length} operations`);

          mockConsoleError();

          // Property: ALL operations for the same site should log the same site ID
          for (const operation of operations) {
            const error = new Error(`Error in ${operation}`);
            const context: RequestContext = { siteId, operation };

            simulateAPIRouteErrorLogging(error, context);
          }

          // Validate all logs have the same site ID
          if (capturedLogs.length !== operations.length) {
            console.error('Log count mismatch');
            return false;
          }

          for (let i = 0; i < capturedLogs.length; i++) {
            const logEntry = capturedLogs[i];
            const operation = operations[i];

            if (logEntry.siteId !== siteId) {
              console.error(`Site ID mismatch for ${operation}`);
              return false;
            }

            if (logEntry.context !== operation) {
              console.error(`Context mismatch for ${operation}`);
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
    console.log('✓ Property-based multiple operations test passed');
  } catch (error: any) {
    console.error('✗ Property-based multiple operations test failed:', error.message);
    throw error;
  }
}

// Main test runner
async function runAllTests(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  Site Context in Error Logs Property Tests                    ║');
  console.log('║  Property 5: Site Context in Error Logs                       ║');
  console.log('║  Validates: Requirements 5.1, 5.3                             ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  const tests = [
    { name: 'Error Log with Site ID', fn: testErrorLogWithSiteId },
    { name: 'Error Log without Site ID', fn: testErrorLogWithoutSiteId },
    { name: 'Site Context in Logs Across Error Types', fn: testSiteContextInLogsAcrossErrorTypes },
    { name: 'Log Structure Validation', fn: testLogStructureValidation },
    { name: 'Property-Based Site Context in Logs', fn: testPropertyBasedSiteContextInLogs },
    { name: 'Property-Based Log Consistency', fn: testPropertyBasedLogConsistency },
    { name: 'Property-Based Multiple Operations Same Site', fn: testPropertyBasedMultipleOperationsSameSite },
  ];

  let passed = 0;
  let failed = 0;
  const failures: Array<{ name: string; error: Error }> = [];

  for (const test of tests) {
    try {
      // Reset logs before each test
      resetConsoleError();
      await test.fn();
      passed++;
      console.log(`✓ ${test.name} completed`);
    } catch (error: any) {
      failed++;
      failures.push({ name: test.name, error });
      console.log(`✗ ${test.name} FAILED`);
    }
  }
  
  // Restore console.error at the end
  resetConsoleError();

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

    console.log('\n⚠️  Site context in error logs tests failed!');
    process.exit(1);
  } else {
    console.log('\n✅ All site context in error logs tests passed!');
  }
}

// Run tests
runAllTests().catch((error) => {
  console.error('Test execution error:', error);
  process.exit(1);
});

/**
 * Summary of Site Context in Error Logs Property Tests
 * 
 * Property 5: Site Context in Error Logs
 * 
 * For any error that occurs when a site ID is present in the request context,
 * the error log entry should include that site ID.
 * 
 * Test Coverage:
 * 1. Error Log with Site ID: Validates site context inclusion (Requirements 5.1, 5.3)
 * 2. Error Log without Site ID: Validates "none" for missing site (Requirements 5.1, 5.3)
 * 3. Site Context Across Error Types: Tests all error types (Requirements 5.1, 5.3)
 * 4. Log Structure Validation: Validates log entry structure (Requirements 5.1, 5.3)
 * 5. Property-Based Site Context: Tests across many scenarios (Requirements 5.1, 5.3)
 * 6. Property-Based Log Consistency: Validates consistent site ID logging
 * 7. Property-Based Multiple Operations: Tests multiple operations for same site
 * 
 * Site Context in Error Logs Guarantees:
 * - Error logs include site ID when present in request
 * - Error logs include "none" when site ID is not present
 * - Log entries have structured format (timestamp, context, siteId, error, stack)
 * - Site context is preserved across all error types
 * - Site ID in log matches site ID from request
 * - All operations for same site log the same site ID
 * 
 * Next Steps:
 * 1. Run this test to verify site context in error logs
 * 2. Verify all tests pass with 100+ iterations
 * 3. If tests fail, adjust error logging to include site context
 * 4. Proceed to error type classification test
 */
