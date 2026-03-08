/**
 * Simple in-memory cache with TTL (Time To Live)
 * 
 * Usage:
 *   const cache = new SimpleCache<MyType>(60000); // 60 seconds TTL
 *   
 *   const data = await cache.get('key', async () => {
 *     return await fetchDataFromAPI();
 *   });
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export class SimpleCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private ttl: number;

  /**
   * @param ttl Time to live in milliseconds (default: 5 minutes)
   */
  constructor(ttl: number = 5 * 60 * 1000) {
    this.ttl = ttl;
  }

  /**
   * Get data from cache or fetch if not available/expired
   */
  async get(key: string, fetcher: () => Promise<T>): Promise<T> {
    const entry = this.cache.get(key);
    const now = Date.now();

    // Check if cache exists and not expired
    if (entry && (now - entry.timestamp) < this.ttl) {
      console.log(`[Cache] HIT: ${key}`);
      return entry.data;
    }

    // Cache miss or expired - fetch new data
    console.log(`[Cache] MISS: ${key} - fetching...`);
    const data = await fetcher();
    
    this.cache.set(key, {
      data,
      timestamp: now
    });

    return data;
  }

  /**
   * Invalidate cache for specific key
   */
  invalidate(key: string): void {
    this.cache.delete(key);
    console.log(`[Cache] INVALIDATED: ${key}`);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    console.log(`[Cache] CLEARED ALL`);
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }
}

// Global cache instances for different data types
// TTL values based on how frequently data changes

// Tax templates rarely change - cache for 30 minutes
export const taxTemplateCache = new SimpleCache<any>(30 * 60 * 1000);

// Payment terms rarely change - cache for 30 minutes
export const paymentTermsCache = new SimpleCache<any>(30 * 60 * 1000);

// Warehouses rarely change - cache for 30 minutes
export const warehouseCache = new SimpleCache<any>(30 * 60 * 1000);

// Items change occasionally - cache for 5 minutes
export const itemCache = new SimpleCache<any>(5 * 60 * 1000);

// Customers/Suppliers change occasionally - cache for 10 minutes
export const customerCache = new SimpleCache<any>(10 * 60 * 1000);
export const supplierCache = new SimpleCache<any>(10 * 60 * 1000);
