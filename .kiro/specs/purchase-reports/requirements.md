# Requirements Document

## Introduction

Laporan Pembelian (Purchase Reports) adalah fitur pelaporan yang menampilkan data transaksi pembelian dari Purchase Invoice dengan kemampuan filter yang fleksibel, visualisasi data, dan ekspor ke berbagai format. Fitur ini memungkinkan pengguna untuk menganalisis pembelian berdasarkan supplier, periode waktu, status pembayaran, dan dimensi lainnya.

## Glossary

- **Purchase_Report_System**: Sistem pelaporan pembelian yang mengambil data dari Purchase Invoice
- **Report_Filter**: Komponen filter yang memungkinkan pengguna menyaring data laporan
- **Report_Viewer**: Komponen yang menampilkan data laporan dalam format tabel
- **Export_Engine**: Komponen yang menghasilkan file ekspor dalam format Excel atau PDF
- **Print_Handler**: Komponen yang menangani pencetakan laporan
- **Purchase_Invoice**: Dokumen faktur pembelian dari ERPNext
- **Date_Range_Filter**: Filter untuk memilih rentang tanggal posting
- **Supplier_Filter**: Filter untuk memilih satu atau beberapa supplier
- **Payment_Status_Filter**: Filter untuk status pembayaran (Paid, Unpaid, Partially Paid, Overdue)
- **Outstanding_Amount**: Jumlah yang belum dibayar dari faktur pembelian
- **Item_Detail_View**: Tampilan detail item-level dari faktur pembelian
- **Summary_View**: Tampilan ringkasan agregat dari data pembelian
- **Chart_Visualizer**: Komponen visualisasi data menggunakan recharts
- **Excel_Exporter**: Komponen ekspor menggunakan library xlsx
- **PDF_Generator**: Komponen untuk menghasilkan file PDF
- **Report_Menu**: Menu navigasi untuk mengakses laporan

## Requirements

### Requirement 1: Display Purchase Invoice Data

**User Story:** As a finance manager, I want to view all purchase invoice data in a report format, so that I can analyze purchasing activities.

#### Acceptance Criteria

1. WHEN the Purchase Report page is loaded, THE Report_Viewer SHALL fetch and display all Purchase Invoice records from the ERPNext API
2. THE Report_Viewer SHALL display the following columns: Invoice Number, Posting Date, Supplier Name, Grand Total, Paid Amount, Outstanding Amount, Payment Status, Due Date
3. THE Report_Viewer SHALL format currency values according to Indonesian Rupiah format (Rp)
4. THE Report_Viewer SHALL format dates in DD/MM/YYYY format
5. THE Report_Viewer SHALL display a loading state while fetching data
6. IF the API request fails, THEN THE Report_Viewer SHALL display an error message with retry option

### Requirement 2: Filter by Date Range

**User Story:** As a finance manager, I want to filter purchase reports by date range, so that I can analyze purchases within specific periods.

#### Acceptance Criteria

1. THE Report_Filter SHALL provide a Date_Range_Filter using BrowserStyleDatePicker component
2. THE Date_Range_Filter SHALL include "From Date" and "To Date" fields
3. WHEN a user selects a date range, THE Purchase_Report_System SHALL filter Purchase Invoices where posting_date is within the selected range
4. THE Date_Range_Filter SHALL support preset options: Today, This Week, This Month, This Quarter, This Year, Last Month, Last Quarter, Last Year
5. WHEN no date range is selected, THE Purchase_Report_System SHALL display all Purchase Invoices
6. THE Date_Range_Filter SHALL validate that "From Date" is not after "To Date"
7. IF "From Date" is after "To Date", THEN THE Report_Filter SHALL display a validation error message

### Requirement 3: Filter by Supplier

**User Story:** As a procurement officer, I want to filter purchase reports by supplier, so that I can analyze purchases from specific vendors.

#### Acceptance Criteria

1. THE Report_Filter SHALL provide a Supplier_Filter with searchable dropdown
2. THE Supplier_Filter SHALL fetch supplier list from ERPNext API
3. THE Supplier_Filter SHALL support single supplier selection
4. THE Supplier_Filter SHALL support multiple supplier selection
5. WHEN a user selects one or more suppliers, THE Purchase_Report_System SHALL filter Purchase Invoices matching the selected suppliers
6. THE Supplier_Filter SHALL display supplier name and supplier code
7. THE Supplier_Filter SHALL support search by supplier name or code

### Requirement 4: Filter by Payment Status

**User Story:** As a finance manager, I want to filter purchase reports by payment status, so that I can track unpaid or overdue invoices.

#### Acceptance Criteria

1. THE Report_Filter SHALL provide a Payment_Status_Filter with checkbox options
2. THE Payment_Status_Filter SHALL include options: Paid, Unpaid, Partially Paid, Overdue
3. WHEN a user selects payment status options, THE Purchase_Report_System SHALL filter Purchase Invoices matching the selected statuses
4. THE Purchase_Report_System SHALL calculate "Paid" status when outstanding_amount equals zero
5. THE Purchase_Report_System SHALL calculate "Unpaid" status when outstanding_amount equals grand_total
6. THE Purchase_Report_System SHALL calculate "Partially Paid" status when outstanding_amount is greater than zero and less than grand_total
7. THE Purchase_Report_System SHALL calculate "Overdue" status when due_date is before current date and outstanding_amount is greater than zero
8. WHEN no payment status is selected, THE Purchase_Report_System SHALL display all Purchase Invoices

### Requirement 5: Display Summary Statistics

**User Story:** As a finance manager, I want to see summary statistics of filtered purchase data, so that I can quickly understand key metrics.

#### Acceptance Criteria

1. THE Summary_View SHALL display total number of invoices in the filtered result
2. THE Summary_View SHALL display total purchase amount (sum of grand_total)
3. THE Summary_View SHALL display total paid amount (sum of paid_amount)
4. THE Summary_View SHALL display total outstanding amount (sum of outstanding_amount)
5. THE Summary_View SHALL display average invoice amount
6. WHEN filters are applied, THE Summary_View SHALL recalculate statistics based on filtered data
7. THE Summary_View SHALL format all currency values in Indonesian Rupiah format

### Requirement 6: Display Item-Level Details

**User Story:** As a procurement officer, I want to view item-level details of purchase invoices, so that I can analyze purchases by product.

#### Acceptance Criteria

1. THE Report_Viewer SHALL provide an expandable row for each Purchase Invoice
2. WHEN a user clicks on an invoice row, THE Item_Detail_View SHALL display all items from that invoice
3. THE Item_Detail_View SHALL display the following columns: Item Code, Item Name, Quantity, UOM, Rate, Amount, Tax Amount
4. THE Item_Detail_View SHALL fetch item details from the Purchase Invoice items child table
5. THE Item_Detail_View SHALL display a loading state while fetching item details
6. THE Item_Detail_View SHALL allow collapsing the expanded row to hide item details

### Requirement 7: Visualize Purchase Data

**User Story:** As a finance manager, I want to see visual charts of purchase data, so that I can identify trends and patterns.

#### Acceptance Criteria

1. THE Chart_Visualizer SHALL display a bar chart showing total purchases by month for the filtered period
2. THE Chart_Visualizer SHALL display a pie chart showing purchase distribution by top 10 suppliers
3. THE Chart_Visualizer SHALL display a line chart showing cumulative purchase amount over time
4. THE Chart_Visualizer SHALL use recharts library for all visualizations
5. WHEN filters are applied, THE Chart_Visualizer SHALL update charts based on filtered data
6. THE Chart_Visualizer SHALL display a message when no data is available for visualization
7. THE Chart_Visualizer SHALL format currency values in chart tooltips using Indonesian Rupiah format

### Requirement 8: Export to Excel

**User Story:** As a finance manager, I want to export purchase reports to Excel, so that I can perform further analysis in spreadsheet software.

#### Acceptance Criteria

1. THE Report_Viewer SHALL provide an "Export to Excel" button
2. WHEN a user clicks "Export to Excel", THE Excel_Exporter SHALL generate an Excel file using the xlsx library
3. THE Excel_Exporter SHALL include a "Summary" sheet with summary statistics
4. THE Excel_Exporter SHALL include a "Purchase Invoices" sheet with all filtered invoice data
5. THE Excel_Exporter SHALL include an "Item Details" sheet with item-level data from all filtered invoices
6. THE Excel_Exporter SHALL format currency columns with Indonesian Rupiah format in Excel
7. THE Excel_Exporter SHALL format date columns in DD/MM/YYYY format in Excel
8. THE Excel_Exporter SHALL apply filters to the exported data matching the current report filters
9. THE Excel_Exporter SHALL name the file "Laporan_Pembelian_[FromDate]_[ToDate].xlsx"
10. WHEN export is complete, THE Excel_Exporter SHALL trigger file download in the browser

### Requirement 9: Export to PDF

**User Story:** As a finance manager, I want to export purchase reports to PDF, so that I can share formatted reports with stakeholders.

#### Acceptance Criteria

1. THE Report_Viewer SHALL provide an "Export to PDF" button
2. WHEN a user clicks "Export to PDF", THE PDF_Generator SHALL generate a PDF file
3. THE PDF_Generator SHALL include report title "Laporan Pembelian"
4. THE PDF_Generator SHALL include filter criteria used in the report
5. THE PDF_Generator SHALL include summary statistics section
6. THE PDF_Generator SHALL include a table with all filtered invoice data
7. THE PDF_Generator SHALL format currency values in Indonesian Rupiah format
8. THE PDF_Generator SHALL format dates in DD/MM/YYYY format
9. THE PDF_Generator SHALL apply page breaks appropriately for long reports
10. THE PDF_Generator SHALL name the file "Laporan_Pembelian_[FromDate]_[ToDate].pdf"
11. WHEN export is complete, THE PDF_Generator SHALL trigger file download in the browser

### Requirement 10: Print Report

**User Story:** As a finance manager, I want to print purchase reports, so that I can have physical copies for meetings and records.

#### Acceptance Criteria

1. THE Report_Viewer SHALL provide a "Print" button
2. WHEN a user clicks "Print", THE Print_Handler SHALL open the browser print dialog
3. THE Print_Handler SHALL format the report for print media with appropriate page layout
4. THE Print_Handler SHALL include report title and filter criteria in the print header
5. THE Print_Handler SHALL include summary statistics in the print output
6. THE Print_Handler SHALL include all filtered invoice data in a print-friendly table format
7. THE Print_Handler SHALL hide UI elements (buttons, filters) in print output
8. THE Print_Handler SHALL apply page breaks to prevent data from being cut off
9. THE Print_Handler SHALL include page numbers in the print footer

### Requirement 11: Add to Reports Menu

**User Story:** As a user, I want to access Purchase Reports from the Reports menu, so that I can easily navigate to the feature.

#### Acceptance Criteria

1. THE Report_Menu SHALL include a "Laporan Pembelian" (Purchase Reports) menu item
2. THE Report_Menu SHALL place "Laporan Pembelian" under the "Laporan" (Reports) section
3. WHEN a user clicks "Laporan Pembelian", THE Purchase_Report_System SHALL navigate to the purchase reports page
4. THE Report_Menu SHALL display an icon for the "Laporan Pembelian" menu item
5. THE Report_Menu SHALL highlight the "Laporan Pembelian" menu item when the user is on the purchase reports page

### Requirement 12: Pagination and Sorting

**User Story:** As a user, I want to paginate and sort purchase report data, so that I can navigate large datasets efficiently.

#### Acceptance Criteria

1. THE Report_Viewer SHALL display 50 records per page by default
2. THE Report_Viewer SHALL provide pagination controls (Previous, Next, Page Numbers)
3. THE Report_Viewer SHALL allow users to change page size (25, 50, 100, 200 records per page)
4. THE Report_Viewer SHALL display total record count and current page range
5. THE Report_Viewer SHALL support sorting by any column (ascending and descending)
6. WHEN a user clicks a column header, THE Report_Viewer SHALL sort data by that column
7. THE Report_Viewer SHALL display sort direction indicator (up/down arrow) on sorted columns
8. THE Report_Viewer SHALL maintain sort order when applying filters

### Requirement 13: Responsive Design

**User Story:** As a user, I want to access purchase reports on mobile devices, so that I can view reports on the go.

#### Acceptance Criteria

1. THE Report_Viewer SHALL display in a responsive layout that adapts to screen size
2. WHEN viewed on mobile devices, THE Report_Filter SHALL stack filters vertically
3. WHEN viewed on mobile devices, THE Report_Viewer SHALL display a horizontally scrollable table
4. WHEN viewed on mobile devices, THE Chart_Visualizer SHALL resize charts to fit screen width
5. THE Report_Viewer SHALL maintain functionality on touch devices
6. THE Report_Viewer SHALL use mobile-first design principles with Tailwind CSS

### Requirement 14: Performance Optimization

**User Story:** As a user, I want purchase reports to load quickly, so that I can access data without delays.

#### Acceptance Criteria

1. WHEN the report contains more than 1000 records, THE Purchase_Report_System SHALL implement server-side pagination
2. THE Purchase_Report_System SHALL cache supplier list data for 5 minutes
3. THE Purchase_Report_System SHALL debounce filter changes by 300ms before fetching data
4. THE Chart_Visualizer SHALL render charts only when the charts section is visible (lazy loading)
5. THE Purchase_Report_System SHALL display a loading skeleton while fetching data
6. THE Purchase_Report_System SHALL fetch item details on-demand when a row is expanded (not all at once)

### Requirement 15: Error Handling and User Feedback

**User Story:** As a user, I want clear error messages and feedback, so that I understand what went wrong and how to fix it.

#### Acceptance Criteria

1. IF the ERPNext API is unavailable, THEN THE Purchase_Report_System SHALL display "Unable to connect to server. Please try again later."
2. IF no data matches the filter criteria, THEN THE Report_Viewer SHALL display "No purchase invoices found for the selected filters."
3. IF an export operation fails, THEN THE Purchase_Report_System SHALL display an error message with the failure reason
4. WHEN a filter is applied, THE Purchase_Report_System SHALL display a toast notification "Filter applied successfully"
5. WHEN an export is successful, THE Purchase_Report_System SHALL display a toast notification "Export completed successfully"
6. THE Purchase_Report_System SHALL log all errors to the browser console for debugging
7. THE Purchase_Report_System SHALL provide a "Clear Filters" button to reset all filters to default state
