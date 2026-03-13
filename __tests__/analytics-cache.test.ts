/**
 * Unit tests for Analytics Cache Layer
 * 
 * Tests cache functionality including:
 * - Cache key generation
 * - Cache hit/miss logic
 * - TTL expiration
 * - Cache invalidation
 * 
 * Requirements: 13.2, 13.3
 */

import { AnalyticsCache, type AnalyticsType } from '../lib/analytics-cache';

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
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    console.error(`❌ FAILED: ${message}`);
    console.error(`  Expected: ${JSON.stringify(expected)}`);
    console.error(`  Actual: ${JSON.stringify(actual)}`);
    testsFailed++;
    throw new Error(message);
  } else {
    console.log(`✅ PASSED: ${message}`);
    testsPassed++;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test Suite
async function runTests() {
  console.log('\n🧪 Analytics Cache Tests\n');

  let cache: AnalyticsCache;

  // Test 1: Cache Key Generation with type and company
  console.log('\n--- Cache Key Generation Tests ---');
  cache = new AnalyticsCache();
  cache.set('top_products', 'Company A', { test: 'data' });
  const stats1 = cache.getStats();
  assert(stats1.keys.includes('analytics:top_products:Company A'), 'Should generate correct cache key with type and company');
  cache.clear();

  // Test 2: Cache key with null company
  cache = new AnalyticsCache();
  cache.set('top_products', null, { test: 'data' });
  const stats2 = cache.getStats();
  assert(stats2.keys.includes('analytics:top_products:all'), 'Should generate cache key with "all" when company is null');
  cache.clear();

  // Test 3: Cache key with undefined company
  cache = new AnalyticsCache();
  cache.set('top_products', undefined, { test: 'data' });
  const stats3 = cache.getStats();
  assert(stats3.keys.includes('analytics:top_products:all'), 'Should generate cache key with "all" when company is undefined');
  cache.clear();

  // Test 4: Different keys for different types
  cache = new AnalyticsCache();
  cache.set('top_products', 'Company A', { data: 1 });
  cache.set('best_customers', 'Company A', { data: 2 });
  const stats4 = cache.getStats();
  assert(stats4.keys.includes('analytics:top_products:Company A'), 'Should have key for top_products');
  assert(stats4.keys.includes('analytics:best_customers:Company A'), 'Should have key for best_customers');
  assert(stats4.size === 2, 'Should have 2 entries');
  cache.clear();

  // Test 5: Different keys for different companies
  cache = new AnalyticsCache();
  cache.set('top_products', 'Company A', { data: 1 });
  cache.set('top_products', 'Company B', { data: 2 });
  const stats5 = cache.getStats();
  assert(stats5.keys.includes('analytics:top_products:Company A'), 'Should have key for Company A');
  assert(stats5.keys.includes('analytics:top_products:Company B'), 'Should have key for Company B');
  assert(stats5.size === 2, 'Should have 2 entries for different companies');
  cache.clear();

  // Test 6: Cache miss - entry does not exist
  console.log('\n--- Cache Hit/Miss Logic Tests ---');
  cache = new AnalyticsCache();
  const result1 = cache.get('top_products', 'Company A');
  assert(result1 === null, 'Should return null on cache miss');
  cache.clear();

  // Test 7: Cache hit - return cached data
  cache = new AnalyticsCache();
  const testData = { items: ['item1', 'item2'], total: 100 };
  cache.set('top_products', 'Company A', testData);
  const result2 = cache.get('top_products', 'Company A');
  assertEqual(result2, testData, 'Should return cached data on cache hit');
  cache.clear();

  // Test 8: Correct data for different cache keys
  cache = new AnalyticsCache();
  const data1 = { type: 'products' };
  const data2 = { type: 'customers' };
  cache.set('top_products', 'Company A', data1);
  cache.set('best_customers', 'Company A', data2);
  assertEqual(cache.get('top_products', 'Company A'), data1, 'Should return correct data for top_products');
  assertEqual(cache.get('best_customers', 'Company A'), data2, 'Should return correct data for best_customers');
  cache.clear();

  // Test 9: Handle complex data structures
  cache = new AnalyticsCache();
  const complexData = {
    items: [
      { id: 1, name: 'Product A', qty: 100, amount: 5000 },
      { id: 2, name: 'Product B', qty: 50, amount: 2500 },
    ],
    metadata: {
      timestamp: '2024-01-01T00:00:00Z',
      company: 'Test Company',
    },
  };
  cache.set('top_products', 'Company A', complexData);
  const result3 = cache.get('top_products', 'Company A');
  assertEqual(result3, complexData, 'Should handle complex data structures');
  cache.clear();

  // Test 10: TTL expiration
  console.log('\n--- TTL Expiration Tests ---');
  cache = new AnalyticsCache();
  const testData2 = { test: 'data' };
  const shortTTL = 100; // 100ms
  cache.set('top_products', 'Company A', testData2, shortTTL);
  
  // Should hit immediately
  const result4 = cache.get('top_products', 'Company A');
  assertEqual(result4, testData2, 'Should hit immediately after setting');
  
  // Wait for expiration
  await sleep(150);
  
  // Should miss after expiration
  const result5 = cache.get('top_products', 'Company A');
  assert(result5 === null, 'Should miss after TTL expiration');
  cache.clear();

  // Test 11: Default TTL (should not expire immediately)
  cache = new AnalyticsCache();
  cache.set('top_products', 'Company A', { test: 'data' });
  const result6 = cache.get('top_products', 'Company A');
  assert(result6 !== null, 'Should still be cached with default TTL');
  cache.clear();

  // Test 12: Custom TTL values
  cache = new AnalyticsCache();
  const customTTL = 50; // 50ms
  cache.set('top_products', 'Company A', { test: 'data' }, customTTL);
  
  // Should hit immediately
  const result7 = cache.get('top_products', 'Company A');
  assert(result7 !== null, 'Should hit immediately with custom TTL');
  
  // Wait for expiration
  await sleep(100);
  
  // Should miss after expiration
  const result8 = cache.get('top_products', 'Company A');
  assert(result8 === null, 'Should miss after custom TTL expiration');
  cache.clear();

  // Test 13: Remove expired entry from cache on access
  cache = new AnalyticsCache();
  const shortTTL2 = 50;
  cache.set('top_products', 'Company A', { test: 'data' }, shortTTL2);
  assert(cache.size() === 1, 'Should have 1 entry before expiration');
  
  // Wait for expiration
  await sleep(100);
  
  // Access expired entry
  cache.get('top_products', 'Company A');
  
  // Should be removed from cache
  assert(cache.size() === 0, 'Should remove expired entry from cache');
  cache.clear();

  // Test 14: Cache invalidation
  console.log('\n--- Cache Invalidation Tests ---');
  cache = new AnalyticsCache();
  cache.set('top_products', 'Company A', { data: 1 });
  cache.set('best_customers', 'Company A', { data: 2 });
  assert(cache.size() === 2, 'Should have 2 entries before invalidation');
  
  cache.invalidate('top_products', 'Company A');
  
  assert(cache.size() === 1, 'Should have 1 entry after invalidation');
  assert(cache.get('top_products', 'Company A') === null, 'Should not find invalidated entry');
  assert(cache.get('best_customers', 'Company A') !== null, 'Should still find other entry');
  cache.clear();

  // Test 15: Invalidate only matching company
  cache = new AnalyticsCache();
  cache.set('top_products', 'Company A', { data: 1 });
  cache.set('top_products', 'Company B', { data: 2 });
  
  cache.invalidate('top_products', 'Company A');
  
  assert(cache.get('top_products', 'Company A') === null, 'Should not find Company A entry');
  assert(cache.get('top_products', 'Company B') !== null, 'Should still find Company B entry');
  cache.clear();

  // Test 16: Clear all cache entries
  cache = new AnalyticsCache();
  cache.set('top_products', 'Company A', { data: 1 });
  cache.set('best_customers', 'Company B', { data: 2 });
  cache.set('worst_customers', 'Company C', { data: 3 });
  assert(cache.size() === 3, 'Should have 3 entries before clear');
  
  cache.clear();
  
  assert(cache.size() === 0, 'Should have 0 entries after clear');
  assert(cache.get('top_products', 'Company A') === null, 'Should not find any entries after clear');
  cache.clear();

  // Test 17: Cache statistics
  console.log('\n--- Cache Statistics Tests ---');
  cache = new AnalyticsCache();
  assert(cache.size() === 0, 'Should have size 0 initially');
  
  cache.set('top_products', 'Company A', { data: 1 });
  assert(cache.size() === 1, 'Should have size 1 after adding entry');
  
  cache.set('best_customers', 'Company A', { data: 2 });
  assert(cache.size() === 2, 'Should have size 2 after adding second entry');
  cache.clear();

  // Test 18: Get cache statistics
  cache = new AnalyticsCache();
  cache.set('top_products', 'Company A', { data: 1 });
  cache.set('best_customers', 'Company B', { data: 2 });
  
  const stats = cache.getStats();
  assert(stats.size === 2, 'Stats should show size 2');
  assert(stats.keys.length === 2, 'Stats should show 2 keys');
  assert(stats.keys.includes('analytics:top_products:Company A'), 'Stats should include first key');
  assert(stats.keys.includes('analytics:best_customers:Company B'), 'Stats should include second key');
  cache.clear();

  // Test 19: All analytics types
  console.log('\n--- All Analytics Types Test ---');
  const analyticsTypes: AnalyticsType[] = [
    'top_products',
    'best_customers',
    'worst_customers',
    'bad_debt_customers',
    'top_sales_by_revenue',
    'top_sales_by_commission',
    'worst_sales_by_commission',
    'outstanding_commission',
    'paid_commission',
    'highest_stock_items',
    'lowest_stock_items',
    'most_purchased_items',
    'top_suppliers_by_frequency',
    'paid_suppliers',
    'unpaid_suppliers',
  ];

  cache = new AnalyticsCache();
  analyticsTypes.forEach((type, index) => {
    const testData = { type, index };
    cache.set(type, 'Company A', testData);
    
    const result = cache.get(type, 'Company A');
    assertEqual(result, testData, `Should support analytics type: ${type}`);
  });
  
  assert(cache.size() === analyticsTypes.length, `Should have ${analyticsTypes.length} entries for all analytics types`);
  cache.clear();

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`✅ Tests Passed: ${testsPassed}`);
  console.log(`❌ Tests Failed: ${testsFailed}`);
  console.log('='.repeat(50) + '\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
