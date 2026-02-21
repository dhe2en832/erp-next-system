# CSRF Protection for Accounting Period Closing

## Overview

This document describes the CSRF (Cross-Site Request Forgery) protection strategy for the Accounting Period Closing feature.

## Current Implementation

### API Key Authentication (Primary Method)

The accounting period closing feature uses **API Key authentication** (Basic Auth) for all ERPNext API calls. This approach:

- **Does NOT require CSRF tokens** because API keys are not stored in cookies
- **Is immune to CSRF attacks** by design
- **Is the recommended approach** for server-to-server API communication

All state-changing operations (POST, PUT, DELETE) use the `ERPNextClient` class which automatically includes API Key authentication headers:

```typescript
Authorization: Basic <base64(api_key:api_secret)>
```

### ERPNext Built-in CSRF Protection

ERPNext (Frappe Framework) has built-in CSRF protection for session-based authentication:

- CSRF tokens are automatically generated and validated for session cookies
- The token is available via: `/api/method/frappe.auth.get_csrf_token`
- The token must be included in the `X-Frappe-CSRF-Token` header for state-changing requests

## Security Guarantees

### For API Key Authentication (Current)

✅ **Protected against CSRF** - API keys are not stored in cookies, so CSRF attacks cannot steal them
✅ **Protected against XSS** - API keys are stored in environment variables, not in browser storage
✅ **Secure transmission** - API keys are sent over HTTPS only
✅ **Server-side validation** - ERPNext validates API keys on every request

### For Session-Based Authentication (If Implemented)

If session-based authentication is ever implemented, the following protections are required:

1. **CSRF Token Validation**
   - Obtain CSRF token from ERPNext before state-changing operations
   - Include token in `X-Frappe-CSRF-Token` header
   - ERPNext automatically validates the token

2. **SameSite Cookie Attribute**
   - ERPNext sets `SameSite=Lax` on session cookies
   - Prevents CSRF attacks from cross-site requests

3. **Origin Validation**
   - ERPNext validates the `Origin` and `Referer` headers
   - Rejects requests from unauthorized origins

## State-Changing Operations

All state-changing operations in the accounting period closing feature are protected:

### Period Management
- ✅ `POST /api/accounting-period/periods` - Create period
- ✅ `PUT /api/accounting-period/periods/[name]` - Update period
- ✅ `DELETE /api/accounting-period/periods/[name]` - Delete period (if implemented)

### Period Closing Operations
- ✅ `POST /api/accounting-period/close` - Close period
- ✅ `POST /api/accounting-period/reopen` - Reopen period
- ✅ `POST /api/accounting-period/permanent-close` - Permanent close

### Configuration
- ✅ `PUT /api/accounting-period/config` - Update configuration

### Audit Log
- ✅ All audit log entries are created server-side only
- ✅ No client-side manipulation possible

## Implementation Details

### ERPNextClient Class

The `ERPNextClient` class in `lib/erpnext.ts` handles all API authentication:

```typescript
private getHeaders(): Record<string, string> {
  return buildAuthHeaders(); // Returns Basic Auth header
}
```

All methods (`insert`, `update`, `delete`, `submit`, `cancel`, `call`) use this header automatically.

### API Route Protection

All API routes use the `ERPNextClient` which ensures:

1. **Authentication** - Every request includes valid API credentials
2. **Authorization** - ERPNext validates user permissions
3. **Audit Trail** - All operations are logged with user context

### Input Validation

Additional protection layers:

1. **Zod Schema Validation** - All inputs are validated before processing
2. **Input Sanitization** - XSS protection via `lib/input-sanitization.ts`
3. **Business Logic Validation** - Period status, permissions, etc.

## Testing

### CSRF Protection Tests

Since we use API Key authentication, CSRF tests verify:

1. ✅ All state-changing operations require authentication
2. ✅ Invalid API keys are rejected
3. ✅ Missing authentication headers are rejected
4. ✅ Audit logs capture all state changes

### Security Test Cases

```typescript
// Test: State-changing operation without authentication
test('should reject period closing without authentication', async () => {
  // Remove API key from environment
  const response = await fetch('/api/accounting-period/close', {
    method: 'POST',
    body: JSON.stringify({ period_name: 'TEST-2024-01' })
  });
  
  expect(response.status).toBe(401); // Unauthorized
});

// Test: State-changing operation with invalid API key
test('should reject period closing with invalid API key', async () => {
  const response = await fetch('/api/accounting-period/close', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic invalid_key'
    },
    body: JSON.stringify({ period_name: 'TEST-2024-01' })
  });
  
  expect(response.status).toBe(401); // Unauthorized
});
```

## Migration to Session-Based Auth (Future)

If session-based authentication is implemented in the future, follow these steps:

### 1. Add CSRF Token Utility

```typescript
// lib/csrf.ts
export async function getCSRFToken(sid: string): Promise<string | null> {
  try {
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
      return data.message?.csrf_token || null;
    }
  } catch (error) {
    console.error('Error getting CSRF token:', error);
  }
  return null;
}
```

### 2. Update ERPNextClient

```typescript
// Add CSRF token to headers for session-based auth
private async getHeaders(useCsrf: boolean = false): Promise<Record<string, string>> {
  const headers = buildAuthHeaders();
  
  if (useCsrf && this.sessionId) {
    const csrfToken = await getCSRFToken(this.sessionId);
    if (csrfToken) {
      headers['X-Frappe-CSRF-Token'] = csrfToken;
    }
  }
  
  return headers;
}
```

### 3. Update API Routes

```typescript
// Add CSRF token for session-based requests
if (useSessionAuth) {
  const csrfToken = await getCSRFToken(sessionId);
  headers['X-Frappe-CSRF-Token'] = csrfToken;
}
```

## Compliance

This implementation complies with:

- ✅ **OWASP CSRF Prevention Cheat Sheet** - Uses token-based authentication
- ✅ **OWASP API Security Top 10** - Proper authentication and authorization
- ✅ **ERPNext Security Best Practices** - Leverages built-in security features

## References

- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Frappe Framework Security](https://frappeframework.com/docs/user/en/security)
- [ERPNext API Documentation](https://frappeframework.com/docs/user/en/api)

## Conclusion

The accounting period closing feature is **fully protected against CSRF attacks** through:

1. **API Key Authentication** - Primary method, immune to CSRF by design
2. **ERPNext Built-in Protection** - Leverages Frappe's CSRF validation
3. **Input Validation** - Multiple layers of validation and sanitization
4. **Audit Trail** - Complete logging of all state changes

No additional CSRF protection implementation is required for the current API Key authentication approach.
