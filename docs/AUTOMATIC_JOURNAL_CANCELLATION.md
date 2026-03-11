# Automatic Journal Cancellation/Reversal on Period Reopen

## Overview

Ketika periode ditutup, sistem membuat closing journal entry. Jika periode dibuka kembali (reopen), sistem sekarang **otomatis membatalkan atau membalik jurnal closing** untuk mencegah duplikasi jurnal saat close lagi.

## Problem Statement

**Sebelum fix:**
```
Periode Ditutup → Closing Journal ACC-JV-2026-00070 dibuat
Periode Dibuka Kembali → Tidak ada aksi (jurnal lama tetap ada)
Periode Ditutup Lagi → Closing Journal ACC-JV-2026-00071 dibuat (DUPLIKAT!)
```

**Hasil:** Jurnal duplikat menyebabkan GL entries duplikat dan laporan salah.

**Setelah fix:**
```
Periode Ditutup → Closing Journal ACC-JV-2026-00070 dibuat
Periode Dibuka Kembali → Jurnal ACC-JV-2026-00070 otomatis di-CANCEL atau di-BALIK
Periode Ditutup Lagi → Closing Journal ACC-JV-2026-00071 dibuat (BENAR, tidak duplikat)
```

## Implementation Details

### File Modified
- `erp-next-system/app/api/accounting-period/reopen/route.ts`

### Strategy: Two-Step Approach

#### Step 1: Try to CANCEL (Primary Method - Safest)
```typescript
// Attempt to amend and cancel the journal entry
await client.call('Journal Entry', journalName, 'amend');
await client.update('Journal Entry', journalName, {
  docstatus: 2, // 2 = Cancelled
});
```

**Keuntungan:**
- ✅ Paling aman - jurnal benar-benar dibatalkan
- ✅ GL entries otomatis di-reverse oleh ERPNext
- ✅ Tidak ada jurnal baru yang dibuat

**Kapan digunakan:**
- Jurnal belum memiliki dependent documents
- Jurnal tidak terkunci oleh sistem

#### Step 2: If Cancel Fails → Create REVERSAL Journal (Fallback)
```typescript
// Jika cancel gagal, buat jurnal balik
// Original: Dr. Account A 1000, Cr. Account B 1000
// Reversal: Cr. Account A 1000, Dr. Account B 1000
```

**Keuntungan:**
- ✅ Fallback jika cancel tidak bisa dilakukan
- ✅ Tetap mencegah duplikasi GL entries
- ✅ Audit trail jelas (ada jurnal reversal)

**Kapan digunakan:**
- Jurnal sudah memiliki dependent documents
- Jurnal terkunci oleh sistem
- Cancel operation gagal

### Response Format

```json
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

**Possible values for `method`:**
- `"cancel"` - Jurnal berhasil di-cancel
  - `original_journal`: Nomor jurnal yang di-cancel (e.g., "ACC-JV-2026-00070")
  - `reversal_journal`: null (tidak ada jurnal baru)
  
- `"reversal"` - Jurnal berhasil di-balik (reversal journal dibuat)
  - `original_journal`: Nomor jurnal original (e.g., "ACC-JV-2026-00070")
  - `reversal_journal`: Nomor jurnal pembalikan (e.g., "ACC-JV-2026-00071")
  
- `"none"` - Tidak ada aksi (tidak ada closing journal atau error)
  - `original_journal`: null
  - `reversal_journal`: null

## Example Scenarios

### Scenario 1: Cancel Berhasil ✅
```
Reopen Period 202603 - C
→ Closing Journal ACC-JV-2026-00070 ditemukan
→ Attempt cancel → SUCCESS
→ Journal ACC-JV-2026-00070 status = Cancelled
→ GL entries otomatis di-reverse
→ Response:
{
  "success": true,
  "method": "cancel",
  "original_journal": "ACC-JV-2026-00070",
  "reversal_journal": null
}
```

### Scenario 2: Cancel Gagal, Reversal Berhasil ✅
```
Reopen Period 202603 - C
→ Closing Journal ACC-JV-2026-00070 ditemukan
→ Attempt cancel → FAILED (ada dependent docs)
→ Create reversal journal ACC-JV-2026-00071
→ Reversal journal submitted
→ Response:
{
  "success": true,
  "method": "reversal",
  "original_journal": "ACC-JV-2026-00070",
  "reversal_journal": "ACC-JV-2026-00071"
}
```

### Scenario 3: Tidak Ada Closing Journal
```
Reopen Period 202603 - C
→ Closing Journal tidak ada (atau NO_CLOSING_JOURNAL)
→ Tidak ada aksi
→ Response:
{
  "success": true,
  "method": "none",
  "original_journal": null,
  "reversal_journal": null
}
```

## GL Entry Impact

### When Cancel Succeeds
```
Original GL Entries (from ACC-JV-2026-00070):
  Dr. 4110.000 (Penjualan)        1.013.000
  Cr. 3230.000 (Current Period)   1.013.000

After Cancel:
  Dr. 3230.000 (Current Period)   1.013.000  ← Reversed
  Cr. 4110.000 (Penjualan)        1.013.000  ← Reversed
```

### When Reversal Journal Created
```
Original GL Entries (from ACC-JV-2026-00070):
  Dr. 4110.000 (Penjualan)        1.013.000
  Cr. 3230.000 (Current Period)   1.013.000

Reversal GL Entries (from ACC-JV-2026-00071):
  Dr. 3230.000 (Current Period)   1.013.000  ← Balik
  Cr. 4110.000 (Penjualan)        1.013.000  ← Balik

Net Effect: Same as cancel
```

## Audit Trail

Setiap reopen action dicatat di `Period Closing Log`:

```
Action Type: Reopened
Action By: [User]
Action Date: [Timestamp]
Reason: [User provided reason]
Before Snapshot: { status: "Closed" }
After Snapshot: { status: "Open" }
```

Plus, jika ada journal cancellation:
- Cancel: Jurnal status berubah menjadi "Cancelled"
- Reversal: Jurnal reversal baru dibuat dengan remark "Reversal of closing entry..."

## Testing Checklist

- [ ] Reopen periode dengan closing journal → Verify cancel/reversal berhasil
- [ ] Check GL entries → Verify tidak ada duplikasi
- [ ] Close periode lagi → Verify closing journal baru dibuat dengan benar
- [ ] Check P&L Report → Verify laporan akurat
- [ ] Check audit log → Verify semua actions tercatat

## Error Handling

Jika terjadi error saat cancel/reversal:
- Error di-log ke console
- Response tetap `success: true` untuk reopen (periode tetap dibuka)
- `journal_cancellation.success: false` untuk menunjukkan ada issue
- User dapat manual cancel/reversal jika diperlukan

## Future Enhancements

1. **Configurable Strategy**: Allow user to choose cancel vs reversal
2. **Notification**: Send notification jika cancel/reversal gagal
3. **Retry Logic**: Automatic retry dengan exponential backoff
4. **Batch Operations**: Handle multiple periods reopen dengan parallel processing

