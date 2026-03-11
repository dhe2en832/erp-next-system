# Referensi Jurnal Penutup - Penjelasan Lengkap

## Ringkasan

Referensi jurnal penutup (`closing_journal_entry`) **TIDAK** disimpan di tabel `tabJournal Entry`, tapi disimpan di tabel `tabAccounting Period`.

---

## 1. Struktur Data

### Tabel: `tabJournal Entry`

```json
{
  "name": "ACC-JV-2026-00070",
  "docstatus": 2,  // 0=Draft, 1=Submitted, 2=Cancelled
  "posting_date": "2026-03-31",
  "user_remark": "Closing entry for accounting period 202603 - C",
  "company": "Cirebon",
  "total_debit": 1303000.000000000,
  "total_credit": 1303000.000000000
}
```

**Field penting:**
- `docstatus`: Status dokumen
  - `0` = Draft (belum submit)
  - `1` = Submitted (sudah submit, aktif)
  - `2` = Cancelled (sudah di-cancel, tidak aktif)

### Tabel: `tabAccounting Period`

```json
{
  "name": "202603 - C",
  "period_name": "202603 - C",
  "company": "Cirebon",
  "start_date": "2026-03-01",
  "end_date": "2026-03-31",
  "status": "Closed",
  "closed_by": "Administrator",
  "closed_on": "2026-03-31 10:30:00",
  "closing_journal_entry": "ACC-JV-2026-00070" // ← REFERENSI DISIMPAN DI SINI!
}
```

**Field penting:**
- `closing_journal_entry`: Nama jurnal penutup yang terkait periode ini

---

## 2. Cara Sistem Identifikasi Jurnal

### Langkah 1: Saat Close Period

```typescript
// 1. Sistem buat jurnal penutup
const closingJournal = await createClosingJournalEntry(period, config, client);
// Result: { name: "ACC-JV-2026-00070" }

// 2. Sistem simpan referensi ke tabel Accounting Period
await client.update('Accounting Period', '202603 - C', {
  status: 'Closed',
  closing_journal_entry: 'ACC-JV-2026-00070' // ← SIMPAN REFERENSI
});
```

**Hasil di Database:**
```
tabAccounting Period:
  name: "202603 - C"
  closing_journal_entry: "ACC-JV-2026-00070" ← LINK KE JURNAL

tabJournal Entry:
  name: "ACC-JV-2026-00070"
  docstatus: 1 (Submitted)
```

### Langkah 2: Saat Reopen Period

```typescript
// 1. Sistem ambil data periode dari tabel Accounting Period
const period = await client.get('Accounting Period', '202603 - C');
// Result: { 
//   name: "202603 - C",
//   closing_journal_entry: "ACC-JV-2026-00070" ← BACA REFERENSI
// }

// 2. Sistem TAHU jurnal mana yang harus di-cancel
const journalName = period.closing_journal_entry; // "ACC-JV-2026-00070"

// 3. Sistem cancel jurnal di tabel Journal Entry
await client.update('Journal Entry', 'ACC-JV-2026-00070', {
  docstatus: 2 // ← SET KE CANCELLED
});

// 4. Sistem hapus referensi dari tabel Accounting Period
await client.update('Accounting Period', '202603 - C', {
  status: 'Open',
  closing_journal_entry: null // ← HAPUS REFERENSI
});
```

**Hasil di Database:**
```
tabAccounting Period:
  name: "202603 - C"
  closing_journal_entry: null ← REFERENSI DIHAPUS

tabJournal Entry:
  name: "ACC-JV-2026-00070"
  docstatus: 2 (Cancelled) ← STATUS BERUBAH
```

---

## 3. Diagram Relasi

```
┌─────────────────────────────────────┐
│ tabAccounting Period                │
├─────────────────────────────────────┤
│ name: "202603 - C"                  │
│ status: "Closed"                    │
│ closing_journal_entry: ─────────────┼──┐
└─────────────────────────────────────┘  │
                                         │ REFERENSI
                                         │ (Link)
                                         │
                                         ▼
                        ┌─────────────────────────────────────┐
                        │ tabJournal Entry                    │
                        ├─────────────────────────────────────┤
                        │ name: "ACC-JV-2026-00070"           │
                        │ docstatus: 1 (Submitted)            │
                        │ posting_date: "2026-03-31"          │
                        │ user_remark: "Closing entry..."     │
                        └─────────────────────────────────────┘
```

---

## 4. Verifikasi dari Data Anda

### Dari JSON yang Anda Berikan:

```json
{
  "name": "ACC-JV-2026-00070",
  "docstatus": 2,  // ← CANCELLED!
  "posting_date": "2026-03-31",
  "user_remark": "Closing entry for accounting period 202603 - C"
}
```

**Analisis:**
- ✅ `docstatus: 2` → Jurnal **SUDAH DI-CANCEL**
- ✅ `posting_date: "2026-03-31"` → Diposting pada hari terakhir periode
- ✅ `user_remark: "Closing entry..."` → Ini adalah jurnal penutup
- ✅ Jurnal ini **TIDAK AKAN DIHITUNG** dalam laporan (karena `is_cancelled = 1`)

---

## 5. Filter `is_cancelled` di ERPNext

### Cara ERPNext Menyimpan Status Cancel:

**Di tabel `tabJournal Entry`:**
```
docstatus = 2  →  is_cancelled = 1 (otomatis)
```

**Di tabel `tabGL Entry`:**
```
Setiap GL Entry punya field: is_cancelled
Jika jurnal di-cancel → semua GL Entry-nya: is_cancelled = 1
```

### Filter di Sistem Anda:

```typescript
// Semua endpoint sekarang filter:
filters: [
  ['is_cancelled', '=', 0]  // Hanya ambil yang tidak di-cancel
]
```

**Artinya:**
- Jurnal ACC-JV-2026-00070 (docstatus: 2) → is_cancelled: 1
- Filter: `is_cancelled = 0` → Jurnal ini **TIDAK DIAMBIL**
- Hasil: Jurnal yang di-cancel **TIDAK DIHITUNG** ✓

---

## 6. Alur Lengkap dengan Data Anda

### Situasi Saat Ini:

```
tabAccounting Period:
  name: "202603 - C"
  status: "Open" (karena sudah di-reopen)
  closing_journal_entry: null (sudah dihapus saat reopen)

tabJournal Entry:
  name: "ACC-JV-2026-00070"
  docstatus: 2 (Cancelled)
  posting_date: "2026-03-31"
```

### Saat Anda Close Period Lagi:

```
1. Sistem cek: period.closing_journal_entry = null ✓
2. Sistem buat jurnal BARU: ACC-JV-2026-00072
3. Sistem simpan referensi BARU: closing_journal_entry = "ACC-JV-2026-00072"
4. Jurnal lama (ACC-JV-2026-00070) tetap cancelled, tidak dihitung
```

---

## 7. Kesimpulan

### Referensi Disimpan di Dua Tempat:

**1. Tabel `tabAccounting Period`:**
- Field: `closing_journal_entry`
- Nilai: Nama jurnal penutup (contoh: "ACC-JV-2026-00070")
- Fungsi: **LINK** ke jurnal penutup yang terkait periode ini

**2. Tabel `tabJournal Entry`:**
- Field: `docstatus`
- Nilai: 0 (Draft), 1 (Submitted), 2 (Cancelled)
- Fungsi: **STATUS** jurnal (aktif atau cancelled)

### Sistem Tahu Jurnal Mana yang Harus Di-Cancel:

✅ **Baca dari `period.closing_journal_entry`** (bukan cari manual)
✅ **Otomatis & Akurat** (tidak mungkin salah)
✅ **Aman** (hanya cancel jurnal yang benar-benar terkait periode)

### Verifikasi dari Data Anda:

✅ ACC-JV-2026-00070 sudah di-cancel (docstatus: 2)
✅ Jurnal ini tidak akan dihitung dalam laporan (is_cancelled = 1)
✅ Sistem siap untuk close period lagi dengan jurnal baru

**Semua sudah benar!** 🎉
