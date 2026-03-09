# Implementation Plan: Purchase Return and Debit Note

## Overview

This implementation plan breaks down the Purchase Return (Retur Pembelian) and Debit Note (Debit Memo) features into discrete coding tasks. The implementation follows established patterns from the sales-return and credit-note modules, adapted for purchase operations. All code will be written in TypeScript using Next.js 16.1.6 with App Router, React 19.2.3, and Tailwind CSS 4.

The implementation is organized into logical phases: type definitions, API routes, shared components, frontend components, and integration. Each task builds incrementally on previous work, with checkpoints to validate progress.

## Tasks

- [x] 1. Create type definitions for Purchase Return and Debit Note
  - Create `types/purchase-return.ts` with interfaces for PurchaseReturn, PurchaseReturnItem, PurchaseReturnFormData, and PurchaseReturnFormItem
  - Create `types/debit-note.ts` with interfaces for DebitNote, DebitNoteItem, DebitNoteFormData, and DebitNoteFormItem
  - Define ReturnReason type with values: 'Damaged', 'Quality Issue', 'Wrong Item', 'Supplier Request', 'Expired', 'Other'
  - Include proper TypeScript types for all fields (status, docstatus, dates, amounts)
  - _Requirements: 1.1, 2.1, 8.1_

- [x] 2. Implement Purchase Return API routes
  - [x] 2.1 Create GET and POST handlers in `app/api/purchase/purchase-return/route.ts`
    - Implement GET handler for listing purchase returns with pagination, filtering (status, date range), and search
    - Implement POST handler for creating new purchase returns using ERPNext's make_purchase_return method
    - Handle authentication and error responses
    - CRITICAL: Await params Promise in all route handlers
    - _Requirements: 12.1, 12.2, 12.7, 12.8_
  
  - [x] 2.2 Create GET and PUT handlers in `app/api/purchase/purchase-return/[name]/route.ts`
    - Implement GET handler for fetching single purchase return details
    - Implement PUT handler for updating draft purchase returns
    - Validate docstatus before allowing updates (only Draft can be edited)
    - CRITICAL: Await params Promise: `const { name } = await params`
    - _Requirements: 12.3, 12.4_
  
  - [x] 2.3 Create POST handler in `app/api/purchase/purchase-return/[name]/submit/route.ts`
    - Implement submit endpoint to change docstatus from 0 to 1
    - Validate document is in Draft status before submission
    - CRITICAL: Await params Promise
    - _Requirements: 12.5_
  
  - [x] 2.4 Create POST handler in `app/api/purchase/purchase-return/[name]/cancel/route.ts`
    - Implement cancel endpoint to change docstatus from 1 to 2
    - Validate document is in Submitted status before cancellation
    - CRITICAL: Await params Promise
    - _Requirements: 12.6_

- [x] 3. Implement Debit Note API routes
  - [x] 3.1 Create GET and POST handlers in `app/api/purchase/debit-note/route.ts`
    - Implement GET handler for listing debit notes with pagination, filtering, and search
    - Implement POST handler for creating new debit notes using ERPNext's make_debit_note method
    - Handle authentication and error responses
    - CRITICAL: Await params Promise in all route handlers
    - _Requirements: 13.1, 13.2, 13.7, 13.8_
  
  - [x] 3.2 Create GET and PUT handlers in `app/api/purchase/debit-note/[name]/route.ts`
    - Implement GET handler for fetching single debit note details
    - Implement PUT handler for updating draft debit notes
    - Validate docstatus before allowing updates
    - CRITICAL: Await params Promise: `const { name } = await params`
    - _Requirements: 13.3, 13.4_
  
  - [x] 3.3 Create POST handler in `app/api/purchase/debit-note/[name]/submit/route.ts`
    - Implement submit endpoint to change docstatus from 0 to 1
    - Validate document is in Draft status before submission
    - CRITICAL: Await params Promise
    - _Requirements: 13.5_
  
  - [x] 3.4 Create POST handler in `app/api/purchase/debit-note/[name]/cancel/route.ts`
    - Implement cancel endpoint to change docstatus from 1 to 2
    - Validate document is in Submitted status before cancellation
    - CRITICAL: Await params Promise
    - _Requirements: 13.6_

- [x] 4. Create shared dialog components
  - [x] 4.1 Create PurchaseReceiptDialog component in `components/purchase-return/PurchaseReceiptDialog.tsx`
    - Implement searchable dialog for selecting purchase receipts
    - Add filters for supplier and date range
    - Display document number, supplier name, posting date, and total amount
    - Implement pagination for large result sets
    - Show loading indicator while fetching
    - Filter to show only receipts with returnable items
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.7, 14.8_
  
  - [x] 4.2 Create PurchaseInvoiceDialog component in `components/debit-note/PurchaseInvoiceDialog.tsx`
    - Implement searchable dialog for selecting paid purchase invoices
    - Add filters for supplier and date range
    - Display document number, supplier name, posting date, and total amount
    - Implement pagination for large result sets
    - Show loading indicator while fetching
    - Filter to show only paid invoices with returnable items
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.7, 14.8_

- [x] 5. Checkpoint - Verify API routes and dialogs
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement Purchase Return list component
  - Create `app/purchase-return/prList/component.tsx` following pattern from sales-return/srList
  - Display paginated list of purchase returns with columns: document name, supplier, posting date, total amount, status
  - Implement status filter dropdown (Draft, Submitted, Cancelled)
  - Implement date range filters (from_date, to_date) with DD/MM/YYYY format
  - Implement search input for supplier name or document number
  - Display status badges with color coding: yellow for Draft, green for Submitted, gray for Cancelled
  - Handle row click to navigate to detail view
  - Implement pagination controls with configurable page size
  - Add loading spinner during data fetch
  - Display error messages for failed API calls
  - Ensure mobile-responsive layout with horizontal scrolling for table
  - Use Indonesian labels (Bahasa Indonesia)
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 9.1, 9.2, 9.4, 9.5, 11.1_

- [x] 7. Implement Purchase Return form component
  - [x] 7.1 Create `app/purchase-return/prMain/component.tsx` with form structure
    - Set up form state management for PurchaseReturnFormData
    - Implement create mode (new return) and edit mode (existing return)
    - Implement read-only mode for Submitted and Cancelled returns
    - Add "Select Purchase Receipt" button that opens PurchaseReceiptDialog
    - Display supplier name and posting date fields
    - Add posting date picker with DD/MM/YYYY format, defaulting to current date
    - Display items table with columns: checkbox, item code, item name, delivered qty, returned qty, remaining qty, return qty input, rate, amount, return reason dropdown, notes input
    - Calculate and display line amounts (qty × rate) reactively
    - Calculate and display total return amount reactively
    - Display count of selected items
    - Add "Save" button for Draft documents
    - Add "Submit" button for Draft documents with confirmation dialog
    - Add "Cancel" button for Submitted documents with confirmation dialog
    - Ensure mobile-responsive layout with touch-friendly controls (44x44px minimum)
    - Use Indonesian labels and currency format (Rp)
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 3.1, 3.2, 3.3, 3.4, 9.1, 9.3, 11.1, 11.2, 11.3, 15.1, 15.2, 15.6, 16.6, 16.7_
  
  - [x] 7.2 Implement form validation logic
    - Validate at least one item is selected with qty > 0
    - Validate return quantity is greater than zero for selected items
    - Validate return quantity does not exceed remaining returnable quantity (delivered - returned)
    - Validate return reason is selected for all selected items
    - Validate notes are provided when return reason is "Other"
    - Display inline error messages next to invalid fields with red border and text
    - Prevent form submission when validation errors exist
    - Clear errors when user corrects input
    - _Requirements: 1.6, 1.7, 1.8, 1.9, 7.3, 7.4, 7.5, 7.6, 8.2, 8.3, 8.5, 8.6, 10.2_
  
  - [x] 7.3 Implement document selection and auto-population
    - When purchase receipt is selected from dialog, fetch full document details via API
    - Auto-populate supplier name and posting date from selected receipt
    - Auto-populate items table with all items from receipt
    - Calculate remaining returnable quantity for each item (delivered_qty - returned_qty)
    - Display delivered quantity, returned quantity, and remaining quantity for each item
    - Set all items as unselected by default
    - _Requirements: 1.4, 7.1, 7.2, 7.7, 14.6_
  
  - [x] 7.4 Implement form submission and API integration
    - On save, validate all fields and display errors if invalid
    - Convert posting date from DD/MM/YYYY to YYYY-MM-DD for API
    - Filter items to include only selected items with qty > 0
    - Send POST request to create new return or PUT request to update draft
    - Display loading spinner and disable buttons during submission
    - On success, show success toast and redirect to list view
    - On error, parse ERPNext error response and display error dialog
    - Handle network errors with user-friendly message
    - _Requirements: 1.11, 1.12, 1.13, 3.8, 3.9, 3.10, 10.1, 10.3, 10.4, 10.5, 10.6, 10.7, 15.4_
  
  - [x] 7.5 Implement submit and cancel actions
    - Add submit button that sends POST to submit endpoint
    - Show confirmation dialog before submission
    - On successful submit, update status to Submitted and show success message
    - Add cancel button that sends POST to cancel endpoint
    - Show confirmation dialog before cancellation
    - On successful cancel, update status to Cancelled and show success message
    - Display appropriate buttons based on document status (Draft: Submit, Submitted: Cancel)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

- [x] 8. Implement Purchase Return page
  - Create `app/purchase-return/page.tsx` that renders PurchaseReturnList component
  - Set up proper layout and navigation
  - Add page title "Retur Pembelian" (Indonesian)
  - _Requirements: 1.1, 11.1_

- [x] 9. Checkpoint - Test Purchase Return module
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement Debit Note list component
  - Create `app/debit-note/dnList/component.tsx` following pattern from prList
  - Display paginated list of debit notes with columns: document name, supplier, posting date, total amount, status
  - Implement status filter dropdown (Draft, Submitted, Cancelled)
  - Implement date range filters (from_date, to_date) with DD/MM/YYYY format
  - Implement search input for supplier name or document number
  - Display status badges with color coding: yellow for Draft, green for Submitted, gray for Cancelled
  - Handle row click to navigate to detail view
  - Implement pagination controls with configurable page size
  - Add loading spinner during data fetch
  - Display error messages for failed API calls
  - Ensure mobile-responsive layout with horizontal scrolling for table
  - Use Indonesian labels (Bahasa Indonesia)
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 9.1, 9.2, 9.4, 9.5, 11.1_

- [x] 11. Implement Debit Note form component
  - [x] 11.1 Create `app/debit-note/dnMain/component.tsx` with form structure
    - Set up form state management for DebitNoteFormData
    - Implement create mode (new debit note) and edit mode (existing debit note)
    - Implement read-only mode for Submitted and Cancelled debit notes
    - Add "Select Purchase Invoice" button that opens PurchaseInvoiceDialog
    - Display supplier name and posting date fields
    - Add posting date picker with DD/MM/YYYY format, defaulting to current date
    - Display items table with columns: checkbox, item code, item name, invoiced qty, returned qty, remaining qty, return qty input, rate, amount, return reason dropdown, notes input
    - Calculate and display line amounts (qty × rate) reactively
    - Calculate and display total debit amount reactively
    - Display count of selected items
    - Add "Save" button for Draft documents
    - Add "Submit" button for Draft documents with confirmation dialog
    - Add "Cancel" button for Submitted documents with confirmation dialog
    - Ensure mobile-responsive layout with touch-friendly controls (44x44px minimum)
    - Use Indonesian labels and currency format (Rp)
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 9.1, 9.3, 11.1, 11.2, 11.3, 15.1, 15.2, 15.6, 16.6, 16.7_
  
  - [x] 11.2 Implement form validation logic
    - Validate at least one item is selected with qty > 0
    - Validate return quantity is greater than zero for selected items
    - Validate return quantity does not exceed remaining returnable quantity (invoiced - returned)
    - Validate return reason is selected for all selected items
    - Validate notes are provided when return reason is "Other"
    - Display inline error messages next to invalid fields with red border and text
    - Prevent form submission when validation errors exist
    - Clear errors when user corrects input
    - _Requirements: 2.6, 2.7, 2.8, 2.9, 7.3, 7.4, 7.5, 7.6, 8.2, 8.3, 8.5, 8.6, 10.2_
  
  - [x] 11.3 Implement document selection and auto-population
    - When purchase invoice is selected from dialog, fetch full document details via API
    - Auto-populate supplier name and posting date from selected invoice
    - Auto-populate items table with all items from invoice
    - Calculate remaining returnable quantity for each item (invoiced_qty - returned_qty)
    - Display invoiced quantity, returned quantity, and remaining quantity for each item
    - Set all items as unselected by default
    - _Requirements: 2.4, 7.1, 7.2, 7.7, 14.6_
  
  - [x] 11.4 Implement form submission and API integration
    - On save, validate all fields and display errors if invalid
    - Convert posting date from DD/MM/YYYY to YYYY-MM-DD for API
    - Filter items to include only selected items with qty > 0
    - Send POST request to create new debit note or PUT request to update draft
    - Display loading spinner and disable buttons during submission
    - On success, show success toast and redirect to list view
    - On error, parse ERPNext error response and display error dialog
    - Handle network errors with user-friendly message
    - _Requirements: 2.11, 2.12, 2.13, 3.8, 3.9, 3.10, 10.1, 10.3, 10.4, 10.5, 10.6, 10.7, 15.4_
  
  - [x] 11.5 Implement submit and cancel actions
    - Add submit button that sends POST to submit endpoint
    - Show confirmation dialog before submission
    - On successful submit, update status to Submitted and show success message
    - Add cancel button that sends POST to cancel endpoint
    - Show confirmation dialog before cancellation
    - On successful cancel, update status to Cancelled and show success message
    - Display appropriate buttons based on document status (Draft: Submit, Submitted: Cancel)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

- [x] 12. Implement Debit Note page
  - Create `app/debit-note/page.tsx` that renders DebitNoteList component
  - Set up proper layout and navigation
  - Add page title "Debit Memo" (Indonesian)
  - _Requirements: 2.1, 11.1_

- [x] 13. Checkpoint - Test Debit Note module
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Create utility functions for validation and formatting
  - Create validation utilities in `lib/purchase-return-validation.ts`
  - Implement `validateReturnQuantity(qty: number, remainingQty: number): boolean`
  - Implement `validateReturnReason(reason: string): boolean`
  - Implement `validateRequiredFields(formData: PurchaseReturnFormData): ValidationResult`
  - Create formatting utilities in `utils/format.ts` (if not already present)
  - Implement `formatCurrency(amount: number): string` for Indonesian Rupiah format
  - Implement `formatDate(date: string): string` for DD/MM/YYYY format
  - Implement `parseDate(dateStr: string): string` to convert DD/MM/YYYY to YYYY-MM-DD
  - Create calculation utilities in `lib/purchase-return-calculations.ts`
  - Implement `calculateLineAmount(qty: number, rate: number): number`
  - Implement `calculateTotal(items: PurchaseReturnFormItem[]): number`
  - Implement `calculateRemainingQty(deliveredQty: number, returnedQty: number): number`
  - _Requirements: 7.1, 7.2, 11.2, 11.3, 15.3, 15.4, 16.1, 16.2, 16.3, 16.4_

- [x] 15. Write unit tests for utility functions
  - Test validation functions with valid and invalid inputs
  - Test formatting functions with various date and currency values
  - Test calculation functions with edge cases (zero, negative, large numbers)
  - Test error handling in utility functions
  - _Requirements: All validation, formatting, and calculation requirements_

- [x] 16. Write unit tests for API routes
  - Test GET /api/purchase/purchase-return with various filters and pagination
  - Test POST /api/purchase/purchase-return with valid and invalid data
  - Test PUT /api/purchase/purchase-return/[name] with draft and non-draft documents
  - Test submit and cancel endpoints with various document states
  - Test error handling for all API routes
  - Repeat for debit note API routes
  - _Requirements: 12.1-12.8, 13.1-13.8_

- [x] 17. Write unit tests for components
  - Test PurchaseReturnList component rendering and interactions
  - Test PurchaseReturnForm component in create, edit, and read-only modes
  - Test form validation behavior
  - Test document selection and auto-population
  - Test submit and cancel actions
  - Test PurchaseReceiptDialog and PurchaseInvoiceDialog
  - Repeat for Debit Note components
  - _Requirements: All UI and interaction requirements_

- [x] 18. Write property-based tests for correctness properties
  - [x] 18.1 Property 2: Return Quantity Validation
    - **Property 2: Return quantity validation**
    - **Validates: Requirements 1.7, 2.7, 7.3, 7.4**
  
  - [x] 18.2 Property 5: Total Amount Calculation
    - **Property 5: Total amount calculation**
    - **Validates: Requirements 1.10, 2.10, 16.1, 16.2**
  
  - [x] 18.3 Property 19: Remaining Quantity Calculation
    - **Property 19: Remaining quantity calculation**
    - **Validates: Requirements 7.1, 7.2**
  
  - [x] 18.4 Property 39: Reactive Line Amount Calculation
    - **Property 39: Reactive line amount calculation**
    - **Validates: Requirements 16.3**
  
  - [x] 18.5 Property 40: Reactive Total Calculation
    - **Property 40: Reactive total calculation**
    - **Validates: Requirements 16.4**

- [x] 19. Final integration and testing
  - Test complete flow: create purchase return from receipt, edit, submit, cancel
  - Test complete flow: create debit note from invoice, edit, submit, cancel
  - Test filtering and search in list views
  - Test error handling for various API error scenarios
  - Test mobile responsiveness on different screen sizes
  - Verify Indonesian language labels throughout
  - Verify currency and date formatting
  - Test with real ERPNext backend if available
  - _Requirements: All requirements_

- [x] 20. Final checkpoint - Complete implementation
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The implementation follows established patterns from sales-return and credit-note modules
- All code uses TypeScript with Next.js 16.1.6 App Router
- CRITICAL: All API route handlers must await the params Promise before accessing route parameters
- Indonesian language support (Bahasa Indonesia) is required throughout
- Mobile-responsive design with Tailwind CSS 4 is required
- No commission calculations are needed (unlike sales modules)
