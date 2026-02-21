/**
 * CSRF Protection Utilities for Accounting Period Closing
 * 
 * This module provides CSRF protection utilities for the accounting period closing feature.
 * 
 * IMPORTANT: The current implementation uses API Key authentication (Basic Auth) which is
 * immune to CSRF attacks by design. CSRF tokens are only required for session-based authentication.
 * 
 * See lib/CSRF_PROTECTION.md for detailed documentation.
 */

const ERPNEXT_API_URL = process.env.ERPNEXT_URL || process.env.ERPNEXT_API_URL || 'http://localhost:8000';

/**
 * Authentication method used for ERPNext API calls
 */
export type AuthMethod = 'api_key' | 'session';

/**
 * Get CSRF token from ERPNext for session-based authentication
 * 
 * NOTE: This is only needed if session-based authentication is used.
 * The current implementation uses API Key authentication which doesn't require CSRF tokens.
 * 
 * @param sid - Session ID from ERPNext session cookie
 * @returns CSRF token or null if failed
 */
export async function getCSRFToken(sid: string): Promise<string | null> {
  try {
    console.log('Fetching CSRF token from ERPNext...');
    
    const response = await fetch(
      `${ERPNEXT_API_URL}/api/method/frappe.auth.get_csrf_token`,
      {
        method: 'GET',
        headers: {
          'Cookie': `sid=${sid}`,
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      const token = data.message?.csrf_token || null;
      
      if (token) {
        console.log('CSRF token obtained successfully');
      } else {
        console.warn('CSRF token not found in response');
      }
      
      return token;
    } else {
      console.error('Failed to get CSRF token:', response.status, response.statusText);
      return null;
    }
  } catch (error) {
    console.error('Error getting CSRF token:', error);
    return null;
  }
}

/**
 * Validate that CSRF protection is properly configured
 * 
 * This function checks that the authentication method is properly configured
 * and CSRF protection is in place where needed.
 * 
 * @returns Validation result with details
 */
export function validateCSRFProtection(): {
  protected: boolean;
  method: AuthMethod;
  message: string;
} {
  const apiKey = process.env.ERP_API_KEY;
  const apiSecret = process.env.ERP_API_SECRET;

  if (apiKey && apiSecret) {
    return {
      protected: true,
      method: 'api_key',
      message: 'Using API Key authentication - CSRF protection not required (immune by design)',
    };
  }

  return {
    protected: false,
    method: 'session',
    message: 'WARNING: API Key authentication not configured. If using session-based auth, ensure CSRF tokens are included in all state-changing requests.',
  };
}

/**
 * Add CSRF token to request headers if needed
 * 
 * This function adds the CSRF token to request headers for session-based authentication.
 * For API Key authentication, it does nothing (CSRF not required).
 * 
 * @param headers - Existing request headers
 * @param sessionId - Optional session ID for session-based auth
 * @returns Updated headers with CSRF token if applicable
 */
export async function addCSRFTokenIfNeeded(
  headers: Record<string, string>,
  sessionId?: string
): Promise<Record<string, string>> {
  // Check if using API Key authentication
  const validation = validateCSRFProtection();
  
  if (validation.method === 'api_key') {
    // API Key auth - no CSRF token needed
    return headers;
  }

  // Session-based auth - add CSRF token
  if (sessionId) {
    const csrfToken = await getCSRFToken(sessionId);
    if (csrfToken) {
      return {
        ...headers,
        'X-Frappe-CSRF-Token': csrfToken,
      };
    } else {
      console.warn('Failed to obtain CSRF token for session-based request');
    }
  }

  return headers;
}

/**
 * Verify that a request is protected against CSRF
 * 
 * This function verifies that a request has proper CSRF protection based on the authentication method.
 * 
 * @param headers - Request headers
 * @returns True if protected, false otherwise
 */
export function isRequestProtected(headers: Record<string, string>): boolean {
  // Check for API Key authentication (Basic Auth)
  if (headers['Authorization']?.startsWith('Basic ')) {
    return true; // API Key auth is immune to CSRF
  }

  // Check for CSRF token in session-based auth
  if (headers['X-Frappe-CSRF-Token']) {
    return true; // CSRF token present
  }

  // Check if this is a read-only request (GET, HEAD, OPTIONS)
  // These don't need CSRF protection
  const method = headers['X-HTTP-Method-Override'] || 'GET';
  if (['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) {
    return true;
  }

  return false;
}

/**
 * Log CSRF protection status for debugging
 * 
 * This function logs the current CSRF protection configuration for debugging purposes.
 */
export function logCSRFProtectionStatus(): void {
  const validation = validateCSRFProtection();
  
  console.log('=== CSRF Protection Status ===');
  console.log(`Protected: ${validation.protected}`);
  console.log(`Method: ${validation.method}`);
  console.log(`Message: ${validation.message}`);
  console.log('==============================');
}

/**
 * Middleware to validate CSRF protection on state-changing requests
 * 
 * This can be used in API routes to ensure CSRF protection is in place.
 * 
 * @param request - Next.js request object
 * @returns True if protected, throws error otherwise
 */
export function validateRequestCSRFProtection(request: Request): boolean {
  const method = request.method.toUpperCase();
  
  // Read-only methods don't need CSRF protection
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return true;
  }

  // Check authentication method
  const validation = validateCSRFProtection();
  
  if (validation.method === 'api_key') {
    // API Key auth - always protected
    return true;
  }

  // Session-based auth - check for CSRF token
  const csrfToken = request.headers.get('X-Frappe-CSRF-Token');
  
  if (!csrfToken) {
    throw new Error(
      'CSRF token required for state-changing requests with session-based authentication. ' +
      'Include X-Frappe-CSRF-Token header.'
    );
  }

  return true;
}

/**
 * Get authentication method being used
 * 
 * @returns Current authentication method
 */
export function getAuthMethod(): AuthMethod {
  return validateCSRFProtection().method;
}

/**
 * Check if CSRF token is required for the current configuration
 * 
 * @returns True if CSRF token is required, false otherwise
 */
export function isCSRFTokenRequired(): boolean {
  return getAuthMethod() === 'session';
}

// Export validation result for use in other modules
export const csrfProtectionStatus = validateCSRFProtection();

// Log status on module load (only in development)
if (process.env.NODE_ENV === 'development') {
  logCSRFProtectionStatus();
}
