# Bugfix Requirements Document

## Introduction

The "Ringkasan Laba/Rugi" (Profit/Loss Summary) page in the accounting period closing wizard displays all values as Rp 0, even though Income and Expense accounts exist in the Chart of Accounts and may have transactions. The page shows:
- Total Pendapatan (Total Income): Rp 0
- Total Beban (Total Expenses): Rp 0
- Laba Bersih (Net Profit): Rp 0
- Message "Tidak ada akun nominal dengan saldo" (No nominal accounts with balance)

This prevents users from reviewing the profit/loss summary before closing an accounting period, which is a critical step in the period closing workflow.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the balance calculation API (`/api/accounting-period/balances/[name]`) fetches account balances THEN the system only returns accounts that appear in GL Entry records, excluding Income and Expense accounts that may exist in the Chart of Accounts but have no GL entries yet

1.2 WHEN Income and Expense accounts have zero GL entries for a given period THEN the system returns an empty array for nominal accounts, causing the profit/loss summary to display Rp 0 for all values

1.3 WHEN the frontend receives an empty nominal accounts array THEN the system displays "Tidak ada akun nominal dengan saldo" and shows Rp 0 for Total Pendapatan, Total Beban, and Laba Bersih

### Expected Behavior (Correct)

2.1 WHEN the balance calculation API fetches account balances THEN the system SHALL return all Income and Expense accounts from the Chart of Accounts, including those with zero balances (no GL entries)

2.2 WHEN Income and Expense accounts have zero GL entries for a given period THEN the system SHALL return these accounts with debit=0, credit=0, and balance=0, allowing them to be displayed in the nominal accounts table

2.3 WHEN the frontend receives nominal accounts (even with zero balances) THEN the system SHALL display them in the "Akun Nominal (Pendapatan & Beban)" table and calculate totals correctly (which may be Rp 0 if there are truly no transactions)

### Unchanged Behavior (Regression Prevention)

3.1 WHEN Income and Expense accounts have GL entries with non-zero balances THEN the system SHALL CONTINUE TO calculate and display their debit, credit, and balance values correctly

3.2 WHEN the user switches between "Kumulatif" and "Periode Ini" view modes THEN the system SHALL CONTINUE TO recalculate balances based on the selected date range (cumulative vs period-only)

3.3 WHEN Real accounts (Asset, Liability, Equity) are displayed THEN the system SHALL CONTINUE TO show only accounts with non-zero balances in the "Akun Riil" section

3.4 WHEN the profit/loss calculation sums Income and Expense accounts THEN the system SHALL CONTINUE TO calculate netIncome = totalIncome - totalExpense correctly
