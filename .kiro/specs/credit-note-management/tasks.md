# Implementation Plan: Credit Note Management

## Overview

Implementasi fitur Credit Note Management untuk mengelola retur penjualan dari Sales Invoice yang sudah dibayar. Fitur ini menggunakan ERPNext native return mechanism (Sales Invoice dengan is_return=1) dan terintegrasi dengan Commission System untuk menyesuaikan nilai komisi sales.

## Tasks

- [x] 1. Setup project structure dan TypeScript types
  - Create directory structure: app/credit-note/, app/api/sales/credit-note/
  - Define TypeScript interfaces untuk CreditNote, CreditNoteItem, CreditNoteFormData, SalesInvoice
  - Create types file: types/credit-note.ts
  - _Requirements: 9.1, 9.7_

- [ ] 2. Implement utility functions untuk Credit Note
  - [x] 2.1 Create validation utilities
    - Write function validateReturnQuantity(returnQty, remainingQty)
    - Write function validateReturnReason(reason, notes)
    - Write function validateRequiredFields(formData)
    - _Requirements: 5.1, 5.2, 5.3, 11.1, 11.3, 11.5_
  
  - [ ]* 2.2 Write property test for validation utilities
    - **Property 2: Return Quantity Validation**
    - **Validates: Requirements 1.6, 5.1, 5.2, 5.3**
  
  - [x] 2.3 Create calculation utilities
    - Write function calculateCreditNoteCommission(originalCommission, returnQty, originalQty)
    - Write function calculateCreditNoteTotal(items)
    - Write function calculateRemainingQty(originalQty, returnedQty)
    - _Requirements: 1.12, 1.13, 5.2, 7.12_
  
  - [ ]* 2.4 Write property test for calculation utilities
    - **Property 6: Commission Copy Proportionality**
    - **Property 5: Total Calculation Accuracy**
    - **Validates: Requirements 1.9, 1.12, 1.13, 7.12**

- [ ] 3. Implement API route untuk list Credit Notes
  - [x] 3.1 Create GET /api/sales/credit-note/route.ts
    - Implement query parameter parsing (limit, start, filters, from_date, to_date, search, status)
    - Call ERPNext API dengan filter is_return=1 dan doctype=Sales Invoice
    - Transform data: docstatus → status, return_against → sales_invoice
    - Return paginated response dengan total_records
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.10_
  
  - [ ]* 3.2 Write property test for filter application
    - **Property 10: Filter Application Correctness**
    - **Validates: Requirements 2.2, 2.3, 2.4, 2.5, 2.6**

- [ ] 4. Implement API route untuk create Credit Note
  - [x] 4.1 Create POST /api/sales/credit-note/route.ts
    - Validate request body structure (customer, posting_date, return_against, items)
    - Validate Accounting Period untuk posting_date
    - Call ERPNext make_sales_return method dengan source_name
    - Customize template dengan user data (items, quantities, return_reason, return_notes)
    - Copy custom_komisi_sales dari original items (negative, proportional)
    - Calculate custom_total_komisi_sales
    - Save Credit Note ke ERPNext
    - Return saved Credit Note dengan getdoc
    - _Requirements: 1.10, 1.11, 1.12, 1.13, 1.14, 1.15, 11.6, 11.7, 11.8_
  
  - [ ]* 4.2 Write unit tests for create Credit Note
    - Test request validation
    - Test Accounting Period validation
    - Test commission calculation
    - Test error handling
    - _Requirements: 11.6, 11.7, 11.8, 11.10_

- [ ] 5. Implement API route untuk get Credit Note detail
  - [x] 5.1 Create GET /api/sales/credit-note/[name]/route.ts
    - Extract name parameter dari URL (await params)
    - Call frappe.desk.form.load.getdoc untuk complete data
    - Transform field names untuk frontend compatibility
    - Return Credit Note dengan all child tables
    - _Requirements: 4.7, 4.8_
  
  - [ ]* 5.2 Write property test for data format consistency
    - **Property 11: API Data Format Consistency**
    - **Validates: Requirements 2.8**

- [ ] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Implement API route untuk submit dan cancel Credit Note
  - [x] 7.1 Create POST /api/sales/credit-note/[name]/submit/route.ts
    - Extract name parameter dari URL (await params)
    - Validate Accounting Period untuk posting_date
    - Call ERPNext submit endpoint
    - Return success response
    - _Requirements: 3.2, 3.7, 9.8_
  
  - [x] 7.2 Create POST /api/sales/credit-note/[name]/cancel/route.ts
    - Extract name parameter dari URL (await params)
    - Validate Accounting Period untuk posting_date
    - Call ERPNext cancel endpoint
    - Return success response
    - _Requirements: 3.6, 3.7, 9.8_
  
  - [ ]* 7.3 Write property test for Accounting Period validation
    - **Property 9: Accounting Period Validation**
    - **Validates: Requirements 1.15, 3.7, 9.8**

- [ ] 8. Implement Sales Invoice Dialog component
  - [x] 8.1 Create components/credit-note/SalesInvoiceDialog.tsx
    - Create dialog component dengan search dan filter
    - Fetch paid Sales Invoices dari API
    - Display list dengan pagination
    - Handle selection dan return selected invoice ke parent
    - _Requirements: 1.3, 1.4_
  
  - [ ]* 8.2 Write unit tests for SalesInvoiceDialog
    - Test filtering logic
    - Test selection handling
    - Test API error handling
    - _Requirements: 1.3, 1.4_

- [ ] 9. Implement Credit Note List component
  - [x] 9.1 Create app/credit-note/cnList/component.tsx
    - Implement dual layout: mobile cards vs desktop table
    - Implement infinite scroll untuk mobile (10 items per page)
    - Implement pagination untuk desktop (20 items per page)
    - Implement filters: date range, customer, status, document number
    - Display status badges dengan color coding
    - Handle navigation ke detail view
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.9, 2.10, 10.2, 10.7_
  
  - [ ]* 9.2 Write unit tests for Credit Note List
    - Test filter state management
    - Test pagination logic
    - Test mobile vs desktop rendering
    - _Requirements: 2.1, 2.6, 2.10_

- [ ] 10. Implement Credit Note Form component
  - [x] 10.1 Create app/credit-note/cnMain/component.tsx
    - Implement form untuk create new Credit Note
    - Integrate SalesInvoiceDialog untuk invoice selection
    - Display invoice items dengan checkboxes untuk partial return
    - Implement quantity input dengan validation
    - Implement return reason dropdown dengan conditional notes field
    - Calculate dan display totals (grand_total, custom_total_komisi_sales)
    - Handle form submission
    - Display loading states dan error messages
    - _Requirements: 1.2, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 8.1, 8.2, 8.3, 8.4, 10.3, 10.4_
  
  - [x] 10.2 Implement edit mode untuk Draft Credit Notes
    - Load existing Credit Note data
    - Populate form fields
    - Handle update submission
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  
  - [x] 10.3 Implement read-only view untuk Submitted/Cancelled Credit Notes
    - Display all Credit Note details
    - Show submit/cancel buttons based on status
    - Display audit information (created_by, modified_by, dates)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 12.1, 12.2_
  
  - [ ]* 10.4 Write property test for form validation
    - **Property 3: Return Reason Required**
    - **Property 4: Conditional Notes Requirement**
    - **Property 17: Minimal Item Selection**
    - **Validates: Requirements 1.7, 1.8, 8.6, 11.4**

- [x] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Implement Credit Note page
  - [x] 12.1 Create app/credit-note/page.tsx
    - Setup page layout dengan navigation
    - Integrate CreditNoteList component
    - Handle routing ke create/edit/detail views
    - _Requirements: 1.1, 1.2, 9.7_
  
  - [ ]* 12.2 Write integration test for Credit Note page
    - Test navigation flow
    - Test component integration
    - _Requirements: 1.1, 1.2_

- [ ] 13. Add Credit Note menu ke navigation
  - [x] 13.1 Update navigation component
    - Add "Credit Note" menu item di Sales section
    - Add icon dan link ke /credit-note
    - _Requirements: 1.1_

- [x] 14. Implement Credit Note Report page
  - [x] 14.1 Create app/credit-note/report/page.tsx
    - Implement filter form (date range, customer, return_reason)
    - Fetch Credit Note data dengan filters
    - Calculate summary: total count, total nilai, breakdown by return_reason
    - Display detail table dengan grouping options
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.9, 6.10, 6.11_
  
  - [x] 14.2 Implement export to Excel functionality
    - Use xlsx library untuk generate Excel file
    - Include summary dan detail data
    - _Requirements: 6.7_
  
  - [x] 14.3 Implement print functionality
    - Create print-friendly layout
    - Handle browser print dialog
    - _Requirements: 6.8_
  
  - [ ]* 14.4 Write unit tests for report calculations
    - Test summary calculations
    - Test grouping logic
    - Test export data formatting
    - _Requirements: 6.10_

- [x] 15. Update Commission Dashboard untuk Credit Note integration
  - [x] 15.1 Add "Credit Note Adjustments" column ke Paid Invoices table
    - Fetch Credit Notes terkait dengan Sales Invoice
    - Display total Credit Note adjustments
    - Calculate net commission = earned - adjustments
    - _Requirements: 7.5, 7.6, 7.7, 7.9_
  
  - [x] 15.2 Add Credit Note detail view di Commission Dashboard
    - Display list Credit Notes untuk selected Sales Invoice
    - Show Credit Note details (number, date, amount, commission adjustment)
    - _Requirements: 7.8, 7.9_
  
  - [x] 15.3 Add warning untuk Credit Notes yang mempengaruhi paid commission
    - Check if commission sudah dibayar
    - Display warning message jika ada Credit Note setelah payment
    - _Requirements: 7.11_
  
  - [ ]* 15.4 Write property test for commission adjustment
    - **Property 16: Commission Adjustment on Submit**
    - **Property 7: Total Commission Calculation**
    - **Validates: Requirements 7.2, 7.3, 7.4**

- [x] 16. Implement ERPNext Server Script untuk commission adjustment
  - [x] 16.1 Create server script untuk Credit Note submit
    - Hook: Sales Invoice on_submit (when is_return=1)
    - Get original Sales Invoice (return_against)
    - Calculate commission adjustment
    - Update custom_total_komisi_sales di original invoice
    - _Requirements: 7.3, 7.4_
  
  - [x] 16.2 Create server script untuk Credit Note cancel
    - Hook: Sales Invoice on_cancel (when is_return=1)
    - Get original Sales Invoice (return_against)
    - Reverse commission adjustment
    - Update custom_total_komisi_sales di original invoice
    - _Requirements: 7.3, 7.4_
  
  - [ ]* 16.3 Write integration test untuk server scripts
    - Test commission adjustment on submit
    - Test commission reversal on cancel
    - Test partial return commission calculation
    - _Requirements: 7.3, 7.4, 7.12_

- [x] 17. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 18. Implement error handling dan validation
  - [x] 18.1 Add frontend validation
    - Validate required fields
    - Validate date format
    - Validate quantity > 0
    - Validate return reason selection
    - Display inline error messages
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.9_
  
  - [x] 18.2 Add backend validation
    - Validate request body structure
    - Validate Sales Invoice existence dan status
    - Validate Accounting Period
    - Return appropriate error responses (400, 500)
    - _Requirements: 11.6, 11.7, 11.8, 11.10_
  
  - [x] 18.3 Implement error handling utilities
    - Use handleERPNextError untuk parse ERPNext errors
    - Display user-friendly error messages dalam Bahasa Indonesia
    - Handle network errors dengan retry option
    - _Requirements: 3.8, 11.9_
  
  - [ ]* 18.4 Write property test for backend validation
    - **Property 14: Backend Validation Enforcement**
    - **Property 19: Required Fields Validation**
    - **Property 20: Sales Invoice Existence Validation**
    - **Validates: Requirements 5.6, 5.7, 11.1, 11.6, 11.7, 11.8**

- [x] 19. Implement partial return support
  - [x] 19.1 Add checkbox selection untuk items
    - Display checkbox untuk each item
    - Track selected items dalam state
    - Filter selected items sebelum submit
    - _Requirements: 8.1, 8.2, 8.5_
  
  - [x] 19.2 Calculate dan display remaining returnable quantity
    - Fetch returned_qty dari Sales Invoice items
    - Calculate remaining = original_qty - returned_qty
    - Display remaining quantity untuk each item
    - Validate return quantity tidak melebihi remaining
    - _Requirements: 5.2, 5.5, 8.3, 8.8_
  
  - [x] 19.3 Handle multiple Credit Notes untuk same Sales Invoice
    - Accumulate returned_qty dengan benar
    - Update remaining quantity setelah each Credit Note
    - _Requirements: 8.7_
  
  - [ ]* 19.4 Write property test for partial return accumulation
    - **Property 15: Partial Return Accumulation**
    - **Validates: Requirements 8.7**

- [x] 20. Implement UI consistency dan styling
  - [x] 20.1 Apply Tailwind CSS styling
    - Use color palette: Indigo primary, Green success, Yellow warning, Red danger
    - Apply consistent spacing dan typography
    - Implement responsive layout
    - _Requirements: 10.1, 10.7_
  
  - [x] 20.2 Add loading states
    - Use LoadingButton untuk form submissions
    - Use LoadingSpinner untuk data fetching
    - _Requirements: 10.3_
  
  - [x] 20.3 Add confirmation dialogs
    - Confirm before submit Credit Note
    - Confirm before cancel Credit Note
    - _Requirements: 10.9_
  
  - [x] 20.4 Add success notifications
    - Display Toast notification setelah create
    - Display Toast notification setelah submit
    - Display Toast notification setelah cancel
    - _Requirements: 1.16, 3.9, 10.10_
  
  - [x] 20.5 Implement Indonesian language labels
    - Translate all UI labels ke Bahasa Indonesia
    - Format dates dengan Indonesian locale
    - _Requirements: 10.8, 12.7_

- [x] 21. Final integration dan testing
  - [x] 21.1 Test complete create Credit Note flow
    - Select paid Sales Invoice
    - Select items dan quantities
    - Submit form
    - Verify Credit Note created
    - _Requirements: 1.1 - 1.16_
  
  - [x] 21.2 Test submit dan cancel flow
    - Submit Draft Credit Note
    - Verify GL entries created
    - Verify returned_qty updated
    - Cancel Credit Note
    - Verify reversal
    - _Requirements: 3.1 - 3.9_
  
  - [x] 21.3 Test commission adjustment flow
    - Create Credit Note dari commissioned invoice
    - Submit Credit Note
    - Verify commission adjustment di original invoice
    - Verify display di Commission Dashboard
    - _Requirements: 7.1 - 7.12_
  
  - [x] 21.4 Test partial return scenarios
    - Create partial Credit Note (some items)
    - Create second Credit Note (remaining items)
    - Verify accumulated returned_qty
    - _Requirements: 8.1 - 8.8_
  
  - [ ]* 21.5 Write end-to-end tests
    - Test complete user workflows
    - Test edge cases (decimal quantities, multiple returns, closed periods)
    - Test error scenarios

- [x] 22. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional dan dapat di-skip untuk faster MVP
- Each task references specific requirements untuk traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples dan edge cases
- Implementation menggunakan TypeScript dengan Next.js 16.1.6 dan React 19.2.3
- API routes menggunakan Next.js 14+ pattern dengan `await params`
- Styling menggunakan Tailwind CSS 4
- Integration dengan ERPNext menggunakan REST API dan native return mechanism
