/**
 * Analytics Cache Layer
 * 
 * In-memory cache for dashboard analytics data with 5-minute TTL.
 * Reduces load on ERPNext API and improves response times.
 * 
 * Requirements: 13.2, 13.3
 * 
 * Usage:
 *   const cache = new AnalyticsCache();
 *   
 *   // Try to get from cache
 *   const cached = cache.get('top_products', 'Company A');
 *   if (cached) {
 *     return cached;
 *   }
 *   
 *   // Fetch from API and cache
 *   const data = await fetchFromERPNext();
 *   cache.set('top_products', 'Company A', data);
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // milliseconds
}

export type AnalyticsType = 
  | 'top_products'
  | 'best_customers'
  | 'worst_customers'
  | 'bad_debt_customers'
  | 'top_sales_by_revenue'
  | 'top_sales_by_commission'
  | 'worst_sales_by_commission'
  | 'outstanding_commission'
  | 'paid_commission'
  | 'highest_stock_items'
  | 'lowest_stock_items'
  | 'most_purchased_items'
  | 'top_suppliers_by_frequency'
  | 'paid_suppliers'
  | 'unpaid_suppliers';

/**
 * Analytics Cache Class
 * 
 * Implements in-memory caching with TTL for analytics data.
 * Cache keys follow the format: `analytics:${type}:${company}`
 */
export class AnalyticsCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly defaultTTL = 300000; // 5 minutes in milliseconds

  /**
   * Generate cache key for analytics data
   * 
   * Format: analytics:${siteId}:${type}:${company}
   * 
   * @param type - Analytics type
   * @param company - Company name (optional, defaults to 'all')
   * @param siteId - Site ID (optional, defaults to 'default')
   * @returns Cache key string
   */
  private generateKey(type: AnalyticsType, company?: string | null, siteId?: string | null): string {
    return `analytics:${siteId || 'default'}:${type}:${company || 'all'}`;
  }

  /**
   * Get data from cache
   * 
   * Returns cached data if:
   * - Entry exists for the key
   * - Entry has not expired (timestamp + TTL > now)
   * 
   * Returns null if cache miss or expired.
   * 
   * @param type - Analytics type
   * @param company - Company name (optional)
   * @param siteId - Site ID (optional)
   * @returns Cached data or null
   */
  get<T>(type: AnalyticsType, company?: string | null, siteId?: string | null): T | null {
    const key = this.generateKey(type, company, siteId);
    const entry = this.cache.get(key);
    
    if (!entry) {
      console.log(`[AnalyticsCache] MISS: ${key} - entry not found`);
      return null;
    }
    
    const now = Date.now();
    const age = now - entry.timestamp;
    
    // Check if entry has expired
    if (age > entry.ttl) {
      console.log(`[AnalyticsCache] MISS: ${key} - expired (age: ${age}ms, ttl: ${entry.ttl}ms)`);
      this.cache.delete(key);
      return null;
    }
    
    console.log(`[AnalyticsCache] HIT: ${key} - age: ${age}ms`);
    return entry.data as T;
  }

  /**
   * Set data in cache
   * 
   * Stores data with current timestamp and TTL.
   * 
   * @param type - Analytics type
   * @param company - Company name (optional)
   * @param data - Data to cache
   * @param siteId - Site ID (optional)
   * @param ttl - Time to live in milliseconds (optional, defaults to 5 minutes)
   */
  set<T>(type: AnalyticsType, company: string | null | undefined, data: T, siteId?: string | null, ttl?: number): void {
    const key = this.generateKey(type, company, siteId);
    const effectiveTTL = ttl ?? this.defaultTTL;
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: effectiveTTL,
    });
    
    console.log(`[AnalyticsCache] SET: ${key} - ttl: ${effectiveTTL}ms`);
  }

  /**
   * Invalidate cache for specific analytics type and company
   * 
   * @param type - Analytics type
   * @param company - Company name (optional)
   * @param siteId - Site ID (optional)
   */
  invalidate(type: AnalyticsType, company?: string | null, siteId?: string | null): void {
    const key = this.generateKey(type, company, siteId);
    this.cache.delete(key);
    console.log(`[AnalyticsCache] INVALIDATED: ${key}`);
  }

  /**
   * Clear all analytics cache
   */
  clear(): void {
    this.cache.clear();
    console.log(`[AnalyticsCache] CLEARED ALL`);
  }

  /**
   * Get cache size (number of entries)
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get cache statistics
   * 
   * @returns Object with cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Global analytics cache instance with 5-minute TTL
export const analyticsCache = new AnalyticsCache();
