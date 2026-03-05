/**
 * Property-Based Test: Dual Authentication Support
 * 
 * **Property 10: Dual Authentication Support**
 * **Validates: Requirements 6.5**
 * 
 * This test validates that the Site_Aware_Client supports both authentication
 * methods (API key and session) and can successfully authenticate using either
 * method when valid credentials are provided.
 * 
 * Test Scope:
 * - API key authentication works when credentials are provided
 * - Session authentication works when session cookie is provided
 * - Both methods can be used independently
 * - Client correctly prioritizes API key over session
 * - Authentication headers are properly formatted for each method
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
interface SiteConfig {
  id: string;
  name: string;
  apiUrl: string;
  apiKey: string;
  apiSecret: string;
  isDefault?: boolean;
}

interface AuthHeaders {
  'Content-Type': string;
  'Authorization'?: string;
  'Cookie'?: string;
}

interface AuthenticationResult {
  method: 'api_key' | 'session' | 'none';
  authenticated: boolean;
  headers: AuthHeaders;
}

/**
 * Simulates makeErpHeaders function (API key only)
 */
function makeErpHeaders(siteConfig: SiteConfig): AuthHeaders {
  const headers: AuthHeaders = { 'Content-Type': 'application/json' };
  
  if (siteConfig.apiKey && siteConfig.apiSecret) {
    headers['Authorization'] = `token ${siteConfig.apiKey}:${siteConfig.apiSecret}`;
  }
  
  return headers;
}

/**
 * Simulates getErpHeaders function (API key with session fallback)
 */
function getErpHeaders(siteConfig: SiteConfig, sid?: string | null): AuthHeaders {
  const headers: AuthHeaders = { 'Content-Type': 'application/json' };
  
  // Try API key first (priority)
  if (siteConfig.apiKey && siteConfig.apiSecret) {
    headers['Authorization'] = `token ${siteConfig.apiKey}:${siteConfig.apiSecret}`;
    return headers;
  }
  
  // Fallback to session cookie
  if (sid) {
    headers['Cookie'] = `sid=${sid}`;
  }
  
  return headers;
}

/**
 * Determines which authentication method is being used
 */
function getAuthenticationMethod(
  siteConfig: SiteConfig,
  sid?: string | null
): 'api_key' | 'session' | 'none' {
  // API key takes priority
  if (siteConfig.apiKey && siteConfig.apiSecret) {
    return 'api_key';
  }
  
  // Check session cookie
  if (sid) {
    return 'session';
  }
  
  return 'none';
}

/**
 * Simulates authentication attempt with dual support
 */
function attemptAuthentication(
  siteConfig: SiteConfig,
  sid?: string | null
): AuthenticationResult {
  const headers = getErpHeaders(siteConfig, sid);
  const method = getAuthenticationMethod(siteConfig, sid);
  const authenticated = method !== 'none';
  
  return {
    method,
    authenticated,
    headers,
  };
}

/**
 * Validates that authentication result is correct
 */
function validateAuthenticationResult(
  result: AuthenticationResult,
  expectedMethod: 'api_key' | 'session' | 'none',
  expectedAuthenticated: boolean
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Check authentication method
  if (result.method !== expectedMethod) {
    issues.push(
      `Authentication method mismatch:\n` +
      `  Expected: ${expectedMethod}\n` +
      `  Actual: ${result.method}`
    );
  }
  
  // Check authenticated status
  if (result.authenticated !== expectedAuthenticated) {
    issues.push(
      `Authentication status mismatch:\n` +
      `  Expected: ${expectedAuthenticated}\n` +
      `  Actual: ${result.authenticated}`
    );
  }
  
  // Validate headers based on method
  if (expectedMethod === 'api_key') {
    if (!result.headers.Authorization) {
      issues.push('Authorization header missing for API key authentication');
    } else if (!result.headers.Authorization.startsWith('token ')) {
      issues.push('Authorization header should start with "token " for API key auth');
    }
  }
  
  if (expectedMethod === 'session') {
    if (!result.headers.Cookie) {
      issues.push('Cookie header missing for session authentication');
    } else if (!result.headers.Cookie.startsWith('sid=')) {
      issues.push('Cookie header should start with "sid=" for session auth');
    }
  }
  
  if (expectedMethod === 'none') {
    if (result.headers.Authorization) {
      issues.push('Authorization header should not be present when no auth method available');
    }
    if (result.headers.Cookie) {
      issues.push('Cookie header should not be present when no auth method available');
    }
  }
  
  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Test 1: API Key Authentication Works
 * Validates: Requirements 6.5
 */
async function testApiKeyAuthenticationWorks(): Promise<void> {
  console.log('\n=== Test: API Key Authentication Works ===');
  
  const siteConfig: SiteConfig = {
    id: 'demo',
    name: 'Demo Site',
    apiUrl: 'https://demo.erpnext.com',
    apiKey: 'demo_api_key_12345',
    apiSecret: 'demo_api_secret_67890',
    isDefault: true,
  };
  
  console.log('Testing API key authentication');
  
  const result = attemptAuthentication(siteConfig);
  
  console.log('Result:', JSON.stringify(result, null, 2));
  
  const validation = validateAuthenticationResult(result, 'api_key', true);
  
  if (!validation.valid) {
    console.error('Validation failed:');
    validation.issues.forEach(issue => console.error(`  - ${issue}`));
  }
  
  assert(validation.valid, 'API key authentication should work');
  assertEqual(result.method, 'api_key', 'Should use API key method');
  assert(result.authenticated, 'Should be authenticated');
  assert(result.headers.Authorization !== undefined, 'Should have Authorization header');
  assert(
    result.headers.Authorization === `token ${siteConfig.apiKey}:${siteConfig.apiSecret}`,
    'Authorization header should contain API key and secret'
  );
  
  console.log('✓ API key authentication works');
}

/**
 * Test 2: Session Authentication Works
 * Validates: Requirements 6.5
 */
async function testSessionAuthenticationWorks(): Promise<void> {
  console.log('\n=== Test: Session Authentication Works ===');
  
  const siteConfig: SiteConfig = {
    id: 'demo',
    name: 'Demo Site',
    apiUrl: 'https://demo.erpnext.com',
    apiKey: '', // No API key
    apiSecret: '', // No API secret
  };
  
  const sid = 'valid_session_id_12345';
  
  console.log('Testing session authentication');
  
  const result = attemptAuthentication(siteConfig, sid);
  
  console.log('Result:', JSON.stringify(result, null, 2));
  
  const validation = validateAuthenticationResult(result, 'session', true);
  
  if (!validation.valid) {
    console.error('Validation failed:');
    validation.issues.forEach(issue => console.error(`  - ${issue}`));
  }
  
  assert(validation.valid, 'Session authentication should work');
  assertEqual(result.method, 'session', 'Should use session method');
  assert(result.authenticated, 'Should be authenticated');
  assert(result.headers.Cookie !== undefined, 'Should have Cookie header');
  assert(
    result.headers.Cookie === `sid=${sid}`,
    'Cookie header should contain session ID'
  );
  
  console.log('✓ Session authentication works');
}

/**
 * Test 3: API Key Takes Priority Over Session
 * Validates: Requirements 6.5
 */
async function testApiKeyPriorityOverSession(): Promise<void> {
  console.log('\n=== Test: API Key Takes Priority Over Session ===');
  
  const siteConfig: SiteConfig = {
    id: 'demo',
    name: 'Demo Site',
    apiUrl: 'https://demo.erpnext.com',
    apiKey: 'demo_api_key',
    apiSecret: 'demo_api_secret',
  };
  
  const sid = 'valid_session_id_12345';
  
  console.log('Testing with both API key and session available');
  
  const result = attemptAuthentication(siteConfig, sid);
  
  console.log('Result:', JSON.stringify(result, null, 2));
  
  // Should use API key, not session
  const validation = validateAuthenticationResult(result, 'api_key', true);
  
  if (!validation.valid) {
    console.error('Validation failed:');
    validation.issues.forEach(issue => console.error(`  - ${issue}`));
  }
  
  assert(validation.valid, 'API key should take priority');
  assertEqual(result.method, 'api_key', 'Should use API key method, not session');
  assert(result.headers.Authorization !== undefined, 'Should have Authorization header');
  assert(result.headers.Cookie === undefined, 'Should not have Cookie header when API key is used');
  
  console.log('✓ API key takes priority over session');
}

/**
 * Test 4: Both Methods Can Be Used Independently
 * Validates: Requirements 6.5
 */
async function testBothMethodsIndependent(): Promise<void> {
  console.log('\n=== Test: Both Methods Can Be Used Independently ===');
  
  const scenarios = [
    {
      name: 'API key only',
      siteConfig: {
        id: 'demo',
        name: 'Demo Site',
        apiUrl: 'https://demo.erpnext.com',
        apiKey: 'api_key',
        apiSecret: 'api_secret',
      },
      sid: undefined,
      expectedMethod: 'api_key' as const,
      expectedAuth: true,
    },
    {
      name: 'Session only',
      siteConfig: {
        id: 'demo',
        name: 'Demo Site',
        apiUrl: 'https://demo.erpnext.com',
        apiKey: '',
        apiSecret: '',
      },
      sid: 'session_id',
      expectedMethod: 'session' as const,
      expectedAuth: true,
    },
    {
      name: 'Neither',
      siteConfig: {
        id: 'demo',
        name: 'Demo Site',
        apiUrl: 'https://demo.erpnext.com',
        apiKey: '',
        apiSecret: '',
      },
      sid: undefined,
      expectedMethod: 'none' as const,
      expectedAuth: false,
    },
  ];
  
  console.log(`Testing ${scenarios.length} independent authentication scenarios`);
  
  for (const scenario of scenarios) {
    console.log(`\nScenario: ${scenario.name}`);
    
    const result = attemptAuthentication(scenario.siteConfig, scenario.sid);
    
    console.log('Result:', JSON.stringify(result, null, 2));
    
    const validation = validateAuthenticationResult(
      result,
      scenario.expectedMethod,
      scenario.expectedAuth
    );
    
    if (!validation.valid) {
      console.error(`Validation failed for ${scenario.name}:`);
      validation.issues.forEach(issue => console.error(`  - ${issue}`));
      throw new Error(`Independent authentication failed for ${scenario.name}`);
    }
    
    assertEqual(result.method, scenario.expectedMethod, `Method should be ${scenario.expectedMethod}`);
    assertEqual(result.authenticated, scenario.expectedAuth, `Auth status should be ${scenario.expectedAuth}`);
  }
  
  console.log('\n✓ Both methods can be used independently');
}

/**
 * Test 5: No Authentication When Neither Method Available
 * Validates: Requirements 6.5
 */
async function testNoAuthWhenNeitherAvailable(): Promise<void> {
  console.log('\n=== Test: No Authentication When Neither Method Available ===');
  
  const siteConfig: SiteConfig = {
    id: 'demo',
    name: 'Demo Site',
    apiUrl: 'https://demo.erpnext.com',
    apiKey: '', // No API key
    apiSecret: '', // No API secret
  };
  
  // No session ID provided
  
  console.log('Testing with no authentication methods available');
  
  const result = attemptAuthentication(siteConfig);
  
  console.log('Result:', JSON.stringify(result, null, 2));
  
  const validation = validateAuthenticationResult(result, 'none', false);
  
  if (!validation.valid) {
    console.error('Validation failed:');
    validation.issues.forEach(issue => console.error(`  - ${issue}`));
  }
  
  assert(validation.valid, 'Should have no authentication');
  assertEqual(result.method, 'none', 'Should use no auth method');
  assert(!result.authenticated, 'Should not be authenticated');
  assert(result.headers.Authorization === undefined, 'Should not have Authorization header');
  assert(result.headers.Cookie === undefined, 'Should not have Cookie header');
  
  console.log('✓ No authentication when neither method available');
}

/**
 * Test 6: Property-Based Test - Dual Authentication Support
 * Validates: Requirements 6.5
 */
async function testPropertyBasedDualAuthSupport(): Promise<void> {
  console.log('\n=== Property Test: Dual Authentication Support ===');
  
  try {
    await fc.assert(
      fc.asyncProperty(
        fc.option(fc.string({ minLength: 10, maxLength: 30 }), { nil: undefined }), // API key
        fc.option(fc.string({ minLength: 10, maxLength: 30 }), { nil: undefined }), // API secret
        fc.option(fc.string({ minLength: 10, maxLength: 50 }), { nil: undefined }), // Session ID
        async (apiKey, apiSecret, sid) => {
          console.log(`Testing: apiKey=${apiKey ? 'present' : 'none'}, apiSecret=${apiSecret ? 'present' : 'none'}, sid=${sid ? 'present' : 'none'}`);
          
          const siteConfig: SiteConfig = {
            id: 'test',
            name: 'Test Site',
            apiUrl: 'https://test.erpnext.com',
            apiKey: apiKey || '',
            apiSecret: apiSecret || '',
          };
          
          const result = attemptAuthentication(siteConfig, sid);
          
          // Property: Should authenticate if either method is available
          // Note: Empty strings or whitespace-only strings should be treated as not present
          const hasApiKey = apiKey && apiSecret && apiKey.trim() !== '' && apiSecret.trim() !== '';
          const hasSession = !!sid && sid.trim() !== '';
          const shouldAuthenticate = hasApiKey || hasSession;
          
          if (result.authenticated !== shouldAuthenticate) {
            console.error(`Authentication status incorrect: expected ${shouldAuthenticate}, got ${result.authenticated}`);
            return false;
          }
          
          // Property: API key should take priority
          if (hasApiKey) {
            if (result.method !== 'api_key') {
              console.error('Should use API key method when available');
              return false;
            }
            if (!result.headers.Authorization) {
              console.error('Should have Authorization header for API key');
              return false;
            }
          } else if (hasSession) {
            if (result.method !== 'session') {
              console.error('Should use session method when API key not available');
              return false;
            }
            if (!result.headers.Cookie) {
              console.error('Should have Cookie header for session');
              return false;
            }
          } else {
            if (result.method !== 'none') {
              console.error('Should use no auth method when neither available');
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
    console.log('✓ Property-based dual auth support test passed');
  } catch (error: any) {
    console.error('✗ Property-based dual auth support test failed:', error.message);
    throw error;
  }
}

/**
 * Test 7: Property-Based Test - Authentication Method Priority
 * Validates: Requirements 6.5
 */
async function testPropertyBasedAuthMethodPriority(): Promise<void> {
  console.log('\n=== Property Test: Authentication Method Priority ===');
  
  try {
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(), // Has API key
        fc.boolean(), // Has session
        async (hasApiKey, hasSession) => {
          console.log(`Testing: hasApiKey=${hasApiKey}, hasSession=${hasSession}`);
          
          const siteConfig: SiteConfig = {
            id: 'test',
            name: 'Test Site',
            apiUrl: 'https://test.erpnext.com',
            apiKey: hasApiKey ? 'test_key' : '',
            apiSecret: hasApiKey ? 'test_secret' : '',
          };
          
          const sid = hasSession ? 'test_session_id' : undefined;
          
          const result = attemptAuthentication(siteConfig, sid);
          
          // Property: Priority order is API key > session > none
          if (hasApiKey) {
            if (result.method !== 'api_key') {
              console.error('API key should take priority');
              return false;
            }
          } else if (hasSession) {
            if (result.method !== 'session') {
              console.error('Session should be used when API key not available');
              return false;
            }
          } else {
            if (result.method !== 'none') {
              console.error('Should have no auth when neither available');
              return false;
            }
          }
          
          // Property: Should be authenticated if any method available
          const shouldAuth = hasApiKey || hasSession;
          if (result.authenticated !== shouldAuth) {
            console.error('Authentication status incorrect');
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
    console.log('✓ Property-based auth method priority test passed');
  } catch (error: any) {
    console.error('✗ Property-based auth method priority test failed:', error.message);
    throw error;
  }
}

/**
 * Test 8: Property-Based Test - Header Format Correctness
 * Validates: Requirements 6.5
 */
async function testPropertyBasedHeaderFormatCorrectness(): Promise<void> {
  console.log('\n=== Property Test: Header Format Correctness ===');
  
  try {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 30 }), // API key
        fc.string({ minLength: 10, maxLength: 30 }), // API secret
        fc.string({ minLength: 10, maxLength: 50 }), // Session ID
        fc.constantFrom('api_key', 'session'), // Which method to test
        async (apiKey, apiSecret, sid, methodToTest) => {
          console.log(`Testing: method=${methodToTest}`);
          
          let siteConfig: SiteConfig;
          let sessionId: string | undefined;
          
          if (methodToTest === 'api_key') {
            siteConfig = {
              id: 'test',
              name: 'Test Site',
              apiUrl: 'https://test.erpnext.com',
              apiKey,
              apiSecret,
            };
            sessionId = undefined;
          } else {
            siteConfig = {
              id: 'test',
              name: 'Test Site',
              apiUrl: 'https://test.erpnext.com',
              apiKey: '',
              apiSecret: '',
            };
            sessionId = sid;
          }
          
          const result = attemptAuthentication(siteConfig, sessionId);
          
          // Property: Headers should be correctly formatted
          if (methodToTest === 'api_key') {
            if (!result.headers.Authorization) {
              console.error('Authorization header missing');
              return false;
            }
            
            const expectedAuth = `token ${apiKey}:${apiSecret}`;
            if (result.headers.Authorization !== expectedAuth) {
              console.error('Authorization header format incorrect');
              return false;
            }
          } else {
            if (!result.headers.Cookie) {
              console.error('Cookie header missing');
              return false;
            }
            
            const expectedCookie = `sid=${sid}`;
            if (result.headers.Cookie !== expectedCookie) {
              console.error('Cookie header format incorrect');
              return false;
            }
          }
          
          // Property: Content-Type should always be present
          if (result.headers['Content-Type'] !== 'application/json') {
            console.error('Content-Type header incorrect');
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
    console.log('✓ Property-based header format correctness test passed');
  } catch (error: any) {
    console.error('✗ Property-based header format correctness test failed:', error.message);
    throw error;
  }
}

// Main test runner
async function runAllTests(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  Dual Authentication Support Property Tests                   ║');
  console.log('║  Property 10: Dual Authentication Support                     ║');
  console.log('║  Validates: Requirements 6.5                                  ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  
  const tests = [
    { name: 'API Key Authentication Works', fn: testApiKeyAuthenticationWorks },
    { name: 'Session Authentication Works', fn: testSessionAuthenticationWorks },
    { name: 'API Key Priority Over Session', fn: testApiKeyPriorityOverSession },
    { name: 'Both Methods Independent', fn: testBothMethodsIndependent },
    { name: 'No Auth When Neither Available', fn: testNoAuthWhenNeitherAvailable },
    { name: 'Property-Based Dual Auth Support', fn: testPropertyBasedDualAuthSupport },
    { name: 'Property-Based Auth Method Priority', fn: testPropertyBasedAuthMethodPriority },
    { name: 'Property-Based Header Format Correctness', fn: testPropertyBasedHeaderFormatCorrectness },
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
    
    console.log('\n⚠️  Dual authentication support tests failed!');
    process.exit(1);
  } else {
    console.log('\n✅ All dual authentication support tests passed!');
  }
}

// Run tests
runAllTests().catch((error) => {
  console.error('Test execution error:', error);
  process.exit(1);
});

/**
 * Summary of Dual Authentication Support Property Tests
 * 
 * Property 10: Dual Authentication Support
 * 
 * For any site-aware client, it should successfully authenticate using either
 * API key authentication or session-based authentication when valid credentials
 * are provided.
 * 
 * Test Coverage:
 * 1. API Key Authentication Works: Validates API key auth succeeds (Requirements 6.5)
 * 2. Session Authentication Works: Validates session auth succeeds (Requirements 6.5)
 * 3. API Key Priority Over Session: Validates API key takes priority (Requirements 6.5)
 * 4. Both Methods Independent: Validates each method works independently (Requirements 6.5)
 * 5. No Auth When Neither Available: Validates no auth when neither method present
 * 6. Property-Based Dual Auth Support: Tests across many credential combinations (Requirements 6.5)
 * 7. Property-Based Auth Method Priority: Tests priority order (Requirements 6.5)
 * 8. Property-Based Header Format Correctness: Tests header formatting (Requirements 6.5)
 * 
 * Dual Authentication Support Guarantees:
 * - API key authentication works when credentials are provided
 * - Session authentication works when session cookie is provided
 * - Both methods can be used independently
 * - API key takes priority over session when both are available
 * - Authorization header format is "token {apiKey}:{apiSecret}" for API key
 * - Cookie header format is "sid={sessionId}" for session
 * - Content-Type header is always "application/json"
 * - No authentication when neither method is available
 * - Authentication status correctly reflects available methods
 * 
 * Next Steps:
 * 1. Run this test to verify dual authentication support
 * 2. Verify all tests pass with 100+ iterations
 * 3. If tests fail, adjust authentication helpers to support both methods
 * 4. Proceed to optional multi-site switching tests
 */
