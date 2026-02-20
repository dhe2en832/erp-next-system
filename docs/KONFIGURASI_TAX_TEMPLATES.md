# Dokumentasi Konfigurasi Tax Templates

## Ringkasan

Dokumen ini menjelaskan konfigurasi Tax Templates (Template Pajak) yang telah dibuat di sistem ERPNext untuk mendukung perhitungan pajak otomatis pada transaksi penjualan dan pembelian sesuai dengan peraturan perpajakan Indonesia.

## Daftar Tax Templates

### A. Sales Tax Templates (Template Pajak Penjualan)

#### 1. PPN 11% (Default)

**Deskripsi:** Template standar untuk Pajak Pertambahan Nilai (PPN) sebesar 11% yang dikenakan pada penjualan barang/jasa.

**Konfigurasi:**
- **Nama Template:** PPN 11%
- **Perusahaan:** BAC
- **Status:** Default (Ya)
- **Tipe Pajak:** On Net Total (dihitung dari subtotal setelah diskon)
- **Akun GL:** 2210 - Hutang PPN - BAC
- **Rate:** 11%

**Cara Kerja:**
- PPN dihitung sebesar 11% dari Net Total (Subtotal setelah diskon)
- Nilai PPN akan menambah Grand Total invoice
- GL Entry: Credit ke akun 2210 - Hutang PPN

**Contoh Perhitungan:**
```
Subtotal:           Rp 1.000.000
Diskon (10%):       Rp   100.000
Net Total:          Rp   900.000
PPN 11%:            Rp    99.000
Grand Total:        Rp   999.000
```

**Kapan Digunakan:**
- Transaksi penjualan standar kepada customer
- Perusahaan terdaftar sebagai PKP (Pengusaha Kena Pajak)
- Barang/jasa yang dikenakan PPN

---

#### 2. PPN 11% + PPh 23 (2%)

**Deskripsi:** Template untuk transaksi penjualan jasa tertentu yang dikenakan PPN 11% dan dipotong PPh Pasal 23 sebesar 2%.

**Konfigurasi:**
- **Nama Template:** PPN 11% + PPh 23 (2%)
- **Perusahaan:** BAC
- **Status:** Default (Tidak)
- **Pajak 1:**
  - Tipe: On Net Total
  - Akun: 2210 - Hutang PPN - BAC
  - Rate: 11%
  - Add/Deduct: Add
- **Pajak 2:**
  - Tipe: On Net Total
  - Akun: 2230 - Hutang PPh 23 - BAC
  - Rate: 2%
  - Add/Deduct: Add (dicatat sebagai hutang)

**Cara Kerja:**
- PPN 11% dihitung dari Net Total dan menambah Grand Total
- PPh 23 2% dihitung dari Net Total dan dicatat sebagai hutang pajak
- Customer akan membayar Grand Total termasuk PPN
- PPh 23 akan dipotong oleh customer dan disetor ke kantor pajak

**Contoh Perhitungan:**
```
Subtotal:           Rp 1.000.000
Diskon (0%):        Rp         0
Net Total:          Rp 1.000.000
PPN 11%:            Rp   110.000
PPh 23 (2%):        Rp    20.000
Grand Total:        Rp 1.110.000
```

**Kapan Digunakan:**
- Penjualan jasa konsultasi, manajemen, atau jasa profesional lainnya
- Customer adalah badan usaha yang wajib memotong PPh 23
- Sesuai dengan Peraturan Menteri Keuangan tentang PPh Pasal 23

**Jenis Jasa yang Dikenakan PPh 23:**
- Jasa konsultasi
- Jasa manajemen
- Jasa teknik
- Jasa hukum
- Jasa akuntansi
- Dan jasa lainnya sesuai PMK

---

#### 3. PPN 11% + PPh 22 (1.5%)

**Deskripsi:** Template untuk transaksi penjualan yang dikenakan PPN 11% dan PPh Pasal 22 sebesar 1.5% (biasanya untuk impor atau penjualan tertentu).

**Konfigurasi:**
- **Nama Template:** PPN 11% + PPh 22 (1.5%)
- **Perusahaan:** BAC
- **Status:** Default (Tidak)
- **Pajak 1:**
  - Tipe: On Net Total
  - Akun: 2210 - Hutang PPN - BAC
  - Rate: 11%
  - Add/Deduct: Add
- **Pajak 2:**
  - Tipe: On Net Total
  - Akun: 2240 - Hutang PPh 4(2) Final - BAC
  - Rate: 1.5%
  - Add/Deduct: Add

**Cara Kerja:**
- PPN 11% dihitung dari Net Total
- PPh 22 1.5% dihitung dari Net Total
- Keduanya menambah Grand Total

**Contoh Perhitungan:**
```
Subtotal:           Rp 1.000.000
Diskon (0%):        Rp         0
Net Total:          Rp 1.000.000
PPN 11%:            Rp   110.000
PPh 22 (1.5%):      Rp    15.000
Grand Total:        Rp 1.125.000
```

**Kapan Digunakan:**
- Transaksi impor barang
- Penjualan barang tertentu yang dikenakan PPh 22
- Sesuai dengan ketentuan PPh Pasal 22

---

### B. Purchase Tax Templates (Template Pajak Pembelian)

#### 4. PPN Masukan 11% (PKP) - Default

**Deskripsi:** Template untuk PPN Input (PPN Masukan) pada pembelian barang/jasa oleh perusahaan yang terdaftar sebagai PKP. PPN ini dapat dikreditkan.

**Konfigurasi:**
- **Nama Template:** PPN Masukan 11% (PKP)
- **Perusahaan:** BAC
- **Status:** Default (Ya)
- **Tipe Pajak:** On Net Total
- **Akun GL:** 1410 - Pajak Dibayar Dimuka - BAC
- **Rate:** 11%

**Cara Kerja:**
- PPN Masukan dihitung sebesar 11% dari Net Total
- Nilai PPN menambah Grand Total yang harus dibayar
- GL Entry: Debit ke akun 1410 - Pajak Dibayar Dimuka (Aset)
- PPN Masukan dapat dikreditkan dengan PPN Output saat pelaporan SPT

**Contoh Perhitungan:**
```
Subtotal:           Rp   600.000
Diskon (0%):        Rp         0
Net Total:          Rp   600.000
PPN Masukan 11%:    Rp    66.000
Grand Total:        Rp   666.000
```

**Kapan Digunakan:**
- Pembelian barang/jasa untuk operasional perusahaan
- Perusahaan terdaftar sebagai PKP
- Supplier memberikan Faktur Pajak yang valid
- PPN dapat dikreditkan

**Manfaat:**
- Mengurangi beban pajak perusahaan
- PPN Masukan dapat dikreditkan dengan PPN Output
- Tercatat sebagai aset (Pajak Dibayar Dimuka)

---

#### 5. PPN Masukan 11% (Non-PKP)

**Deskripsi:** Template untuk PPN Input pada pembelian oleh perusahaan yang tidak terdaftar sebagai PKP atau untuk pembelian yang PPN-nya tidak dapat dikreditkan. PPN ini dicatat sebagai beban.

**Konfigurasi:**
- **Nama Template:** PPN Masukan 11% (Non-PKP)
- **Perusahaan:** BAC
- **Status:** Default (Tidak)
- **Tipe Pajak:** On Net Total
- **Akun GL:** 5100 - Beban Operasional - BAC
- **Rate:** 11%

**Cara Kerja:**
- PPN Masukan dihitung sebesar 11% dari Net Total
- Nilai PPN menambah Grand Total yang harus dibayar
- GL Entry: Debit ke akun 5100 - Beban Operasional (Expense)
- PPN TIDAK dapat dikreditkan, langsung menjadi beban

**Contoh Perhitungan:**
```
Subtotal:           Rp   600.000
Diskon (0%):        Rp         0
Net Total:          Rp   600.000
PPN Masukan 11%:    Rp    66.000
Grand Total:        Rp   666.000

GL Entry:
Debit:  Persediaan          Rp 600.000
Debit:  Beban Operasional   Rp  66.000
Credit: Hutang Usaha        Rp 666.000
```

**Kapan Digunakan:**
- Perusahaan tidak terdaftar sebagai PKP
- Pembelian untuk keperluan yang tidak dapat dikreditkan
- Supplier tidak memberikan Faktur Pajak yang valid
- Pembelian aset tetap tertentu

**Perbedaan dengan PKP:**
- PPN langsung menjadi beban (expense)
- Tidak dapat dikreditkan dengan PPN Output
- Menambah cost of goods atau operating expense

---

## Akun Chart of Accounts (COA) yang Digunakan

### Akun Pajak Penjualan (Liability)

#### 2210 - Hutang PPN
- **Tipe:** Liability (Kewajiban Lancar)
- **Fungsi:** Mencatat PPN Output yang harus disetor ke kantor pajak
- **Normal Balance:** Credit
- **Digunakan di:** PPN 11%, PPN + PPh 23, PPN + PPh 22

#### 2230 - Hutang PPh 23
- **Tipe:** Liability (Kewajiban Lancar)
- **Fungsi:** Mencatat PPh 23 yang dipotong customer dan harus disetor
- **Normal Balance:** Credit
- **Digunakan di:** PPN + PPh 23

#### 2240 - Hutang PPh 4(2) Final
- **Tipe:** Liability (Kewajiban Lancar)
- **Fungsi:** Mencatat PPh 22 yang harus disetor
- **Normal Balance:** Credit
- **Digunakan di:** PPN + PPh 22

### Akun Pajak Pembelian

#### 1410 - Pajak Dibayar Dimuka
- **Tipe:** Asset (Aset Lancar)
- **Fungsi:** Mencatat PPN Masukan yang dapat dikreditkan
- **Normal Balance:** Debit
- **Digunakan di:** PPN Masukan (PKP)

#### 5100 - Beban Operasional
- **Tipe:** Expense (Beban)
- **Fungsi:** Mencatat PPN Masukan yang tidak dapat dikreditkan
- **Normal Balance:** Debit
- **Digunakan di:** PPN Masukan (Non-PKP)

---

## Cara Menggunakan Tax Templates

### Di Sales Invoice

1. **Buat Sales Invoice baru**
   - Masuk ke menu Selling > Sales Invoice > New

2. **Isi data customer dan items**
   - Pilih customer
   - Tambahkan items dengan qty dan rate

3. **Pilih Tax Template**
   - Scroll ke section "Taxes and Charges"
   - Pilih template yang sesuai:
     - "PPN 11%" untuk transaksi standar
     - "PPN 11% + PPh 23 (2%)" untuk jasa profesional
     - "PPN 11% + PPh 22 (1.5%)" untuk transaksi khusus

4. **Sistem akan otomatis menghitung:**
   - Subtotal dari items
   - Diskon (jika ada)
   - Net Total
   - Pajak sesuai template
   - Grand Total

5. **Submit invoice**
   - Klik "Submit" untuk memposting GL Entry
   - Sistem akan otomatis membuat jurnal:
     - Debit: Piutang Usaha
     - Credit: Pendapatan Penjualan
     - Credit: Hutang PPN (dan pajak lainnya)

### Di Purchase Invoice

1. **Buat Purchase Invoice baru**
   - Masuk ke menu Buying > Purchase Invoice > New

2. **Isi data supplier dan items**
   - Pilih supplier
   - Tambahkan items dengan qty dan rate

3. **Pilih Tax Template**
   - Scroll ke section "Taxes and Charges"
   - Pilih template yang sesuai:
     - "PPN Masukan 11% (PKP)" jika perusahaan PKP dan ada Faktur Pajak
     - "PPN Masukan 11% (Non-PKP)" jika tidak dapat dikreditkan

4. **Sistem akan otomatis menghitung:**
   - Subtotal dari items
   - Diskon (jika ada)
   - Net Total
   - PPN Masukan
   - Grand Total

5. **Submit invoice**
   - Klik "Submit" untuk memposting GL Entry
   - Sistem akan otomatis membuat jurnal:
     - Debit: Persediaan (atau Expense)
     - Debit: Pajak Dibayar Dimuka (PKP) atau Beban Operasional (Non-PKP)
     - Credit: Hutang Usaha

---

## Pelaporan Pajak

### Laporan PPN (SPT Masa PPN)

**Cara Akses:**
- Menu: Reports > VAT Report (akan dibuat di fase 4)

**Informasi yang Ditampilkan:**
- **PPN Output:** Total PPN dari Sales Invoice (akun 2210)
- **PPN Input:** Total PPN Masukan dari Purchase Invoice (akun 1410)
- **PPN Kurang/Lebih Bayar:** PPN Output - PPN Input

**Periode Pelaporan:** Bulanan (setiap tanggal 20 bulan berikutnya)

**Contoh:**
```
Periode: Januari 2024

PPN Output:     Rp 10.000.000
PPN Input:      Rp  7.000.000
PPN Kurang Bayar: Rp  3.000.000

Status: Harus disetor ke kantor pajak
```

### Laporan PPh 23

**Cara Akses:**
- Menu: Accounting > GL Entry
- Filter: Account = 2230 - Hutang PPh 23

**Informasi yang Ditampilkan:**
- Tanggal transaksi
- Nomor invoice
- Customer
- Nilai DPP (Dasar Pengenaan Pajak)
- PPh 23 yang dipotong

**Periode Pelaporan:** Bulanan

---

## Troubleshooting

### Masalah: Tax Template tidak muncul di dropdown

**Penyebab:**
- Template belum dibuat
- Template di-disable
- Company tidak sesuai

**Solusi:**
1. Cek apakah template sudah dibuat dengan script setup
2. Buka template, pastikan "Disabled" tidak dicentang
3. Pastikan Company di template sama dengan Company di invoice

### Masalah: Perhitungan pajak tidak sesuai

**Penyebab:**
- Tax template salah pilih
- Charge type tidak sesuai
- Account head salah

**Solusi:**
1. Verifikasi template yang dipilih sudah benar
2. Cek konfigurasi template di Setup > Tax Template
3. Pastikan rate pajak sesuai (11%, 2%, 1.5%)

### Masalah: GL Entry tidak balanced

**Penyebab:**
- Account tidak ditemukan
- Konfigurasi template salah
- Bug di sistem

**Solusi:**
1. Verifikasi semua account di COA ada
2. Cek konfigurasi template
3. Lihat error log di ERPNext
4. Hubungi administrator sistem

---

## Referensi Peraturan

### PPN 11%
- **Dasar Hukum:** UU No. 7 Tahun 2021 tentang Harmonisasi Peraturan Perpajakan
- **Berlaku:** 1 April 2022
- **Rate:** 11% (sebelumnya 10%)

### PPh Pasal 23
- **Dasar Hukum:** UU No. 36 Tahun 2008 tentang Pajak Penghasilan
- **Rate:** 2% untuk jasa tertentu
- **Objek:** Jasa konsultasi, manajemen, teknik, dll

### PPh Pasal 22
- **Dasar Hukum:** PMK tentang PPh Pasal 22
- **Rate:** 1.5% untuk impor (dengan API)
- **Objek:** Impor barang, penjualan barang tertentu

---

## Kontak dan Dukungan

Untuk pertanyaan lebih lanjut tentang konfigurasi tax templates:

1. **Dokumentasi Teknis:** Lihat file `design.md` dan `requirements.md` di folder spec
2. **Setup Script:** Lihat `scripts/README.md` untuk panduan setup
3. **ERPNext Documentation:** https://docs.erpnext.com/docs/user/manual/en/accounts/sales-taxes-and-charges-template
4. **Administrator Sistem:** Hubungi tim IT untuk bantuan teknis

---

**Dokumen ini dibuat:** 2024-01-15  
**Versi:** 1.0  
**Status:** Completed  
**Task:** 1.8 - Dokumentasi konfigurasi Tax Templates
