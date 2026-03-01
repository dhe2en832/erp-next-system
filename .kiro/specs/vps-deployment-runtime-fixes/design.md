# VPS Deployment Runtime Fixes Bugfix Design

## Overview

The ERP Next.js application deployed on VPS is experiencing runtime errors due to field permission restrictions and doctype access issues on the ERPNext backend. The system fails when attempting to validate bank reconciliation using restricted `clearance_date` fields and when accessing restricted Salary Slip doctypes during accounting period validation. This fix implements graceful error handling to skip restricted validations while maintaining full functionality when permissions are available.

## Glossary

- **Bug_Condition (C)**: The condition that triggers runtime errors - when field permissions or doctype access are restricted during validation checks
- **Property (P)**: The desired behavior when restrictions are encountered - graceful degradation with informational logging instead of runtime errors
- **Preservation**: Existing validation behavior when permissions are available and other validation functions that must remain unchanged
- **clearance_date**: Field in GL Entry doctype used for bank reconciliation validation that may be restricted
- **Salary Slip**: ERPNext doctype for payroll entries that may have restricted access
- **DataError**: ERPNext API error thrown when field permissions are insufficient
- **Accounting Period Validation**: The validation process that checks various transaction types during period operations

## Bug Details

### Fault Condition

The bug manifests when the accounting period validation system attempts to access restricted fields or doctypes on the ERPNext backend. The validation functions are either encountering field permission restrictions for `clearance_date` in GL Entry queries, facing doctype access restrictions for Salary Slip queries, or both, causing runtime errors that destabilize the system.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type ValidationRequest
  OUTPUT: boolean
  
  RETURN (input.validationType == "bank_reconciliation" 
          AND fieldRestricted("clearance_date", "GL Entry"))
         OR (input.validationType == "payroll_entries"
          AND doctypeRestricted("Salary Slip"))
         AND runtimeErrorThrown(input)
END FUNCTION
```

### Examples

- **Bank Reconciliation Validation**: System calls GL Entry query with `clearance_date` field → ERPNext returns "Field not permitted in query: clearance_date" DataError → System throws runtime error and logs failure
- **Payroll Validation**: System attempts to fetch Salary Slip list → ERPNext returns access denied → System throws "Failed to fetch Salary Slip list" error and logs failure  
- **Combined Restrictions**: Both validations fail in sequence → Multiple runtime errors logged in PM2 → System reliability compromised
- **Edge Case - Partial Permissions**: Some fields accessible but `clearance_date` restricted → Validation partially succeeds but still throws error for restricted field

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Full validation checks must continue to work when field permissions and doctype access are available
- Other validation functions (draft transactions, sales invoices, purchase invoices, inventory transactions) must remain completely unaffected
- Accounting period validation API must continue to return complete results when proper permissions exist

**Scope:**
All validation requests that do NOT involve restricted fields or doctypes should be completely unaffected by this fix. This includes:
- Validation calls with full permissions
- Other validation types not involving bank reconciliation or payroll
- API responses when no restrictions are present

## Hypothesized Root Cause

Based on the bug description, the most likely issues are:

1. **Missing Permission Checks**: The validation functions do not check field/doctype permissions before making API calls
   - Bank reconciliation validation directly queries `clearance_date` without checking if field is accessible
   - Payroll validation attempts Salary Slip access without verifying doctype permissions

2. **Inadequate Error Handling**: The system lacks graceful error handling for permission-related API failures
   - DataError exceptions are not caught and handled appropriately
   - Failed API calls cause the entire validation process to throw runtime errors

3. **All-or-Nothing Validation Logic**: The validation system expects all checks to succeed rather than gracefully degrading
   - No fallback mechanisms when specific validations cannot be performed
   - Missing logic to continue operation when some validations are restricted

4. **Insufficient Logging Strategy**: Error logging does not distinguish between critical errors and permission restrictions
   - Permission restrictions logged as errors rather than informational messages
   - No clear indication that system can continue operating despite restrictions

## Correctness Properties

Property 1: Fault Condition - Graceful Permission Restriction Handling

_For any_ validation request where field permissions or doctype access are restricted (isBugCondition returns true), the fixed validation system SHALL gracefully skip the restricted validation, log an informational message, and continue operation without throwing runtime errors.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Full Validation When Permissions Available

_For any_ validation request where field permissions and doctype access are NOT restricted (isBugCondition returns false), the fixed validation system SHALL produce exactly the same validation results as the original system, preserving all existing validation functionality and API response formats.

**Validates: Requirements 3.1, 3.2, 3.3**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `lib/accounting-period-validation.ts` (or similar validation utility file)

**Function**: Bank reconciliation and payroll validation functions

**Specific Changes**:
1. **Add Permission Checking**: Implement pre-validation checks for field and doctype permissions
   - Check if `clearance_date` field is accessible before GL Entry queries
   - Verify Salary Slip doctype access before attempting queries

2. **Implement Graceful Error Handling**: Wrap API calls in try-catch blocks with specific error type handling
   - Catch DataError exceptions for field permission issues
   - Catch access denied errors for doctype restrictions
   - Continue validation process instead of throwing errors

3. **Add Fallback Validation Logic**: Implement alternative validation approaches when restrictions are encountered
   - Skip bank reconciliation validation when `clearance_date` is restricted
   - Skip payroll validation when Salary Slip access is denied
   - Return partial validation results with clear indication of skipped checks

4. **Improve Logging Strategy**: Replace error logging with appropriate log levels for different scenarios
   - Log permission restrictions as informational messages
   - Maintain error logging only for actual system failures
   - Include context about which validations were skipped

5. **Update API Response Format**: Ensure API responses clearly indicate which validations were performed vs skipped
   - Add metadata about validation completeness
   - Include information about any restrictions encountered
   - Maintain backward compatibility with existing response format

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Fault Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that simulate restricted field/doctype scenarios and assert that validation functions handle restrictions gracefully. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **Bank Reconciliation Restriction Test**: Mock ERPNext API to return "Field not permitted" for `clearance_date` queries (will fail on unfixed code)
2. **Salary Slip Access Restriction Test**: Mock ERPNext API to return access denied for Salary Slip doctype (will fail on unfixed code)  
3. **Combined Restrictions Test**: Mock both field and doctype restrictions in single validation request (will fail on unfixed code)
4. **Partial Permission Test**: Mock scenario where some fields accessible but `clearance_date` restricted (may fail on unfixed code)

**Expected Counterexamples**:
- Runtime errors thrown when field permissions are restricted
- Possible causes: missing permission checks, inadequate error handling, all-or-nothing validation logic

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := validationFunction_fixed(input)
  ASSERT gracefulBehavior(result) AND noRuntimeErrors(result)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT validationFunction_original(input) = validationFunction_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-restricted scenarios

**Test Plan**: Observe behavior on UNFIXED code first for unrestricted validation scenarios, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Full Permission Preservation**: Observe that all validations work correctly on unfixed code when permissions are available, then write test to verify this continues after fix
2. **Other Validation Preservation**: Observe that non-bank/payroll validations work correctly on unfixed code, then write test to verify this continues after fix
3. **API Response Format Preservation**: Observe that API response format is consistent on unfixed code, then write test to verify format remains unchanged after fix

### Unit Tests

- Test permission checking logic for various field/doctype combinations
- Test error handling for different types of ERPNext API errors
- Test that graceful degradation produces expected log messages and response formats

### Property-Based Tests

- Generate random validation requests with varying permission scenarios to verify graceful handling
- Generate random ERPNext API error responses to verify robust error handling
- Test that all non-restricted validation scenarios continue to work across many configurations

### Integration Tests

- Test full accounting period validation flow with restricted permissions
- Test system stability under various permission restriction combinations
- Test that PM2 logs show informational messages instead of runtime errors when restrictions are encountered