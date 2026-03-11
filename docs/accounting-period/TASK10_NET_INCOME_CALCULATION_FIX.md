# Task 10: Fix Net Income Calculation Bug in P&L Report

## Problem Statement

User reported that P&L Report shows "Rugi" (Loss) when it should show "Laba" (Profit):
- Total Pendapatan: Rp 1.319.000 (Cr) ✓ Correct
- Total Beban: Rp 44.058 (Cr) ✗ **WRONG** - Should be Dr (Debit)
- Result: Rp 1.174.942 (Rugi/Loss) ✗ **WRONG** - Should be Laba (Profit)

Expected result: Rp 1.319.000 - Rp 44.058 = Rp 1.274.942 (Laba/Profit)

## Root Cause Analysis

Found **inconsistent balance calculation** between two API endpoints:

### preview-closing/[name]/route.ts (CORRECT)
```typescript
const balance =
  account.root_type === 'Income'
    ? totals.credit - totals.debit // Income: Cr - Dr (negative balance)
    : totals.debit - totals.credit; // Expense: Dr - Cr (positive balance)
```

### closing-summary/route.ts (WRONG)
```typescript
accountBalances[entry.account].balance += (entry.debit || 0) - (entry.credit || 0);
// Applied same formula to ALL accounts (Income and Expense)
```

This caused:
- Income accounts: Balance calculated as Dr - Cr (WRONG, should be Cr - Dr)
- Expense accounts: Balance calculated as Dr - Cr (CORRECT)
- Result: Income shown as negative, making net income calculation wrong

## Solution Implemented

Updated `closing-summary/route.ts` to calculate balance correctly based on account type:

```typescript
// Calculate balance correctly based on account type
const rootType = accountInfo?.root_type || 'Unknown';
if (rootType === 'Income') {
  // Income accounts: normally Credit (Cr - Dr)
  accountBalances[entry.account].balance = accountBalances[entry.account].credit - accountBalances[entry.account].debit;
} else if (rootType === 'Expense') {
  // Expense accounts: normally Debit (Dr - Cr)
  accountBalances[entry.account].balance = accountBalances[entry.account].debit - accountBalances[entry.account].credit;
} else {
  // Asset, Liability, Equity: Dr - Cr
  accountBalances[entry.account].balance = accountBalances[entry.account].debit - accountBalances[entry.account].credit;
}
```

## Accounting Principles

**Normal Balance Convention:**
- **Income accounts**: Credit balance (Cr) - represents positive income
  - Formula: Balance = Credit - Debit
  - Example: Sales Rp 1.000.000 Cr → Balance = 1.000.000

- **Expense accounts**: Debit balance (Dr) - represents positive expense
  - Formula: Balance = Debit - Credit
  - Example: Salary Rp 500.000 Dr → Balance = 500.000

- **Asset accounts**: Debit balance (Dr)
  - Formula: Balance = Debit - Credit

- **Liability accounts**: Credit balance (Cr)
  - Formula: Balance = Credit - Debit

- **Equity accounts**: Credit balance (Cr)
  - Formula: Balance = Credit - Debit

## Net Income Calculation

After fix, net income is calculated correctly:
```
Net Income = Total Income - Total Expense
           = Rp 1.319.000 - Rp 44.058
           = Rp 1.274.942 (Laba/Profit) ✓
```

## Files Modified

- `erp-next-system/app/api/accounting-period/reports/closing-summary/route.ts`
  - Lines 60-75: Updated balance calculation logic to use correct formula per account type
  - Lines 77-85: Kept net income calculation using absolute values (already correct)

## Testing

To verify the fix works:

1. Open the accounting period closing wizard
2. Go to Step 2 (Review Saldo) - verify Total Beban shows as "(Cr)" or "(Dr)" correctly
3. Go to Step 3 (Preview Jurnal) - verify net income calculation
4. Click "Lihat Laporan" button to view the P&L report
5. Verify:
   - Total Pendapatan shows correct amount with (Cr) position
   - Total Beban shows correct amount with (Dr) position
   - Laba (Rugi) Bersih shows correct net income (Laba, not Rugi)

## Related Issues

- **Task 9**: Badge Display Synchronization (fixed separately)
- **preview-closing API**: Already had correct balance calculation
- **wizard step 2**: Already displays correct balances

## Notes

- The wizard (step 2) was already showing correct data because it uses `preview-closing` API
- The P&L report was showing wrong data because it uses `closing-summary` API with incorrect balance calculation
- Both APIs now use consistent balance calculation logic
- The fix ensures all reports show consistent and correct financial data
