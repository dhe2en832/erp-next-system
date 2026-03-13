# Requirements Document

## Introduction

Fitur Dashboard Analytics Enhancement menambahkan komponen analitik komprehensif ke dashboard ERP Next System untuk memberikan wawasan bisnis yang lebih mendalam. Fitur ini mencakup analisis produk terlaris, perilaku konsumen, performa sales, dan tracking komisi yang belum/sudah dibayar. Setiap komponen dilengkapi dengan visualisasi grafik yang sesuai menggunakan recharts library.

## Glossary

- **Dashboard_Analytics_System**: Sistem yang menampilkan komponen analitik pada halaman dashboard
- **Product_Analytics_Component**: Komponen yang menampilkan 10 produk dengan penjualan tertinggi
- **Customer_Behavior_Analyzer**: Komponen yang menganalisis perilaku pembayaran pelanggan
- **Sales_Performance_Tracker**: Komponen yang melacak performa sales berdasarkan penjualan dan komisi
- **Commission_Tracker**: Komponen yang menampilkan total komisi yang sudah dan belum dibayar
- **ERPNext_API**: REST API backend ERPNext yang menyediakan data analitik
- **Analytics_Endpoint**: API endpoint baru untuk mengambil data analitik
- **Recharts_Visualizer**: Library recharts untuk menampilkan grafik
- **Dashboard_Page**: Halaman dashboard utama (app/dashboard/page.tsx)
- **Top_Product**: Produk dengan total penjualan tertinggi berdasarkan quantity atau revenue
- **Payment_Behavior**: Pola pembayaran pelanggan berdasarkan ketepatan waktu dan jumlah pembayaran
- **Sales_Commission**: Komisi yang diperoleh sales dari transaksi penjualan
- **Outstanding_Commission**: Komisi yang belum dibayarkan kepada sales
- **Paid_Commission**: Komisi yang sudah dibayarkan kepada sales
- **Bad_Debt**: Piutang yang dianggap tidak dapat ditagih atau macet berdasarkan kriteria tertentu (misalnya overdue lebih dari 90 hari)
- **Inventory_Analytics**: Komponen yang menganalisis stok barang (terbanyak, terendah, paling sering dibeli)
- **Supplier_Analytics**: Komponen yang menganalisis performa supplier (paling sering dibeli, status pembayaran)

## Requirements

### Requirement 1: Analisis Produk Terlaris

**User Story:** Sebagai manajer penjualan, saya ingin melihat 10 produk terlaris, sehingga saya dapat mengidentifikasi produk yang paling diminati dan mengoptimalkan strategi penjualan.

#### Acceptance Criteria

1. THE Product_Analytics_Component SHALL menampilkan 10 produk dengan total penjualan tertinggi
2. WHEN data produk terlaris dimuat, THE Product_Analytics_Component SHALL menampilkan nama produk, total quantity terjual, dan total revenue
3. THE Product_Analytics_Component SHALL menampilkan visualisasi menggunakan bar chart horizontal
4. WHEN tidak ada data penjualan produk, THE Product_Analytics_Component SHALL menampilkan pesan "Tidak ada data produk terlaris"
5. THE Product_Analytics_Component SHALL memuat data dari Analytics_Endpoint dengan parameter "top_products"

### Requirement 2: Analisis Perilaku Konsumen Terbaik

**User Story:** Sebagai manajer keuangan, saya ingin melihat 10 konsumen dengan perilaku pembayaran terbaik, sehingga saya dapat memberikan apresiasi dan mempertahankan hubungan baik dengan pelanggan loyal.

#### Acceptance Criteria

1. THE Customer_Behavior_Analyzer SHALL menampilkan 10 pelanggan dengan perilaku pembayaran terbaik
2. THE Customer_Behavior_Analyzer SHALL menghitung perilaku pembayaran berdasarkan persentase pembayaran tepat waktu dan total nilai pembayaran
3. WHEN data pelanggan terbaik dimuat, THE Customer_Behavior_Analyzer SHALL menampilkan nama pelanggan, jumlah invoice lunas, dan persentase pembayaran tepat waktu
4. THE Customer_Behavior_Analyzer SHALL menampilkan visualisasi menggunakan bar chart atau pie chart
5. THE Customer_Behavior_Analyzer SHALL memuat data dari Analytics_Endpoint dengan parameter "best_customers"

### Requirement 3: Analisis Perilaku Konsumen Terburuk

**User Story:** Sebagai manajer keuangan, saya ingin melihat 10 konsumen dengan perilaku pembayaran terburuk, sehingga saya dapat melakukan tindakan penagihan atau evaluasi kredit limit.

#### Acceptance Criteria

1. THE Customer_Behavior_Analyzer SHALL menampilkan 10 pelanggan dengan perilaku pembayaran terburuk
2. THE Customer_Behavior_Analyzer SHALL menghitung perilaku pembayaran berdasarkan jumlah invoice overdue dan total piutang tertunggak
3. WHEN data pelanggan terburuk dimuat, THE Customer_Behavior_Analyzer SHALL menampilkan nama pelanggan, jumlah invoice overdue, dan total piutang
4. THE Customer_Behavior_Analyzer SHALL menampilkan visualisasi menggunakan bar chart dengan warna merah untuk indikasi warning
5. THE Customer_Behavior_Analyzer SHALL memuat data dari Analytics_Endpoint dengan parameter "worst_customers"

### Requirement 3.1: Analisis Konsumen dengan Bad Debt

**User Story:** Sebagai manajer keuangan, saya ingin melihat 10 konsumen dengan bad debt (piutang macet), sehingga saya dapat melakukan write-off atau tindakan hukum untuk penagihan.

#### Acceptance Criteria

1. THE Customer_Behavior_Analyzer SHALL menampilkan 10 pelanggan dengan bad debt tertinggi
2. THE Customer_Behavior_Analyzer SHALL mengidentifikasi bad debt sebagai piutang yang overdue lebih dari 90 hari
3. WHEN data bad debt dimuat, THE Customer_Behavior_Analyzer SHALL menampilkan nama pelanggan, jumlah invoice bad debt, total nilai bad debt, dan jumlah hari overdue rata-rata
4. THE Customer_Behavior_Analyzer SHALL menampilkan visualisasi menggunakan bar chart dengan warna merah gelap untuk indikasi critical
5. THE Customer_Behavior_Analyzer SHALL memuat data dari Analytics_Endpoint dengan parameter "bad_debt_customers"
6. THE Customer_Behavior_Analyzer SHALL menampilkan badge "Bad Debt" dengan warna merah pada setiap entry
7. THE Customer_Behavior_Analyzer SHALL menghitung persentase bad debt terhadap total piutang keseluruhan

### Requirement 4: Analisis Sales Terbaik Berdasarkan Penjualan

**User Story:** Sebagai manajer penjualan, saya ingin melihat 10 sales dengan total penjualan tertinggi, sehingga saya dapat memberikan penghargaan dan mengidentifikasi best practices.

#### Acceptance Criteria

1. THE Sales_Performance_Tracker SHALL menampilkan 10 sales dengan total penjualan tertinggi
2. WHEN data sales terbaik dimuat, THE Sales_Performance_Tracker SHALL menampilkan nama sales, jumlah transaksi, dan total nilai penjualan
3. THE Sales_Performance_Tracker SHALL menampilkan visualisasi menggunakan bar chart horizontal
4. THE Sales_Performance_Tracker SHALL memuat data dari Analytics_Endpoint dengan parameter "top_sales_by_revenue"
5. WHEN tidak ada data sales, THE Sales_Performance_Tracker SHALL menampilkan pesan "Tidak ada data sales"

### Requirement 5: Analisis Sales Terbaik Berdasarkan Komisi

**User Story:** Sebagai manajer penjualan, saya ingin melihat 10 sales dengan komisi tertinggi, sehingga saya dapat mengevaluasi sistem insentif dan performa sales.

#### Acceptance Criteria

1. THE Sales_Performance_Tracker SHALL menampilkan 10 sales dengan total komisi tertinggi
2. WHEN data komisi sales dimuat, THE Sales_Performance_Tracker SHALL menampilkan nama sales, jumlah transaksi, dan total komisi yang diperoleh
3. THE Sales_Performance_Tracker SHALL menampilkan visualisasi menggunakan bar chart dengan warna hijau untuk indikasi positif
4. THE Sales_Performance_Tracker SHALL memuat data dari Analytics_Endpoint dengan parameter "top_sales_by_commission"
5. THE Sales_Performance_Tracker SHALL memformat nilai komisi dalam format Rupiah Indonesia

### Requirement 6: Analisis Sales Terburuk Berdasarkan Komisi

**User Story:** Sebagai manajer penjualan, saya ingin melihat 10 sales dengan komisi terendah, sehingga saya dapat memberikan coaching dan dukungan untuk meningkatkan performa mereka.

#### Acceptance Criteria

1. THE Sales_Performance_Tracker SHALL menampilkan 10 sales dengan total komisi terendah
2. WHEN data komisi sales terendah dimuat, THE Sales_Performance_Tracker SHALL menampilkan nama sales, jumlah transaksi, dan total komisi yang diperoleh
3. THE Sales_Performance_Tracker SHALL menampilkan visualisasi menggunakan bar chart dengan warna orange untuk indikasi perlu perhatian
4. THE Sales_Performance_Tracker SHALL memuat data dari Analytics_Endpoint dengan parameter "worst_sales_by_commission"
5. THE Sales_Performance_Tracker SHALL memformat nilai komisi dalam format Rupiah Indonesia

### Requirement 7: Tracking Hutang Komisi Belum Dibayar

**User Story:** Sebagai manajer keuangan, saya ingin melihat total komisi yang belum dibayarkan ke sales, sehingga saya dapat merencanakan cash flow dan memastikan pembayaran komisi tepat waktu.

#### Acceptance Criteria

1. THE Commission_Tracker SHALL menampilkan total komisi yang belum dibayarkan kepada semua sales
2. THE Commission_Tracker SHALL menampilkan jumlah sales yang memiliki komisi outstanding
3. WHEN total komisi outstanding lebih dari 0, THE Commission_Tracker SHALL menampilkan alert banner dengan warna merah
4. THE Commission_Tracker SHALL memuat data dari Analytics_Endpoint dengan parameter "outstanding_commission"
5. THE Commission_Tracker SHALL memformat nilai komisi dalam format Rupiah Indonesia
6. THE Commission_Tracker SHALL menampilkan breakdown per sales dalam bentuk list atau table

### Requirement 8: Tracking Hutang Komisi Sudah Dibayar

**User Story:** Sebagai manajer keuangan, saya ingin melihat total komisi yang sudah dibayarkan ke sales, sehingga saya dapat melakukan rekonsiliasi dan audit pembayaran komisi.

#### Acceptance Criteria

1. THE Commission_Tracker SHALL menampilkan total komisi yang sudah dibayarkan kepada semua sales
2. THE Commission_Tracker SHALL menampilkan periode pembayaran komisi (bulan/tahun)
3. THE Commission_Tracker SHALL menampilkan visualisasi trend pembayaran komisi menggunakan line chart
4. THE Commission_Tracker SHALL memuat data dari Analytics_Endpoint dengan parameter "paid_commission"
5. THE Commission_Tracker SHALL memformat nilai komisi dalam format Rupiah Indonesia

### Requirement 9: API Endpoint untuk Data Analitik

**User Story:** Sebagai sistem frontend, saya memerlukan API endpoint untuk mengambil data analitik, sehingga komponen dashboard dapat menampilkan informasi yang akurat dan real-time.

#### Acceptance Criteria

1. THE Analytics_Endpoint SHALL menyediakan endpoint GET /api/analytics dengan parameter query "type"
2. WHEN parameter type adalah "top_products", THE Analytics_Endpoint SHALL mengembalikan 10 produk terlaris dengan field: item_code, item_name, total_qty, total_amount
3. WHEN parameter type adalah "best_customers", THE Analytics_Endpoint SHALL mengembalikan 10 pelanggan terbaik dengan field: customer_name, paid_invoices, on_time_percentage, total_paid
4. WHEN parameter type adalah "worst_customers", THE Analytics_Endpoint SHALL mengembalikan 10 pelanggan terburuk dengan field: customer_name, overdue_invoices, outstanding_amount
5. WHEN parameter type adalah "bad_debt_customers", THE Analytics_Endpoint SHALL mengembalikan 10 pelanggan dengan bad debt tertinggi dengan field: customer_name, bad_debt_invoices, bad_debt_amount, average_overdue_days
6. WHEN parameter type adalah "top_sales_by_revenue", THE Analytics_Endpoint SHALL mengembalikan 10 sales terbaik dengan field: sales_person, transaction_count, total_revenue
7. WHEN parameter type adalah "top_sales_by_commission", THE Analytics_Endpoint SHALL mengembalikan 10 sales dengan komisi tertinggi dengan field: sales_person, transaction_count, total_commission
8. WHEN parameter type adalah "worst_sales_by_commission", THE Analytics_Endpoint SHALL mengembalikan 10 sales dengan komisi terendah dengan field: sales_person, transaction_count, total_commission
9. WHEN parameter type adalah "outstanding_commission", THE Analytics_Endpoint SHALL mengembalikan total komisi belum dibayar dengan field: total_outstanding, sales_count, breakdown
10. WHEN parameter type adalah "paid_commission", THE Analytics_Endpoint SHALL mengembalikan total komisi sudah dibayar dengan field: total_paid, period, monthly_trend
11. WHEN parameter type adalah "highest_stock_items", THE Analytics_Endpoint SHALL mengembalikan 10 item dengan stok terbanyak dengan field: item_code, item_name, total_stock, warehouse_count
12. WHEN parameter type adalah "lowest_stock_items", THE Analytics_Endpoint SHALL mengembalikan 10 item dengan stok terendah dengan field: item_code, item_name, total_stock, reorder_level
13. WHEN parameter type adalah "most_purchased_items", THE Analytics_Endpoint SHALL mengembalikan 10 item paling sering dibeli dengan field: item_code, item_name, purchase_frequency, total_purchased_qty
14. WHEN parameter type adalah "top_suppliers_by_frequency", THE Analytics_Endpoint SHALL mengembalikan 10 supplier paling sering dibeli dengan field: supplier_name, purchase_order_count, total_purchase_amount, average_order_value
15. WHEN parameter type adalah "paid_suppliers", THE Analytics_Endpoint SHALL mengembalikan 10 supplier dengan pembayaran terbesar yang sudah lunas dengan field: supplier_name, paid_invoices_count, total_paid_amount, last_payment_date
16. WHEN parameter type adalah "unpaid_suppliers", THE Analytics_Endpoint SHALL mengembalikan 10 supplier dengan hutang terbesar yang belum dibayar dengan field: supplier_name, outstanding_invoices_count, outstanding_amount, oldest_due_date
17. THE Analytics_Endpoint SHALL mengambil data dari ERPNext_API menggunakan frappe.client.get_list atau custom report
18. THE Analytics_Endpoint SHALL menghitung bad debt sebagai invoice dengan due_date lebih dari 90 hari yang lalu dan status belum lunas
19. IF terjadi error saat mengambil data dari ERPNext_API, THEN THE Analytics_Endpoint SHALL mengembalikan response dengan status 500 dan pesan error yang deskriptif

### Requirement 10: Visualisasi Grafik dengan Recharts

**User Story:** Sebagai pengguna dashboard, saya ingin melihat data analitik dalam bentuk grafik yang mudah dipahami, sehingga saya dapat dengan cepat mengidentifikasi trend dan insight bisnis.

#### Acceptance Criteria

1. THE Recharts_Visualizer SHALL menampilkan bar chart horizontal untuk top products dengan sumbu X sebagai nilai penjualan dan sumbu Y sebagai nama produk
2. THE Recharts_Visualizer SHALL menampilkan bar chart untuk customer behavior dengan warna hijau untuk pelanggan terbaik dan merah untuk pelanggan terburuk
3. THE Recharts_Visualizer SHALL menampilkan bar chart horizontal untuk sales performance dengan tooltip yang menampilkan detail lengkap
4. THE Recharts_Visualizer SHALL menampilkan line chart untuk trend pembayaran komisi dengan marker pada setiap data point
5. THE Recharts_Visualizer SHALL menggunakan color palette yang konsisten dengan design system: Indigo (primary), Green (success), Yellow (warning), Red (danger)
6. WHEN user hover pada grafik, THE Recharts_Visualizer SHALL menampilkan tooltip dengan informasi detail
7. THE Recharts_Visualizer SHALL menampilkan legend untuk grafik yang memiliki multiple series
8. THE Recharts_Visualizer SHALL responsive dan menyesuaikan ukuran berdasarkan viewport

### Requirement 11: Integrasi dengan Dashboard Page

**User Story:** Sebagai pengguna sistem, saya ingin melihat semua komponen analitik terintegrasi dengan baik di dashboard page, sehingga saya dapat mengakses semua informasi dalam satu halaman.

#### Acceptance Criteria

1. THE Dashboard_Page SHALL menampilkan komponen analitik di bawah existing stat cards dan monthly sales chart
2. THE Dashboard_Page SHALL mengatur layout komponen analitik menggunakan CSS Grid dengan responsive breakpoints
3. WHEN user memiliki role Sales Manager atau System Manager, THE Dashboard_Page SHALL menampilkan semua komponen analitik
4. WHEN user memiliki role Accounts Manager, THE Dashboard_Page SHALL menampilkan komponen customer behavior dan commission tracker
5. THE Dashboard_Page SHALL memuat semua data analitik secara parallel untuk meningkatkan performa
6. WHEN data analitik sedang dimuat, THE Dashboard_Page SHALL menampilkan loading skeleton untuk setiap komponen
7. IF terjadi error saat memuat data analitik, THEN THE Dashboard_Page SHALL menampilkan error message pada komponen yang gagal tanpa mempengaruhi komponen lain

### Requirement 12: Responsive Design dan Accessibility

**User Story:** Sebagai pengguna mobile, saya ingin dapat mengakses dashboard analitik dari perangkat mobile dengan tampilan yang optimal, sehingga saya dapat memantau bisnis dari mana saja.

#### Acceptance Criteria

1. THE Dashboard_Analytics_System SHALL menampilkan layout 1 kolom pada viewport mobile (< 768px)
2. THE Dashboard_Analytics_System SHALL menampilkan layout 2 kolom pada viewport tablet (768px - 1024px)
3. THE Dashboard_Analytics_System SHALL menampilkan layout 3-4 kolom pada viewport desktop (> 1024px)
4. THE Dashboard_Analytics_System SHALL menggunakan font size yang dapat dibaca pada semua ukuran layar
5. THE Dashboard_Analytics_System SHALL memiliki touch target minimal 44x44 pixels untuk interaksi mobile
6. THE Recharts_Visualizer SHALL menyesuaikan ukuran grafik berdasarkan container width
7. THE Dashboard_Analytics_System SHALL memiliki contrast ratio minimal 4.5:1 untuk teks dan background

### Requirement 13: Performance dan Caching

**User Story:** Sebagai sistem, saya perlu memastikan dashboard analitik dimuat dengan cepat, sehingga pengguna mendapatkan pengalaman yang responsif.

#### Acceptance Criteria

1. THE Analytics_Endpoint SHALL mengembalikan response dalam waktu maksimal 2 detik untuk setiap request
2. THE Analytics_Endpoint SHALL mengimplementasikan caching dengan TTL 5 menit untuk mengurangi load ke ERPNext_API
3. WHEN data di cache masih valid, THE Analytics_Endpoint SHALL mengembalikan data dari cache
4. THE Dashboard_Page SHALL menggunakan React.memo atau useMemo untuk mencegah re-render yang tidak perlu
5. THE Dashboard_Page SHALL memuat komponen analitik secara lazy loading jika berada di bawah fold
6. THE Recharts_Visualizer SHALL menggunakan data aggregation untuk grafik dengan data point lebih dari 100 items

### Requirement 14: Error Handling dan Fallback

**User Story:** Sebagai pengguna, saya ingin sistem tetap dapat digunakan meskipun terjadi error pada beberapa komponen analitik, sehingga saya tetap dapat mengakses fitur dashboard lainnya.

#### Acceptance Criteria

1. IF Analytics_Endpoint gagal mengambil data dari ERPNext_API, THEN THE Analytics_Endpoint SHALL mengembalikan empty array dengan success flag false
2. WHEN komponen analitik menerima empty data, THE komponen SHALL menampilkan empty state dengan ilustrasi dan pesan yang informatif
3. IF terjadi network error, THEN THE Dashboard_Page SHALL menampilkan retry button pada komponen yang gagal
4. THE Dashboard_Page SHALL mengimplementasikan error boundary untuk mencegah crash pada seluruh aplikasi
5. WHEN user click retry button, THE Dashboard_Page SHALL mencoba memuat ulang data untuk komponen tersebut
6. THE Dashboard_Analytics_System SHALL log semua error ke console untuk debugging purposes

### Requirement 15: TypeScript Type Safety dan Code Quality

**User Story:** Sebagai developer, saya ingin memastikan semua kode memiliki type safety yang ketat dan lulus ESLint validation, sehingga kode mudah dimaintain dan bebas dari bug runtime.

#### Acceptance Criteria

1. THE Dashboard_Analytics_System SHALL NOT menggunakan type `any` di semua file TypeScript
2. THE Dashboard_Analytics_System SHALL mendefinisikan explicit TypeScript interfaces untuk semua data structures yang digunakan
3. THE Analytics_Endpoint SHALL mendefinisikan TypeScript interface untuk setiap response type (TopProduct, CustomerBehavior, SalesPerformance, CommissionData)
4. THE Dashboard_Page SHALL mendefinisikan TypeScript interface untuk semua props yang diterima komponen analitik
5. THE Recharts_Visualizer SHALL menggunakan proper typing untuk semua chart data dan props
6. WHEN menjalankan `pnpm lint`, THE Dashboard_Analytics_System SHALL NOT menghasilkan ESLint errors atau warnings
7. WHEN menjalankan TypeScript compiler check, THE Dashboard_Analytics_System SHALL NOT menghasilkan type errors
8. THE Dashboard_Analytics_System SHALL menggunakan strict null checks dan menangani undefined/null values dengan proper type guards
9. THE Dashboard_Analytics_System SHALL menggunakan TypeScript utility types (Partial, Pick, Omit, Record) ketika sesuai untuk meningkatkan type safety
10. THE API route handlers SHALL menggunakan proper typing untuk NextRequest, NextResponse, dan params dengan Promise handling yang benar
11. THE Dashboard_Analytics_System SHALL menggunakan const assertions dan readonly modifiers untuk immutable data structures
12. ALL async functions SHALL memiliki explicit return type Promise<T> dengan T yang terdefinisi dengan jelas

### Requirement 16: Analisis Stok Item Terbanyak

**User Story:** Sebagai manajer gudang, saya ingin melihat 10 item dengan stok terbanyak, sehingga saya dapat mengidentifikasi item yang memiliki inventory berlebih dan merencanakan strategi penjualan atau promosi.

#### Acceptance Criteria

1. THE Inventory_Analytics SHALL menampilkan 10 item dengan stok terbanyak
2. WHEN data stok terbanyak dimuat, THE Inventory_Analytics SHALL menampilkan item_code, item_name, total_stock, dan warehouse_count
3. THE Inventory_Analytics SHALL menampilkan visualisasi menggunakan bar chart horizontal dengan warna indigo
4. THE Inventory_Analytics SHALL memuat data dari Analytics_Endpoint dengan parameter "highest_stock_items"
5. WHEN tidak ada data stok, THE Inventory_Analytics SHALL menampilkan pesan "Tidak ada data stok item"

### Requirement 17: Analisis Stok Item Terendah

**User Story:** Sebagai manajer gudang, saya ingin melihat 10 item dengan stok terendah, sehingga saya dapat melakukan reorder sebelum kehabisan stok dan menghindari stockout.

#### Acceptance Criteria

1. THE Inventory_Analytics SHALL menampilkan 10 item dengan stok terendah (tidak termasuk item dengan stok 0)
2. WHEN data stok terendah dimuat, THE Inventory_Analytics SHALL menampilkan item_code, item_name, total_stock, dan reorder_level
3. THE Inventory_Analytics SHALL menampilkan visualisasi menggunakan bar chart horizontal dengan warna orange untuk indikasi warning
4. THE Inventory_Analytics SHALL memuat data dari Analytics_Endpoint dengan parameter "lowest_stock_items"
5. WHEN item stok di bawah reorder_level, THE Inventory_Analytics SHALL menampilkan badge "Reorder" dengan warna merah

### Requirement 18: Analisis Item Paling Sering Dibeli

**User Story:** Sebagai manajer pembelian, saya ingin melihat 10 item yang paling sering dibeli, sehingga saya dapat mengoptimalkan inventory planning dan negosiasi harga dengan supplier.

#### Acceptance Criteria

1. THE Inventory_Analytics SHALL menampilkan 10 item dengan frekuensi pembelian tertinggi
2. WHEN data item sering dibeli dimuat, THE Inventory_Analytics SHALL menampilkan item_code, item_name, purchase_frequency, dan total_purchased_qty
3. THE Inventory_Analytics SHALL menghitung purchase_frequency berdasarkan jumlah Purchase Order yang mengandung item tersebut
4. THE Inventory_Analytics SHALL menampilkan visualisasi menggunakan bar chart horizontal dengan warna green
5. THE Inventory_Analytics SHALL memuat data dari Analytics_Endpoint dengan parameter "most_purchased_items"

### Requirement 19: Analisis Supplier Paling Sering Dibeli

**User Story:** Sebagai manajer pembelian, saya ingin melihat 10 supplier yang paling sering dibeli, sehingga saya dapat mempertahankan hubungan baik dengan supplier utama dan mendapatkan terms yang lebih baik.

#### Acceptance Criteria

1. THE Supplier_Analytics SHALL menampilkan 10 supplier dengan frekuensi pembelian tertinggi
2. WHEN data supplier sering dibeli dimuat, THE Supplier_Analytics SHALL menampilkan supplier_name, purchase_order_count, total_purchase_amount, dan average_order_value
3. THE Supplier_Analytics SHALL menampilkan visualisasi menggunakan bar chart horizontal dengan warna indigo
4. THE Supplier_Analytics SHALL memuat data dari Analytics_Endpoint dengan parameter "top_suppliers_by_frequency"
5. THE Supplier_Analytics SHALL memformat nilai pembelian dalam format Rupiah Indonesia

### Requirement 20: Analisis Supplier Sudah Dibayar

**User Story:** Sebagai manajer keuangan, saya ingin melihat 10 supplier dengan pembayaran terbanyak yang sudah lunas, sehingga saya dapat melakukan rekonsiliasi dan audit pembayaran supplier.

#### Acceptance Criteria

1. THE Supplier_Analytics SHALL menampilkan 10 supplier dengan total pembayaran terbesar yang sudah lunas
2. WHEN data supplier sudah dibayar dimuat, THE Supplier_Analytics SHALL menampilkan supplier_name, paid_invoices_count, total_paid_amount, dan last_payment_date
3. THE Supplier_Analytics SHALL menampilkan visualisasi menggunakan bar chart dengan warna green untuk indikasi positif
4. THE Supplier_Analytics SHALL memuat data dari Analytics_Endpoint dengan parameter "paid_suppliers"
5. THE Supplier_Analytics SHALL memformat nilai pembayaran dalam format Rupiah Indonesia

### Requirement 21: Analisis Supplier Belum Dibayar

**User Story:** Sebagai manajer keuangan, saya ingin melihat 10 supplier dengan hutang terbesar yang belum dibayar, sehingga saya dapat merencanakan cash flow dan prioritas pembayaran.

#### Acceptance Criteria

1. THE Supplier_Analytics SHALL menampilkan 10 supplier dengan total hutang terbesar yang belum dibayar
2. WHEN data supplier belum dibayar dimuat, THE Supplier_Analytics SHALL menampilkan supplier_name, outstanding_invoices_count, outstanding_amount, dan oldest_due_date
3. WHEN outstanding_amount > 0, THE Supplier_Analytics SHALL menampilkan alert banner dengan warna orange
4. THE Supplier_Analytics SHALL menampilkan visualisasi menggunakan bar chart dengan warna red untuk indikasi warning
5. THE Supplier_Analytics SHALL memuat data dari Analytics_Endpoint dengan parameter "unpaid_suppliers"
6. THE Supplier_Analytics SHALL memformat nilai hutang dalam format Rupiah Indonesia
