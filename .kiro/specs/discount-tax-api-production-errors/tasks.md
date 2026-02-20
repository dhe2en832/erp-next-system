# Implementation Plan

- [x] 1. Write bug condition exploration tests
  - **Property 1: Fault Condition** - Production API and Build Errors
  - **CRITICAL**: These tests MUST FAIL on unfixed code - failure confirms the bugs exist
  - **DO NOT attempt to fix the tests or the code when they fail**
  - **NOTE**: These tests encode the expected behavior - they will validate the fixes when they pass after implementation
  - **GOAL**: Surface counterexamples that demonstrate the three bugs exist
  - **Scoped PBT Approach**: Scope properties to concrete failing cases for reproducibility
  - Test Bug 1: GET request to `/api/sales/invoices` with discount fields in query fails with "Field not permitted in query" error
  - Test Bug 1: GET request to `/api/purchase/invoices` with discount fields in query fails with "Field not permitted in query" error
  - Test Bug 2: GET request to `/api/setup/tax-templates?type=Sales` without company parameter fails with 400 error
  - Test Bug 3: Build process for Purchase Invoice form fails with "Module not found" error for invoice component imports
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct - it proves the bugs exist)
  - Document counterexamples found to understand root causes
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 2. Write preservation property tests (BEFORE implementing fixes)
  - **Property 2: Preservation** - Non-Buggy Behavior Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements
  - Property-based testing generates many test cases for stronger guarantees
  - Test: POST requests to create invoices with discount fields continue to work
  - Test: GET requests for single invoice details return all fields including discounts
  - Test: GET requests to tax template API with valid type and company parameters work correctly
  - Test: Sales Invoice form builds and functions correctly (uses different import paths)
  - Test: Other imports in Purchase Invoice form (LoadingSpinner, PrintDialog) work correctly
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3. Fix production errors for discount and tax APIs

  - [x] 3.1 Fix Bug 1: Remove discount fields from invoice list GET requests
    - In `app/api/sales/invoices/route.ts`, remove `discount_amount` and `discount_percentage` from the fields array in the ERPNext URL (line ~47)
    - In `app/api/purchase/invoices/route.ts`, remove `discount_amount` and `discount_percentage` from the fields array in the ERPNext URL (line ~138)
    - Keep all other fields unchanged in both files
    - Maintain existing response transformation logic that adds default values (0) for discount fields
    - Preserve single document fetch logic (uses `fields=["*"]` which works correctly)
    - _Bug_Condition: isBugCondition1(request) where request is GET to invoice list API with discount fields in query_
    - _Expected_Behavior: API returns 200 with invoice data, discount fields populated with default values from transformation layer_
    - _Preservation: POST requests for invoice creation, single invoice detail fetches, all other invoice fields_
    - _Requirements: 2.1, 2.2, 3.2, 3.6_

  - [x] 3.2 Fix Bug 2: Verify tax template API parameter validation
    - Review `app/api/setup/tax-templates/route.ts` to confirm company parameter validation is correct
    - Validation should return 400 error when company parameter is missing or empty
    - If frontend component calls API without company, add loading states or disable tax template selection until company is available
    - No changes needed to API code if validation is already correct
    - _Bug_Condition: isBugCondition2(request) where request is GET to tax template API without company parameter_
    - _Expected_Behavior: API returns 400 with clear error message about missing company parameter_
    - _Preservation: Tax template API with valid parameters, filtering logic, data structure_
    - _Requirements: 2.3, 3.3_

  - [x] 3.3 Fix Bug 3: Correct import paths in Purchase Invoice form
    - In `app/purchase-invoice/piMain/component.tsx`, lines 7-9, replace relative imports with absolute imports
    - Change `../../components/invoice/DiscountInput` to `@/components/invoice/DiscountInput`
    - Change `../../components/invoice/TaxTemplateSelect` to `@/components/invoice/TaxTemplateSelect`
    - Change `../../components/invoice/InvoiceSummary` to `@/components/invoice/InvoiceSummary`
    - Keep other imports unchanged (LoadingSpinner, PrintDialog use correct paths)
    - _Bug_Condition: isBugCondition3(buildProcess) where build fails with "Module not found" for invoice component imports_
    - _Expected_Behavior: Build completes successfully, all invoice components imported correctly_
    - _Preservation: Sales Invoice form imports, other Purchase Invoice imports, component functionality_
    - _Requirements: 2.4, 3.4, 3.5_

  - [x] 3.4 Verify bug condition exploration tests now pass
    - **Property 1: Expected Behavior** - Production API and Build Errors Resolved
    - **IMPORTANT**: Re-run the SAME tests from task 1 - do NOT write new tests
    - The tests from task 1 encode the expected behavior
    - When these tests pass, it confirms the expected behavior is satisfied
    - Run bug condition exploration tests from step 1
    - **EXPECTED OUTCOME**: Tests PASS (confirms bugs are fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.5 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Buggy Behavior Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fixes (no regressions)
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
