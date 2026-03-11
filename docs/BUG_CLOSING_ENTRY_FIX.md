# Bug Fix: Closing Entry Expense Account Posting

## Bug Found ✅

**File:** `erp-next-system/app/api/accounting-period/preview-closing/[name]/route.ts`
**Lines:** 68-75
**Severity:** CRITICAL

## The Bug

```typescript
// ❌ WRONG CODE (Current)
// Close expense accounts (credit expense to zero out debit balance)
for (const account of nominalAccounts) {
  if (account.root_type === 'Expense' && account.balance !== 0) {
    journalAccounts.push({
      account: account.account,
      account_name: account.account_name,
      debit_in_account_currency: 0,
      credit_in_account_currency: Math.abs(account.balance),  // ❌ BUG: CREDIT
```

## Why It's Wrong

**Accounting Principle:**
- Expense accounts normally have a **DEBIT balance**
- To close an expense account, you must **DEBIT** it to zero out the balance
- The code is doing **CREDIT** instead, which is wrong

**Example:**
- Expense Account: Dr 250.000 (normal debit balance)
- To close it: Dr 250.000 | Cr (to retained earnings)
- But code does: Cr 250.000 (WRONG!)

## Impact

This bug causes:
1. ❌ Expense accounts not properly closed
2. ❌ Expense amounts reduced instead of transferred to retained earnings
3. ❌ P&L Report shows incorrect net income
4. ❌ Retained earnings account has wrong balance

## The Fix

```typescript
// ✅ CORRECT CODE
// Close expense accounts (debit expense to zero out debit balance)
for (const account of nominalAccounts) {
  if (account.root_type === 'Expense' && account.balance !== 0) {
    journalAccounts.push({
      account: account.account,
      account_name: account.account_name,
      debit_in_account_currency: Math.abs(account.balance),  // ✅ DEBIT (correct)
      credit_in_account_currency: 0,
```

## Complete Corrected Function

```typescript
// Close income accounts (debit income to zero out credit balance)
for (const account of nominalAccounts) {
  if (account.root_type === 'Income' && account.balance !== 0) {
    journalAccounts.push({
      account: account.account,
      account_name: account.account_name,
      debit_in_account_currency: Math.abs(account.balance),  // ✅ DEBIT income
      credit_in_account_currency: 0,
      user_remark: `Closing ${account.account_name} for period ${period.period_name}`,
    });
  }
}

// Close expense accounts (debit expense to zero out debit balance)
for (const account of nominalAccounts) {
  if (account.root_type === 'Expense' && account.balance !== 0) {
    journalAccounts.push({
      account: account.account,
      account_name: account.account_name,
      debit_in_account_currency: Math.abs(account.balance),  // ✅ DEBIT expense (FIXED)
      credit_in_account_currency: 0,
      user_remark: `Closing ${account.account_name} for period ${period.period_name}`,
    });
  }
}

// Add retained earnings entry (balancing entry)
if (netIncome > 0) {
  // Profit: Credit retained earnings
  journalAccounts.push({
    account: config.retained_earnings_account,
    account_name: 'Retained Earnings',
    debit_in_account_currency: 0,
    credit_in_account_currency: netIncome,
    user_remark: `Net income for period ${period.period_name}`,
  });
} else if (netIncome < 0) {
  // Loss: Debit retained earnings
  journalAccounts.push({
    account: config.retained_earnings_account,
    account_name: 'Retained Earnings',
    debit_in_account_currency: Math.abs(netIncome),
    credit_in_account_currency: 0,
    user_remark: `Net loss for period ${period.period_name}`,
  });
}
```

## Correct Closing Entry Structure

After fix, closing entry should be:

```
DEBIT:
  4110.000 - Penjualan                    1.013.000
  4480.000 - Pendapatan Lain-lain          500.000
  5110.022 - Beban Komisi Penjualan        208.000
  5230.001 - Biaya PLN Kantor              250.000
  5110.020 - Penyesuaian Stock           1.269.000
  ────────────────────────────────────
  Total Debit:                          3.240.000

CREDIT:
  3230.000 - Laba Periode Berjalan      3.240.000
  ────────────────────────────────────
  Total Credit:                         3.240.000
```

## Testing

After applying fix:
1. Cancel existing wrong closing entry (ACC-JV-2026-00070)
2. Re-run close period wizard
3. Verify new closing entry has correct structure
4. Check P&L Report shows correct net income

## Files to Update

- `erp-next-system/app/api/accounting-period/preview-closing/[name]/route.ts` - Line 73
