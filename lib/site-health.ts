/**
 * Site Health Monitor
 * 
 * Background service that monitors site availability and health status.
 * Provides periodic health checks, status caching, and subscription notifications.
 */

import { SiteConfig } from './env-config';

// Health check result interface
export interface HealthCheckResult {
  siteId: string;
  isOnline: boolean;
  responseTime: number;
  error?: string;
  timestamp: Date;
}

// Internal health status with failure tracking
interface HealthStatus extends HealthCheckResult {
  consecutiveFailures: number;
  history: HealthCheckResult[];
}

// localStorage key for health status persistence
const HEALTH_STORAGE_KEY = 'erpnext-site-health';
const MAX_HISTORY_LENGTH = 10;
const MAX_CONSECUTIVE_FAILURES = 3;
const DEFAULT_CHECK_INTERVAL = 60000; // 60 seconds

/**
 * Site Health Monitor class
 * Manages health checks, background monitoring, and status subscriptions
 */
export class SiteHealthMonitor {
  private statusMap: Map<string, HealthStatus> = new Map();
  private intervalId: NodeJS.Timeout | null = null;
  private subscribers: Set<(results: HealthCheckResult[]) => void> = new Set();
  private sites: SiteConfig[] = [];

  constructor(sites: SiteConfig[] = []) {
    this.sites = sites;
    this.loadFromStorage();
  }

  /**
   * Updates the list of sites to monitor
   */
  setSites(sites: SiteConfig[]): void {
    this.sites = sites;
  }

  /**
   * Performs a health check on a single site
   * Uses /api/method/ping endpoint (no authentication required)
   */
  async checkSite(siteConfig: SiteConfig): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Use ERPNext ping endpoint for lightweight check (no auth needed)
      const url = `${siteConfig.apiUrl}/api/method/ping`;
      
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        return {
          siteId: siteConfig.id,
          isOnline: true,
          responseTime,
          timestamp: new Date(),
        };
      } else {
        return {
          siteId: siteConfig.id,
          isOnline: false,
          responseTime,
          error: `HTTP ${response.status}: ${response.statusText}`,
          timestamp: new Date(),
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        siteId: siteConfig.id,
        isOnline: false,
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Performs health checks on all configured sites via backend API (no CORS)
   */
  async checkAllSites(): Promise<HealthCheckResult[]> {
    // If running in browser, use backend API to avoid CORS
    if (typeof window !== 'undefined') {
      try {
        const response = await fetch('/api/sites/health', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sites: this.sites.map(site => ({
              id: site.id,
              apiUrl: site.apiUrl,
            })),
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const results = data.results.map((r: HealthCheckResult & { timestamp: string }) => ({
            ...r,
            timestamp: new Date(r.timestamp),
          }));

          // Update internal status map
          results.forEach((result: HealthCheckResult) => this.updateStatus(result));

          // Persist to storage
          this.saveToStorage();

          // Notify subscribers
          this.notifySubscribers(results);

          return results;
        }
      } catch (error) {
        console.error('[Health Monitor] Failed to check sites via API:', error);
      }
    }

    // Fallback: direct check (for server-side or if API fails)
    const results = await Promise.all(
      this.sites.map(site => this.checkSite(site))
    );
    
    // Update internal status map
    results.forEach(result => this.updateStatus(result));
    
    // Persist to storage
    this.saveToStorage();
    
    // Notify subscribers
    this.notifySubscribers(results);
    
    return results;
  }

  /**
   * Updates internal status with failure tracking
   */
  private updateStatus(result: HealthCheckResult): void {
    const existing = this.statusMap.get(result.siteId);
    
    // Calculate consecutive failures
    let consecutiveFailures = 0;
    if (!result.isOnline) {
      consecutiveFailures = existing ? existing.consecutiveFailures + 1 : 1;
    }
    
    // Determine if site should be marked offline (3+ consecutive failures)
    const isOnline = result.isOnline || consecutiveFailures < MAX_CONSECUTIVE_FAILURES;
    
    // Update history
    const history = existing?.history || [];
    history.push(result);
    
    // Keep only last 10 results
    if (history.length > MAX_HISTORY_LENGTH) {
      history.shift();
    }
    
    // Update status map
    this.statusMap.set(result.siteId, {
      ...result,
      isOnline,
      consecutiveFailures,
      history,
    });
  }

  /**
   * Starts background monitoring with specified interval
   */
  startMonitoring(intervalMs: number = DEFAULT_CHECK_INTERVAL): void {
    // Stop existing monitoring if any
    this.stopMonitoring();
    
    // Perform initial check
    this.checkAllSites();
    
    // Start periodic checks
    this.intervalId = setInterval(() => {
      this.checkAllSites();
    }, intervalMs);
  }

  /**
   * Stops background monitoring
   */
  stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Gets the current health status for a specific site
   */
  getStatus(siteId: string): HealthCheckResult | undefined {
    const status = this.statusMap.get(siteId);
    if (!status) {
      return undefined;
    }
    
    return {
      siteId: status.siteId,
      isOnline: status.isOnline,
      responseTime: status.responseTime,
      error: status.error,
      timestamp: status.timestamp,
    };
  }

  /**
   * Gets all current health statuses
   */
  getAllStatuses(): HealthCheckResult[] {
    return Array.from(this.statusMap.values()).map(status => ({
      siteId: status.siteId,
      isOnline: status.isOnline,
      responseTime: status.responseTime,
      error: status.error,
      timestamp: status.timestamp,
    }));
  }

  /**
   * Subscribes to health status updates
   * Returns an unsubscribe function
   */
  subscribe(callback: (results: HealthCheckResult[]) => void): () => void {
    this.subscribers.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Notifies all subscribers of status updates
   */
  private notifySubscribers(results: HealthCheckResult[]): void {
    this.subscribers.forEach(callback => {
      try {
        callback(results);
      } catch (error) {
        console.error('Error in health monitor subscriber:', error);
      }
    });
  }

  /**
   * Loads health status from localStorage
   */
  private loadFromStorage(): void {
    if (typeof window === 'undefined') {
      return;
    }
    
    try {
      const stored = localStorage.getItem(HEALTH_STORAGE_KEY);
      if (!stored) {
        return;
      }
      
      const data = JSON.parse(stored) as Record<string, {
        siteId: string;
        isOnline: boolean;
        responseTime: number;
        error?: string;
        timestamp: string;
        consecutiveFailures: number;
        history: Array<{
          siteId: string;
          isOnline: boolean;
          responseTime: number;
          error?: string;
          timestamp: string;
        }>;
      }>;
      
      // Restore status map
      Object.entries(data).forEach(([siteId, status]) => {
        this.statusMap.set(siteId, {
          ...status,
          timestamp: new Date(status.timestamp),
          history: status.history?.map((h) => ({
            ...h,
            timestamp: new Date(h.timestamp),
          })) || [],
        });
      });
    } catch (error) {
      console.error('Failed to load health status from storage:', error);
    }
  }

  /**
   * Saves health status to localStorage
   */
  private saveToStorage(): void {
    if (typeof window === 'undefined') {
      return;
    }
    
    try {
      const data: Record<string, {
        siteId: string;
        isOnline: boolean;
        responseTime: number;
        error?: string;
        timestamp: string;
        consecutiveFailures: number;
        history: Array<{
          siteId: string;
          isOnline: boolean;
          responseTime: number;
          error?: string;
          timestamp: string;
        }>;
      }> = {};
      
      this.statusMap.forEach((status, siteId) => {
        data[siteId] = {
          siteId: status.siteId,
          isOnline: status.isOnline,
          responseTime: status.responseTime,
          error: status.error,
          timestamp: status.timestamp.toISOString(),
          consecutiveFailures: status.consecutiveFailures,
          history: status.history.map(h => ({
            siteId: h.siteId,
            isOnline: h.isOnline,
            responseTime: h.responseTime,
            error: h.error,
            timestamp: h.timestamp.toISOString(),
          })),
        };
      });
      
      localStorage.setItem(HEALTH_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save health status to storage:', error);
    }
  }

  /**
   * Clears all health status data (for testing)
   */
  clear(): void {
    this.statusMap.clear();
    if (typeof window !== 'undefined') {
      localStorage.removeItem(HEALTH_STORAGE_KEY);
    }
  }
}

// Singleton instance for global use
let globalMonitor: SiteHealthMonitor | null = null;

/**
 * Gets or creates the global health monitor instance
 */
export function getHealthMonitor(): SiteHealthMonitor {
  if (!globalMonitor) {
    globalMonitor = new SiteHealthMonitor();
  }
  return globalMonitor;
}

/**
 * Initializes the global health monitor with sites
 */
export function initializeHealthMonitor(sites: SiteConfig[]): SiteHealthMonitor {
  const monitor = getHealthMonitor();
  monitor.setSites(sites);
  return monitor;
}
