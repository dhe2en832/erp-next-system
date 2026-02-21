# Accounting Period Closing Journal Tests

This directory contains tests for the accounting period closing journal functionality.

## Implementation Summary

### Task 6: Closing Journal Creation Logic

#### 6.1 Nominal Account Identification ✅
**File**: `lib/accounting-period-closing.ts`

Implemented `getNominalAccountBalances()` function that:
- Queries GL entries for the period
- Filters accounts with root_type Income or Expense
- Aggregates balances per account
- Returns only accounts with non-zero balances

#### 6.2 Closing Journal Entry Creation ✅
**File**: `lib/accounting-period-closing.ts`

Implemented `createClosingJournalEntry()` function that:
- Generates journal entries to close income accounts (debit)
- Generates journal entries to close expense accounts (credit)
- Calculates net income/loss
- Creates balancing entry to retained earnings account
- Sets `is_closing_entry` flag and `voucher_type` to "Closing Entry"
- Auto-submits the journal entry

**API Endpoint**: `app/api/accounting-period/close/route.ts`
- POST endpoint to close a period
- Validates period status
- Runs pre-closing validations (unless forced)
- Creates closing journal
- Updates period status to "Closed"

#### 6.3 Property Tests ✅
**File**: `tests/accounting-period-closing-journal.pbt.test.ts`

Implemented 5 property tests:

1. **Property 7: Nominal Account Identification**
   - Validates: Requirements 3.1
   - Verifies all returned accounts are Income or Expense
   - Verifies all returned accounts have non-zero balance
   - Verifies is_nominal flag is set correctly

2. **Property 8: Closing Journal Zeros Nominal Accounts**
   - Validates: Requirements 3.2, 3.3
   - Verifies journal is balanced (debit = credit)
   - Verifies each nominal account has a closing entry
   - Verifies income accounts are debited
   - Verifies expense accounts are credited

3. **Property 9: Net Income Calculation**
   - Validates: Requirements 3.4
   - Verifies net income = total income - total expense
   - Verifies retained earnings entry matches net income

4. **Property 10: Closing Journal Marker**
   - Validates: Requirements 3.5
   - Verifies voucher_type is "Closing Entry"
   - Verifies is_closing_entry flag is set to 1
   - Verifies accounting_period is set

5. **Property 11: Closing Journal Auto-Submit**
   - Validates: Requirements 3.6
   - Verifies journal is auto-submitted (docstatus = 1)

#### 6.4 Unit Tests ✅
**File**: `tests/accounting-period-closing-journal-unit.test.ts`

Implemented 4 unit tests for edge cases:

1. **Net Income (Profit) Scenario**
   - Tests when income > expense
   - Verifies retained earnings is credited with profit

2. **Net Loss Scenario**
   - Tests when expense > income
   - Verifies retained earnings is debited with loss

3. **Zero Net Income Scenario**
   - Tests when income = expense
   - Verifies no retained earnings entry or zero amount

4. **Multiple Income/Expense Accounts Scenario**
   - Tests with multiple income and expense accounts
   - Verifies all accounts are closed correctly
   - Verifies journal is balanced

## Running the Tests

### Prerequisites

1. ERPNext instance must be running
2. Environment variables must be set:
   ```bash
   export ERP_API_KEY="your_api_key"
   export ERP_API_SECRET="your_api_secret"
   export ERPNEXT_URL="http://localhost:8000"
   ```

3. Required accounts must exist in ERPNext:
   - Sales - B (Income account)
   - Service - B (Income account)
   - Cost of Goods Sold - B (Expense account)
   - Expenses Included In Valuation - B (Expense account)
   - Retained Earnings - B (Equity account)
   - Cash - B (Asset account)

### Run Property Tests

```bash
npm run test:accounting-period-closing-journal
```

### Run Unit Tests

```bash
npm run test:accounting-period-closing-journal-unit
```

## Test Configuration

- **Test Company**: Batasku
- **Retained Earnings Account**: Retained Earnings - B
- **Test Period**: Monthly periods in January 2024

## Test Data Cleanup

Both test files include cleanup functions that:
- Cancel and delete closing journal entries
- Delete test accounting periods
- Handle errors gracefully

## Implementation Notes

### Algorithm

The closing journal creation follows this algorithm:

1. **Identify Nominal Accounts**
   - Query GL entries for the period
   - Filter by root_type (Income or Expense)
   - Aggregate balances per account
   - Exclude zero-balance accounts

2. **Calculate Net Income**
   - Sum all income account balances
   - Sum all expense account balances
   - Net Income = Total Income - Total Expense

3. **Build Journal Entries**
   - Debit each income account (to zero it out)
   - Credit each expense account (to zero it out)
   - If net income > 0: Credit retained earnings (profit)
   - If net income < 0: Debit retained earnings (loss)

4. **Create and Submit Journal**
   - Set voucher_type to "Closing Entry"
   - Set is_closing_entry flag to 1
   - Link to accounting period
   - Auto-submit the journal

### Balance Calculation

- **Income accounts**: Balance = Credit - Debit (credit balance)
- **Expense accounts**: Balance = Debit - Credit (debit balance)

### Journal Entry Structure

```typescript
{
  voucher_type: 'Closing Entry',
  posting_date: period.end_date,
  company: period.company,
  is_closing_entry: 1,
  accounting_period: period.name,
  accounts: [
    // Income accounts (debit to close)
    { account: 'Sales - B', debit: 100000, credit: 0 },
    
    // Expense accounts (credit to close)
    { account: 'Cost of Goods Sold - B', debit: 0, credit: 60000 },
    
    // Retained earnings (balancing entry)
    { account: 'Retained Earnings - B', debit: 0, credit: 40000 }
  ]
}
```

## Requirements Coverage

- ✅ Requirement 3.1: Identify nominal accounts
- ✅ Requirement 3.2: Debit income accounts
- ✅ Requirement 3.3: Credit expense accounts
- ✅ Requirement 3.4: Calculate net income/loss
- ✅ Requirement 3.5: Mark closing journal with flag
- ✅ Requirement 3.6: Auto-submit closing journal

## Files Created

1. `lib/accounting-period-closing.ts` - Core utility functions
2. `app/api/accounting-period/close/route.ts` - API endpoint
3. `tests/accounting-period-closing-journal.pbt.test.ts` - Property tests
4. `tests/accounting-period-closing-journal-unit.test.ts` - Unit tests
5. `tests/accounting-period-closing-journal-README.md` - This file

## Next Steps

To run the tests successfully:

1. Ensure ERPNext is running
2. Set up environment variables
3. Create required accounts in ERPNext
4. Run the test scripts

The tests are designed to be idempotent and clean up after themselves, so they can be run multiple times without issues.
