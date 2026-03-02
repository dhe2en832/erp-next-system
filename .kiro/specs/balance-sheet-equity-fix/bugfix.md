# Bugfix Requirements Document

## Introduction

Laporan Neraca (Balance Sheet) menampilkan Total Ekuitas yang tidak lengkap karena tidak memasukkan Laba/Rugi Bersih dari periode berjalan. Hal ini menyebabkan Neraca tidak seimbang, dimana Total Aktiva tidak sama dengan Total Kewajiban + Total Ekuitas.

Dalam akuntansi, Laba/Rugi Bersih dari Laporan Laba Rugi harus otomatis tercatat sebagai bagian dari Ekuitas pada Neraca. Saat ini, sistem hanya menghitung Ekuitas dari akun-akun Ekuitas yang ada di GL Entry, tanpa memperhitungkan Laba/Rugi Bersih periode berjalan.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN Balance Sheet API menghitung Total Ekuitas THEN sistem hanya menjumlahkan akun-akun dengan root_type='Equity' dari GL Entry tanpa memasukkan Laba/Rugi Bersih periode berjalan

1.2 WHEN terdapat Rugi Bersih -Rp 1.955.000 dari Laporan Laba Rugi THEN Total Ekuitas di Neraca menampilkan Rp 0 (hanya dari akun Ekuitas di GL Entry) bukan -Rp 1.955.000

1.3 WHEN Neraca dihitung dengan Total Ekuitas yang tidak lengkap THEN Neraca tidak seimbang dengan selisih sama dengan nilai Laba/Rugi Bersih yang tidak tercatat

### Expected Behavior (Correct)

2.1 WHEN Balance Sheet API menghitung Total Ekuitas THEN sistem SHALL menjumlahkan akun-akun Ekuitas dari GL Entry DAN menambahkan Laba/Rugi Bersih dari periode yang sama

2.2 WHEN terdapat Rugi Bersih -Rp 1.955.000 dari Laporan Laba Rugi THEN Total Ekuitas di Neraca SHALL menampilkan nilai yang memasukkan Rugi Bersih tersebut (misalnya: Ekuitas dari GL Entry + Rugi Bersih = Total Ekuitas)

2.3 WHEN Neraca dihitung dengan Total Ekuitas yang lengkap THEN Neraca SHALL seimbang dengan formula: Total Aktiva = Total Kewajiban + Total Ekuitas

2.4 WHEN Balance Sheet API menghitung Laba/Rugi Bersih periode berjalan THEN sistem SHALL menggunakan filter tanggal yang sama dengan parameter as_of_date untuk konsistensi perhitungan

### Unchanged Behavior (Regression Prevention)

3.1 WHEN Balance Sheet API menghitung Total Aktiva THEN sistem SHALL CONTINUE TO menjumlahkan semua akun Asset dengan perhitungan (debit - credit)

3.2 WHEN Balance Sheet API menghitung Total Kewajiban THEN sistem SHALL CONTINUE TO menjumlahkan semua akun Liability dengan perhitungan (credit - debit)

3.3 WHEN Balance Sheet API mengkategorikan Aktiva Lancar dan Aktiva Tetap THEN sistem SHALL CONTINUE TO menggunakan logika kategorisasi berdasarkan account_type yang sudah ada

3.4 WHEN Balance Sheet API mengkategorikan Kewajiban Lancar dan Kewajiban Jangka Panjang THEN sistem SHALL CONTINUE TO menggunakan logika kategorisasi berdasarkan account_type yang sudah ada

3.5 WHEN Balance Sheet API menampilkan akun-akun Ekuitas yang ada di GL Entry THEN sistem SHALL CONTINUE TO menampilkan akun-akun tersebut dalam array equity

3.6 WHEN Balance Sheet API memformat nilai mata uang THEN sistem SHALL CONTINUE TO menggunakan format Rupiah Indonesia (Rp X.XXX.XXX,XX)
