# P&L Report Investigation - Periode 202603 - C

## Ringkasan Masalah

P&L Report untuk periode 202603 - C menunjukkan **kerugian (Rugi) Rp 2.062.742**, padahal seharusnya menunjukkan keuntungan. Total pendapatan hanya Rp 10.000, jauh lebih rendah dari total Sales Invoice yang seharusnya Rp 813.000.

## Data GL Entry yang Ditemukan

### Income Accounts (4xxx)
| Account | Debit | Credit | Balance | Status |
|---------|-------|--------|---------|--------|
| 4110.000 - Penjualan | 1.003.000 | 10 | -993.000 | ❌ SALAH |
| 4480.000 - Pendapatan Lain-lain | 500.000 | 500.000 | 0 | ✅ OK |
| **Total Income** | | | **10.000** | ❌ SALAH |

### Expense Accounts (5xxx)
| Account | Debit | Credit | Balance | Status |
|---------|-------|--------|---------|--------|
| 5140.001 - HPP Barang Dagang | 1.543.742 | 740.000 | 803.742 | ✅ OK |
| 5110.022 - Beban Komisi Penjualan | 208.000 | 208.000 | 0 | ✅ OK |
| 5230.001 - Biaya PLN Kantor | 250.000 | 250.000 | 0 | ✅ OK |
| 5110.020 - Penyesuaian Stock | 0 | 1.269.000 | -1.269.000 | ❌ SALAH |
| **Total Expense** | | | **2.072.742** | ❌ SALAH |

### Net Income Calculation
- Total Income: Rp 10.000
- Total Expense: Rp 2.072.742
- **Net Income: Rp -2.062.742 (RUGI)**

## Root Cause Analysis

### 1. Masalah Utama: Closing Entry yang Salah

Ada **Journal Entry ACC-JV-2026-00070** yang dibuat pada 2026-03-31 dengan posting yang SALAH:

```
DEBIT:
  4110.000 - Penjualan                    803.000
  4480.000 - Pendapatan Lain-lain        500.000
  ────────────────────────────────────
  Total Debit:                          1.303.000

CREDIT:
  5110.022 - Beban Komisi Penjualan                166.400
  5230.001 - Biaya PLN Kantor                      250.000
  3230.000 - Laba Periode Berjalan                 886.600
  ────────────────────────────────────
  Total Credit:                                  1.303.000
```

**MASALAHNYA:**
- ✅ Debit ke Income Account (4110.000 & 4480.000) - BENAR untuk closing income
- ❌ **Credit ke Expense Account (5110.022 & 5230.001) - SALAH!**
  - Seharusnya: **Debit** ke Expense Account untuk menutupnya
  - Yang terjadi: **Credit** ke Expense Account, yang berarti mengurangi expense

### 2. Dampak pada GL Entry

**Sebelum Closing Entry:**
- 4110.000 Penjualan: Cr 1.013.000 (benar)
- 5110.022 Beban Komisi: Dr 208.000 (benar)
- 5230.001 Biaya PLN: Dr 250.000 (benar)

**Setelah Closing Entry ACC-JV-2026-00070:**
- 4110.000 Penjualan: Cr 10 (berkurang drastis karena di-debit 1.003.000)
- 5110.022 Beban Komisi: Dr 208.000 - Cr 166.400 = Dr 41.600 (berkurang)
- 5230.001 Biaya PLN: Dr 250.000 - Cr 250.000 = 0 (hilang)

### 3. Masalah Sekunder: Penyesuaian Stock

GL Entry untuk 5110.020 (Penyesuaian Stock) menunjukkan:
- Debit: 0
- Credit: 1.269.000
- Balance: -1.269.000 (NEGATIF)

**Ini berarti:**
- Stock adjustment di-posting sebagai CREDIT (mengurangi expense)
- Seharusnya DEBIT (menambah expense)
- Ini membuat total expense berkurang, padahal seharusnya bertambah

## Sales Invoice vs GL Entry Mismatch

| Dokumen | Amount | GL Entry | Status |
|---------|--------|----------|--------|
| ACC-SINV-2026-00023 | 1.000.000 | Cr 1.000.000 | ✅ OK |
| ACC-SINV-2026-00024 | -200.000 | Dr 200.000 | ✅ OK (reversal) |
| ACC-SINV-2026-00025 | 3.000 | Cr 3.000 | ✅ OK |
| ACC-SINV-2026-00026 | 10.000 | Cr 10.000 | ✅ OK |
| **Total Sales Invoice** | **813.000** | | |
| **GL Entry Income** | | **10.000** | ❌ MISMATCH |
| **Selisih** | | **803.000** | ❌ HILANG |

Selisih 803.000 ini adalah jumlah yang di-debit ke 4110.000 oleh Closing Entry ACC-JV-2026-00070!

## Kesimpulan

**Closing Entry ACC-JV-2026-00070 adalah SALAH dan menyebabkan:**

1. ❌ Income berkurang dari 1.013.000 menjadi 10.000 (berkurang 1.003.000)
2. ❌ Expense berkurang dari 2.072.742 menjadi 1.656.342 (berkurang 416.400)
3. ❌ Net Income menjadi negatif (Rugi) padahal seharusnya positif (Untung)

## Rekomendasi Perbaikan

### Opsi 1: Cancel & Recreate Closing Entry (RECOMMENDED)
1. Cancel Journal Entry ACC-JV-2026-00070
2. Buat Closing Entry yang benar dengan struktur:
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

### Opsi 2: Manual Adjustment Entry
Jika tidak bisa cancel, buat Journal Entry untuk koreksi:
```
DEBIT:
  4110.000 - Penjualan                    803.000
  5110.022 - Beban Komisi Penjualan       166.400
  5230.001 - Biaya PLN Kantor             250.000

CREDIT:
  3230.000 - Laba Periode Berjalan      1.219.400
```

### Opsi 3: Investigate Root Cause
Cari tahu:
1. Siapa yang membuat Closing Entry ACC-JV-2026-00070?
2. Apakah ada script/automation yang membuat closing entry?
3. Apakah ada custom Server Script di ERPNext yang salah?
4. Apakah ada manual entry yang salah?

## Files untuk Referensi

- Debug API: `erp-next-system/app/api/debug/gl-investigation/route.ts`
- Analysis Script: `erp-next-system/scripts/analyze-gl-data.ts`
- P&L Report: `erp-next-system/app/api/accounting-period/reports/closing-summary/route.ts`
