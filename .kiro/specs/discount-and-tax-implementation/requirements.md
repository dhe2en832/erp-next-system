# Requirements Document: Implementasi Fitur Diskon dan Pajak

## Introduction

Dokumen ini mendefinisikan requirements untuk implementasi fitur diskon dan pajak pada sistem ERP berbasis ERPNext yang sudah berjalan di production. Sistem saat ini sudah memiliki Chart of Accounts (COA) lengkap dengan 221 akun termasuk akun pajak dan diskon, serta Sales Invoice dan Purchase Invoice yang sudah berfungsi dengan GL Entry auto-posting. ERPNext secara native sudah mendukung diskon dan pajak di level DocType, namun fitur ini belum terimplementasi di UI dan API.

Implementasi ini harus memastikan backward compatibility dengan invoice yang sudah ada, tidak merusak GL Entry logic yang sudah berjalan, dan memberikan user experience yang jelas untuk input diskon dan pajak.

## Glossary

- **ERP_System**: Sistem Enterprise Resource Planning berbasis ERPNext yang sudah production
- **Sales_Invoice**: Dokumen faktur penjualan yang mencatat transaksi penjualan kepada customer
- **Purchase_Invoice**: Dokumen faktur pembelian yang mencatat transaksi pembelian dari supplier
- **GL_Entry**: General Ledger Entry, catatan akuntansi yang diposting otomatis dari invoice
- **Tax_Template**: Template konfigurasi pajak di ERPNext yang mendefinisikan jenis pajak, rate, dan akun GL
- **Discount_Field**: Field diskon yang sudah ada di ERPNext DocType dengan nilai default 0
- **Tax_Field**: Field pajak yang sudah ada di ERPNext DocType dengan nilai default 0
- **COA**: Chart of Accounts, daftar akun akuntansi yang digunakan sistem
- **PPN**: Pajak Pertambahan Nilai (Value Added Tax) dengan rate 11%
- **PPh_23**: Pajak Penghasilan Pasal 23 untuk jasa tertentu
- **PPh_22**: Pajak Penghasilan Pasal 22 untuk impor barang
- **API_Endpoint**: REST API endpoint untuk operasi CRUD invoice
- **Financial_Report**: Laporan keuangan seperti Laba Rugi, Neraca, dan Laporan PPN
- **Contra_Account**: Akun pengurang (contra account) seperti Potongan Penjualan dan Potongan Pembelian

## Requirements

### Requirement 1: Setup Tax Templates di ERPNext

**User Story:** Sebagai Finance Manager, saya ingin mengkonfigurasi template pajak standar Indonesia di ERPNext, sehingga user dapat memilih jenis pajak dengan mudah saat membuat invoice.

#### Acceptance Criteria

1. THE ERP_System SHALL menyediakan Tax_Template untuk PPN 11% yang terhubung ke akun 2210 - Hutang PPN (untuk output) dan 1410 - Pajak Dibayar Dimuka (untuk input)
2. THE ERP_System SHALL menyediakan Tax_Template untuk PPh_23 dengan rate 2% yang terhubung ke akun 2230 - Hutang PPh 23
3. THE ERP_System SHALL menyediakan Tax_Template untuk PPh_22 dengan rate 1.5% yang terhubung ke akun 2240 - Hutang PPh 4(2) Final
4. WHEN Tax_Template dibuat, THE ERP_System SHALL memvalidasi bahwa akun GL yang direferensikan ada di COA
5. THE ERP_System SHALL menyimpan konfigurasi Tax_Template secara persistent di database ERPNext
6. WHEN user mengakses dropdown pajak di invoice form, THE ERP_System SHALL menampilkan semua Tax_Template yang aktif

### Requirement 2: API Enhancement untuk Sales Invoice

**User Story:** Sebagai Developer, saya ingin API Sales Invoice mendukung field diskon dan pajak, sehingga aplikasi frontend dapat mengirim dan menerima data diskon/pajak.

#### Acceptance Criteria

1. WHEN Sales_Invoice dibuat via API, THE API_Endpoint SHALL menerima field `discount_amount` (optional, default 0)
2. WHEN Sales_Invoice dibuat via API, THE API_Endpoint SHALL menerima field `discount_percentage` (optional, default 0)
3. WHEN Sales_Invoice dibuat via API, THE API_Endpoint SHALL menerima array `taxes` yang berisi tax template dan amount (optional, default empty array)
4. WHEN Sales_Invoice dengan diskon disubmit, THE ERP_System SHALL membuat GL_Entry ke akun 4300 - Potongan Penjualan
5. WHEN Sales_Invoice dengan PPN disubmit, THE ERP_System SHALL membuat GL_Entry ke akun 2210 - Hutang PPN
6. THE API_Endpoint SHALL mengembalikan response yang mencakup field diskon dan pajak untuk operasi GET
7. WHEN API menerima request dengan field diskon/pajak invalid, THE API_Endpoint SHALL mengembalikan error 400 dengan pesan deskriptif
8. FOR ALL Sales_Invoice yang sudah ada (tanpa diskon/pajak), API GET SHALL mengembalikan nilai 0 untuk field diskon dan empty array untuk taxes (backward compatibility)

### Requirement 3: API Enhancement untuk Purchase Invoice

**User Story:** Sebagai Developer, saya ingin API Purchase Invoice mendukung field diskon dan pajak, sehingga aplikasi frontend dapat mengirim dan menerima data diskon/pajak pembelian.

#### Acceptance Criteria

1. WHEN Purchase_Invoice dibuat via API, THE API_Endpoint SHALL menerima field `discount_amount` (optional, default 0)
2. WHEN Purchase_Invoice dibuat via API, THE API_Endpoint SHALL menerima field `discount_percentage` (optional, default 0)
3. WHEN Purchase_Invoice dibuat via API, THE API_Endpoint SHALL menerima array `taxes` yang berisi tax template dan amount (optional, default empty array)
4. WHEN Purchase_Invoice dengan diskon disubmit, THE ERP_System SHALL membuat GL_Entry ke akun 5300 - Potongan Pembelian
5. WHEN Purchase_Invoice dengan PPN disubmit, THE ERP_System SHALL membuat GL_Entry ke akun 1410 - Pajak Dibayar Dimuka
6. THE API_Endpoint SHALL mengembalikan response yang mencakup field diskon dan pajak untuk operasi GET
7. WHEN API menerima request dengan field diskon/pajak invalid, THE API_Endpoint SHALL mengembalikan error 400 dengan pesan deskriptif
8. FOR ALL Purchase_Invoice yang sudah ada (tanpa diskon/pajak), API GET SHALL mengembalikan nilai 0 untuk field diskon dan empty array untuk taxes (backward compatibility)

### Requirement 4: UI Implementation untuk Invoice Form

**User Story:** Sebagai User, saya ingin input diskon dan pajak langsung di form invoice, sehingga saya dapat mencatat transaksi dengan lengkap tanpa perlu edit manual di ERPNext.

#### Acceptance Criteria

1. WHEN user membuka Sales_Invoice form, THE ERP_System SHALL menampilkan section "Diskon" dengan input untuk discount_percentage atau discount_amount
2. WHEN user membuka Sales_Invoice form, THE ERP_System SHALL menampilkan section "Pajak" dengan dropdown untuk memilih Tax_Template
3. WHEN user mengisi discount_percentage, THE ERP_System SHALL menghitung discount_amount secara otomatis berdasarkan subtotal
4. WHEN user mengisi discount_amount, THE ERP_System SHALL menghitung discount_percentage secara otomatis berdasarkan subtotal
5. WHEN user memilih Tax_Template, THE ERP_System SHALL menghitung tax amount secara otomatis berdasarkan subtotal setelah diskon
6. THE ERP_System SHALL menampilkan summary section yang menunjukkan: Subtotal, Diskon, Subtotal setelah Diskon, Pajak, dan Grand Total
7. WHEN user mengubah item di invoice, THE ERP_System SHALL recalculate semua nilai diskon dan pajak secara real-time
8. THE ERP_System SHALL menampilkan UI yang sama untuk Purchase_Invoice form dengan label yang sesuai

### Requirement 5: Validasi Data Diskon dan Pajak

**User Story:** Sebagai System Administrator, saya ingin sistem memvalidasi input diskon dan pajak, sehingga data yang tersimpan selalu konsisten dan tidak merusak laporan keuangan.

#### Acceptance Criteria

1. WHEN user mengisi discount_percentage, THE ERP_System SHALL memvalidasi bahwa nilainya antara 0 dan 100
2. WHEN user mengisi discount_amount, THE ERP_System SHALL memvalidasi bahwa nilainya tidak melebihi subtotal
3. WHEN user memilih Tax_Template, THE ERP_System SHALL memvalidasi bahwa template tersebut aktif dan valid
4. IF discount_percentage dan discount_amount diisi bersamaan, THEN THE ERP_System SHALL menggunakan discount_amount sebagai nilai final
5. WHEN invoice disubmit, THE ERP_System SHALL memvalidasi bahwa grand_total = subtotal - discount + taxes
6. IF validasi gagal, THEN THE ERP_System SHALL menampilkan error message yang jelas dan mencegah submit
7. THE ERP_System SHALL memvalidasi bahwa akun GL yang direferensikan oleh Tax_Template masih ada di COA sebelum posting GL_Entry

### Requirement 6: GL Entry Posting untuk Diskon Penjualan

**User Story:** Sebagai Accountant, saya ingin diskon penjualan otomatis diposting ke akun Potongan Penjualan, sehingga laporan keuangan mencerminkan diskon yang diberikan.

#### Acceptance Criteria

1. WHEN Sales_Invoice dengan diskon disubmit, THE ERP_System SHALL membuat GL_Entry debit ke akun 4300 - Potongan Penjualan
2. WHEN Sales_Invoice dengan diskon disubmit, THE ERP_System SHALL mengurangi GL_Entry credit ke akun piutang sebesar nilai diskon
3. THE ERP_System SHALL mencatat discount_amount di GL_Entry remarks untuk audit trail
4. WHEN Sales_Invoice dengan diskon dibatalkan, THE ERP_System SHALL membuat reversal GL_Entry untuk diskon
5. FOR ALL GL_Entry yang diposting, THE ERP_System SHALL memastikan total debit = total credit (balanced entry)
6. THE ERP_System SHALL memposting GL_Entry dengan posting_date yang sama dengan invoice date

### Requirement 7: GL Entry Posting untuk Diskon Pembelian

**User Story:** Sebagai Accountant, saya ingin diskon pembelian otomatis diposting ke akun Potongan Pembelian, sehingga laporan keuangan mencerminkan diskon yang diterima.

#### Acceptance Criteria

1. WHEN Purchase_Invoice dengan diskon disubmit, THE ERP_System SHALL membuat GL_Entry credit ke akun 5300 - Potongan Pembelian
2. WHEN Purchase_Invoice dengan diskon disubmit, THE ERP_System SHALL mengurangi GL_Entry debit ke akun hutang sebesar nilai diskon
3. THE ERP_System SHALL mencatat discount_amount di GL_Entry remarks untuk audit trail
4. WHEN Purchase_Invoice dengan diskon dibatalkan, THE ERP_System SHALL membuat reversal GL_Entry untuk diskon
5. FOR ALL GL_Entry yang diposting, THE ERP_System SHALL memastikan total debit = total credit (balanced entry)
6. THE ERP_System SHALL memposting GL_Entry dengan posting_date yang sama dengan invoice date

### Requirement 8: GL Entry Posting untuk PPN Output (Sales)

**User Story:** Sebagai Accountant, saya ingin PPN output dari penjualan otomatis diposting ke akun Hutang PPN, sehingga saya dapat melacak kewajiban PPN yang harus disetor.

#### Acceptance Criteria

1. WHEN Sales_Invoice dengan PPN disubmit, THE ERP_System SHALL membuat GL_Entry credit ke akun 2210 - Hutang PPN sebesar 11% dari subtotal setelah diskon
2. WHEN Sales_Invoice dengan PPN disubmit, THE ERP_System SHALL menambah GL_Entry debit ke akun piutang sebesar nilai PPN
3. THE ERP_System SHALL mencatat tax_amount dan tax_template di GL_Entry remarks untuk audit trail
4. WHEN Sales_Invoice dengan PPN dibatalkan, THE ERP_System SHALL membuat reversal GL_Entry untuk PPN
5. FOR ALL GL_Entry yang diposting, THE ERP_System SHALL memastikan total debit = total credit (balanced entry)
6. THE ERP_System SHALL memposting GL_Entry dengan posting_date yang sama dengan invoice date

### Requirement 9: GL Entry Posting untuk PPN Input (Purchase)

**User Story:** Sebagai Accountant, saya ingin PPN input dari pembelian otomatis diposting ke akun Pajak Dibayar Dimuka, sehingga saya dapat melacak PPN yang dapat dikreditkan.

#### Acceptance Criteria

1. WHEN Purchase_Invoice dengan PPN disubmit, THE ERP_System SHALL membuat GL_Entry debit ke akun 1410 - Pajak Dibayar Dimuka sebesar 11% dari subtotal setelah diskon
2. WHEN Purchase_Invoice dengan PPN disubmit, THE ERP_System SHALL menambah GL_Entry credit ke akun hutang sebesar nilai PPN
3. THE ERP_System SHALL mencatat tax_amount dan tax_template di GL_Entry remarks untuk audit trail
4. WHEN Purchase_Invoice dengan PPN dibatalkan, THE ERP_System SHALL membuat reversal GL_Entry untuk PPN
5. FOR ALL GL_Entry yang diposting, THE ERP_System SHALL memastikan total debit = total credit (balanced entry)
6. THE ERP_System SHALL memposting GL_Entry dengan posting_date yang sama dengan invoice date

### Requirement 10: GL Entry Posting untuk PPh 23

**User Story:** Sebagai Accountant, saya ingin PPh 23 yang dipotong otomatis diposting ke akun Hutang PPh 23, sehingga saya dapat melacak kewajiban pemotongan pajak.

#### Acceptance Criteria

1. WHEN Purchase_Invoice dengan PPh_23 disubmit, THE ERP_System SHALL membuat GL_Entry debit ke akun 5100 - Beban Operasional (atau akun expense terkait) sebesar nilai penuh
2. WHEN Purchase_Invoice dengan PPh_23 disubmit, THE ERP_System SHALL membuat GL_Entry credit ke akun 2230 - Hutang PPh 23 sebesar 2% dari nilai jasa
3. WHEN Purchase_Invoice dengan PPh_23 disubmit, THE ERP_System SHALL mengurangi GL_Entry credit ke akun hutang sebesar nilai PPh_23 yang dipotong
4. THE ERP_System SHALL mencatat tax_amount dan tax_template di GL_Entry remarks untuk audit trail
5. WHEN Purchase_Invoice dengan PPh_23 dibatalkan, THE ERP_System SHALL membuat reversal GL_Entry untuk PPh_23
6. FOR ALL GL_Entry yang diposting, THE ERP_System SHALL memastikan total debit = total credit (balanced entry)

### Requirement 11: Update Laporan Laba Rugi

**User Story:** Sebagai Finance Manager, saya ingin laporan Laba Rugi menampilkan diskon penjualan dan pembelian secara terpisah, sehingga saya dapat menganalisis dampak diskon terhadap profitabilitas.

#### Acceptance Criteria

1. WHEN Laporan Laba Rugi dijalankan, THE Financial_Report SHALL menampilkan "Potongan Penjualan" sebagai pengurang dari Pendapatan Penjualan
2. WHEN Laporan Laba Rugi dijalankan, THE Financial_Report SHALL menampilkan "Potongan Pembelian" sebagai pengurang dari Harga Pokok Penjualan
3. THE Financial_Report SHALL menghitung Net Sales = Gross Sales - Potongan Penjualan
4. THE Financial_Report SHALL menghitung Net COGS = Gross COGS - Potongan Pembelian
5. THE Financial_Report SHALL menampilkan nilai dalam format currency Indonesia (Rp) dengan pemisah ribuan
6. WHEN user memfilter berdasarkan periode, THE Financial_Report SHALL menampilkan data diskon sesuai periode yang dipilih

### Requirement 12: Update Laporan Neraca

**User Story:** Sebagai Finance Manager, saya ingin laporan Neraca menampilkan saldo akun pajak dengan benar, sehingga saya dapat melihat posisi kewajiban dan aset pajak.

#### Acceptance Criteria

1. WHEN Laporan Neraca dijalankan, THE Financial_Report SHALL menampilkan saldo akun 1410 - Pajak Dibayar Dimuka di bagian Aset Lancar
2. WHEN Laporan Neraca dijalankan, THE Financial_Report SHALL menampilkan saldo akun 2210 - Hutang PPN di bagian Kewajiban Lancar
3. WHEN Laporan Neraca dijalankan, THE Financial_Report SHALL menampilkan saldo akun 2230 - Hutang PPh 23 di bagian Kewajiban Lancar
4. WHEN Laporan Neraca dijalankan, THE Financial_Report SHALL menampilkan saldo akun 2240 - Hutang PPh 4(2) Final di bagian Kewajiban Lancar
5. THE Financial_Report SHALL menampilkan nilai dalam format currency Indonesia (Rp) dengan pemisah ribuan
6. WHEN user memfilter berdasarkan tanggal, THE Financial_Report SHALL menampilkan saldo per tanggal yang dipilih

### Requirement 13: Laporan PPN (VAT Report)

**User Story:** Sebagai Tax Officer, saya ingin laporan PPN yang menampilkan PPN Input dan PPN Output secara terpisah, sehingga saya dapat menghitung PPN yang harus disetor atau dapat dikreditkan.

#### Acceptance Criteria

1. THE ERP_System SHALL menyediakan Laporan PPN yang menampilkan PPN Output dari Sales_Invoice
2. THE ERP_System SHALL menyediakan Laporan PPN yang menampilkan PPN Input dari Purchase_Invoice
3. WHEN Laporan PPN dijalankan, THE Financial_Report SHALL menghitung Total PPN Output dari akun 2210 - Hutang PPN
4. WHEN Laporan PPN dijalankan, THE Financial_Report SHALL menghitung Total PPN Input dari akun 1410 - Pajak Dibayar Dimuka
5. THE Financial_Report SHALL menghitung PPN Kurang/Lebih Bayar = PPN Output - PPN Input
6. THE Financial_Report SHALL menampilkan detail per invoice dengan kolom: Tanggal, Nomor Invoice, Customer/Supplier, DPP (Dasar Pengenaan Pajak), dan PPN
7. WHEN user memfilter berdasarkan periode, THE Financial_Report SHALL menampilkan data PPN sesuai periode yang dipilih (biasanya per bulan)
8. THE Financial_Report SHALL menyediakan export ke Excel untuk keperluan pelaporan SPT

### Requirement 14: Backward Compatibility dengan Invoice Existing

**User Story:** Sebagai System Administrator, saya ingin memastikan invoice yang sudah ada tetap berfungsi normal setelah implementasi fitur diskon dan pajak, sehingga tidak ada data corruption atau error di production.

#### Acceptance Criteria

1. FOR ALL Sales_Invoice yang dibuat sebelum implementasi, THE ERP_System SHALL menampilkan discount_amount = 0 dan taxes = empty array
2. FOR ALL Purchase_Invoice yang dibuat sebelum implementasi, THE ERP_System SHALL menampilkan discount_amount = 0 dan taxes = empty array
3. WHEN user membuka invoice lama, THE ERP_System SHALL menampilkan form tanpa error
4. WHEN user mengedit invoice lama tanpa mengisi diskon/pajak, THE ERP_System SHALL menyimpan perubahan tanpa memodifikasi GL_Entry yang sudah ada
5. WHEN API dipanggil untuk invoice lama, THE API_Endpoint SHALL mengembalikan response dengan field diskon/pajak bernilai 0 atau empty
6. THE ERP_System SHALL memastikan bahwa laporan keuangan untuk periode sebelum implementasi tetap menampilkan nilai yang sama

### Requirement 15: Testing dan Validasi

**User Story:** Sebagai QA Engineer, saya ingin test suite yang komprehensif untuk fitur diskon dan pajak, sehingga saya dapat memastikan semua scenario berfungsi dengan benar sebelum deploy ke production.

#### Acceptance Criteria

1. THE ERP_System SHALL menyediakan unit test untuk validasi input diskon (percentage dan amount)
2. THE ERP_System SHALL menyediakan unit test untuk validasi input pajak (tax template dan amount)
3. THE ERP_System SHALL menyediakan integration test untuk GL_Entry posting dengan diskon penjualan
4. THE ERP_System SHALL menyediakan integration test untuk GL_Entry posting dengan diskon pembelian
5. THE ERP_System SHALL menyediakan integration test untuk GL_Entry posting dengan PPN output
6. THE ERP_System SHALL menyediakan integration test untuk GL_Entry posting dengan PPN input
7. THE ERP_System SHALL menyediakan integration test untuk GL_Entry posting dengan PPh_23
8. THE ERP_System SHALL menyediakan integration test untuk kombinasi diskon + pajak dalam satu invoice
9. THE ERP_System SHALL menyediakan integration test untuk invoice cancellation dengan diskon dan pajak
10. THE ERP_System SHALL menyediakan integration test untuk backward compatibility dengan invoice lama
11. THE ERP_System SHALL menyediakan end-to-end test untuk flow lengkap: create invoice → submit → verify GL_Entry → verify report
12. FOR ALL test cases, THE ERP_System SHALL memverifikasi bahwa total debit = total credit di GL_Entry (round-trip property)

### Requirement 16: Documentation dan User Guide

**User Story:** Sebagai User, saya ingin dokumentasi yang jelas tentang cara menggunakan fitur diskon dan pajak, sehingga saya dapat menggunakan fitur ini dengan benar tanpa banyak trial and error.

#### Acceptance Criteria

1. THE ERP_System SHALL menyediakan user guide dalam Bahasa Indonesia yang menjelaskan cara input diskon di Sales_Invoice
2. THE ERP_System SHALL menyediakan user guide dalam Bahasa Indonesia yang menjelaskan cara input pajak di Sales_Invoice
3. THE ERP_System SHALL menyediakan user guide dalam Bahasa Indonesia yang menjelaskan cara input diskon di Purchase_Invoice
4. THE ERP_System SHALL menyediakan user guide dalam Bahasa Indonesia yang menjelaskan cara input pajak di Purchase_Invoice
5. THE ERP_System SHALL menyediakan dokumentasi API yang menjelaskan struktur request/response untuk field diskon dan pajak
6. THE ERP_System SHALL menyediakan contoh use case untuk scenario umum: diskon percentage, diskon amount, PPN, PPh 23, dan kombinasi
7. THE ERP_System SHALL menyediakan troubleshooting guide untuk error umum terkait diskon dan pajak
8. THE ERP_System SHALL menyediakan dokumentasi teknis untuk developer yang menjelaskan GL_Entry logic untuk diskon dan pajak

### Requirement 17: Migration dan Rollout Plan

**User Story:** Sebagai System Administrator, saya ingin migration plan yang aman untuk deploy fitur diskon dan pajak ke production, sehingga risiko downtime dan data corruption dapat diminimalkan.

#### Acceptance Criteria

1. THE ERP_System SHALL menyediakan migration script untuk membuat Tax_Template di ERPNext
2. THE ERP_System SHALL menyediakan migration script untuk memvalidasi bahwa semua akun COA yang dibutuhkan sudah ada
3. WHEN migration script dijalankan, THE ERP_System SHALL membuat backup database sebelum melakukan perubahan
4. WHEN migration script dijalankan, THE ERP_System SHALL memvalidasi bahwa tidak ada invoice dalam status draft yang akan terpengaruh
5. THE ERP_System SHALL menyediakan rollback script untuk mengembalikan perubahan jika terjadi error
6. THE ERP_System SHALL menyediakan checklist pre-deployment yang mencakup: backup database, test di staging, validasi COA, dan user training
7. THE ERP_System SHALL menyediakan checklist post-deployment yang mencakup: smoke test, validasi GL_Entry, dan monitoring error log
8. WHEN deployment selesai, THE ERP_System SHALL mengirim notifikasi ke admin dengan summary hasil deployment

## Notes

### Risiko dan Mitigasi

1. **HIGH RISK - GL Entry Corruption**: Perubahan logic GL Entry bisa merusak laporan keuangan
   - Mitigasi: Extensive testing di staging dengan data production, backup sebelum deployment, rollback plan

2. **HIGH RISK - Data Structure Changes**: Perubahan struktur data bisa break existing invoices
   - Mitigasi: Field diskon/pajak sudah ada di ERPNext dengan default 0, implementasi bersifat additive bukan breaking change

3. **MEDIUM RISK - User Confusion**: User mungkin bingung dengan field baru
   - Mitigasi: User training, dokumentasi lengkap, UI yang intuitif dengan tooltip

4. **MEDIUM RISK - Performance Impact**: Query laporan bisa lebih lambat dengan data diskon/pajak
   - Mitigasi: Indexing pada field yang sering diquery, caching untuk laporan

### Akun COA yang Digunakan

- **4300 - Potongan Penjualan**: Contra_Account untuk diskon penjualan (mengurangi pendapatan)
- **5300 - Potongan Pembelian**: Contra_Account untuk diskon pembelian (mengurangi COGS)
- **2210 - Hutang PPN**: Liability account untuk PPN output yang harus disetor
- **1410 - Pajak Dibayar Dimuka**: Asset account untuk PPN input yang dapat dikreditkan
- **2230 - Hutang PPh 23**: Liability account untuk PPh 23 yang dipotong
- **2240 - Hutang PPh 4(2) Final**: Liability account untuk PPh 22

### Estimasi Waktu Implementasi

- Fase 1 (Setup Tax Templates): 1 minggu
- Fase 2 (API Enhancement): 2 minggu
- Fase 3 (UI Implementation): 2 minggu
- Fase 4 (Reports Update): 1 minggu
- Fase 5 (Testing & Documentation): 1 minggu
- Total: 7 minggu

### Dependencies

- ERPNext version harus support Tax Template (v13+)
- Database backup mechanism harus tersedia
- Staging environment harus mirror production
- User training schedule harus dikoordinasikan dengan Finance team
