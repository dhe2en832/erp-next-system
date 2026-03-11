/**
 * API Route Helpers for Multi-Site Support
 * 
 * Provides utilities for extracting site context from requests and
 * creating site-aware ERPNext clients in API routes.
 * 
 * Key Features:
 * - Extract site ID from request headers or cookies
 * - Get ERPNext client for request with backward compatibility
 * - Site-specific error handling
 */

import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { getERPNextClientForSite, ERPNextMultiClient } from './erpnext-multi';
import { erpnextClient } from './erpnext';
import type { SiteConfig } from './env-config';

/**
 * Extract site ID from request
 * 
 * Checks in order:
 * 1. X-Site-ID header
 * 2. active_site cookie
 * 3. Returns null if not found
 * 
 * @param request - Next.js request object
 * @returns Site ID or null
 */
export async function getSiteIdFromRequest(request: NextRequest): Promise<string | null> {
  // Check X-Site-ID header first
  const headerSiteId = request.headers.get('X-Site-ID');
  if (headerSiteId) {
    return headerSiteId;
  }

  // Check active_site cookie
  const cookieStore = await cookies();
  const cookieSiteId = cookieStore.get('active_site')?.value;
  if (cookieSiteId) {
    return cookieSiteId;
  }

  return null;
}

/**
 * Get ERPNext client for request with multi-site support
 * 
 * This function provides backward compatibility:
 * - If site ID is found in request, uses site-specific client
 * - If no site ID but sites are configured, uses default site
 * - If no sites configured, falls back to legacy single-site client
 * 
 * @param request - Next.js request object
 * @returns ERPNext client (multi-site or legacy)
 * @throws Error if site ID is specified but site not found
 */
export async function getERPNextClientForRequest(
  request: NextRequest
): Promise<ERPNextMultiClient | typeof erpnextClient> {
  const siteId = await getSiteIdFromRequest(request);

  // If site ID specified, construct site config from environment
  if (siteId) {
    // Construct site config from site ID
    // Format: bac-batasku-cloud -> https://bac.batasku.cloud
    const siteName = siteId.replace(/-/g, '.');
    const apiUrl = `https://${siteName}`;
    
    // Load credentials from environment
    const { loadSiteCredentials } = await import('./site-credentials');
    
    const tempSite: SiteConfig = {
      id: siteId,
      name: siteName,
      displayName: siteName.split('.')[0].toUpperCase(),
      apiUrl: apiUrl,
      apiKey: 'env',
      apiSecret: 'env',
    };
    
    const credentials = loadSiteCredentials(tempSite);
    
    // If credentials found in environment, use them
    if (credentials.apiKey !== 'env' && credentials.apiSecret !== 'env') {
      const siteConfig: SiteConfig = {
        ...tempSite,
        apiKey: credentials.apiKey,
        apiSecret: credentials.apiSecret,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      return getERPNextClientForSite(siteConfig);
    } else {
      throw new Error(`Site not found and no environment credentials: ${siteId}`);
    }
  }

  // No site ID - fall back to legacy single-site client
  return erpnextClient;
}

/**
 * Site-aware error response builder
 * 
 * Creates error responses with site context for better debugging
 * 
 * @param error - Error object
 * @param siteId - Optional site ID for context
 * @returns Error response object
 */
export function buildSiteAwareErrorResponse(
  error: unknown,
  siteId?: string | null
): {
  success: false;
  error: string;
  message: string;
  site?: string;
  errorType: 'network' | 'authentication' | 'configuration' | 'unknown';
} {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  
  // Classify error type
  let errorType: 'network' | 'authentication' | 'configuration' | 'unknown' = 'unknown';
  
  if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('ECONNREFUSED')) {
    errorType = 'network';
  } else if (errorMessage.includes('401') || errorMessage.includes('authentication') || errorMessage.includes('credentials')) {
    errorType = 'authentication';
  } else if (errorMessage.includes('Site not found') || errorMessage.includes('configuration') || errorMessage.includes('API URL')) {
    errorType = 'configuration';
  }

  const response: {
    success: false;
    error: string;
    message: string;
    site?: string;
    errorType: 'network' | 'authentication' | 'configuration' | 'unknown';
  } = {
    success: false,
    error: errorType.toUpperCase(),
    message: errorMessage,
    errorType,
  };

  if (siteId) {
    response.site = siteId;
    response.message = `[Site: ${siteId}] ${errorMessage}`;
  }

  return response;
}

/**
 * Log site-specific error
 * 
 * Logs errors with site context for better troubleshooting
 * 
 * @param error - Error object
 * @param context - Additional context (operation, endpoint, etc.)
 * @param siteId - Optional site ID
 */
export function logSiteError(
  error: unknown,
  context: string,
  siteId?: string | null
): void {
  const timestamp = new Date().toISOString();
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  const errorStack = error instanceof Error ? error.stack : undefined;

  const logEntry = {
    timestamp,
    context,
    siteId: siteId || 'none',
    error: errorMessage,
    stack: errorStack,
  };

  console.error('[Site Error]', JSON.stringify(logEntry, null, 2));
}
