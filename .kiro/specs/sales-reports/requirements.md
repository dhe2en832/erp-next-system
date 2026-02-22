# Requirements Document

## Introduction

This document defines the requirements for enhancing the Sales Reports (Laporan Penjualan) feature in the ERPNext-based ERP system. The current sales report displays Sales Order data with basic filtering capabilities. This enhancement will add comprehensive filtering with correlated filters, data export functionality to Excel and PDF formats, improved print capabilities, and integration into the main Reports menu. The feature will fetch data from Sales Invoices (Faktur Penjualan) instead of Sales Orders to provide accurate billing information.

## Glossary

- **Sales_Report**: A report page that displays sales transaction data with filtering, export, and print capabilities
- **Sales_Invoice**: An ERPNext document type representing a billing document for goods or services sold (Faktur Penjualan)
- **Correlated_Filter**: A set of filters that work together where selecting one filter value affects available options in related filters
- **Date_Range_Filter**: A filter component that allows users to specify start and end dates for data retrieval
- **Customer_Filter**: A filter that allows users to select one or more customers to view their transactions
- **Sales_Person_Filter**: A filter that allows users to select one or more sales representatives
- **Status_Filter**: A filter that allows users to filter invoices by their document status (Draft, Submitted, Paid, Cancelled)
- **Excel_Export**: The process of converting report data into XLSX format for download
- **PDF_Export**: The process of converting report data into PDF format for download
- **Print_Layout**: A formatted view of the report optimized for printing on paper
- **Report_Menu**: The main navigation menu section that contains links to all system reports
- **BrowserStyleDatePicker**: A custom date picker component that uses native browser date input styling
- **XLSX_Library**: The xlsx JavaScript library used for Excel file generation
- **Debouncing**: A technique that delays API calls until user stops typing for a specified duration
- **Filter_State**: The current set of active filter criteria applied to the report
- **Grand_Total**: The total invoice amount including all taxes and charges
- **Outstanding_Amount**: The remaining unpaid amount on an invoice
- **Posting_Date**: The date when the invoice was officially recorded in the system

## Requirements

### Requirement 1: Data Source Migration

**User Story:** As a user, I want the sales report to show invoice data instead of sales order data, so that I can see actual billed transactions with payment status.

#### Acceptance Criteria

1. THE Sales_Report SHALL fetch data from Sales_Invoice documents instead of Sales Order documents
2. THE Sales_Report SHALL display Posting_Date as the transaction date
3. THE Sales_Report SHALL display Grand_Total as the invoice amount
4. THE Sales_Report SHALL display Outstanding_Amount to show unpaid balances
5. THE Sales_Report SHALL display payment status information for each invoice

### Requirement 2: Date Range Filtering

**User Story:** As a user, I want to filter sales data by date range, so that I can analyze sales performance for specific time periods.

#### Acceptance Criteria

1. THE Sales_Report SHALL provide a Date_Range_Filter with "from date" and "to date" inputs
2. THE Sales_Report SHALL use BrowserStyleDatePicker for date input fields
3. WHEN a user selects a date range, THE Sales_Report SHALL fetch only invoices within that range based on Posting_Date
4. THE Sales_Report SHALL default the date range to the current month (first day to current day)
5. THE Sales_Report SHALL implement debouncing for date filter changes with a 500ms delay

### Requirement 3: Customer Filtering

**User Story:** As a user, I want to filter sales by customer, so that I can view transactions for specific clients.

#### Acceptance Criteria

1. THE Sales_Report SHALL provide a Customer_Filter with search and multi-select capabilities
2. WHEN a user types in the Customer_Filter, THE Sales_Report SHALL search customer names and codes
3. THE Sales_Report SHALL implement debouncing for customer search with a 300ms delay
4. WHEN customers are selected, THE Sales_Report SHALL display only invoices for those customers
5. THE Sales_Report SHALL display the count of selected customers in the filter UI

### Requirement 4: Sales Person Filtering

**User Story:** As a user, I want to filter sales by sales representative, so that I can track individual sales performance.

#### Acceptance Criteria

1. THE Sales_Report SHALL provide a Sales_Person_Filter with search and multi-select capabilities
2. WHEN a user types in the Sales_Person_Filter, THE Sales_Report SHALL search sales person names
3. THE Sales_Report SHALL implement debouncing for sales person search with a 300ms delay
4. WHEN sales persons are selected, THE Sales_Report SHALL display only invoices assigned to those sales persons
5. THE Sales_Report SHALL display the count of selected sales persons in the filter UI

### Requirement 5: Status Filtering

**User Story:** As a user, I want to filter invoices by their status, so that I can focus on specific invoice states like unpaid or cancelled invoices.

#### Acceptance Criteria

1. THE Sales_Report SHALL provide a Status_Filter with options for Draft, Submitted, Paid, Unpaid, Overdue, and Cancelled
2. THE Status_Filter SHALL support multi-select to allow viewing multiple statuses simultaneously
3. WHEN no status is selected, THE Sales_Report SHALL display invoices of all statuses
4. WHEN statuses are selected, THE Sales_Report SHALL display only invoices matching those statuses
5. THE Sales_Report SHALL calculate payment status based on Outstanding_Amount (Paid when Outstanding_Amount = 0)

### Requirement 6: Correlated Filter Behavior

**User Story:** As a user, I want filters to work together intelligently, so that I can efficiently narrow down data using multiple criteria.

#### Acceptance Criteria

1. WHEN multiple filters are active, THE Sales_Report SHALL apply all filters using AND logic
2. WHEN any filter value changes, THE Sales_Report SHALL reset pagination to page 1
3. THE Sales_Report SHALL preserve all Filter_State values when switching between pages
4. THE Sales_Report SHALL update the URL query parameters to reflect the current Filter_State
5. WHEN the Sales_Report loads with URL query parameters, THE Sales_Report SHALL apply those parameters as the initial Filter_State

### Requirement 7: Excel Export Functionality

**User Story:** As a user, I want to export sales report data to Excel, so that I can perform additional analysis in spreadsheet software.

#### Acceptance Criteria

1. THE Sales_Report SHALL provide an "Export to Excel" button in the report header
2. WHEN the export button is clicked, THE Sales_Report SHALL generate an XLSX file using the XLSX_Library
3. THE Excel_Export SHALL include all filtered data (not just the current page)
4. THE Excel_Export SHALL include columns for invoice number, customer, posting date, grand total, outstanding amount, and status
5. THE Excel_Export SHALL format currency values with Indonesian Rupiah formatting and date values in DD/MM/YYYY format

### Requirement 8: PDF Export Functionality

**User Story:** As a user, I want to export sales report data to PDF, so that I can share formatted reports via email or print them.

#### Acceptance Criteria

1. THE Sales_Report SHALL provide an "Export to PDF" button in the report header
2. WHEN the PDF export button is clicked, THE Sales_Report SHALL generate a PDF document with formatted report data
3. THE PDF_Export SHALL include all filtered data (not just the current page)
4. THE PDF_Export SHALL include a report header with company name, report title, and date range
5. THE PDF_Export SHALL format the data in a table layout with proper column alignment and page breaks

### Requirement 9: Print Layout Enhancement

**User Story:** As a user, I want to print the sales report with a clean, professional layout, so that I can create physical copies for meetings or filing.

#### Acceptance Criteria

1. THE Sales_Report SHALL provide a "Print Report" button that opens a print preview
2. THE Print_Layout SHALL hide filter controls and action buttons
3. THE Print_Layout SHALL include a report header with company name, report title, date range, and print date
4. THE Print_Layout SHALL display all filtered data in a table format optimized for A4 paper
5. THE Print_Layout SHALL include page numbers and total page count in the footer

### Requirement 10: Summary Statistics

**User Story:** As a user, I want to see summary statistics for the filtered data, so that I can quickly understand key metrics without manual calculation.

#### Acceptance Criteria

1. THE Sales_Report SHALL display the total count of invoices in the filtered dataset
2. THE Sales_Report SHALL calculate and display the sum of Grand_Total for all filtered invoices
3. THE Sales_Report SHALL calculate and display the sum of Outstanding_Amount for all filtered invoices
4. THE Sales_Report SHALL calculate and display the average invoice value (total Grand_Total / count)
5. THE Sales_Report SHALL update summary statistics whenever Filter_State changes

### Requirement 11: Report Menu Integration

**User Story:** As a user, I want to access the sales report from the main Reports menu, so that I can easily navigate to it alongside other reports.

#### Acceptance Criteria

1. THE System SHALL add a "Laporan Penjualan" menu item in the Report_Menu
2. THE menu item SHALL be placed in the "Penjualan" (Sales) section of the Report_Menu
3. WHEN the menu item is clicked, THE System SHALL navigate to the Sales_Report page
4. THE menu item SHALL display an appropriate icon indicating it is a sales report
5. THE menu item SHALL be accessible to users with sales report viewing permissions

### Requirement 12: Responsive Design

**User Story:** As a mobile user, I want the sales report to be usable on my phone or tablet, so that I can check sales data while away from my desk.

#### Acceptance Criteria

1. WHEN the viewport width is 768px or less, THE Sales_Report SHALL display filters in a stacked vertical layout
2. WHEN the viewport width is 768px or less, THE Sales_Report SHALL display data in a card layout instead of a table
3. THE Sales_Report SHALL maintain full functionality on mobile devices including filtering and export
4. THE Sales_Report SHALL use touch-friendly button sizes (minimum 44x44 pixels) on mobile devices
5. THE Sales_Report SHALL hide less critical columns on mobile while keeping invoice number, customer, and amount visible

### Requirement 13: Performance Optimization

**User Story:** As a user, I want the sales report to load quickly even with large datasets, so that I can work efficiently without waiting.

#### Acceptance Criteria

1. THE Sales_Report SHALL implement pagination with a page size of 20 items on desktop and 10 items on mobile
2. THE Sales_Report SHALL fetch only the data required for the current page from the backend
3. THE Sales_Report SHALL implement request cancellation for pending API calls when new filter requests are made
4. THE Sales_Report SHALL display a loading indicator during data fetching operations
5. WHEN an API request fails, THE Sales_Report SHALL display an error message and provide a retry action

### Requirement 14: Filter State Persistence

**User Story:** As a user, I want my filter selections to be remembered, so that I don't have to re-enter them when I return to the report.

#### Acceptance Criteria

1. THE Sales_Report SHALL save the current Filter_State to browser localStorage when filters change
2. WHEN the Sales_Report loads, THE Sales_Report SHALL restore Filter_State from localStorage if available
3. THE Sales_Report SHALL provide a "Clear All Filters" button that resets all filters to default values
4. WHEN filters are cleared, THE Sales_Report SHALL remove the saved Filter_State from localStorage
5. THE Sales_Report SHALL preserve Filter_State for up to 7 days before expiring

### Requirement 15: Data Accuracy and Validation

**User Story:** As a user, I want to ensure the report data is accurate and up-to-date, so that I can make reliable business decisions.

#### Acceptance Criteria

1. THE Sales_Report SHALL fetch data only from submitted Sales_Invoice documents (docstatus = 1)
2. THE Sales_Report SHALL display currency values with 2 decimal places precision
3. THE Sales_Report SHALL validate that "from date" is not later than "to date" before fetching data
4. WHEN date validation fails, THE Sales_Report SHALL display an error message and prevent the API call
5. THE Sales_Report SHALL provide a "Refresh" button to manually reload data from the backend
