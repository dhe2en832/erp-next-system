/**
 * Multi-Site API Router Layer
 * 
 * Enhanced ERPNext client that routes requests based on active site context.
 * Extends the existing ERPNextClient with site-aware configuration.
 * 
 * Key Features:
 * - Site-specific API URL routing
 * - Site-specific authentication headers
 * - Backward compatible with single-site usage
 * - React hook for component usage
 */

'use client';

import { useMemo } from 'react';
import { ERPNextClient } from './erpnext';
import { SiteConfig } from './site-config';
import { makeErpHeaders } from '@/utils/erpnext-auth-multi';
import { useSite } from './site-context';

/**
 * ERPNextMultiClient
 * 
 * Extended ERPNext client that supports multi-site configurations.
 * Routes all API requests to the correct site URL with proper authentication.
 */
export class ERPNextMultiClient extends ERPNextClient {
  private siteConfig: SiteConfig;

  /**
   * Creates a new multi-site ERPNext client
   * 
   * @param siteConfig - Site configuration containing URL and credentials
   */
  constructor(siteConfig: SiteConfig) {
    // Pass the site's API URL to the parent ERPNextClient
    super(siteConfig.apiUrl);
    this.siteConfig = siteConfig;
  }

  /**
   * Override getHeaders to use site-specific authentication
   * 
   * @returns Authentication headers for the configured site
   */
  protected getHeaders(): Record<string, string> {
    const headers = makeErpHeaders(this.siteConfig);
    // Convert AuthHeaders to Record<string, string> by filtering out undefined values
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

  /**
   * Get the current site configuration
   * 
   * @returns The site configuration for this client
   */
  getSiteConfig(): SiteConfig {
    return this.siteConfig;
  }
}

/**
 * Factory function to create an ERPNextMultiClient for a specific site
 * 
 * @param siteConfig - Site configuration containing URL and credentials
 * @returns Configured ERPNextMultiClient instance
 * @throws Error if siteConfig is invalid or missing required fields
 */
export function getERPNextClientForSite(siteConfig: SiteConfig): ERPNextMultiClient {
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
 * React hook to get an ERPNext client for the currently active site
 * 
 * This hook uses the site context to automatically create a client
 * configured for the active site. It will throw an error if no site
 * is currently selected.
 * 
 * @returns ERPNextMultiClient configured for the active site
 * @throws Error if no site is currently active
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const client = useERPNextClient();
 *   
 *   useEffect(() => {
 *     async function fetchData() {
 *       const items = await client.getList('Item');
 *       setItems(items);
 *     }
 *     fetchData();
 *   }, [client]);
 *   
 *   return <div>...</div>;
 * }
 * ```
 */
export function useERPNextClient(): ERPNextMultiClient {
  const { activeSite } = useSite();

  // Create client instance, memoized by site to avoid recreating on every render
  const client = useMemo(() => {
    if (!activeSite) {
      throw new Error(
        'No active site selected. Please select a site before making API requests.'
      );
    }

    return new ERPNextMultiClient(activeSite);
  }, [activeSite]); // Recreate when site changes

  return client;
}
