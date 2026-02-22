# Requirements Document

## Introduction

The Payment Reports feature provides comprehensive reporting capabilities for tracking accounts receivable (piutang) and accounts payable (hutang) payments. This feature enables users to monitor payment status, analyze payment patterns, and generate detailed reports with flexible filtering options. Reports can be exported to Excel or PDF formats and printed for offline use.

## Glossary

- **Payment_Report_System**: The system component responsible for generating and displaying payment reports
- **Accounts_Receivable**: Money owed to the business by customers (piutang usaha)
- **Accounts_Payable**: Money owed by the business to suppliers (hutang usaha)
- **Payment_Entry**: ERPNext document that records payment transactions
- **Outstanding_Amount**: The unpaid balance remaining on an invoice
- **Payment_Status**: The current state of payment (Paid, Partially Paid, Unpaid, Overdue)
- **Sales_Person**: The employee responsible for a sales transaction
- **Filter_Component**: UI component that allows users to filter report data
- **Export_Service**: Service that converts report data to Excel or PDF format
- **Print_Service**: Service that formats report data for printing
- **ERPNext_API**: Backend REST API that provides payment and invoice data
- **Date_Range**: A period defined by start and end dates for filtering data
- **Customer**: A business entity that purchases goods or services (for receivables)
- **Supplier**: A business entity that provides goods or services (for payables)

## Requirements

### Requirement 1: Accounts Receivable Payment Report

**User Story:** As a finance manager, I want to view accounts receivable payment reports, so that I can track customer payments and outstanding balances.

#### Acceptance Criteria

1. THE Payment_Report_System SHALL display a list of all receivable payment entries with customer name, invoice reference, payment date, amount, and outstanding balance
2. WHEN a user accesses the receivable report, THE Payment_Report_System SHALL retrieve data from the ERPNext_API within 3 seconds
3. THE Payment_Report_System SHALL calculate and display the total paid amount and total outstanding amount for the filtered results
4. WHEN no payment entries match the filter criteria, THE Payment_Report_System SHALL display an empty state message
5. THE Payment_Report_System SHALL display payment entries in descending order by payment date by default

### Requirement 2: Accounts Payable Payment Report

**User Story:** As a finance manager, I want to view accounts payable payment reports, so that I can track supplier payments and outstanding obligations.

#### Acceptance Criteria

1. THE Payment_Report_System SHALL display a list of all payable payment entries with supplier name, invoice reference, payment date, amount, and outstanding balance
2. WHEN a user accesses the payable report, THE Payment_Report_System SHALL retrieve data from the ERPNext_API within 3 seconds
3. THE Payment_Report_System SHALL calculate and display the total paid amount and total outstanding amount for the filtered results
4. WHEN no payment entries match the filter criteria, THE Payment_Report_System SHALL display an empty state message
5. THE Payment_Report_System SHALL display payment entries in descending order by payment date by default

### Requirement 3: Date Range Filtering

**User Story:** As a finance user, I want to filter payment reports by date range, so that I can analyze payments for specific periods.

#### Acceptance Criteria

1. THE Filter_Component SHALL provide start date and end date input fields using BrowserStyleDatePicker
2. WHEN a user selects a date range, THE Payment_Report_System SHALL display only payment entries within that Date_Range
3. WHEN a user clears the date filter, THE Payment_Report_System SHALL display all payment entries
4. THE Filter_Component SHALL validate that the start date is not after the end date
5. IF the start date is after the end date, THEN THE Filter_Component SHALL display a validation error message

### Requirement 4: Customer and Supplier Filtering

**User Story:** As a finance user, I want to filter payment reports by customer or supplier, so that I can analyze payments for specific business partners.

#### Acceptance Criteria

1. WHERE the report is for Accounts_Receivable, THE Filter_Component SHALL provide a customer selection dropdown
2. WHERE the report is for Accounts_Payable, THE Filter_Component SHALL provide a supplier selection dropdown
3. WHEN a user selects a customer or supplier, THE Payment_Report_System SHALL display only payment entries for that entity
4. THE Filter_Component SHALL support searching for customers or suppliers by name
5. WHEN a user clears the customer or supplier filter, THE Payment_Report_System SHALL display all payment entries

### Requirement 5: Sales Person Filtering for Receivables

**User Story:** As a sales manager, I want to filter receivable payment reports by sales person, so that I can track payments for specific sales team members.

#### Acceptance Criteria

1. WHERE the report is for Accounts_Receivable, THE Filter_Component SHALL provide a sales person selection dropdown
2. WHEN a user selects a sales person, THE Payment_Report_System SHALL display only payment entries associated with that Sales_Person
3. THE Filter_Component SHALL retrieve the list of active sales persons from the ERPNext_API
4. WHEN a user clears the sales person filter, THE Payment_Report_System SHALL display all payment entries
5. THE Payment_Report_System SHALL display the sales person name in each receivable payment entry row

### Requirement 6: Payment Status Filtering

**User Story:** As a finance user, I want to filter payment reports by payment status, so that I can focus on specific payment conditions.

#### Acceptance Criteria

1. THE Filter_Component SHALL provide a payment status selection dropdown with options: All, Paid, Partially Paid, Unpaid, Overdue
2. WHEN a user selects a payment status, THE Payment_Report_System SHALL display only payment entries matching that Payment_Status
3. THE Payment_Report_System SHALL determine overdue status by comparing the due date with the current date
4. WHEN a user selects "All", THE Payment_Report_System SHALL display payment entries regardless of status
5. THE Payment_Report_System SHALL display a visual indicator for each payment status (color coding or icon)

### Requirement 7: Multiple Filter Correlation

**User Story:** As a finance user, I want to apply multiple filters simultaneously, so that I can perform detailed payment analysis.

#### Acceptance Criteria

1. THE Payment_Report_System SHALL apply all active filters using AND logic
2. WHEN multiple filters are active, THE Payment_Report_System SHALL display only payment entries that match all filter criteria
3. THE Filter_Component SHALL display the count of active filters
4. THE Filter_Component SHALL provide a "Clear All Filters" button
5. WHEN a user clicks "Clear All Filters", THE Payment_Report_System SHALL remove all active filters and display all payment entries

### Requirement 8: Excel Export

**User Story:** As a finance user, I want to export payment reports to Excel, so that I can perform additional analysis or share data with stakeholders.

#### Acceptance Criteria

1. THE Payment_Report_System SHALL provide an "Export to Excel" button
2. WHEN a user clicks "Export to Excel", THE Export_Service SHALL generate an Excel file containing all filtered payment entries
3. THE Export_Service SHALL include column headers in Indonesian language
4. THE Export_Service SHALL format currency values with Indonesian Rupiah formatting
5. THE Export_Service SHALL format dates in DD/MM/YYYY format
6. THE Export_Service SHALL include summary totals at the bottom of the Excel file
7. WHEN the export is complete, THE Payment_Report_System SHALL trigger a file download with filename format "Laporan_Pembayaran_[Type]_[Date].xlsx"

### Requirement 9: PDF Export

**User Story:** As a finance user, I want to export payment reports to PDF, so that I can create formal documents for management review.

#### Acceptance Criteria

1. THE Payment_Report_System SHALL provide an "Export to PDF" button
2. WHEN a user clicks "Export to PDF", THE Export_Service SHALL generate a PDF file containing all filtered payment entries
3. THE Export_Service SHALL include a report header with company name, report title, and generation date
4. THE Export_Service SHALL format the PDF with proper page breaks and pagination
5. THE Export_Service SHALL include summary totals on the PDF
6. WHEN the export is complete, THE Payment_Report_System SHALL trigger a file download with filename format "Laporan_Pembayaran_[Type]_[Date].pdf"

### Requirement 10: Print Functionality

**User Story:** As a finance user, I want to print payment reports, so that I can create physical copies for filing or distribution.

#### Acceptance Criteria

1. THE Payment_Report_System SHALL provide a "Print" button
2. WHEN a user clicks "Print", THE Print_Service SHALL open the browser print dialog
3. THE Print_Service SHALL format the report with print-optimized styling
4. THE Print_Service SHALL include a report header with company name, report title, and generation date
5. THE Print_Service SHALL hide UI elements that are not relevant for printing (buttons, filters)
6. THE Print_Service SHALL ensure proper page breaks for multi-page reports

### Requirement 11: Report Menu Integration

**User Story:** As a system user, I want to access payment reports from the Reports menu, so that I can easily navigate to payment reporting features.

#### Acceptance Criteria

1. THE Payment_Report_System SHALL add "Laporan Pembayaran Piutang" menu item under the Reports section
2. THE Payment_Report_System SHALL add "Laporan Pembayaran Hutang" menu item under the Reports section
3. WHEN a user clicks "Laporan Pembayaran Piutang", THE Payment_Report_System SHALL navigate to the receivables report page
4. WHEN a user clicks "Laporan Pembayaran Hutang", THE Payment_Report_System SHALL navigate to the payables report page
5. THE Payment_Report_System SHALL display menu items in Indonesian language

### Requirement 12: Responsive Design

**User Story:** As a mobile user, I want payment reports to be responsive, so that I can view reports on different devices.

#### Acceptance Criteria

1. THE Payment_Report_System SHALL display reports in a responsive layout that adapts to screen size
2. WHEN viewed on mobile devices, THE Filter_Component SHALL stack filters vertically
3. WHEN viewed on mobile devices, THE Payment_Report_System SHALL display payment entries in a card layout instead of table layout
4. THE Payment_Report_System SHALL ensure all interactive elements are touch-friendly on mobile devices
5. THE Payment_Report_System SHALL maintain readability of currency values and dates on small screens

### Requirement 13: Loading and Error States

**User Story:** As a system user, I want clear feedback during data loading and errors, so that I understand the system status.

#### Acceptance Criteria

1. WHILE data is being fetched from the ERPNext_API, THE Payment_Report_System SHALL display a loading indicator
2. IF the ERPNext_API returns an error, THEN THE Payment_Report_System SHALL display a user-friendly error message in Indonesian
3. WHEN an export operation fails, THE Payment_Report_System SHALL display an error notification with the failure reason
4. THE Payment_Report_System SHALL provide a retry button when data fetching fails
5. WHEN a user clicks retry, THE Payment_Report_System SHALL attempt to fetch the data again

### Requirement 14: Performance Optimization

**User Story:** As a system user, I want payment reports to load quickly, so that I can work efficiently.

#### Acceptance Criteria

1. THE Payment_Report_System SHALL implement pagination for reports with more than 100 entries
2. THE Payment_Report_System SHALL cache filter options (customers, suppliers, sales persons) for 5 minutes
3. WHEN filters are changed, THE Payment_Report_System SHALL debounce API calls by 500 milliseconds
4. THE Payment_Report_System SHALL display the first page of results within 2 seconds of applying filters
5. THE Payment_Report_System SHALL load additional pages on demand when the user scrolls or clicks pagination controls

### Requirement 15: Data Accuracy and Consistency

**User Story:** As a finance manager, I want payment report data to be accurate and consistent with ERPNext, so that I can trust the reports for decision making.

#### Acceptance Criteria

1. THE Payment_Report_System SHALL retrieve payment data directly from the ERPNext_API without local caching of payment amounts
2. THE Payment_Report_System SHALL calculate outstanding amounts using the formula: Invoice_Amount minus Total_Paid_Amount
3. THE Payment_Report_System SHALL display currency values with 2 decimal places precision
4. WHEN payment data is updated in ERPNext, THE Payment_Report_System SHALL reflect the changes when the report is refreshed
5. THE Payment_Report_System SHALL validate that all displayed totals match the sum of individual entries
