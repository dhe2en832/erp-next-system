/**
 * Bug Condition Exploration Test for Session Cookie Checks Blocking API Key Authentication
 * 
 * This test is EXPECTED TO FAIL on unfixed code - failure confirms the bug exists.
 * DO NOT attempt to fix the test or the code when it fails.
 * 
 * Bug: 50+ API endpoints have inline `if (!sid)` checks that return 401 Unauthorized
 * immediately when session cookie is absent, even when valid API Key credentials are
 * configured in environment variables. This blocks the dual authentication fallback
 * mechanism (API Key primary → session cookie fallback).
 * 
 * Expected Behavior After Fix:
 * - Endpoints should use getERPNextClientForRequest() which implements dual auth
 * - API Key authentication should work regardless of session cookie presence
 * - Session cookie authentication should still work as fallback
 * 
 * Validates: Bugfix Requirements 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4
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

// Simple test runner
let testsPassed = 0;
let testsFailed = 0;
const counterexamples: Array<{ endpoint: string; method: string; status: number; error: string }> = [];

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
 * Helper function to call API endpoint WITHOUT session cookie
 * This simulates API Key authentication (primary method)
 */
async function callEndpointWithoutSessionCookie(
  endpoint: string,
  method: string = 'GET',
  body?: any
): Promise<{ status: number; data: any; ok: boolean }> {
  const url = `http://localhost:3000${endpoint}`;
  
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      // Explicitly NOT including Cookie header
      // API Key should be used from environment variables
    },
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
  console.log('\n=== Bug Exploration Test - Session Cookie Checks Block API Key Authentication ===\n');
  console.log('IMPORTANT: This test is EXPECTED TO FAIL on unfixed code.');
  console.log('Failure confirms the bug exists. This is the correct behavior.\n');
  console.log('Bug Pattern: Endpoints with inline `if (!sid)` checks return 401 immediately,');
  console.log('bypassing API Key fallback even when ERP_API_KEY and ERP_API_SECRET are configured.\n');

  console.log('Environment Check:');
  console.log(`  ERP_API_KEY: ${process.env.ERP_API_KEY ? '✓ Configured' : '✗ Missing'}`);
  console.log(`  ERP_API_SECRET: ${process.env.ERP_API_SECRET ? '✓ Configured' : '✗ Missing'}`);
  console.log(`  ERPNEXT_API_URL: ${process.env.ERPNEXT_API_URL || 'Not set'}\n`);

  if (!process.env.ERP_API_KEY || !process.env.ERP_API_SECRET) {
    console.error('ERROR: API Key credentials not configured in environment!');
    console.error('Please set ERP_API_KEY and ERP_API_SECRET in .env.local');
    process.exit(1);
  }

  console.log('Testing Purchase Module Endpoints\n');

  /**
   * Property 1.1: Purchase Suppliers GET endpoint
   * 
   * EXPECTED ON UNFIXED CODE:
   * - Returns 401 Unauthorized due to inline `if (!sid)` check
   * - Error message: "Unauthorized - No session or API key found"
   * 
   * EXPECTED AFTER FIX:
   * - Returns 200 OK using API Key authentication from environment
   * - Successfully fetches supplier list
   */
  await test('Property 1.1: GET /api/purchase/suppliers with API Key (no session cookie)', async () => {
    const result = await callEndpointWithoutSessionCookie(
      '/api/purchase/suppliers?company=PT%20ABC&limit_page_length=5'
    );

    console.log(`    Response: status=${result.status}, ok=${result.ok}`);

    // Document counterexample if bug exists
    if (result.status === 401) {
      const counterexample = {
        endpoint: '/api/purchase/suppliers',
        method: 'GET',
        status: result.status,
        error: result.data.message || 'Unauthorized',
      };
      counterexamples.push(counterexample);
      
      console.log('    COUNTEREXAMPLE FOUND:');
      console.log(`      Endpoint: ${counterexample.endpoint}`);
      console.log(`      Status: ${counterexample.status}`);
      console.log(`      Error: ${counterexample.error}`);
      console.log('      Root Cause: Inline `if (!sid)` check blocks API Key fallback');
      console.log('      Location: app/api/purchase/suppliers/route.ts');
    }

    // This assertion will FAIL on unfixed code (proving bug exists)
    assert(result.ok, `Expected 200 OK, got ${result.status}: ${result.data.message}`);
    assert(result.status === 200, 'Should authenticate with API Key');
  })();

  /**
   * Property 1.2: Purchase Suppliers POST endpoint
   * 
   * EXPECTED ON UNFIXED CODE:
   * - Returns 401 Unauthorized due to inline `if (!sid)` check
   * 
   * EXPECTED AFTER FIX:
   * - Authenticates with API Key and processes request
   */
  await test('Property 1.2: POST /api/purchase/suppliers with API Key (no session cookie)', async () => {
    const supplierData = {
      supplier_name: 'Test Supplier API Key Auth',
      supplier_type: 'Company',
      supplier_group: 'All Supplier Groups',
    };

    const result = await callEndpointWithoutSessionCookie(
      '/api/purchase/suppliers',
      'POST',
      supplierData
    );

    console.log(`    Response: status=${result.status}, ok=${result.ok}`);

    if (result.status === 401) {
      const counterexample = {
        endpoint: '/api/purchase/suppliers',
        method: 'POST',
        status: result.status,
        error: result.data.message || 'Unauthorized',
      };
      counterexamples.push(counterexample);
      
      console.log('    COUNTEREXAMPLE FOUND:');
      console.log(`      Endpoint: ${counterexample.endpoint} (POST)`);
      console.log(`      Status: ${counterexample.status}`);
      console.log(`      Error: ${counterexample.error}`);
      console.log('      Root Cause: Inline `if (!sid)` check blocks API Key fallback');
    }

    // This assertion will FAIL on unfixed code
    assert(result.ok || result.status === 400, `Expected success or validation error, got ${result.status}`);
  })();

  console.log('\nTesting Finance Module Endpoints\n');

  /**
   * Property 1.3: Finance Journal GET endpoint
   * 
   * EXPECTED ON UNFIXED CODE:
   * - Returns 401 Unauthorized due to inline `if (!sid)` check
   * 
   * EXPECTED AFTER FIX:
   * - Returns 200 OK using API Key authentication
   */
  await test('Property 1.3: GET /api/finance/journal with API Key (no session cookie)', async () => {
    const result = await callEndpointWithoutSessionCookie(
      '/api/finance/journal?company=PT%20ABC&limit_page_length=5'
    );

    console.log(`    Response: status=${result.status}, ok=${result.ok}`);

    if (result.status === 401) {
      const counterexample = {
        endpoint: '/api/finance/journal',
        method: 'GET',
        status: result.status,
        error: result.data.message || 'Unauthorized',
      };
      counterexamples.push(counterexample);
      
      console.log('    COUNTEREXAMPLE FOUND:');
      console.log(`      Endpoint: ${counterexample.endpoint}`);
      console.log(`      Status: ${counterexample.status}`);
      console.log(`      Error: ${counterexample.error}`);
      console.log('      Root Cause: Inline `if (!sid)` check blocks API Key fallback');
      console.log('      Location: app/api/finance/journal/route.ts');
    }

    assert(result.ok, `Expected 200 OK, got ${result.status}: ${result.data.message}`);
  })();

  /**
   * Property 1.4: Finance Journal POST endpoint
   * 
   * EXPECTED ON UNFIXED CODE:
   * - Returns 401 Unauthorized due to inline `if (!sid2)` check
   * 
   * EXPECTED AFTER FIX:
   * - Authenticates with API Key and processes request
   */
  await test('Property 1.4: POST /api/finance/journal with API Key (no session cookie)', async () => {
    const journalData = {
      company: 'PT ABC',
      posting_date: '2024-01-15',
      voucher_type: 'Journal Entry',
      accounts: [
        {
          account: '1110 - Kas - PT ABC',
          debit_in_account_currency: 1000000,
          credit_in_account_currency: 0,
        },
        {
          account: '4110 - Penjualan Barang Dagang - PT ABC',
          debit_in_account_currency: 0,
          credit_in_account_currency: 1000000,
        },
      ],
    };

    const result = await callEndpointWithoutSessionCookie(
      '/api/finance/journal',
      'POST',
      journalData
    );

    console.log(`    Response: status=${result.status}, ok=${result.ok}`);

    if (result.status === 401) {
      const counterexample = {
        endpoint: '/api/finance/journal',
        method: 'POST',
        status: result.status,
        error: result.data.message || 'Unauthorized',
      };
      counterexamples.push(counterexample);
      
      console.log('    COUNTEREXAMPLE FOUND:');
      console.log(`      Endpoint: ${counterexample.endpoint} (POST)`);
      console.log(`      Status: ${counterexample.status}`);
      console.log(`      Error: ${counterexample.error}`);
      console.log('      Root Cause: Inline `if (!sid2)` check blocks API Key fallback');
    }

    assert(result.ok || result.status === 400, `Expected success or validation error, got ${result.status}`);
  })();

  console.log('\nProperty-Based Testing: Multiple Endpoints Across Modules\n');

  /**
   * Property 1.5: Property-based test for multiple endpoints
   * 
   * Tests a sample of endpoints across different modules to confirm
   * the bug pattern is consistent across the codebase.
   */
  await test('Property 1.5: Multiple endpoints should authenticate with API Key', async () => {
    const endpoints = [
      { path: '/api/purchase/suppliers?company=PT%20ABC', method: 'GET', module: 'Purchase' },
      { path: '/api/finance/journal?company=PT%20ABC', method: 'GET', module: 'Finance' },
      { path: '/api/finance/accounts/expense?company=PT%20ABC', method: 'GET', module: 'Finance' },
      { path: '/api/finance/accounts/cash-bank?company=PT%20ABC', method: 'GET', module: 'Finance' },
      { path: '/api/finance/payments?company=PT%20ABC', method: 'GET', module: 'Finance' },
    ];

    console.log('    Testing multiple endpoints without session cookie:');

    let failedCount = 0;
    const failedEndpoints: string[] = [];

    for (const endpoint of endpoints) {
      try {
        const result = await callEndpointWithoutSessionCookie(endpoint.path, endpoint.method);
        
        if (result.status === 401) {
          failedCount++;
          failedEndpoints.push(`${endpoint.module}: ${endpoint.path}`);
          
          counterexamples.push({
            endpoint: endpoint.path,
            method: endpoint.method,
            status: result.status,
            error: result.data.message || 'Unauthorized',
          });
        }

        console.log(`      ${endpoint.module} ${endpoint.method} ${endpoint.path}: ${result.status}`);
      } catch (error) {
        console.log(`      ${endpoint.module} ${endpoint.method} ${endpoint.path}: ERROR`);
        failedCount++;
        failedEndpoints.push(`${endpoint.module}: ${endpoint.path} (error)`);
      }
    }

    if (failedCount > 0) {
      console.log(`\n    COUNTEREXAMPLES FOUND: ${failedCount}/${endpoints.length} endpoints failed`);
      console.log('    Failed endpoints:');
      failedEndpoints.forEach(ep => console.log(`      - ${ep}`));
      console.log('    Root Cause: Inline session cookie checks block API Key fallback');
    }

    // This assertion will FAIL on unfixed code
    assert(failedCount === 0, `${failedCount} endpoints failed to authenticate with API Key`);
  })();

  console.log('\nProperty-Based Testing: Random Query Parameters\n');

  /**
   * Property 1.6: Property-based test with random query parameters
   * 
   * Uses fast-check to generate random valid query parameters and verify
   * that API Key authentication works regardless of query parameters.
   */
  await test('Property 1.6: API Key auth should work with various query parameters', async () => {
    const companyArb = fc.constantFrom('PT ABC', 'PT XYZ', 'Test Company');
    const limitArb = fc.integer({ min: 1, max: 50 });
    const startArb = fc.integer({ min: 0, max: 100 });

    await fc.assert(
      fc.asyncProperty(companyArb, limitArb, startArb, async (company, limit, start) => {
        const encodedCompany = encodeURIComponent(company);
        const endpoint = `/api/purchase/suppliers?company=${encodedCompany}&limit_page_length=${limit}&limit_start=${start}`;
        
        const result = await callEndpointWithoutSessionCookie(endpoint);

        // On unfixed code, this will return 401
        // On fixed code, this should return 200 or 400 (validation error)
        if (result.status === 401) {
          counterexamples.push({
            endpoint,
            method: 'GET',
            status: result.status,
            error: result.data.message || 'Unauthorized',
          });
          
          // Return false to indicate property violation
          return false;
        }

        // Success or validation error is acceptable
        return result.ok || result.status === 400;
      }),
      { numRuns: 10, verbose: true }
    );

    console.log('    Property-based test completed');
  })();

  // Summary
  console.log('\n=== Test Summary ===');
  console.log(`Passed: ${testsPassed}`);
  console.log(`Failed: ${testsFailed}`);
  console.log(`Total: ${testsPassed + testsFailed}`);
  
  if (counterexamples.length > 0) {
    console.log(`\n=== Counterexamples Found: ${counterexamples.length} ===`);
    console.log('\nDetailed Counterexamples:');
    counterexamples.forEach((ce, index) => {
      console.log(`\n${index + 1}. ${ce.method} ${ce.endpoint}`);
      console.log(`   Status: ${ce.status}`);
      console.log(`   Error: ${ce.error}`);
    });
    
    console.log('\n=== Root Cause Analysis ===');
    console.log('Pattern: Inline `if (!sid)` checks in API routes');
    console.log('Effect: Returns 401 immediately when session cookie absent');
    console.log('Impact: Blocks API Key authentication fallback');
    console.log('Location: 50+ endpoints in app/api/ directory');
    console.log('\nCorrect Pattern:');
    console.log('  const client = await getERPNextClientForRequest(request);');
    console.log('  // This implements dual auth: API Key (primary) → session cookie (fallback)');
  }
  
  if (testsFailed > 0) {
    console.log('\n⚠️  EXPECTED OUTCOME: Tests failed on unfixed code.');
    console.log('This confirms the bug exists. Counterexamples have been documented.');
    console.log('After implementing fixes, these tests should pass.');
    console.log('\nNext Steps:');
    console.log('1. Remove inline `if (!sid)` checks from affected endpoints');
    console.log('2. Replace with `getERPNextClientForRequest(request)` calls');
    console.log('3. Verify session cookie authentication still works (fallback)');
    console.log('4. Re-run this test to confirm fix');
  } else {
    console.log('\n✓ All tests passed! The bug has been fixed.');
    console.log('API Key authentication works correctly across all tested endpoints.');
  }
  
  process.exit(testsFailed > 0 ? 1 : 0);
}

runTests().catch(console.error);
