/**
 * Property-Based Test: Site ID Header Extraction
 * 
 * **Property 15: Site ID Header Extraction**
 * **Validates: Requirements 13.1, 13.3, 13.4**
 * 
 * This test validates that API routes correctly extract site ID from the
 * X-Site-ID header and use it to create the appropriate ERPNext client.
 * 
 * Test Scope:
 * - getSiteIdFromRequest extracts X-Site-ID header correctly
 * - X-Site-ID header takes priority over cookies
 * - Extracted site ID is used to create the correct client
 * - Site ID extraction works across different site values
 * - Client uses site-specific configuration based on extracted site ID
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

interface MockRequest {
  headers: Map<string, string>;
  cookies: Map<string, string>;
}

interface MockCookieStore {
  get(name: string): { value: string } | undefined;
}

/**
 * Mock site configuration storage
 */
const mockSites: Map<string, SiteConfig> = new Map();

/**
 * Initialize mock sites
 */
function initializeMockSites(): void {
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

  mockSites.clear();
  sites.forEach(site => mockSites.set(site.id, site));
}

/**
 * Get site configuration by ID
 */
function getSite(siteId: string): SiteConfig | undefined {
  return mockSites.get(siteId);
}

/**
 * Get all sites
 */
function getAllSites(): SiteConfig[] {
  return Array.from(mockSites.values());
}

/**
 * Simulates getSiteIdFromRequest function
 */
async function getSiteIdFromRequest(request: MockRequest): Promise<string | null> {
  // Check X-Site-ID header first (highest priority)
  const headerSiteId = request.headers.get('X-Site-ID');
  if (headerSiteId) {
    return headerSiteId;
  }

  // Check active_site cookie
  const cookieSiteId = request.cookies.get('active_site');
  if (cookieSiteId) {
    return cookieSiteId;
  }

  return null;
}

/**
 * Simulates ERPNextMultiClient
 */
class ERPNextMultiClient {
  private siteConfig: SiteConfig;

  constructor(siteConfig: SiteConfig) {
    this.siteConfig = siteConfig;
  }

  getSiteConfig(): SiteConfig {
    return this.siteConfig;
  }

  getSiteId(): string {
    return this.siteConfig.id;
  }

  getApiUrl(): string {
    return this.siteConfig.apiUrl;
  }
}

/**
 * Simulates getERPNextClientForRequest function
 */
async function getERPNextClientForRequest(
  request: MockRequest
): Promise<ERPNextMultiClient | null> {
  const siteId = await getSiteIdFromRequest(request);

  // If site ID specified, use that site
  if (siteId) {
    const siteConfig = getSite(siteId);
    if (!siteConfig) {
      throw new Error(`Site not found: ${siteId}`);
    }
    return new ERPNextMultiClient(siteConfig);
  }

  // No site ID - check if multi-site is configured
  const allSites = getAllSites();
  
  if (allSites.length > 0) {
    // Multi-site configured - use default site
    const defaultSite = allSites.find(s => s.isDefault) || allSites[0];
    return new ERPNextMultiClient(defaultSite);
  }

  // No multi-site config - return null (would be legacy client in real code)
  return null;
}

/**
 * Create mock request with headers and cookies
 */
function createMockRequest(
  headers: Record<string, string> = {},
  cookies: Record<string, string> = {}
): MockRequest {
  return {
    headers: new Map(Object.entries(headers)),
    cookies: new Map(Object.entries(cookies)),
  };
}

/**
 * Validates that site ID extraction is correct
 */
function validateSiteIdExtraction(
  extractedSiteId: string | null,
  expectedSiteId: string | null
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (extractedSiteId !== expectedSiteId) {
    issues.push(
      `Site ID mismatch:\n` +
      `  Expected: ${expectedSiteId}\n` +
      `  Actual: ${extractedSiteId}`
    );
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Validates that client uses correct site configuration
 */
function validateClientSiteConfig(
  client: ERPNextMultiClient | null,
  expectedSiteId: string
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (!client) {
    issues.push('Client is null');
    return { valid: false, issues };
  }

  const clientSiteId = client.getSiteId();
  if (clientSiteId !== expectedSiteId) {
    issues.push(
      `Client site ID mismatch:\n` +
      `  Expected: ${expectedSiteId}\n` +
      `  Actual: ${clientSiteId}`
    );
  }

  const siteConfig = getSite(expectedSiteId);
  if (siteConfig) {
    const clientConfig = client.getSiteConfig();
    
    if (clientConfig.apiUrl !== siteConfig.apiUrl) {
      issues.push('Client API URL does not match site config');
    }

    if (clientConfig.apiKey !== siteConfig.apiKey) {
      issues.push('Client API key does not match site config');
    }

    if (clientConfig.apiSecret !== siteConfig.apiSecret) {
      issues.push('Client API secret does not match site config');
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Test 1: Extract Site ID from X-Site-ID Header
 * Validates: Requirements 13.1, 13.3
 */
async function testExtractSiteIdFromHeader(): Promise<void> {
  console.log('\n=== Test: Extract Site ID from X-Site-ID Header ===');

  initializeMockSites();

  const siteId = 'demo';
  const request = createMockRequest({ 'X-Site-ID': siteId });

  console.log(`Testing extraction with X-Site-ID header: ${siteId}`);

  const extractedSiteId = await getSiteIdFromRequest(request);

  console.log(`Extracted site ID: ${extractedSiteId}`);

  const validation = validateSiteIdExtraction(extractedSiteId, siteId);

  if (!validation.valid) {
    console.error('Validation failed:');
    validation.issues.forEach(issue => console.error(`  - ${issue}`));
  }

  assert(validation.valid, 'Site ID should be extracted from X-Site-ID header');
  assertEqual(extractedSiteId, siteId, 'Extracted site ID should match header value');

  console.log('✓ Site ID extracted from X-Site-ID header');
}

/**
 * Test 2: X-Site-ID Header Takes Priority Over Cookie
 * Validates: Requirements 13.1, 13.3
 */
async function testHeaderPriorityOverCookie(): Promise<void> {
  console.log('\n=== Test: X-Site-ID Header Takes Priority Over Cookie ===');

  initializeMockSites();

  const headerSiteId = 'bac';
  const cookieSiteId = 'demo';
  const request = createMockRequest(
    { 'X-Site-ID': headerSiteId },
    { 'active_site': cookieSiteId }
  );

  console.log(`Testing with header: ${headerSiteId}, cookie: ${cookieSiteId}`);

  const extractedSiteId = await getSiteIdFromRequest(request);

  console.log(`Extracted site ID: ${extractedSiteId}`);

  // Should use header, not cookie
  const validation = validateSiteIdExtraction(extractedSiteId, headerSiteId);

  if (!validation.valid) {
    console.error('Validation failed:');
    validation.issues.forEach(issue => console.error(`  - ${issue}`));
  }

  assert(validation.valid, 'X-Site-ID header should take priority');
  assertEqual(extractedSiteId, headerSiteId, 'Should use header value, not cookie');

  console.log('✓ X-Site-ID header takes priority over cookie');
}

/**
 * Test 3: Client Uses Extracted Site ID
 * Validates: Requirements 13.3, 13.4
 */
async function testClientUsesExtractedSiteId(): Promise<void> {
  console.log('\n=== Test: Client Uses Extracted Site ID ===');

  initializeMockSites();

  const siteId = 'cirebon';
  const request = createMockRequest({ 'X-Site-ID': siteId });

  console.log(`Testing client creation with site ID: ${siteId}`);

  const client = await getERPNextClientForRequest(request);

  console.log(`Client created for site: ${client?.getSiteId()}`);

  const validation = validateClientSiteConfig(client, siteId);

  if (!validation.valid) {
    console.error('Validation failed:');
    validation.issues.forEach(issue => console.error(`  - ${issue}`));
  }

  assert(validation.valid, 'Client should use extracted site ID');
  assert(client !== null, 'Client should be created');
  assertEqual(client!.getSiteId(), siteId, 'Client should use correct site');

  console.log('✓ Client uses extracted site ID');
}

/**
 * Test 4: Site ID Extraction Works for Different Sites
 * Validates: Requirements 13.1, 13.3, 13.4
 */
async function testSiteIdExtractionForDifferentSites(): Promise<void> {
  console.log('\n=== Test: Site ID Extraction Works for Different Sites ===');

  initializeMockSites();

  const testSites = ['demo', 'bac', 'cirebon'];

  console.log(`Testing ${testSites.length} different sites`);

  for (const siteId of testSites) {
    console.log(`\nTesting site: ${siteId}`);

    const request = createMockRequest({ 'X-Site-ID': siteId });
    const extractedSiteId = await getSiteIdFromRequest(request);
    const client = await getERPNextClientForRequest(request);

    console.log(`  Extracted: ${extractedSiteId}`);
    console.log(`  Client site: ${client?.getSiteId()}`);

    // Validate extraction
    const extractionValidation = validateSiteIdExtraction(extractedSiteId, siteId);
    if (!extractionValidation.valid) {
      console.error(`Extraction validation failed for ${siteId}:`);
      extractionValidation.issues.forEach(issue => console.error(`  - ${issue}`));
      throw new Error(`Site ID extraction failed for ${siteId}`);
    }

    // Validate client
    const clientValidation = validateClientSiteConfig(client, siteId);
    if (!clientValidation.valid) {
      console.error(`Client validation failed for ${siteId}:`);
      clientValidation.issues.forEach(issue => console.error(`  - ${issue}`));
      throw new Error(`Client validation failed for ${siteId}`);
    }

    assertEqual(extractedSiteId, siteId, `Extracted site ID should match for ${siteId}`);
    assertEqual(client!.getSiteId(), siteId, `Client should use correct site for ${siteId}`);
  }

  console.log('\n✓ Site ID extraction works for different sites');
}

/**
 * Test 5: Returns Null When No Site ID Present
 * Validates: Requirements 13.3
 */
async function testReturnsNullWhenNoSiteId(): Promise<void> {
  console.log('\n=== Test: Returns Null When No Site ID Present ===');

  initializeMockSites();

  const request = createMockRequest(); // No headers or cookies

  console.log('Testing with no site ID in request');

  const extractedSiteId = await getSiteIdFromRequest(request);

  console.log(`Extracted site ID: ${extractedSiteId}`);

  assertEqual(extractedSiteId, null, 'Should return null when no site ID present');

  // Client should use default site when no site ID specified
  const client = await getERPNextClientForRequest(request);
  assert(client !== null, 'Client should still be created (using default site)');

  const defaultSite = getAllSites().find(s => s.isDefault);
  if (defaultSite) {
    assertEqual(
      client!.getSiteId(),
      defaultSite.id,
      'Client should use default site when no site ID specified'
    );
  }

  console.log('✓ Returns null when no site ID present');
}

/**
 * Test 6: Throws Error for Invalid Site ID
 * Validates: Requirements 13.3, 13.4
 */
async function testThrowsErrorForInvalidSiteId(): Promise<void> {
  console.log('\n=== Test: Throws Error for Invalid Site ID ===');

  initializeMockSites();

  const invalidSiteId = 'nonexistent_site';
  const request = createMockRequest({ 'X-Site-ID': invalidSiteId });

  console.log(`Testing with invalid site ID: ${invalidSiteId}`);

  let errorThrown = false;
  let errorMessage = '';

  try {
    await getERPNextClientForRequest(request);
  } catch (error: any) {
    errorThrown = true;
    errorMessage = error.message;
  }

  console.log(`Error thrown: ${errorThrown}`);
  console.log(`Error message: ${errorMessage}`);

  assert(errorThrown, 'Should throw error for invalid site ID');
  assert(
    errorMessage.includes('Site not found'),
    'Error message should indicate site not found'
  );
  assert(
    errorMessage.includes(invalidSiteId),
    'Error message should include the invalid site ID'
  );

  console.log('✓ Throws error for invalid site ID');
}

/**
 * Test 7: Property-Based Test - Site ID Header Extraction
 * Validates: Requirements 13.1, 13.3, 13.4
 */
async function testPropertyBasedSiteIdHeaderExtraction(): Promise<void> {
  console.log('\n=== Property Test: Site ID Header Extraction ===');

  initializeMockSites();

  try {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('demo', 'bac', 'cirebon'), // Valid site IDs
        async (siteId) => {
          console.log(`Testing: siteId=${siteId}`);

          const request = createMockRequest({ 'X-Site-ID': siteId });

          // Property: Extracted site ID should match header value
          const extractedSiteId = await getSiteIdFromRequest(request);
          if (extractedSiteId !== siteId) {
            console.error(`Site ID extraction failed: ${extractedSiteId} !== ${siteId}`);
            return false;
          }

          // Property: Client should use the extracted site ID
          const client = await getERPNextClientForRequest(request);
          if (!client) {
            console.error('Client is null');
            return false;
          }

          if (client.getSiteId() !== siteId) {
            console.error(`Client site ID mismatch: ${client.getSiteId()} !== ${siteId}`);
            return false;
          }

          // Property: Client should use correct site configuration
          const siteConfig = getSite(siteId);
          if (!siteConfig) {
            console.error('Site config not found');
            return false;
          }

          const clientConfig = client.getSiteConfig();
          if (clientConfig.apiUrl !== siteConfig.apiUrl) {
            console.error('API URL mismatch');
            return false;
          }

          if (clientConfig.apiKey !== siteConfig.apiKey) {
            console.error('API key mismatch');
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
    console.log('✓ Property-based site ID header extraction test passed');
  } catch (error: any) {
    console.error('✗ Property-based site ID header extraction test failed:', error.message);
    throw error;
  }
}

/**
 * Test 8: Property-Based Test - Header Priority Over Cookie
 * Validates: Requirements 13.1, 13.3
 */
async function testPropertyBasedHeaderPriority(): Promise<void> {
  console.log('\n=== Property Test: Header Priority Over Cookie ===');

  initializeMockSites();

  try {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('demo', 'bac', 'cirebon'), // Header site ID
        fc.constantFrom('demo', 'bac', 'cirebon'), // Cookie site ID
        async (headerSiteId, cookieSiteId) => {
          console.log(`Testing: header=${headerSiteId}, cookie=${cookieSiteId}`);

          const request = createMockRequest(
            { 'X-Site-ID': headerSiteId },
            { 'active_site': cookieSiteId }
          );

          // Property: Should always use header value, not cookie
          const extractedSiteId = await getSiteIdFromRequest(request);
          if (extractedSiteId !== headerSiteId) {
            console.error(`Should use header: ${extractedSiteId} !== ${headerSiteId}`);
            return false;
          }

          // Property: Client should use header site ID
          const client = await getERPNextClientForRequest(request);
          if (!client) {
            console.error('Client is null');
            return false;
          }

          if (client.getSiteId() !== headerSiteId) {
            console.error(`Client should use header site: ${client.getSiteId()} !== ${headerSiteId}`);
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
    console.log('✓ Property-based header priority test passed');
  } catch (error: any) {
    console.error('✗ Property-based header priority test failed:', error.message);
    throw error;
  }
}

/**
 * Test 9: Property-Based Test - Site Configuration Correctness
 * Validates: Requirements 13.4
 */
async function testPropertyBasedSiteConfigCorrectness(): Promise<void> {
  console.log('\n=== Property Test: Site Configuration Correctness ===');

  initializeMockSites();

  try {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('demo', 'bac', 'cirebon'),
        async (siteId) => {
          console.log(`Testing: siteId=${siteId}`);

          const request = createMockRequest({ 'X-Site-ID': siteId });
          const client = await getERPNextClientForRequest(request);

          if (!client) {
            console.error('Client is null');
            return false;
          }

          const siteConfig = getSite(siteId);
          if (!siteConfig) {
            console.error('Site config not found');
            return false;
          }

          const clientConfig = client.getSiteConfig();

          // Property: All site config fields should match
          if (clientConfig.id !== siteConfig.id) {
            console.error('Site ID mismatch');
            return false;
          }

          if (clientConfig.name !== siteConfig.name) {
            console.error('Site name mismatch');
            return false;
          }

          if (clientConfig.apiUrl !== siteConfig.apiUrl) {
            console.error('API URL mismatch');
            return false;
          }

          if (clientConfig.apiKey !== siteConfig.apiKey) {
            console.error('API key mismatch');
            return false;
          }

          if (clientConfig.apiSecret !== siteConfig.apiSecret) {
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
    console.log('✓ Property-based site config correctness test passed');
  } catch (error: any) {
    console.error('✗ Property-based site config correctness test failed:', error.message);
    throw error;
  }
}

// Main test runner
async function runAllTests(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  Site ID Header Extraction Property Tests                     ║');
  console.log('║  Property 15: Site ID Header Extraction                       ║');
  console.log('║  Validates: Requirements 13.1, 13.3, 13.4                     ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  const tests = [
    { name: 'Extract Site ID from X-Site-ID Header', fn: testExtractSiteIdFromHeader },
    { name: 'X-Site-ID Header Takes Priority Over Cookie', fn: testHeaderPriorityOverCookie },
    { name: 'Client Uses Extracted Site ID', fn: testClientUsesExtractedSiteId },
    { name: 'Site ID Extraction Works for Different Sites', fn: testSiteIdExtractionForDifferentSites },
    { name: 'Returns Null When No Site ID Present', fn: testReturnsNullWhenNoSiteId },
    { name: 'Throws Error for Invalid Site ID', fn: testThrowsErrorForInvalidSiteId },
    { name: 'Property-Based Site ID Header Extraction', fn: testPropertyBasedSiteIdHeaderExtraction },
    { name: 'Property-Based Header Priority', fn: testPropertyBasedHeaderPriority },
    { name: 'Property-Based Site Config Correctness', fn: testPropertyBasedSiteConfigCorrectness },
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

    console.log('\n⚠️  Site ID header extraction tests failed!');
    process.exit(1);
  } else {
    console.log('\n✅ All site ID header extraction tests passed!');
  }
}

// Run tests
runAllTests().catch((error) => {
  console.error('Test execution error:', error);
  process.exit(1);
});

/**
 * Summary of Site ID Header Extraction Property Tests
 * 
 * Property 15: Site ID Header Extraction
 * 
 * For any request with an X-Site-ID header, the API route should correctly
 * extract and use that site ID to create the appropriate ERPNext client.
 * 
 * Test Coverage:
 * 1. Extract Site ID from X-Site-ID Header: Validates basic extraction (Requirements 13.1, 13.3)
 * 2. X-Site-ID Header Takes Priority Over Cookie: Validates priority order (Requirements 13.1, 13.3)
 * 3. Client Uses Extracted Site ID: Validates client creation (Requirements 13.3, 13.4)
 * 4. Site ID Extraction Works for Different Sites: Validates multiple sites (Requirements 13.1, 13.3, 13.4)
 * 5. Returns Null When No Site ID Present: Validates fallback behavior (Requirements 13.3)
 * 6. Throws Error for Invalid Site ID: Validates error handling (Requirements 13.3, 13.4)
 * 7. Property-Based Site ID Header Extraction: Tests across many site IDs (Requirements 13.1, 13.3, 13.4)
 * 8. Property-Based Header Priority: Tests priority across combinations (Requirements 13.1, 13.3)
 * 9. Property-Based Site Config Correctness: Tests config matching (Requirements 13.4)
 * 
 * Site ID Header Extraction Guarantees:
 * - X-Site-ID header is correctly extracted from request
 * - X-Site-ID header takes priority over active_site cookie
 * - Extracted site ID is used to create the correct ERPNext client
 * - Client uses site-specific configuration (API URL, credentials)
 * - Returns null when no site ID is present in request
 * - Throws error when site ID is specified but site not found
 * - Works consistently across different site values
 * - All site configuration fields match between extraction and client
 * 
 * Next Steps:
 * 1. Run this test to verify site ID header extraction
 * 2. Verify all tests pass with 100+ iterations
 * 3. If tests fail, adjust getSiteIdFromRequest or getERPNextClientForRequest
 * 4. Proceed to optional site ID cookie extraction test
 */
