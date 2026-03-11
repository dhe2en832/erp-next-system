# Cancel vs Reversal Jurnal - Panduan Lengkap

## Ringkasan

Dokumen ini menjelaskan perbedaan antara **Cancel** dan **Jurnal Balik (Reversal)** serta dampaknya terhadap perhitungan.

---

## 1. Metode Cancel (Yang Anda Gunakan)

### Cara Kerja
```
Jurnal Original: ACC-JV-2026-00070
Status: Cancelled
is_cancelled: 1

GL Entries tetap ada di database, tapi ditandai sebagai cancelled
```

### Karakteristik
- Entry GL **TETAP ADA** di database
- Ditandai dengan flag: `is_cancelled = 1`
- Status jurnal: "Cancelled"
- **TIDAK BISA** di-submit lagi

### Dampak pada Perhitungan
**HARUS** ada filter `is_cancelled = 0` di semua query GL Entry:

```typescript
// BENAR ✓
filters: [
  ['posting_date', '>=', start_date],
  ['posting_date', '<=', end_date],
  ['is_cancelled', '=', 0]  // ← PENTING!
]

// SALAH ✗ (akan menghitung jurnal yang di-cancel)
filters: [
  ['posting_date', '>=', start_date],
  ['posting_date', '<=', end_date]
  // is_cancelled tidak difilter!
]
```

### Keuntungan
✓ Sederhana (satu klik cancel)
✓ Jelas bahwa jurnal salah (status "Cancelled")
✓ Tidak menambah jumlah jurnal
✓ Audit trail tetap ada (jurnal tidak dihapus)

### Kerugian
✗ **HARUS** ada filter `is_cancelled` di SEMUA query
✗ Jika lupa filter, jurnal cancelled tetap dihitung (BUG!)
✗ Tidak ada jurnal koreksi eksplisit

---

## 2. Metode Jurnal Balik (Reversal)

### Cara Kerja
```
Jurnal Original: ACC-JV-2026-00070 (Status: Submitted)
Debit:  4110.000 (Pendapatan)    1.013.000
Credit: 3000.000 (Laba Ditahan)            1.013.000

Jurnal Balik: ACC-JV-2026-00071 (Status: Submitted)
Credit: 4110.000 (Pendapatan)              1.013.000
Debit:  3000.000 (Laba Ditahan)  1.013.000

Net Effect: Saldo kembali seperti sebelum jurnal original
```

### Karakteristik
- Buat jurnal BARU dengan entry **KEBALIKAN**
- Kedua jurnal tetap status "Submitted"
- Kedua jurnal **DIHITUNG** dalam laporan
- Net effect: saldo kembali ke posisi awal

### Dampak pada Perhitungan
**TIDAK PERLU** filter khusus, karena:
- Jurnal original: +1.013.000 ke Laba Ditahan
- Jurnal balik: -1.013.000 dari Laba Ditahan
- Net: 0 (saldo kembali normal)

### Keuntungan
✓ Audit trail sangat jelas (ada jurnal koreksi eksplisit)
✓ Tidak perlu filter khusus
✓ Kedua jurnal tetap valid
✓ Sesuai prinsip akuntansi (tidak menghapus/cancel entry)
✓ Lebih aman (tidak ada risiko lupa filter)

### Kerugian
✗ Dua jurnal di database (lebih banyak data)
✗ Lebih kompleks untuk dipahami user
✗ Perlu buat jurnal balik manual

---

## 3. Bug yang Ditemukan & Diperbaiki

### Bug: Filter `is_cancelled` Hilang

**Lokasi:** `closing-summary/route.ts` (Laporan P&L)

**Sebelum Perbaikan:**
```typescript
const filters: any[] = [
  ['company', '=', company],
  ['posting_date', '>=', period.start_date],
  ['posting_date', '<', period.end_date],
  // is_cancelled TIDAK difilter! ✗
];
```

**Setelah Perbaikan:**
```typescript
const filters: any[] = [
  ['company', '=', company],
  ['posting_date', '>=', period.start_date],
  ['posting_date', '<', period.end_date],
  ['is_cancelled', '=', 0], // ✓ Sekarang difilter
];
```

### Dampak Bug:
- Jurnal yang di-cancel (ACC-JV-2026-00070) **MASIH DIHITUNG** di Laporan P&L
- Menyebabkan perhitungan laba bersih **SALAH**
- Preview wizard **BENAR** karena sudah ada filter

### Status Perbaikan:
✓ **SUDAH DIPERBAIKI** - Filter `is_cancelled = 0` ditambahkan

---

## 4. Rekomendasi untuk Kasus Anda

### Situasi Saat Ini:
1. Jurnal penutup salah (ACC-JV-2026-00070) sudah di-cancel ✓
2. Bug filter sudah diperbaiki ✓
3. Jurnal yang di-cancel sekarang **TIDAK DIHITUNG** ✓

### Rekomendasi: **TETAP GUNAKAN CANCEL**

**Alasan:**
1. Bug sudah diperbaiki (filter `is_cancelled` sudah ditambahkan)
2. Lebih sederhana daripada jurnal balik
3. Jurnal yang di-cancel sudah benar tidak dihitung
4. Tidak perlu buat jurnal balik lagi

### **TIDAK PERLU** Buat Jurnal Balik

Karena:
- Cancel sudah benar (dengan filter yang tepat)
- Jurnal balik akan menambah kompleksitas
- Hasil akhir sama saja

---

## 5. Checklist Verifikasi

### Setelah Perbaikan, Verifikasi:

1. **Refresh Laporan P&L**
   - [ ] Total Pendapatan: Rp 1.319.000
   - [ ] Total Beban: Rp 44.058
   - [ ] Laba Bersih: Rp 1.274.942

2. **Cek Wizard Preview**
   - [ ] Nilai sama dengan Laporan P&L
   - [ ] Tidak ada perbedaan

3. **Cek Wizard Review**
   - [ ] Mode "Periode Ini" menampilkan nilai yang benar
   - [ ] Mode "Kumulatif" menampilkan nilai yang benar

4. **Tutup Periode Lagi**
   - [ ] Jurnal penutup baru dibuat dengan nilai yang benar
   - [ ] Tidak ada jurnal penutup ganda

---

## 6. Best Practice untuk Masa Depan

### Saat Query GL Entry, SELALU Filter:

```typescript
// Template standar untuk query GL Entry
const filters = [
  ['company', '=', company],
  ['posting_date', '>=', start_date],
  ['posting_date', '<=', end_date],
  ['is_cancelled', '=', 0],  // ← WAJIB!
];
```

### Saat Cancel Jurnal:

1. **Pastikan** semua endpoint sudah filter `is_cancelled`
2. **Verifikasi** laporan setelah cancel
3. **Dokumentasikan** alasan cancel (di remarks)

### Saat Perlu Jurnal Balik:

Gunakan jurnal balik jika:
- Audit memerlukan jurnal koreksi eksplisit
- Jurnal original sudah diaudit/dilaporkan
- Perlu audit trail yang sangat jelas

---

## 7. Kesimpulan

### Untuk Kasus Anda:

**✓ SUDAH BENAR** menggunakan Cancel:
- Jurnal yang di-cancel tidak akan dihitung (setelah bug diperbaiki)
- Lebih sederhana daripada jurnal balik
- Hasil akhir sama saja

**✓ BUG SUDAH DIPERBAIKI**:
- Filter `is_cancelled = 0` sudah ditambahkan di `closing-summary/route.ts`
- Semua endpoint sekarang konsisten

**✓ TIDAK PERLU JURNAL BALIK**:
- Cancel sudah cukup
- Tidak ada keuntungan tambahan dari jurnal balik
- Akan menambah kompleksitas tanpa manfaat

### Action Items:

1. ✓ Perbaikan filter sudah dilakukan
2. [ ] Refresh Laporan P&L untuk verifikasi
3. [ ] Tutup periode lagi untuk membuat jurnal penutup yang benar
4. [ ] Verifikasi tidak ada jurnal penutup ganda

---

## 8. File yang Diperbaiki

- `erp-next-system/app/api/accounting-period/reports/closing-summary/route.ts`
  - Ditambahkan filter: `['is_cancelled', '=', 0]`
  - Sekarang konsisten dengan endpoint lain

---

## 9. FAQ

### Q: Apakah jurnal yang di-cancel masih terlihat di database?
**A:** Ya, jurnal tetap ada di database tapi ditandai `is_cancelled = 1` dan tidak dihitung dalam laporan.

### Q: Apakah lebih baik cancel atau jurnal balik?
**A:** Untuk kasus Anda, **cancel sudah cukup**. Jurnal balik hanya diperlukan jika audit memerlukan jurnal koreksi eksplisit.

### Q: Apakah perlu buat jurnal balik untuk jurnal yang sudah di-cancel?
**A:** **TIDAK PERLU**. Cancel sudah benar dan jurnal tidak dihitung. Jurnal balik akan menambah kompleksitas tanpa manfaat.

### Q: Bagaimana cara memastikan jurnal cancelled tidak dihitung?
**A:** Pastikan semua query GL Entry memiliki filter `['is_cancelled', '=', 0]`. Bug ini sudah diperbaiki.

### Q: Apakah bisa un-cancel jurnal?
**A:** **TIDAK**. Jurnal yang sudah di-cancel tidak bisa di-submit lagi. Harus buat jurnal baru.
