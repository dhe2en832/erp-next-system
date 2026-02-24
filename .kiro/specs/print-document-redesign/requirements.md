# Requirements Document: Print System Redesign

## Introduction

This document specifies the requirements for redesigning all print documents in the ERP system. The current print implementation has critical issues with dimensions, paper type assumptions, and layout consistency.

### Current Issues
1. **Incorrect dimensions**: Transaction documents use 215mm x 145mm instead of proper continuous form dimensions
2. **Wrong paper type assumption**: System treats all documents as fixed-size A4 sheets
3. **Transaction documents need continuous form**: SO, SJ, FJ, PO, PR, PI should use continuous form for multi-copy NCR printing
4. **Inconsistent layouts**: Lack of standardized structure across document types
5. **Preview/output mismatch**: Print preview doesn't accurately represent printed output

### Solution Overview
This redesign will implement **TWO distinct print modes**:

| Document Category | Paper Type | Dimensions | Target Printer |
|------------------|------------|------------|----------------|
| **Transaction Documents** | Continuous Form | 210mm width × Flexible height | Dot Matrix |
| **Report Documents** | A4 Sheet | 210mm × 297mm (fixed) | Laser/Inkjet |

### Scope

**Transaction Documents (Continuous Form)**:
- Sales Order (SO)
- Delivery Note / Surat Jalan (SJ)
- Sales Invoice / Faktur Jual (FJ)
- Purchase Order (PO)
- Purchase Receipt (PR)
- Purchase Invoice (PI)
- Payment Pay / Pembayaran Keluar
- Payment Receive / Pembayaran Masuk

**Report Documents (A4 Fixed)**:
- Financial Reports: Trial Balance, Balance Sheet, Profit & Loss, Cash Flow, General Ledger
- System Reports: Inventory, Sales, Purchase, HR, and all other printable reports

---

## Glossary

| Term | Definition |
|------|------------|
| **Continuous Form** | Paper with tractor holes on sides, flexible height, used for dot matrix printers |
| **NCR Paper** | No Carbon Required - multi-copy paper that duplicates without carbon sheets |
| **Tractor Holes** | Perforated holes on paper sides for dot matrix printer feeding |
| **Printable Width** | Actual print area after excluding tractor hole margins (210mm) |
| **Paper Mode** | System setting: 'continuous' for transactions, 'sheet' for reports |
| **Transaction Document** | Business transaction record (SO, SJ, FJ, PO, PR, PI, Payment) |
| **Report Document** | Financial or system report with fixed A4 dimensions |

---

## Requirements

### Requirement 1: Dual Paper Mode Support

**User Story**: As a system, I need to support two paper modes, so that transaction documents use continuous form and reports use A4 sheets.

#### Acceptance Criteria
1. THE Print_System SHALL support TWO paper modes: 'continuous' and 'sheet'
2. THE Print_System SHALL default to 'continuous' mode for all Transaction Documents
3. THE Print_System SHALL default to 'sheet' mode for all Report Documents
4. THE Print_System SHALL set continuous mode dimensions to 210mm width × flexible height
5. THE Print_System SHALL set sheet mode dimensions to 210mm × 297mm (A4 fixed)
6. THE Print_System SHALL NOT allow paper mode switching for transaction documents (locked to continuous)
7. THE Print_System SHALL allow paper size selection for report documents (A4, A5, Letter, Legal, F4)
8. THE Print_System SHALL display paper mode indicator in PrintPreviewModal
9. THE Print_System SHALL apply different @page CSS rules based on paper mode
10. THE Print_System SHALL validate paper mode matches document type before rendering

---

### Requirement 2: Continuous Form Dimensions for Transactions

**User Story**: As a business user, I want transaction documents to use proper continuous form dimensions, so that they print correctly on dot matrix printers with NCR paper.

#### Acceptance Criteria
1. THE Print_System SHALL set continuous form width to 210mm (printable area)
2. THE Print_System SHALL set continuous form height to auto/flexible (content-based)
3. THE Print_System SHALL reserve 5mm margin on left side for tractor holes
4. THE Print_System SHALL reserve 5mm margin on right side for tractor holes
5. THE Print_System SHALL NOT impose fixed page height for continuous form documents
6. THE Print_System SHALL NOT insert page breaks within transaction documents
7. THE Print_System SHALL support perforation line indicator at 140mm height (for half-cut option)
8. THE Print_System SHALL ensure total width including tractor holes is 241mm (9.5 inches)
9. THE Print_System SHALL validate continuous form dimensions before printing
10. THE Print_System SHALL warn user if printer doesn't support continuous form

---

### Requirement 3: A4 Fixed Dimensions for Reports

**User Story**: As an accounting user, I want reports to use standard A4 dimensions, so that they can be filed and archived properly.

#### Acceptance Criteria
1. THE Print_System SHALL set report document width to 210mm
2. THE Print_System SHALL set report document height to 297mm (A4 fixed)
3. THE Print_System SHALL support pagination for multi-page reports
4. THE Print_System SHALL insert page breaks between report pages
5. THE Print_System SHALL display page numbers in format "Page X of Y"
6. THE Print_System SHALL support portrait orientation (default) and landscape orientation
7. THE Print_System SHALL apply @page CSS rules with size: A4 portrait
8. THE Print_System SHALL validate report dimensions match physical A4 paper (210mm × 297mm)
9. THE Print_System SHALL support paper size alternatives (A5, Letter, Legal, F4) for reports
10. THE Print_System SHALL maintain aspect ratio 210:297 at all zoom levels

---

### Requirement 4: Transaction Document Layout Standardization

**User Story**: As a business user, I want all transaction documents to have consistent layout structure, so that they look professional and are easy to read.

#### Acceptance Criteria
1. THE PrintLayout SHALL display company logo and name in header section
2. THE PrintLayout SHALL display document title prominently (e.g., "SALES ORDER", "FAKTUR JUAL")
3. THE PrintLayout SHALL display document status badge when applicable (Draft, Submitted, Cancelled)
4. THE PrintLayout SHALL display document metadata in dedicated section (number, date, party)
5. THE PrintLayout SHALL display item table with clear column headers
6. THE PrintLayout SHALL display totals section on right side (subtotal, tax, grand total)
7. THE PrintLayout SHALL display Terbilang (amount in words) below totals
8. THE PrintLayout SHALL display signature section at bottom (minimum 2 signatures)
9. THE PrintLayout SHALL display notes section when available
10. THE PrintLayout SHALL display footer with print timestamp and system attribution

---

### Requirement 5: Report Document Layout Standardization

**User Story**: As an accounting user, I want all reports to have consistent layout structure, so that they look professional and are easy to analyze.

#### Acceptance Criteria
1. THE ReportLayout SHALL display company logo and name centered in header
2. THE ReportLayout SHALL display report title prominently (e.g., "TRIAL BALANCE", "NERACA")
3. THE ReportLayout SHALL display date range or as-of date in header
4. THE ReportLayout SHALL display report generation timestamp in header
5. THE ReportLayout SHALL display report data in structured table format
6. THE ReportLayout SHALL support account hierarchy with indentation (0-5 levels)
7. THE ReportLayout SHALL display section totals in bold font
8. THE ReportLayout SHALL display grand totals with double underline
9. THE ReportLayout SHALL display Report_Footer with page numbers and print timestamp
10. THE ReportLayout SHALL prevent page breaks within account groups when possible

---

### Requirement 6: Print Preview Modal Enhancement

**User Story**: As a business user, I want a unified print preview modal, so that all document types have consistent preview functionality.

#### Acceptance Criteria
1. THE PrintPreviewModal SHALL accept paperMode prop: 'continuous' | 'sheet'
2. THE PrintPreviewModal SHALL display zoom controls (50% - 200%)
3. THE PrintPreviewModal SHALL display paper settings panel (for sheet mode only)
4. THE PrintPreviewModal SHALL disable paper size selection for continuous mode
5. THE PrintPreviewModal SHALL display current dimensions in millimeters
6. THE PrintPreviewModal SHALL provide Print button to trigger browser print dialog
7. THE PrintPreviewModal SHALL provide Save as PDF button
8. THE PrintPreviewModal SHALL maintain aspect ratio at all zoom levels
9. THE PrintPreviewModal SHALL center document in viewport
10. THE PrintPreviewModal SHALL handle loading and error states consistently

---

### Requirement 7: Indonesian Localization

**User Story**: As an Indonesian business user, I want all labels and text in Bahasa Indonesia, so that documents are appropriate for local business use.

#### Acceptance Criteria
1. THE PrintLayout SHALL display all labels in Bahasa Indonesia
2. THE PrintLayout SHALL use "No. Dokumen" for document number
3. THE PrintLayout SHALL use "Tanggal" for date
4. THE PrintLayout SHALL use "Pelanggan" for customer (sales documents)
5. THE PrintLayout SHALL use "Pemasok" or "Supplier" for supplier (purchase documents)
6. THE PrintLayout SHALL use "Catatan" for notes
7. THE PrintLayout SHALL use "Terbilang" for amount in words
8. THE PrintLayout SHALL use "Subtotal", "Pajak", "Total" for amounts section
9. THE PrintLayout SHALL format dates using Indonesian locale (e.g., "31 Desember 2024")
10. THE PrintLayout SHALL format currency with Indonesian locale (e.g., "Rp 1.000.000")

---

### Requirement 8: Print-Friendly CSS Styling

**User Story**: As a business user, I want documents to print correctly on physical printers, so that printed copies match the preview.

#### Acceptance Criteria
1. THE Print_System SHALL apply @media print CSS rules for optimal printing
2. THE Print_System SHALL preserve background colors and images when printing (-webkit-print-color-adjust: exact)
3. THE Print_System SHALL set appropriate margins (10mm top/bottom, 12mm left/right for A4)
4. THE Print_System SHALL set continuous form margins (5mm left/right for tractor holes)
5. THE Print_System SHALL prevent page breaks within item rows
6. THE Print_System SHALL prevent page breaks within signature section
7. THE Print_System SHALL prevent page breaks within totals section
8. THE Print_System SHALL hide UI controls (buttons, navigation) when printing
9. THE Print_System SHALL use web-safe fonts (Arial, Helvetica) for maximum compatibility
10. THE Print_System SHALL ensure all text is black or dark gray for clear printing

---

### Requirement 9: Document-Specific Customizations

**User Story**: As a business user, I want each document type to display relevant information specific to that document, so that all necessary details are included.

#### Acceptance Criteria

**Sales Order**:
1. THE PrintLayout SHALL display delivery date when available
2. THE PrintLayout SHALL display payment terms when available
3. THE PrintLayout SHALL display sales person name when available

**Delivery Note (Surat Jalan)**:
4. THE PrintLayout SHALL display related Sales Order number
5. THE PrintLayout SHALL display driver name and vehicle number
6. THE PrintLayout SHALL NOT display pricing information
7. THE PrintLayout SHALL display warehouse column in item table
8. THE PrintLayout SHALL provide 3 signature boxes (Sender, Driver, Receiver)

**Sales Invoice (Faktur Jual)**:
9. THE PrintLayout SHALL display NPWP for company and customer
10. THE PrintLayout SHALL display tax breakdown (PPN 11%)
11. THE PrintLayout SHALL display payment due date
12. THE PrintLayout SHALL display bank account information in notes

**Purchase Order**:
13. THE PrintLayout SHALL display expected delivery date
14. THE PrintLayout SHALL display delivery location/warehouse
15. THE PrintLayout SHALL display supplier contact information

**Purchase Receipt**:
16. THE PrintLayout SHALL display related Purchase Order number
17. THE PrintLayout SHALL display ordered vs received quantity columns
18. THE PrintLayout SHALL display quality check notes
19. THE PrintLayout SHALL provide 3 signature boxes (Receiver, QC, Supervisor)

**Purchase Invoice**:
20. THE PrintLayout SHALL display supplier invoice number reference
21. THE PrintLayout SHALL display related Purchase Receipt number
22. THE PrintLayout SHALL display payment due date

**Payment Pay/Receive**:
23. THE PrintLayout SHALL display payment method (Cash, Transfer, Check)
24. THE PrintLayout SHALL display bank account details
25. THE PrintLayout SHALL display related invoice/document references
26. THE PrintLayout SHALL display payment status (Paid, Partial, Pending)

---

### Requirement 10: Testing and Validation

**User Story**: As a quality assurance tester, I want to verify that all print documents work correctly, so that users receive reliable printing functionality.

#### Acceptance Criteria
1. FOR each Transaction_Document type, THE Print_System SHALL render print preview without errors
2. FOR each Report_Document type, THE Print_System SHALL render print preview without errors
3. FOR continuous mode documents, THE Print_System SHALL validate width is 210mm
4. FOR sheet mode documents, THE Print_System SHALL validate dimensions are 210mm × 297mm
5. FOR each document type, THE Print_System SHALL display all required fields correctly
6. FOR each document type, THE Print_System SHALL handle missing optional fields gracefully
7. FOR each document type, THE Print_System SHALL print correctly on physical printers
8. FOR each document type, THE Print_System SHALL save correctly as PDF
9. THE Print_System SHALL handle documents with many items (50+ line items) without layout breaking
10. THE Print_System SHALL handle documents with long item names without layout breaking
11. THE Print_System SHALL maintain consistent appearance across different browsers (Chrome, Firefox, Safari, Edge)
12. THE Print_System SHALL verify continuous form output on dot matrix printers
13. THE Print_System SHALL verify A4 output on laser/inkjet printers
14. THE Print_System SHALL pass all 17 correctness properties with 100+ test iterations

---

## Correctness Properties

### Property 1: Transaction Document Continuous Form Dimensions
*For any* transaction document (SO, SJ, FJ, PO, PR, PI, Payment), when rendered in continuous mode, the page width SHALL be exactly 210mm, and the height SHALL be flexible (auto-adjusts to content).

**Validates**: Requirements 1.4, 2.1, 2.2, 2.5, 2.6

### Property 2: Report Document A4 Fixed Dimensions
*For any* report document, when rendered in sheet mode, the page dimensions SHALL be exactly 210mm width × 297mm height, and the aspect ratio SHALL equal 210:297.

**Validates**: Requirements 1.5, 3.1, 3.2, 3.10

### Property 3: Paper Mode Consistency
*For any* document, the paper mode SHALL match the document type (continuous for transactions, sheet for reports), and SHALL NOT be switchable for transaction documents.

**Validates**: Requirements 1.2, 1.3, 1.6

### Property 4: Tractor Hole Margins
*For any* continuous form document, THE Print_System SHALL reserve 5mm margin on left side and 5mm margin on right side for tractor holes.

**Validates**: Requirements 2.3, 2.4, 2.8

### Property 5: No Page Breaks in Transactions
*For any* transaction document, THE Print_System SHALL NOT insert page breaks within the document, and the document SHALL print as single continuous page.

**Validates**: Requirements 2.6, 8.5

### Property 6: Report Pagination Support
*For any* report document with multiple pages, THE Print_System SHALL insert page breaks between pages, and SHALL display page numbers in format "Page X of Y".

**Validates**: Requirements 3.3, 3.4, 3.5

### Property 7: Indonesian Localization
*For any* label or text element in any document, the text SHALL be in Bahasa Indonesia according to specified translations.

**Validates**: Requirements 7.1-7.10

### Property 8: Currency Formatting Consistency
*For any* numeric currency value displayed in any document, the value SHALL be formatted using Indonesian locale (Rp X.XXX.XXX format with thousand separators).

**Validates**: Requirements 7.10

### Property 9: Preview and Output Consistency
*For any* document, the CSS styles, dimensions, fonts, and margins used in print preview SHALL be identical to those used in actual print output.

**Validates**: Requirements 8.1, 8.10

### Property 10: Print Media Query Application
*For any* document, when rendering for print, THE Print_System SHALL apply print-specific CSS media queries that hide UI controls, preserve backgrounds, and set appropriate page margins.

**Validates**: Requirements 8.1-8.10

### Property 11: Document Header Completeness
*For any* transaction document, the rendered output SHALL contain a header section with company logo, company name, document title, and status badge.

**Validates**: Requirements 4.1-4.3

### Property 12: Document Metadata Display
*For any* transaction document, the rendered output SHALL display document number, document date, and party name with clear labels.

**Validates**: Requirements 4.4, 7.2-7.5

### Property 13: Item Table Structure
*For any* transaction document with line items, the item table SHALL include row numbers, item identification, quantity, and appropriate additional columns.

**Validates**: Requirements 4.5, 9.7

### Property 14: Totals Section Presence
*For any* transaction document with pricing, the rendered output SHALL display totals section with subtotal, tax, and grand total.

**Validates**: Requirements 4.6, 7.8

### Property 15: Signature Section Page Break Prevention
*For any* document with signatures, the signature section SHALL not be split across page boundaries.

**Validates**: Requirements 8.6

### Property 16: Report Header Completeness
*For any* report document, the rendered output SHALL contain a header section with company name, report title, and date range or as-of date.

**Validates**: Requirements 5.1-5.4

### Property 17: Error Handling Gracefully
*For any* error condition, the print system SHALL display a clear error message without crashing or showing broken layouts.

**Validates**: Requirements 10.5, 10.6