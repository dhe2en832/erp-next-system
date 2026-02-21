# Accounting Period Reopening Tests

This directory contains comprehensive tests for the Accounting Period Reopening feature.

## Overview

The reopening feature allows administrators to reopen closed accounting periods when corrections are needed. The tests verify that:
- Periods can be reopened when validation passes
- Reopening is blocked when subsequent periods are closed
- Closing journal entries are properly cleaned up
- Audit logs and notifications are created
- Permissions are enforced

## Test Files

### 1. Property-Based Tests (`accounting-period-reopening.pbt.test.ts`)

Property-based tests verify universal properties that should hold across all valid inputs.

**Properties Tested:**

- **Property 19: Reopen Validation - Next Period Check**
  - Validates: Requirements 6.2
  - Verifies that reopening is rejected when a subsequent period is already closed
  - Tests the validation logic that prevents data inconsistency

- **Property 20: Status Transition on Reopening**
  - Validates: Requirements 6.3
  - Verifies that status correctly transitions from "Closed" to "Open"
  - Tests that metadata fields (closed_by, closed_on) are cleared

- **Property 21: Closing Journal Cleanup on Reopen**
  - Validates: Requirements 6.4
  - Verifies that closing journal entries are cancelled and deleted
  - Tests that the closing_journal_entry reference is cleared

- **Property 22: Reopen Notification**
  - Validates: Requirements 6.6
  - Verifies that notifications are sent to Accounts Managers
  - Tests that audit logs include the reopening reason

**Running Property Tests:**

```bash
# Run all property tests
npx tsx tests/accounting-period-reopening.pbt.test.ts

# Run with minimum 100 iterations per property
# (configured in test file)
```

### 2. Unit Tests (`accounting-period-reopening-unit.test.ts`)

Unit tests verify specific scenarios and edge cases.

**Test Cases:**

1. **Test Successful Reopen**
   - Requirements: 6.1, 6.3, 6.4
   - Scenario: Reopen a closed period with no subsequent closed periods
   - Verifies:
     - Status changes to "Open"
     - Metadata fields are cleared
     - Closing journal is deleted
     - Audit log is created

2. **Test Reopen Rejection When Next Period Closed**
   - Requirements: 6.2
   - Scenario: Attempt to reopen when next period is closed
   - Verifies:
     - Reopen is rejected with error code "NEXT_PERIOD_CLOSED"
     - Error message mentions the next period
     - Original period remains closed

3. **Test Reopen with Insufficient Permissions**
   - Requirements: 6.1
   - Scenario: Non-admin user attempts to reopen
   - Status: Currently skipped (permission system not fully implemented)
   - Will verify: 403 Forbidden response for unauthorized users

4. **Test Reopen for Permanently Closed Period**
   - Requirements: 6.1
   - Scenario: Attempt to reopen a permanently closed period
   - Verifies:
     - Reopen is rejected
     - Error mentions "Permanently Closed" status
     - Period remains permanently closed

**Running Unit Tests:**

```bash
# Run all unit tests
npx tsx tests/accounting-period-reopening-unit.test.ts

# Run specific test (modify test file to comment out others)
npx tsx tests/accounting-period-reopening-unit.test.ts
```

## Test Data Setup

### Prerequisites

1. **ERPNext Instance**: Tests require a running ERPNext instance
2. **Test Company**: "Batasku" company must exist
3. **Chart of Accounts**: Required accounts:
   - Sales - B (Income account)
   - Cost of Goods Sold - B (Expense account)
   - Cash - B (Asset account)
   - Retained Earnings - B (Equity account)
4. **Period Closing Config**: Must be configured with retained earnings account

### Environment Variables

```bash
# .env.local
ERPNEXT_URL=http://localhost:8000
ERP_API_KEY=your_api_key
ERP_API_SECRET=your_api_secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Test Execution Flow

### Property Test Flow

1. Create test period(s)
2. Add test transactions
3. Close period(s)
4. Execute property test logic
5. Verify property holds
6. Cleanup test data

### Unit Test Flow

1. Setup: Create period and transactions
2. Action: Close period
3. Action: Attempt to reopen
4. Assert: Verify expected behavior
5. Cleanup: Delete test data

## Cleanup Strategy

All tests include cleanup logic in `finally` blocks to ensure:
- Test periods are deleted
- Closing journals are removed
- No orphaned data remains

If tests fail mid-execution, manual cleanup may be needed:

```bash
# List test periods
curl -X GET "http://localhost:8000/api/resource/Accounting Period" \
  -H "Authorization: Basic <credentials>"

# Delete test period
curl -X DELETE "http://localhost:8000/api/resource/Accounting Period/<name>" \
  -H "Authorization: Basic <credentials>"
```

## Expected Test Results

### Property Tests

All 4 properties should pass:
- Property 19: Reopen Validation - Next Period Check ✓
- Property 20: Status Transition on Reopening ✓
- Property 21: Closing Journal Cleanup on Reopen ✓
- Property 22: Reopen Notification ✓

### Unit Tests

3 tests should pass, 1 skipped:
- Test 1: Successful Reopen ✓
- Test 2: Reopen Rejection When Next Period Closed ✓
- Test 3: Reopen with Insufficient Permissions ⊘ (skipped)
- Test 4: Reopen for Permanently Closed Period ✓

## Troubleshooting

### Common Issues

1. **ERP API credentials not configured**
   - Solution: Set ERP_API_KEY and ERP_API_SECRET in .env.local

2. **Test company not found**
   - Solution: Create "Batasku" company in ERPNext or update TEST_COMPANY constant

3. **Required accounts not found**
   - Solution: Ensure Chart of Accounts includes all required accounts

4. **Tests fail with "Period not found"**
   - Solution: Check cleanup logic, may need manual cleanup

5. **Closing journal deletion fails**
   - Solution: Ensure journal is cancelled before deletion

### Debug Mode

Enable verbose logging by modifying test files:

```typescript
// Add at top of test file
const DEBUG = true;

// Add logging in test functions
if (DEBUG) {
  console.log('Period:', period);
  console.log('Response:', result);
}
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Accounting Period Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      erpnext:
        image: frappe/erpnext:latest
        ports:
          - 8000:8000
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Run property tests
        run: npx tsx tests/accounting-period-reopening.pbt.test.ts
        env:
          ERPNEXT_URL: http://localhost:8000
          ERP_API_KEY: ${{ secrets.ERP_API_KEY }}
          ERP_API_SECRET: ${{ secrets.ERP_API_SECRET }}
      
      - name: Run unit tests
        run: npx tsx tests/accounting-period-reopening-unit.test.ts
```

## Related Documentation

- [Requirements Document](../.kiro/specs/accounting-period-closing/requirements.md)
- [Design Document](../.kiro/specs/accounting-period-closing/design.md)
- [API Documentation](../app/api/accounting-period/README.md)
- [Closing Tests](./accounting-period-closing-workflow-README.md)

## Contributing

When adding new tests:

1. Follow existing test structure
2. Include cleanup logic in `finally` blocks
3. Add descriptive console output
4. Update this README with new test descriptions
5. Ensure tests are idempotent (can run multiple times)

## Test Coverage

Current coverage for reopening feature:

- ✓ Status validation (Open/Closed/Permanently Closed)
- ✓ Next period validation
- ✓ Closing journal cleanup
- ✓ Audit logging
- ✓ Notification system (stubbed)
- ⊘ Permission checking (not fully implemented)
- ✓ Error handling
- ✓ Data persistence

## Performance Considerations

- Each property test runs 100+ iterations
- Unit tests create real ERPNext documents
- Full test suite takes ~2-5 minutes
- Consider running tests in parallel for CI/CD

## Future Enhancements

1. Add permission testing when auth system is implemented
2. Add tests for concurrent reopening attempts
3. Add tests for reopening with pending transactions
4. Add performance benchmarks
5. Add integration tests with other modules
