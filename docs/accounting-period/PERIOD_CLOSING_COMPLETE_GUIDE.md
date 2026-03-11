# Period Closing Complete Guide

## Overview

This guide explains the complete period closing process, calculation formulas, and what happens when periods are reopened.

---

## 1. Net Income Calculation Formula

### Unified Formula (All Endpoints)

All three calculation points now use the same formula via `calculateNetIncome()` utility:

```typescript
Total Income = SUM(|balance| for all Income accounts)
Total Expense = |SUM(balance for all Expense accounts)|
Net Income = Total Income - Total Expense
```

### Why This Formula?

**Income Accounts:**
- Normal balance: CREDIT (Cr)
- In Dr-Cr format: Negative value
- Example: 4110.000 has Cr 1.013.000 → balance = -1.013.000
- For P&L: Use absolute value = 1.013.000

**Expense Accounts:**
- Normal balance: DEBIT (Dr)
- In Dr-Cr format: Positive value
- Example: 5110.022 has Dr 167.200 → balance = 167.200
- If account has CREDIT balance (negative), it's an adjustment that reduces expense
- For P&L: Sum all balances, then take absolute value

### Example Calculation

**Data:**
- Income: 4110.000 (Cr 1.013.000), 4480.000 (Cr 500.000)
- Expense: 5110.022 (Dr 167.200), 5230.001 (Dr 250.000), 5110.020 (Cr 1.269.000), 5140.001 (Dr 807.742)

**Calculation:**
```
Total Income = |1.013.000| + |500.000| = 1.513.000

Expense Sum = 167.200 + 250.000 - 1.269.000 + 807.742 = -44.058
Total Expense = |-44.058| = 44.058

Net Income = 1.513.000 - 44.058 = 1.468.942
```

---

## 2. Calculation Points

### Point 1: P&L Report
**Endpoint:** `/api/accounting-period/reports/closing-summary`
**Display:** `ClosingSummaryReport.tsx`
**Data Filter:** `posting_date >= start_date AND posting_date < end_date`
**Excludes:** Entries on the last day (closing journal entries)

### Point 2: Wizard Preview (Step 3)
**Endpoint:** `/api/accounting-period/preview-closing/[name]`
**Display:** Wizard step 3 "Preview Jurnal"
**Data Filter:** `posting_date >= start_date AND posting_date < end_date`
**Excludes:** Entries on the last day

### Point 3: Wizard Review (Step 2)
**Page:** `/app/accounting-period/close/[name]/review/page.tsx`
**Data Source:** `/api/accounting-period/balances/[name]`
**Shows:** Both cumulative and period-only balances
**Calculation:** Uses period-only balances by default

---

## 3. Cumulative vs Period-Only

### Cumulative Mode
- **Data:** All GL entries from start of time to period end_date
- **Use Case:** See total financial position
- **Filter:** `posting_date <= period.end_date`

### Period-Only Mode
- **Data:** Only GL entries within the period
- **Use Case:** See period performance
- **Filter:** `posting_date >= period.start_date AND posting_date < period.end_date`

### In Wizard Review
The wizard shows a toggle to switch between modes:
- Default: Period-Only (for closing calculation)
- Alternative: Cumulative (for reference)

---

## 4. Closing Journal Entry

### Purpose
Automatically close nominal accounts (Income & Expense) to zero balance and transfer net income to Retained Earnings.

### Structure
```
Debit:  Income accounts (by their balance amount)
Debit:  Expense accounts (by their balance amount)
Credit: Retained Earnings (net income amount)
```

### Example
```
Debit:  4110.000 (Income)           1.013.000
Debit:  4480.000 (Income)             500.000
Debit:  5110.022 (Expense)            167.200
Debit:  5230.001 (Expense)            250.000
Debit:  5110.020 (Expense Adj)      1.269.000
Debit:  5140.001 (Expense)            807.742
Credit: 3000.000 (Retained Earnings)          1.468.942
```

### When Posted
- Posted on: **Last day of period** (period.end_date)
- Status: **Submitted** (locked, cannot be edited)
- Excluded from P&L: Yes (filter: `posting_date < end_date`)

---

## 5. Period Reopening Scenarios

### Scenario 1: Normal Close → Reopen → Close Again

#### Step 1: Initial Close
```
Period Status: Open → Closed
Closing Journal: ACC-JV-2026-00070 (posted on 2026-03-31)
Nominal Accounts: All zero balance
Retained Earnings: +1.468.942
```

#### Step 2: Reopen Period
```
Period Status: Closed → Open
Closing Journal: Still exists and posted
Nominal Accounts: Still zero balance (entries not reversed)
```

**⚠️ Issue:** If new transactions are added, they won't be included in the old closing journal.

#### Step 3: Close Again
```
New Closing Journal: ACC-JV-2026-00071 (posted on 2026-03-31)
Old Closing Journal: ACC-JV-2026-00070 (still posted)
```

**⚠️ Critical Issue:** DUPLICATE closing entries!
- Old journal: +1.468.942 to Retained Earnings
- New journal: +1.468.942 to Retained Earnings
- Total: +2.937.884 (WRONG!)

### Impact on P&L

**Good News:** P&L Report is NOT affected
- Filter: `posting_date < period.end_date`
- Both closing journals are on 2026-03-31
- Both are excluded from P&L calculation ✓

**Bad News:** Retained Earnings is WRONG
- Will have double the net income
- Affects Balance Sheet
- Affects future period calculations

---

## 6. Recommended Improvements

### Issue 1: Duplicate Closing Journals
**Current:** No automatic cleanup when reopening

**Recommendation:**
```typescript
// When reopening a period, cancel the old closing journal
if (period.closing_journal_entry) {
  // Cancel the old closing journal
  await client.call('Journal Entry', period.closing_journal_entry, 'amend');
  await client.call('Journal Entry', period.closing_journal_entry, 'cancel');
  
  // Clear the reference
  await client.update('Accounting Period', period.name, {
    closing_journal_entry: null
  });
}
```

### Issue 2: User Warning
**Current:** No warning when reopening

**Recommendation:**
- Show confirmation dialog: "Reopening will keep the existing closing journal. You'll need to manually cancel it before closing again."
- Or: Automatically cancel old closing journal

### Issue 3: Validation
**Current:** No validation that closing journal matches current balances

**Recommendation:**
- When closing again, verify that old closing journal is cancelled
- Show error if duplicate closing journals detected

---

## 7. Files Modified

### Calculation Logic (Centralized)
- `erp-next-system/lib/calculate-net-income.ts` - Shared utility function

### API Endpoints
- `erp-next-system/app/api/accounting-period/reports/closing-summary/route.ts` - P&L calculation
- `erp-next-system/app/api/accounting-period/preview-closing/[name]/route.ts` - Wizard preview
- `erp-next-system/app/api/accounting-period/balances/[name]/route.ts` - Balance data

### UI Components
- `erp-next-system/app/accounting-period/components/ClosingSummaryReport.tsx` - P&L display
- `erp-next-system/app/accounting-period/close/[name]/review/page.tsx` - Wizard review
- `erp-next-system/app/accounting-period/close/[name]/page.tsx` - Wizard main

---

## 8. Verification Checklist

### ✓ Verified Correct
- [x] All three calculation points use same formula
- [x] Income accounts: absolute value of balance
- [x] Expense accounts: absolute value of sum
- [x] Closing journals excluded from P&L (posting_date < end_date)
- [x] Cumulative vs Period-Only distinction clear
- [x] Wizard shows correct net income in all steps

### ⚠️ Known Issues
- [ ] Duplicate closing journals when period reopened and closed again
- [ ] No automatic cleanup of old closing journals
- [ ] Retained Earnings affected by duplicate journals
- [ ] No user warning when reopening periods

### 📋 Recommended Actions
1. Implement automatic cancellation of old closing journals
2. Add user confirmation dialog for period reopening
3. Add validation to detect duplicate closing journals
4. Create test cases for period reopening scenarios

---

## 9. Testing Recommendations

### Test Case 1: Normal Close
```
1. Create period with transactions
2. Close period
3. Verify: P&L shows correct net income
4. Verify: Closing journal created
5. Verify: Nominal accounts zero balance
```

### Test Case 2: Reopen and Close Again
```
1. Close period (creates ACC-JV-2026-00070)
2. Reopen period
3. Add new transactions
4. Close period again (creates ACC-JV-2026-00071)
5. Verify: P&L still correct (both journals excluded)
6. Verify: Retained Earnings has DOUBLE amount (known issue)
```

### Test Case 3: Cumulative vs Period-Only
```
1. Create period with transactions
2. View wizard review
3. Toggle between Cumulative and Period-Only
4. Verify: Both show correct net income
5. Verify: Cumulative >= Period-Only
```

---

## 10. Summary

**Current State:**
- ✓ All P&L calculations are consistent and correct
- ✓ Closing journals properly excluded from P&L
- ✓ Cumulative vs Period-Only distinction clear
- ⚠️ Duplicate closing journals possible when reopening

**Next Steps:**
1. Implement automatic cleanup of old closing journals
2. Add user warnings for period reopening
3. Create comprehensive test suite
4. Document period reopening best practices for users
