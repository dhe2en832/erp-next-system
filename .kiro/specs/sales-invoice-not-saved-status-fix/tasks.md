# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Fault Condition** - Sales Invoice Cache Synchronization Bug
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: For deterministic bugs, scope the property to the concrete failing case(s) to ensure reproducibility
  - Test that Sales Invoices created via Next.js API (`POST /api/sales/invoices`) display "Not Saved" status in ERPNext UI on UNFIXED code
  - Test that Credit Note creation is blocked for API-created invoices on UNFIXED code
  - The test assertions should match the Expected Behavior: status should be "Draft" and Credit Note creation should succeed
  - Run test on UNFIXED code (temporarily remove the `frappe.client.save` call in route.ts lines 348-373)
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found:
    - Invoice name that shows "Not Saved" status
    - Error message when attempting Credit Note creation
    - Confirmation that database has docstatus=0 but UI shows "Not Saved"
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 2. Write preservation property tests (BEFORE verifying fix)
  - **Property 2: Preservation** - Non-API Creation Behavior
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (Sales Invoices NOT created via Next.js API)
  - Write property-based tests capturing observed behavior patterns:
    - Sales Invoices created directly in ERPNext UI display "Draft" status correctly
    - Sales Invoice submission via Next.js API updates status to "Submitted" correctly
    - All Sales Invoice fields persist correctly to database
    - Other CRUD operations (GET, PUT, DELETE) function without modification
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3. Verify the implemented fix

  - [x] 3.1 Review the fix implementation
    - Verify `frappe.client.save` call is present after `frappe.client.insert` (lines 348-373 in route.ts)
    - Verify cache update is wrapped in try-catch for non-blocking error handling
    - Verify logging is present for debugging
    - Verify minimal payload (only document name and doctype)
    - Verify original response is preserved for backward compatibility
    - _Bug_Condition: isBugCondition(input) where input.creationMethod == 'NextJS_API' AND input.apiMethod == 'frappe.client.insert'_
    - _Expected_Behavior: Cache is updated, status displays "Draft", Credit Note creation succeeds_
    - _Preservation: UI-based creation, API updates, submission, and other operations unchanged_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Sales Invoice Cache Synchronization Fixed
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1 with the fix in place
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - Verify Sales Invoices created via API now display "Draft" status in ERPNext UI
    - Verify Credit Note creation now succeeds for API-created invoices
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-API Creation Behavior Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2 with the fix in place
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)
    - Verify UI-based creation behavior is identical
    - Verify API update/submission behavior is identical
    - Verify all CRUD operations function correctly
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 4. Add integration tests for full workflow

  - [x] 4.1 Test successful cache update flow
    - Create Sales Invoice via Next.js UI (calls POST /api/sales/invoices)
    - Verify API response contains invoice data
    - Verify console logs show "✅ Document cache updated successfully"
    - Open invoice in ERPNext UI
    - Verify status displays "Draft" (not "Not Saved")
    - Attempt to create Credit Note
    - Verify Credit Note creation succeeds
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 4.2 Test cache update failure graceful degradation
    - Mock `frappe.client.save` to fail (simulate network timeout)
    - Create Sales Invoice via Next.js UI
    - Verify API still returns success response
    - Verify invoice is saved in database with docstatus=0
    - Verify console logs show "⚠️ Failed to update cache, but document is saved in database"
    - Verify API request does not fail despite cache update failure
    - Document that manual "Save" in ERPNext UI is required as workaround
    - _Requirements: 2.1, 2.2_

  - [x] 4.3 Test concurrent invoice creation
    - Create multiple Sales Invoices simultaneously via API
    - Verify all invoices are created successfully
    - Verify all caches are updated correctly
    - Verify no race conditions or cache corruption
    - Open all invoices in ERPNext UI
    - Verify all display "Draft" status
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 4.4 Test cross-module integration
    - Create Sales Invoice via API linked to Delivery Note
    - Verify invoice creation succeeds
    - Verify cache is updated
    - Verify Delivery Note reference is correct
    - Verify all item references (dn_detail, sales_order, so_detail) are preserved
    - Verify custom fields (custom_hpp_snapshot, custom_financial_cost_percent) are populated
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2_

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
