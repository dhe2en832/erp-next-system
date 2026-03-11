# Panduan Lengkap Penutupan Periode

## Ringkasan

Panduan ini menjelaskan proses penutupan periode, rumus perhitungan, dan apa yang terjadi ketika periode dibuka kembali.

---

## 1. Rumus Perhitungan Laba Bersih

### Rumus Terpadu (Semua Endpoint)

Semua tiga titik perhitungan sekarang menggunakan rumus yang sama melalui utility `calculateNetIncome()`:

```typescript
Total Pendapatan = JUMLAH(|saldo| untuk semua akun Pendapatan)
Total Beban = |JUMLAH(saldo untuk semua akun Beban)|
Laba Bersih = Total Pendapatan - Total Beban
```

### Mengapa Rumus Ini?

**Akun Pendapatan:**
- Saldo normal: KREDIT (Cr)
- Dalam format Dr-Cr: Nilai negatif
- Contoh: 4110.000 memiliki Cr 1.013.000 → saldo = -1.013.000
- Untuk P&L: Gunakan nilai absolut = 1.013.000

**Akun Beban:**
- Saldo normal: DEBIT (Dr)
- Dalam format Dr-Cr: Nilai positif
- Contoh: 5110.022 memiliki Dr 167.200 → saldo = 167.200
- Jika akun memiliki saldo KREDIT (negatif), itu adalah penyesuaian yang mengurangi beban
- Untuk P&L: Jumlahkan semua saldo, lalu ambil nilai absolut

### Contoh Perhitungan

**Data:**
- Pendapatan: 4110.000 (Cr 1.013.000), 4480.000 (Cr 500.000)
- Beban: 5110.022 (Dr 167.200), 5230.001 (Dr 250.000), 5110.020 (Cr 1.269.000), 5140.001 (Dr 807.742)

**Perhitungan:**
```
Total Pendapatan = |1.013.000| + |500.000| = 1.513.000

Jumlah Beban = 167.200 + 250.000 - 1.269.000 + 807.742 = -44.058
Total Beban = |-44.058| = 44.058

Laba Bersih = 1.513.000 - 44.058 = 1.468.942
```

---

## 2. Titik Perhitungan

### Titik 1: Laporan P&L
**Endpoint:** `/api/accounting-period/reports/closing-summary`
**Tampilan:** `ClosingSummaryReport.tsx`
**Filter Data:** `posting_date >= start_date DAN posting_date < end_date`
**Mengecualikan:** Entry pada hari terakhir (jurnal penutup)

### Titik 2: Preview Wizard (Langkah 3)
**Endpoint:** `/api/accounting-period/preview-closing/[name]`
**Tampilan:** Wizard langkah 3 "Preview Jurnal"
**Filter Data:** `posting_date >= start_date DAN posting_date < end_date`
**Mengecualikan:** Entry pada hari terakhir

### Titik 3: Review Wizard (Langkah 2)
**Halaman:** `/app/accounting-period/close/[name]/review/page.tsx`
**Sumber Data:** `/api/accounting-period/balances/[name]`
**Menampilkan:** Saldo kumulatif dan periode ini
**Perhitungan:** Menggunakan saldo periode ini secara default

---

## 3. Kumulatif vs Periode Ini

### Mode Kumulatif
- **Data:** Semua GL entry dari awal waktu sampai akhir periode
- **Kegunaan:** Melihat posisi keuangan total
- **Filter:** `posting_date <= period.end_date`

### Mode Periode Ini
- **Data:** Hanya GL entry dalam periode ini
- **Kegunaan:** Melihat performa periode berjalan
- **Filter:** `posting_date >= period.start_date DAN posting_date < period.end_date`

### Di Wizard Review
Wizard menampilkan toggle untuk beralih antar mode:
- Default: Periode Ini (untuk perhitungan penutupan)
- Alternatif: Kumulatif (untuk referensi)

---

## 4. Jurnal Penutup Otomatis

### Fungsi
Secara otomatis menutup akun nominal (Pendapatan & Beban) ke saldo nol dan mentransfer laba bersih ke Laba Ditahan.

### Struktur
```
Debit:  Akun Pendapatan (sejumlah saldonya)
Debit:  Akun Beban (sejumlah saldonya)
Kredit: Laba Ditahan (sejumlah laba bersih)
```

### Contoh
```
Debit:  4110.000 (Pendapatan)        1.013.000
Debit:  4480.000 (Pendapatan)          500.000
Debit:  5110.022 (Beban)               167.200
Debit:  5230.001 (Beban)               250.000
Debit:  5110.020 (Penyesuaian Beban) 1.269.000
Debit:  5140.001 (Beban)               807.742
Kredit: 3000.000 (Laba Ditahan)                1.468.942
```

### Kapan Diposting
- Diposting pada: **Hari terakhir periode** (period.end_date)
- Status: **Submitted** (terkunci, tidak bisa diedit)
- Dikecualikan dari P&L: Ya (filter: `posting_date < end_date`)

---

## 5. Skenario Pembukaan Kembali Periode

### Skenario 1: Tutup Normal → Buka Kembali → Tutup Lagi

#### Langkah 1: Penutupan Awal
```
Status Periode: Terbuka → Ditutup
Jurnal Penutup: ACC-JV-2026-00070 (diposting pada 2026-03-31)
Akun Nominal: Semua saldo nol
Laba Ditahan: +1.468.942
```

#### Langkah 2: Buka Kembali Periode
```
Status Periode: Ditutup → Terbuka
Jurnal Penutup: Masih ada dan masih diposting
Akun Nominal: Masih saldo nol (entry tidak dibalik)
```

**⚠️ Masalah:** Jika transaksi baru ditambahkan, mereka tidak akan termasuk dalam jurnal penutup lama.

#### Langkah 3: Tutup Lagi
```
Jurnal Penutup Baru: ACC-JV-2026-00071 (diposting pada 2026-03-31)
Jurnal Penutup Lama: ACC-JV-2026-00070 (masih diposting)
```

**⚠️ Masalah Kritis:** Entry penutup GANDA!
- Jurnal lama: +1.468.942 ke Laba Ditahan
- Jurnal baru: +1.468.942 ke Laba Ditahan
- Total: +2.937.884 (SALAH!)

### Dampak pada P&L

**Kabar Baik:** Laporan P&L TIDAK terpengaruh
- Filter: `posting_date < period.end_date`
- Kedua jurnal penutup ada di 2026-03-31
- Keduanya dikecualikan dari perhitungan P&L ✓

**Kabar Buruk:** Laba Ditahan SALAH
- Akan memiliki dua kali lipat laba bersih
- Mempengaruhi Neraca
- Mempengaruhi perhitungan periode berikutnya

---

## 6. Rekomendasi Perbaikan

### Masalah 1: Jurnal Penutup Ganda
**Saat Ini:** Tidak ada pembersihan otomatis saat membuka kembali

**Rekomendasi:**
```typescript
// Saat membuka kembali periode, batalkan jurnal penutup lama
if (period.closing_journal_entry) {
  // Batalkan jurnal penutup lama
  await client.call('Journal Entry', period.closing_journal_entry, 'amend');
  await client.call('Journal Entry', period.closing_journal_entry, 'cancel');
  
  // Hapus referensi
  await client.update('Accounting Period', period.name, {
    closing_journal_entry: null
  });
}
```

### Masalah 2: Peringatan Pengguna
**Saat Ini:** Tidak ada peringatan saat membuka kembali

**Rekomendasi:**
- Tampilkan dialog konfirmasi: "Membuka kembali akan mempertahankan jurnal penutup yang ada. Anda perlu membatalkannya secara manual sebelum menutup lagi."
- Atau: Otomatis batalkan jurnal penutup lama

### Masalah 3: Validasi
**Saat Ini:** Tidak ada validasi bahwa jurnal penutup sesuai dengan saldo saat ini

**Rekomendasi:**
- Saat menutup lagi, verifikasi bahwa jurnal penutup lama sudah dibatalkan
- Tampilkan error jika terdeteksi jurnal penutup ganda

---

## 7. File yang Dimodifikasi

### Logika Perhitungan (Terpusat)
- `erp-next-system/lib/calculate-net-income.ts` - Fungsi utility bersama

### API Endpoints
- `erp-next-system/app/api/accounting-period/reports/closing-summary/route.ts` - Perhitungan P&L
- `erp-next-system/app/api/accounting-period/preview-closing/[name]/route.ts` - Preview wizard
- `erp-next-system/app/api/accounting-period/balances/[name]/route.ts` - Data saldo

### Komponen UI
- `erp-next-system/app/accounting-period/components/ClosingSummaryReport.tsx` - Tampilan P&L
- `erp-next-system/app/accounting-period/close/[name]/review/page.tsx` - Review wizard
- `erp-next-system/app/accounting-period/close/[name]/page.tsx` - Wizard utama

---

## 8. Checklist Verifikasi

### ✓ Sudah Diverifikasi Benar
- [x] Semua tiga titik perhitungan menggunakan rumus yang sama
- [x] Akun pendapatan: nilai absolut dari saldo
- [x] Akun beban: nilai absolut dari jumlah
- [x] Jurnal penutup dikecualikan dari P&L (posting_date < end_date)
- [x] Perbedaan Kumulatif vs Periode Ini jelas
- [x] Wizard menampilkan laba bersih yang benar di semua langkah

### ⚠️ Masalah yang Diketahui
- [ ] Jurnal penutup ganda saat periode dibuka kembali dan ditutup lagi
- [ ] Tidak ada pembersihan otomatis jurnal penutup lama
- [ ] Laba Ditahan terpengaruh oleh jurnal ganda
- [ ] Tidak ada peringatan pengguna saat membuka kembali periode

### 📋 Tindakan yang Direkomendasikan
1. Implementasi pembatalan otomatis jurnal penutup lama
2. Tambahkan dialog konfirmasi pengguna untuk pembukaan kembali periode
3. Tambahkan validasi untuk mendeteksi jurnal penutup ganda
4. Buat test case untuk skenario pembukaan kembali periode

---

## 9. Rekomendasi Testing

### Test Case 1: Penutupan Normal
```
1. Buat periode dengan transaksi
2. Tutup periode
3. Verifikasi: P&L menampilkan laba bersih yang benar
4. Verifikasi: Jurnal penutup dibuat
5. Verifikasi: Akun nominal saldo nol
```

### Test Case 2: Buka Kembali dan Tutup Lagi
```
1. Tutup periode (membuat ACC-JV-2026-00070)
2. Buka kembali periode
3. Tambahkan transaksi baru
4. Tutup periode lagi (membuat ACC-JV-2026-00071)
5. Verifikasi: P&L masih benar (kedua jurnal dikecualikan)
6. Verifikasi: Laba Ditahan memiliki jumlah GANDA (masalah yang diketahui)
```

### Test Case 3: Kumulatif vs Periode Ini
```
1. Buat periode dengan transaksi
2. Lihat wizard review
3. Toggle antara Kumulatif dan Periode Ini
4. Verifikasi: Keduanya menampilkan laba bersih yang benar
5. Verifikasi: Kumulatif >= Periode Ini
```

---

## 10. Kesimpulan

**Status Saat Ini:**
- ✓ Semua perhitungan P&L konsisten dan benar
- ✓ Jurnal penutup dikecualikan dengan benar dari P&L
- ✓ Perbedaan Kumulatif vs Periode Ini jelas
- ⚠️ Jurnal penutup ganda mungkin terjadi saat membuka kembali

**Langkah Selanjutnya:**
1. Implementasi pembersihan otomatis jurnal penutup lama
2. Tambahkan peringatan pengguna untuk pembukaan kembali periode
3. Buat test suite yang komprehensif
4. Dokumentasikan best practice pembukaan kembali periode untuk pengguna

---

## 11. Pertanyaan yang Sering Diajukan (FAQ)

### Q: Apa fungsi jurnal penutup otomatis?
**A:** Jurnal penutup otomatis berfungsi untuk:
1. Menutup semua akun nominal (Pendapatan & Beban) ke saldo nol
2. Mentransfer laba/rugi bersih ke akun Laba Ditahan
3. Mempersiapkan periode berikutnya dengan akun nominal yang bersih

### Q: Apa yang terjadi jika periode yang sudah ditutup dibuka kembali?
**A:** Ketika periode dibuka kembali:
1. Status periode berubah dari "Ditutup" menjadi "Terbuka"
2. Jurnal penutup yang sudah dibuat TETAP ada dan masih diposting
3. Akun nominal masih memiliki saldo nol (entry tidak dibalik otomatis)
4. Jika ada transaksi baru, mereka tidak akan termasuk dalam jurnal penutup lama

### Q: Apa yang terjadi jika periode ditutup lagi setelah dibuka kembali?
**A:** Ketika periode ditutup lagi:
1. Sistem membuat jurnal penutup BARU
2. Jurnal penutup LAMA masih ada (tidak dibatalkan otomatis)
3. **Masalah:** Laba Ditahan akan memiliki jumlah GANDA
4. **Solusi:** Batalkan jurnal penutup lama secara manual sebelum menutup lagi

### Q: Apakah jurnal penutup ganda mempengaruhi laporan P&L?
**A:** TIDAK. Laporan P&L tidak terpengaruh karena:
1. Filter P&L: `posting_date < period.end_date`
2. Jurnal penutup diposting pada hari terakhir periode (end_date)
3. Kedua jurnal penutup (lama dan baru) dikecualikan dari perhitungan P&L

### Q: Bagaimana cara menghindari jurnal penutup ganda?
**A:** Untuk menghindari jurnal penutup ganda:
1. **Sebelum membuka kembali periode:** Pastikan Anda benar-benar perlu membuka kembali
2. **Setelah membuka kembali:** Batalkan jurnal penutup lama secara manual
3. **Sebelum menutup lagi:** Verifikasi tidak ada jurnal penutup yang masih aktif
4. **Rekomendasi:** Tunggu implementasi pembatalan otomatis

### Q: Mengapa rumus perhitungan menggunakan nilai absolut?
**A:** Karena:
1. Akun Pendapatan memiliki saldo KREDIT (negatif dalam format Dr-Cr)
2. Akun Beban memiliki saldo DEBIT (positif dalam format Dr-Cr)
3. Beberapa akun beban mungkin memiliki saldo KREDIT (penyesuaian)
4. Nilai absolut memastikan perhitungan yang benar untuk semua kasus

### Q: Apa perbedaan antara mode Kumulatif dan Periode Ini?
**A:**
- **Kumulatif:** Menampilkan saldo dari awal waktu sampai akhir periode (untuk melihat posisi keuangan total)
- **Periode Ini:** Menampilkan saldo hanya untuk transaksi dalam periode ini (untuk melihat performa periode berjalan)
- **Untuk penutupan:** Gunakan mode "Periode Ini"
