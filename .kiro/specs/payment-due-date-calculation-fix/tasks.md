# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Fault Condition** - Payment Terms Credit Days Applied
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: For deterministic bugs, scope the property to the concrete failing case(s) to ensure reproducibility
  - Test that calculateDueDate returns posting_date + credit_days when payment terms template exists
  - Test cases to implement:
    - NET 30: posting_date = "2026-02-28", sales_order with NET 30 template (credit_days = 30), expect due_date = "2026-03-30"
    - NET 60: posting_date = "2026-01-15", sales_order with NET 60 template (credit_days = 60), expect due_date = "2026-03-16"
    - NET 15: posting_date = "2026-03-01", sales_order with NET 15 template (credit_days = 15), expect due_date = "2026-03-16"
  - Run test on UNFIXED code (app/invoice/siMain/component.tsx, lines 358-380)
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found: due_date equals posting_date instead of posting_date + credit_days
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Default Calculation and Manual Entry Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs:
    - Manual due date entry: user can directly edit due_date field
    - Default calculation: when no payment terms exist, due_date = posting_date + 30 days
    - Edit mode display: existing due_date is shown without recalculation
    - No sales order: due_date defaults to posting_date + 30 days
  - Write property-based tests capturing observed behavior patterns:
    - Test manual due date entry is preserved and not overwritten
    - Test default 30-day calculation when no payment terms template exists
    - Test due date display in edit mode shows existing value
    - Test due date calculation when no sales order is provided
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 2.4, 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix for payment due date calculation

  - [x] 3.1 Implement the fix in calculateDueDate function
    - File: app/invoice/siMain/component.tsx (lines 358-380)
    - Verify return statement: ensure function returns addDays(postingDate, creditDays) when credit_days is fetched
    - Check line 375: should be `return addDays(postingDate, creditDays);`
    - Verify async/await chain: ensure function properly awaits all async operations
    - Add error handling: ensure errors in fetching payment terms fall back to default calculation
    - Compare with working version in utils/accounting-period-utils.ts (lines 40-72) to identify differences
    - _Bug_Condition: isBugCondition(input) where input.salesOrderName IS NOT EMPTY AND input.paymentTermsTemplate IS NOT EMPTY AND input.creditDays > 0_
    - _Expected_Behavior: calculateDueDate returns addDays(postingDate, creditDays) when payment terms template exists_
    - _Preservation: Manual due date entry, default 30-day calculation, edit mode display, and no-sales-order scenarios must remain unchanged_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Payment Terms Credit Days Applied
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - Verify all test cases pass:
      - NET 30: due_date = "2026-03-30" (30 days after "2026-02-28")
      - NET 60: due_date = "2026-03-16" (60 days after "2026-01-15")
      - NET 15: due_date = "2026-03-16" (15 days after "2026-03-01")
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Default Calculation and Manual Entry Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all preservation tests still pass:
      - Manual due date entry works correctly
      - Default 30-day calculation when no payment terms
      - Edit mode displays existing due date
      - No sales order defaults to 30 days
    - _Requirements: 2.4, 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. Add integration tests
  - Test full Sales Invoice creation flow from Delivery Note with NET 30 payment terms
  - Test full Sales Invoice creation flow from Delivery Note with NET 60 payment terms
  - Test full Sales Invoice creation flow from Delivery Note without payment terms
  - Test manual Sales Invoice creation with manual due date entry
  - Test editing existing Sales Invoice and verifying due date is not recalculated
  - Test that due date validation (>= posting date) continues to work after fix
  - Test edge cases: leap years, month boundaries, year boundaries
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5_
a
- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise
