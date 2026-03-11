# Closing Journal - Process Flow & Impact Diagram

## 1. Closing Period Process Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ USER CLICKS "CLOSE PERIOD" BUTTON                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ SYSTEM VALIDATES PERIOD                                         │
│ ✓ Period status = Open                                          │
│ ✓ No transactions after end_date                                │
│ ✓ All documents submitted                                       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ SYSTEM CALCULATES NOMINAL ACCOUNT BALANCES                      │
│ ✓ Get all GL entries up to period end_date                      │
│ ✓ Aggregate by account                                          │
│ ✓ Calculate balance for Income & Expense accounts               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ SYSTEM BUILDS CLOSING JOURNAL STRUCTURE                         │
│                                                                 │
│ DEBIT ENTRIES:                                                  │
│   ✓ All Income accounts (to close credit balance)               │
│   ✓ All Expense accounts (to close debit balance)               │
│                                                                 │
│ CREDIT ENTRIES:                                                 │
│   ✓ Retained Earnings (balancing entry)                         │
│                                                                 │
│ VERIFY: Total Debit = Total Credit                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ SYSTEM CREATES JOURNAL ENTRY                                    │
│ ✓ Voucher Type: Journal Entry                                   │
│ ✓ Posting Date: Period end_date                                 │
│ ✓ Company: Period company                                       │
│ ✓ Accounts: Built structure                                     │
│ ✓ Remark: "Closing entry for accounting period..."             │
│ ✓ Accounting Period: Period name                                │
│                                                                 │
│ RESULT: Journal Entry ACC-JV-2026-00070 created                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ SYSTEM SUBMITS JOURNAL ENTRY                                    │
│ ✓ Journal status = Submitted                                    │
│ ✓ ERPNext creates GL entries automatically                      │
│ ✓ GL entries posted to accounts                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ SYSTEM UPDATES ACCOUNTING PERIOD                                │
│ ✓ Status: Open → Closed                                         │
│ ✓ closing_journal_entry: ACC-JV-2026-00070                      │
│ ✓ closed_by: Current user                                       │
│ ✓ closed_on: Current timestamp                                  │
│ ✓ closed_documents[].closed: 1 (block transactions)             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ SYSTEM CREATES AUDIT LOG                                        │
│ ✓ Action Type: Closed                                           │
│ ✓ Action By: Current user                                       │
│ ✓ Action Date: Current timestamp                                │
│ ✓ Before Snapshot: { status: "Open" }                           │
│ ✓ After Snapshot: { status: "Closed", closing_journal: ... }    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ PERIOD CLOSED SUCCESSFULLY ✅                                   │
│ Period 202603 - C: Status = Closed                              │
│ Closing Journal: ACC-JV-2026-00070                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. GL Entry Impact Flow

```
┌──────────────────────────────────────────────────────────────────┐
│ BEFORE CLOSING                                                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ GL ENTRIES (Period 202603 - C):                                  │
│                                                                  │
│ Account: 4110.000 - Penjualan                                    │
│   Debit: 0                                                       │
│   Credit: 1.013.000                                              │
│   Balance: Cr 1.013.000                                          │
│                                                                  │
│ Account: 5110.022 - Beban Komisi Penjualan                       │
│   Debit: 208.000                                                 │
│   Credit: 0                                                      │
│   Balance: Dr 208.000                                            │
│                                                                  │
│ Account: 3230.000 - Current Period Profit                        │
│   Debit: 0                                                       │
│   Credit: 0                                                      │
│   Balance: 0                                                     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│ CLOSING JOURNAL SUBMITTED                                        │
│ Journal Entry: ACC-JV-2026-00070                                 │
│                                                                  │
│ DEBIT:                                                           │
│   4110.000 - Penjualan                    1.013.000              │
│   5110.022 - Beban Komisi Penjualan        208.000               │
│   3230.000 - Current Period Profit       1.221.000               │
│                                                                  │
│ CREDIT:                                                          │
│   3230.000 - Current Period Profit       1.221.000               │
│                                                                  │
│ ERPNext creates GL entries automatically                         │
└──────────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│ AFTER CLOSING                                                    │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ GL ENTRIES (Period 202603 - C):                                  │
│                                                                  │
│ Account: 4110.000 - Penjualan                                    │
│   Debit: 1.013.000 (from closing journal)                        │
│   Credit: 1.013.000 (from transactions)                          │
│   Balance: 0 ✅                                                  │
│                                                                  │
│ Account: 5110.022 - Beban Komisi Penjualan                       │
│   Debit: 208.000 (from transactions)                             │
│   Credit: 208.000 (from closing journal)                         │
│   Balance: 0 ✅                                                  │
│                                                                  │
│ Account: 3230.000 - Current Period Profit                        │
│   Debit: 0                                                       │
│   Credit: 1.221.000 (from closing journal)                       │
│   Balance: Cr 1.221.000 ✅                                       │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Report Impact Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ CLOSING JOURNAL CREATED                                         │
│ ACC-JV-2026-00070                                               │
└────────────────────────┬────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
   ┌─────────┐      ┌──────────┐    ┌──────────┐
   │ GL Entry│      │  Trial   │    │   P&L    │
   │ Report  │      │ Balance  │    │ Report   │
   └────┬────┘      └────┬─────┘    └────┬─────┘
        │                │               │
        ▼                ▼               ▼
   ┌─────────────────────────────────────────────┐
   │ Nominal accounts balance = 0 ✅             │
   │ Retained Earnings updated ✅                │
   │ Net Income/Loss calculated ✅               │
   └────────────────┬────────────────────────────┘
                    │
                    ▼
   ┌─────────────────────────────────────────────┐
   │ BALANCE SHEET                               │
   │ ✓ Assets = Liabilities + Equity             │
   │ ✓ Retained Earnings = Accumulated P/L       │
   │ ✓ Current Period Profit = Period Net Income │
   └─────────────────────────────────────────────┘
```

---

## 4. Reopen Period Process Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ USER CLICKS "REOPEN PERIOD" BUTTON                              │
│ Period: 202603 - C (Status = Closed)                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ SYSTEM VALIDATES REOPEN REQUEST                                 │
│ ✓ Period status = Closed                                        │
│ ✓ Next period not closed                                        │
│ ✓ Reason provided                                               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ SYSTEM CHECKS CLOSING JOURNAL                                   │
│ ✓ closing_journal_entry = ACC-JV-2026-00070                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────┐
        │ TRY TO CANCEL JOURNAL               │
        └────────────┬───────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
   ┌─────────┐            ┌──────────────┐
   │ SUCCESS │            │ FAILED       │
   └────┬────┘            └────┬─────────┘
        │                      │
        ▼                      ▼
   ┌──────────────┐    ┌──────────────────┐
   │ Journal      │    │ CREATE REVERSAL  │
   │ Cancelled    │    │ JOURNAL          │
   │ ACC-JV-...   │    │ ACC-JV-2026-00071│
   │ status=2     │    │ (flip debit/cr)  │
   └────┬─────────┘    └────┬─────────────┘
        │                   │
        └───────────┬───────┘
                    │
                    ▼
        ┌──────────────────────────┐
        │ GL ENTRIES REVERSED      │
        │ Nominal accounts = 0     │
        │ Retained Earnings reset  │
        └────────────┬─────────────┘
                     │
                     ▼
        ┌──────────────────────────┐
        │ UPDATE PERIOD            │
        │ Status: Closed → Open    │
        │ closing_journal_entry=null
        │ closed_documents[].closed=0
        └────────────┬─────────────┘
                     │
                     ▼
        ┌──────────────────────────┐
        │ CREATE AUDIT LOG         │
        │ Action: Reopened         │
        │ Journal Cancellation: OK │
        └────────────┬─────────────┘
                     │
                     ▼
        ┌──────────────────────────┐
        │ PERIOD REOPENED ✅       │
        │ Status = Open            │
        │ Ready for new transactions
        └──────────────────────────┘
```

---

## 5. Multi-Period Impact Flow

```
┌──────────────────────────────────────────────────────────────────┐
│ PERIOD 202603 - C (CLOSED)                                       │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Closing Journal: ACC-JV-2026-00070                               │
│ Status: Closed                                                   │
│                                                                  │
│ Account Balances:                                                │
│   4110.000 - Penjualan: 0 (closed)                               │
│   5110.022 - Beban Komisi: 0 (closed)                            │
│   3230.000 - Current Period Profit: Cr 1.221.000                 │
│   3200.000 - Retained Earnings: Cr 3.000.000                     │
│                                                                  │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼ (Carry Forward)
┌──────────────────────────────────────────────────────────────────┐
│ PERIOD 202604 - D (OPEN)                                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Opening Balance (from 202603 - C):                               │
│   4110.000 - Penjualan: 0 (fresh start)                          │
│   5110.022 - Beban Komisi: 0 (fresh start)                       │
│   3230.000 - Current Period Profit: Cr 1.221.000 (carried)       │
│   3200.000 - Retained Earnings: Cr 3.000.000 (carried)           │
│                                                                  │
│ New Transactions:                                                │
│   Penjualan: Cr 2.000.000                                        │
│   Beban Komisi: Dr 500.000                                       │
│                                                                  │
│ Current Balance:                                                 │
│   4110.000 - Penjualan: Cr 2.000.000 (fresh)                     │
│   5110.022 - Beban Komisi: Dr 500.000 (fresh)                    │
│   3230.000 - Current Period Profit: Cr 1.221.000 (carried)       │
│   3200.000 - Retained Earnings: Cr 3.000.000 (carried)           │
│                                                                  │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼ (Close Period Again)
┌──────────────────────────────────────────────────────────────────┐
│ PERIOD 202604 - D (CLOSED)                                       │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Closing Journal: ACC-JV-2026-00072 (new)                         │
│ Status: Closed                                                   │
│                                                                  │
│ Account Balances:                                                │
│   4110.000 - Penjualan: 0 (closed)                               │
│   5110.022 - Beban Komisi: 0 (closed)                            │
│   3230.000 - Current Period Profit: Cr 1.500.000 (new)           │
│   3200.000 - Retained Earnings: Cr 3.000.000 (unchanged)         │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 6. Error Impact Flow (BEFORE FIX)

```
┌─────────────────────────────────────────────────────────────────┐
│ CLOSING JOURNAL CREATED (SALAH)                                 │
│ ACC-JV-2026-00070                                               │
│                                                                 │
│ DEBIT:                                                          │
│   4110.000 - Penjualan: 1.013.000                               │
│   5110.022 - Beban Komisi: 208.000                              │
│   Total: 1.221.000                                              │
│                                                                 │
│ CREDIT:                                                         │
│   5110.022 - Beban Komisi: 208.000 ❌ SALAH!                    │
│   5230.001 - Biaya PLN: 250.000 ❌ SALAH!                       │
│   3230.000 - Current Period Profit: 1.513.000 ❌ SALAH!         │
│   Total: 1.971.000                                              │
│                                                                 │
│ TIDAK BALANCE! ❌                                               │
└────────────────┬─────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ GL ENTRIES CREATED (SALAH)                                      │
│                                                                 │
│ 3230.000 - Current Period Profit:                               │
│   Debit: 0                                                      │
│   Credit: 1.513.000 ❌ SALAH! (should be 3.240.000)             │
│   Balance: Cr 1.513.000 ❌                                      │
└────────────────┬─────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ REPORTS AFFECTED                                                │
│                                                                 │
│ ❌ GL Entry Report: Salah struktur                              │
│ ❌ Trial Balance: Tidak balance                                 │
│ ⚠️  P&L Report: Mungkin benar (kebetulan)                        │
│ ❌ Balance Sheet: Retained Earnings salah                       │
│ ❌ Accounting Period: Closing journal reference salah           │
└────────────────┬─────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ ERROR CARRIED TO NEXT PERIOD                                    │
│                                                                 │
│ Period 202604 - D Opening Balance:                              │
│   3230.000 - Current Period Profit: Cr 1.513.000 ❌ SALAH!      │
│   Akumulasi error terus bertambah ❌                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Fix Impact Flow (AFTER FIX)

```
┌─────────────────────────────────────────────────────────────────┐
│ CLOSING JOURNAL CREATED (BENAR)                                 │
│ ACC-JV-2026-00070                                               │
│                                                                 │
│ DEBIT:                                                          │
│   4110.000 - Penjualan: 1.013.000                               │
│   5110.022 - Beban Komisi: 208.000 ✅ BENAR!                    │
│   5230.001 - Biaya PLN: 250.000 ✅ BENAR!                       │
│   5110.020 - Penyesuaian Stock: 1.269.000 ✅ BENAR!             │
│   Total: 2.740.000                                              │
│                                                                 │
│ CREDIT:                                                         │
│   3230.000 - Current Period Profit: 2.740.000 ✅ BENAR!         │
│   Total: 2.740.000                                              │
│                                                                 │
│ BALANCE! ✅                                                     │
└────────────────┬─────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ GL ENTRIES CREATED (BENAR)                                      │
│                                                                 │
│ 3230.000 - Current Period Profit:                               │
│   Debit: 0                                                      │
│   Credit: 2.740.000 ✅ BENAR!                                   │
│   Balance: Cr 2.740.000 ✅                                      │
└────────────────┬─────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ REPORTS ACCURATE                                                │
│                                                                 │
│ ✅ GL Entry Report: Struktur benar                              │
│ ✅ Trial Balance: Balance                                       │
│ ✅ P&L Report: Akurat                                           │
│ ✅ Balance Sheet: Retained Earnings benar                       │
│ ✅ Accounting Period: Closing journal reference benar           │
└────────────────┬─────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ CORRECT CARRY TO NEXT PERIOD                                    │
│                                                                 │
│ Period 202604 - D Opening Balance:                              │
│   3230.000 - Current Period Profit: Cr 2.740.000 ✅ BENAR!      │
│   Akumulasi error tidak terjadi ✅                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Summary

### Key Points
1. ✅ Closing journal menutup akun nominal (Income & Expense)
2. ✅ Transfer net income/loss ke Retained Earnings
3. ✅ GL entries otomatis dibuat oleh ERPNext
4. ✅ Semua laporan dipengaruhi oleh closing journal
5. ✅ Error di closing journal dibawa ke periode berikutnya
6. ✅ Fix memastikan struktur closing journal benar
7. ✅ Automatic cancel/reversal saat reopen

### Critical Success Factors
- ✅ Closing journal struktur benar (Debit Income & Expense)
- ✅ Total Debit = Total Credit
- ✅ Retained Earnings balance akurat
- ✅ GL entries benar
- ✅ Semua laporan akurat
- ✅ Periode berikutnya opening balance benar

