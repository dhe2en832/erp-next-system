# P&L Report Investigation Summary

## Problem Statement
P&L Report untuk periode 202603 - C menunjukkan **kerugian (Rugi) Rp 2.062.742**, dengan total pendapatan hanya Rp 10.000 (seharusnya Rp 813.000).

## Root Cause Found ✅

**Journal Entry ACC-JV-2026-00070** (Closing Entry) memiliki posting yang SALAH:

### Closing Entry yang Salah:
```
DEBIT:
  4110.000 - Penjualan                    803.000
  4480.000 - Pendapatan Lain-lain        500.000
  Total Debit:                          1.303.000

CREDIT:
  5110.022 - Beban Komisi Penjualan                166.400
  5230.001 - Biaya PLN Kantor                      250.000
  3230.000 - Laba Periode Berjalan                 886.600
  Total Credit:                                  1.303.000
```

### Kesalahan:
- ✅ Debit ke Income Account (4110.000 & 4480.000) - BENAR
- ❌ **Credit ke Expense Account (5110.022 & 5230.001) - SALAH!**

**Seharusnya:**
- Debit ke Expense Account untuk menutupnya
- Bukan Credit (yang malah mengurangi expense)

## Impact Analysis

| Account | Before | After | Change |
|---------|--------|-------|--------|
| 4110.000 Penjualan | Cr 1.013.000 | Cr 10 | -1.003.000 |
| 5110.022 Komisi | Dr 208.000 | Dr 41.600 | -166.400 |
| 5230.001 PLN | Dr 250.000 | 0 | -250.000 |
| **Total Income** | 1.013.000 | 10.000 | **-1.003.000** |
| **Total Expense** | 2.072.742 | 1.656.342 | **-416.400** |
| **Net Income** | -1.059.742 | -1.646.342 | **RUGI** |

## GL Entry Details

### Income Accounts (4xxx)
- 4110.000 Penjualan: Debit 1.003.000 | Credit 10 | Balance: -993.000 ❌
- 4480.000 Pendapatan Lain-lain: Debit 500.000 | Credit 500.000 | Balance: 0 ✅
- **Total Income: Rp 10.000** ❌

### Expense Accounts (5xxx)
- 5140.001 HPP: Debit 1.543.742 | Credit 740.000 | Balance: 803.742 ✅
- 5110.022 Komisi: Debit 208.000 | Credit 208.000 | Balance: 0 ✅
- 5230.001 PLN: Debit 250.000 | Credit 250.000 | Balance: 0 ✅
- 5110.020 Penyesuaian Stock: Debit 0 | Credit 1.269.000 | Balance: -1.269.000 ❌
- **Total Expense: Rp 2.072.742** ❌

## Secondary Issue: Stock Adjustment

GL Entry untuk 5110.020 (Penyesuaian Stock):
- Debit: 0
- Credit: 1.269.000
- Balance: -1.269.000 (NEGATIF)

**Problem:** Stock adjustment di-post sebagai CREDIT (mengurangi expense), seharusnya DEBIT (menambah expense).

## Recommended Solution

### Option 1: Cancel & Recreate (RECOMMENDED)
1. Cancel Journal Entry ACC-JV-2026-00070
2. Create correct Closing Entry:
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

### Option 2: Manual Adjustment Entry
If cannot cancel, create correction entry:
```
DEBIT:
  4110.000 - Penjualan                    803.000
  5110.022 - Beban Komisi Penjualan       166.400
  5230.001 - Biaya PLN Kantor             250.000

CREDIT:
  3230.000 - Laba Periode Berjalan      1.219.400
```

## Investigation Questions

1. **Who created Journal Entry ACC-JV-2026-00070?**
   - Manual entry or automated?
   - Is there a script/automation creating closing entries?

2. **Is there a custom Server Script in ERPNext creating closing entries?**
   - Checked `batasku_custom` app but didn't find the script

3. **What is the normal process for creating closing entries in your ERPNext?**
   - Is there a special menu or manual process?

## Files Created

- Investigation Details: `erp-next-system/docs/P&L_REPORT_INVESTIGATION.md`
- Debug API: `erp-next-system/app/api/debug/gl-investigation/route.ts`
- Analysis Script: `erp-next-system/scripts/analyze-gl-data.ts`
- Analysis Script 2: `erp-next-system/scripts/check-journal-entry.ts`
