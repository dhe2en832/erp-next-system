# Session Cookie Authentication Tests

This directory contains property-based tests for the "Remove Session Cookie Checks" bugfix.

## Test Files

### 1. Bug Exploration Test (`session-cookie-blocks-api-key-bug-exploration.pbt.test.ts`)

**Purpose**: Demonstrates the bug on UNFIXED code

**Expected Outcome**: FAILS on unfixed code (confirms bug exists)

**What it tests**:
- API endpoints with inline `if (!sid)` checks return 401 Unauthorized
- Even when valid API Key credentials are configured in environment
- Bug pattern: Inline checks bypass dual authentication fallback

**Run**: `pnpm test:session-cookie-bug-exploration`

### 2. Preservation Test (`session-cookie-preservation.pbt.test.ts`)

**Purpose**: Verifies session cookie authentication and business logic remain unchanged

**Expected Outcome**: PASSES on unfixed code (establishes baseline)

**What it tests**:
- Session cookie authentication continues to work (fallback method)
- CRUD operations produce identical results
- Report generation produces identical data
- Error handling remains unchanged
- Data transformation logic preserved
- Response structure consistent

**Run**: `pnpm test:session-cookie-preservation`

## Environment Setup

### Required Variables

Add to `.env.local`:

```bash
# API Key Authentication (Primary)
ERP_API_KEY=your_api_key
ERP_API_SECRET=your_api_secret
ERPNEXT_API_URL=https://your-erpnext-instance.com

# Session Cookie Authentication (Fallback) - Optional for preservation tests
TEST_SESSION_COOKIE=your_session_cookie_value
```

### Getting a Session Cookie

To test session cookie authentication preservation:

1. **Login via Browser**:
   - Open your ERPNext instance in browser
   - Login with valid credentials
   - Open browser DevTools → Application/Storage → Cookies
   - Copy the `sid` cookie value

2. **Add to .env.local**:
   ```bash
   TEST_SESSION_COOKIE=your_copied_sid_value
   ```

3. **Run Preservation Tests**:
   ```bash
   pnpm test:session-cookie-preservation
   ```

**Note**: Session cookies expire. If tests fail with 401, get a fresh cookie.

## Test Workflow

### Before Implementing Fix

1. **Run Bug Exploration Test** (should FAIL):
   ```bash
   pnpm test:session-cookie-bug-exploration
   ```
   - Confirms inline `if (!sid)` checks block API Key authentication
   - Documents counterexamples (specific endpoints that fail)

2. **Run Preservation Test** (should PASS):
   ```bash
   pnpm test:session-cookie-preservation
   ```
   - Establishes baseline behavior to preserve
   - Verifies session cookie auth works (if TEST_SESSION_COOKIE configured)
   - Tests business logic operations

### After Implementing Fix

1. **Re-run Bug Exploration Test** (should PASS):
   ```bash
   pnpm test:session-cookie-bug-exploration
   ```
   - Confirms API Key authentication now works
   - No more 401 errors for valid API Key requests

2. **Re-run Preservation Test** (should still PASS):
   ```bash
   pnpm test:session-cookie-preservation
   ```
   - Confirms session cookie auth still works (no regression)
   - Confirms business logic unchanged

## What the Fix Does

**IMPORTANT**: This fix does NOT remove session cookie support!

### Current (Buggy) Behavior
```typescript
// Inline check blocks API Key fallback
const sid = request.cookies.get('sid')?.value;
if (!sid) {
  return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
}
// API Key is NEVER attempted
```

### Fixed Behavior
```typescript
// Use centralized dual authentication
const client = await getERPNextClientForRequest(request);
// This automatically tries:
// 1. API Key (primary) - if configured in environment
// 2. Session cookie (fallback) - if API Key not available
```

### Authentication Priority After Fix

1. **API Key** (Primary): Used when `ERP_API_KEY` and `ERP_API_SECRET` are configured
   - Full admin access
   - Server-to-server operations
   - Automated processes

2. **Session Cookie** (Fallback): Used when API Key not configured
   - User-specific permissions
   - Frontend login flows
   - Audit trails

Both methods continue to work after the fix!

## Property-Based Testing

These tests use `fast-check` for property-based testing:

- **Generates many test cases** automatically
- **Tests across input domain** (various query parameters, filters, etc.)
- **Catches edge cases** that manual tests might miss
- **Provides strong guarantees** about behavior preservation

Example:
```typescript
fc.assert(
  fc.asyncProperty(companyArb, limitArb, startArb, async (company, limit, start) => {
    // Test with randomly generated parameters
    const result = await callEndpoint(`?company=${company}&limit=${limit}&start=${start}`);
    return result.ok; // Property: should succeed
  }),
  { numRuns: 10 } // Run 10 random test cases
);
```

## Troubleshooting

### Tests Skip Session Cookie Tests

**Symptom**: "TEST_SESSION_COOKIE not configured. Session cookie tests will be skipped."

**Solution**: 
- This is expected if you don't have a session cookie
- Tests will still verify API Key authentication and business logic
- To test session cookie preservation, add TEST_SESSION_COOKIE to .env.local

### Tests Fail with 401 Unauthorized

**Before Fix**: Expected for bug exploration test (confirms bug exists)

**After Fix**: 
- Bug exploration test should pass (API Key auth works)
- Preservation test should pass (session cookie auth works)

**If preservation test fails after fix**:
- Check if TEST_SESSION_COOKIE is expired (get fresh cookie)
- Verify ERPNext backend is running
- Check network connectivity

### Tests Fail with Network Errors

**Symptom**: "fetch failed" or "ECONNREFUSED"

**Solution**:
- Verify ERPNEXT_API_URL is correct
- Ensure ERPNext backend is running
- Check network connectivity
- Verify SSL certificates (if using HTTPS)

## Test Coverage

### Modules Tested

- **Purchase**: Suppliers, Orders, Receipts, Invoices
- **Finance**: Journal Entries, Payments, Accounts, Reports
- **Sales**: Orders, Invoices, Delivery Notes (via similar patterns)
- **Inventory**: Stock Entry, Reconciliation, Warehouses (via similar patterns)

### Operations Tested

- **CRUD**: Create, Read, Update, Delete
- **Filtering**: Company, search, date ranges, status
- **Pagination**: limit_page_length, limit_start
- **Sorting**: order_by parameters
- **Enrichment**: Child tables, calculations, status mapping
- **Error Handling**: Missing parameters, invalid values

## References

- **Bugfix Spec**: `erpnext-dev/.kiro/specs/remove-session-cookie-checks/`
- **Design Document**: `bugfix.md` - Bug analysis and root cause
- **Requirements**: `design.md` - Correctness properties and preservation requirements
- **Tasks**: `tasks.md` - Implementation plan
