# Cara Sistem Mengidentifikasi Jurnal Penutup yang Harus Di-Cancel

## Ringkasan

Sistem **OTOMATIS** tahu jurnal mana yang harus di-cancel melalui field `closing_journal_entry` yang disimpan di dokumen Accounting Period.

---

## 1. Alur Penyimpanan Referensi Jurnal

### Saat Close Period (Langkah 1)

```typescript
// File: app/api/accounting-period/close/route.ts

// 1. Sistem buat jurnal penutup
const closingJournal = await createClosingJournalEntry(period, config, client);
// Result: { name: "ACC-JV-2026-00070", ... }

// 2. Sistem simpan referensi jurnal ke periode
const updateData = {
  status: 'Closed',
  closed_by: currentUser,
  closed_on: erpnextDatetime,
  closing_journal_entry: closingJournal.name, // ← DISIMPAN DI SINI!
};

await client.update('Accounting Period', period_name, updateData);
```

### Hasil di Database

```json
{
  "name": "202603 - C",
  "period_name": "202603 - C",
  "company": "Cirebon",
  "status": "Closed",
  "closed_by": "Administrator",
  "closed_on": "2026-03-31 10:30:00",
  "closing_journal_entry": "ACC-JV-2026-00070" // ← REFERENSI TERSIMPAN
}
```

---

## 2. Alur Identifikasi Jurnal Saat Reopen

### Saat Reopen Period (Langkah 2)

```typescript
// File: app/api/accounting-period/reopen/route.ts

// 1. Sistem ambil data periode
const period = await client.get('Accounting Period', period_name);

// 2. Sistem cek apakah ada jurnal penutup
if (period.closing_journal_entry && period.closing_journal_entry !== 'NO_CLOSING_JOURNAL') {
  // 3. Sistem TAHU jurnal mana yang harus di-cancel
  const journalName = period.closing_journal_entry; // "ACC-JV-2026-00070"
  
  // 4. Sistem cancel jurnal tersebut
  journalCancellationResult = await handleClosingJournalCancellation(
    journalName, // ← JURNAL YANG AKAN DI-CANCEL
    period,
    client,
    currentUser
  );
}

// 5. Sistem hapus referensi jurnal dari periode
updateData.closing_journal_entry = null;
await client.update('Accounting Period', period_name, updateData);
```

---

## 3. Diagram Alur Lengkap

```
┌─────────────────────────────────────────────────────────────┐
│ CLOSE PERIOD (Pertama Kali)                                 │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │ 1. Buat Jurnal Penutup           │
        │    ACC-JV-2026-00070             │
        └──────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │ 2. Simpan Referensi ke Periode   │
        │    period.closing_journal_entry  │
        │    = "ACC-JV-2026-00070"         │
        └──────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │ 3. Update Status = "Closed"      │
        └──────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ REOPEN PERIOD                                                │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │ 1. Ambil Data Periode            │
        │    period = get('202603 - C')    │
        └──────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │ 2. Baca Referensi Jurnal         │
        │    journalName =                 │
        │    period.closing_journal_entry  │
        │    = "ACC-JV-2026-00070"         │
        └──────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │ 3. Cancel Jurnal Tersebut        │
        │    cancel("ACC-JV-2026-00070")   │
        └──────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │ 4. Hapus Referensi dari Periode  │
        │    period.closing_journal_entry  │
        │    = null                        │
        └──────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │ 5. Update Status = "Open"        │
        └──────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ CLOSE PERIOD (Lagi)                                          │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │ 1. Cek Referensi Jurnal Lama     │
        │    period.closing_journal_entry  │
        │    = null (sudah dihapus)        │
        └──────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │ 2. Buat Jurnal Penutup BARU      │
        │    ACC-JV-2026-00072             │
        └──────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │ 3. Simpan Referensi BARU         │
        │    period.closing_journal_entry  │
        │    = "ACC-JV-2026-00072"         │
        └──────────────────────────────────┘
```

---

## 4. Kode Lengkap

### A. Saat Close Period

```typescript
// app/api/accounting-period/close/route.ts

export async function POST(request: NextRequest) {
  // ... validasi ...
  
  // Buat jurnal penutup
  const closingJournal = await createClosingJournalEntry(
    period, 
    config, 
    client
  );
  
  // Simpan referensi jurnal ke periode
  const updateData: any = {
    status: 'Closed',
    closed_by: currentUser,
    closed_on: erpnextDatetime,
  };
  
  // KUNCI: Simpan nama jurnal penutup
  if (closingJournal.name !== 'NO_CLOSING_JOURNAL') {
    updateData.closing_journal_entry = closingJournal.name;
  }
  
  await client.update('Accounting Period', period_name, updateData);
  
  return NextResponse.json({
    success: true,
    closing_journal: closingJournal.name,
  });
}
```

### B. Saat Reopen Period

```typescript
// app/api/accounting-period/reopen/route.ts

export async function POST(request: NextRequest) {
  // ... validasi ...
  
  // Ambil data periode
  const period = await client.get('Accounting Period', period_name);
  
  // KUNCI: Baca referensi jurnal dari periode
  if (period.closing_journal_entry && 
      period.closing_journal_entry !== 'NO_CLOSING_JOURNAL') {
    
    // Sistem TAHU jurnal mana yang harus di-cancel
    const journalName = period.closing_journal_entry;
    
    // Cancel jurnal tersebut
    journalCancellationResult = await handleClosingJournalCancellation(
      journalName, // ← Nama jurnal dari periode
      period,
      client,
      currentUser
    );
  }
  
  // Hapus referensi jurnal dari periode
  const updateData: any = {
    status: 'Open',
    closing_journal_entry: null, // ← Dihapus
    closed_by: null,
    closed_on: null,
  };
  
  await client.update('Accounting Period', period_name, updateData);
  
  return NextResponse.json({
    success: true,
    journal_cancellation: journalCancellationResult,
  });
}
```

---

## 5. Keuntungan Metode Ini

### ✅ Otomatis & Akurat
- Sistem **TIDAK PERLU CARI** jurnal penutup di database
- Sistem **LANGSUNG TAHU** jurnal mana yang harus di-cancel
- Tidak ada risiko cancel jurnal yang salah

### ✅ Efisien
- Tidak perlu query database untuk cari jurnal
- Tidak perlu filter berdasarkan tanggal/tipe/dll
- Langsung ambil dari referensi yang tersimpan

### ✅ Aman
- Hanya jurnal yang benar-benar terkait periode yang di-cancel
- Tidak ada risiko cancel jurnal manual user
- Tidak ada risiko cancel jurnal periode lain

### ✅ Audit Trail Jelas
- Setiap periode punya referensi jurnal penutupnya
- Mudah tracking jurnal mana yang terkait periode mana
- Audit log lengkap

---

## 6. Skenario Edge Cases

### Skenario 1: Jurnal Penutup Dihapus Manual

```typescript
// Jika user hapus jurnal penutup secara manual di ERPNext
period.closing_journal_entry = "ACC-JV-2026-00070" // Masih ada referensi
// Tapi jurnal sudah tidak ada di database

// Saat reopen:
try {
  await client.cancel('Journal Entry', 'ACC-JV-2026-00070');
} catch (error) {
  // Error: Journal not found
  // Sistem tetap lanjut, tidak crash
  console.log('Journal already deleted, skipping cancellation');
}

// Sistem tetap update periode menjadi Open
```

### Skenario 2: Periode Tanpa Jurnal Penutup

```typescript
// Jika periode ditutup tanpa jurnal (NO_CLOSING_JOURNAL)
period.closing_journal_entry = "NO_CLOSING_JOURNAL"

// Saat reopen:
if (period.closing_journal_entry !== 'NO_CLOSING_JOURNAL') {
  // Tidak masuk ke sini, skip cancellation
}

// Sistem langsung update periode menjadi Open
```

### Skenario 3: Referensi Null

```typescript
// Jika referensi null (tidak ada jurnal)
period.closing_journal_entry = null

// Saat reopen:
if (period.closing_journal_entry) {
  // Tidak masuk ke sini, skip cancellation
}

// Sistem langsung update periode menjadi Open
```

---

## 7. FAQ

### Q: Bagaimana sistem tahu jurnal mana yang harus di-cancel?
**A:** Sistem menyimpan nama jurnal penutup di field `closing_journal_entry` saat close period. Saat reopen, sistem baca field ini untuk tahu jurnal mana yang harus di-cancel.

### Q: Apakah sistem bisa salah cancel jurnal?
**A:** TIDAK. Sistem hanya cancel jurnal yang referensinya tersimpan di `closing_journal_entry`. Jurnal manual user atau jurnal periode lain tidak akan ter-cancel.

### Q: Bagaimana jika jurnal penutup sudah dihapus manual?
**A:** Sistem akan coba cancel, tapi jika gagal (karena jurnal tidak ada), sistem tetap lanjut dan tidak crash. Periode tetap bisa dibuka kembali.

### Q: Apakah referensi jurnal dihapus setelah reopen?
**A:** YA. Setelah jurnal di-cancel, sistem otomatis set `closing_journal_entry = null` agar tidak ada referensi ke jurnal yang sudah di-cancel.

### Q: Bagaimana jika close period lagi setelah reopen?
**A:** Sistem akan buat jurnal penutup BARU dan simpan referensi baru di `closing_journal_entry`. Referensi lama sudah dihapus saat reopen.

---

## 8. Kesimpulan

### Sistem OTOMATIS Tahu Jurnal Mana yang Harus Di-Cancel Melalui:

1. **Field `closing_journal_entry`** di dokumen Accounting Period
2. **Disimpan saat close period** dengan nama jurnal yang dibuat
3. **Dibaca saat reopen period** untuk identifikasi jurnal yang harus di-cancel
4. **Dihapus setelah cancel** agar tidak ada referensi ke jurnal lama

### Tidak Ada Manual Tracking!

- ❌ Tidak perlu cari jurnal berdasarkan tanggal
- ❌ Tidak perlu cari jurnal berdasarkan tipe
- ❌ Tidak perlu cari jurnal berdasarkan user
- ✅ Langsung ambil dari referensi yang tersimpan

### 100% Otomatis & Akurat!

Sistem **PASTI TAHU** jurnal mana yang harus di-cancel karena referensinya **TERSIMPAN LANGSUNG** di dokumen periode.
