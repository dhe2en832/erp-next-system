/**
 * CSRF Protection Tests
 * 
 * These tests verify that CSRF protection is properly implemented for the
 * accounting period closing feature.
 */

import {
  validateCSRFProtection,
  isRequestProtected,
  getAuthMethod,
  isCSRFTokenRequired,
  validateRequestCSRFProtection,
  addCSRFTokenIfNeeded,
} from '../lib/csrf-protection';

// Simple test runner
let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    testsFailed++;
    throw new Error(message);
  } else {
    console.log(`✅ PASSED: ${message}`);
    testsPassed++;
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    console.error(`❌ FAILED: ${message}`);
    console.error(`   Expected: ${expected}`);
    console.error(`   Actual: ${actual}`);
    testsFailed++;
    throw new Error(message);
  } else {
    console.log(`✅ PASSED: ${message}`);
    testsPassed++;
  }
}

function assertContains(str: string, substring: string, message: string) {
  if (!str.includes(substring)) {
    console.error(`❌ FAILED: ${message}`);
    console.error(`   String: ${str}`);
    console.error(`   Expected to contain: ${substring}`);
    testsFailed++;
    throw new Error(message);
  } else {
    console.log(`✅ PASSED: ${message}`);
    testsPassed++;
  }
}

function assertThrows(fn: () => void, message: string) {
  try {
    fn();
    console.error(`❌ FAILED: ${message} (expected to throw)`);
    testsFailed++;
    throw new Error(message);
  } catch (error) {
    console.log(`✅ PASSED: ${message}`);
    testsPassed++;
  }
}

function assertNotThrows(fn: () => void, message: string) {
  try {
    fn();
    console.log(`✅ PASSED: ${message}`);
    testsPassed++;
  } catch (error) {
    console.error(`❌ FAILED: ${message} (unexpected throw)`);
    console.error(`   Error: ${error}`);
    testsFailed++;
    throw error;
  }
}


async function runTests() {
  console.log('\n=== CSRF Protection Tests ===\n');

  // Test 1: validateCSRFProtection with API keys
  console.log('\n--- Test: validateCSRFProtection with API keys ---');
  process.env.ERP_API_KEY = 'test_key';
  process.env.ERP_API_SECRET = 'test_secret';
  
  const result1 = validateCSRFProtection();
  assertEqual(result1.protected, true, 'Should be protected with API keys');
  assertEqual(result1.method, 'api_key', 'Should use api_key method');
  assertContains(result1.message, 'API Key authentication', 'Message should mention API Key');

  // Test 2: validateCSRFProtection without API keys
  console.log('\n--- Test: validateCSRFProtection without API keys ---');
  delete process.env.ERP_API_KEY;
  delete process.env.ERP_API_SECRET;
  
  const result2 = validateCSRFProtection();
  assertEqual(result2.protected, false, 'Should not be protected without API keys');
  assertEqual(result2.method, 'session', 'Should use session method');
  assertContains(result2.message, 'WARNING', 'Message should contain warning');

  // Test 3: isRequestProtected with Basic Auth
  console.log('\n--- Test: isRequestProtected with Basic Auth ---');
  const headers1 = { 'Authorization': 'Basic dGVzdDp0ZXN0' };
  assertEqual(isRequestProtected(headers1), true, 'Should be protected with Basic Auth');

  // Test 4: isRequestProtected with CSRF token
  console.log('\n--- Test: isRequestProtected with CSRF token ---');
  const headers2 = { 'X-Frappe-CSRF-Token': 'test-token-123' };
  assertEqual(isRequestProtected(headers2), true, 'Should be protected with CSRF token');

  // Test 5: isRequestProtected for GET requests
  console.log('\n--- Test: isRequestProtected for GET requests ---');
  const headers3 = { 'X-HTTP-Method-Override': 'GET' };
  assertEqual(isRequestProtected(headers3), true, 'GET requests should be protected');

  // Test 6: isRequestProtected for unprotected POST
  console.log('\n--- Test: isRequestProtected for unprotected POST ---');
  const headers4 = { 'X-HTTP-Method-Override': 'POST' };
  assertEqual(isRequestProtected(headers4), false, 'Unprotected POST should not be protected');

  // Test 7: getAuthMethod with API keys
  console.log('\n--- Test: getAuthMethod with API keys ---');
  process.env.ERP_API_KEY = 'test_key';
  process.env.ERP_API_SECRET = 'test_secret';
  assertEqual(getAuthMethod(), 'api_key', 'Should return api_key');

  // Test 8: getAuthMethod without API keys
  console.log('\n--- Test: getAuthMethod without API keys ---');
  delete process.env.ERP_API_KEY;
  delete process.env.ERP_API_SECRET;
  assertEqual(getAuthMethod(), 'session', 'Should return session');

  // Test 9: isCSRFTokenRequired with API keys
  console.log('\n--- Test: isCSRFTokenRequired with API keys ---');
  process.env.ERP_API_KEY = 'test_key';
  process.env.ERP_API_SECRET = 'test_secret';
  assertEqual(isCSRFTokenRequired(), false, 'CSRF token should not be required with API keys');

  // Test 10: isCSRFTokenRequired without API keys
  console.log('\n--- Test: isCSRFTokenRequired without API keys ---');
  delete process.env.ERP_API_KEY;
  delete process.env.ERP_API_SECRET;
  assertEqual(isCSRFTokenRequired(), true, 'CSRF token should be required without API keys');

  // Test 11: validateRequestCSRFProtection for GET
  console.log('\n--- Test: validateRequestCSRFProtection for GET ---');
  process.env.ERP_API_KEY = 'test_key';
  process.env.ERP_API_SECRET = 'test_secret';
  const request1 = new Request('http://localhost/api/test', { method: 'GET' });
  assertNotThrows(() => validateRequestCSRFProtection(request1), 'GET should not throw');

  // Test 12: validateRequestCSRFProtection for POST with API keys
  console.log('\n--- Test: validateRequestCSRFProtection for POST with API keys ---');
  const request2 = new Request('http://localhost/api/test', { method: 'POST' });
  assertNotThrows(() => validateRequestCSRFProtection(request2), 'POST with API keys should not throw');

  // Test 13: validateRequestCSRFProtection for POST without CSRF token (session auth)
  console.log('\n--- Test: validateRequestCSRFProtection for POST without CSRF token ---');
  delete process.env.ERP_API_KEY;
  delete process.env.ERP_API_SECRET;
  const request3 = new Request('http://localhost/api/test', { method: 'POST' });
  assertThrows(() => validateRequestCSRFProtection(request3), 'POST without CSRF token should throw');

  // Test 14: validateRequestCSRFProtection for POST with CSRF token (session auth)
  console.log('\n--- Test: validateRequestCSRFProtection for POST with CSRF token ---');
  const request4 = new Request('http://localhost/api/test', {
    method: 'POST',
    headers: { 'X-Frappe-CSRF-Token': 'test-token-123' },
  });
  assertNotThrows(() => validateRequestCSRFProtection(request4), 'POST with CSRF token should not throw');

  // Test 15: addCSRFTokenIfNeeded with API keys
  console.log('\n--- Test: addCSRFTokenIfNeeded with API keys ---');
  process.env.ERP_API_KEY = 'test_key';
  process.env.ERP_API_SECRET = 'test_secret';
  const headers5 = { 'Content-Type': 'application/json' };
  const result5 = await addCSRFTokenIfNeeded(headers5, 'session-id-123');
  assertEqual(result5['X-Frappe-CSRF-Token'], undefined, 'Should not add CSRF token with API keys');

  // Test 16: Accounting period operations protection
  console.log('\n--- Test: Accounting period operations protection ---');
  const validation = validateCSRFProtection();
  assertEqual(validation.protected, true, 'Period operations should be protected');

  console.log('\n=== Test Summary ===');
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log(`Total: ${testsPassed + testsFailed}`);

  if (testsFailed > 0) {
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
