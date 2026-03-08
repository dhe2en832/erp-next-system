# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Fault Condition** - Deny Access When Roles Not Loaded
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to concrete failing cases: empty roles array, undefined roles, null roles
  - Test that `canSeeCategory(anyCategory, [])` returns false for all categories (from Fault Condition in design)
  - Test that `filterItems(anyItems, [])` returns empty array (from Fault Condition in design)
  - Test that `filterSubCategories(anySubCategories, [])` returns empty array (from Fault Condition in design)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found: which functions return permissive values when roles are empty
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Existing Role-Based Filtering
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (roles properly loaded)
  - Test System Manager sees all menus (observe on unfixed code, then capture in test)
  - Test Sales User sees Dashboard, Penjualan, Master Data only (observe on unfixed code, then capture in test)
  - Test Multiple Roles (Sales User + Purchase User) sees Dashboard, Penjualan, Pembelian, Master Data (observe on unfixed code, then capture in test)
  - Test Accounts User sees Dashboard, Kas & Bank, Akunting, Laporan (observe on unfixed code, then capture in test)
  - Test item-level filtering with allowedRoles property (observe on unfixed code, then capture in test)
  - Test Laporan category special logic (shown only if user has access to at least one sub-item) (observe on unfixed code, then capture in test)
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_

- [x] 3. Fix for role-based menu access control

  - [x] 3.1 Implement the fix in Navbar.tsx
    - Fix `canSeeCategory` function (line 454): Change `if (!roles || roles.length === 0) return true;` to `return false;`
    - Fix `filterItems` function (line 479): Change `if (!roles || roles.length === 0) return items;` to `return [];`
    - Fix `filterSubCategories` function (line 485): Change `if (!roles || roles.length === 0) return subCategories;` to `return [];`
    - Verify System Manager bypass logic remains after empty roles check (already correct - no change needed)
    - Verify roleCategoryMap logic remains unchanged (already correct - no change needed)
    - _Bug_Condition: isBugCondition(input) where input.roles is empty, undefined, or null_
    - _Expected_Behavior: canSeeCategory returns false, filterItems returns [], filterSubCategories returns [] when roles not loaded_
    - _Preservation: System Manager access, roleCategoryMap filtering, allowedRoles filtering, Laporan category logic, menu navigation, mobile menu functionality_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Deny Access When Roles Not Loaded
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Existing Role-Based Filtering
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
