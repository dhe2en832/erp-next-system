# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Fault Condition** - Status Badge Missing in Desktop View and Stale Data After Operations
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bugs exist
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate both bugs exist
  - **Scoped PBT Approach**: Test concrete failing cases - desktop viewport without status column AND submit operation with stale data
  - Test Bug 1: Render component with viewport width 1024px, verify status badge is NOT rendered in table rows (from Fault Condition in design)
  - Test Bug 2: Submit a Draft invoice, immediately check if list shows updated status (will show stale data on unfixed code)
  - The test assertions should match the Expected Behavior Properties from design (status badges visible in desktop view AND fresh data after operations)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bugs exist)
  - Document counterexamples found: missing status column elements in desktop table, stale status after submit operation
  - Mark task complete when test is written, run, and failures are documented
  - _Requirements: 2.1, 2.2_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Mobile Card Layout and Other Features Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (mobile view, filtering, pagination, actions)
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements
  - Test mobile card layout: Render with viewport width 375px, verify card layout and status badge position
  - Test filter functionality: Apply various filter combinations, verify results
  - Test pagination: Navigate through pages, verify pagination controls work
  - Test action buttons: Verify print/submit/payment handlers execute correctly
  - Test row navigation: Click invoice rows, verify navigation to detail view
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix for missing status column in desktop view and stale data after operations

  - [x] 3.1 Add status column to desktop grid layout
    - Modify grid from `grid-cols-12` to `grid-cols-13` OR adjust existing column spans
    - Recommended layout: Document (col-span-2), Status (col-span-1), Dates (col-span-2 each), Total (col-span-2), Payment (col-span-2), Actions (col-span-1)
    - Position status column between document/customer and posting date for logical flow
    - _Bug_Condition: isBugCondition(input) where input.viewMode == 'desktop' AND statusColumnMissing()_
    - _Expected_Behavior: statusColumnExists(result) AND statusBadgesRendered(result) from design_
    - _Preservation: Mobile card layout, status badge styling, all other list functionality from design_
    - _Requirements: 2.1, 3.1, 3.2_

  - [x] 3.2 Add status badge rendering in desktop layout
    - Insert status badge rendering code in desktop row layout section (around line 740-800)
    - Use existing getStatusLabel and getStatusBadgeClass functions
    - Ensure badge styling matches mobile view (same classes, same translations)
    - _Bug_Condition: isBugCondition(input) where input.viewMode == 'desktop' AND statusColumnMissing()_
    - _Expected_Behavior: statusBadgesRendered(result) with proper styling from design_
    - _Preservation: Status badge styling using STATUS_LABELS and STATUS_COLORS mappings from design_
    - _Requirements: 2.1, 3.1, 3.2_

  - [x] 3.3 Update table header with status column
    - Add "Status" header label in desktop table header section (around line 620-630)
    - Position to match the new status column in data rows
    - Use uppercase styling consistent with other headers
    - _Bug_Condition: isBugCondition(input) where input.viewMode == 'desktop' AND statusColumnMissing()_
    - _Expected_Behavior: statusColumnExists(result) in table header from design_
    - _Preservation: Grid column layout for other columns maintains proper alignment from design_
    - _Requirements: 2.1, 3.3_

  - [x] 3.4 Implement cache-busting in fetchInvoices
    - Add timestamp parameter to API requests: `params.append('_t', Date.now().toString())`
    - Place parameter addition before fetch call (around line 240)
    - Prevents browser from returning cached responses
    - _Bug_Condition: isBugCondition(input) where input.operation IN ['submit', 'payment', 'navigation'] AND dataIsStale()_
    - _Expected_Behavior: dataIsFresh(result) AND cacheBustingApplied(result) from design_
    - _Preservation: All filtering functionality continues to work from design_
    - _Requirements: 2.2, 2.3, 3.3_

  - [x] 3.5 Add forced refresh on component mount
    - Add useEffect that triggers fetchInvoices when component mounts after navigation
    - Ensures fresh data when users return to list from detail view
    - May need to detect navigation events or use ref to track mount source
    - _Bug_Condition: isBugCondition(input) where input.operation == 'navigation' AND dataIsStale()_
    - _Expected_Behavior: dataIsFresh(result) after navigation from design_
    - _Preservation: All other list features remain unchanged from design_
    - _Requirements: 2.3, 3.5_

  - [x] 3.6 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Status Badge Visible and Fresh Data
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bugs are fixed)
    - Verify status badges render in desktop table rows
    - Verify fresh data displays after submit operations
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.7 Verify preservation tests still pass
    - **Property 2: Preservation** - Mobile Card Layout and Other Features Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm mobile card layout unchanged
    - Confirm filtering, pagination, actions, navigation all work identically
    - Confirm all tests still pass after fix (no regressions)

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
