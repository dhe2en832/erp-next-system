import { NextRequest } from 'next/server';

/**
 * Dual Authentication Strategy
 * 
 * This system implements dual authentication with priority order:
 * 1. API Key (primary) - For admin/server operations with full access
 * 2. Session Cookie (fallback) - For user-specific operations and audit trails
 * 
 * RECOMMENDED: Use `getERPNextClientForRequest()` from `lib/api-helpers.ts`
 * instead of these utility functions. It provides:
 * - Multi-site support
 * - Automatic dual authentication handling
 * - Better error handling and logging
 * - Site-aware client management
 */

/**
 * Returns auth headers using only env vars (no request needed).
 * Priority: API key > nothing.
 * 
 * Use this as a utility for direct API calls when you need to construct
 * headers manually and don't have a request object.
 * 
 * For API routes, prefer `getERPNextClientForRequest()` from `lib/api-helpers.ts`
 * which provides multi-site support and better error handling.
 */
export function makeErpHeaders(): Record<string, string> {
  const apiKey = process.env.ERP_API_KEY;
  const apiSecret = process.env.ERP_API_SECRET;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey && apiSecret) {
    headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
  }
  return headers;
}

/**
 * Returns auth headers for ERPNext API calls.
 * Priority: API key (admin) > session cookie (sid)
 * 
 * @deprecated Use `getERPNextClientForRequest()` from `lib/api-helpers.ts` instead.
 * 
 * Migration path:
 * ```typescript
 * // OLD:
 * const headers = getErpAuthHeaders(request);
 * const response = await fetch(`${apiUrl}/api/resource/DocType`, { headers });
 * 
 * // NEW:
 * const client = await getERPNextClientForRequest(request);
 * const data = await client.getDoc('DocType', docName);
 * ```
 * 
 * Why migrate:
 * - Multi-site support with automatic site routing
 * - Better error handling with site context
 * - Centralized authentication logic
 * - Automatic dual authentication (API Key → session cookie fallback)
 * 
 * CRITICAL: Session cookie authentication is preserved as fallback method.
 * This function correctly implements dual authentication.
 */
export function getErpAuthHeaders(request: NextRequest): Record<string, string> {
  const apiKey = process.env.ERP_API_KEY;
  const apiSecret = process.env.ERP_API_SECRET;
  const sid = request.cookies.get('sid')?.value;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (apiKey && apiSecret) {
    headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
  } else if (sid) {
    headers['Cookie'] = `sid=${sid}`;
  }

  return headers;
}

/**
 * Returns auth headers given a raw sid string.
 * Priority: API key (admin) > sid cookie fallback.
 * 
 * @deprecated Use `getERPNextClientForRequest()` from `lib/api-helpers.ts` instead.
 * 
 * Migration path:
 * ```typescript
 * // OLD:
 * const sid = request.cookies.get('sid')?.value;
 * const headers = getErpHeaders(sid);
 * const response = await fetch(`${apiUrl}/api/resource/DocType`, { headers });
 * 
 * // NEW:
 * const client = await getERPNextClientForRequest(request);
 * const data = await client.getDoc('DocType', docName);
 * ```
 * 
 * Why migrate:
 * - Multi-site support with automatic site routing
 * - Better error handling with site context
 * - No need to manually extract sid from request
 * - Automatic dual authentication (API Key → session cookie fallback)
 * 
 * CRITICAL: Session cookie authentication is preserved as fallback method.
 * This function correctly implements dual authentication.
 */
export function getErpHeaders(sid?: string | null): Record<string, string> {
  const apiKey = process.env.ERP_API_KEY;
  const apiSecret = process.env.ERP_API_SECRET;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (apiKey && apiSecret) {
    headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
  } else if (sid) {
    headers['Cookie'] = `sid=${sid}`;
  }

  return headers;
}

/**
 * Returns true if the request has a valid session (sid cookie present).
 * 
 * @deprecated This function ONLY checks session cookies and does NOT check API Key authentication.
 * 
 * CRITICAL LIMITATION: This function returns false even when valid API Key credentials
 * are configured in environment variables. This causes endpoints to reject API Key
 * authenticated requests with 401 Unauthorized.
 * 
 * Migration path:
 * ```typescript
 * // OLD (blocks API Key authentication):
 * if (!isAuthenticated(request)) {
 *   return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
 * }
 * 
 * // NEW (supports dual authentication):
 * const client = await getERPNextClientForRequest(request);
 * // Client creation will throw if neither API Key nor session cookie is valid
 * // Use try-catch to handle authentication errors
 * ```
 * 
 * Why migrate:
 * - Supports both API Key and session cookie authentication
 * - Doesn't block API Key authenticated requests
 * - Better error handling with specific authentication error messages
 * - Multi-site support
 * 
 * IMPORTANT: Session cookie authentication is still supported and works correctly.
 * The issue is that this function doesn't check for API Key authentication,
 * causing false negatives when API Key is the authentication method.
 */
export function isAuthenticated(request: NextRequest): boolean {
  return !!request.cookies.get('sid')?.value;
}
