# Dokumen Requirements: Laporan Detail Faktur dan Pembayaran

## Pendahuluan

Sistem ERP memerlukan laporan detail yang lebih komprehensif untuk faktur penjualan, faktur pembelian, dan pembayaran. Laporan-laporan ini akan memberikan visibilitas yang lebih baik terhadap transaksi bisnis dengan menampilkan detail item per faktur dan detail pembayaran. Setiap laporan akan dilengkapi dengan filter yang sesuai dan fungsi cetak untuk mendukung kebutuhan operasional dan audit.

## Glosarium

- **Sistem_Laporan**: Modul pelaporan dalam sistem ERP Next.js yang menampilkan data transaksi
- **Faktur_Penjualan**: Dokumen Sales Invoice yang mencatat transaksi penjualan kepada pelanggan
- **Faktur_Pembelian**: Dokumen Purchase Invoice yang mencatat transaksi pembelian dari pemasok
- **Pembayaran**: Dokumen Payment Entry yang mencatat penerimaan atau pengeluaran kas
- **Detail_Item**: Baris item individual dalam faktur yang mencakup kode item, nama, kuantitas, harga, dan total
- **Filter**: Komponen UI yang memungkinkan pengguna menyaring data berdasarkan kriteria tertentu
- **Fungsi_Cetak**: Fitur yang memungkinkan pengguna mencetak atau mengekspor laporan dalam format yang dapat dicetak
- **ERPNext_API**: Backend API ERPNext yang menyediakan data transaksi
- **Periode_Tanggal**: Rentang waktu dari tanggal mulai hingga tanggal akhir untuk filter laporan

## Requirements

### Requirement 1: Laporan Detail Penjualan Per Faktur

**User Story:** Sebagai pengguna sistem, saya ingin melihat laporan detail penjualan per faktur dengan informasi item-item di dalamnya, sehingga saya dapat menganalisis komposisi penjualan secara detail.

#### Acceptance Criteria

1. THE Sistem_Laporan SHALL menampilkan halaman laporan detail penjualan di route `/reports/sales-invoice-details`
2. WHEN pengguna mengakses halaman laporan detail penjualan, THE Sistem_Laporan SHALL menampilkan daftar faktur penjualan dengan detail item per faktur
3. THE Sistem_Laporan SHALL menampilkan informasi berikut untuk setiap faktur: nomor faktur, tanggal, nama pelanggan, status, dan grand total
4. THE Sistem_Laporan SHALL menampilkan informasi berikut untuk setiap item dalam faktur: kode item, nama item, kuantitas, satuan, harga satuan, diskon, pajak, dan total
5. THE Sistem_Laporan SHALL menyediakan filter berdasarkan Periode_Tanggal (dari tanggal dan sampai tanggal)
6. THE Sistem_Laporan SHALL menyediakan filter berdasarkan nama pelanggan atau nomor faktur
7. THE Sistem_Laporan SHALL menyediakan filter berdasarkan status faktur (Draft, Submitted, Paid, Unpaid, Cancelled)
8. THE Sistem_Laporan SHALL menampilkan ringkasan total: jumlah faktur, total penjualan, dan rata-rata nilai faktur
9. THE Sistem_Laporan SHALL mengimplementasikan paginasi dengan 20 item per halaman untuk desktop dan 10 item per halaman untuk mobile
10. THE Sistem_Laporan SHALL menyediakan tampilan responsif untuk desktop dan mobile

### Requirement 2: Fungsi Cetak Laporan Detail Penjualan

**User Story:** Sebagai pengguna sistem, saya ingin mencetak laporan detail penjualan, sehingga saya dapat mendokumentasikan atau membagikan laporan dalam format cetak.

#### Acceptance Criteria

1. THE Sistem_Laporan SHALL menyediakan tombol "Cetak Laporan" pada halaman laporan detail penjualan
2. WHEN pengguna mengklik tombol cetak, THE Sistem_Laporan SHALL menampilkan modal preview cetak
3. THE Sistem_Laporan SHALL menampilkan laporan dalam format cetak dengan ukuran kertas A4 (210mm x 297mm)
4. THE Sistem_Laporan SHALL menyertakan filter yang aktif dalam laporan cetak (periode tanggal, pelanggan, status)
5. THE Sistem_Laporan SHALL menampilkan header laporan dengan nama perusahaan, judul laporan, dan periode
6. THE Sistem_Laporan SHALL menampilkan semua data faktur dan detail item dalam format tabel yang rapi
7. THE Sistem_Laporan SHALL menyertakan ringkasan total di akhir laporan cetak
8. THE Sistem_Laporan SHALL menggunakan route `/reports/sales-invoice-details/print` untuk halaman cetak

### Requirement 3: Laporan Detail Pembelian Per Faktur

**User Story:** Sebagai pengguna sistem, saya ingin melihat laporan detail pembelian per faktur dengan informasi item-item di dalamnya, sehingga saya dapat menganalisis komposisi pembelian secara detail.

#### Acceptance Criteria

1. THE Sistem_Laporan SHALL menampilkan halaman laporan detail pembelian di route `/reports/purchase-invoice-details`
2. WHEN pengguna mengakses halaman laporan detail pembelian, THE Sistem_Laporan SHALL menampilkan daftar faktur pembelian dengan detail item per faktur
3. THE Sistem_Laporan SHALL menampilkan informasi berikut untuk setiap faktur: nomor faktur, tanggal, nama pemasok, status, dan grand total
4. THE Sistem_Laporan SHALL menampilkan informasi berikut untuk setiap item dalam faktur: kode item, nama item, kuantitas, satuan, harga satuan, diskon, pajak, dan total
5. THE Sistem_Laporan SHALL menyediakan filter berdasarkan Periode_Tanggal (dari tanggal dan sampai tanggal)
6. THE Sistem_Laporan SHALL menyediakan filter berdasarkan nama pemasok atau nomor faktur
7. THE Sistem_Laporan SHALL menyediakan filter berdasarkan status faktur (Draft, Submitted, Paid, Unpaid, Cancelled)
8. THE Sistem_Laporan SHALL menampilkan ringkasan total: jumlah faktur, total pembelian, dan rata-rata nilai faktur
9. THE Sistem_Laporan SHALL mengimplementasikan paginasi dengan 20 item per halaman untuk desktop dan 10 item per halaman untuk mobile
10. THE Sistem_Laporan SHALL menyediakan tampilan responsif untuk desktop dan mobile

### Requirement 4: Fungsi Cetak Laporan Detail Pembelian

**User Story:** Sebagai pengguna sistem, saya ingin mencetak laporan detail pembelian, sehingga saya dapat mendokumentasikan atau membagikan laporan dalam format cetak.

#### Acceptance Criteria

1. THE Sistem_Laporan SHALL menyediakan tombol "Cetak Laporan" pada halaman laporan detail pembelian
2. WHEN pengguna mengklik tombol cetak, THE Sistem_Laporan SHALL menampilkan modal preview cetak
3. THE Sistem_Laporan SHALL menampilkan laporan dalam format cetak dengan ukuran kertas A4 (210mm x 297mm)
4. THE Sistem_Laporan SHALL menyertakan filter yang aktif dalam laporan cetak (periode tanggal, pemasok, status)
5. THE Sistem_Laporan SHALL menampilkan header laporan dengan nama perusahaan, judul laporan, dan periode
6. THE Sistem_Laporan SHALL menampilkan semua data faktur dan detail item dalam format tabel yang rapi
7. THE Sistem_Laporan SHALL menyertakan ringkasan total di akhir laporan cetak
8. THE Sistem_Laporan SHALL menggunakan route `/reports/purchase-invoice-details/print` untuk halaman cetak

### Requirement 5: Laporan Pembayaran

**User Story:** Sebagai pengguna sistem, saya ingin melihat laporan pembayaran yang merangkum semua transaksi pembayaran, sehingga saya dapat memantau arus kas masuk dan keluar.

#### Acceptance Criteria

1. THE Sistem_Laporan SHALL menampilkan halaman laporan pembayaran di route `/reports/payment-summary`
2. WHEN pengguna mengakses halaman laporan pembayaran, THE Sistem_Laporan SHALL menampilkan daftar transaksi pembayaran
3. THE Sistem_Laporan SHALL menampilkan informasi berikut untuk setiap pembayaran: nomor pembayaran, tanggal, tipe (Receive/Pay), pihak terkait (pelanggan/pemasok), metode pembayaran, dan jumlah
4. THE Sistem_Laporan SHALL menyediakan filter berdasarkan Periode_Tanggal (dari tanggal dan sampai tanggal)
5. THE Sistem_Laporan SHALL menyediakan filter berdasarkan tipe pembayaran (Semua, Receive, Pay)
6. THE Sistem_Laporan SHALL menyediakan filter berdasarkan metode pembayaran (Cash, Bank Transfer, Check, dll)
7. THE Sistem_Laporan SHALL menyediakan filter berdasarkan nama pihak terkait atau nomor pembayaran
8. THE Sistem_Laporan SHALL menampilkan ringkasan total: jumlah transaksi, total penerimaan, total pembayaran, dan saldo bersih
9. THE Sistem_Laporan SHALL mengimplementasikan paginasi dengan 20 item per halaman untuk desktop dan 10 item per halaman untuk mobile
10. THE Sistem_Laporan SHALL menyediakan tampilan responsif untuk desktop dan mobile

### Requirement 6: Laporan Detail Pembayaran

**User Story:** Sebagai pengguna sistem, saya ingin melihat laporan detail pembayaran yang menampilkan referensi faktur yang dibayar, sehingga saya dapat melacak pembayaran terhadap faktur tertentu.

#### Acceptance Criteria

1. THE Sistem_Laporan SHALL menampilkan halaman laporan detail pembayaran di route `/reports/payment-details`
2. WHEN pengguna mengakses halaman laporan detail pembayaran, THE Sistem_Laporan SHALL menampilkan daftar pembayaran dengan detail referensi faktur
3. THE Sistem_Laporan SHALL menampilkan informasi berikut untuk setiap pembayaran: nomor pembayaran, tanggal, tipe, pihak terkait, metode pembayaran, dan total pembayaran
4. THE Sistem_Laporan SHALL menampilkan informasi berikut untuk setiap referensi faktur: nomor faktur, jumlah yang dialokasikan, dan outstanding amount
5. THE Sistem_Laporan SHALL menyediakan filter berdasarkan Periode_Tanggal (dari tanggal dan sampai tanggal)
6. THE Sistem_Laporan SHALL menyediakan filter berdasarkan tipe pembayaran (Semua, Receive, Pay)
7. THE Sistem_Laporan SHALL menyediakan filter berdasarkan nama pihak terkait atau nomor pembayaran
8. THE Sistem_Laporan SHALL menampilkan ringkasan total: jumlah pembayaran, total penerimaan, total pembayaran, dan saldo bersih
9. THE Sistem_Laporan SHALL mengimplementasikan paginasi dengan 20 item per halaman untuk desktop dan 10 item per halaman untuk mobile
10. THE Sistem_Laporan SHALL menyediakan tampilan responsif untuk desktop dan mobile

### Requirement 7: Fungsi Cetak Laporan Pembayaran

**User Story:** Sebagai pengguna sistem, saya ingin mencetak laporan pembayaran dan detail pembayaran, sehingga saya dapat mendokumentasikan transaksi kas.

#### Acceptance Criteria

1. THE Sistem_Laporan SHALL menyediakan tombol "Cetak Laporan" pada halaman laporan pembayaran
2. THE Sistem_Laporan SHALL menyediakan tombol "Cetak Laporan" pada halaman laporan detail pembayaran
3. WHEN pengguna mengklik tombol cetak, THE Sistem_Laporan SHALL menampilkan modal preview cetak
4. THE Sistem_Laporan SHALL menampilkan laporan dalam format cetak dengan ukuran kertas A4 (210mm x 297mm)
5. THE Sistem_Laporan SHALL menyertakan filter yang aktif dalam laporan cetak
6. THE Sistem_Laporan SHALL menampilkan header laporan dengan nama perusahaan, judul laporan, dan periode
7. THE Sistem_Laporan SHALL menampilkan semua data pembayaran dalam format tabel yang rapi
8. THE Sistem_Laporan SHALL menyertakan ringkasan total di akhir laporan cetak
9. THE Sistem_Laporan SHALL menggunakan route `/reports/payment-summary/print` untuk laporan pembayaran
10. THE Sistem_Laporan SHALL menggunakan route `/reports/payment-details/print` untuk laporan detail pembayaran

### Requirement 8: API Backend untuk Laporan Detail Faktur

**User Story:** Sebagai sistem frontend, saya memerlukan API endpoint untuk mengambil data detail faktur, sehingga laporan dapat ditampilkan dengan data yang akurat.

#### Acceptance Criteria

1. THE Sistem_Laporan SHALL menyediakan API endpoint GET `/api/finance/reports/sales-invoice-details` untuk mengambil data detail faktur penjualan
2. THE Sistem_Laporan SHALL menyediakan API endpoint GET `/api/finance/reports/purchase-invoice-details` untuk mengambil data detail faktur pembelian
3. WHEN API endpoint dipanggil dengan parameter company, THE Sistem_Laporan SHALL mengambil data dari ERPNext_API
4. THE Sistem_Laporan SHALL menerima parameter query: company, from_date, to_date, customer/supplier, dan status
5. THE Sistem_Laporan SHALL mengembalikan data dalam format JSON dengan struktur: success, data (array faktur dengan items), dan message
6. WHEN terjadi error saat mengambil data, THE Sistem_Laporan SHALL mengembalikan response dengan success: false dan pesan error yang deskriptif
7. THE Sistem_Laporan SHALL menggunakan autentikasi API key untuk mengakses ERPNext_API
8. THE Sistem_Laporan SHALL menangani timeout dan error koneksi dengan graceful error handling

### Requirement 9: API Backend untuk Laporan Pembayaran

**User Story:** Sebagai sistem frontend, saya memerlukan API endpoint untuk mengambil data pembayaran, sehingga laporan pembayaran dapat ditampilkan dengan data yang akurat.

#### Acceptance Criteria

1. THE Sistem_Laporan SHALL menyediakan API endpoint GET `/api/finance/reports/payment-summary` untuk mengambil data ringkasan pembayaran
2. THE Sistem_Laporan SHALL menyediakan API endpoint GET `/api/finance/reports/payment-details` untuk mengambil data detail pembayaran dengan referensi faktur
3. WHEN API endpoint dipanggil dengan parameter company, THE Sistem_Laporan SHALL mengambil data dari ERPNext_API
4. THE Sistem_Laporan SHALL menerima parameter query: company, from_date, to_date, payment_type, mode_of_payment, dan party
5. THE Sistem_Laporan SHALL mengembalikan data dalam format JSON dengan struktur: success, data (array pembayaran), dan message
6. WHEN terjadi error saat mengambil data, THE Sistem_Laporan SHALL mengembalikan response dengan success: false dan pesan error yang deskriptif
7. THE Sistem_Laporan SHALL menggunakan autentikasi API key untuk mengakses ERPNext_API
8. THE Sistem_Laporan SHALL menangani timeout dan error koneksi dengan graceful error handling

### Requirement 10: Konsistensi UI dengan Laporan Existing

**User Story:** Sebagai pengguna sistem, saya ingin laporan baru memiliki tampilan dan pengalaman yang konsisten dengan laporan yang sudah ada, sehingga saya dapat dengan mudah beradaptasi.

#### Acceptance Criteria

1. THE Sistem_Laporan SHALL menggunakan komponen UI yang sama dengan laporan existing (BrowserStyleDatePicker, PrintPreviewModal, Pagination)
2. THE Sistem_Laporan SHALL menggunakan skema warna yang konsisten: Indigo untuk primary, Green untuk success, Yellow untuk warning, Red untuk danger
3. THE Sistem_Laporan SHALL menggunakan layout yang konsisten dengan laporan sales dan purchases yang sudah ada
4. THE Sistem_Laporan SHALL menampilkan summary cards dengan warna yang sesuai (blue, green, purple, orange)
5. THE Sistem_Laporan SHALL menggunakan format tanggal DD/MM/YYYY untuk input dan display
6. THE Sistem_Laporan SHALL menggunakan format mata uang Indonesia (Rp dengan separator ribuan)
7. THE Sistem_Laporan SHALL menggunakan loading spinner dengan pesan yang deskriptif saat memuat data
8. THE Sistem_Laporan SHALL menampilkan pesan error dalam format yang konsisten (red background dengan border)
9. THE Sistem_Laporan SHALL menggunakan responsive breakpoint 768px untuk mobile/desktop
10. THE Sistem_Laporan SHALL menyediakan tombol "Hapus Filter" dan "Refresh" dengan styling yang konsisten

### Requirement 11: Performa dan Optimasi

**User Story:** Sebagai pengguna sistem, saya ingin laporan dimuat dengan cepat dan responsif, sehingga saya dapat bekerja dengan efisien.

#### Acceptance Criteria

1. WHEN pengguna mengubah filter, THE Sistem_Laporan SHALL mereset halaman ke halaman 1
2. WHEN pengguna berpindah halaman, THE Sistem_Laporan SHALL menggunakan data yang sudah di-cache jika tersedia
3. THE Sistem_Laporan SHALL menggunakan debounce 100ms untuk update URL pagination
4. THE Sistem_Laporan SHALL menyimpan data lengkap di window object untuk pagination frontend
5. THE Sistem_Laporan SHALL menggunakan useMemo untuk kalkulasi total yang kompleks
6. THE Sistem_Laporan SHALL menggunakan useCallback untuk event handler yang sering dipanggil
7. THE Sistem_Laporan SHALL menampilkan loading state saat fetch data pertama kali
8. THE Sistem_Laporan SHALL tidak menampilkan loading spinner saat berpindah halaman dengan cached data
9. THE Sistem_Laporan SHALL mengimplementasikan smooth scroll ke atas saat berpindah halaman
10. THE Sistem_Laporan SHALL menggunakan ref untuk tracking sumber perubahan halaman (pagination vs filter)

### Requirement 12: Validasi dan Error Handling

**User Story:** Sebagai pengguna sistem, saya ingin mendapatkan feedback yang jelas ketika terjadi error atau validasi gagal, sehingga saya dapat memperbaiki input saya.

#### Acceptance Criteria

1. WHEN company tidak dipilih, THE Sistem_Laporan SHALL redirect pengguna ke halaman select-company
2. WHEN API mengembalikan error, THE Sistem_Laporan SHALL menampilkan pesan error yang deskriptif
3. WHEN tidak ada data yang ditemukan, THE Sistem_Laporan SHALL menampilkan pesan "Tidak ada data" di tengah tabel
4. WHEN tanggal dari lebih besar dari tanggal sampai, THE Sistem_Laporan SHALL menampilkan warning kepada pengguna
5. WHEN terjadi network error, THE Sistem_Laporan SHALL menampilkan pesan "Gagal memuat laporan" dengan opsi refresh
6. THE Sistem_Laporan SHALL menggunakan try-catch untuk menangani error pada fetch API
7. THE Sistem_Laporan SHALL menggunakan credentials: 'include' untuk semua API calls
8. THE Sistem_Laporan SHALL menampilkan loading state yang berbeda untuk initial load vs refresh
9. WHEN filter menghasilkan 0 hasil, THE Sistem_Laporan SHALL tetap menampilkan summary cards dengan nilai 0
10. THE Sistem_Laporan SHALL menyimpan selected_company di localStorage untuk persistensi

