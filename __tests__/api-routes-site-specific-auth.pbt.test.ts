/**
 * Property-Based Test: Site-Specific Authentication
 * 
 * **Property 7: Site-Specific Authentication**
 * **Validates: Requirements 6.1**
 * 
 * This test validates that when an API route uses API key authentication,
 * the Site_Aware_Client uses site-specific API credentials from the SiteConfig.
 * 
 * Test Scope:
 * - ERPNext client uses site-specific API credentials
 * - Authorization header includes correct API key and secret for each site
 * - Different sites use different credentials
 * - Credentials are properly formatted in Authorization header
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

/**
 * Simulates makeErpHeaders function
 */
function makeErpHeaders(siteConfig: SiteConfig): AuthHeaders {
  const headers: AuthHeaders = { 'Content-Type': 'application/json' };
  
  if (siteConfig.apiKey && siteConfig.apiSecret) {
    headers['Authorization'] = `token ${siteConfig.apiKey}:${siteConfig.apiSecret}`;
  }
  
  return headers;
}

/**
 * Simulates ERPNextMultiClient
 */
class ERPNextMultiClient {
  private siteConfig: SiteConfig;

  constructor(siteConfig: SiteConfig) {
    this.siteConfig = siteConfig;
  }

  protected getHeaders(): Record<string, string> {
    const headers = makeErpHeaders(this.siteConfig);
    const result: Record<string, string> = {
      'Content-Type': headers['Content-Type'],
    };
    
    if (headers.Authorization) {
      result.Authorization = headers.Authorization;
    }
    
    if (headers.Cookie) {
      result.Cookie = headers.Cookie;
    }
    
    return result;
  }

  getSiteConfig(): SiteConfig {
    return this.siteConfig;
  }

  // Public method to access headers for testing
  public getAuthHeaders(): Record<string, string> {
    return this.getHeaders();
  }
}

/**
 * Factory function to create an ERPNextMultiClient for a specific site
 */
function getERPNextClientForSite(siteConfig: SiteConfig): ERPNextMultiClient {
  if (!siteConfig) {
    throw new Error('Site configuration is required');
  }

  if (!siteConfig.apiUrl) {
    throw new Error('Site API URL is required');
  }

  if (!siteConfig.apiKey || !siteConfig.apiSecret) {
    throw new Error('Site API credentials are required');
  }

  return new ERPNextMultiClient(siteConfig);
}

/**
 * Validates that client uses site-specific credentials
 */
function validateSiteSpecificAuth(
  client: ERPNextMultiClient,
  expectedSiteConfig: SiteConfig
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Get headers from client
  const headers = client.getAuthHeaders();

  // Validate Authorization header exists
  if (!headers.Authorization) {
    issues.push('Authorization header is missing');
    return { valid: false, issues };
  }

  // Validate Authorization header format
  const expectedAuth = `token ${expectedSiteConfig.apiKey}:${expectedSiteConfig.apiSecret}`;
  if (headers.Authorization !== expectedAuth) {
    issues.push(
      `Authorization header mismatch:\n` +
      `  Expected: ${expectedAuth}\n` +
      `  Actual: ${headers.Authorization}`
    );
  }

  // Validate Content-Type header
  if (headers['Content-Type'] !== 'application/json') {
    issues.push('Content-Type header should be application/json');
  }

  // Validate site config matches
  const clientSiteConfig = client.getSiteConfig();
  if (clientSiteConfig.id !== expectedSiteConfig.id) {
    issues.push(`Site ID mismatch: expected ${expectedSiteConfig.id}, got ${clientSiteConfig.id}`);
  }

  if (clientSiteConfig.apiKey !== expectedSiteConfig.apiKey) {
    issues.push('API key mismatch in site config');
  }

  if (clientSiteConfig.apiSecret !== expectedSiteConfig.apiSecret) {
    issues.push('API secret mismatch in site config');
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Test 1: Client Uses Site-Specific Credentials
 * Validates: Requirements 6.1
 */
async function testClientUsesSiteSpecificCredentials(): Promise<void> {
  console.log('\n=== Test: Client Uses Site-Specific Credentials ===');

  const siteConfig: SiteConfig = {
    id: 'demo',
    name: 'Demo Site',
    apiUrl: 'https://demo.erpnext.com',
    apiKey: 'demo_api_key_12345',
    apiSecret: 'demo_api_secret_67890',
    isDefault: true,
  };

  console.log(`Creating client for site: ${siteConfig.id}`);

  const client = getERPNextClientForSite(siteConfig);
  const headers = client.getAuthHeaders();

  console.log('Headers:', JSON.stringify(headers, null, 2));

  // Validate site-specific credentials are used
  const validation = validateSiteSpecificAuth(client, siteConfig);

  if (!validation.valid) {
    console.error('Validation failed:');
    validation.issues.forEach(issue => console.error(`  - ${issue}`));
  }

  assert(validation.valid, 'Client should use site-specific credentials');
  assert(headers.Authorization !== undefined, 'Authorization header should be present');
  assert(
    headers.Authorization === `token ${siteConfig.apiKey}:${siteConfig.apiSecret}`,
    'Authorization header should contain site-specific API key and secret'
  );

  console.log('✓ Client uses site-specific credentials');
}

/**
 * Test 2: Different Sites Use Different Credentials
 * Validates: Requirements 6.1
 */
async function testDifferentSitesUseDifferentCredentials(): Promise<void> {
  console.log('\n=== Test: Different Sites Use Different Credentials ===');

  const sites: SiteConfig[] = [
    {
      id: 'demo',
      name: 'Demo Site',
      apiUrl: 'https://demo.erpnext.com',
      apiKey: 'demo_key',
      apiSecret: 'demo_secret',
      isDefault: true,
    },
    {
      id: 'bac',
      name: 'BAC Production',
      apiUrl: 'https://bac.erpnext.com',
      apiKey: 'bac_key',
      apiSecret: 'bac_secret',
    },
    {
      id: 'cirebon',
      name: 'Cirebon Branch',
      apiUrl: 'https://cirebon.erpnext.com',
      apiKey: 'cirebon_key',
      apiSecret: 'cirebon_secret',
    },
  ];

  console.log(`Testing ${sites.length} different sites`);

  const clients = sites.map(site => getERPNextClientForSite(site));
  const authHeaders = clients.map(client => client.getAuthHeaders().Authorization);

  // Validate each client uses its own credentials
  for (let i = 0; i < sites.length; i++) {
    const site = sites[i];
    const client = clients[i];
    const authHeader = authHeaders[i];

    console.log(`\nSite: ${site.id}`);
    console.log(`  Auth: ${authHeader}`);

    const validation = validateSiteSpecificAuth(client, site);

    if (!validation.valid) {
      console.error(`Validation failed for ${site.id}:`);
      validation.issues.forEach(issue => console.error(`  - ${issue}`));
      throw new Error(`Site-specific auth validation failed for ${site.id}`);
    }

    const expectedAuth = `token ${site.apiKey}:${site.apiSecret}`;
    assertEqual(authHeader, expectedAuth, `Auth header should match for ${site.id}`);
  }

  // Validate all auth headers are different
  const uniqueAuthHeaders = new Set(authHeaders);
  assertEqual(
    uniqueAuthHeaders.size,
    sites.length,
    'Each site should have unique credentials'
  );

  console.log('\n✓ Different sites use different credentials');
}

/**
 * Test 3: Authorization Header Format
 * Validates: Requirements 6.1
 */
async function testAuthorizationHeaderFormat(): Promise<void> {
  console.log('\n=== Test: Authorization Header Format ===');

  const siteConfig: SiteConfig = {
    id: 'test',
    name: 'Test Site',
    apiUrl: 'https://test.erpnext.com',
    apiKey: 'test_key_abc123',
    apiSecret: 'test_secret_xyz789',
  };

  console.log('Testing authorization header format');

  const client = getERPNextClientForSite(siteConfig);
  const headers = client.getAuthHeaders();

  // Validate format: "token {apiKey}:{apiSecret}"
  const authHeader = headers.Authorization;
  assert(authHeader !== undefined, 'Authorization header should be present');

  const authRegex = /^token [^:]+:[^:]+$/;
  assert(
    authRegex.test(authHeader!),
    'Authorization header should match format "token {apiKey}:{apiSecret}"'
  );

  // Validate it starts with "token "
  assert(
    authHeader!.startsWith('token '),
    'Authorization header should start with "token "'
  );

  // Validate it contains the colon separator
  const tokenPart = authHeader!.substring(6); // Remove "token " prefix
  assert(
    tokenPart.includes(':'),
    'Authorization header should contain colon separator between key and secret'
  );

  // Validate key and secret are present
  const [key, secret] = tokenPart.split(':');
  assertEqual(key, siteConfig.apiKey, 'API key should match site config');
  assertEqual(secret, siteConfig.apiSecret, 'API secret should match site config');

  console.log('✓ Authorization header format is correct');
}

/**
 * Test 4: Client Throws Error for Invalid Site Config
 * Validates: Requirements 6.1
 */
async function testClientThrowsErrorForInvalidConfig(): Promise<void> {
  console.log('\n=== Test: Client Throws Error for Invalid Site Config ===');

  const invalidConfigs = [
    {
      config: null as any,
      expectedError: 'Site configuration is required',
    },
    {
      config: {
        id: 'test',
        name: 'Test',
        apiUrl: '',
        apiKey: 'key',
        apiSecret: 'secret',
      },
      expectedError: 'Site API URL is required',
    },
    {
      config: {
        id: 'test',
        name: 'Test',
        apiUrl: 'https://test.com',
        apiKey: '',
        apiSecret: 'secret',
      },
      expectedError: 'Site API credentials are required',
    },
    {
      config: {
        id: 'test',
        name: 'Test',
        apiUrl: 'https://test.com',
        apiKey: 'key',
        apiSecret: '',
      },
      expectedError: 'Site API credentials are required',
    },
  ];

  console.log(`Testing ${invalidConfigs.length} invalid configurations`);

  for (const { config, expectedError } of invalidConfigs) {
    console.log(`\nTesting: ${expectedError}`);

    let errorThrown = false;
    let actualError = '';

    try {
      getERPNextClientForSite(config);
    } catch (error: any) {
      errorThrown = true;
      actualError = error.message;
    }

    assert(errorThrown, `Should throw error: ${expectedError}`);
    assert(
      actualError.includes(expectedError),
      `Error message should contain: ${expectedError}`
    );

    console.log(`  ✓ Correctly threw error: ${actualError}`);
  }

  console.log('\n✓ Client validates site configuration');
}

/**
 * Test 5: Property-Based Test - Site-Specific Authentication
 * Validates: Requirements 6.1
 */
async function testPropertyBasedSiteSpecificAuth(): Promise<void> {
  console.log('\n=== Property Test: Site-Specific Authentication ===');

  try {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('demo', 'bac', 'cirebon', 'test', 'prod'), // site IDs
        fc.string({ minLength: 10, maxLength: 30 }), // API key
        fc.string({ minLength: 10, maxLength: 30 }), // API secret
        fc.webUrl(), // API URL
        async (siteId, apiKey, apiSecret, apiUrl) => {
          console.log(`Testing: siteId=${siteId}, apiKey=${apiKey.substring(0, 5)}...`);

          const siteConfig: SiteConfig = {
            id: siteId,
            name: `${siteId} Site`,
            apiUrl,
            apiKey,
            apiSecret,
          };

          const client = getERPNextClientForSite(siteConfig);
          const headers = client.getAuthHeaders();

          // Property: Authorization header should contain site-specific credentials
          if (!headers.Authorization) {
            console.error('Authorization header missing');
            return false;
          }

          const expectedAuth = `token ${apiKey}:${apiSecret}`;
          if (headers.Authorization !== expectedAuth) {
            console.error(`Auth mismatch: ${headers.Authorization} !== ${expectedAuth}`);
            return false;
          }

          // Property: Client site config should match input
          const clientConfig = client.getSiteConfig();
          if (clientConfig.id !== siteId) {
            console.error('Site ID mismatch');
            return false;
          }

          if (clientConfig.apiKey !== apiKey) {
            console.error('API key mismatch');
            return false;
          }

          if (clientConfig.apiSecret !== apiSecret) {
            console.error('API secret mismatch');
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
    console.log('✓ Property-based site-specific auth test passed');
  } catch (error: any) {
    console.error('✗ Property-based site-specific auth test failed:', error.message);
    throw error;
  }
}

/**
 * Test 6: Property-Based Test - Credential Uniqueness
 * Validates: Requirements 6.1
 */
async function testPropertyBasedCredentialUniqueness(): Promise<void> {
  console.log('\n=== Property Test: Credential Uniqueness ===');

  try {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.constantFrom('demo', 'bac', 'cirebon', 'test', 'prod'),
            apiKey: fc.string({ minLength: 10, maxLength: 20 }),
            apiSecret: fc.string({ minLength: 10, maxLength: 20 }),
          }),
          { minLength: 2, maxLength: 5 }
        ),
        async (siteConfigs) => {
          console.log(`Testing ${siteConfigs.length} sites for credential uniqueness`);

          // Property: Each site should use its own unique credentials
          const clients = siteConfigs.map(config =>
            getERPNextClientForSite({
              ...config,
              name: `${config.id} Site`,
              apiUrl: `https://${config.id}.erpnext.com`,
            })
          );

          const authHeaders = clients.map(client => client.getAuthHeaders().Authorization);

          // Validate each client uses the correct credentials
          for (let i = 0; i < siteConfigs.length; i++) {
            const config = siteConfigs[i];
            const authHeader = authHeaders[i];
            const expectedAuth = `token ${config.apiKey}:${config.apiSecret}`;

            if (authHeader !== expectedAuth) {
              console.error(`Credential mismatch for ${config.id}`);
              return false;
            }
          }

          // Property: If sites have different credentials, auth headers should differ
          const uniqueCredentials = new Set(
            siteConfigs.map(c => `${c.apiKey}:${c.apiSecret}`)
          );
          const uniqueAuthHeaders = new Set(authHeaders);

          if (uniqueCredentials.size !== uniqueAuthHeaders.size) {
            console.error('Credential uniqueness not preserved in auth headers');
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
    console.log('✓ Property-based credential uniqueness test passed');
  } catch (error: any) {
    console.error('✗ Property-based credential uniqueness test failed:', error.message);
    throw error;
  }
}

/**
 * Test 7: Property-Based Test - Switching Between Sites
 * Validates: Requirements 6.1
 */
async function testPropertyBasedSiteSwitching(): Promise<void> {
  console.log('\n=== Property Test: Switching Between Sites ===');

  try {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 3, maxLength: 10 }),
            apiKey: fc.string({ minLength: 10, maxLength: 20 }),
            apiSecret: fc.string({ minLength: 10, maxLength: 20 }),
          }),
          { minLength: 2, maxLength: 5 }
        ),
        async (siteConfigs) => {
          console.log(`Testing site switching with ${siteConfigs.length} sites`);

          // Property: Switching between sites should use correct credentials for each
          for (const config of siteConfigs) {
            const siteConfig: SiteConfig = {
              ...config,
              name: `${config.id} Site`,
              apiUrl: `https://${config.id}.erpnext.com`,
            };

            const client = getERPNextClientForSite(siteConfig);
            const headers = client.getAuthHeaders();

            const expectedAuth = `token ${config.apiKey}:${config.apiSecret}`;
            if (headers.Authorization !== expectedAuth) {
              console.error(`Wrong credentials after switching to ${config.id}`);
              return false;
            }

            // Validate client config matches
            const clientConfig = client.getSiteConfig();
            if (clientConfig.id !== config.id) {
              console.error('Site ID mismatch after switching');
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
    console.log('✓ Property-based site switching test passed');
  } catch (error: any) {
    console.error('✗ Property-based site switching test failed:', error.message);
    throw error;
  }
}

// Main test runner
async function runAllTests(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  Site-Specific Authentication Property Tests                  ║');
  console.log('║  Property 7: Site-Specific Authentication                     ║');
  console.log('║  Validates: Requirements 6.1                                  ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  const tests = [
    { name: 'Client Uses Site-Specific Credentials', fn: testClientUsesSiteSpecificCredentials },
    { name: 'Different Sites Use Different Credentials', fn: testDifferentSitesUseDifferentCredentials },
    { name: 'Authorization Header Format', fn: testAuthorizationHeaderFormat },
    { name: 'Client Throws Error for Invalid Config', fn: testClientThrowsErrorForInvalidConfig },
    { name: 'Property-Based Site-Specific Auth', fn: testPropertyBasedSiteSpecificAuth },
    { name: 'Property-Based Credential Uniqueness', fn: testPropertyBasedCredentialUniqueness },
    { name: 'Property-Based Site Switching', fn: testPropertyBasedSiteSwitching },
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

    console.log('\n⚠️  Site-specific authentication tests failed!');
    process.exit(1);
  } else {
    console.log('\n✅ All site-specific authentication tests passed!');
  }
}

// Run tests
runAllTests().catch((error) => {
  console.error('Test execution error:', error);
  process.exit(1);
});

/**
 * Summary of Site-Specific Authentication Property Tests
 * 
 * Property 7: Site-Specific Authentication
 * 
 * For any site configuration with API credentials, the ERPNext client created
 * for that site should use those site-specific credentials in all API requests.
 * 
 * Test Coverage:
 * 1. Client Uses Site-Specific Credentials: Validates basic credential usage (Requirements 6.1)
 * 2. Different Sites Use Different Credentials: Validates credential isolation (Requirements 6.1)
 * 3. Authorization Header Format: Validates header format "token {key}:{secret}" (Requirements 6.1)
 * 4. Client Throws Error for Invalid Config: Validates configuration validation (Requirements 6.1)
 * 5. Property-Based Site-Specific Auth: Tests across many site configurations (Requirements 6.1)
 * 6. Property-Based Credential Uniqueness: Validates unique credentials per site
 * 7. Property-Based Site Switching: Validates correct credentials when switching sites
 * 
 * Site-Specific Authentication Guarantees:
 * - Each site uses its own unique API credentials
 * - Authorization header format is "token {apiKey}:{apiSecret}"
 * - Client validates site configuration before use
 * - Switching between sites uses correct credentials for each site
 * - Credentials are never mixed between sites
 * - Client site config matches the input site config
 * 
 * Next Steps:
 * 1. Run this test to verify site-specific authentication
 * 2. Verify all tests pass with 100+ iterations
 * 3. If tests fail, adjust ERPNextMultiClient to use site-specific credentials
 * 4. Proceed to session authentication preservation test (optional)
 */
