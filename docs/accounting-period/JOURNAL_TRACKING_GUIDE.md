# Journal Tracking Guide - Closing & Reversal

## Overview

Panduan untuk melacak nomor jurnal penutupan (closing), pembatalan (cancel), dan pembalikan (reversal) saat membuka kembali periode yang sudah ditutup.

## Nomor Jurnal di Setiap Tahap

### Tahap 1: Periode Ditutup (Close Period)

**Jurnal yang dibuat:**
- **Closing Journal**: `ACC-JV-2026-00070` (contoh)
- **Tujuan**: Menutup akun nominal (Income & Expense)
- **Struktur**:
  ```
  DEBIT:
    4110.000 - Penjualan                    1.013.000
    5110.022 - Beban Komisi Penjualan        208.000
    5230.001 - Biaya PLN Kantor              250.000
    5110.020 - Penyesuaian Stock           1.269.000
    Total Debit:                          2.740.000
  
  CREDIT:
    3230.000 - Current Period Profit      2.740.000
    Total Credit:                         2.740.000
  ```
- **Status**: Submitted
- **Stored in**: `Accounting Period.closing_journal_entry = "ACC-JV-2026-00070"`

---

### Tahap 2: Periode Dibuka Kembali (Reopen Period)

**Sistem otomatis melakukan:**

#### Option A: Cancel Berhasil ✅
```
Original Closing Journal: ACC-JV-2026-00070
Action: CANCEL
Result: 
  - Journal ACC-JV-2026-00070 status = Cancelled
  - GL entries otomatis di-reverse oleh ERPNext
  - Tidak ada jurnal baru yang dibuat

Response:
{
  "method": "cancel",
  "original_journal": "ACC-JV-2026-00070",
  "reversal_journal": null,
  "action": "Closing journal ACC-JV-2026-00070 cancelled successfully"
}
```

#### Option B: Cancel Gagal → Reversal Dibuat ✅
```
Original Closing Journal: ACC-JV-2026-00070
Action: CANCEL → FAILED
Fallback: CREATE REVERSAL JOURNAL

Reversal Journal: ACC-JV-2026-00071 (nomor baru)
Structure (flip debit/credit):
  DEBIT:
    3230.000 - Current Period Profit      2.740.000
    Total Debit:                          2.740.000
  
  CREDIT:
    4110.000 - Penjualan                    1.013.000
    5110.022 - Beban Komisi Penjualan        208.000
    5230.001 - Biaya PLN Kantor              250.000
    5110.020 - Penyesuaian Stock           1.269.000
    Total Credit:                         2.740.000

Status: Submitted
Remark: "Reversal of closing entry ACC-JV-2026-00070 - Period reopened"

Response:
{
  "method": "reversal",
  "original_journal": "ACC-JV-2026-00070",
  "reversal_journal": "ACC-JV-2026-00071",
  "action": "Reversal journal ACC-JV-2026-00071 created for original journal ACC-JV-2026-00070"
}
```

---

### Tahap 3: Periode Ditutup Lagi (Close Period Again)

**Jurnal baru yang dibuat:**
- **New Closing Journal**: `ACC-JV-2026-00072` (nomor baru)
- **Tujuan**: Menutup akun nominal dengan benar
- **Struktur**: Sama seperti tahap 1 (sudah diperbaiki)
- **Status**: Submitted
- **Stored in**: `Accounting Period.closing_journal_entry = "ACC-JV-2026-00072"`

---

## Tracking Nomor Jurnal

### Cara Melacak di UI ERPNext

#### 1. Lihat Closing Journal di Accounting Period
```
Accounting Period: 202603 - C
→ Tab "Informasi"
→ Field "Closing Journal Entry" = ACC-JV-2026-00070
```

#### 2. Lihat Journal Entry Details
```
Journal Entry: ACC-JV-2026-00070
→ Status: Cancelled (jika di-cancel)
→ atau tidak ada (jika di-reversal)
```

#### 3. Lihat Reversal Journal (jika ada)
```
Journal Entry: ACC-JV-2026-00071
→ Status: Submitted
→ Remark: "Reversal of closing entry ACC-JV-2026-00070 - Period reopened"
→ Accounts: Flip dari original
```

#### 4. Lihat GL Entries
```
GL Entry Report
→ Filter by Accounting Period: 202603 - C
→ Verify tidak ada duplikasi
→ Verify balances benar
```

---

## API Response Examples

### Example 1: Cancel Berhasil
```bash
POST /api/accounting-period/reopen
Body: {
  "period_name": "202603 - C",
  "company": "Cirebon",
  "reason": "Fixing closing entry bug"
}

Response:
{
  "success": true,
  "message": "Period reopened successfully",
  "journal_cancellation": {
    "success": true,
    "method": "cancel",
    "original_journal": "ACC-JV-2026-00070",
    "reversal_journal": null,
    "details": {
      "action": "Closing journal ACC-JV-2026-00070 cancelled successfully",
      "timestamp": "2026-03-11 14:30:45"
    }
  }
}
```

### Example 2: Reversal Dibuat
```bash
POST /api/accounting-period/reopen
Body: {
  "period_name": "202603 - C",
  "company": "Cirebon",
  "reason": "Fixing closing entry bug"
}

Response:
{
  "success": true,
  "message": "Period reopened successfully",
  "journal_cancellation": {
    "success": true,
    "method": "reversal",
    "original_journal": "ACC-JV-2026-00070",
    "reversal_journal": "ACC-JV-2026-00071",
    "details": {
      "action": "Reversal journal ACC-JV-2026-00071 created for original journal ACC-JV-2026-00070",
      "timestamp": "2026-03-11 14:30:45"
    }
  }
}
```

---

## Audit Trail

Semua nomor jurnal dicatat di `Period Closing Log`:

```
Period Closing Log Entry:
  Accounting Period: 202603 - C
  Action Type: Closed
  Closing Journal: ACC-JV-2026-00070
  Closed By: [User]
  Closed On: 2026-03-11 10:00:00

Period Closing Log Entry:
  Accounting Period: 202603 - C
  Action Type: Reopened
  Reason: Fixing closing entry bug
  Reopened By: [User]
  Reopened On: 2026-03-11 14:30:45
  Journal Cancellation: ACC-JV-2026-00070 cancelled / ACC-JV-2026-00071 created
```

---

## Verification Checklist

- [ ] **Closing Journal**: Catat nomor jurnal penutupan (e.g., ACC-JV-2026-00070)
- [ ] **Reopen Action**: Catat nomor jurnal cancel/reversal dari response
  - [ ] Cancel: Original journal status = Cancelled
  - [ ] Reversal: Reversal journal nomor = ACC-JV-2026-00071
- [ ] **GL Entries**: Verify tidak ada duplikasi
  - [ ] Original GL entries di-reverse
  - [ ] Balances benar
- [ ] **New Closing**: Catat nomor jurnal penutupan baru (e.g., ACC-JV-2026-00072)
- [ ] **Reports**: Verify P&L, Trial Balance, Balance Sheet akurat

---

## Troubleshooting

### Jurnal Cancel Gagal
**Gejala**: Response menunjukkan `method: "reversal"` bukan `method: "cancel"`

**Penyebab**: 
- Jurnal memiliki dependent documents
- Jurnal terkunci oleh sistem
- Permissions issue

**Solusi**:
- Reversal journal otomatis dibuat (ACC-JV-2026-00071)
- Verify reversal journal berhasil submitted
- Lanjutkan dengan close period lagi

### Reversal Journal Gagal
**Gejala**: Response menunjukkan `success: false` dan `method: "reversal"`

**Penyebab**:
- Error saat membuat reversal journal
- Akun tidak ditemukan
- Permissions issue

**Solusi**:
- Check error message di response
- Manual cancel original journal di UI
- Manual create reversal journal jika diperlukan
- Contact support jika masalah berlanjut

### Duplikasi GL Entries
**Gejala**: GL Entry Report menunjukkan entries duplikat

**Penyebab**:
- Cancel/reversal gagal
- Periode di-close tanpa cancel/reversal

**Solusi**:
- Verify cancel/reversal berhasil
- Check GL Entry Report untuk nomor jurnal
- Manual cancel/reversal jika diperlukan
- Re-run close period wizard

