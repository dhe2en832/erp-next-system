# Requirements Document

## Introduction

Laporan Kartu Stok (Stock Card Report) adalah fitur pelaporan yang menampilkan riwayat pergerakan stok barang secara detail. Laporan ini mencatat semua transaksi masuk dan keluar untuk setiap item, termasuk informasi sumber dan tujuan perpindahan stok, saldo berjalan, dan detail pihak terkait (pelanggan/pemasok). Fitur ini mendukung filtering berkorelasi, ekspor ke Excel/PDF, dan pencetakan.

## Glossary

- **Stock_Card_Report**: Sistem pelaporan yang menampilkan riwayat pergerakan stok item
- **Item**: Barang atau produk yang dikelola dalam sistem inventory
- **Transaction**: Aktivitas yang menyebabkan perubahan stok (masuk atau keluar)
- **Running_Balance**: Saldo stok yang terupdate setelah setiap transaksi
- **Party**: Pihak terkait dalam transaksi (Customer untuk penjualan, Supplier untuk pembelian)
- **Warehouse**: Gudang tempat penyimpanan stok
- **Transaction_Type**: Jenis transaksi (Sales Invoice, Purchase Receipt, Delivery Note, Stock Entry, Stock Reconciliation)
- **Filter_Engine**: Komponen yang mengelola filtering berkorelasi
- **Export_Service**: Layanan untuk mengekspor laporan ke format Excel atau PDF
- **Print_Service**: Layanan untuk mencetak laporan
- **Report_Menu**: Menu navigasi untuk mengakses berbagai laporan

## Requirements

### Requirement 1: Display Stock Movement History

**User Story:** As a warehouse manager, I want to view detailed stock movement history for items, so that I can track all incoming and outgoing transactions.

#### Acceptance Criteria

1. WHEN a user selects an item, THE Stock_Card_Report SHALL display all transactions for that item in chronological order
2. FOR EACH transaction, THE Stock_Card_Report SHALL display the transaction date, transaction type, quantity, running balance, warehouse, and party information
3. THE Stock_Card_Report SHALL calculate and display the running balance after each transaction
4. THE Stock_Card_Report SHALL distinguish between incoming transactions (positive quantity) and outgoing transactions (negative quantity)
5. THE Stock_Card_Report SHALL display the opening balance at the start of the selected period
6. THE Stock_Card_Report SHALL display the closing balance at the end of the selected period

### Requirement 2: Support Multiple Transaction Types

**User Story:** As an inventory controller, I want to see all types of stock transactions, so that I have a complete view of stock movements.

#### Acceptance Criteria

1. THE Stock_Card_Report SHALL include transactions from Sales Invoice documents
2. THE Stock_Card_Report SHALL include transactions from Purchase Receipt documents
3. THE Stock_Card_Report SHALL include transactions from Delivery Note documents
4. THE Stock_Card_Report SHALL include transactions from Stock Entry documents
5. THE Stock_Card_Report SHALL include transactions from Stock Reconciliation documents
6. FOR EACH transaction type, THE Stock_Card_Report SHALL display the source document reference number

### Requirement 3: Implement Correlated Filtering

**User Story:** As a financial analyst, I want to filter stock movements using multiple correlated filters, so that I can analyze specific scenarios.

#### Acceptance Criteria

1. THE Filter_Engine SHALL provide a date range filter (start date and end date)
2. THE Filter_Engine SHALL provide an item filter to select specific items
3. THE Filter_Engine SHALL provide a warehouse filter to select specific warehouses
4. THE Filter_Engine SHALL provide a customer filter to show transactions with specific customers
5. THE Filter_Engine SHALL provide a supplier filter to show transactions with specific suppliers
6. THE Filter_Engine SHALL provide a transaction type filter to show specific types of transactions
7. WHEN multiple filters are applied, THE Filter_Engine SHALL apply all filters simultaneously (AND logic)
8. WHEN a filter is changed, THE Stock_Card_Report SHALL update the displayed data immediately
9. THE Filter_Engine SHALL persist filter selections during the user session

### Requirement 4: Export to Excel

**User Story:** As a reporting analyst, I want to export stock card reports to Excel, so that I can perform further analysis and share with stakeholders.

#### Acceptance Criteria

1. THE Export_Service SHALL provide an "Export to Excel" button in the report interface
2. WHEN the export button is clicked, THE Export_Service SHALL generate an Excel file containing all visible report data
3. THE Export_Service SHALL include all columns displayed in the report (date, transaction type, reference, quantity, balance, warehouse, party)
4. THE Export_Service SHALL apply the current filter selections to the exported data
5. THE Export_Service SHALL format the Excel file with proper headers and column widths
6. THE Export_Service SHALL name the exported file with pattern "Laporan_Kartu_Stok_[ItemName]_[Date].xlsx"
7. WHEN the export is complete, THE Export_Service SHALL trigger a browser download of the Excel file

### Requirement 5: Export to PDF

**User Story:** As a warehouse supervisor, I want to export stock card reports to PDF, so that I can create formal documentation and archive records.

#### Acceptance Criteria

1. THE Export_Service SHALL provide an "Export to PDF" button in the report interface
2. WHEN the PDF export button is clicked, THE Export_Service SHALL generate a PDF file containing all visible report data
3. THE Export_Service SHALL format the PDF with proper page layout, headers, and footers
4. THE Export_Service SHALL include the company logo and report title in the PDF header
5. THE Export_Service SHALL include page numbers in the PDF footer
6. THE Export_Service SHALL apply the current filter selections to the exported PDF data
7. THE Export_Service SHALL name the PDF file with pattern "Laporan_Kartu_Stok_[ItemName]_[Date].pdf"
8. WHEN the PDF export is complete, THE Export_Service SHALL trigger a browser download of the PDF file

### Requirement 6: Print Report

**User Story:** As an operations manager, I want to print stock card reports directly, so that I can review physical copies during meetings.

#### Acceptance Criteria

1. THE Print_Service SHALL provide a "Print" button in the report interface
2. WHEN the print button is clicked, THE Print_Service SHALL open the browser print dialog
3. THE Print_Service SHALL format the report for print with proper page breaks
4. THE Print_Service SHALL include the report title, filter parameters, and generation date in the print header
5. THE Print_Service SHALL apply print-specific CSS to optimize the layout for paper
6. THE Print_Service SHALL hide UI elements (buttons, filters) in the print view
7. THE Print_Service SHALL maintain table formatting and readability in the print output

### Requirement 7: Integrate with Report Menu

**User Story:** As a system user, I want to access the stock card report from the main report menu, so that I can easily find and use this feature.

#### Acceptance Criteria

1. THE Report_Menu SHALL include a "Laporan Kartu Stok" menu item under the "Laporan" section
2. WHEN the menu item is clicked, THE Report_Menu SHALL navigate to the stock card report page
3. THE Report_Menu SHALL display the stock card report option alongside other inventory reports
4. THE Report_Menu SHALL be accessible from the main navigation bar

### Requirement 8: Fetch Data from ERPNext API

**User Story:** As a system administrator, I want the stock card report to fetch real-time data from ERPNext, so that the report always shows current information.

#### Acceptance Criteria

1. THE Stock_Card_Report SHALL fetch stock ledger entries from the ERPNext API endpoint
2. WHEN filters are applied, THE Stock_Card_Report SHALL send filter parameters to the API
3. IF the API request fails, THEN THE Stock_Card_Report SHALL display an error message to the user
4. WHILE data is being fetched, THE Stock_Card_Report SHALL display a loading indicator
5. THE Stock_Card_Report SHALL use authentication credentials from environment variables
6. THE Stock_Card_Report SHALL handle API rate limiting gracefully

### Requirement 9: Display Source and Destination Information

**User Story:** As a logistics coordinator, I want to see the source and destination of each stock movement, so that I can track the flow of inventory.

#### Acceptance Criteria

1. FOR EACH transaction, THE Stock_Card_Report SHALL display the source warehouse (for incoming stock)
2. FOR EACH transaction, THE Stock_Card_Report SHALL display the destination warehouse (for outgoing stock)
3. FOR EACH sales transaction, THE Stock_Card_Report SHALL display the customer name
4. FOR EACH purchase transaction, THE Stock_Card_Report SHALL display the supplier name
5. FOR EACH stock transfer, THE Stock_Card_Report SHALL display both source and destination warehouses
6. IF source or destination information is not available, THEN THE Stock_Card_Report SHALL display a dash (-) or "N/A"

### Requirement 10: Responsive UI Design

**User Story:** As a mobile user, I want to view stock card reports on my tablet or phone, so that I can check inventory on the go.

#### Acceptance Criteria

1. THE Stock_Card_Report SHALL display properly on desktop screens (1024px and above)
2. THE Stock_Card_Report SHALL display properly on tablet screens (768px to 1023px)
3. THE Stock_Card_Report SHALL display properly on mobile screens (below 768px)
4. ON mobile devices, THE Stock_Card_Report SHALL stack filters vertically for better usability
5. ON mobile devices, THE Stock_Card_Report SHALL make the data table horizontally scrollable
6. THE Stock_Card_Report SHALL use responsive typography that scales appropriately

### Requirement 11: Performance Optimization

**User Story:** As a power user, I want the stock card report to load quickly even with large datasets, so that I can work efficiently.

#### Acceptance Criteria

1. WHEN displaying more than 100 transactions, THE Stock_Card_Report SHALL implement pagination or virtual scrolling
2. THE Stock_Card_Report SHALL load the initial view within 2 seconds for datasets up to 1000 records
3. WHEN filters are changed, THE Stock_Card_Report SHALL debounce API requests by 300ms
4. THE Stock_Card_Report SHALL cache filter options (items, warehouses, customers, suppliers) for the session
5. THE Stock_Card_Report SHALL display a progress indicator for operations taking longer than 500ms

### Requirement 12: Data Validation and Error Handling

**User Story:** As a system user, I want clear error messages when something goes wrong, so that I can understand and resolve issues.

#### Acceptance Criteria

1. IF no item is selected, THEN THE Stock_Card_Report SHALL display a message "Pilih item untuk melihat laporan"
2. IF the date range is invalid (end date before start date), THEN THE Filter_Engine SHALL display an error message
3. IF the API returns an error, THEN THE Stock_Card_Report SHALL display the error message in Indonesian
4. IF no data is found for the selected filters, THEN THE Stock_Card_Report SHALL display "Tidak ada data untuk filter yang dipilih"
5. IF the export operation fails, THEN THE Export_Service SHALL display an error notification with retry option
6. THE Stock_Card_Report SHALL validate all user inputs before sending requests to the API
