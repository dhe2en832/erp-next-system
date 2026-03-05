# Site Validation Fix - CORS Issue Resolved

## Problem

When adding a new site from the `/select-site` page, users encountered "Failed to fetch" errors due to CORS (Cross-Origin Resource Sharing) policy. The browser blocked direct requests from the frontend to ERPNext sites.

### Error Details
```
TypeError: Failed to fetch
at handleAddSite (app/select-site/page.tsx:189:34)
```

The frontend was trying to directly fetch `https://<site>.batasku.cloud/api/method/ping` which triggered CORS errors because:
1. The request was cross-origin (localhost:3000 → batasku.cloud)
2. ERPNext sites may not have CORS headers configured for localhost

## Solution

**Backend Validation Approach**: Instead of validating from the frontend (browser), we now validate from the backend (Next.js API route).

### Implementation

1. **Backend API Route**: `/api/sites/validate` (already existed)
   - Accepts: `siteUrl`, `apiKey`, `apiSecret`
   - Makes server-side request to ERPNext (no CORS issues)
   - Returns: `{ valid: true/false, message: "..." }`

2. **Frontend Update**: `app/select-site/page.tsx`
   - Changed from direct fetch to ERPNext → POST to `/api/sites/validate`
   - Simplified error handling (no more CORS-specific logic)
   - Removed auto-enable "Skip Validasi" on CORS error

### Validation Flow

```
User Input (Site Name + API Key + Secret)
    ↓
Frontend: POST /api/sites/validate
    ↓
Backend: Fetch https://<site>.batasku.cloud/api/method/ping
    ↓
Backend: Return validation result
    ↓
Frontend: Show success or error message
```

## Benefits

1. **No CORS Issues**: Server-side requests bypass browser CORS policy
2. **Better Security**: Validation happens on server, not exposed to browser
3. **Cleaner Error Messages**: No more confusing CORS error messages
4. **Consistent Behavior**: Works the same way across all browsers and environments

## Testing

To test the fix:

1. Go to `/select-site` page
2. Click "Tambah Site Baru"
3. Enter site name (e.g., `bac.batasku.cloud`)
4. Enter valid API Key and Secret
5. Click "Tambah Site"
6. Validation should succeed without CORS errors

### Expected Behavior

- **Valid credentials**: Site added successfully
- **Invalid credentials**: Error message "Invalid API Key or Secret"
- **Invalid URL**: Error message "Site not found or ping endpoint not available"
- **Network timeout**: Error message "Timeout: Site did not respond within 10 seconds"

## Files Changed

- `erp-next-system/app/select-site/page.tsx` - Updated to use backend validation API
- `erp-next-system/app/api/sites/validate/route.ts` - Backend validation endpoint (already existed)

## Related Documentation

- `MULTI_SITE_CREDENTIALS_FLOW.md` - Credentials management flow
- `MULTI_SITE_FLOW.md` - Multi-site architecture overview
