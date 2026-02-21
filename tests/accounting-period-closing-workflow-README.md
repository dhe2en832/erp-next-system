# Accounting Period Closing Workflow Tests

This directory contains comprehensive tests for the accounting period closing workflow implementation.

## Overview

The closing workflow implementation includes:
1. Enhanced `/api/accounting-period/close` endpoint with all required features
2. Property-based tests for universal properties (Properties 12-16)
3. Unit tests for specific scenarios

## Implementation Details

### Enhanced Closing Endpoint

**File**: `app/api/accounting-period/close/route.ts`

The closing endpoint now includes:
- ✅ Period status validation (must be "Open")
- ✅ User permission checking (closing_role)
- ✅ Pre-closing validations (unless force=true)
- ✅ Closing journal entry creation
- ✅ Account balances snapshot calculation and storage
- ✅ Period status update to "Closed"
- ✅ Closing metadata recording (closed_by, closed_on)
- ✅ Audit log entry creation
- ✅ Notification sending (stubbed for now)

### Enhanced Closing Library

**File**: `lib/accounting-period-closing.ts`

New functions added:
- `calculateAllAccountBalances()` - Calculates balances for all accounts as of period end date
- `createAuditLog()` - Creates audit log entries for period actions
- `sendClosingNotifications()` - Sends notifications (stub implementation)

## Property-Based Tests

**File**: `tests/accounting-period-closing-workflow.pbt.test.ts`

### Property 12: Status Transition on Closing
**Validates**: Requirements 4.1

For any accounting period with status "Open", successfully closing the period should change the status to "Closed".

**Test Strategy**: Create period with Open status, close it, verify status changes to Closed and persists.

### Property 13: Closing Metadata Recording
**Validates**: Requirements 4.2

For any accounting period that is closed, the period object should have closed_by set to the user who performed the closing and closed_on set to a valid timestamp.

**Test Strategy**: Close period, verify closed_by matches user, closed_on is valid timestamp within expected time range.

### Property 14: Balance Snapshot Completeness
**Validates**: Requirements 4.3

For any accounting period that is closed, the system should store balance snapshots for all accounts that have non-zero balances as of the period end date.

**Test Strategy**: Create transactions, close period, verify all accounts with non-zero balances are captured in snapshot, including retained earnings.

### Property 15: Opening Balance Carry-Forward
**Validates**: Requirements 4.4

For any closed accounting period followed by another period, the opening balances of the next period should equal the closing balances of real accounts (Asset, Liability, Equity) from the previous period, while nominal accounts (Income, Expense) should start with zero balance.

**Test Strategy**: Close period 1, verify real accounts carry forward to period 2, nominal accounts are zero after closing.

### Property 16: Comprehensive Audit Logging
**Validates**: Requirements 4.5, 10.1, 10.2

For any state-changing action (create, close, reopen, permanent close, transaction modification in closed period, configuration change), an audit log entry should be created containing action_type, action_by, action_date, and before/after snapshots where applicable.

**Test Strategy**: Close period, query audit logs, verify entry exists with correct action_type, user, timestamp, and before/after snapshots showing status change.

## Unit Tests

**File**: `tests/accounting-period-closing-workflow-unit.test.ts`

### Test 1: Successful Closing with Valid Data
**Requirements**: 4.1, 4.2, 4.5

Verifies that a period with valid data and passing validations can be closed successfully.

**Test Steps**:
1. Create test period with valid transactions
2. Call closing API without force flag
3. Verify response is successful
4. Verify period status is Closed
5. Verify closing metadata (closed_by, closed_on, closing_journal_entry)
6. Verify closing journal and account balances are returned

### Test 2: Closing Rejection with Failed Validations
**Requirements**: 4.1

Verifies that a period with failed validations cannot be closed without force flag.

**Test Steps**:
1. Create test period with draft transaction (fails validation)
2. Call closing API without force flag
3. Verify response indicates failure
4. Verify error is VALIDATION_FAILED
5. Verify failed validations are listed
6. Verify period status remains Open

### Test 3: Force Closing (Admin Only)
**Requirements**: 4.1, 4.2

Verifies that a period can be closed with force=true even with failed validations.

**Test Steps**:
1. Create test period with draft transaction (fails validation)
2. Call closing API with force=true
3. Verify response is successful
4. Verify period status is Closed
5. Verify closing metadata is set

### Test 4: Closing with Insufficient Permissions
**Requirements**: 4.5

Verifies that the system checks user permissions before allowing closing.

**Note**: Currently a placeholder test as full authentication is not implemented. The code includes permission checks for `config.closing_role`.

### Test 5: Closing Already Closed Period
**Requirements**: 4.1

Verifies that attempting to close an already closed period returns an error.

**Test Steps**:
1. Create and close a test period
2. Attempt to close the same period again
3. Verify second closing fails
4. Verify error message indicates period is already closed

### Test 6: Audit Log Creation on Closing
**Requirements**: 4.5

Verifies that an audit log entry is created when a period is closed.

**Test Steps**:
1. Create and close a test period
2. Query Period Closing Log for the period
3. Verify audit log entry exists with action_type "Closed"
4. Verify required fields (action_by, action_date) are set
5. Verify before/after snapshots are set and valid JSON
6. Verify snapshots show status change from Open to Closed

## Running the Tests

### Property-Based Tests
```bash
npx tsx tests/accounting-period-closing-workflow.pbt.test.ts
```

### Unit Tests
```bash
npx tsx tests/accounting-period-closing-workflow-unit.test.ts
```

### Prerequisites
- ERPNext instance must be running and accessible
- Environment variables must be configured:
  - `ERPNEXT_API_URL`
  - `ERPNEXT_API_KEY`
  - `ERPNEXT_API_SECRET`
- Test company "Batasku" must exist with required accounts:
  - Sales - B
  - Service - B
  - Cost of Goods Sold - B
  - Expenses Included In Valuation - B
  - Cash - B
  - Retained Earnings - B

## Test Data Cleanup

All tests include cleanup functions that:
1. Cancel and delete closing journal entries
2. Delete test periods
3. Handle errors gracefully during cleanup

## Coverage

The tests cover:
- ✅ Status transitions (Open → Closed)
- ✅ Metadata recording (closed_by, closed_on)
- ✅ Balance snapshot storage
- ✅ Opening balance carry-forward
- ✅ Audit logging
- ✅ Validation enforcement
- ✅ Force closing
- ✅ Permission checking (code level)
- ✅ Duplicate closing prevention

## Notes

1. **ERP Credentials**: Tests require valid ERPNext credentials to run. Without credentials, tests will fail with "ERP API credentials not configured" error.

2. **Test Isolation**: Each test creates its own period with a unique suffix (timestamp) to avoid conflicts.

3. **Async Operations**: All tests are async and properly await ERPNext API calls.

4. **Error Handling**: Tests include comprehensive error handling and cleanup in finally blocks.

5. **Property vs Unit Tests**: 
   - Property tests verify universal properties that should hold for any valid input
   - Unit tests verify specific scenarios and edge cases

## Future Enhancements

1. Add tests for reopening periods
2. Add tests for permanent closing
3. Add tests for transaction restrictions on closed periods
4. Implement full authentication testing
5. Add performance tests for large datasets
6. Add integration tests with other modules
