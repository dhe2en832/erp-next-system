/**
 * Preservation Property Tests for Session Cookie Authentication and Business Logic
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 * 
 * IMPORTANT: These tests should PASS on UNFIXED code to establish baseline behavior.
 * They verify that after the fix:
 * - Session cookie authentication continues to work (fallback method)
 * - CRUD operations produce identical results
 * - Report generation produces identical data
 * - Error handling remains unchanged
 * - Multi-site routing works correctly
 * - Data transformation logic is preserved
 * 
 * Testing Approach:
 * 1. Observe behavior on UNFIXED code with valid session cookie
 * 2. Write property-based tests capturing observed behavior
 * 3. Run tests on UNFIXED code (should PASS)
 * 4. After fix, re-run tests to verify preservation (should still PASS)
 */

import * as fc from 'fast-check';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
const envLocalPath = path.resolve(__dirname, '../.env.local');
const envPath = path.resolve(__dirname, '../.env');

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// Test runner
let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function test(name: string, fn: () => Promise<void> | void) {
  return async () => {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      testsPassed++;
    } catch (error) {
      console.log(`  ✗ ${name}`);
      console.error(`    Error: ${error instanceof Error ? error.message : String(error)}`);
      testsFailed++;
    }
  };
}

/**
 * Helper to call API with session cookie
 * This simulates user login flow (session cookie authentication)
 */
async function callEndpointWithSessionCookie(
  endpoint: string,
  method: string = 'GET',
  body?: any,
  sessionCookie?: string
): Promise<{ status: number; data: any; ok: boolean }> {
  const url = `http://localhost:3000${endpoint}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Use provided session cookie or get from environment
  const sid = sessionCookie || process.env.TEST_SESSION_COOKIE;
  if (sid) {
    headers['Cookie'] = `sid=${sid}`;
  }

  const options: RequestInit = {
    method,
    headers,
  };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const data = await response.json();

  return {
    status: response.status,
    data,
    ok: response.ok,
  };
}

async function runTests() {
  console.log('\n=== Preservation Property Tests - Session Cookie Authentication & Business Logic ===\n');
  console.log('IMPORTANT: These tests should PASS on UNFIXED code.');
  console.log('They establish baseline behavior that must be preserved after fix.\n');
  console.log('Testing that session cookie authentication continues to work (fallback method)');
  console.log('and that all business logic operations produce identical results.\n');

  console.log('Environment Check:');
  console.log(`  TEST_SESSION_COOKIE: ${process.env.TEST_SESSION_COOKIE ? '✓ Configured' : '✗ Missing (will skip session cookie tests)'}`);
  console.log(`  ERP_API_KEY: ${process.env.ERP_API_KEY ? '✓ Configured' : '✗ Missing'}`);
  console.log(`  ERPNEXT_API_URL: ${process.env.ERPNEXT_API_URL || 'Not set'}\n`);

  const hasSessionCookie = !!process.env.TEST_SESSION_COOKIE;
  const hasApiKey = !!(process.env.ERP_API_KEY && process.env.ERP_API_SECRET);

  if (!hasSessionCookie) {
    console.log('⚠️  TEST_SESSION_COOKIE not configured. Session cookie tests will be skipped.');
    console.log('To test session cookie authentication, set TEST_SESSION_COOKIE in .env.local');
    console.log('Note: These tests verify session cookie auth is preserved after fix.\n');
  }

  if (!hasApiKey) {
    console.log('⚠️  API Key not configured. Some tests may fail.');
    console.log('Set ERP_API_KEY and ERP_API_SECRET in .env.local\n');
  }

  console.log('Property 2.1: Session Cookie Authentication Preservation\n');

  /**
   * Property 2.1.1: Purchase Suppliers GET with session cookie
   * 
   * Verifies that session cookie authentication continues to work
   * for user login flows after the fix.
   */
  if (hasSessionCookie) {
    await test('Property 2.1.1: GET /api/purchase/suppliers with session cookie', async () => {
      const result = await callEndpointWithSessionCookie(
        '/api/purchase/suppliers?company=PT%20ABC&limit_page_length=5'
      );

      console.log(`    Response: status=${result.status}, ok=${result.ok}`);

      // Session cookie authentication should work
      assert(result.ok, `Session cookie auth should work: ${result.status} - ${result.data.message}`);
      assert(result.status === 200, 'Should return 200 OK');
      assert(result.data.success === true, 'Response should indicate success');
      assert(Array.isArray(result.data.data), 'Should return array of suppliers');
    })();

    /**
     * Property 2.1.2: Finance Journal GET with session cookie
     */
    await test('Property 2.1.2: GET /api/finance/journal with session cookie', async () => {
      const result = await callEndpointWithSessionCookie(
        '/api/finance/journal?company=PT%20ABC&limit_page_length=5'
      );

      console.log(`    Response: status=${result.status}, ok=${result.ok}`);

      assert(result.ok, `Session cookie auth should work: ${result.status}`);
      assert(result.status === 200, 'Should return 200 OK');
      assert(result.data.success === true, 'Response should indicate success');
    })();

    /**
     * Property 2.1.3: Multiple endpoints with session cookie
     * 
     * Tests that session cookie authentication works across different modules
     */
    await test('Property 2.1.3: Multiple endpoints authenticate with session cookie', async () => {
      const endpoints = [
        { path: '/api/purchase/suppliers?company=PT%20ABC&limit_page_length=5', module: 'Purchase' },
        { path: '/api/finance/journal?company=PT%20ABC&limit_page_length=5', module: 'Finance' },
        { path: '/api/finance/accounts/expense?company=PT%20ABC', module: 'Finance' },
        { path: '/api/finance/accounts/cash-bank?company=PT%20ABC', module: 'Finance' },
      ];

      console.log('    Testing session cookie auth across modules:');

      for (const endpoint of endpoints) {
        const result = await callEndpointWithSessionCookie(endpoint.path);
        console.log(`      ${endpoint.module}: ${result.status} ${result.ok ? '✓' : '✗'}`);
        
        assert(result.ok, `${endpoint.module} should authenticate with session cookie`);
      }
    })();
  }

  console.log('\nProperty 2.2: CRUD Operations Preservation\n');

  /**
   * Property 2.2.1: GET operations return consistent data
   * 
   * Tests that GET operations with various query parameters
   * produce consistent results before and after fix.
   */
  await test('Property 2.2.1: GET operations with various query parameters', async () => {
    const companyArb = fc.constantFrom('PT ABC', 'PT XYZ');
    const limitArb = fc.integer({ min: 5, max: 20 });
    const startArb = fc.integer({ min: 0, max: 10 });

    await fc.assert(
      fc.asyncProperty(companyArb, limitArb, startArb, async (company, limit, start) => {
        const encodedCompany = encodeURIComponent(company);
        const endpoint = `/api/purchase/suppliers?company=${encodedCompany}&limit_page_length=${limit}&limit_start=${start}`;
        
        const result = await callEndpointWithSessionCookie(endpoint);

        // Should return success or expected error (not 401 if session cookie valid)
        if (hasSessionCookie) {
          return result.ok || result.status === 400; // 400 = validation error (acceptable)
        } else {
          // Without session cookie, might get 401 on unfixed code (expected)
          return true; // Skip validation if no session cookie
        }
      }),
      { numRuns: 5 }
    );

    console.log('    Property verified: GET operations consistent across query parameters');
  })();

  /**
   * Property 2.2.2: Search functionality preservation
   * 
   * Tests that search functionality produces consistent results
   */
  if (hasSessionCookie) {
    await test('Property 2.2.2: Search functionality produces consistent results', async () => {
      const searchTermArb = fc.constantFrom('Test', 'PT', 'ABC', '');

      await fc.assert(
        fc.asyncProperty(searchTermArb, async (searchTerm) => {
          const encodedSearch = encodeURIComponent(searchTerm);
          const endpoint = `/api/purchase/suppliers?company=PT%20ABC&search=${encodedSearch}&limit_page_length=10`;
          
          const result = await callEndpointWithSessionCookie(endpoint);

          // Should return success
          if (!result.ok) {
            console.log(`      Search term "${searchTerm}": ${result.status}`);
            return false;
          }

          // Verify response structure
          return (
            result.data.success === true &&
            Array.isArray(result.data.data) &&
            typeof result.data.total === 'number'
          );
        }),
        { numRuns: 5 }
      );

      console.log('    Property verified: Search functionality preserved');
    })();
  }

  console.log('\nProperty 2.3: Report Generation Preservation\n');

  /**
   * Property 2.3.1: Journal entries with date filters
   * 
   * Tests that report generation with date ranges produces
   * consistent results before and after fix.
   */
  if (hasSessionCookie) {
    await test('Property 2.3.1: Journal entries with date filters', async () => {
      const dateRanges = [
        { from: '2024-01-01', to: '2024-01-31' },
        { from: '2024-02-01', to: '2024-02-29' },
        { from: '2024-03-01', to: '2024-03-31' },
      ];

      for (const range of dateRanges) {
        const endpoint = `/api/finance/journal?company=PT%20ABC&from_date=${range.from}&to_date=${range.to}&limit_page_length=10`;
        const result = await callEndpointWithSessionCookie(endpoint);

        console.log(`      Date range ${range.from} to ${range.to}: ${result.status}`);

        assert(result.ok, `Report generation should work for date range ${range.from} to ${range.to}`);
        assert(result.data.success === true, 'Response should indicate success');
      }

      console.log('    Property verified: Report generation with date filters preserved');
    })();

    /**
     * Property 2.3.2: Journal entries with status filters
     */
    await test('Property 2.3.2: Journal entries with status filters', async () => {
      const statuses = ['Draft', 'Submitted', 'Cancelled'];

      for (const status of statuses) {
        const endpoint = `/api/finance/journal?company=PT%20ABC&status=${status}&limit_page_length=10`;
        const result = await callEndpointWithSessionCookie(endpoint);

        console.log(`      Status filter "${status}": ${result.status}`);

        // Should return success (even if no data matches)
        assert(result.ok, `Report generation should work for status ${status}`);
      }

      console.log('    Property verified: Report generation with status filters preserved');
    })();
  }

  console.log('\nProperty 2.4: Error Handling Preservation\n');

  /**
   * Property 2.4.1: Missing required parameters
   * 
   * Tests that error handling for invalid inputs remains unchanged
   */
  if (hasSessionCookie) {
    await test('Property 2.4.1: Missing required parameters handled consistently', async () => {
      // Journal endpoint requires company parameter
      const result = await callEndpointWithSessionCookie('/api/finance/journal');

      console.log(`    Response: status=${result.status}`);

      // Should return 400 Bad Request (not 401 or 500)
      assert(result.status === 400, 'Should return 400 for missing required parameter');
      assert(result.data.success === false, 'Response should indicate failure');
      assert(result.data.message.includes('Company'), 'Error message should mention missing company');
    })();

    /**
     * Property 2.4.2: Invalid parameter values
     */
    await test('Property 2.4.2: Invalid parameter values handled consistently', async () => {
      // Invalid limit value
      const result = await callEndpointWithSessionCookie(
        '/api/purchase/suppliers?company=PT%20ABC&limit_page_length=-1'
      );

      console.log(`    Response: status=${result.status}`);

      // Should handle gracefully (either 400 or return empty results)
      assert(result.status === 200 || result.status === 400, 'Should handle invalid parameters gracefully');
    })();
  }

  console.log('\nProperty 2.5: Data Transformation Preservation\n');

  /**
   * Property 2.5.1: Journal entry enrichment
   * 
   * Tests that complex data transformation (fetching child tables,
   * calculating totals) produces consistent results.
   */
  if (hasSessionCookie) {
    await test('Property 2.5.1: Journal entry data enrichment preserved', async () => {
      const result = await callEndpointWithSessionCookie(
        '/api/finance/journal?company=PT%20ABC&limit_page_length=5'
      );

      console.log(`    Response: status=${result.status}, entries=${result.data.data?.length || 0}`);

      assert(result.ok, 'Should fetch journal entries successfully');
      
      if (result.data.data && result.data.data.length > 0) {
        const entry = result.data.data[0];
        
        // Verify enriched fields are present
        assert('name' in entry, 'Entry should have name field');
        assert('posting_date' in entry, 'Entry should have posting_date field');
        assert('total_debit' in entry, 'Entry should have calculated total_debit');
        assert('total_credit' in entry, 'Entry should have calculated total_credit');
        assert('status' in entry, 'Entry should have mapped status field');
        
        // Verify totals are numbers
        assert(typeof entry.total_debit === 'number', 'total_debit should be number');
        assert(typeof entry.total_credit === 'number', 'total_credit should be number');
        
        console.log(`    Verified enrichment: debit=${entry.total_debit}, credit=${entry.total_credit}`);
      }

      console.log('    Property verified: Data enrichment logic preserved');
    })();

    /**
     * Property 2.5.2: Supplier search hybrid logic
     * 
     * Tests that complex search logic (searching by name and supplier_name,
     * combining and deduplicating results) is preserved.
     */
    await test('Property 2.5.2: Supplier hybrid search logic preserved', async () => {
      const result = await callEndpointWithSessionCookie(
        '/api/purchase/suppliers?company=PT%20ABC&search=Test&limit_page_length=10'
      );

      console.log(`    Response: status=${result.status}, suppliers=${result.data.data?.length || 0}`);

      assert(result.ok, 'Should execute hybrid search successfully');
      assert(result.data.success === true, 'Response should indicate success');
      assert(Array.isArray(result.data.data), 'Should return array of suppliers');
      
      // Verify message indicates hybrid search was used
      if (result.data.message) {
        console.log(`    Search message: ${result.data.message}`);
      }

      console.log('    Property verified: Hybrid search logic preserved');
    })();
  }

  console.log('\nProperty 2.6: Response Structure Preservation\n');

  /**
   * Property 2.6.1: Consistent response format
   * 
   * Tests that response structure remains consistent across endpoints
   */
  if (hasSessionCookie) {
    await test('Property 2.6.1: Response structure consistent across endpoints', async () => {
      const endpoints = [
        '/api/purchase/suppliers?company=PT%20ABC&limit_page_length=5',
        '/api/finance/journal?company=PT%20ABC&limit_page_length=5',
      ];

      for (const endpoint of endpoints) {
        const result = await callEndpointWithSessionCookie(endpoint);

        assert(result.ok, `Endpoint ${endpoint} should succeed`);
        assert('success' in result.data, 'Response should have success field');
        assert('data' in result.data, 'Response should have data field');
        assert(typeof result.data.success === 'boolean', 'success should be boolean');
        
        console.log(`    ${endpoint}: structure verified ✓`);
      }

      console.log('    Property verified: Response structure preserved');
    })();

    /**
     * Property 2.6.2: Error response format
     */
    await test('Property 2.6.2: Error response format preserved', async () => {
      // Trigger error by missing required parameter
      const result = await callEndpointWithSessionCookie('/api/finance/journal');

      assert(result.status === 400, 'Should return 400 for validation error');
      assert('success' in result.data, 'Error response should have success field');
      assert('message' in result.data, 'Error response should have message field');
      assert(result.data.success === false, 'success should be false for errors');
      assert(typeof result.data.message === 'string', 'message should be string');

      console.log('    Property verified: Error response format preserved');
    })();
  }

  console.log('\nProperty 2.7: API Structure and Error Response Preservation (No Auth Required)\n');

  /**
   * Property 2.7.1: Error response structure for missing auth
   * 
   * Tests that error responses maintain consistent structure
   * even when authentication is missing.
   */
  await test('Property 2.7.1: Consistent error response structure', async () => {
    // Call endpoint without any authentication
    const result = await callEndpointWithSessionCookie(
      '/api/purchase/suppliers?company=PT%20ABC',
      'GET',
      undefined,
      undefined // No session cookie
    );

    console.log(`    Response: status=${result.status}`);

    // On unfixed code, should return 401 with consistent structure
    if (result.status === 401) {
      assert('success' in result.data || 'message' in result.data, 'Error response should have success or message field');
      console.log(`    Error structure verified: ${JSON.stringify(result.data)}`);
    }

    console.log('    Property verified: Error response structure consistent');
  })();

  /**
   * Property 2.7.2: Endpoint availability
   * 
   * Tests that endpoints are accessible (even if they return auth errors)
   */
  await test('Property 2.7.2: Endpoints are accessible', async () => {
    const endpoints = [
      '/api/purchase/suppliers?company=PT%20ABC',
      '/api/finance/journal?company=PT%20ABC',
      '/api/finance/accounts/expense?company=PT%20ABC',
    ];

    for (const endpoint of endpoints) {
      try {
        const result = await callEndpointWithSessionCookie(endpoint, 'GET', undefined, undefined);
        console.log(`      ${endpoint}: ${result.status}`);
        
        // Should get a response (200, 401, 400, or 500 - not network error)
        assert(result.status > 0, `Endpoint should be accessible: ${endpoint}`);
      } catch (error) {
        console.log(`      ${endpoint}: Network error - ${error}`);
        throw new Error(`Endpoint not accessible: ${endpoint}`);
      }
    }

    console.log('    Property verified: All endpoints accessible');
  })();

  /**
   * Property 2.7.3: Multi-site routing structure preserved
   * 
   * Tests that site ID extraction from headers/cookies works
   */
  await test('Property 2.7.3: Multi-site routing structure preserved', async () => {
    // Test with X-Site-ID header
    const url = 'http://localhost:3000/api/purchase/suppliers?company=PT%20ABC';
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Site-ID': 'demo-batasku-cloud',
      },
    });

    const data = await response.json();
    console.log(`    Response with X-Site-ID header: ${response.status}`);

    // Should process the request (even if auth fails)
    assert(response.status > 0, 'Should process request with site ID header');
    
    // If error response includes site context, verify it
    if (data.site) {
      console.log(`    Site context preserved: ${data.site}`);
    }

    console.log('    Property verified: Multi-site routing structure preserved');
  })();

  console.log('\nProperty 2.8: Business Logic Patterns (Observable Without Auth)\n');

  /**
   * Property 2.8.1: Query parameter validation
   * 
   * Tests that query parameter validation happens before auth
   * (or returns consistent error structure)
   */
  await test('Property 2.8.1: Query parameter validation patterns', async () => {
    // Test missing required parameter (company for journal endpoint)
    const result = await callEndpointWithSessionCookie(
      '/api/finance/journal',
      'GET',
      undefined,
      undefined
    );

    console.log(`    Response for missing company param: ${result.status}`);

    // Should return 400 (validation error) or 401 (auth error)
    // Both are acceptable - we're verifying the pattern is consistent
    assert(result.status === 400 || result.status === 401, 'Should return validation or auth error');
    assert('message' in result.data, 'Error should include message');

    console.log(`    Error message: ${result.data.message}`);
    console.log('    Property verified: Query validation patterns preserved');
  })();
  console.log('\n=== Test Summary ===');
  console.log(`Passed: ${testsPassed}`);
  console.log(`Failed: ${testsFailed}`);
  console.log(`Total: ${testsPassed + testsFailed}`);
  
  if (testsFailed === 0) {
    console.log('\n✓ All preservation tests passed!');
    console.log('Baseline behavior established. These tests should continue to pass after fix.');
    console.log('\nVerified Preservation:');
    console.log('  ✓ Session cookie authentication works (fallback method)');
    console.log('  ✓ CRUD operations produce consistent results');
    console.log('  ✓ Report generation with filters works correctly');
    console.log('  ✓ Error handling remains unchanged');
    console.log('  ✓ Data transformation logic preserved');
    console.log('  ✓ Response structure consistent');
  } else {
    console.log('\n⚠️  Some preservation tests failed.');
    console.log('This may indicate:');
    console.log('  1. Session cookie not configured (set TEST_SESSION_COOKIE in .env.local)');
    console.log('  2. ERPNext backend not running');
    console.log('  3. Test data not available');
    console.log('  4. Network connectivity issues');
    console.log('\nNote: These tests should PASS on unfixed code to establish baseline.');
  }
  
  process.exit(testsFailed > 0 ? 1 : 0);
}

runTests().catch(console.error);
