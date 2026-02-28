# Requirements Document - Credit Note Management

## Introduction

Fitur Credit Note Management memungkinkan pengelolaan retur penjualan untuk Sales Invoice yang sudah dibayar (status: Paid). Fitur ini melengkapi sistem Sales Return yang sudah ada (untuk Delivery Note yang belum dibayar) dengan menambahkan kemampuan untuk membuat Credit Note dari Sales Invoice yang sudah menerima pembayaran, menghasilkan laporan retur, dan menyesuaikan nilai komisi sales yang terkait dengan faktur yang dilakukan credit note.

Credit Note menggunakan ERPNext native return mechanism (Sales Invoice dengan is_return=1) untuk memastikan konsistensi data dan integrasi yang baik dengan sistem akuntansi.

## Glossary

- **Credit_Note**: Sales Invoice dengan is_return=1 yang merepresentasikan retur penjualan untuk faktur yang sudah dibayar
- **Sales_Invoice**: Dokumen faktur penjualan di ERPNext
- **Sales_Return**: Delivery Note dengan is_return=1 untuk retur barang yang belum dibayar (existing feature)
- **Commission_System**: Sistem perhitungan komisi sales berdasarkan Sales Invoice yang sudah dibayar
- **custom_komisi_sales**: Field custom di Sales Invoice Item yang menyimpan nilai komisi per item
- **custom_total_komisi_sales**: Field custom di Sales Invoice header yang menyimpan total komisi untuk seluruh invoice
- **Return_Against**: Referensi ke Sales Invoice asli yang dilakukan retur
- **Partial_Return**: Retur sebagian item atau quantity dari Sales Invoice asli
- **Accounting_Period**: Periode akuntansi yang membatasi transaksi berdasarkan tanggal posting
- **ERPNext_API**: REST API ERPNext untuk operasi CRUD dokumen
- **Frontend**: Aplikasi Next.js yang menyediakan antarmuka pengguna

## Requirements

### Requirement 1: Create Credit Note from Paid Sales Invoice

**User Story:** Sebagai user, saya ingin membuat Credit Note dari Sales Invoice yang sudah dibayar, sehingga saya dapat mencatat retur penjualan yang sudah menerima pembayaran.

#### Acceptance Criteria

1. THE Frontend SHALL menyediakan menu "Credit Note" di navigasi sistem
2. WHEN user mengakses halaman Credit Note, THE Frontend SHALL menampilkan form untuk membuat Credit Note baru
3. THE Frontend SHALL menyediakan dialog untuk memilih Sales Invoice dengan status "Paid"
4. WHEN user memilih Sales Invoice, THE Frontend SHALL menampilkan detail items dari Sales Invoice tersebut
5. THE Frontend SHALL memungkinkan user untuk memilih item mana yang akan diretur (partial return)
6. THE Frontend SHALL memungkinkan user untuk menentukan quantity retur untuk setiap item yang tidak melebihi quantity asli
7. THE Frontend SHALL mewajibkan user untuk memilih alasan retur untuk setiap item (Damaged, Quality Issue, Wrong Item, Customer Request, Other)
8. WHEN user memilih alasan "Other", THE Frontend SHALL mewajibkan user untuk mengisi catatan tambahan
9. THE Frontend SHALL menampilkan calculated total nilai Credit Note berdasarkan item dan quantity yang dipilih
10. WHEN user menyimpan Credit Note, THE API SHALL menggunakan ERPNext native method make_sales_return untuk generate Credit Note template
11. THE API SHALL menyesuaikan template dengan data user (items, quantities, return reasons, posting date)
12. THE API SHALL meng-copy nilai custom_komisi_sales dari setiap item di Sales Invoice asli ke Credit Note items (dengan nilai negatif proporsional terhadap quantity retur)
13. THE API SHALL menghitung custom_total_komisi_sales untuk Credit Note = sum of all custom_komisi_sales (nilai negatif)
14. THE API SHALL menyimpan Credit Note dengan is_return=1 dan return_against yang merujuk ke Sales Invoice asli
15. THE API SHALL memvalidasi bahwa posting_date Credit Note berada dalam Accounting Period yang terbuka
16. WHEN Credit Note berhasil disimpan, THE Frontend SHALL menampilkan notifikasi sukses dan redirect ke halaman list Credit Note

### Requirement 2: List and Filter Credit Notes

**User Story:** Sebagai user, saya ingin melihat daftar Credit Note yang sudah dibuat, sehingga saya dapat melacak semua retur penjualan yang sudah dibayar.

#### Acceptance Criteria

1. THE Frontend SHALL menampilkan tabel list Credit Note dengan kolom: nomor dokumen, tanggal, customer, Sales Invoice asli, status, dan total nilai
2. THE Frontend SHALL menyediakan filter berdasarkan tanggal (from_date, to_date)
3. THE Frontend SHALL menyediakan filter berdasarkan customer name (search)
4. THE Frontend SHALL menyediakan filter berdasarkan nomor dokumen Credit Note
5. THE Frontend SHALL menyediakan filter berdasarkan status (Draft, Submitted, Cancelled)
6. THE Frontend SHALL menampilkan pagination dengan limit dan start parameter
7. THE API SHALL mengambil data Credit Note dari ERPNext dengan filter is_return=1 dan doctype=Sales Invoice
8. THE API SHALL mengembalikan data dalam format yang konsisten dengan frontend expectations
9. WHEN user mengklik row Credit Note, THE Frontend SHALL menampilkan detail Credit Note
10. THE Frontend SHALL menampilkan total records dan current page information

### Requirement 3: Submit and Cancel Credit Note

**User Story:** Sebagai user, saya ingin submit Credit Note untuk memfinalisasi retur, sehingga Credit Note dapat mempengaruhi laporan keuangan dan komisi.

#### Acceptance Criteria

1. WHEN Credit Note berstatus Draft, THE Frontend SHALL menampilkan tombol "Submit"
2. WHEN user mengklik Submit, THE API SHALL memanggil ERPNext submit endpoint untuk Credit Note
3. WHEN Credit Note berhasil di-submit, THE ERPNext SHALL mengupdate returned_qty di Sales Invoice asli
4. WHEN Credit Note berhasil di-submit, THE ERPNext SHALL membuat GL Entry untuk mencatat transaksi akuntansi
5. WHEN Credit Note berstatus Submitted, THE Frontend SHALL menampilkan tombol "Cancel"
6. WHEN user mengklik Cancel, THE API SHALL memanggil ERPNext cancel endpoint untuk Credit Note
7. THE API SHALL memvalidasi bahwa posting_date berada dalam Accounting Period yang terbuka sebelum submit atau cancel
8. WHEN submit atau cancel gagal, THE Frontend SHALL menampilkan error message yang deskriptif
9. THE Frontend SHALL merefresh data Credit Note setelah submit atau cancel berhasil

### Requirement 4: Credit Note Detail View

**User Story:** Sebagai user, saya ingin melihat detail lengkap Credit Note, sehingga saya dapat memverifikasi informasi retur.

#### Acceptance Criteria

1. THE Frontend SHALL menampilkan header Credit Note dengan informasi: nomor dokumen, customer, tanggal posting, Sales Invoice asli, status
2. THE Frontend SHALL menampilkan tabel items dengan kolom: item code, item name, quantity retur, UOM, rate, amount, custom_komisi_sales, return reason, return notes
3. THE Frontend SHALL menampilkan total nilai Credit Note
4. THE Frontend SHALL menampilkan total komisi yang dikembalikan (custom_total_komisi_sales)
5. THE Frontend SHALL menampilkan catatan retur (return_notes) jika ada
6. THE Frontend SHALL menampilkan informasi audit: created by, created date, modified by, modified date
7. THE API SHALL menggunakan frappe.desk.form.load.getdoc untuk mengambil detail lengkap Credit Note
8. THE API SHALL mengembalikan semua field termasuk returned_qty, custom_komisi_sales, custom_total_komisi_sales, dan child tables

### Requirement 5: Validate Return Quantity

**User Story:** Sebagai user, saya ingin sistem memvalidasi quantity retur, sehingga saya tidak dapat membuat retur yang melebihi quantity asli atau quantity yang sudah diretur sebelumnya.

#### Acceptance Criteria

1. WHEN user menginput quantity retur, THE Frontend SHALL memvalidasi bahwa quantity > 0
2. THE Frontend SHALL menghitung remaining returnable quantity = original qty - returned_qty
3. THE Frontend SHALL memvalidasi bahwa quantity retur tidak melebihi remaining returnable quantity
4. WHEN validation gagal, THE Frontend SHALL menampilkan error message yang spesifik
5. THE Frontend SHALL menampilkan informasi remaining returnable quantity untuk setiap item
6. THE API SHALL melakukan validasi ulang di backend sebelum menyimpan Credit Note
7. WHEN API validation gagal, THE API SHALL mengembalikan error response dengan status 400

### Requirement 6: Credit Note Report

**User Story:** Sebagai user, saya ingin melihat laporan retur penjualan untuk Credit Note, sehingga saya dapat menganalisis pola retur dan nilai total retur.

#### Acceptance Criteria

1. THE Frontend SHALL menyediakan halaman "Laporan Credit Note"
2. THE Frontend SHALL menyediakan filter berdasarkan periode tanggal (from_date, to_date)
3. THE Frontend SHALL menyediakan filter berdasarkan customer
4. THE Frontend SHALL menyediakan filter berdasarkan return reason
5. THE Frontend SHALL menampilkan summary: total Credit Note count, total nilai retur, breakdown by return reason
6. THE Frontend SHALL menampilkan tabel detail Credit Note dengan grouping by customer atau by return reason
7. THE Frontend SHALL menyediakan tombol "Export to Excel" untuk download laporan
8. THE Frontend SHALL menyediakan tombol "Print" untuk cetak laporan
9. THE API SHALL mengambil data Credit Note dengan filter yang ditentukan user
10. THE API SHALL menghitung aggregasi untuk summary section
11. THE API SHALL mengembalikan data dalam format yang siap untuk ditampilkan dan di-export

### Requirement 7: Commission Adjustment for Credit Note

**User Story:** Sebagai user, saya ingin sistem menyesuaikan nilai komisi sales ketika Credit Note dibuat, sehingga komisi yang dihitung akurat setelah ada retur.

#### Acceptance Criteria

1. WHEN Credit Note dibuat dari Sales Invoice, THE System SHALL meng-copy nilai custom_komisi_sales dari setiap item di Sales Invoice asli ke Credit Note items (dengan nilai negatif)
2. WHEN Credit Note dibuat, THE System SHALL menghitung custom_total_komisi_sales = sum of all custom_komisi_sales dari Credit Note items (nilai negatif)
3. WHEN Credit Note di-submit, THE ERPNext Server Script SHALL mengurangi custom_total_komisi_sales di Sales Invoice asli dengan nilai Credit Note
4. THE System SHALL mengupdate field custom_total_komisi_sales di Sales Invoice asli = original commission - credit note commission
5. THE Commission_System SHALL menampilkan informasi Credit Note yang mempengaruhi komisi di halaman Commission Dashboard
6. THE Commission_System SHALL menyediakan kolom "Credit Note Adjustments" di tabel Paid Invoices
7. THE Commission_System SHALL menghitung net commission = earned commission - credit note adjustments
8. WHEN user melihat detail komisi untuk Sales Invoice tertentu, THE Frontend SHALL menampilkan list Credit Note yang terkait
9. THE API SHALL mengambil data Credit Note yang terkait dengan Sales Invoice saat menghitung komisi
10. THE API SHALL memvalidasi bahwa Credit Note berstatus Submitted sebelum mengurangi komisi
11. THE Frontend SHALL menampilkan warning jika ada Credit Note yang mempengaruhi komisi yang sudah dibayarkan
12. THE System SHALL memastikan bahwa custom_komisi_sales per item di Credit Note proporsional dengan quantity yang diretur (untuk partial return)

### Requirement 8: Partial Credit Note Support

**User Story:** Sebagai user, saya ingin membuat Credit Note parsial (hanya beberapa item atau sebagian quantity), sehingga saya dapat menangani retur yang tidak mencakup seluruh Sales Invoice.

#### Acceptance Criteria

1. THE Frontend SHALL menampilkan checkbox untuk setiap item di Sales Invoice
2. THE Frontend SHALL hanya memasukkan item yang dicentang ke dalam Credit Note
3. THE Frontend SHALL memungkinkan user untuk menginput quantity retur yang lebih kecil dari quantity asli
4. THE Frontend SHALL menghitung total Credit Note berdasarkan item dan quantity yang dipilih
5. THE API SHALL memfilter items berdasarkan pilihan user sebelum menyimpan Credit Note
6. THE API SHALL memvalidasi bahwa minimal satu item dipilih untuk diretur
7. WHEN user membuat multiple Credit Note untuk Sales Invoice yang sama, THE System SHALL mengakumulasi returned_qty dengan benar
8. THE Frontend SHALL menampilkan remaining returnable quantity yang sudah dikurangi dengan retur sebelumnya

### Requirement 9: Integration with Existing Systems

**User Story:** Sebagai developer, saya ingin Credit Note terintegrasi dengan sistem yang sudah ada, sehingga tidak ada konflik atau duplikasi data.

#### Acceptance Criteria

1. THE Credit_Note SHALL menggunakan ERPNext native Sales Invoice doctype dengan is_return=1
2. THE Credit_Note SHALL menggunakan ERPNext method make_sales_return untuk generate template
3. THE Credit_Note SHALL mengikuti pola yang sama dengan Sales_Return untuk konsistensi
4. THE API SHALL menggunakan authentication yang sama (API key priority, session fallback)
5. THE API SHALL menggunakan error handling yang konsisten dengan API lain
6. THE Frontend SHALL menggunakan komponen UI yang sama dengan modul lain (LoadingButton, ErrorDialog, Toast)
7. THE Frontend SHALL mengikuti struktur direktori yang sama (app/credit-note/, app/api/sales/credit-note/)
8. THE Credit_Note SHALL memvalidasi Accounting Period sebelum save, submit, atau cancel
9. THE Credit_Note SHALL terintegrasi dengan GL Entry untuk pencatatan akuntansi
10. THE Credit_Note SHALL terintegrasi dengan Stock Ledger untuk pencatatan inventory

### Requirement 10: User Interface Consistency

**User Story:** Sebagai user, saya ingin antarmuka Credit Note konsisten dengan modul lain, sehingga saya dapat dengan mudah menggunakan fitur ini tanpa learning curve yang tinggi.

#### Acceptance Criteria

1. THE Frontend SHALL menggunakan Tailwind CSS dengan color palette yang sama (Indigo primary, Green success, Yellow warning, Red danger)
2. THE Frontend SHALL menggunakan layout yang konsisten dengan Sales Return
3. THE Frontend SHALL menampilkan loading states menggunakan LoadingButton dan LoadingSpinner
4. THE Frontend SHALL menampilkan error messages menggunakan Toast notifications
5. THE Frontend SHALL menggunakan dialog pattern yang sama untuk memilih Sales Invoice
6. THE Frontend SHALL menggunakan table styling yang konsisten dengan modul lain
7. THE Frontend SHALL responsive dan mobile-friendly
8. THE Frontend SHALL menggunakan Indonesian language untuk semua labels dan messages
9. THE Frontend SHALL menampilkan confirmation dialog sebelum submit atau cancel
10. THE Frontend SHALL menampilkan success message setelah operasi berhasil

### Requirement 11: Data Validation and Error Handling

**User Story:** Sebagai user, saya ingin sistem memvalidasi input dan menampilkan error yang jelas, sehingga saya dapat memperbaiki kesalahan dengan mudah.

#### Acceptance Criteria

1. THE Frontend SHALL memvalidasi bahwa semua required fields terisi sebelum submit
2. THE Frontend SHALL memvalidasi format tanggal (YYYY-MM-DD)
3. THE Frontend SHALL memvalidasi bahwa quantity retur adalah angka positif
4. THE Frontend SHALL memvalidasi bahwa minimal satu item dipilih
5. THE Frontend SHALL memvalidasi bahwa return reason dipilih untuk setiap item
6. THE API SHALL memvalidasi request body structure dan mengembalikan error 400 jika invalid
7. THE API SHALL memvalidasi bahwa Sales Invoice exists dan berstatus Paid
8. THE API SHALL memvalidasi bahwa posting_date berada dalam Accounting Period yang terbuka
9. WHEN validation gagal, THE System SHALL menampilkan error message yang spesifik dan actionable
10. THE API SHALL menggunakan try-catch untuk menangani unexpected errors dan mengembalikan error 500

### Requirement 12: Audit Trail and History

**User Story:** Sebagai user, saya ingin melihat history perubahan Credit Note, sehingga saya dapat melacak siapa yang membuat atau mengubah dokumen.

#### Acceptance Criteria

1. THE Frontend SHALL menampilkan informasi created_by dan creation date di detail view
2. THE Frontend SHALL menampilkan informasi modified_by dan modified date di detail view
3. WHEN Credit Note di-submit, THE System SHALL mencatat submitted_by dan submitted_date
4. WHEN Credit Note di-cancel, THE System SHALL mencatat cancelled_by dan cancelled_date
5. THE Frontend SHALL menampilkan status history timeline di detail view
6. THE API SHALL mengambil audit information dari ERPNext
7. THE Frontend SHALL menampilkan user-friendly format untuk tanggal dan waktu (Indonesian locale)

