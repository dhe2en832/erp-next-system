# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Fault Condition** - Zero-Balance Income/Expense Accounts Excluded
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: For deterministic bugs, scope the property to the concrete failing case(s) to ensure reproducibility
  - Test that when Income/Expense accounts exist in Chart of Accounts but have no GL entries for the period, the balance API returns those accounts with debit=0, credit=0, balance=0
  - Create test accounting period and Income/Expense accounts in CoA without GL entries
  - Query `/api/accounting-period/balances/[name]` endpoint
  - Assert that all Income/Expense accounts from CoA appear in the response
  - Assert that accounts with no GL entries have debit=0, credit=0, balance=0
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found (e.g., "Account '4000 - Pendapatan Penjualan' exists in CoA but is missing from API response")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 2.1, 2.2_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Zero Balance Calculation Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for accounts with GL entries
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements
  - Property-based testing generates many test cases for stronger guarantees
  - Test 1: For accounts with GL entries, verify debit/credit/balance calculations remain unchanged
  - Test 2: Verify cumulative vs period-only filtering continues to work correctly
  - Test 3: Verify Real accounts (Asset, Liability, Equity) still show only non-zero balances
  - Test 4: Verify aggregation logic for summing debits and credits from GL entries remains unchanged
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3. Fix for zero-balance Income/Expense accounts not appearing in balance API

  - [x] 3.1 Modify calculateAllAccountBalances in route.ts
    - Fetch ALL non-group accounts from Chart of Accounts first (before GL entries query)
    - Filter: `['company', '=', period.company]`, `['is_group', '=', 0]`
    - Fields: `['name', 'account_name', 'account_type', 'root_type', 'is_group']`
    - Initialize accountMap with all accounts having zero balances: `accountMap.set(account.name, { debit: 0, credit: 0 })`
    - Query GL entries and augment the accountMap (update existing entries, don't create new ones)
    - Build results from all accounts in accountMap
    - For Income/Expense accounts: include ALL accounts (even with zero balance)
    - For Real accounts: keep existing logic (only non-zero balances)
    - _Bug_Condition: isBugCondition(input) where account.root_type IN ['Income', 'Expense'] AND account.is_group = 0 AND NOT existsGLEntry(account.name, period)_
    - _Expected_Behavior: All Income/Expense accounts from CoA returned with debit=0, credit=0, balance=0 if no GL entries exist (from Property 1)_
    - _Preservation: Balance calculation for accounts with GL entries must remain unchanged (from Property 2)_
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.1, 3.2, 3.3, 3.4_

  - [x] 3.2 Modify getNominalAccountBalances in accounting-period-closing.ts
    - Apply same CoA-first approach to ensure consistency
    - Fetch ALL Income/Expense accounts from Chart of Accounts first
    - Initialize with zero balances
    - Augment with GL entry data
    - Return all Income/Expense accounts (including zero-balance ones)
    - _Bug_Condition: Same as 3.1 - Income/Expense accounts with no GL entries_
    - _Expected_Behavior: All Income/Expense accounts returned for closing journal entry creation_
    - _Preservation: Closing journal entry logic for accounts with balances must remain unchanged_
    - _Requirements: 1.1, 2.1, 2.2, 3.1_

  - [x] 3.3 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Zero-Balance Accounts Included
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - Verify all Income/Expense accounts from CoA appear in API response
    - Verify accounts with no GL entries have debit=0, credit=0, balance=0
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.4 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Zero Balance Calculation Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)
    - Verify balance calculations for accounts with GL entries remain unchanged
    - Verify cumulative vs period-only filtering still works
    - Verify Real account filtering still works
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 4. Checkpoint - Ensure all tests pass
  - Run all exploration and preservation tests
  - Verify profit/loss summary page displays zero-balance accounts correctly
  - Verify "Tidak ada akun nominal dengan saldo" message only appears when truly no accounts exist
  - Ensure all tests pass, ask the user if questions arise
