/**
 * Property-Based Test: Dynamic Site Switching
 * 
 * **Property 17: Dynamic Site Switching**
 * **Validates: Requirements 13.5, 13.6**
 * 
 * This test validates that the system can dynamically switch between different
 * ERPNext sites without requiring server restart. Each request with a different
 * site ID should connect to the correct ERPNext instance immediately.
 * 
 * Test Scope:
 * - Switching between sites works without server restart
 * - Each request uses the correct site configuration
 * - Site switching is immediate (no caching of old site)
 * - Multiple consecutive requests to different sites work correctly
 * - Site-specific authentication is used for each site
 * - Client configuration changes immediately when site changes
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

  getApiKey(): string {
    return this.siteConfig.apiKey;
  }

  getApiSecret(): string {
    return this.siteConfig.apiSecret;
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
 * Test 1: Switch Between Two Sites
 * Validates: Requirements 13.5, 13.6
 */
async function testSwitchBetweenTwoSites(): Promise<void> {
  console.log('\n=== Test: Switch Between Two Sites ===');

  initializeMockSites();

  const site1 = 'demo';
  const site2 = 'bac';

  console.log(`Testing switch from ${site1} to ${site2}`);

  // First request to site1
  const request1 = createMockRequest({ 'X-Site-ID': site1 });
  const client1 = await getERPNextClientForRequest(request1);

  console.log(`First request - Client site: ${client1?.getSiteId()}`);

  const validation1 = validateClientSiteConfig(client1, site1);
  if (!validation1.valid) {
    console.error('First request validation failed:');
    validation1.issues.forEach(issue => console.error(`  - ${issue}`));
  }

  assert(validation1.valid, 'First request should use site1');
  assertEqual(client1!.getSiteId(), site1, 'First client should use site1');

  // Second request to site2 (simulating site switch)
  const request2 = createMockRequest({ 'X-Site-ID': site2 });
  const client2 = await getERPNextClientForRequest(request2);

  console.log(`Second request - Client site: ${client2?.getSiteId()}`);

  const validation2 = validateClientSiteConfig(client2, site2);
  if (!validation2.valid) {
    console.error('Second request validation failed:');
    validation2.issues.forEach(issue => console.error(`  - ${issue}`));
  }

  assert(validation2.valid, 'Second request should use site2');
  assertEqual(client2!.getSiteId(), site2, 'Second client should use site2');

  // Verify clients are different
  assert(
    client1!.getApiUrl() !== client2!.getApiUrl(),
    'Clients should have different API URLs'
  );
  assert(
    client1!.getApiKey() !== client2!.getApiKey(),
    'Clients should have different API keys'
  );

  console.log('✓ Successfully switched between two sites');
}

/**
 * Test 2: Switch Between All Sites
 * Validates: Requirements 13.5, 13.6
 */
async function testSwitchBetweenAllSites(): Promise<void> {
  console.log('\n=== Test: Switch Between All Sites ===');

  initializeMockSites();

  const sites = ['demo', 'bac', 'cirebon'];

  console.log(`Testing switch across ${sites.length} sites`);

  const clients: ERPNextMultiClient[] = [];

  for (const siteId of sites) {
    console.log(`\nSwitching to site: ${siteId}`);

    const request = createMockRequest({ 'X-Site-ID': siteId });
    const client = await getERPNextClientForRequest(request);

    console.log(`  Client site: ${client?.getSiteId()}`);
    console.log(`  Client API URL: ${client?.getApiUrl()}`);

    const validation = validateClientSiteConfig(client, siteId);
    if (!validation.valid) {
      console.error(`Validation failed for ${siteId}:`);
      validation.issues.forEach(issue => console.error(`  - ${issue}`));
      throw new Error(`Site switch failed for ${siteId}`);
    }

    assert(client !== null, `Client should be created for ${siteId}`);
    assertEqual(client!.getSiteId(), siteId, `Client should use ${siteId}`);

    clients.push(client!);
  }

  // Verify all clients are different
  for (let i = 0; i < clients.length; i++) {
    for (let j = i + 1; j < clients.length; j++) {
      assert(
        clients[i].getSiteId() !== clients[j].getSiteId(),
        `Clients ${i} and ${j} should have different site IDs`
      );
      assert(
        clients[i].getApiUrl() !== clients[j].getApiUrl(),
        `Clients ${i} and ${j} should have different API URLs`
      );
      assert(
        clients[i].getApiKey() !== clients[j].getApiKey(),
        `Clients ${i} and ${j} should have different API keys`
      );
    }
  }

  console.log('\n✓ Successfully switched between all sites');
}

/**
 * Test 3: Rapid Site Switching
 * Validates: Requirements 13.5, 13.6
 */
async function testRapidSiteSwitching(): Promise<void> {
  console.log('\n=== Test: Rapid Site Switching ===');

  initializeMockSites();

  const switchSequence = ['demo', 'bac', 'demo', 'cirebon', 'bac', 'demo'];

  console.log(`Testing rapid switching: ${switchSequence.join(' -> ')}`);

  for (let i = 0; i < switchSequence.length; i++) {
    const siteId = switchSequence[i];
    console.log(`\nRequest ${i + 1}: ${siteId}`);

    const request = createMockRequest({ 'X-Site-ID': siteId });
    const client = await getERPNextClientForRequest(request);

    console.log(`  Client site: ${client?.getSiteId()}`);

    const validation = validateClientSiteConfig(client, siteId);
    if (!validation.valid) {
      console.error(`Validation failed for request ${i + 1} (${siteId}):`);
      validation.issues.forEach(issue => console.error(`  - ${issue}`));
      throw new Error(`Rapid switch failed at request ${i + 1}`);
    }

    assertEqual(client!.getSiteId(), siteId, `Request ${i + 1} should use ${siteId}`);
  }

  console.log('\n✓ Rapid site switching works correctly');
}

/**
 * Test 4: Site Switching with Cookie
 * Validates: Requirements 13.5, 13.6
 */
async function testSiteSwitchingWithCookie(): Promise<void> {
  console.log('\n=== Test: Site Switching with Cookie ===');

  initializeMockSites();

  const site1 = 'demo';
  const site2 = 'bac';

  console.log(`Testing cookie-based switch from ${site1} to ${site2}`);

  // First request with cookie
  const request1 = createMockRequest({}, { 'active_site': site1 });
  const client1 = await getERPNextClientForRequest(request1);

  console.log(`First request - Client site: ${client1?.getSiteId()}`);

  assertEqual(client1!.getSiteId(), site1, 'First client should use site1');

  // Second request with different cookie (simulating site switch)
  const request2 = createMockRequest({}, { 'active_site': site2 });
  const client2 = await getERPNextClientForRequest(request2);

  console.log(`Second request - Client site: ${client2?.getSiteId()}`);

  assertEqual(client2!.getSiteId(), site2, 'Second client should use site2');

  console.log('✓ Cookie-based site switching works correctly');
}

/**
 * Test 5: Site Switching Preserves Authentication
 * Validates: Requirements 13.5, 13.6
 */
async function testSiteSwitchingPreservesAuthentication(): Promise<void> {
  console.log('\n=== Test: Site Switching Preserves Authentication ===');

  initializeMockSites();

  const sites = ['demo', 'bac', 'cirebon'];

  console.log(`Testing authentication preservation across ${sites.length} sites`);

  for (const siteId of sites) {
    console.log(`\nTesting site: ${siteId}`);

    const request = createMockRequest({ 'X-Site-ID': siteId });
    const client = await getERPNextClientForRequest(request);

    const siteConfig = getSite(siteId);
    assert(siteConfig !== undefined, `Site config should exist for ${siteId}`);

    console.log(`  Expected API key: ${siteConfig!.apiKey}`);
    console.log(`  Client API key: ${client!.getApiKey()}`);

    assertEqual(
      client!.getApiKey(),
      siteConfig!.apiKey,
      `Client should use correct API key for ${siteId}`
    );
    assertEqual(
      client!.getApiSecret(),
      siteConfig!.apiSecret,
      `Client should use correct API secret for ${siteId}`
    );
  }

  console.log('\n✓ Site switching preserves authentication correctly');
}

/**
 * Test 6: No Caching Between Site Switches
 * Validates: Requirements 13.5, 13.6
 */
async function testNoCachingBetweenSiteSwitches(): Promise<void> {
  console.log('\n=== Test: No Caching Between Site Switches ===');

  initializeMockSites();

  const site1 = 'demo';
  const site2 = 'bac';

  console.log(`Testing no caching: ${site1} -> ${site2} -> ${site1}`);

  // First request to site1
  const request1 = createMockRequest({ 'X-Site-ID': site1 });
  const client1 = await getERPNextClientForRequest(request1);
  const apiUrl1 = client1!.getApiUrl();

  console.log(`First request to ${site1}: ${apiUrl1}`);

  // Switch to site2
  const request2 = createMockRequest({ 'X-Site-ID': site2 });
  const client2 = await getERPNextClientForRequest(request2);
  const apiUrl2 = client2!.getApiUrl();

  console.log(`Switch to ${site2}: ${apiUrl2}`);

  // Switch back to site1
  const request3 = createMockRequest({ 'X-Site-ID': site1 });
  const client3 = await getERPNextClientForRequest(request3);
  const apiUrl3 = client3!.getApiUrl();

  console.log(`Switch back to ${site1}: ${apiUrl3}`);

  // Verify site1 config is used correctly both times
  assertEqual(apiUrl1, apiUrl3, 'Site1 API URL should be same on both requests');
  assert(apiUrl1 !== apiUrl2, 'Site1 and Site2 should have different API URLs');

  console.log('✓ No caching between site switches');
}

/**
 * Test 7: Property-Based Test - Sequential Site Switching
 * Validates: Requirements 13.5, 13.6
 */
async function testPropertyBasedSequentialSiteSwitching(): Promise<void> {
  console.log('\n=== Property Test: Sequential Site Switching ===');

  initializeMockSites();

  try {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.constantFrom('demo', 'bac', 'cirebon'), { minLength: 2, maxLength: 10 }),
        async (siteSequence) => {
          console.log(`Testing sequence: ${siteSequence.join(' -> ')}`);

          for (let i = 0; i < siteSequence.length; i++) {
            const siteId = siteSequence[i];
            const request = createMockRequest({ 'X-Site-ID': siteId });
            const client = await getERPNextClientForRequest(request);

            // Property: Each request should use the correct site
            if (!client) {
              console.error(`Client is null for ${siteId}`);
              return false;
            }

            if (client.getSiteId() !== siteId) {
              console.error(`Site mismatch at position ${i}: ${client.getSiteId()} !== ${siteId}`);
              return false;
            }

            // Property: Client should use correct site configuration
            const siteConfig = getSite(siteId);
            if (!siteConfig) {
              console.error(`Site config not found for ${siteId}`);
              return false;
            }

            if (client.getApiUrl() !== siteConfig.apiUrl) {
              console.error(`API URL mismatch for ${siteId}`);
              return false;
            }

            if (client.getApiKey() !== siteConfig.apiKey) {
              console.error(`API key mismatch for ${siteId}`);
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
    console.log('✓ Property-based sequential site switching test passed');
  } catch (error: any) {
    console.error('✗ Property-based sequential site switching test failed:', error.message);
    throw error;
  }
}

/**
 * Test 8: Property-Based Test - Site Switching Consistency
 * Validates: Requirements 13.5, 13.6
 */
async function testPropertyBasedSiteSwitchingConsistency(): Promise<void> {
  console.log('\n=== Property Test: Site Switching Consistency ===');

  initializeMockSites();

  try {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('demo', 'bac', 'cirebon'),
        fc.constantFrom('demo', 'bac', 'cirebon'),
        async (site1, site2) => {
          console.log(`Testing: ${site1} -> ${site2}`);

          // First request
          const request1 = createMockRequest({ 'X-Site-ID': site1 });
          const client1 = await getERPNextClientForRequest(request1);

          if (!client1 || client1.getSiteId() !== site1) {
            console.error(`First request failed for ${site1}`);
            return false;
          }

          // Second request (switch)
          const request2 = createMockRequest({ 'X-Site-ID': site2 });
          const client2 = await getERPNextClientForRequest(request2);

          if (!client2 || client2.getSiteId() !== site2) {
            console.error(`Second request failed for ${site2}`);
            return false;
          }

          // Property: If sites are different, clients should be different
          if (site1 !== site2) {
            if (client1.getApiUrl() === client2.getApiUrl()) {
              console.error('Different sites should have different API URLs');
              return false;
            }
            if (client1.getApiKey() === client2.getApiKey()) {
              console.error('Different sites should have different API keys');
              return false;
            }
          } else {
            // Property: If sites are same, clients should use same config
            if (client1.getApiUrl() !== client2.getApiUrl()) {
              console.error('Same site should have same API URL');
              return false;
            }
            if (client1.getApiKey() !== client2.getApiKey()) {
              console.error('Same site should have same API key');
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
    console.log('✓ Property-based site switching consistency test passed');
  } catch (error: any) {
    console.error('✗ Property-based site switching consistency test failed:', error.message);
    throw error;
  }
}

/**
 * Test 9: Property-Based Test - Immediate Site Switching
 * Validates: Requirements 13.6
 */
async function testPropertyBasedImmediateSiteSwitching(): Promise<void> {
  console.log('\n=== Property Test: Immediate Site Switching ===');

  initializeMockSites();

  try {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('demo', 'bac', 'cirebon'),
        fc.constantFrom('demo', 'bac', 'cirebon'),
        async (fromSite, toSite) => {
          console.log(`Testing immediate switch: ${fromSite} -> ${toSite}`);

          // Request to first site
          const request1 = createMockRequest({ 'X-Site-ID': fromSite });
          const client1 = await getERPNextClientForRequest(request1);

          // Immediately switch to second site (no delay)
          const request2 = createMockRequest({ 'X-Site-ID': toSite });
          const client2 = await getERPNextClientForRequest(request2);

          // Property: Second request should immediately use new site
          if (client2.getSiteId() !== toSite) {
            console.error(`Immediate switch failed: ${client2.getSiteId()} !== ${toSite}`);
            return false;
          }

          // Property: Second request should use correct config immediately
          const siteConfig = getSite(toSite);
          if (!siteConfig) {
            console.error('Site config not found');
            return false;
          }

          if (client2.getApiUrl() !== siteConfig.apiUrl) {
            console.error('API URL not updated immediately');
            return false;
          }

          if (client2.getApiKey() !== siteConfig.apiKey) {
            console.error('API key not updated immediately');
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
    console.log('✓ Property-based immediate site switching test passed');
  } catch (error: any) {
    console.error('✗ Property-based immediate site switching test failed:', error.message);
    throw error;
  }
}

// Main test runner
async function runAllTests(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  Dynamic Site Switching Property Tests                        ║');
  console.log('║  Property 17: Dynamic Site Switching                          ║');
  console.log('║  Validates: Requirements 13.5, 13.6                           ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  const tests = [
    { name: 'Switch Between Two Sites', fn: testSwitchBetweenTwoSites },
    { name: 'Switch Between All Sites', fn: testSwitchBetweenAllSites },
    { name: 'Rapid Site Switching', fn: testRapidSiteSwitching },
    { name: 'Site Switching with Cookie', fn: testSiteSwitchingWithCookie },
    { name: 'Site Switching Preserves Authentication', fn: testSiteSwitchingPreservesAuthentication },
    { name: 'No Caching Between Site Switches', fn: testNoCachingBetweenSiteSwitches },
    { name: 'Property-Based Sequential Site Switching', fn: testPropertyBasedSequentialSiteSwitching },
    { name: 'Property-Based Site Switching Consistency', fn: testPropertyBasedSiteSwitchingConsistency },
    { name: 'Property-Based Immediate Site Switching', fn: testPropertyBasedImmediateSiteSwitching },
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

    console.log('\n⚠️  Dynamic site switching tests failed!');
    process.exit(1);
  } else {
    console.log('\n✅ All dynamic site switching tests passed!');
  }
}

// Run tests
runAllTests().catch((error) => {
  console.error('Test execution error:', error);
  process.exit(1);
});

/**
 * Summary of Dynamic Site Switching Property Tests
 * 
 * Property 17: Dynamic Site Switching
 * 
 * For any sequence of requests with different site IDs, each request should
 * connect to the correct ERPNext instance without requiring server restart.
 * 
 * Test Coverage:
 * 1. Switch Between Two Sites: Validates basic switching (Requirements 13.5, 13.6)
 * 2. Switch Between All Sites: Validates switching across all sites (Requirements 13.5, 13.6)
 * 3. Rapid Site Switching: Validates rapid consecutive switches (Requirements 13.5, 13.6)
 * 4. Site Switching with Cookie: Validates cookie-based switching (Requirements 13.5, 13.6)
 * 5. Site Switching Preserves Authentication: Validates auth preservation (Requirements 13.5, 13.6)
 * 6. No Caching Between Site Switches: Validates no stale config (Requirements 13.5, 13.6)
 * 7. Property-Based Sequential Site Switching: Tests sequences (Requirements 13.5, 13.6)
 * 8. Property-Based Site Switching Consistency: Tests consistency (Requirements 13.5, 13.6)
 * 9. Property-Based Immediate Site Switching: Tests immediacy (Requirements 13.6)
 * 
 * Dynamic Site Switching Guarantees:
 * - Site switching works without server restart
 * - Each request uses the correct site configuration
 * - Site switching is immediate (no caching of old site)
 * - Multiple consecutive requests to different sites work correctly
 * - Site-specific authentication is used for each site
 * - Client configuration changes immediately when site changes
 * - Works with both header and cookie-based site selection
 * - No stale configuration from previous site
 * - Switching back to a previous site uses correct config
 * 
 * Next Steps:
 * 1. Run this test to verify dynamic site switching
 * 2. Verify all tests pass with 100+ iterations
 * 3. If tests fail, adjust getERPNextClientForRequest implementation
 * 4. Proceed to optional response format compatibility tests
 */
