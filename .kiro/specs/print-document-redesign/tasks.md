# Implementation Plan: Print System Redesign

## Overview

This implementation plan breaks down the print system redesign into actionable tasks. The system will support DUAL PAPER MODE: continuous form (210mm × flexible height) for transaction documents and A4 sheet (210mm × 297mm fixed) for reports.

The implementation follows a bottom-up approach: core components first, then transaction documents, then reports, with testing integrated throughout.

## Tasks

- [x] 1. Set up core print infrastructure and types
  - Create TypeScript type definitions for paper modes, sizes, and orientations
  - Define interfaces for PrintPreviewModalProps, PrintLayoutProps, ReportLayoutProps
  - Create constants for paper dimensions (MM_TO_PX, PAPER_DIMS, margins)
  - Set up utility functions for dimension calculations
  - _Requirements: 1.1, 1.4, 1.5, 2.1, 2.2, 3.1, 3.2_

- [x] 1.1 Write property test for dimension calculations
  - **Property 1: Transaction Document Continuous Form Dimensions**
  - **Property 2: Report Document A4 Fixed Dimensions**
  - **Validates: Requirements 1.4, 2.1, 2.2, 2.5, 2.6, 1.5, 3.1, 3.2, 3.10**

- [x] 2. Create base print CSS and styling
  - [x] 2.1 Create print.css with @page rules for continuous and sheet modes
    - Define @page continuous with size: 210mm auto and tractor margins
    - Define @page sheet with size: A4 portrait and standard margins
    - Add @media print rules for both paper modes
    - _Requirements: 2.3, 2.4, 3.3, 8.1, 8.2, 8.3, 8.4_
  
  - [x] 2.2 Add common print styles for tables, text, and layout
    - Define .print-page, .print-table, .no-print classes
    - Add page-break-inside: avoid for critical sections
    - Set -webkit-print-color-adjust: exact for color preservation
    - Add font-family, font-size, and color rules
    - _Requirements: 8.5, 8.6, 8.7, 8.8, 8.9, 8.10_

- [x] 2.3 Write property test for CSS print rules
  - **Property 10: Print Media Query Application**
  - **Validates: Requirements 8.1-8.10**

- [x] 3. Implement PrintPreviewModal component
  - [x] 3.1 Create PrintPreviewModal component with props interface
    - Accept title, onClose, children, paperMode, and paper settings props
    - Implement modal overlay and container structure
    - Add state management for zoom, paperSize, orientation
    - _Requirements: 1.1, 1.2, 1.3, 6.1_
  
  - [x] 3.2 Add zoom controls (50% - 200%)
    - Implement zoom slider or buttons
    - Calculate and apply zoom transformation to preview
    - Maintain aspect ratio at all zoom levels
    - _Requirements: 6.2, 6.8_
  
  - [x] 3.3 Add paper settings panel (sheet mode only)
    - Create settings panel with paper size dropdown (A4, A5, Letter, Legal, F4)
    - Add orientation toggle (portrait/landscape)
    - Disable settings panel when paperMode is 'continuous'
    - Display current dimensions in millimeters
    - _Requirements: 1.7, 6.3, 6.4, 6.5_
  
  - [x] 3.4 Add Print and Save PDF buttons
    - Implement Print button to trigger window.print()
    - Implement Save as PDF button (browser print dialog with PDF destination)
    - Add loading states for both actions
    - _Requirements: 6.6, 6.7_
  
  - [x] 3.5 Add paper mode indicator and dimension display
    - Display paper mode badge ('continuous' or 'sheet')
    - Show current dimensions (width × height in mm)
    - Center document in viewport
    - _Requirements: 1.8, 6.5, 6.9_
  
  - [x] 3.6 Add error handling and loading states
    - Handle loading state while rendering document
    - Display error message if rendering fails
    - Prevent actions during loading
    - _Requirements: 6.10_

- [x] 3.7 Write property test for PrintPreviewModal
  - **Property 3: Paper Mode Consistency**
  - **Property 9: Preview and Output Consistency**
  - **Validates: Requirements 1.2, 1.3, 1.6, 8.1, 8.10**

- [x] 4. Checkpoint - Verify core components
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement PrintLayout component for transaction documents
  - [x] 5.1 Create PrintLayout component structure
    - Create component with PrintLayoutProps interface
    - Set up continuous form container with 210mm width
    - Apply tractor hole margins (5mm left/right)
    - _Requirements: 1.2, 2.1, 2.2, 2.3, 2.4_
  
  - [x] 5.2 Implement DocumentHeader sub-component
    - Display company logo (if provided)
    - Display company name
    - Display document title prominently
    - Display status badge (Draft, Submitted, Cancelled)
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [x] 5.3 Implement DocumentMetadata sub-component
    - Display document number with label "No. Dokumen"
    - Display document date with label "Tanggal"
    - Display party information (customer/supplier) with appropriate label
    - Display optional fields (reference doc, sales person, delivery date, etc.)
    - Use Indonesian labels throughout
    - _Requirements: 4.4, 7.2, 7.3, 7.4, 7.5_
  
  - [x] 5.4 Implement ItemTable sub-component
    - Create table with dynamic columns based on props
    - Display row numbers, item details, quantities
    - Support optional pricing columns (hide for Delivery Note)
    - Apply page-break-inside: avoid to table rows
    - _Requirements: 4.5, 9.7_
  
  - [x] 5.5 Implement TotalsSection sub-component
    - Display subtotal, tax, and grand total (right-aligned)
    - Use Indonesian labels ("Subtotal", "Pajak", "Total")
    - Format currency with Indonesian locale (Rp X.XXX.XXX)
    - Display Terbilang (amount in words) below totals
    - Apply page-break-inside: avoid
    - _Requirements: 4.6, 7.8, 7.10_
  
  - [x] 5.6 Implement SignatureSection sub-component
    - Create signature boxes based on signatures prop
    - Support 2-3 signature boxes with labels
    - Apply page-break-inside: avoid
    - _Requirements: 4.8, 8.6_
  
  - [x] 5.7 Implement DocumentFooter sub-component
    - Display print timestamp with Indonesian date format
    - Display system attribution text
    - _Requirements: 4.10_
  
  - [x] 5.8 Add notes section (optional)
    - Display notes with label "Catatan" when provided
    - _Requirements: 4.9, 7.6_

- [x] 5.9 Write property tests for PrintLayout
  - **Property 4: Tractor Hole Margins**
  - **Property 5: No Page Breaks in Transactions**
  - **Property 11: Document Header Completeness**
  - **Property 12: Document Metadata Display**
  - **Property 13: Item Table Structure**
  - **Property 14: Totals Section Presence**
  - **Property 15: Signature Section Page Break Prevention**
  - **Validates: Requirements 2.3, 2.4, 2.8, 2.6, 8.5, 4.1-4.4, 7.2-7.5, 4.5, 9.7, 4.6, 7.8, 8.6**

- [x] 6. Implement transaction document print pages
  - [x] 6.1 Implement Sales Order print page
    - Create print page component using PrintLayout
    - Map Sales Order data to PrintLayoutProps
    - Include delivery date, payment terms, sales person
    - Set paperMode to 'continuous'
    - _Requirements: 1.2, 9.1, 9.2, 9.3_
  
  - [x] 6.2 Implement Delivery Note (Surat Jalan) print page
    - Create print page component using PrintLayout
    - Map Delivery Note data to PrintLayoutProps
    - Include related Sales Order number, driver name, vehicle number
    - Hide pricing columns (showPrice: false)
    - Add warehouse column to item table
    - Provide 3 signature boxes (Sender, Driver, Receiver)
    - _Requirements: 1.2, 9.4, 9.5, 9.6, 9.7, 9.8_
  
  - [x] 6.3 Implement Sales Invoice (Faktur Jual) print page
    - Create print page component using PrintLayout
    - Map Sales Invoice data to PrintLayoutProps
    - Display NPWP for company and customer
    - Display tax breakdown (PPN 11%)
    - Display payment due date
    - Display bank account information in notes
    - _Requirements: 1.2, 9.9, 9.10, 9.11, 9.12_
  
  - [x] 6.4 Implement Purchase Order print page
    - Create print page component using PrintLayout
    - Map Purchase Order data to PrintLayoutProps
    - Include expected delivery date, delivery location/warehouse
    - Display supplier contact information
    - _Requirements: 1.2, 9.13, 9.14, 9.15_
  
  - [x] 6.5 Implement Purchase Receipt print page
    - Create print page component using PrintLayout
    - Map Purchase Receipt data to PrintLayoutProps
    - Display related Purchase Order number
    - Add ordered vs received quantity columns
    - Display quality check notes
    - Provide 3 signature boxes (Receiver, QC, Supervisor)
    - _Requirements: 1.2, 9.16, 9.17, 9.18, 9.19_
  
  - [x] 6.6 Implement Purchase Invoice print page
    - Create print page component using PrintLayout
    - Map Purchase Invoice data to PrintLayoutProps
    - Display supplier invoice number reference
    - Display related Purchase Receipt number
    - Display payment due date
    - _Requirements: 1.2, 9.20, 9.21, 9.22_
  
  - [x] 6.7 Implement Payment Pay print page
    - Create print page component using PrintLayout
    - Map Payment Pay data to PrintLayoutProps
    - Display payment method (Cash, Transfer, Check)
    - Display bank account details
    - Display related invoice/document references
    - Display payment status
    - _Requirements: 1.2, 9.23, 9.24, 9.25, 9.26_
  
  - [x] 6.8 Implement Payment Receive print page
    - Create print page component using PrintLayout
    - Map Payment Receive data to PrintLayoutProps
    - Display payment method, bank account details
    - Display related invoice/document references
    - Display payment status
    - _Requirements: 1.2, 9.23, 9.24, 9.25, 9.26_

- [x] 6.9 Write unit tests for transaction document pages
  - Test data mapping for each document type
  - Test conditional field display
  - Test error handling for missing data
  - _Requirements: 10.1, 10.5, 10.6_

- [x] 7. Checkpoint - Verify transaction documents
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement ReportLayout component for reports
  - [x] 8.1 Create ReportLayout component structure
    - Create component with ReportLayoutProps interface
    - Set up A4 fixed container (210mm × 297mm)
    - Apply standard margins (10mm top/bottom, 12mm left/right)
    - _Requirements: 1.3, 3.1, 3.2, 8.3_
  
  - [x] 8.2 Implement ReportHeader sub-component
    - Display company logo centered (if provided)
    - Display company name centered
    - Display report title prominently
    - Display date range or as-of date
    - Display report generation timestamp
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [x] 8.3 Implement ReportTable sub-component
    - Create table with dynamic columns based on props
    - Support account hierarchy with indentation (0-5 levels)
    - Display section totals in bold font
    - Display grand totals with double underline
    - Apply page-break-inside: avoid to account groups
    - _Requirements: 5.5, 5.6, 5.7, 5.8, 5.10_
  
  - [x] 8.4 Implement ReportFooter sub-component
    - Display page numbers in format "Page X of Y"
    - Display print timestamp with Indonesian date format
    - _Requirements: 5.9_
  
  - [x] 8.5 Add pagination support for multi-page reports
    - Insert page breaks between report pages
    - Calculate page count based on content height
    - Update page numbers dynamically
    - _Requirements: 3.3, 3.4, 3.5_

- [x] 8.6 Write property tests for ReportLayout
  - **Property 6: Report Pagination Support**
  - **Property 16: Report Header Completeness**
  - **Validates: Requirements 3.3, 3.4, 3.5, 5.1-5.4**

- [x] 9. Implement financial report print pages
  - [x] 9.1 Implement Trial Balance report print page
    - Create report page component using ReportLayout
    - Map Trial Balance data to ReportLayoutProps
    - Define columns: Account, Debit, Credit
    - Support account hierarchy with indentation
    - Display section totals and grand totals
    - _Requirements: 1.3, 5.6, 5.7, 5.8_
  
  - [x] 9.2 Implement Balance Sheet (Neraca) report print page
    - Create report page component using ReportLayout
    - Map Balance Sheet data to ReportLayoutProps
    - Define columns: Account, Amount
    - Support account hierarchy for Assets, Liabilities, Equity
    - Display section totals and grand totals
    - _Requirements: 1.3, 5.6, 5.7, 5.8_
  
  - [x] 9.3 Implement Profit & Loss report print page
    - Create report page component using ReportLayout
    - Map P&L data to ReportLayoutProps
    - Define columns: Account, Amount
    - Support account hierarchy for Income and Expenses
    - Display section totals and net profit/loss
    - _Requirements: 1.3, 5.6, 5.7, 5.8_
  
  - [x] 9.4 Implement Cash Flow report print page
    - Create report page component using ReportLayout
    - Map Cash Flow data to ReportLayoutProps
    - Define columns: Activity, Amount
    - Support sections: Operating, Investing, Financing
    - Display section totals and net cash flow
    - _Requirements: 1.3, 5.6, 5.7, 5.8_
  
  - [x] 9.5 Implement General Ledger report print page
    - Create report page component using ReportLayout
    - Map General Ledger data to ReportLayoutProps
    - Define columns: Date, Account, Debit, Credit, Balance
    - Support pagination for long ledgers
    - Display running balance
    - _Requirements: 1.3, 3.3, 3.4, 3.5_

- [x] 9.6 Write unit tests for financial report pages
  - Test data mapping for each report type
  - Test hierarchy rendering
  - Test pagination for long reports
  - _Requirements: 10.2, 10.4_

- [x] 10. Implement system report print pages
  - [x] 10.1 Create generic system report print page template
    - Create reusable template using ReportLayout
    - Support dynamic column definitions
    - Support optional grouping and totals
    - _Requirements: 1.3_
  
  - [x] 10.2 Implement Inventory report print page
    - Use generic template with inventory-specific columns
    - Define columns: Item Code, Item Name, Warehouse, Qty, Value
    - _Requirements: 1.3_
  
  - [x] 10.3 Implement Sales report print page
    - Use generic template with sales-specific columns
    - Define columns: Date, Customer, Document, Amount
    - _Requirements: 1.3_
  
  - [x] 10.4 Implement Purchase report print page
    - Use generic template with purchase-specific columns
    - Define columns: Date, Supplier, Document, Amount
    - _Requirements: 1.3_

- [x] 10.5 Write unit tests for system report pages
  - Test generic template with different column configurations
  - Test grouping and totals
  - _Requirements: 10.2_

- [x] 11. Integrate print functionality into existing pages
  - [x] 11.1 Add print buttons to Sales Order list and detail pages
    - Add "Print" button to Sales Order detail page
    - Open PrintPreviewModal with Sales Order print component
    - Pass paperMode='continuous'
    - _Requirements: 1.2_
  
  - [x] 11.2 Add print buttons to Delivery Note pages
    - Add "Print" button to Delivery Note detail page
    - Open PrintPreviewModal with Delivery Note print component
    - _Requirements: 1.2_
  
  - [x] 11.3 Add print buttons to Sales Invoice pages
    - Add "Print" button to Sales Invoice detail page
    - Open PrintPreviewModal with Sales Invoice print component
    - _Requirements: 1.2_
  
  - [x] 11.4 Add print buttons to Purchase Order pages
    - Add "Print" button to Purchase Order detail page
    - Open PrintPreviewModal with Purchase Order print component
    - _Requirements: 1.2_
  
  - [x] 11.5 Add print buttons to Purchase Receipt pages
    - Add "Print" button to Purchase Receipt detail page
    - Open PrintPreviewModal with Purchase Receipt print component
    - _Requirements: 1.2_
  
  - [x] 11.6 Add print buttons to Purchase Invoice pages
    - Add "Print" button to Purchase Invoice detail page
    - Open PrintPreviewModal with Purchase Invoice print component
    - _Requirements: 1.2_
  
  - [x] 11.7 Add print buttons to Payment pages
    - Add "Print" button to Payment Pay and Payment Receive detail pages
    - Open PrintPreviewModal with Payment print component
    - _Requirements: 1.2_
  
  - [x] 11.8 Add print buttons to financial report pages
    - Add "Print" button to Trial Balance, Balance Sheet, P&L, Cash Flow pages
    - Open PrintPreviewModal with appropriate report component
    - Pass paperMode='sheet'
    - _Requirements: 1.3_
  
  - [x] 11.9 Add print buttons to system report pages
    - Add "Print" button to Inventory, Sales, Purchase report pages
    - Open PrintPreviewModal with appropriate report component
    - _Requirements: 1.3_

- [x] 12. Checkpoint - Verify integration
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Add Indonesian localization utilities
  - [x] 13.1 Create currency formatting utility
    - Implement formatCurrency function with Indonesian locale
    - Format: "Rp X.XXX.XXX" with thousand separators
    - _Requirements: 7.10, 8.1_
  
  - [x] 13.2 Create date formatting utility
    - Implement formatDate function with Indonesian locale
    - Format: "31 Desember 2024"
    - _Requirements: 7.9_
  
  - [x] 13.3 Create Terbilang (number to words) utility
    - Implement numberToWords function for Indonesian
    - Convert numeric amount to Indonesian words
    - _Requirements: 7.7_
  
  - [x] 13.4 Create label translation constants
    - Define all Indonesian labels in constants file
    - Include: "No. Dokumen", "Tanggal", "Pelanggan", "Pemasok", etc.
    - _Requirements: 7.1-7.8_

- [x] 13.5 Write property test for Indonesian localization
  - **Property 7: Indonesian Localization**
  - **Property 8: Currency Formatting Consistency**
  - **Validates: Requirements 7.1-7.10**

- [x] 14. Testing and validation
  - [x] 14.1 Run all property-based tests
    - Execute all 17 property tests with 100+ iterations each
    - Verify all properties pass
    - _Requirements: 10.14_
  
  - [x] 14.2 Test continuous form documents on physical dot matrix printer
    - Print each transaction document type
    - Verify 210mm width with ruler
    - Verify tractor hole margins (5mm each side)
    - Verify no page breaks within documents
    - _Requirements: 10.7, 10.12, 2.9, 2.10_
  
  - [x] 14.3 Test A4 sheet documents on physical laser/inkjet printer
    - Print each report document type
    - Verify 210mm × 297mm dimensions with ruler
    - Verify pagination works correctly
    - _Requirements: 10.8, 10.13, 3.8_
  
  - [x] 14.4 Test Save as PDF functionality
    - Save each document type as PDF
    - Verify PDF dimensions match expected values
    - Verify PDF content matches preview
    - _Requirements: 10.8_
  
  - [x] 14.5 Test with edge cases
    - Test documents with 50+ line items
    - Test documents with long item names
    - Test documents with missing optional fields
    - Verify layout doesn't break
    - _Requirements: 10.9, 10.10, 10.6_
  
  - [x] 14.6 Cross-browser testing
    - Test on Chrome, Firefox, Safari, Edge
    - Verify consistent appearance across browsers
    - Verify print functionality works on all browsers
    - _Requirements: 10.11_

- [x] 15. Final checkpoint and documentation
  - [x] 15.1 Verify all requirements are met
    - Review all 10 requirements and acceptance criteria
    - Confirm all criteria are satisfied
    - _Requirements: All_
  
  - [x] 15.2 Update component documentation
    - Add JSDoc comments to all components
    - Document props interfaces
    - Add usage examples
  
  - [x] 15.3 Create user guide for print functionality
    - Document how to print transaction documents
    - Document how to print reports
    - Document paper settings and options
    - Include troubleshooting tips

- [x] 16. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Physical printer testing is critical to verify actual print output
- Cross-browser testing ensures compatibility across different environments
- The implementation follows a bottom-up approach: core components → transaction documents → reports → integration
