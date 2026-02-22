# Requirements Document

## Introduction

This document specifies the requirements for redesigning all print documents in the ERP system. The current print documents have several issues:
1. Print preview uses incorrect dimensions (215mm x 140mm) instead of standard A4 portrait (210mm x 297mm)
2. Business transaction documents use landscape orientation, which is not ideal for standard business documents
3. Financial reports and other reports lack standardized print layouts
4. Print preview and actual print output are inconsistent

This redesign will:
- Fix print preview dimensions to standard A4 portrait (210mm x 297mm)
- Transform all business transaction documents to portrait orientation with improved layout
- Redesign financial reports (Trial Balance, Balance Sheet, P&L, etc.) for better print layout
- Redesign all other report documents in report menus
- Standardize the print preview component across all document types
- Ensure consistency between print preview and actual print output
- Provide layout examples/mockups for all document types

The redesign covers:
- Six core transaction document types: Sales Order (SO), Delivery Note/Surat Jalan (SJ), Sales Invoice/Faktur Jual (FJ), Purchase Order (PO), Purchase Receipt (PR), and Purchase Invoice (PI)
- Financial reports: Trial Balance, Balance Sheet, Profit & Loss Statement, Cash Flow Statement, General Ledger, and other accounting reports
- Other system reports: Inventory reports, Sales reports, Purchase reports, HR reports, and any other printable reports

## Glossary

- **Print_System**: The document printing and preview functionality in the Next.js frontend application
- **Transaction_Document**: A business transaction record (Sales Order, Delivery Note, Sales Invoice, Purchase Order, Purchase Receipt, or Purchase Invoice)
- **Financial_Report**: An accounting report (Trial Balance, Balance Sheet, Profit & Loss, Cash Flow, General Ledger, etc.)
- **System_Report**: Any other printable report in the system (Inventory, Sales, Purchase, HR reports, etc.)
- **PrintLayout**: The React component that renders the document structure for printing
- **PrintPreviewModal**: The modal component that displays print preview with zoom and paper settings
- **PrintPreviewComponent**: The standardized component used across all document types for consistent preview functionality
- **Portrait_Orientation**: Vertical page orientation where height is greater than width (e.g., A4: 210mm x 297mm)
- **Landscape_Orientation**: Horizontal page orientation where width is greater than height (e.g., 297mm x 210mm)
- **A4_Paper**: Standard paper size of 210mm x 297mm
- **Print_Dimensions**: The width and height settings used for rendering print preview and actual print output
- **Company_Logo**: The company's branding image displayed on printed documents
- **Terbilang**: Indonesian text representation of numbers (e.g., "satu juta rupiah" for 1,000,000)
- **Document_Metadata**: Information about the document including number, date, party name, and reference documents
- **Report_Header**: The header section of a report containing title, date range, and company information
- **Report_Footer**: The footer section of a report containing page numbers and print timestamp

## Requirements

### Requirement 1: Print Preview Dimension Correction

**User Story:** As a business user, I want the print preview to use correct A4 portrait dimensions, so that the preview accurately represents what will be printed on physical paper.

#### Acceptance Criteria

1. THE Print_System SHALL set Print_Dimensions to 210mm width x 297mm height for A4 portrait orientation
2. THE Print_System SHALL remove the incorrect 215mm x 140mm dimensions from all print preview implementations
3. THE Print_System SHALL apply the correct Print_Dimensions to the PrintPreviewModal component
4. THE Print_System SHALL apply the correct Print_Dimensions to all print page components
5. THE Print_System SHALL ensure the print preview matches the actual printed output dimensions
6. THE Print_System SHALL validate that the preview container uses the correct aspect ratio (210:297)
7. WHEN a user opens print preview, THE Print_System SHALL display the document at the correct A4 portrait dimensions
8. WHEN a user prints a document, THE Print_System SHALL output at the correct A4 portrait dimensions
9. THE Print_System SHALL apply correct CSS @page rules with size: A4 portrait
10. THE Print_System SHALL measure and verify dimensions against physical A4 paper (210mm x 297mm)

### Requirement 2: Portrait Orientation for All Transaction Documents

**User Story:** As a business user, I want all transaction print documents to use portrait orientation, so that they match standard business document formats and are easier to file and store.

#### Acceptance Criteria

1. THE Print_System SHALL render all Sales Order documents in portrait orientation with A4_Paper dimensions (210mm x 297mm)
2. THE Print_System SHALL render all Delivery Note documents in portrait orientation with A4_Paper dimensions (210mm x 297mm)
3. THE Print_System SHALL render all Sales Invoice documents in portrait orientation with A4_Paper dimensions (210mm x 297mm)
4. THE Print_System SHALL render all Purchase Order documents in portrait orientation with A4_Paper dimensions (210mm x 297mm)
5. THE Print_System SHALL render all Purchase Receipt documents in portrait orientation with A4_Paper dimensions (210mm x 297mm)
6. THE Print_System SHALL render all Purchase Invoice documents in portrait orientation with A4_Paper dimensions (210mm x 297mm)
7. THE Print_System SHALL set the default paper orientation to portrait in PrintPreviewModal for all transaction document types

### Requirement 3: Financial Report Print Layout Redesign

**User Story:** As an accounting user, I want financial reports to have professional print layouts, so that I can print and share reports with stakeholders.

#### Acceptance Criteria

1. THE Print_System SHALL render Trial Balance reports with A4 portrait orientation
2. THE Print_System SHALL render Balance Sheet reports with A4 portrait orientation
3. THE Print_System SHALL render Profit & Loss Statement reports with A4 portrait orientation
4. THE Print_System SHALL render Cash Flow Statement reports with A4 portrait orientation
5. THE Print_System SHALL render General Ledger reports with A4 portrait orientation
6. THE Print_System SHALL render all other accounting reports with A4 portrait orientation
7. FOR all Financial_Report types, THE Print_System SHALL display a Report_Header with company name, report title, and date range
8. FOR all Financial_Report types, THE Print_System SHALL display a Report_Footer with page numbers and print timestamp
9. FOR all Financial_Report types, THE Print_System SHALL use consistent table formatting with clear column headers
10. FOR all Financial_Report types, THE Print_System SHALL apply appropriate number formatting for currency amounts

### Requirement 4: Financial Report Header and Footer

**User Story:** As an accounting user, I want financial reports to have clear headers and footers, so that I can identify the report and when it was generated.

#### Acceptance Criteria

1. THE Report_Header SHALL display the company name at the top
2. THE Report_Header SHALL display the Company_Logo when available
3. THE Report_Header SHALL display the report title prominently (e.g., "TRIAL BALANCE", "BALANCE SHEET")
4. THE Report_Header SHALL display the date range or as-of date for the report
5. THE Report_Header SHALL display the report generation timestamp
6. THE Report_Header SHALL use a minimum font size of 14 points for the company name
7. THE Report_Header SHALL use a minimum font size of 16 points for the report title
8. THE Report_Footer SHALL display page numbers in the format "Page X of Y"
9. THE Report_Footer SHALL display the print timestamp
10. THE Report_Footer SHALL use a small font size (8 points) and light gray color

### Requirement 5: Financial Report Table Formatting

**User Story:** As an accounting user, I want financial report tables to be well-formatted and readable, so that I can easily analyze financial data.

#### Acceptance Criteria

1. FOR all Financial_Report types, THE Print_System SHALL display account names in the leftmost column
2. FOR all Financial_Report types, THE Print_System SHALL align numeric columns (debit, credit, balance) to the right
3. FOR all Financial_Report types, THE Print_System SHALL format currency amounts with Indonesian locale (e.g., "Rp 1.000.000")
4. FOR all Financial_Report types, THE Print_System SHALL use alternating row colors for better readability
5. FOR all Financial_Report types, THE Print_System SHALL apply borders to table cells
6. FOR all Financial_Report types, THE Print_System SHALL use bold font for subtotals and totals
7. FOR all Financial_Report types, THE Print_System SHALL indent child accounts to show hierarchy
8. FOR all Financial_Report types, THE Print_System SHALL use a minimum font size of 9 points for table content
9. FOR all Financial_Report types, THE Print_System SHALL prevent page breaks within account groups when possible
10. FOR Balance Sheet and P&L reports, THE Print_System SHALL display section totals (Assets, Liabilities, Income, Expenses)

### Requirement 6: Other System Reports Print Layout

**User Story:** As a business user, I want all system reports to have consistent print layouts, so that all printed reports look professional.

#### Acceptance Criteria

1. THE Print_System SHALL render all inventory reports with A4 portrait orientation
2. THE Print_System SHALL render all sales reports with A4 portrait orientation
3. THE Print_System SHALL render all purchase reports with A4 portrait orientation
4. THE Print_System SHALL render all HR reports with A4 portrait orientation
5. THE Print_System SHALL render all other System_Report types with A4 portrait orientation
6. FOR all System_Report types, THE Print_System SHALL display a Report_Header with company name and report title
7. FOR all System_Report types, THE Print_System SHALL display a Report_Footer with page numbers
8. FOR all System_Report types, THE Print_System SHALL use consistent table formatting
9. FOR all System_Report types, THE Print_System SHALL apply appropriate column widths based on content
10. FOR all System_Report types, THE Print_System SHALL handle long reports with proper pagination

### Requirement 7: Standardized Print Preview Component

**User Story:** As a developer, I want a standardized print preview component, so that all document types have consistent preview functionality.

#### Acceptance Criteria

1. THE Print_System SHALL provide a single PrintPreviewComponent that can be used for all document types
2. THE PrintPreviewComponent SHALL accept a "documentType" prop to identify the type (transaction, financial_report, system_report)
3. THE PrintPreviewComponent SHALL accept a "documentData" prop containing the data to render
4. THE PrintPreviewComponent SHALL apply the correct Print_Dimensions (210mm x 297mm) for all document types
5. THE PrintPreviewComponent SHALL provide consistent zoom controls for all document types
6. THE PrintPreviewComponent SHALL provide consistent paper settings for all document types
7. THE PrintPreviewComponent SHALL provide consistent print and save-as-PDF buttons for all document types
8. THE PrintPreviewComponent SHALL use the same styling and layout for all document types
9. THE PrintPreviewComponent SHALL handle loading states consistently across all document types
10. THE PrintPreviewComponent SHALL handle error states consistently across all document types

### Requirement 8: Print Preview and Output Consistency

**User Story:** As a business user, I want the print preview to match the actual printed output, so that what I see is what I get when printing.

#### Acceptance Criteria

1. THE Print_System SHALL ensure the print preview uses the same CSS styles as the actual print output
2. THE Print_System SHALL ensure the print preview uses the same Print_Dimensions as the actual print output
3. THE Print_System SHALL ensure the print preview uses the same fonts as the actual print output
4. THE Print_System SHALL ensure the print preview uses the same margins as the actual print output
5. THE Print_System SHALL ensure the print preview uses the same page breaks as the actual print output
6. WHEN a user views the print preview, THE Print_System SHALL render exactly what will be printed
7. WHEN a user prints a document, THE Print_System SHALL produce output that matches the preview
8. THE Print_System SHALL apply @media print rules consistently to both preview and print output
9. THE Print_System SHALL test print output on physical printers to verify consistency
10. THE Print_System SHALL test PDF output to verify consistency with preview

### Requirement 9: Layout Examples and Mockups

**User Story:** As a stakeholder, I want to see layout examples and mockups, so that I can review and approve the design before implementation.

#### Acceptance Criteria

1. THE Design_Document SHALL include a mockup for Sales Order print layout
2. THE Design_Document SHALL include a mockup for Delivery Note print layout
3. THE Design_Document SHALL include a mockup for Sales Invoice print layout
4. THE Design_Document SHALL include a mockup for Purchase Order print layout
5. THE Design_Document SHALL include a mockup for Purchase Receipt print layout
6. THE Design_Document SHALL include a mockup for Purchase Invoice print layout
7. THE Design_Document SHALL include a mockup for Trial Balance report layout
8. THE Design_Document SHALL include a mockup for Balance Sheet report layout
9. THE Design_Document SHALL include a mockup for Profit & Loss Statement report layout
10. THE Design_Document SHALL include mockups for at least 2 other System_Report types
11. THE Design_Document SHALL show the correct Print_Dimensions (210mm x 297mm) in all mockups
12. THE Design_Document SHALL annotate mockups with measurements and spacing guidelines

### Requirement 10: Company Logo Display

**User Story:** As a business user, I want the company logo to appear on all printed documents, so that documents are properly branded and look professional.

#### Acceptance Criteria

1. THE PrintLayout SHALL display the Company_Logo in the document header
2. THE PrintLayout SHALL position the Company_Logo on the left side of the header
3. THE PrintLayout SHALL size the Company_Logo to a maximum height of 50 pixels
4. THE PrintLayout SHALL maintain the Company_Logo aspect ratio when rendering
5. WHEN no Company_Logo is available, THE PrintLayout SHALL display only the company name text
6. THE PrintLayout SHALL load the Company_Logo from the public assets directory or a configurable URL
7. THE PrintLayout SHALL handle Company_Logo loading errors gracefully without breaking the document layout

### Requirement 11: Improved Document Header Layout

**User Story:** As a business user, I want document headers to be clear and well-organized, so that I can quickly identify document information.

#### Acceptance Criteria

1. THE PrintLayout SHALL display the company name and Company_Logo in the top section of the header
2. THE PrintLayout SHALL display the document title (e.g., "SALES ORDER", "FAKTUR JUAL") prominently in the header
3. THE PrintLayout SHALL display the document status badge (Draft, Submitted, Cancelled) in the header when applicable
4. THE PrintLayout SHALL use a minimum font size of 14 points for the company name
5. THE PrintLayout SHALL use a minimum font size of 16 points for the document title
6. THE PrintLayout SHALL separate the header from the document body with a visible border line
7. THE PrintLayout SHALL allocate sufficient vertical space (minimum 60 pixels) for the header section

### Requirement 12: Enhanced Document Metadata Section

**User Story:** As a business user, I want document metadata to be clearly displayed and easy to read, so that I can quickly find key information like document number, date, and party details.

#### Acceptance Criteria

1. THE PrintLayout SHALL display Document_Metadata in a dedicated section below the header
2. THE PrintLayout SHALL display the document number with a clear label (e.g., "No. Dokumen:")
3. THE PrintLayout SHALL display the document date with a clear label (e.g., "Tanggal:")
4. THE PrintLayout SHALL display the party name (customer or supplier) with a clear label
5. THE PrintLayout SHALL display the party address when available
6. THE PrintLayout SHALL display reference document information when applicable
7. THE PrintLayout SHALL display the sales person name for sales documents when available
8. THE PrintLayout SHALL align metadata labels consistently with a minimum width of 100 pixels
9. THE PrintLayout SHALL use a font size of at least 10 points for metadata text
10. THE PrintLayout SHALL display metadata values in bold or semi-bold font weight for emphasis

### Requirement 13: Optimized Item Table Layout

**User Story:** As a business user, I want item tables to be well-formatted and readable, so that I can easily review line items and quantities.

#### Acceptance Criteria

1. THE PrintLayout SHALL display item tables with clear column headers
2. THE PrintLayout SHALL use alternating row colors for better readability
3. THE PrintLayout SHALL align numeric columns (quantity, price, amount) to the right
4. THE PrintLayout SHALL align text columns (item code, item name) to the left
5. THE PrintLayout SHALL use a minimum font size of 9 points for table content
6. THE PrintLayout SHALL use a minimum font size of 10 points for table headers
7. THE PrintLayout SHALL apply borders to table cells for clear separation
8. THE PrintLayout SHALL allocate appropriate column widths based on content type
9. THE PrintLayout SHALL display row numbers in the first column
10. WHEN item names are long, THE PrintLayout SHALL wrap text within the cell without breaking the table layout

### Requirement 14: Professional Totals Section

**User Story:** As a business user, I want the totals section to be clear and prominent, so that I can quickly see the final amounts.

#### Acceptance Criteria

1. WHEN a document includes pricing, THE PrintLayout SHALL display a totals section
2. THE PrintLayout SHALL display the subtotal amount when applicable
3. THE PrintLayout SHALL display the tax amount separately when applicable
4. THE PrintLayout SHALL display the grand total with emphasis (bold font, larger size, or border)
5. THE PrintLayout SHALL align all amounts to the right
6. THE PrintLayout SHALL format all amounts with Indonesian locale formatting (e.g., "Rp 1.000.000")
7. THE PrintLayout SHALL display the Terbilang (amount in words) below the totals
8. THE PrintLayout SHALL position the totals section on the right side of the page
9. THE PrintLayout SHALL use a minimum font size of 11 points for the grand total

### Requirement 15: Signature Section Layout

**User Story:** As a business user, I want signature sections to be properly formatted, so that documents can be signed by authorized personnel.

#### Acceptance Criteria

1. THE PrintLayout SHALL display a signature section at the bottom of the document
2. THE PrintLayout SHALL provide space for at least two signatures (e.g., "Dibuat Oleh", "Disetujui Oleh")
3. THE PrintLayout SHALL allocate minimum 40 pixels of vertical space for handwritten signatures
4. THE PrintLayout SHALL display signature labels clearly below the signature space
5. THE PrintLayout SHALL display the signer's name when available
6. THE PrintLayout SHALL distribute signature boxes evenly across the page width
7. THE PrintLayout SHALL separate signature boxes with appropriate spacing
8. THE PrintLayout SHALL prevent signature sections from being split across pages

### Requirement 16: Notes and Additional Information

**User Story:** As a business user, I want notes and additional information to be clearly displayed, so that important details are not missed.

#### Acceptance Criteria

1. WHEN a document includes notes, THE PrintLayout SHALL display them in a dedicated section
2. THE PrintLayout SHALL label the notes section clearly (e.g., "Catatan:")
3. THE PrintLayout SHALL preserve line breaks and formatting in notes text
4. THE PrintLayout SHALL use a minimum font size of 9 points for notes
5. THE PrintLayout SHALL position notes above the signature section
6. THE PrintLayout SHALL apply visual styling (border, background, or indentation) to distinguish notes from other content
7. THE PrintLayout SHALL limit notes section to a maximum of 150 pixels in height to prevent excessive space usage

### Requirement 17: Print-Friendly Styling

**User Story:** As a business user, I want documents to print correctly on physical printers, so that printed copies match the preview.

#### Acceptance Criteria

1. THE Print_System SHALL apply print-specific CSS media queries for optimal printing
2. THE Print_System SHALL preserve background colors and images when printing
3. THE Print_System SHALL set appropriate page margins (minimum 10mm on all sides)
4. THE Print_System SHALL prevent page breaks within item rows
5. THE Print_System SHALL prevent page breaks within the signature section
6. THE Print_System SHALL prevent page breaks within the totals section
7. THE Print_System SHALL hide UI controls (buttons, navigation) when printing
8. THE Print_System SHALL use web-safe fonts (Arial, Helvetica) for maximum compatibility
9. THE Print_System SHALL ensure all text is black or dark gray for clear printing

### Requirement 18: Responsive Preview and Zoom

**User Story:** As a business user, I want to preview documents at different zoom levels, so that I can review details before printing.

#### Acceptance Criteria

1. THE PrintPreviewModal SHALL provide zoom controls for the print preview
2. THE PrintPreviewModal SHALL support zoom levels from 50% to 200%
3. THE PrintPreviewModal SHALL display the current zoom percentage
4. THE PrintPreviewModal SHALL provide zoom in and zoom out buttons
5. THE PrintPreviewModal SHALL provide a reset button to return to 100% zoom
6. THE PrintPreviewModal SHALL maintain document aspect ratio when zooming
7. THE PrintPreviewModal SHALL center the document preview in the viewport
8. THE PrintPreviewModal SHALL provide smooth zoom transitions

### Requirement 19: Paper Settings Configuration

**User Story:** As a business user, I want to configure paper settings, so that I can print on different paper sizes if needed.

#### Acceptance Criteria

1. THE PrintPreviewModal SHALL provide paper size selection options
2. THE PrintPreviewModal SHALL support A4, A5, Letter, Legal, and F4 paper sizes
3. THE PrintPreviewModal SHALL default to A4 paper size for all documents
4. THE PrintPreviewModal SHALL provide orientation selection (portrait/landscape)
5. THE PrintPreviewModal SHALL default to portrait orientation for all business documents
6. THE PrintPreviewModal SHALL update the preview when paper settings change
7. THE PrintPreviewModal SHALL display the selected paper dimensions in millimeters
8. WHEN paper settings are changed, THE PrintPreviewModal SHALL adjust the document layout accordingly

### Requirement 20: Indonesian Language Support

**User Story:** As an Indonesian business user, I want all labels and text to be in Bahasa Indonesia, so that documents are appropriate for local business use.

#### Acceptance Criteria

1. THE PrintLayout SHALL display all labels in Bahasa Indonesia
2. THE PrintLayout SHALL use "No. Dokumen" for document number label
3. THE PrintLayout SHALL use "Tanggal" for date label
4. THE PrintLayout SHALL use "Pelanggan" for customer label in sales documents
5. THE PrintLayout SHALL use "Pemasok" or "Supplier" for supplier label in purchase documents
6. THE PrintLayout SHALL use "Catatan" for notes label
7. THE PrintLayout SHALL use "Terbilang" for amount-in-words label
8. THE PrintLayout SHALL use "Subtotal", "Pajak", and "Total" for amounts section
9. THE PrintLayout SHALL format dates using Indonesian locale (e.g., "31 Desember 2024")
10. THE PrintLayout SHALL format currency amounts with Indonesian locale (e.g., "Rp 1.000.000")

### Requirement 21: Document Footer

**User Story:** As a business user, I want a footer on printed documents, so that I can see when the document was printed.

#### Acceptance Criteria

1. THE PrintLayout SHALL display a footer at the bottom of each page
2. THE PrintLayout SHALL include the print date in the footer
3. THE PrintLayout SHALL format the print date in Indonesian locale
4. THE PrintLayout SHALL include a system attribution message (e.g., "Dicetak oleh sistem")
5. THE PrintLayout SHALL use a small font size (8 points) for footer text
6. THE PrintLayout SHALL use a light gray color for footer text to distinguish it from main content
7. THE PrintLayout SHALL separate the footer from the main content with a border line
8. THE PrintLayout SHALL prevent the footer from being split across pages

### Requirement 22: Consistent Spacing and Alignment

**User Story:** As a business user, I want consistent spacing and alignment throughout documents, so that they look professional and organized.

#### Acceptance Criteria

1. THE PrintLayout SHALL use consistent vertical spacing between sections (minimum 10 pixels)
2. THE PrintLayout SHALL use consistent horizontal padding for all sections (minimum 12 pixels)
3. THE PrintLayout SHALL align all section content to the left margin
4. THE PrintLayout SHALL align numeric values to the right within their columns
5. THE PrintLayout SHALL use consistent font sizes within each section type
6. THE PrintLayout SHALL use consistent font weights for labels and values
7. THE PrintLayout SHALL maintain consistent line height (minimum 1.4) for readability
8. THE PrintLayout SHALL ensure consistent border styles and colors throughout the document

### Requirement 23: Print Action Integration

**User Story:** As a business user, I want to easily access print functionality from document pages, so that I can quickly print documents.

#### Acceptance Criteria

1. WHEN a document is saved, THE Print_System SHALL display a print dialog option
2. WHEN a user clicks the print button in document lists, THE Print_System SHALL open the print preview
3. THE Print_System SHALL pass the document name as a URL parameter to the print page
4. THE Print_System SHALL fetch the latest document data when opening print preview
5. THE Print_System SHALL display a loading indicator while fetching document data
6. WHEN document data fails to load, THE Print_System SHALL display a clear error message
7. THE Print_System SHALL provide a "Print" button in the preview modal to trigger browser print dialog
8. THE Print_System SHALL provide a "Save as PDF" button in the preview modal
9. WHEN the user clicks "Save as PDF", THE Print_System SHALL open the browser print dialog with PDF save option

### Requirement 24: Address Display Enhancement

**User Story:** As a business user, I want customer and supplier addresses to be displayed on documents, so that shipping and billing information is clear.

#### Acceptance Criteria

1. WHEN a customer address is available, THE PrintLayout SHALL display it below the customer name
2. WHEN a supplier address is available, THE PrintLayout SHALL display it below the supplier name
3. THE PrintLayout SHALL format multi-line addresses with proper line breaks
4. THE PrintLayout SHALL use a smaller font size (9 points) for addresses compared to party names
5. THE PrintLayout SHALL limit address display to a maximum of 3 lines to conserve space
6. WHEN no address is available, THE PrintLayout SHALL not display an empty address section
7. THE PrintLayout SHALL use a lighter font weight for addresses compared to party names

### Requirement 25: Document-Specific Customizations

**User Story:** As a business user, I want each document type to display relevant information specific to that document, so that all necessary details are included.

#### Acceptance Criteria

1. FOR Sales Order documents, THE PrintLayout SHALL display the delivery date when available
2. FOR Sales Order documents, THE PrintLayout SHALL display payment terms when available
3. FOR Delivery Note documents, THE PrintLayout SHALL display the related Sales Order number
4. FOR Sales Invoice documents, THE PrintLayout SHALL display the related Delivery Note number when available
5. FOR Sales Invoice documents, THE PrintLayout SHALL display payment due date when available
6. FOR Purchase Order documents, THE PrintLayout SHALL display the expected delivery date when available
7. FOR Purchase Receipt documents, THE PrintLayout SHALL display the related Purchase Order number
8. FOR Purchase Invoice documents, THE PrintLayout SHALL display the related Purchase Receipt number when available
9. FOR all sales documents, THE PrintLayout SHALL display the sales person name when available
10. FOR all documents, THE PrintLayout SHALL display custom fields that are marked as "print on document"

### Requirement 26: Print Layout Component Refactoring

**User Story:** As a developer, I want the PrintLayout component to support portrait orientation, so that it can be used for the redesigned documents.

#### Acceptance Criteria

1. THE PrintLayout SHALL accept an optional "orientation" prop with values "portrait" or "landscape"
2. THE PrintLayout SHALL accept an optional "paperSize" prop with values "A4", "A5", "Letter", "Legal", or "F4"
3. THE PrintLayout SHALL accept an optional "companyLogo" prop for the logo URL
4. THE PrintLayout SHALL accept an optional "partyAddress" prop for customer/supplier address
5. THE PrintLayout SHALL accept an optional "totalQuantity" prop for displaying total item quantity
6. THE PrintLayout SHALL accept an optional "totalItems" prop for displaying total number of items
7. THE PrintLayout SHALL apply appropriate CSS styles based on the orientation prop
8. THE PrintLayout SHALL calculate appropriate column widths based on paper size and orientation
9. THE PrintLayout SHALL maintain backward compatibility with existing landscape print implementations
10. THE PrintLayout SHALL export TypeScript interfaces for all props

### Requirement 27: Print Preview Modal Enhancement

**User Story:** As a developer, I want the PrintPreviewModal to better support portrait documents, so that the preview is optimized for the new layout.

#### Acceptance Criteria

1. THE PrintPreviewModal SHALL adjust the preview container width based on paper orientation
2. THE PrintPreviewModal SHALL adjust the preview container height based on paper orientation
3. THE PrintPreviewModal SHALL center portrait documents vertically in the preview area
4. THE PrintPreviewModal SHALL provide adequate padding around portrait documents in the preview
5. THE PrintPreviewModal SHALL scale portrait documents appropriately to fit the viewport
6. THE PrintPreviewModal SHALL maintain the correct aspect ratio for portrait documents at all zoom levels
7. THE PrintPreviewModal SHALL update the page dimension display when orientation changes
8. THE PrintPreviewModal SHALL apply the correct @page CSS rules for portrait printing

### Requirement 28: Testing and Validation

**User Story:** As a quality assurance tester, I want to verify that all print documents work correctly, so that users receive reliable printing functionality.

#### Acceptance Criteria

1. FOR each Transaction_Document type, THE Print_System SHALL render the print preview without errors
2. FOR each Financial_Report type, THE Print_System SHALL render the print preview without errors
3. FOR each System_Report type, THE Print_System SHALL render the print preview without errors
4. FOR each document type, THE Print_System SHALL generate valid HTML for printing
5. FOR each document type, THE Print_System SHALL display all required fields correctly
6. FOR each document type, THE Print_System SHALL handle missing optional fields gracefully
7. FOR each document type, THE Print_System SHALL print correctly on physical printers
8. FOR each document type, THE Print_System SHALL save correctly as PDF
9. THE Print_System SHALL handle documents with many items (50+ line items) without layout breaking
10. THE Print_System SHALL handle documents with long item names without layout breaking
11. THE Print_System SHALL handle documents with large amounts without number formatting issues
12. THE Print_System SHALL maintain consistent appearance across different browsers (Chrome, Firefox, Safari, Edge)
13. THE Print_System SHALL verify that print preview dimensions match physical A4 paper (210mm x 297mm)
14. THE Print_System SHALL verify that actual print output dimensions match physical A4 paper (210mm x 297mm)
