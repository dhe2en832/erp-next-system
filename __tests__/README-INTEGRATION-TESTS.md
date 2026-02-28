# Sales Invoice Cache Update Integration Tests

## Overview

This document describes the integration tests for the Sales Invoice "Not Saved" Status Fix (Task 4).

## Test File

- `sales-invoice-cache-update-integration.test.ts` - Full workflow integration tests

## Prerequisites

### 1. Environment Variables

Create a `.env` file in the project root with the following variables:

```bash
ERPNEXT_API_URL=http://localhost:8000
ERP_API_KEY=your_api_key_here
ERP_API_SECRET=your_api_secret_here
NEXT_API_URL=http://localhost:3000
```

### 2. Running Services

Before running the integration tests, ensure the following services are running:

1. **ERPNext Backend** - Must be running on `http://localhost:8000` (or your configured URL)
2. **Next.js Development Server** - Must be running on `http://localhost:3000`

Start the Next.js server:
```bash
pnpm dev
```

### 3. Test Data Requirements

The tests will create and delete test data automatically. Ensure your ERPNext instance has:

- A company named "Test Company" (or modify the test data)
- A customer named "Test Customer" (or the tests will create one)
- Items with codes like "ITEM-001", "ITEM-002", etc. (or the tests will create them)
- A warehouse named "Main Warehouse"

## Running the Tests

### Run All Integration Tests

```bash
pnpm test:sales-invoice-cache-integration
```

### Run Individual Test Suites

The integration test file includes the following test suites:

1. **Test 4.1: Successful Cache Update Flow**
   - Creates Sales Invoice via Next.js API
   - Verifies API response contains invoice data
   - Verifies status displays "Draft" (not "Not Saved")
   - Verifies Credit Note creation succeeds

2. **Test 4.2: Cache Update Failure Graceful Degradation**
   - Validates graceful handling of cache update failures
   - Verifies invoice is still saved to database
   - Verifies API returns success response

3. **Test 4.3: Concurrent Invoice Creation**
   - Creates multiple invoices simultaneously
   - Verifies all caches are updated correctly
   - Verifies no race conditions

4. **Test 4.4: Cross-Module Integration**
   - Creates invoice with Delivery Note references
   - Verifies all references are preserved
   - Verifies custom fields are populated

5. **Property-Based Test: Cache Update Across Many Inputs**
   - Generates random invoice configurations
   - Validates cache update works for all variations

## Test Output

### Success Output

```
╔════════════════════════════════════════════════════════════════╗
║  Sales Invoice Cache Update Integration Tests                 ║
║  Task 4: Full Workflow Testing                                ║
╚════════════════════════════════════════════════════════════════╝

=== Test 4.1: Successful Cache Update Flow ===
Step 1: Creating Sales Invoice via Next.js API...
Step 2: Fetching invoice from ERPNext...
Step 3: Checking if Credit Note can be created...
✓ Test 4.1 PASSED: Cache update flow works correctly

...

╔════════════════════════════════════════════════════════════════╗
║  Test Summary                                                  ║
╚════════════════════════════════════════════════════════════════╝
Total tests: 5
Passed: 5
Failed: 0

✅ All integration tests passed!

Validated Behaviors:
  ✓ Cache update flow works correctly
  ✓ Graceful degradation on cache update failure
  ✓ Concurrent invoice creation without race conditions
  ✓ Cross-module integration with Delivery Notes
  ✓ Cache update works across many input variations
```

### Failure Output

If tests fail, you'll see detailed error messages:

```
╔════════════════════════════════════════════════════════════════╗
║  Test Failures                                                 ║
╚════════════════════════════════════════════════════════════════╝

Test 4.1: Successful Cache Update Flow:
  Assertion failed: Invoice status should be "Draft" (not "Not Saved")
    Expected: Draft
    Actual: Not Saved
```

## Troubleshooting

### Error: Missing required environment variables

**Solution**: Create a `.env` file with `ERP_API_KEY` and `ERP_API_SECRET`

### Error: Failed to fetch invoice

**Possible causes**:
- ERPNext backend is not running
- API credentials are incorrect
- Network connectivity issues

**Solution**: 
1. Verify ERPNext is running: `curl http://localhost:8000/api/method/ping`
2. Check API credentials in `.env`
3. Verify network connectivity

### Error: Failed to create invoice

**Possible causes**:
- Next.js server is not running
- Required master data (Company, Customer, Items) doesn't exist
- Validation errors in invoice data

**Solution**:
1. Start Next.js server: `pnpm dev`
2. Create required master data in ERPNext
3. Check console logs for validation errors

### Tests timeout

**Possible causes**:
- ERPNext backend is slow
- Network latency
- Database performance issues

**Solution**:
1. Increase timeout in test file (default: 60 seconds)
2. Optimize ERPNext database
3. Check system resources

## Test Cleanup

The tests automatically clean up created data by deleting test invoices after each test. If tests are interrupted, you may need to manually delete test invoices:

```sql
-- In ERPNext database
DELETE FROM `tabSales Invoice` WHERE name LIKE 'SI-TEST-%';
```

## Continuous Integration

To run these tests in CI/CD pipelines:

1. Set environment variables in CI configuration
2. Start ERPNext and Next.js services
3. Run tests: `pnpm test:sales-invoice-cache-integration`
4. Collect test results and logs

Example GitHub Actions workflow:

```yaml
- name: Run Integration Tests
  env:
    ERPNEXT_API_URL: ${{ secrets.ERPNEXT_API_URL }}
    ERP_API_KEY: ${{ secrets.ERP_API_KEY }}
    ERP_API_SECRET: ${{ secrets.ERP_API_SECRET }}
  run: pnpm test:sales-invoice-cache-integration
```

## Related Tests

- `sales-invoice-not-saved-status-bug-exploration.pbt.test.ts` - Bug exploration tests
- `sales-invoice-preservation.pbt.test.ts` - Preservation property tests

## Requirements Validated

These integration tests validate the following requirements from the bugfix spec:

- **Requirement 2.1**: Sales Invoice displays "Draft" status in ERPNext UI
- **Requirement 2.2**: Credit Note creation succeeds for API-created invoices
- **Requirement 2.3**: ERPNext form cache is automatically updated
- **Requirement 3.1**: UI-based creation continues to work correctly
- **Requirement 3.2**: API submission continues to work correctly

## Support

For issues or questions about these tests, refer to:
- Bugfix spec: `.kiro/specs/sales-invoice-not-saved-status-fix/bugfix.md`
- Design document: `.kiro/specs/sales-invoice-not-saved-status-fix/design.md`
- Tasks: `.kiro/specs/sales-invoice-not-saved-status-fix/tasks.md`
