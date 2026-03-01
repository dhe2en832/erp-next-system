# Profit/Loss Zero Values Fix - Bugfix Design

## Overview

The profit/loss summary page displays Rp 0 for all values because the balance calculation API only returns accounts that have GL Entry records. When Income and Expense accounts exist in the Chart of Accounts but have no transactions yet, they are excluded from the results, causing the frontend to display "Tidak ada akun nominal dengan saldo" and zero values for all totals.

The fix involves modifying the balance calculation logic to fetch ALL Income and Expense accounts from the Chart of Accounts first, then augment them with GL Entry data (if any exists). This ensures zero-balance accounts are included in the response, allowing the frontend to display them correctly.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when Income/Expense accounts exist in Chart of Accounts but have no GL entries for the period
- **Property (P)**: The desired behavior - all Income/Expense accounts should be returned with their balances (including zero)
- **Preservation**: Existing balance calculation logic for accounts with GL entries must remain unchanged
- **calculateAllAccountBalances**: The function in `app/api/accounting-period/balances/[name]/route.ts` that calculates account balances
- **GL Entry**: General Ledger Entry - transaction records that affect account balances
- **Chart of Accounts (CoA)**: The master list of all accounts in the system
- **Nominal Accounts**: Income and Expense accounts that are closed at period end
- **Real Accounts**: Asset, Liability, and Equity accounts that carry forward

## Bug Details

### Fault Condition

The bug manifests when Income or Expense accounts exist in the Chart of Accounts but have no GL Entry records for the given period (or cumulative up to period end). The `calculateAllAccountBalances` function first queries GL entries to build an account map, then fetches only those accounts that appear in the GL entries. This approach excludes accounts with zero activity.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { period: AccountingPeriod, account: Account }
  OUTPUT: boolean
  
  RETURN account.root_type IN ['Income', 'Expense']
         AND account.is_group = 0
         AND account.company = period.company
         AND NOT existsGLEntry(account.name, period)
END FUNCTION

FUNCTION existsGLEntry(accountName, period)
  RETURN COUNT(GL Entry WHERE account = accountName 
                         AND posting_date <= period.end_date
                         AND is_cancelled = 0) > 0
END FUNCTION
```

### Examples

- **Example 1**: Account "4000 - Pendapatan Penjualan" exists in CoA but has no sales invoices yet
  - Expected: Display in table with Debit=Rp 0, Credit=Rp 0, Balance=Rp 0
  - Actual: Not displayed, excluded from API response

- **Example 2**: Account "5000 - Beban Gaji" exists in CoA but no salary payments recorded
  - Expected: Display in table with Debit=Rp 0, Credit=Rp 0, Balance=Rp 0
  - Actual: Not displayed, excluded from API response

- **Example 3**: Account "4100 - Pendapatan Jasa" has GL entries with total credit=5,000,000
  - Expected: Display with calculated balance
  - Actual: Works correctly (this behavior must be preserved)

- **Edge Case**: Period has 50 Income/Expense accounts in CoA, only 5 have transactions
  - Expected: Display all 50 accounts (5 with balances, 45 with zeros)
  - Actual: Only displays 5 accounts with transactions

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Accounts with GL entries must continue to show correct debit, credit, and balance calculations
- Balance calculation formulas must remain unchanged (Income: credit-debit, Expense: debit-credit)
- Cumulative vs Period-only filtering must continue to work correctly
- Real accounts (Asset, Liability, Equity) should continue to show only non-zero balances
- The aggregation logic for summing debits and credits from GL entries must remain unchanged

**Scope:**
All inputs that do NOT involve Income/Expense accounts with zero GL entries should be completely unaffected by this fix. This includes:
- Accounts with existing GL entries (any root_type)
- Real accounts (Asset, Liability, Equity) display logic
- Date range filtering (cumulative vs period-only)
- Balance calculation formulas
- Frontend display logic for non-zero accounts

## Hypothesized Root Cause

Based on the bug description and code analysis, the root cause is:

1. **Wrong Query Order**: The function queries GL entries first, builds an account map from those entries, then fetches only accounts that appear in the map
   - Line 42-60 in `route.ts`: Queries GL entries and builds accountMap
   - Line 73-78: Fetches accounts using `['name', 'in', Array.from(accountMap.keys())]`
   - This filter excludes any account not in the accountMap

2. **Missing CoA-First Approach**: The correct approach should be:
   - First: Fetch ALL Income/Expense accounts from Chart of Accounts
   - Second: Fetch GL entries for those accounts
   - Third: Merge the data (CoA accounts + GL totals)

3. **Incorrect Assumption**: The code assumes all relevant accounts will have GL entries, which is false for new accounts or accounts with no activity in the period

4. **Inconsistent Logic**: The `getNominalAccountBalances` function in `lib/accounting-period-closing.ts` has the same issue (lines 58-130), suggesting this is a systemic pattern

## Correctness Properties

Property 1: Fault Condition - Include Zero-Balance Income/Expense Accounts

_For any_ Income or Expense account that exists in the Chart of Accounts for the period's company and is not a group account, the fixed calculateAllAccountBalances function SHALL return that account in the results with debit=0, credit=0, and balance=0 if no GL entries exist for it.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Non-Zero Balance Calculation

_For any_ account that has GL entries (regardless of root_type), the fixed calculateAllAccountBalances function SHALL produce exactly the same debit, credit, and balance values as the original function, preserving the aggregation and calculation logic.

**Validates: Requirements 3.1, 3.2, 3.4**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `app/api/accounting-period/balances/[name]/route.ts`

**Function**: `calculateAllAccountBalances`

**Specific Changes**:

1. **Fetch All Accounts First**: Query Chart of Accounts for ALL non-group accounts (not just Income/Expense)
   - Add query before GL entries query
   - Filter: `['company', '=', period.company]`, `['is_group', '=', 0]`
   - Fields: `['name', 'account_name', 'account_type', 'root_type', 'is_group']`

2. **Build Account Map from CoA**: Create initial map with all accounts having zero balances
   - Initialize: `accountMap.set(account.name, { debit: 0, credit: 0 })`
   - This ensures all accounts start with zero

3. **Augment with GL Entry Data**: Query GL entries and update the accountMap
   - Keep existing GL entry query logic
   - Update existing entries in accountMap (don't create new ones)
   - This adds transaction data to accounts that have it

4. **Build Results from Account Map**: Iterate through all accounts (not just those with GL entries)
   - For Income/Expense: Include ALL accounts (even with zero balance)
   - For Real accounts: Keep existing logic (only non-zero balances)
   - Calculate balance using existing formulas

5. **Update lib/accounting-period-closing.ts**: Apply same fix to `getNominalAccountBalances` function
   - This ensures consistency across the codebase
   - Prevents similar bugs in closing journal entry creation

### Pseudocode for Fixed Algorithm

```
FUNCTION calculateAllAccountBalances_fixed(period, periodOnly)
  // Step 1: Fetch ALL accounts from Chart of Accounts
  accounts := FETCH Account WHERE company = period.company 
                              AND is_group = 0
  
  // Step 2: Initialize account map with zeros
  accountMap := new Map()
  FOR EACH account IN accounts DO
    accountMap.set(account.name, { debit: 0, credit: 0 })
  END FOR
  
  // Step 3: Fetch GL entries and augment the map
  filters := build_gl_filters(period, periodOnly)
  glEntries := FETCH GL Entry WHERE filters
  
  FOR EACH entry IN glEntries DO
    IF accountMap.has(entry.account) THEN
      existing := accountMap.get(entry.account)
      accountMap.set(entry.account, {
        debit: existing.debit + entry.debit,
        credit: existing.credit + entry.credit
      })
    END IF
  END FOR
  
  // Step 4: Build results
  result := []
  FOR EACH account IN accounts DO
    totals := accountMap.get(account.name)
    balance := calculate_balance(account.root_type, totals)
    
    // Include all Income/Expense accounts (even with zero balance)
    // Include Real accounts only if non-zero balance
    IF account.root_type IN ['Income', 'Expense'] 
       OR abs(balance) > 0.01 THEN
      result.push({
        account: account.name,
        account_name: account.account_name,
        account_type: account.account_type,
        root_type: account.root_type,
        is_group: account.is_group,
        debit: totals.debit,
        credit: totals.credit,
        balance: balance,
        is_nominal: account.root_type IN ['Income', 'Expense']
      })
    END IF
  END FOR
  
  RETURN result
END FUNCTION
```

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Fault Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that query the balance API for a period where Income/Expense accounts exist in CoA but have no GL entries. Run these tests on the UNFIXED code to observe that these accounts are missing from the response.

**Test Cases**:
1. **Zero-Balance Income Account Test**: Create an Income account in CoA, query balances API without creating any GL entries (will fail on unfixed code - account not in response)
2. **Zero-Balance Expense Account Test**: Create an Expense account in CoA, query balances API without creating any GL entries (will fail on unfixed code - account not in response)
3. **Mixed Scenario Test**: Create 5 Income accounts, add GL entries to 2 of them, query API (will fail on unfixed code - only 2 accounts returned instead of 5)
4. **Period-Only Mode Test**: Verify zero-balance accounts are included in both cumulative and period-only modes (will fail on unfixed code)

**Expected Counterexamples**:
- API response excludes Income/Expense accounts with no GL entries
- Frontend displays "Tidak ada akun nominal dengan saldo" when accounts exist in CoA
- Possible causes: GL-entry-first query order, missing CoA-first approach

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL account WHERE isBugCondition({ period, account }) DO
  result := calculateAllAccountBalances_fixed(period, false)
  accountInResult := result.find(a => a.account = account.name)
  
  ASSERT accountInResult IS NOT NULL
  ASSERT accountInResult.debit = 0
  ASSERT accountInResult.credit = 0
  ASSERT accountInResult.balance = 0
  ASSERT accountInResult.is_nominal = true
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL account WHERE NOT isBugCondition({ period, account }) DO
  // Account has GL entries
  originalResult := calculateAllAccountBalances_original(period, false)
  fixedResult := calculateAllAccountBalances_fixed(period, false)
  
  originalAccount := originalResult.find(a => a.account = account.name)
  fixedAccount := fixedResult.find(a => a.account = account.name)
  
  ASSERT originalAccount.debit = fixedAccount.debit
  ASSERT originalAccount.credit = fixedAccount.credit
  ASSERT originalAccount.balance = fixedAccount.balance
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for accounts with GL entries, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Balance Calculation Preservation**: Observe that accounts with GL entries calculate balances correctly on unfixed code, then verify this continues after fix
2. **Cumulative vs Period-Only Preservation**: Observe that date filtering works correctly on unfixed code, then verify this continues after fix
3. **Real Account Filtering Preservation**: Observe that Real accounts only show non-zero balances on unfixed code, then verify this continues after fix
4. **Aggregation Logic Preservation**: Observe that debit/credit summing works correctly on unfixed code, then verify this continues after fix

### Unit Tests

- Test balance API with zero-balance Income accounts
- Test balance API with zero-balance Expense accounts
- Test balance API with mixed scenario (some accounts with GL entries, some without)
- Test that Real accounts still filter out zero balances
- Test cumulative vs period-only modes with zero-balance accounts
- Test edge case: no accounts in CoA at all
- Test edge case: all accounts have zero balances

### Property-Based Tests

- Generate random Chart of Accounts configurations and verify all Income/Expense accounts are returned
- Generate random GL entry patterns and verify balance calculations match original logic
- Generate random date ranges and verify cumulative vs period-only filtering works correctly
- Test that for any account with GL entries, the balance calculation is identical to original

### Integration Tests

- Test full period closing workflow with zero-balance accounts
- Test frontend display of profit/loss summary with zero-balance accounts
- Test switching between cumulative and period-only views
- Test that closing journal entry creation still works correctly
- Test that the "Tidak ada akun nominal dengan saldo" message only appears when truly no accounts exist
