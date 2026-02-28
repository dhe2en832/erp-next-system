# Payment Due Date Calculation Fix - Bugfix Design

## Overview

The Sales Invoice creation flow incorrectly calculates the payment due date when using payment terms templates. When a Sales Invoice is created from a Delivery Note with a payment terms template (e.g., NET 30), the due date is set to the same date as the invoice date instead of being calculated as invoice_date + credit_days. This bug occurs in the `calculateDueDate` function in `app/invoice/siMain/component.tsx`, which returns the posting date without adding the credit_days value fetched from the payment terms template.

The fix will ensure that the `calculateDueDate` function correctly adds the credit_days from the payment terms template to the posting date, while preserving all existing behavior for manual due date entry and default calculations.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when a Sales Invoice is created from a Delivery Note with a payment terms template, and the calculateDueDate function is called
- **Property (P)**: The desired behavior - the due date should equal posting_date + credit_days from the payment terms template
- **Preservation**: Existing behavior that must remain unchanged - manual due date entry, default 30-day calculation when no payment terms exist, and due date display in edit mode
- **calculateDueDate**: The async function in `app/invoice/siMain/component.tsx` (lines 358-380) that calculates the due date based on posting date and sales order payment terms
- **credit_days**: The number of days specified in the payment terms template that should be added to the invoice date to calculate the due date
- **payment_terms_template**: The ERPNext document that defines payment terms including credit_days, stored on the Sales Order
- **addDays**: Helper function (lines 382-386) that adds a specified number of days to a date string

## Bug Details

### Fault Condition

The bug manifests when a Sales Invoice is created from a Delivery Note, and the `calculateDueDate` function is called to determine the due date based on the payment terms template from the associated Sales Order. The function successfully fetches the payment terms template and credit_days value, but then returns the posting date without adding the credit_days.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { postingDate: string, salesOrderName: string, paymentTermsTemplate: string, creditDays: number }
  OUTPUT: boolean
  
  RETURN input.salesOrderName IS NOT EMPTY
         AND input.paymentTermsTemplate IS NOT EMPTY
         AND input.creditDays > 0
         AND calculateDueDate(input.postingDate, input.salesOrderName) RETURNS input.postingDate
         AND NOT (input.postingDate + input.creditDays)
END FUNCTION
```

### Examples

- **Example 1**: Sales Invoice created from Delivery Note with NET 30 payment terms
  - Input: posting_date = "2026-02-28", sales_order = "SO-001", payment_terms_template = "NET 30", credit_days = 30
  - Current (incorrect): due_date = "2026-02-28" (same as posting date)
  - Expected (correct): due_date = "2026-03-30" (30 days after posting date)

- **Example 2**: Sales Invoice created from Delivery Note with NET 60 payment terms
  - Input: posting_date = "2026-01-15", sales_order = "SO-002", payment_terms_template = "NET 60", credit_days = 60
  - Current (incorrect): due_date = "2026-01-15" (same as posting date)
  - Expected (correct): due_date = "2026-03-16" (60 days after posting date)

- **Example 3**: Sales Invoice created from Delivery Note with NET 15 payment terms
  - Input: posting_date = "2026-03-01", sales_order = "SO-003", payment_terms_template = "NET 15", credit_days = 15
  - Current (incorrect): due_date = "2026-03-01" (same as posting date)
  - Expected (correct): due_date = "2026-03-16" (15 days after posting date)

- **Edge Case**: Sales Invoice created without payment terms template
  - Input: posting_date = "2026-02-28", sales_order = "", payment_terms_template = "", credit_days = 0
  - Expected: due_date = "2026-03-30" (default 30 days after posting date)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Manual due date entry must continue to work - users can still edit the due date field directly
- Default 30-day calculation must continue when no payment terms template exists
- Due date display in edit/view mode must remain unchanged
- Due date validation (must be >= posting date) must continue to work
- Due date recalculation when posting date changes must remain optional (not automatic)

**Scope:**
All inputs that do NOT involve the calculateDueDate function with a valid payment terms template should be completely unaffected by this fix. This includes:
- Manual Sales Invoice creation (not from Delivery Note)
- Sales Invoices created from Delivery Notes without payment terms templates
- Editing existing Sales Invoices (due date should not be recalculated)
- Direct user input to the due date field

## Hypothesized Root Cause

Based on the bug description and code analysis, the most likely issue is:

1. **Missing Return Statement**: The `calculateDueDate` function (lines 358-380) successfully fetches the credit_days value from the payment terms template but does not return the result of calling `addDays(postingDate, creditDays)`. Instead, it appears to return the posting date directly or the function execution path does not reach the correct return statement.

2. **Incorrect Variable Reference**: The function may be returning `postingDate` instead of the calculated due date after adding credit_days.

3. **Async/Await Issue**: The function may not be properly awaiting the result of the date calculation, causing it to return prematurely.

4. **Logic Flow Error**: The conditional logic may be incorrectly structured, causing the function to exit early without performing the date addition.

## Correctness Properties

Property 1: Fault Condition - Payment Terms Credit Days Applied

_For any_ Sales Invoice creation where a Delivery Note is selected, a Sales Order with a payment terms template exists, and the payment terms template specifies credit_days > 0, the calculateDueDate function SHALL return a due date equal to posting_date + credit_days, causing the Sales Invoice to have the correct payment due date.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Default Calculation Unchanged

_For any_ Sales Invoice creation where no payment terms template exists or the payment terms template cannot be fetched, the calculateDueDate function SHALL return a due date equal to posting_date + 30 days (default), preserving the existing fallback behavior.

**Validates: Requirements 2.4, 3.1**

Property 3: Preservation - Manual Due Date Entry

_For any_ Sales Invoice creation or editing where the user manually enters or modifies the due date field, the system SHALL accept and save the user-specified due date without overwriting it with a calculated value, preserving manual override capability.

**Validates: Requirements 3.2, 3.3**

Property 4: Preservation - Edit Mode Due Date Display

_For any_ Sales Invoice opened in edit or view mode, the system SHALL display the existing due date from the saved document without recalculating it, preserving the historical due date value.

**Validates: Requirements 3.4, 3.5**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `app/invoice/siMain/component.tsx`

**Function**: `calculateDueDate` (lines 358-380)

**Specific Changes**:
1. **Verify Return Statement**: Ensure that when credit_days is successfully fetched, the function returns `addDays(postingDate, creditDays)` instead of just `postingDate`
   - Check line 375: should be `return addDays(postingDate, creditDays);`
   - Verify that this return statement is actually being executed

2. **Add Debug Logging**: Add console.log statements to trace the execution flow and verify that credit_days is being fetched correctly
   - Log the fetched credit_days value
   - Log the calculated due date before returning

3. **Verify Async/Await Chain**: Ensure that the function properly awaits all async operations and returns the final calculated date
   - Verify that `await calculateDueDate(postingDate, firstSOName)` is used when calling the function (line 476)

4. **Add Error Handling**: Ensure that any errors in fetching payment terms don't cause the function to return undefined or the wrong value
   - Verify the try-catch block properly handles errors and falls back to default calculation

5. **Code Comparison**: Compare the implementation with the working version in `utils/accounting-period-utils.ts` (lines 40-72) to identify any differences
   - The working version in accounting-period-utils.ts correctly returns `addDays(postingDate, creditDays)`
   - Ensure the component version follows the same pattern

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Fault Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that create Sales Invoices from Delivery Notes with various payment terms templates and assert that the due date equals posting_date + credit_days. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **NET 30 Test**: Create SI from DN with NET 30 payment terms, posting_date = "2026-02-28" (will fail on unfixed code - expects due_date = "2026-03-30", gets "2026-02-28")
2. **NET 60 Test**: Create SI from DN with NET 60 payment terms, posting_date = "2026-01-15" (will fail on unfixed code - expects due_date = "2026-03-16", gets "2026-01-15")
3. **NET 15 Test**: Create SI from DN with NET 15 payment terms, posting_date = "2026-03-01" (will fail on unfixed code - expects due_date = "2026-03-16", gets "2026-03-01")
4. **No Payment Terms Test**: Create SI from DN without payment terms template (should pass on unfixed code - expects due_date = posting_date + 30 days)

**Expected Counterexamples**:
- Due date equals posting date instead of posting_date + credit_days
- Possible causes: missing return statement, incorrect variable reference, async/await issue, or logic flow error

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := calculateDueDate_fixed(input.postingDate, input.salesOrderName)
  ASSERT result = addDays(input.postingDate, input.creditDays)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT calculateDueDate_original(input) = calculateDueDate_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for manual due date entry and default calculations, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Manual Due Date Entry Preservation**: Observe that manually entered due dates are saved correctly on unfixed code, then write test to verify this continues after fix
2. **Default Calculation Preservation**: Observe that due dates default to posting_date + 30 days when no payment terms exist on unfixed code, then write test to verify this continues after fix
3. **Edit Mode Preservation**: Observe that existing due dates are displayed correctly in edit mode on unfixed code, then write test to verify this continues after fix
4. **No Sales Order Preservation**: Observe that due dates are calculated correctly when no sales order is provided on unfixed code, then write test to verify this continues after fix

### Unit Tests

- Test calculateDueDate with valid payment terms template (NET 30, NET 60, NET 15)
- Test calculateDueDate with no payment terms template (should default to 30 days)
- Test calculateDueDate with invalid sales order name (should default to 30 days)
- Test calculateDueDate with payment terms template but no credit_days (should default to 30 days)
- Test addDays helper function with various date strings and day counts
- Test edge cases: leap years, month boundaries, year boundaries

### Property-Based Tests

- Generate random posting dates and credit_days values, verify calculateDueDate returns posting_date + credit_days
- Generate random Sales Invoice scenarios with and without payment terms, verify due date calculation is correct
- Generate random manual due date entries, verify they are preserved and not overwritten
- Test that all non-payment-terms-related due date scenarios continue to work across many random inputs

### Integration Tests

- Test full Sales Invoice creation flow from Delivery Note with NET 30 payment terms
- Test full Sales Invoice creation flow from Delivery Note with NET 60 payment terms
- Test full Sales Invoice creation flow from Delivery Note without payment terms
- Test manual Sales Invoice creation with manual due date entry
- Test editing existing Sales Invoice and verifying due date is not recalculated
- Test that due date validation (>= posting date) continues to work after fix
