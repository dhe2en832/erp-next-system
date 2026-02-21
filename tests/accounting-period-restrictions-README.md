# Transaction Restrictions Tests

This directory contains tests for the Accounting Period Transaction Restrictions feature.

## Overview

The transaction restrictions feature prevents unauthorized modifications to financial transactions in closed accounting periods, ensuring data integrity and compliance with accounting standards.

## Feature Implementation

### Core Components

1. **Utility Library** (`lib/accounting-period-restrictions.ts`)
   - `validateTransactionAgainstClosedPeriod()` - Main validation function
   - `logAdministratorOverride()` - Audit logging for admin overrides
   - `canCreateTransaction()` - Convenience wrapper for create operations
   - `canModifyTransaction()` - Convenience wrapper for update operations
   - `canDeleteTransaction()` - Convenience wrapper for delete operations
   - `getTransactionRestrictionInfo()` - Get detailed restriction information

2. **API Endpoint** (`app/api/accounting-period/check-restriction/route.ts`)
   - POST endpoint to validate transactions against closed periods
   - Returns restriction info and reason
   - Validates: Requirements 5.1, 5.2, 5.3

### Business Rules

#### Period Status Restrictions

1. **Open Period**
   - All users can create, modify, and delete transactions
   - No logging required

2. **Closed Period**
   - Regular users: All operations rejected
   - Administrators (System Manager, Accounts Manager): All operations allowed with audit logging
   - Error message: "Cannot modify transaction: Period {name} is closed. Contact administrator to reopen the period."

3. **Permanently Closed Period**
   - ALL users (including administrators): All operations rejected
   - No exceptions allowed
   - Error message: "Cannot modify transaction: Period {name} is permanently closed. No modifications are allowed."

#### Administrator Roles

Users with the following roles can override closed period restrictions:
- System Manager
- Accounts Manager
- Administrator (user)

When an administrator modifies a transaction in a closed period:
1. The operation is allowed
2. An audit log entry is created in "Period Closing Log" DocType
3. The log includes: period, user, action type, transaction details, and reason

## Test Files

### 1. Property-Based Tests (`accounting-period-restrictions.pbt.test.ts`)

Tests universal properties across many randomly generated inputs (100 iterations per property).

**Property 17: Transaction Restriction in Closed Periods**
- Validates: Requirements 5.1, 5.2, 5.3
- Tests that regular users cannot create, modify, or delete transactions in closed periods
- Verifies appropriate error messages are returned
- Confirms permanently closed periods reject all users

**Property 18: Administrator Override with Logging**
- Validates: Requirements 5.4, 5.5
- Tests that administrators can modify transactions in closed periods
- Verifies audit log entries are created with all required fields
- Confirms logging includes: period, user, action, transaction details, reason

**Additional Properties:**
- Permanently closed periods reject all users (including admins)
- Open periods allow all users without restrictions

### 2. Unit Tests (`accounting-period-restrictions-unit.test.ts`)

Tests specific scenarios with known inputs and expected outputs.

**Test Coverage:**

1. **Requirement 5.1: Create Transaction Rejected**
   - Journal Entry creation in closed period
   - Sales Invoice creation in closed period
   - Purchase Invoice creation in closed period

2. **Requirement 5.2: Update Transaction Rejected**
   - Journal Entry update in closed period
   - Payment Entry modification in closed period

3. **Requirement 5.3: Delete Transaction Rejected**
   - Journal Entry deletion in closed period
   - Sales Invoice deletion in closed period

4. **Requirement 5.4: Admin Override**
   - System Manager allowed with logging
   - Accounts Manager allowed with logging
   - Administrator delete allowed

5. **Requirement 5.5: Administrator Logging**
   - Create action logged correctly
   - Update action logged with reason
   - Delete action logged with reason
   - All required fields present in log

6. **Permanently Closed Periods**
   - Administrator rejected
   - Accounts Manager rejected

7. **Open Periods**
   - Regular users allowed
   - Any user can modify

8. **Restriction Info API**
   - Correct info for closed period (regular user)
   - Override indication for admin
   - No restriction for open period

9. **Edge Cases**
   - No posting_date provided
   - Date outside any period

10. **API Endpoint**
    - Returns restriction for closed period
    - Returns no restriction for open period
    - Handles invalid date format

## Running the Tests

### Prerequisites

1. ERPNext server must be running
2. Environment variables must be configured in `.env.local`:
   ```
   ERPNEXT_API_URL=http://localhost:8000
   ERP_API_KEY=your_api_key
   ERP_API_SECRET=your_api_secret
   ERP_DEFAULT_COMPANY=Batasku
   ```

3. Next.js development server must be running for API endpoint tests:
   ```bash
   npm run dev
   ```

### Running Property-Based Tests

```bash
npm run test:accounting-period-restrictions
```

This will run 100 iterations of each property test, creating and cleaning up test data automatically.

### Running Unit Tests

```bash
npm run test:accounting-period-restrictions-unit
```

This will run all unit test scenarios, including API endpoint tests.

## Test Data Management

### Setup
- Tests create temporary accounting periods with unique names
- Periods are created with specific statuses (Open, Closed, Permanently Closed)
- Test periods use date ranges that don't conflict with production data

### Cleanup
- All test periods are automatically deleted after tests complete
- Audit log entries created during tests are cleaned up
- Tests use try-catch blocks to ensure cleanup even on failure

### Test Period Naming Convention
- Property tests: `TEST-RESTRICT-{random}`, `TEST-ADMIN-{random}`, etc.
- Unit tests: `UNIT-TEST-CLOSED-{timestamp}`, `UNIT-TEST-PERM-{timestamp}`, etc.

## Expected Test Results

### Success Criteria

All tests should pass with the following outcomes:

1. **Property 17**: 100/100 iterations pass
   - Regular users rejected for closed periods
   - Appropriate error messages returned
   - Permanently closed periods reject all users

2. **Property 18**: 100/100 iterations pass
   - Administrators allowed with logging
   - Audit logs created with all required fields
   - Log entries retrievable and verifiable

3. **Unit Tests**: All scenarios pass
   - All 10 test categories complete successfully
   - API endpoints return correct responses
   - Edge cases handled properly

### Failure Scenarios

If tests fail, check:

1. **ERPNext Connection**
   - Is ERPNext server running?
   - Are API credentials correct?
   - Can you access ERPNext API manually?

2. **Next.js Server**
   - Is the development server running?
   - Are API routes accessible?
   - Check console for errors

3. **DocType Configuration**
   - Does "Accounting Period" DocType exist?
   - Does "Period Closing Log" DocType exist?
   - Are required fields configured?

4. **Permissions**
   - Does the API user have permission to create/delete test periods?
   - Can the API user create Period Closing Log entries?

## Integration with Accounting Period Closing

This feature is part of the larger Accounting Period Closing system:

- **Task 8** of the accounting-period-closing spec
- Depends on: Accounting Period DocType, Period Closing Log DocType
- Used by: Transaction validation middleware, API endpoints
- Integrates with: Period closing workflow, audit trail system

## API Usage Example

### Check if Transaction is Restricted

```typescript
const response = await fetch('/api/accounting-period/check-restriction', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    company: 'Batasku',
    posting_date: '2024-01-15',
    doctype: 'Journal Entry',
    docname: 'JE-001',
    user: 'user@example.com',
    userRoles: ['Accounts User'],
  }),
});

const result = await response.json();

if (result.data.allowed) {
  // Proceed with transaction
} else {
  // Show error: result.data.reason
}
```

### Programmatic Validation

```typescript
import { validateTransactionAgainstClosedPeriod } from '@/lib/accounting-period-restrictions';

const result = await validateTransactionAgainstClosedPeriod({
  company: 'Batasku',
  posting_date: '2024-01-15',
  doctype: 'Journal Entry',
  docname: 'JE-001',
  user: 'user@example.com',
  userRoles: ['Accounts User'],
});

if (result.allowed) {
  if (result.requiresLogging) {
    // Log administrator override
    await logAdministratorOverride({
      period: result.period!,
      doctype: 'Journal Entry',
      docname: 'JE-001',
      user: 'user@example.com',
      action: 'create',
      reason: 'Correction required',
    });
  }
  // Proceed with transaction
} else {
  throw new Error(result.reason);
}
```

## Troubleshooting

### Common Issues

1. **"ERP API credentials not configured"**
   - Check `.env.local` file exists
   - Verify `ERP_API_KEY` and `ERP_API_SECRET` are set
   - Restart the test if environment was just configured

2. **"Period already exists"**
   - Previous test run didn't clean up properly
   - Manually delete test periods from ERPNext
   - Test will skip duplicate entries automatically

3. **"Cannot connect to ERPNext"**
   - Verify ERPNext server is running
   - Check `ERPNEXT_API_URL` is correct
   - Test network connectivity

4. **"API endpoint not found"**
   - Ensure Next.js dev server is running
   - Check API route file exists
   - Verify route path is correct

## Maintenance

### Adding New Test Cases

1. For property tests: Add new test function to `accounting-period-restrictions.pbt.test.ts`
2. For unit tests: Add new test function to `accounting-period-restrictions-unit.test.ts`
3. Update this README with new test coverage
4. Ensure cleanup is handled properly

### Modifying Business Rules

If business rules change:
1. Update `lib/accounting-period-restrictions.ts`
2. Update test expectations in both test files
3. Update this README documentation
4. Run all tests to verify changes

## Related Documentation

- [Accounting Period Closing Design](../.kiro/specs/accounting-period-closing/design.md)
- [Accounting Period Closing Requirements](../.kiro/specs/accounting-period-closing/requirements.md)
- [Accounting Period Closing Tasks](../.kiro/specs/accounting-period-closing/tasks.md)
- [Accounting Period Validation Tests](./accounting-period-validation.pbt.test.ts)
- [Accounting Period Closing Journal Tests](./accounting-period-closing-journal.pbt.test.ts)
