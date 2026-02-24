# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Fault Condition** - Desktop Pagination Updates Display
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to concrete failing cases: pagination button clicks in desktop mode (screen width >= 768px) where target page > 1
  - Test that clicking pagination buttons (Next, Previous, specific page numbers) in desktop mode updates the displayed items to match the target page
  - For page 2: verify items 21-40 are displayed (not items 1-20)
  - For page 3: verify items 41-60 are displayed (not items 1-20)
  - Verify API is called with correct `start` parameter: (targetPage - 1) * pageSize
  - Verify items state updates to items returned from API
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found: items remain at page 1 despite API returning correct data
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Pagination Behavior
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (mobile infinite scroll, filter changes, reset filter, item clicks, initial load)
  - Write property-based tests capturing observed behavior patterns:
    - Mobile infinite scroll appends items correctly when scrolling down
    - Filter changes reset to page 1 and show filtered results
    - Reset filter button clears all filters and returns to page 1
    - Item row clicks navigate to detail/edit page
    - API error handling displays appropriate error messages
    - Pagination info displays "Showing X to Y of Z results" correctly
    - Total pages calculation works correctly when total records change
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 3. Fix for desktop pagination display bug

  - [x] 3.1 Implement the fix in ItemList component
    - Add useRef to track pagination change source: `pageChangeSourceRef = useRef<'pagination' | 'filter' | 'init'>('init')`
    - Modify pagination onPageChange handler to set ref before updating state: `onPageChange={(page) => { pageChangeSourceRef.current = 'pagination'; setCurrentPage(page); }}`
    - Separate filter reset effect from fetch effect to prevent race conditions
    - Simplify useEffect dependencies by removing unnecessary dependencies that cause re-executions
    - Ensure fetchItems is called with reset=true for desktop pagination and items state is properly updated
    - Add enhanced logging to track state updates and their triggers
    - _Bug_Condition: isBugCondition(input) where input.action == 'pagination_click' AND input.screenWidth >= 768 AND input.targetPage > 1_
    - _Expected_Behavior: For all pagination button clicks in desktop mode, displayedItems == itemsForPage(targetPage) AND apiCalledWith.start == (targetPage - 1) * pageSize_
    - _Preservation: All non-pagination interactions (mobile infinite scroll, filter changes, reset filter, item clicks, initial load) produce exactly the same behavior as original code_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Desktop Pagination Updates Display
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - Verify items update correctly for page 2 (items 21-40), page 3 (items 41-60), etc.
    - Verify API is called with correct parameters
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Pagination Behavior
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm mobile infinite scroll still works correctly
    - Confirm filter changes still reset to page 1
    - Confirm reset filter button still works
    - Confirm item clicks still navigate correctly
    - Confirm error handling still works
    - Confirm pagination info still displays correctly

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
