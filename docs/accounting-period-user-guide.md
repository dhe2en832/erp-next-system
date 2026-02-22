# Panduan Pengguna: Penutupan Periode Akuntansi

## Daftar Isi

1. [Pengenalan](#pengenalan)
2. [Memulai](#memulai)
3. [Membuat Periode Akuntansi](#membuat-periode-akuntansi)
4. [Menutup Periode](#menutup-periode)
5. [Membuka Kembali Periode](#membuka-kembali-periode)
6. [Penutupan Permanen](#penutupan-permanen)
7. [Laporan dan Audit](#laporan-dan-audit)
8. [Konfigurasi](#konfigurasi)
9. [Troubleshooting](#troubleshooting)

---

## Pengenalan

### Apa itu Penutupan Periode Akuntansi?

Penutupan Periode Akuntansi adalah proses formal untuk mengakhiri periode akuntansi (bulanan, kuartalan, atau tahunan) dan memastikan bahwa:
- Semua transaksi telah dicatat dengan benar
- Akun nominal (pendapatan dan beban) ditutup ke laba ditahan
- Data keuangan terlindungi dari perubahan yang tidak sah
- Laporan keuangan akurat dan dapat diaudit

### Manfaat

- **Integritas Data**: Melindungi data keuangan periode yang sudah ditutup
- **Kepatuhan Audit**: Menyediakan audit trail lengkap untuk semua aktivitas
- **Otomasi**: Membuat jurnal penutup secara otomatis
- **Validasi**: Memastikan semua transaksi lengkap sebelum penutupan
- **Kontrol**: Pembatasan akses berdasarkan role

### Konsep Penting

**Status Periode:**
- **Open (Terbuka)**: Periode aktif, transaksi dapat dibuat/diubah
- **Closed (Ditutup)**: Periode ditutup, transaksi tidak dapat dibuat/diubah (kecuali admin)
- **Permanently Closed (Ditutup Permanen)**: Periode ditutup permanen, tidak dapat dibuka kembali

**Akun Nominal vs Riil:**
- **Akun Nominal**: Pendapatan dan Beban - ditutup setiap periode
- **Akun Riil**: Aset, Liabilitas, Ekuitas - saldo dibawa ke periode berikutnya

---

## Memulai

### Persyaratan

1. **Role yang Diperlukan:**
   - Accounts Manager: Untuk menutup dan membuka kembali periode
   - System Manager: Untuk penutupan permanen dan konfigurasi

2. **Data yang Harus Siap:**
   - Semua transaksi telah diposting
   - Tidak ada transaksi draft
   - Rekonsiliasi bank selesai
   - Invoice penjualan dan pembelian diproses

### Mengakses Modul

1. Login ke sistem ERP
2. Navigasi ke menu **Accounting Period** atau akses langsung di `/accounting-period`
3. Anda akan melihat dashboard dengan daftar periode

---

## Membuat Periode Akuntansi

### Langkah-langkah

1. **Buka Halaman Pembuatan Periode**
   - Klik tombol **"Buat Periode Baru"** di dashboard
   - Atau navigasi ke `/accounting-period/create`

2. **Isi Form Periode**
   
   **Field yang Wajib:**
   - **Nama Periode**: Nama deskriptif (contoh: "Januari 2024")
   - **Perusahaan**: Pilih perusahaan dari dropdown
   - **Tanggal Mulai**: Tanggal awal periode (format: DD/MM/YYYY)
   - **Tanggal Akhir**: Tanggal akhir periode (format: DD/MM/YYYY)
   - **Tipe Periode**: Pilih Monthly, Quarterly, atau Yearly
   
   **Field Opsional:**
   - **Tahun Fiskal**: Link ke fiscal year
   - **Keterangan**: Catatan tambahan

3. **Validasi Otomatis**
   
   Sistem akan memvalidasi:
   - Tanggal mulai harus lebih kecil dari tanggal akhir
   - Periode tidak boleh tumpang tindih dengan periode lain
   - Semua field wajib terisi

4. **Simpan Periode**
   - Klik tombol **"Buat Periode"**
   - Periode akan dibuat dengan status "Open"
   - Anda akan diarahkan ke halaman detail periode

### Tips

- Buat periode di awal bulan untuk memudahkan tracking
- Gunakan naming convention yang konsisten (contoh: "Jan 2024", "Feb 2024")
- Pastikan tanggal tidak tumpang tindih dengan periode lain

---

## Menutup Periode

### Persiapan Sebelum Penutupan

Sebelum menutup periode, pastikan:

1. ✅ Semua transaksi telah diposting
2. ✅ Tidak ada transaksi draft
3. ✅ Rekonsiliasi bank selesai
4. ✅ Semua invoice penjualan diproses
5. ✅ Semua invoice pembelian diproses
6. ✅ Transaksi inventory diposting
7. ✅ Entri payroll dicatat

### Wizard Penutupan (4 Langkah)

#### Langkah 1: Validasi

1. **Akses Wizard Penutupan**
   - Dari halaman detail periode, klik **"Tutup Periode"**
   - Atau dari daftar periode, klik icon tutup pada periode yang ingin ditutup

2. **Review Hasil Validasi**
   
   Sistem akan menjalankan validasi otomatis dan menampilkan hasil:
   
   - **✅ Passed**: Validasi berhasil
   - **⚠️ Warning**: Perlu ditinjau tapi tidak memblokir penutupan
   - **❌ Error**: Harus diselesaikan sebelum melanjutkan
   
   **Contoh Hasil Validasi:**
   ```
   ✅ No Draft Transactions - Passed
   ❌ Bank Reconciliation - Failed (3 unreconciled transactions)
   ✅ Sales Invoices Processed - Passed
   ```

3. **Selesaikan Masalah**
   
   Jika ada error:
   - Klik **"Lihat Detail"** untuk melihat transaksi yang bermasalah
   - Selesaikan masalah di ERPNext
   - Klik **"Jalankan Ulang"** untuk validasi ulang

4. **Lanjut ke Langkah Berikutnya**
   - Klik **"Lanjut ke Review Saldo"** jika semua validasi passed

#### Langkah 2: Review Saldo

1. **Review Ringkasan Laba/Rugi**
   
   Sistem menampilkan:
   - Total Pendapatan
   - Total Beban
   - Laba/Rugi Bersih

2. **Review Akun Nominal**
   
   Tabel menampilkan semua akun pendapatan dan beban dengan:
   - Nama akun
   - Tipe (Income/Expense)
   - Debit dan Kredit
   - Saldo akhir
   
   **Catatan**: Akun-akun ini akan ditutup dengan saldo nol

3. **Review Akun Riil**
   
   Tabel menampilkan akun aset, liabilitas, dan ekuitas:
   - Saldo akun-akun ini akan dibawa ke periode berikutnya

4. **Lanjut ke Preview Jurnal**
   - Klik **"Lanjut ke Preview Jurnal"**

#### Langkah 3: Preview Jurnal Penutup

1. **Review Jurnal Penutup**
   
   Sistem menampilkan preview jurnal yang akan dibuat:
   
   **Contoh Jurnal:**
   ```
   Akun                    | Debit      | Kredit
   ----------------------- | ---------- | ----------
   Sales                   | 10,000,000 | -
   Cost of Goods Sold      | -          | 6,000,000
   Operating Expenses      | -          | 2,000,000
   Retained Earnings       | -          | 2,000,000
   ----------------------- | ---------- | ----------
   Total                   | 10,000,000 | 10,000,000
   ```

2. **Verifikasi Balance**
   
   - Pastikan total debit = total kredit
   - Sistem akan menampilkan ✅ jika seimbang
   - Jika tidak seimbang, hubungi administrator

3. **Lanjut ke Konfirmasi**
   - Klik **"Lanjut ke Konfirmasi"**

#### Langkah 4: Konfirmasi & Penutupan

1. **Review Ringkasan Final**
   
   Sistem menampilkan ringkasan lengkap:
   - Informasi periode
   - Total pendapatan dan beban
   - Laba/rugi bersih
   - Jumlah entri jurnal yang akan dibuat

2. **Baca Peringatan**
   
   ⚠️ **Peringatan Penting:**
   - Setelah periode ditutup, transaksi tidak dapat dibuat/diubah
   - Jurnal penutup akan dibuat dan diposting otomatis
   - Saldo akun nominal akan ditutup ke laba ditahan
   - Periode dapat dibuka kembali oleh administrator jika diperlukan

3. **Konfirmasi Penutupan**
   - Klik **"Tutup Periode Sekarang"**
   - Dialog konfirmasi akan muncul
   - Klik **"Ya, Tutup Periode"** untuk melanjutkan

4. **Proses Penutupan**
   
   Sistem akan:
   - Membuat jurnal penutup
   - Memposting jurnal
   - Menyimpan snapshot saldo
   - Mengubah status periode ke "Closed"
   - Mencatat audit log
   - Mengirim notifikasi
   
   Progress bar akan menampilkan status proses.

5. **Penutupan Berhasil**
   
   Setelah selesai, Anda akan melihat:
   - ✅ Pesan sukses
   - Ringkasan penutupan
   - Link ke detail periode
   - Link ke jurnal penutup

### Force Closing (Admin Only)

Jika Anda adalah System Manager, Anda dapat menutup periode dengan force flag untuk skip validasi:

**Kapan Menggunakan:**
- Situasi darurat
- Validasi tidak relevan untuk kasus tertentu
- Dengan persetujuan manajemen

**Cara:**
1. Centang checkbox **"Force Close (Skip Validations)"** di langkah 1
2. Lanjutkan proses penutupan normal

⚠️ **Peringatan**: Force closing akan dicatat dalam audit log.

---

## Membuka Kembali Periode

### Kapan Membuka Kembali Periode?

Buka kembali periode jika:
- Ditemukan transaksi yang terlewat
- Perlu koreksi data
- Kesalahan dalam penutupan

### Persyaratan

1. **Permissions**: Role Accounts Manager atau System Manager
2. **Status**: Periode harus "Closed" (bukan "Permanently Closed")
3. **Validasi**: Periode berikutnya belum ditutup
4. **Reason**: Alasan pembukaan kembali wajib diisi

### Langkah-langkah

1. **Akses Halaman Detail Periode**
   - Navigasi ke periode yang ingin dibuka kembali

2. **Klik Tombol "Buka Kembali"**
   - Tombol tersedia jika periode berstatus "Closed"

3. **Isi Alasan**
   - Dialog akan muncul meminta alasan
   - Contoh: "Koreksi transaksi yang terlewat pada tanggal 15 Januari"
   - Alasan akan dicatat dalam audit log

4. **Konfirmasi**
   - Klik **"Ya, Buka Kembali"**

5. **Proses Pembukaan**
   
   Sistem akan:
   - Membatalkan jurnal penutup
   - Menghapus jurnal penutup
   - Mengubah status ke "Open"
   - Mencatat audit log
   - Mengirim notifikasi

6. **Periode Terbuka**
   - Status berubah menjadi "Open"
   - Transaksi dapat dibuat/diubah kembali
   - Periode dapat ditutup ulang setelah koreksi selesai

### Validasi Otomatis

Sistem akan menolak pembukaan kembali jika:
- Periode berikutnya sudah ditutup
- Periode sudah permanently closed
- User tidak memiliki permission

---

## Penutupan Permanen

### Apa itu Penutupan Permanen?

Penutupan permanen adalah penutupan final yang tidak dapat dibatalkan. Digunakan untuk periode yang sudah diaudit dan tidak akan ada perubahan lagi.

### Kapan Menggunakan?

- Setelah audit eksternal selesai
- Periode sudah final dan tidak akan ada koreksi
- Untuk kepatuhan regulasi

### Persyaratan

1. **Permissions**: System Manager only
2. **Status**: Periode harus "Closed" terlebih dahulu
3. **Confirmation**: Harus mengetik "PERMANENT" untuk konfirmasi

### Langkah-langkah

1. **Pastikan Periode Sudah Closed**
   - Periode harus ditutup terlebih dahulu
   - Tidak dapat langsung permanent close dari status "Open"

2. **Akses Halaman Detail Periode**

3. **Klik Tombol "Tutup Permanen"**
   - Tombol hanya tersedia untuk System Manager

4. **Baca Peringatan**
   
   ⚠️ **PERINGATAN KRITIS:**
   - Tindakan ini TIDAK DAPAT DIBATALKAN
   - Periode tidak dapat dibuka kembali
   - Transaksi tidak dapat diubah sama sekali
   - Pastikan semua data sudah benar

5. **Ketik Konfirmasi**
   - Ketik **"PERMANENT"** (huruf besar) di field konfirmasi
   - Ini untuk memastikan Anda memahami konsekuensinya

6. **Konfirmasi**
   - Klik **"Ya, Tutup Permanen"**

7. **Periode Permanently Closed**
   - Status berubah menjadi "Permanently Closed"
   - Badge merah akan ditampilkan
   - Semua tombol aksi akan disabled

---

## Laporan dan Audit

### Laporan Ringkasan Penutupan

**Akses:**
- Dari halaman detail periode, klik **"Lihat Laporan Penutupan"**
- Atau navigasi ke `/accounting-period/reports/[name]`

**Isi Laporan:**
1. Informasi periode
2. Jurnal penutup
3. Saldo akun (nominal dan riil)
4. Laba/rugi bersih
5. Metadata penutupan (closed by, closed on)

**Export:**
- Klik **"Export PDF"** untuk download PDF
- Klik **"Export Excel"** untuk download Excel
- File akan include timestamp dan user yang export

### Audit Log

**Akses:**
- Navigasi ke `/accounting-period/audit-log`
- Atau dari menu **"Audit Log"**

**Informasi yang Dicatat:**
- Semua aktivitas penutupan, pembukaan, dan permanent close
- Perubahan konfigurasi
- Modifikasi transaksi di periode tertutup (admin override)
- User yang melakukan aksi
- Timestamp
- Alasan (jika ada)
- Snapshot data sebelum dan sesudah

**Filtering:**
- Filter by periode
- Filter by action type
- Filter by user
- Filter by date range

**Export:**
- Export audit log ke CSV untuk analisis lebih lanjut

### Laporan Perbandingan Periode

**Akses:**
- Navigasi ke `/accounting-period/comparison`

**Fitur:**
- Bandingkan saldo akun across multiple periods
- Lihat trends dan perubahan
- Identifikasi anomali

---

## Konfigurasi

### Mengakses Konfigurasi

**Permissions Required**: System Manager atau Accounts Manager

**Akses:**
- Navigasi ke `/accounting-period/settings`
- Atau dari menu **"Settings"**

### Pengaturan yang Tersedia

#### 1. Akun Laba Ditahan

**Field**: Retained Earnings Account

**Deskripsi**: Akun ekuitas yang digunakan untuk mencatat laba/rugi bersih

**Validasi**: Harus akun dengan root_type "Equity"

**Default**: 3600 - Retained Earnings

#### 2. Validasi Checks

Toggle untuk enable/disable validasi tertentu:

- ☑️ **Enable Draft Transaction Check**: Cek transaksi draft
- ☑️ **Enable Unposted Transaction Check**: Cek transaksi yang belum diposting
- ☑️ **Enable Bank Reconciliation Check**: Cek rekonsiliasi bank
- ☑️ **Enable Sales Invoice Check**: Cek invoice penjualan
- ☑️ **Enable Purchase Invoice Check**: Cek invoice pembelian
- ☑️ **Enable Inventory Check**: Cek transaksi inventory
- ☑️ **Enable Payroll Check**: Cek entri payroll

**Rekomendasi**: Enable semua checks untuk keamanan maksimal

#### 3. Role Assignments

**Closing Role**: Role yang dapat menutup periode (default: Accounts Manager)

**Reopen Role**: Role yang dapat membuka kembali periode (default: Accounts Manager)

**Catatan**: System Manager selalu memiliki semua permissions

#### 4. Notifikasi

**Reminder Days Before End**: Jumlah hari sebelum akhir periode untuk kirim reminder (default: 3)

**Escalation Days After End**: Jumlah hari setelah akhir periode untuk kirim escalation (default: 7)

**Enable Email Notifications**: Toggle untuk enable/disable email notifications

### Menyimpan Konfigurasi

1. Ubah pengaturan sesuai kebutuhan
2. Klik **"Simpan Konfigurasi"**
3. Perubahan akan dicatat dalam audit log
4. Notifikasi sukses akan ditampilkan

---

## Troubleshooting

### Masalah Umum dan Solusi

#### 1. Validasi Gagal: Draft Transactions

**Masalah**: "Found X draft transaction(s)"

**Solusi**:
1. Klik "Lihat Detail" untuk melihat daftar transaksi draft
2. Buka setiap transaksi di ERPNext
3. Submit atau cancel transaksi tersebut
4. Jalankan validasi ulang

#### 2. Validasi Gagal: Bank Reconciliation

**Masalah**: "Found X unreconciled bank transactions"

**Solusi**:
1. Buka Bank Reconciliation di ERPNext
2. Rekonsiliasi transaksi yang belum direkonsiliasi
3. Atau disable check ini di konfigurasi jika tidak relevan
4. Jalankan validasi ulang

#### 3. Tidak Bisa Membuka Kembali Periode

**Masalah**: "Cannot reopen period: subsequent period is already closed"

**Solusi**:
1. Buka kembali periode berikutnya terlebih dahulu
2. Kemudian buka kembali periode yang diinginkan
3. Tutup ulang periode secara berurutan

#### 4. Permission Denied

**Masalah**: "Insufficient permissions to close period"

**Solusi**:
1. Pastikan Anda memiliki role yang sesuai (Accounts Manager)
2. Hubungi System Manager untuk assign role
3. Atau minta System Manager untuk melakukan aksi tersebut

#### 5. Jurnal Tidak Seimbang

**Masalah**: "Journal entry is not balanced"

**Solusi**:
1. Ini adalah bug sistem, hubungi administrator
2. Jangan lanjutkan penutupan
3. Administrator perlu memeriksa konfigurasi akun

#### 6. Periode Tumpang Tindih

**Masalah**: "Period overlaps with existing period"

**Solusi**:
1. Periksa tanggal mulai dan akhir periode
2. Pastikan tidak ada overlap dengan periode lain
3. Ubah tanggal atau hapus periode yang overlap

### Mendapatkan Bantuan

Jika masalah tidak dapat diselesaikan:

1. **Check Documentation**: Baca dokumentasi lengkap
2. **Check Audit Log**: Lihat audit log untuk detail error
3. **Contact Administrator**: Hubungi System Manager
4. **Create Issue**: Buat issue di repository jika bug sistem

---

## Best Practices

### 1. Penutupan Rutin

- Tutup periode secara rutin (bulanan)
- Jangan menunda penutupan terlalu lama
- Set reminder untuk penutupan

### 2. Validasi Sebelum Penutupan

- Selalu jalankan validasi sebelum penutupan
- Selesaikan semua error
- Review warning dengan seksama

### 3. Dokumentasi

- Catat alasan jika membuka kembali periode
- Simpan laporan penutupan untuk audit
- Export audit log secara berkala

### 4. Permanent Closing

- Hanya permanent close setelah audit selesai
- Double-check semua data sebelum permanent close
- Pastikan backup data tersedia

### 5. Permissions

- Batasi akses penutupan hanya untuk user yang berwenang
- Review permissions secara berkala
- Monitor audit log untuk aktivitas mencurigakan

### 6. Backup

- Backup database sebelum penutupan periode penting
- Simpan backup sebelum permanent close
- Test restore procedure secara berkala

---

## Glossary

**Accounting Period**: Rentang waktu tertentu untuk pencatatan transaksi keuangan

**Closing Journal**: Jurnal khusus yang dibuat untuk menutup akun nominal

**Nominal Account**: Akun pendapatan dan beban yang ditutup setiap periode

**Real Account**: Akun aset, liabilitas, dan ekuitas yang saldonya dibawa ke periode berikutnya

**Retained Earnings**: Akun ekuitas yang mencatat akumulasi laba/rugi

**Audit Trail**: Catatan riwayat perubahan dan aktivitas sistem

**Force Close**: Menutup periode dengan skip validasi (admin only)

**Permanent Close**: Penutupan final yang tidak dapat dibatalkan

---

## Lampiran

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + N` | Create new period |
| `Ctrl + S` | Save changes |
| `Esc` | Close dialog |

### Status Colors

| Status | Color | Meaning |
|--------|-------|---------|
| Open | Green | Period is active |
| Closed | Blue | Period is closed |
| Permanently Closed | Red | Period is permanently closed |

### Notification Types

| Type | Icon | Severity |
|------|------|----------|
| Reminder | ℹ️ | Info |
| Overdue | ⚠️ | Warning |
| Escalation | 🚨 | Critical |

---

**Versi Dokumen**: 1.0  
**Terakhir Diperbarui**: 2024  
**Penulis**: Tim Development ERP
