# Implementation Plan

## Bug 1: Journal Entry Totals Showing Zero

- [x] 1. Write bug condition exploration test for journal totals
  - **Property 1: Fault Condition** - Journal Entry Totals Display Zero Despite Non-Zero Accounts
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate journal entries with non-zero account entries display zero totals
  - **Scoped PBT Approach**: Scope the property to journal entries that have accounts with non-zero debit/credit amounts
  - Test that journal entries with accounts containing debit/credit amounts display the correct sum in total_debit/total_credit fields
  - Verify the bug condition: `(entry.total_debit === 0 OR entry.total_credit === 0) AND (sum(accounts[*].debit) > 0 OR sum(accounts[*].credit) > 0)`
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found (e.g., "Journal Entry JV-001 with 3 accounts totaling 1,000,000 debit displays 0")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Write preservation property tests for journal list (BEFORE implementing fix)
  - **Property 2: Preservation** - Journal List Filtering and Display Behavior
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for journal entries that display correctly
  - Write property-based tests capturing observed behavior patterns:
    - Filtering by company, date range, voucher_type, status continues to work
    - Pagination with limit_page_length and start parameters continues to work
    - Other fields (name, voucher_type, posting_date, user_remark, status) continue to display correctly
    - API response structure remains unchanged
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 3. Fix for journal entry totals showing zero

  - [x] 3.1 Investigate and fix the root cause
    - Add console logging to track total_debit and total_credit values through the data flow
    - Verify the API `/api/finance/journal` is returning correct total_debit and total_credit values
    - Check if the issue is in the API calculation, data serialization, or frontend display
    - If API is correct, verify frontend is reading the correct fields from the response
    - If values are genuinely 0, verify the journal entries have accounts with non-zero amounts
    - Apply the appropriate fix based on findings
    - _Bug_Condition: (entry.total_debit === 0 OR entry.total_credit === 0) AND (accounts.length > 0 AND sum(accounts[*].debit) > 0 OR sum(accounts[*].credit) > 0)_
    - _Expected_Behavior: total_debit === sum(accounts[*].debit_in_account_currency OR accounts[*].debit) AND total_credit === sum(accounts[*].credit_in_account_currency OR accounts[*].credit)_
    - _Preservation: Filter, pagination, and field display behavior from design_
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Journal Entry Totals Display Correctly
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Journal List Filtering and Display Behavior
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)

- [x] 4. Checkpoint - Ensure all Bug 1 tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Bug 2: Item Field Not Refilling in Edit Mode

- [x] 5. Write bug condition exploration test for item field
  - **Property 1: Fault Condition** - Custom Financial Cost Percent Field Not Populated in Edit Mode
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate items with non-zero custom_financial_cost_percent display 0 in edit mode
  - **Scoped PBT Approach**: Scope the property to items that have non-zero custom_financial_cost_percent values in ERPNext
  - Test that when editing an item with custom_financial_cost_percent > 0, the form displays the correct value
  - Verify the bug condition: `(mode === "edit") AND (item.custom_financial_cost_percent > 0) AND (formData.custom_financial_cost_percent === 0)`
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found (e.g., "Item ITEM-001 with custom_financial_cost_percent=5.5 displays 0 in form")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.4, 1.5_

- [x] 6. Write preservation property tests for item form (BEFORE implementing fix)
  - **Property 2: Preservation** - Item Form Field Population Behavior
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for item fields that populate correctly
  - Write property-based tests capturing observed behavior patterns:
    - All other fields (item_code, item_name, description, item_group, stock_uom, opening_stock, valuation_rate, standard_rate, last_purchase_rate, brand) populate correctly in edit mode
    - When creating a new item, custom_financial_cost_percent initializes to 0 as default
    - When user manually enters a value in custom_financial_cost_percent field, system accepts and saves it correctly
    - fetchItemPricing function continues to fetch and update pricing fields without affecting other fields
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.4, 3.5, 3.6_

- [x] 7. Fix for item field not refilling in edit mode

  - [x] 7.1 Investigate and fix the root cause
    - Add console logging to track custom_financial_cost_percent value through the data flow
    - Log the API response from `/api/inventory/items/[item_code]` to verify it includes custom_financial_cost_percent
    - Log the value when setting formData in fetchItemDetails
    - Log the value after fetchItemPricing completes
    - Verify the field name matches between API and frontend
    - If API returns null/undefined, investigate why ERPNext is not returning the field
    - If API returns correct value but form shows 0, fix the state management issue
    - Apply the appropriate fix based on findings
    - _Bug_Condition: (mode === "edit") AND (item.custom_financial_cost_percent > 0) AND (formData.custom_financial_cost_percent === 0)_
    - _Expected_Behavior: formData.custom_financial_cost_percent === item.custom_financial_cost_percent_
    - _Preservation: Other field population, create mode default, manual input, and pricing fetch behavior from design_
    - _Requirements: 1.4, 1.5, 2.4, 2.5, 3.4, 3.5, 3.6_

  - [x] 7.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Custom Financial Cost Percent Field Populates Correctly
    - **IMPORTANT**: Re-run the SAME test from task 5 - do NOT write a new test
    - The test from task 5 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 5
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.4, 2.5_

  - [x] 7.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Item Form Field Population Behavior
    - **IMPORTANT**: Re-run the SAME tests from task 6 - do NOT write new tests
    - Run preservation property tests from step 6
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)

- [x] 8. Checkpoint - Ensure all Bug 2 tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Final Verification

- [x] 9. End-to-end verification
  - Verify Bug 1 fix: Create test journal entries with known amounts and verify totals display correctly on Kas Masuk/Kas Keluar pages
  - Verify Bug 2 fix: Create test items with various custom_financial_cost_percent values and verify they display correctly in edit mode
  - Verify no regressions: Test filtering, pagination, and other field displays still work correctly
  - Document any findings or edge cases discovered during testing
