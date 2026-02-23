# Implementation Plan: Stock Card Report (Laporan Kartu Stok)

## Overview

This implementation plan breaks down the Stock Card Report feature into discrete, sequential tasks. The feature provides detailed stock movement history with correlated filtering, export capabilities (Excel/PDF), and print functionality. All tasks build incrementally, with each step validating functionality through code.

## Tasks

- [x] 1. Create type definitions and data models
  - Create `types/stock-card.ts` with all TypeScript interfaces
  - Define `StockLedgerEntry`, `StockCardFilters`, `StockCardAPIResponse`, `SummaryData`, `PaginationState`, and `DropdownOption` types
  - Include proper JSDoc comments for all interfaces
  - _Requirements: 1.1, 1.2, 2.1-2.6, 3.1-3.6_

- [ ] 2. Implement API route for stock ledger data
  - [x] 2.1 Create API route at `app/api/inventory/reports/stock-card/route.ts`
    - Implement GET handler with query parameter validation
    - Build ERPNext API filters from query parameters
    - Fetch Stock Ledger Entries from ERPNext
    - Handle authentication using existing auth utilities
    - _Requirements: 8.1, 8.2, 8.5_
  
  - [x] 2.2 Add data enrichment logic
    - Fetch and attach item names from Item doctype
    - Fetch and attach customer names for sales transactions
    - Fetch and attach supplier names for purchase transactions
    - Handle source/destination warehouse for transfers
    - _Requirements: 9.1-9.6_
  
  - [x] 2.3 Implement summary calculations
    - Calculate opening balance from transactions before date range
    - Calculate total incoming quantity (sum of positive actual_qty)
    - Calculate total outgoing quantity (sum of negative actual_qty)
    - Calculate closing balance
    - Count total transactions
    - _Requirements: 1.5, 1.6_
  
  - [x] 2.4 Add pagination logic
    - Implement page and limit parameters
    - Calculate total pages
    - Return pagination metadata
    - _Requirements: 11.1_
  
  - [x] 2.5 Implement error handling
    - Validate required parameters (company, item_code)
    - Handle ERPNext API errors with Indonesian messages
    - Return appropriate HTTP status codes
    - Log errors for debugging
    - _Requirements: 8.3, 12.3, 12.6_

- [~] 2.6 Write property test for API route
  - **Property 20: API Filter Parameter Transmission**
  - **Validates: Requirements 8.2**

- [x] 3. Create utility functions
  - Create `lib/stock-card-utils.ts` with helper functions
  - Implement `calculateRunningBalance()` function
  - Implement `formatStockCardDate()` for date/time display
  - Implement `classifyTransactionDirection()` for in/out classification
  - Implement `getPartyInfo()` to extract party information
  - Implement `validateDateRange()` for date validation
  - _Requirements: 1.3, 1.4, 12.2_

- [x] 3.1 Write property test for running balance calculation
  - **Property 3: Running Balance Calculation Accuracy**
  - **Validates: Requirements 1.3, 1.6**

- [x] 3.2 Write property test for transaction direction classification
  - **Property 4: Transaction Direction Classification**
  - **Validates: Requirements 1.4**

- [ ] 4. Implement filter component
  - [x] 4.1 Create `components/stock-card/StockCardFilters.tsx`
    - Build filter form with date range, item, warehouse, customer, supplier, transaction type inputs
    - Use existing date picker components from the project
    - Implement dropdown components with search functionality
    - Add "Clear Filters" and "Refresh" buttons
    - _Requirements: 3.1-3.6_
  
  - [x] 4.2 Add filter state management
    - Implement controlled inputs with onChange handlers
    - Debounce filter changes by 300ms before triggering API calls
    - Persist filter state to sessionStorage
    - Restore filters from sessionStorage on component mount
    - _Requirements: 3.8, 3.9, 11.3_
  
  - [x] 4.3 Implement filter validation
    - Validate date range (end date after start date)
    - Display validation error messages in Indonesian
    - Prevent API calls with invalid filters
    - _Requirements: 12.2, 12.6_
  
  - [x] 4.4 Add responsive styling
    - Stack filters vertically on mobile devices
    - Use Tailwind CSS responsive classes
    - Ensure proper spacing and alignment
    - _Requirements: 10.4_

- [~] 4.5 Write property test for filter persistence
  - **Property 10: Filter State Persistence**
  - **Validates: Requirements 3.9**

- [~] 4.6 Write property test for multiple filter AND logic
  - **Property 8: Multiple Filter AND Logic**
  - **Validates: Requirements 3.7**

- [~] 4.7 Write property test for debouncing
  - **Property 25: API Request Debouncing**
  - **Validates: Requirements 11.3**

- [~] 5. Checkpoint - Ensure filters and API integration work
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement data table component
  - [x] 6.1 Create `components/stock-card/StockCardTable.tsx`
    - Build table with columns: Date, Transaction Type, Reference, In, Out, Balance, Warehouse, Party, Source/Destination
    - Display transaction data with proper formatting
    - Make reference numbers clickable links to source documents
    - Apply color coding (green for incoming, red for outgoing)
    - _Requirements: 1.1, 1.2, 2.6_
  
  - [x] 6.2 Add pagination controls
    - Display current page, total pages, and total records
    - Add Previous/Next buttons
    - Add page size selector (20, 50, 100 items per page)
    - Disable controls appropriately when at boundaries
    - _Requirements: 11.1_
  
  - [~] 6.3 Implement loading and empty states
    - Display loading skeleton while fetching data
    - Show "Tidak ada data untuk filter yang dipilih" when no results
    - Show "Pilih item untuk melihat laporan" when no item selected
    - _Requirements: 8.4, 12.1, 12.4_
  
  - [~] 6.4 Add responsive table design
    - Make table horizontally scrollable on mobile
    - Adjust column widths for different screen sizes
    - Use responsive typography
    - _Requirements: 10.1-10.3, 10.5, 10.6_

- [~] 6.5 Write property test for chronological ordering
  - **Property 1: Chronological Transaction Ordering**
  - **Validates: Requirements 1.1**

- [~] 6.6 Write property test for complete field display
  - **Property 2: Complete Transaction Field Display**
  - **Validates: Requirements 1.2**

- [~] 6.7 Write unit tests for table component
  - Test empty state display
  - Test loading state display
  - Test data rendering with mock data
  - Test pagination controls

- [x] 7. Implement summary statistics component
  - Create `components/stock-card/StockCardSummary.tsx`
  - Display summary cards: Opening Balance, Total In, Total Out, Closing Balance, Transaction Count
  - Format numbers with proper thousand separators
  - Include unit of measurement (UOM) in displays
  - Use Tailwind CSS for card styling with Indigo color scheme
  - _Requirements: 1.5, 1.6_

- [x] 7.1 Write property test for opening balance consistency
  - **Property 5: Opening Balance Temporal Consistency**
  - **Validates: Requirements 1.5**

- [x] 7.2 Write unit tests for summary component
  - Test summary calculations with sample data
  - Test display formatting
  - Test responsive layout

- [ ] 8. Implement export functionality
  - [~] 8.1 Create `components/stock-card/StockCardExport.tsx`
    - Add "Export to Excel", "Export to PDF", and "Print" buttons
    - Implement button styling with loading states
    - Disable buttons when no data available
    - _Requirements: 4.1, 5.1, 6.1_
  
  - [~] 8.2 Implement Excel export
    - Use `xlsx` library to generate Excel file
    - Include header section with filter parameters
    - Add summary section at top
    - Create detailed transaction table with all columns
    - Format columns with proper widths
    - Generate filename: `Laporan_Kartu_Stok_[ItemCode]_[Date].xlsx`
    - Trigger browser download
    - _Requirements: 4.2-4.7_
  
  - [~] 8.3 Implement PDF export
    - Use browser print API with CSS media queries
    - Open print dialog with PDF save option
    - Include company logo and report header
    - Format for A4 paper with proper page breaks
    - Add page numbers in footer
    - Generate filename suggestion: `Laporan_Kartu_Stok_[ItemCode]_[Date].pdf`
    - _Requirements: 5.2-5.8_
  
  - [~] 8.4 Implement print functionality
    - Create print-optimized view
    - Hide UI controls (buttons, filters) in print view
    - Include report title, filter parameters, and generation date in header
    - Apply print-specific CSS for optimal layout
    - Maintain table formatting and readability
    - _Requirements: 6.2-6.7_
  
  - [~] 8.5 Add export error handling
    - Handle Excel generation failures with retry option
    - Handle PDF generation failures with retry option
    - Display error messages in Indonesian
    - Show notification when browser blocks download
    - _Requirements: 12.5_

- [~] 8.6 Write property test for Excel export completeness
  - **Property 11: Excel Export Data Completeness**
  - **Validates: Requirements 4.2, 4.3, 4.4**

- [~] 8.7 Write property test for Excel file structure
  - **Property 12: Excel File Structure**
  - **Validates: Requirements 4.5**

- [~] 8.8 Write property test for Excel filename pattern
  - **Property 13: Excel Filename Pattern**
  - **Validates: Requirements 4.6**

- [~] 8.9 Write property test for PDF export completeness
  - **Property 14: PDF Export Data Completeness**
  - **Validates: Requirements 5.2, 5.6**

- [~] 8.10 Write unit tests for export component
  - Test button states (enabled/disabled)
  - Test export function calls
  - Test error handling

- [ ] 9. Create main report page
  - [~] 9.1 Create `app/reports/stock-card/page.tsx`
    - Set up page component with state management
    - Integrate StockCardFilters component
    - Integrate StockCardTable component
    - Integrate StockCardSummary component
    - Integrate StockCardExport component
    - _Requirements: 1.1-1.6_
  
  - [~] 9.2 Implement data fetching logic
    - Fetch data from API route on filter changes
    - Implement debounced API calls (300ms)
    - Handle loading states with progress indicator
    - Handle error states with error messages
    - Cache dropdown options in sessionStorage
    - _Requirements: 8.1-8.6, 11.3, 11.4, 11.5_
  
  - [~] 9.3 Add page layout and styling
    - Use consistent layout with other reports in the project
    - Add page title "Laporan Kartu Stok"
    - Implement responsive design for all screen sizes
    - Use Tailwind CSS with project color scheme
    - _Requirements: 10.1-10.6_

- [~] 9.4 Write property test for filter change triggering update
  - **Property 9: Filter Change Triggers Data Update**
  - **Validates: Requirements 3.8**

- [~] 9.5 Write property test for pagination activation
  - **Property 24: Pagination Activation Threshold**
  - **Validates: Requirements 11.1**

- [~] 9.6 Write property test for progress indicator timing
  - **Property 27: Progress Indicator Timing**
  - **Validates: Requirements 11.5**

- [~] 9.7 Write property test for dropdown caching
  - **Property 26: Dropdown Options Caching**
  - **Validates: Requirements 11.4**

- [~] 9.8 Write unit tests for main page
  - Test component integration
  - Test error message display
  - Test loading state display
  - Test data flow between components

- [~] 10. Create print-optimized page
  - Create `app/reports/stock-card/print/page.tsx`
  - Implement print-specific layout without navigation and controls
  - Include report header with company logo and title
  - Display filter parameters and generation date
  - Apply print-specific CSS for A4 paper
  - Add page breaks for long reports
  - _Requirements: 6.2-6.7_

- [~] 10.1 Write property test for print UI element exclusion
  - **Property 19: Print UI Element Exclusion**
  - **Validates: Requirements 6.6**

- [~] 10.2 Write property test for print header content
  - **Property 18: Print Header Content**
  - **Validates: Requirements 6.4**

- [~] 10.3 Write property test for print page breaks
  - **Property 17: Print Page Break Insertion**
  - **Validates: Requirements 6.3**

- [~] 11. Checkpoint - Ensure all components work together
  - Ensure all tests pass, ask the user if questions arise.

- [~] 12. Integrate with report menu
  - Update navigation component to include "Laporan Kartu Stok" menu item
  - Add menu item under "Laporan" section alongside other inventory reports
  - Ensure menu item navigates to `/reports/stock-card`
  - Test navigation from main menu
  - _Requirements: 7.1-7.4_

- [~] 12.1 Write unit tests for menu integration
  - Test menu item presence
  - Test navigation link
  - Test menu item accessibility

- [ ] 13. Add comprehensive error handling
  - [~] 13.1 Implement client-side validation
    - Validate item selection before showing report
    - Validate date range format and logic
    - Display validation messages in Indonesian
    - _Requirements: 12.1, 12.2, 12.6_
  
  - [~] 13.2 Implement API error handling
    - Handle network failures with retry option
    - Handle timeout errors
    - Handle authentication errors (redirect to login)
    - Handle authorization errors
    - Handle 404 not found errors
    - Handle 500 server errors
    - Display all error messages in Indonesian
    - _Requirements: 8.3, 12.3_
  
  - [~] 13.3 Add graceful degradation
    - Display item codes if item names unavailable
    - Display "N/A" for missing party information
    - Display table without summary if calculation fails
    - _Requirements: 9.6_

- [~] 13.4 Write property test for date range validation
  - **Property 28: Date Range Validation**
  - **Validates: Requirements 12.2**

- [~] 13.5 Write property test for input validation before API call
  - **Property 29: Input Validation Before API Call**
  - **Validates: Requirements 12.6**

- [~] 13.6 Write unit tests for error handling
  - Test validation error display
  - Test API error display
  - Test retry functionality
  - Test graceful degradation

- [ ] 14. Add remaining property tests
  - [~] 14.1 Write property test for all transaction types included
    - **Property 6: All Transaction Types Included**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
  
  - [~] 14.2 Write property test for voucher reference presence
    - **Property 7: Voucher Reference Presence**
    - **Validates: Requirements 2.6**
  
  - [~] 14.3 Write property test for contextual warehouse display
    - **Property 21: Contextual Warehouse Display**
    - **Validates: Requirements 9.1, 9.2, 9.5**
  
  - [~] 14.4 Write property test for party information display
    - **Property 22: Party Information Display**
    - **Validates: Requirements 9.3, 9.4**
  
  - [~] 14.5 Write property test for missing data placeholder
    - **Property 23: Missing Data Placeholder**
    - **Validates: Requirements 9.6**
  
  - [~] 14.6 Write property test for PDF document structure
    - **Property 15: PDF Document Structure**
    - **Validates: Requirements 5.3, 5.4, 5.5**
  
  - [~] 14.7 Write property test for PDF filename pattern
    - **Property 16: PDF Filename Pattern**
    - **Validates: Requirements 5.7**

- [ ] 15. Final integration and testing
  - [~] 15.1 Test complete user workflow
    - Test selecting item and viewing report
    - Test applying multiple filters
    - Test pagination with large datasets
    - Test export to Excel
    - Test export to PDF
    - Test print functionality
    - Test responsive design on different screen sizes
    - _Requirements: All_
  
  - [~] 15.2 Verify performance requirements
    - Test initial load time (should be under 2 seconds for 1000 records)
    - Test filter debouncing (300ms delay)
    - Test pagination performance
    - Test dropdown caching
    - _Requirements: 11.1-11.5_
  
  - [~] 15.3 Verify Indonesian language
    - Check all UI labels are in Indonesian
    - Check all error messages are in Indonesian
    - Check all validation messages are in Indonesian
    - _Requirements: All_

- [~] 16. Final checkpoint - Complete feature verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional property-based and unit tests that can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation throughout implementation
- Property tests validate universal correctness properties using fast-check library
- Unit tests validate specific examples, edge cases, and error conditions
- All UI text and error messages must be in Bahasa Indonesia
- Follow existing project patterns for API routes, components, and styling
- Use TypeScript for all code with proper type definitions
- Use Tailwind CSS 4 for styling with the project's Indigo color scheme
- Integrate with ERPNext API using existing authentication utilities
