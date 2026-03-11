# Closing Journal - Quick Reference

## Ringkasan Cepat

### Apa itu Closing Journal?
Jurnal otomatis yang dibuat saat periode ditutup untuk:
- Menutup akun Income & Expense menjadi 0
- Transfer net income/loss ke Retained Earnings
- Mempersiapkan periode berikutnya

### Kapan Dibuat?
Saat user klik tombol "Close Period" di UI

### Nomor Jurnal
Format: `ACC-JV-YYYY-XXXXX` (e.g., `ACC-JV-2026-00070`)

---

## Struktur Closing Journal (BENAR)

```
DEBIT:
  ✅ Semua akun Income (untuk menutup credit balance)
  ✅ Semua akun Expense (untuk menutup debit balance)

CREDIT:
  ✅ Retained Earnings (balancing entry)

BALANCE: Total Debit = Total Credit ✅
```

### Contoh Konkret
```
DEBIT:
  4110.000 - Penjualan                    1.013.000
  5110.022 - Beban Komisi Penjualan        208.000
  5230.001 - Biaya PLN Kantor              250.000
  5110.020 - Penyesuaian Stock           1.269.000
  ─────────────────────────────────────────────────
  Total Debit:                          2.740.000

CREDIT:
  3230.000 - Current Period Profit      2.740.000
  ─────────────────────────────────────────────────
  Total Credit:                         2.740.000

✅ BALANCE!
```

---

## Pengaruh ke Laporan

| Laporan | Pengaruh | Contoh |
|---------|----------|--------|
| **GL Entry Report** | Akun nominal balance = 0 | 4110.000: Dr 1.013.000 = Cr 1.013.000 |
| **Trial Balance** | Akun nominal tidak muncul (balance = 0) | Hanya akun Balance Sheet yang muncul |
| **P&L Report** | Menunjukkan net income/loss | Revenue - Expense = Net Income |
| **Balance Sheet** | Retained Earnings = accumulated profit/loss | Equity section updated |
| **Accounting Period** | Status = Closed, closing_journal_entry = nomor jurnal | 202603 - C: Closed, ACC-JV-2026-00070 |

---

## Implikasi GL Entry

### Sebelum Closing
```
4110.000 - Penjualan:
  Debit: 0
  Credit: 1.013.000
  Balance: Cr 1.013.000
```

### Setelah Closing
```
4110.000 - Penjualan:
  Debit: 1.013.000 (dari closing journal)
  Credit: 1.013.000 (dari transaksi)
  Balance: 0 ✅
```

---

## Dampak ke Periode Berikutnya

### Carry Forward
```
Period 202603 - C (CLOSED):
  Akun Nominal: Balance = 0
  Retained Earnings: Balance = Accumulated Profit/Loss

Period 202604 - D (OPEN):
  Akun Nominal: Balance = 0 (fresh start)
  Retained Earnings: Balance = Carried forward ✅
```

### Opening Balance
Saldo awal periode baru = Saldo akhir periode sebelumnya

---

## Jika Closing Journal SALAH

### Masalah
```
❌ Expense di-CREDIT (seharusnya DEBIT)
❌ GL entries salah struktur
❌ Retained Earnings balance salah
❌ Balance Sheet tidak akurat
❌ Error dibawa ke periode berikutnya
```

### Dampak Laporan
| Laporan | Status |
|---------|--------|
| GL Entry Report | ❌ Salah struktur |
| Trial Balance | ❌ Tidak balance |
| P&L Report | ⚠️ Mungkin benar (kebetulan) |
| Balance Sheet | ❌ Tidak akurat |
| Retained Earnings | ❌ Salah |

---

## Fix yang Diterapkan

### File 1: `preview-closing/[name]/route.ts`
```typescript
// BEFORE: credit_in_account_currency: Math.abs(account.balance)
// AFTER:  debit_in_account_currency: Math.abs(account.balance) ✅
```

### File 2: `close/route.ts`
```typescript
// BEFORE: credit_in_account_currency: Math.abs(account.balance)
// AFTER:  debit_in_account_currency: Math.abs(account.balance) ✅
```

---

## Automatic Cancel/Reversal saat Reopen

### Saat Periode Dibuka Kembali
```
Reopen Period
  ↓
Sistem cek closing journal (e.g., ACC-JV-2026-00070)
  ↓
Try CANCEL → SUCCESS
  └─ Journal status = Cancelled
  └─ GL entries di-reverse
  └─ Response: method = "cancel"
  
  OR
  
Try CANCEL → FAILED
  └─ Create REVERSAL journal (e.g., ACC-JV-2026-00071)
  └─ Flip debit/credit
  └─ Response: method = "reversal"
```

---

## Verification Checklist

### ✅ Sebelum Close Period
- [ ] Semua transaksi sudah di-post
- [ ] Tidak ada transaksi setelah end_date
- [ ] Validasi periode passed

### ✅ Saat Close Period
- [ ] Closing journal nomor tercatat
- [ ] Closing journal status = Submitted
- [ ] GL entries otomatis dibuat

### ✅ Setelah Close Period
- [ ] Periode status = Closed
- [ ] Akun nominal balance = 0
- [ ] Retained earnings balance = net income/loss
- [ ] Trial balance balance
- [ ] P&L report akurat

### ✅ Jika Reopen Period
- [ ] Closing journal di-cancel atau di-balik
- [ ] Reversal journal nomor tercatat (jika ada)
- [ ] GL entries di-reverse
- [ ] Periode status = Open

---

## Links ke Dokumentasi Lengkap

- **CLOSING_JOURNAL_IMPACT.md** - Dokumentasi lengkap dengan contoh detail
- **JOURNAL_TRACKING_GUIDE.md** - Cara melacak nomor jurnal
- **AUTOMATIC_JOURNAL_CANCELLATION.md** - Detail automatic cancel/reversal
- **REOPEN_PERIOD_AND_REPORTS_FAQ.md** - FAQ tentang reopen & reports

