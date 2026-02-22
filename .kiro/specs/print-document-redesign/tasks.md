# Implementation Plan: Print Document Redesign

## Overview

This implementation plan addresses critical issues with the current print system:
- **Incorrect dimensions**: Current prints at 215mm × 145mm instead of standard A4 portrait (210mm × 297mm)
- **Inconsistent layouts**: Transaction documents lack standardized structure
- **Missing report layouts**: Financial and system reports need proper print formatting

The implementation follows an 8-phase approach, starting with fixing core dimension issues and progressively enhancing all document types with professional layouts.

## Tasks

- [ ] 1. Fix core print dimensions and preview modal
  - Update PrintPreviewModal to use correct A4 portrait dimensions (210mm × 297mm)
  - Remove hardcoded incorrect dimensions (215mm × 145mm)
  - Update @page CSS rules for proper print output
  - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.6_

- [ ] 2. Enhance PrintLayout component for portrait orientation
  - [ ] 2.1 Add new props to PrintLayout interface
    - Add orientation, paperSize, companyLogo, and partyAddress props
    - Update TypeScript interface definitions
    - _Requirements: 26.1, 26.2, 26.3, 26.4_

  - [ ] 2.2 Update CSS for portrait orientation
    - Adjust padding and margins for 210mm width
    - Optimize column widths for narrower page
    - Ensure all sections fit within printable area (186mm)
    - _Requirements: 2.1-2.7, 22.1-22.8_

  - [ ] 2.3 Add company logo support
    - Render logo in document header
    - Handle loading errors gracefully with fallback
    - Maintain aspect ratio and size constraints
    - _Requirements: 10.1-10.7, 11.1-11.7_

  - [ ] 2.4 Add address display functionality
    - Display address below party name
    - Format multi-line addresses with proper line breaks
    - Use appropriate font sizing
    - _Requirements: 24.1-24.7_

- [ ] 3. Create ReportLayout component for financial reports
  - [ ] 3.1 Create ReportLayout component structure
    - Define ReportLayoutProps interface
    - Implement basic component structure
    - Set up A4 portrait dimensions
    - _Requirements: 3.1-3.6, 6.1-6.5_

  - [ ] 3.2 Implement report header
    - Add company logo and name
    - Display report title prominently
    - Show date range or as-of date
    - Add generation timestamp
    - _Requirements: 4.1-4.7_

  - [ ] 3.3 Implement report table with hierarchy
    - Support indentation levels (0-5)
    - Apply bold styling for totals
    - Handle section headers
    - Add alternating row colors
    - _Requirements: 5.1-5.10_

  - [ ] 3.4 Implement report footer
    - Add page numbering (Page X of Y format)
    - Display print timestamp
    - Use appropriate styling
    - _Requirements: 4.8-4.10_

- [ ] 4. Update transaction document print pages
  - [ ] 4.1 Update Sales Order print page
    - Switch to portrait orientation
    - Add delivery date and payment terms metadata
    - Update item table columns
    - Test with sample data
    - _Requirements: 2.1, 25.1, 25.2_

  - [ ] 4.2 Update Delivery Note print page
    - Switch to portrait orientation
    - Remove pricing columns, add warehouse column
    - Add three signature boxes (Sender, Driver, Receiver)
    - Add delivery-specific metadata
    - _Requirements: 2.2, 25.3_

  - [ ] 4.3 Update Sales Invoice print page
    - Switch to portrait orientation
    - Add NPWP fields for company and customer
    - Add payment due date and terms
    - Add bank account information in notes
    - _Requirements: 2.3, 25.4, 25.5_

  - [ ] 4.4 Update Purchase Order print page
    - Switch to portrait orientation
    - Add expected delivery date and location
    - Add supplier contact information
    - Add delivery instructions
    - _Requirements: 2.4, 25.6_

  - [ ] 4.5 Update Purchase Receipt print page
    - Switch to portrait orientation
    - Add ordered vs received quantity columns
    - Add three signature boxes (Receiver, QC, Supervisor)
    - Add quality check notes section
    - _Requirements: 2.5, 25.7, 25.8_

  - [ ] 4.6 Update Purchase Invoice print page
    - Switch to portrait orientation
    - Add supplier invoice number reference
    - Add payment due date
    - Add payment instructions
    - _Requirements: 2.6, 25.8, 25.9_

- [ ] 5. Update financial report print pages
  - [ ] 5.1 Update Trial Balance report
    - Use ReportLayout component
    - Format account hierarchy with indentation
    - Add debit and credit columns
    - Display grand totals with emphasis
    - _Requirements: 3.1, 5.1-5.10_

  - [ ] 5.2 Update Balance Sheet report
    - Use ReportLayout component
    - Group by Assets, Liabilities, and Equity sections
    - Add section totals
    - Display bilingual labels (English/Indonesian)
    - _Requirements: 3.2, 5.1-5.10_

  - [ ] 5.3 Update Profit & Loss Statement report
    - Use ReportLayout component
    - Calculate intermediate totals (Gross Profit, Operating Profit)
    - Show net profit prominently with double underline
    - Display date range in header
    - _Requirements: 3.3, 5.1-5.10_

  - [ ] 5.4 Update other financial reports
    - Update Cash Flow Statement
    - Update General Ledger
    - Update other accounting reports
    - Apply consistent ReportLayout styling
    - _Requirements: 3.4, 3.5, 3.6_

- [ ] 6. Update system report print pages
  - [ ] 6.1 Update inventory reports
    - Use ReportLayout component
    - Add warehouse and stock value columns
    - Display summary totals
    - _Requirements: 6.1, 6.6-6.10_

  - [ ] 6.2 Update sales reports
    - Use ReportLayout component
    - Add customer-wise sales summary
    - Display invoice count and totals
    - _Requirements: 6.2, 6.6-6.10_

  - [ ] 6.3 Update purchase reports
    - Use ReportLayout component
    - Add supplier-wise purchase summary
    - Display appropriate columns and totals
    - _Requirements: 6.3, 6.6-6.10_

  - [ ] 6.4 Update HR reports
    - Use ReportLayout component
    - Apply consistent formatting
    - Add appropriate headers and footers
    - _Requirements: 6.4, 6.6-6.10_

- [ ] 7. Create utility functions and helpers
  - [ ] 7.1 Create print helper functions
    - Implement formatCurrency with Indonesian locale
    - Implement formatDate with Indonesian locale
    - Implement formatAddress for multi-line addresses
    - Implement calculateTotals for item arrays
    - Implement generateTerbilang for amount in words
    - _Requirements: 20.9, 20.10, 14.6, 14.7_

  - [ ] 7.2 Create print validation functions
    - Implement validateDocumentData
    - Implement validateReportData
    - Implement checkRequiredFields
    - Add error handling for missing data
    - _Requirements: 23.4, 23.5, 23.6_

  - [ ] 7.3 Create print context provider
    - Create context for print settings
    - Add shared state for preview modal
    - Implement print action handlers
    - _Requirements: 7.1-7.10_

- [ ] 8. Checkpoint - Ensure all components render correctly
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Testing and validation
  - [ ] 9.1 Write unit tests for PrintLayout component
    - Test rendering with valid data
    - Test handling of missing optional fields
    - Test error boundaries
    - Test CSS class application
    - _Requirements: 8.1-8.10_

  - [ ] 9.2 Write unit tests for ReportLayout component
    - Test report header rendering
    - Test table hierarchy rendering
    - Test report footer rendering
    - Test with various report types
    - _Requirements: 8.1-8.10_

  - [ ] 9.3 Write unit tests for PrintPreviewModal
    - Test zoom controls
    - Test paper settings
    - Test print and save PDF actions
    - Test dimension calculations
    - _Requirements: 18.1-18.8, 19.1-19.8_

  - [ ]* 9.4 Write property test for correct A4 dimensions
    - **Property 1: Correct A4 Portrait Dimensions**
    - **Validates: Requirements 1.1, 1.3, 1.4, 1.5, 1.6, 2.1-2.7, 3.1-3.6**
    - Test all document types render at 210mm × 297mm
    - Verify aspect ratio equals 210:297

  - [ ]* 9.5 Write property test for currency formatting
    - **Property 4: Currency Formatting Consistency**
    - **Validates: Requirements 3.10, 5.3, 14.6, 20.10**
    - Test all currency values use Indonesian locale
    - Verify format matches "Rp X.XXX.XXX" pattern

  - [ ]* 9.6 Write property test for table column alignment
    - **Property 6: Table Column Alignment**
    - **Validates: Requirements 5.2, 5.4, 13.3, 13.4**
    - Test numeric columns are right-aligned
    - Test text columns are left-aligned

  - [ ]* 9.7 Write property test for Indonesian localization
    - **Property 10: Indonesian Localization**
    - **Validates: Requirements 20.1-20.9**
    - Test all labels use Bahasa Indonesia
    - Verify no English labels in output

  - [ ]* 9.8 Write property test for zoom aspect ratio
    - **Property 11: Zoom Aspect Ratio Preservation**
    - **Validates: Requirements 18.3, 18.6, 18.7**
    - Test aspect ratio maintained at all zoom levels (50%-200%)
    - Verify document remains centered

  - [ ] 9.9 Perform manual testing on physical printers
    - Print each document type on A4 paper
    - Measure output with ruler (verify 210mm × 297mm)
    - Verify preview matches printed output
    - Test on different browsers (Chrome, Firefox, Safari, Edge)
    - _Requirements: 1.10, 8.9, 8.10_

- [ ] 10. Final checkpoint - Verify all requirements met
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Documentation and cleanup
  - [ ] 11.1 Add JSDoc comments to components
    - Document PrintLayout props and usage
    - Document ReportLayout props and usage
    - Document PrintPreviewModal props and usage
    - Add usage examples
    - _Requirements: 7.1-7.10_

  - [ ] 11.2 Create developer guide
    - Document how to add new document types
    - Document how to customize layouts
    - Document how to add new report types
    - Include code examples

  - [ ] 11.3 Clean up old code
    - Remove unused components
    - Remove hardcoded incorrect dimensions
    - Remove deprecated props
    - Update imports and references

## Notes

- Tasks marked with `*` are optional property-based tests and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Phase 1 (Task 1) is CRITICAL - fixes the core dimension issue that affects all documents
- Manual testing on physical printers (Task 9.9) is essential to verify actual print output
- The design uses TypeScript, so all implementation should be in TypeScript
- Current incorrect dimensions: 215mm × 145mm (only 49% of correct A4 height)
- Target dimensions: 210mm × 297mm (standard A4 portrait)
