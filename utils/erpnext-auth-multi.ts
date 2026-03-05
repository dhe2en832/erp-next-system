/**
 * Multi-Site Authentication Manager
 * 
 * Enhanced authentication utilities that support per-site credentials.
 * Maintains separate session cookies per site and implements authentication fallback.
 * 
 * Session Cookie Strategy:
 * - Cookie naming: `sid_${siteId}` (e.g., `sid_bac-batasku`, `sid_demo-batasku`)
 * - Separate cookies prevent session leakage between sites
 * - Cookies are scoped to the Next.js application domain
 * 
 * Authentication Priority:
 * 1. API key authentication (from site config)
 * 2. Session-based authentication (site-prefixed cookie)
 */

import { NextRequest } from 'next/server';
import { SiteConfig } from '@/lib/env-config';

export interface AuthHeaders {
  'Content-Type': string;
  'Authorization'?: string;
  'Cookie'?: string;
}

/**
 * Returns auth headers using site configuration (no request needed).
 * Priority: API key > nothing.
 * Use this as a drop-in replacement for inline apiKey/sid auth blocks.
 * 
 * @param siteConfig - Site configuration containing API credentials
 * @returns Authentication headers for the site
 */
export function makeErpHeaders(siteConfig: SiteConfig): AuthHeaders {
  const headers: AuthHeaders = { 'Content-Type': 'application/json' };
  
  if (siteConfig.apiKey && siteConfig.apiSecret) {
    headers['Authorization'] = `token ${siteConfig.apiKey}:${siteConfig.apiSecret}`;
  }
  
  return headers;
}

/**
 * Returns auth headers for ERPNext API calls with site-specific authentication.
 * Priority: API key (admin) > session cookie (sid_${siteId})
 * Using API key ensures all roles can read data regardless of ERPNext permissions.
 * The frontend already enforces role-based access via Navbar filtering.
 * 
 * @param request - Next.js request object containing cookies
 * @param siteConfig - Site configuration containing API credentials
 * @returns Authentication headers for the site
 */
export function getErpAuthHeaders(request: NextRequest, siteConfig: SiteConfig): AuthHeaders {
  const headers: AuthHeaders = { 'Content-Type': 'application/json' };
  
  // Try API key first
  if (siteConfig.apiKey && siteConfig.apiSecret) {
    headers['Authorization'] = `token ${siteConfig.apiKey}:${siteConfig.apiSecret}`;
    return headers;
  }
  
  // Fallback to site-specific session cookie
  const cookieName = `sid_${siteConfig.id}`;
  const sid = request.cookies.get(cookieName)?.value;
  
  if (sid) {
    headers['Cookie'] = `sid=${sid}`;
  }
  
  return headers;
}

/**
 * Returns auth headers given a site config and optional raw sid string.
 * Priority: API key (admin) > sid cookie fallback.
 * Use this in files that already extracted sid separately.
 * 
 * @param siteConfig - Site configuration containing API credentials
 * @param sid - Optional session ID (if already extracted)
 * @returns Authentication headers for the site
 */
export function getErpHeaders(siteConfig: SiteConfig, sid?: string | null): AuthHeaders {
  const headers: AuthHeaders = { 'Content-Type': 'application/json' };
  
  // Try API key first
  if (siteConfig.apiKey && siteConfig.apiSecret) {
    headers['Authorization'] = `token ${siteConfig.apiKey}:${siteConfig.apiSecret}`;
    return headers;
  }
  
  // Fallback to provided session ID
  if (sid) {
    headers['Cookie'] = `sid=${sid}`;
  }
  
  return headers;
}

/**
 * Returns true if the request has a valid session for the specified site.
 * Checks for site-prefixed session cookie (sid_${siteId}).
 * Use this to guard routes that require login.
 * 
 * @param request - Next.js request object containing cookies
 * @param siteId - Site identifier to check authentication for
 * @returns True if authenticated for the site
 */
export function isAuthenticated(request: NextRequest, siteId: string): boolean {
  const cookieName = `sid_${siteId}`;
  return !!request.cookies.get(cookieName)?.value;
}

/**
 * Gets the site-specific session cookie name
 * 
 * @param siteId - Site identifier
 * @returns Cookie name in format `sid_${siteId}`
 */
export function getSessionCookieName(siteId: string): string {
  return `sid_${siteId}`;
}

/**
 * Gets the session cookie value for a specific site from the request
 * 
 * @param request - Next.js request object containing cookies
 * @param siteId - Site identifier
 * @returns Session ID if found, null otherwise
 */
export function getSessionCookie(request: NextRequest, siteId: string): string | null {
  const cookieName = getSessionCookieName(siteId);
  return request.cookies.get(cookieName)?.value || null;
}

/**
 * Gets the session cookie value for a specific site from browser cookies (client-side)
 * 
 * @param siteId - Site identifier
 * @returns Session ID if found, null otherwise
 */
export function getSessionCookieClient(siteId: string): string | null {
  if (typeof document === 'undefined') {
    return null;
  }
  
  const cookieName = getSessionCookieName(siteId);
  const cookies = document.cookie.split(';');
  
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === cookieName) {
      return decodeURIComponent(value);
    }
  }
  
  return null;
}

/**
 * Sets the session cookie for a specific site (client-side)
 * 
 * @param siteId - Site identifier
 * @param sessionId - Session ID to store
 * @param maxAge - Cookie max age in seconds (default: 7 days)
 */
export function setSessionCookie(siteId: string, sessionId: string, maxAge: number = 604800): void {
  if (typeof document === 'undefined') {
    return;
  }
  
  const cookieName = getSessionCookieName(siteId);
  const expires = new Date(Date.now() + maxAge * 1000).toUTCString();
  
  document.cookie = `${cookieName}=${encodeURIComponent(sessionId)}; path=/; expires=${expires}; SameSite=Lax`;
}

/**
 * Clears the session cookie for a specific site (client-side)
 * 
 * @param siteId - Site identifier
 */
export function clearSessionCookie(siteId: string): void {
  if (typeof document === 'undefined') {
    return;
  }
  
  const cookieName = getSessionCookieName(siteId);
  document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

/**
 * Clears all site-specific session cookies (client-side)
 * Useful for logout from all sites
 */
export function clearAllSessionCookies(): void {
  if (typeof document === 'undefined') {
    return;
  }
  
  const cookies = document.cookie.split(';');
  
  for (const cookie of cookies) {
    const [name] = cookie.trim().split('=');
    // Clear all cookies that match the site session pattern
    if (name.startsWith('sid_')) {
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }
  }
}

/**
 * Checks if a site has any authentication method available
 * (either API key or session cookie)
 * 
 * @param siteConfig - Site configuration
 * @param request - Optional Next.js request object to check for session cookie
 * @returns True if site has API key or session cookie available
 */
export function hasAuthentication(siteConfig: SiteConfig, request?: NextRequest): boolean {
  // Check API key authentication
  if (siteConfig.apiKey && siteConfig.apiSecret) {
    return true;
  }
  
  // Check session cookie if request provided
  if (request) {
    const cookieName = getSessionCookieName(siteConfig.id);
    return !!request.cookies.get(cookieName)?.value;
  }
  
  return false;
}

/**
 * Gets the authentication method being used for a site
 * 
 * @param siteConfig - Site configuration
 * @param request - Optional Next.js request object to check for session cookie
 * @returns 'api_key', 'session', or 'none'
 */
export function getAuthenticationMethod(
  siteConfig: SiteConfig,
  request?: NextRequest
): 'api_key' | 'session' | 'none' {
  // API key takes priority
  if (siteConfig.apiKey && siteConfig.apiSecret) {
    return 'api_key';
  }
  
  // Check session cookie
  if (request) {
    const cookieName = getSessionCookieName(siteConfig.id);
    if (request.cookies.get(cookieName)?.value) {
      return 'session';
    }
  }
  
  return 'none';
}

/**
 * Enhanced isAuthenticated that checks both API key and session cookie
 * 
 * @param request - Next.js request object containing cookies
 * @param siteConfig - Site configuration containing API credentials
 * @returns True if authenticated via API key or session cookie
 */
export function isAuthenticatedForSite(request: NextRequest, siteConfig: SiteConfig): boolean {
  // Check API key
  if (siteConfig.apiKey && siteConfig.apiSecret) {
    return true;
  }
  
  // Check session cookie
  const cookieName = getSessionCookieName(siteConfig.id);
  return !!request.cookies.get(cookieName)?.value;
}
