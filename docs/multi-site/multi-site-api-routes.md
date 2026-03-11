# Multi-Site API Routes Guide

This guide explains how to update API routes to support multi-site configurations while maintaining backward compatibility with single-site setups.

## Overview

The multi-site support allows a single Next.js deployment to connect to multiple ERPNext backend instances. API routes can extract the active site from request headers or cookies and route requests accordingly.

## Key Concepts

### Site Context in API Routes

API routes receive site information through:
1. **X-Site-ID header** - Explicitly specified site ID
2. **active_site cookie** - User's currently selected site
3. **Fallback** - Default site or legacy environment variables

### Backward Compatibility

The system maintains full backward compatibility:
- If no site is specified, uses default site from multi-site config
- If no multi-site config exists, falls back to legacy `ERPNEXT_API_URL` environment variables
- Existing API routes continue to work without modification

## Helper Functions

### `getSiteIdFromRequest(request: NextRequest): Promise<string | null>`

Extracts site ID from request headers or cookies.

```typescript
const siteId = await getSiteIdFromRequest(request);
// Returns: 'batasku-local' | 'bac-cloud' | null
```

### `getERPNextClientForRequest(request: NextRequest): Promise<ERPNextMultiClient | typeof erpnextClient>`

Gets the appropriate ERPNext client for the request with automatic fallback.

```typescript
const client = await getERPNextClientForRequest(request);
// Returns site-specific client or legacy client
```

### `buildSiteAwareErrorResponse(error: unknown, siteId?: string | null)`

Creates standardized error responses with site context.

```typescript
const errorResponse = buildSiteAwareErrorResponse(error, siteId);
// Returns: { success: false, error: 'NETWORK', message: '...', site: 'batasku-local', errorType: 'network' }
```

### `logSiteError(error: unknown, context: string, siteId?: string | null)`

Logs errors with site context for troubleshooting.

```typescript
logSiteError(error, 'Fetch accounts', siteId);
// Logs: { timestamp, context, siteId, error, stack }
```

## Error Types

The system classifies errors into four categories:

1. **Network Errors** - Connection failures, timeouts, DNS issues
2. **Authentication Errors** - Invalid credentials, expired sessions
3. **Configuration Errors** - Missing site config, invalid URLs
4. **Unknown Errors** - Other unclassified errors

## Migration Pattern

### Before (Single-Site)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { erpnextClient } from '@/lib/erpnext';

export async function GET(request: NextRequest) {
  try {
    const accounts = await erpnextClient.getList('Account', {
      fields: ['name', 'account_name'],
      limit: 100,
    });
    
    return NextResponse.json({ success: true, data: accounts });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
}
```

### After (Multi-Site)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest, 
  buildSiteAwareErrorResponse, 
  logSiteError 
} from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  let siteId: string | null = null;
  
  try {
    // Extract site ID for error context
    siteId = await getSiteIdFromRequest(request);
    
    // Get site-aware client (with automatic fallback)
    const client = await getERPNextClientForRequest(request);
    
    const accounts = await client.getList('Account', {
      fields: ['name', 'account_name'],
      limit: 100,
    });
    
    return NextResponse.json({ success: true, data: accounts });
  } catch (error) {
    // Log with site context
    logSiteError(error, 'Fetch accounts', siteId);
    
    // Build site-aware error response
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    
    // Provide specific guidance based on error type
    if (errorResponse.errorType === 'authentication') {
      errorResponse.message = `Authentication failed${siteId ? ` for site ${siteId}` : ''}. Please check your credentials.`;
    } else if (errorResponse.errorType === 'network') {
      errorResponse.message = `Cannot connect to ERPNext${siteId ? ` (Site: ${siteId})` : ''}. Check network connection.`;
    }
    
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.errorType === 'authentication' ? 401 : 500 }
    );
  }
}
```

## Complete Example: POST Route

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest, 
  buildSiteAwareErrorResponse, 
  logSiteError 
} from '@/lib/api-helpers';

export async function POST(request: NextRequest) {
  let siteId: string | null = null;
  
  try {
    siteId = await getSiteIdFromRequest(request);
    const client = await getERPNextClientForRequest(request);
    
    const body = await request.json();
    
    // Validate input
    if (!body.account_name) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', message: 'Account name is required' },
        { status: 400 }
      );
    }
    
    // Create document
    const account = await client.insert('Account', {
      account_name: body.account_name,
      account_type: body.account_type,
      company: body.company,
    });
    
    return NextResponse.json({ 
      success: true, 
      data: account,
      message: 'Account created successfully' 
    });
  } catch (error) {
    logSiteError(error, 'Create account', siteId);
    
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    
    // Customize error messages
    if (errorResponse.errorType === 'authentication') {
      errorResponse.message = `Authentication failed${siteId ? ` for site ${siteId}` : ''}. Please verify your API credentials.`;
    } else if (errorResponse.errorType === 'network') {
      errorResponse.message = `Cannot connect to ERPNext${siteId ? ` (Site: ${siteId})` : ''}. Please check your network connection and ensure the ERPNext server is running.`;
    } else if (errorResponse.errorType === 'configuration') {
      errorResponse.message = `Site configuration error${siteId ? ` (Site: ${siteId})` : ''}. Please check your site settings.`;
    }
    
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.errorType === 'authentication' ? 401 : 500 }
    );
  }
}
```

## Testing Multi-Site Routes

### Using Headers

```bash
# Specify site via header
curl -H "X-Site-ID: batasku-local" http://localhost:3000/api/finance/accounts

# Different site
curl -H "X-Site-ID: bac-cloud" http://localhost:3000/api/finance/accounts
```

### Using Cookies

```bash
# Set active site cookie
curl -b "active_site=batasku-local" http://localhost:3000/api/finance/accounts
```

### Default Behavior

```bash
# No site specified - uses default site or legacy config
curl http://localhost:3000/api/finance/accounts
```

## Error Response Format

All errors follow a consistent format:

```typescript
{
  success: false,
  error: 'NETWORK' | 'AUTHENTICATION' | 'CONFIGURATION' | 'UNKNOWN',
  message: 'Detailed error message with site context',
  site?: 'site-id',  // Optional, included if site was specified
  errorType: 'network' | 'authentication' | 'configuration' | 'unknown'
}
```

## Best Practices

1. **Always extract site ID early** - Capture it at the start for error context
2. **Use site-aware error responses** - Include site information in all errors
3. **Log with context** - Use `logSiteError` for consistent logging
4. **Provide specific guidance** - Customize error messages based on error type
5. **Maintain backward compatibility** - Don't require site ID, allow fallback
6. **Test both modes** - Verify routes work with and without site specification

## Migration Checklist

When updating an API route for multi-site support:

- [ ] Import helper functions from `@/lib/api-helpers`
- [ ] Add `siteId` variable at function start
- [ ] Extract site ID using `getSiteIdFromRequest(request)`
- [ ] Replace `erpnextClient` with `getERPNextClientForRequest(request)`
- [ ] Replace generic error handling with `buildSiteAwareErrorResponse`
- [ ] Add `logSiteError` calls for all errors
- [ ] Customize error messages based on error type
- [ ] Test with site header, cookie, and no site specified
- [ ] Verify backward compatibility with legacy setup

## Common Patterns

### Pattern 1: List Endpoint

```typescript
export async function GET(request: NextRequest) {
  let siteId: string | null = null;
  
  try {
    siteId = await getSiteIdFromRequest(request);
    const client = await getERPNextClientForRequest(request);
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    
    const items = await client.getList('Item', {
      fields: ['name', 'item_name', 'item_code'],
      limit,
    });
    
    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    logSiteError(error, 'List items', siteId);
    return NextResponse.json(
      buildSiteAwareErrorResponse(error, siteId),
      { status: 500 }
    );
  }
}
```

### Pattern 2: Detail Endpoint with Dynamic Route

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  let siteId: string | null = null;
  
  try {
    const { name } = await params;
    siteId = await getSiteIdFromRequest(request);
    const client = await getERPNextClientForRequest(request);
    
    const item = await client.get('Item', name);
    
    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    logSiteError(error, `Get item: ${name}`, siteId);
    return NextResponse.json(
      buildSiteAwareErrorResponse(error, siteId),
      { status: 500 }
    );
  }
}
```

### Pattern 3: Action Endpoint

```typescript
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  let siteId: string | null = null;
  
  try {
    const { name } = await params;
    siteId = await getSiteIdFromRequest(request);
    const client = await getERPNextClientForRequest(request);
    
    // Perform action (e.g., submit document)
    const result = await client.submit('Sales Invoice', name);
    
    return NextResponse.json({ 
      success: true, 
      data: result,
      message: 'Document submitted successfully' 
    });
  } catch (error) {
    logSiteError(error, `Submit document: ${name}`, siteId);
    return NextResponse.json(
      buildSiteAwareErrorResponse(error, siteId),
      { status: 500 }
    );
  }
}
```

## Troubleshooting

### Issue: "Site not found" error

**Cause**: Site ID specified in header/cookie doesn't exist in configuration

**Solution**: 
- Check site ID spelling
- Verify site is configured in settings
- Use site management UI to add missing site

### Issue: Routes still using old client

**Cause**: Import statement not updated

**Solution**: Replace `import { erpnextClient } from '@/lib/erpnext'` with helper imports

### Issue: Error logs missing site context

**Cause**: Not using `logSiteError` helper

**Solution**: Replace `console.error` with `logSiteError(error, context, siteId)`

### Issue: Inconsistent error responses

**Cause**: Not using `buildSiteAwareErrorResponse`

**Solution**: Use helper function for all error responses

## See Also

- [Multi-Site Environment Configuration](./multi-site-environment-configuration.md)
- [Site Configuration Management](../lib/site-config.ts)
- [API Router Layer](../lib/erpnext-multi.ts)
- [Authentication Manager](../utils/erpnext-auth-multi.ts)
