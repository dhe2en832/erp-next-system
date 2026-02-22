# Implementation Plan: Sales Return Management

## Overview

This implementation plan breaks down the Sales Return Management feature into actionable tasks following the 9-phase approach outlined in the design document. The feature enables users to process customer product returns based on delivery notes, integrating with the ERPNext backend via REST API.

The implementation uses TypeScript, React 19, Next.js 16 (App Router), and follows the established patterns from existing modules (delivery-note, sales-order).

## Tasks

- [x] 1. Create type definitions for Sales Return domain
  - Create `types/sales-return.ts` with all TypeScript interfaces
  - Define `SalesReturn`, `SalesReturnItem`, `ReturnReason`, `SalesReturnFormData`, `SalesReturnFormItem`, `DeliveryNote`, and `DeliveryNoteItem` interfaces
  - Add JSDoc comments for all interfaces
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 3.1, 3.2, 3.3, 8.1, 8.2_

- [ ] 2. Implement API route for listing sales returns
  - [x] 2.1 Create API route structure at `app/api/sales/sales-return/route.ts`
    - Implement GET handler for listing returns with pagination
    - Parse query parameters: limit_page_length, start, search, documentNumber, status, from_date, to_date, filters
    - Build ERPNext API filters from query parameters
    - Handle authentication (API key priority, session fallback)
    - Extract and return data with total_records
    - Implement error handling using `handleERPNextError` utility
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 9.1, 9.7_

  - [x] 2.2 Write property test for list filtering
    - **Property 12: List Filtering**
    - **Validates: Requirements 5.3, 5.4, 5.5, 5.6**

- [ ] 3. Implement API route for creating sales returns
  - [x] 3.1 Add POST handler to `app/api/sales/sales-return/route.ts`
    - Validate request body structure
    - Transform frontend data format to ERPNext format
    - Handle CSRF token for session authentication
    - Call ERPNext API to create Sales Return document
    - Return created document with generated return number
    - Implement error handling for validation failures
    - _Requirements: 1.6, 4.1, 8.1, 8.2, 8.3, 9.2, 9.7_

  - [x] 3.2 Write property test for initial draft status
    - **Property 6: Initial Draft Status**
    - **Validates: Requirements 1.6**

  - [x] 3.3 Write property test for unique return number generation
    - **Property 18: Unique Return Number Generation**
    - **Validates: Requirements 8.1, 8.2, 8.3**

- [ ] 4. Implement API routes for return document operations
  - [x] 4.1 Create `app/api/sales/sales-return/[name]/route.ts`
    - Implement GET handler for retrieving return document details
    - Await params Promise to extract name parameter
    - Use ERPNext form.load.getdoc method for complete data
    - Handle authentication
    - Return document with all child tables
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 9.3, 9.7_

  - [x] 4.2 Add PUT handler to `app/api/sales/sales-return/[name]/route.ts`
    - Validate name parameter and request body
    - Check document status (only Draft can be updated)
    - Transform and send update to ERPNext API
    - Handle errors and return updated document
    - _Requirements: 9.4, 9.7_

  - [x] 4.3 Write property test for delivery note linkage
    - **Property 5: Delivery Note Linkage**
    - **Validates: Requirements 1.5**

  - [x] 4.4 Write property test for complete detail display
    - **Property 13: Complete Detail Display**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**

- [ ] 5. Implement API routes for submit and cancel operations
  - [x] 5.1 Create `app/api/sales/sales-return/[name]/submit/route.ts`
    - Implement POST handler for submitting return documents
    - Await params Promise to extract name parameter
    - Validate document is in Draft status
    - Call ERPNext submit method
    - Handle inventory update errors
    - Return updated document with Submitted status
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 9.5, 9.7_

  - [x] 5.2 Create `app/api/sales/sales-return/[name]/cancel/route.ts`
    - Implement POST handler for cancelling return documents
    - Await params Promise to extract name parameter
    - Validate document is in Submitted status
    - Call ERPNext cancel method
    - Handle inventory reversal errors
    - Return updated document with Cancelled status
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 9.6, 9.7_

  - [x] 5.3 Write property test for submit API call
    - **Property 9: Submit API Call**
    - **Validates: Requirements 4.1**

  - [x] 5.4 Write property test for status transition on submit
    - **Property 10: Status Transition on Submit**
    - **Validates: Requirements 4.5**

  - [x] 5.5 Write property test for cancel API call
    - **Property 16: Cancel API Call**
    - **Validates: Requirements 7.1**

  - [x] 5.6 Write property test for status transition on cancel
    - **Property 17: Status Transition on Cancel**
    - **Validates: Requirements 7.4**

- [x] 6. Checkpoint - Verify API routes functionality
  - Ensure all API routes are working correctly
  - Test with Postman or similar tool
  - Verify error handling works as expected
  - Ask the user if questions arise

- [ ] 7. Create DeliveryNoteDialog component
  - [x] 7.1 Create `app/components/DeliveryNoteDialog.tsx`
    - Implement modal dialog component with search functionality
    - Add filters for customer, date range, document number
    - Display searchable list of submitted delivery notes
    - Implement pagination for delivery note list
    - Show delivery note details (customer, date, items)
    - Handle selection and pass data to parent via onSelect callback
    - Style with Tailwind CSS using existing color palette
    - Implement keyboard navigation and accessibility features
    - _Requirements: 10.3_

  - [x] 7.2 Write property test for delivery note data retrieval
    - **Property 1: Delivery Note Data Retrieval**
    - **Validates: Requirements 1.1, 1.2**

- [ ] 8. Implement Sales Return List component
  - [x] 8.1 Create `app/sales-return/srList/component.tsx`
    - Implement state management for list data (returns, loading, error, filters, pagination)
    - Fetch returns from GET /api/sales-return endpoint
    - Implement pagination controls (20 items per page)
    - Add filter controls: date range picker, customer search, status dropdown, document number search
    - Implement debounced search (300ms delay)
    - Display returns in responsive grid layout
    - Add status badges with color coding (Draft: yellow, Submitted: green, Cancelled: gray)
    - Add "Create Return" button linking to form
    - Add "Submit" button for draft returns with confirmation dialog
    - Add navigation to detail/edit view
    - Implement toast notifications for success/error messages
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 8.4, 10.1, 10.2, 10.5, 10.6, 10.7_

  - [x] 8.2 Create `app/sales-return/page.tsx`
    - Render SalesReturnList component
    - Set page metadata (title, description)
    - _Requirements: 10.1_

  - [x] 8.3 Write property test for paginated list display
    - **Property 11: Paginated List Display**
    - **Validates: Requirements 5.1, 5.2**

  - [x] 8.4 Write property test for return number display
    - **Property 19: Return Number Display**
    - **Validates: Requirements 8.4**

- [ ] 9. Implement Sales Return Form component - Part 1 (Structure and State)
  - [x] 9.1 Create `app/sales-return/srMain/component.tsx` with basic structure
    - Set up component structure with TypeScript
    - Implement form state management (formData, loading, error, selectedDeliveryNote, editingReturn, currentStatus, showDeliveryNoteDialog)
    - Add URL parameter handling for edit mode (extract return name from URL)
    - Implement data loading for edit mode (fetch existing return document)
    - Set up form sections: Header, Items, Summary, Actions
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 10.4_

  - [x] 9.2 Implement delivery note selection functionality
    - Add "Select Delivery Note" button that opens DeliveryNoteDialog
    - Handle delivery note selection from dialog
    - Load delivery note items into form state
    - Populate customer information (read-only)
    - Set default posting date to today
    - Calculate remaining returnable quantities for each item
    - _Requirements: 1.1, 1.2, 10.3_

  - [x] 9.3 Write property test for item selection state
    - **Property 2: Item Selection State**
    - **Validates: Requirements 1.3**

- [ ] 10. Implement Sales Return Form component - Part 2 (Item Management and Validation)
  - [x] 10.1 Implement item list display and selection
    - Display items from selected delivery note in a table
    - Add checkbox for each item to select for return
    - Show item details: code, name, delivered quantity, UOM, rate
    - Add quantity input field for each selected item
    - Add return reason dropdown for each selected item
    - Add conditional notes field (shown when reason is "Other")
    - Calculate and display line totals (qty × rate)
    - _Requirements: 1.3, 1.4, 2.4, 3.1, 3.2, 3.3_

  - [x] 10.2 Implement validation logic
    - Validate return quantity > 0
    - Validate return quantity ≤ delivered quantity
    - Validate return reason is selected for each item
    - Validate notes are provided when reason is "Other"
    - Show inline error messages below invalid fields
    - Prevent form submission until all validations pass
    - Use red color (#EF4444) for error states
    - _Requirements: 2.1, 2.2, 2.3, 3.3_

  - [x] 10.3 Write property test for return quantity validation
    - **Property 3: Return Quantity Validation**
    - **Validates: Requirements 1.4, 2.1, 2.2, 2.3**

  - [x] 10.4 Write property test for remaining quantity calculation
    - **Property 4: Remaining Quantity Calculation**
    - **Validates: Requirements 2.4**

  - [x] 10.5 Write property test for return reason selection
    - **Property 7: Return Reason Selection**
    - **Validates: Requirements 3.1, 3.4**

  - [x] 10.6 Write property test for conditional notes requirement
    - **Property 8: Conditional Notes Requirement**
    - **Validates: Requirements 3.3**

- [ ] 11. Implement Sales Return Form component - Part 3 (Save and Submit)
  - [x] 11.1 Implement summary section
    - Calculate and display total items being returned
    - Calculate and display total value of return
    - Display customer information
    - Display delivery note reference
    - _Requirements: 6.5_

  - [x] 11.2 Implement save functionality
    - Collect form data from state
    - Transform to API format (match ERPNext structure)
    - Call POST /api/sales-return for new returns
    - Call PUT /api/sales-return/[name] for draft updates
    - Handle success: show success toast, navigate to list or show print dialog
    - Handle errors: display error message, preserve form state
    - Implement form state preservation in sessionStorage
    - Show loading indicator during save operation
    - _Requirements: 1.6, 4.1, 10.5, 10.6, 10.7_

  - [x] 11.3 Implement read-only mode for submitted/cancelled returns
    - Detect document status from loaded data
    - Disable all form inputs when status is not Draft
    - Show status badge prominently
    - Hide save button for non-draft returns
    - Add "Back to List" button
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 11.4 Write property test for total value calculation
    - **Property 14: Total Value Calculation**
    - **Validates: Requirements 6.5**

  - [x] 11.5 Write property test for API error handling
    - **Property 20: API Error Handling**
    - **Validates: Requirements 9.7**

  - [x] 11.6 Write property test for user feedback display
    - **Property 21: User Feedback Display**
    - **Validates: Requirements 10.5, 10.6, 10.7**

- [x] 12. Checkpoint - Test form functionality end-to-end
  - Test creating a new return from delivery note
  - Test editing a draft return
  - Test validation error messages
  - Test save and submit operations
  - Ensure all tests pass, ask the user if questions arise

- [ ] 13. Add navigation integration
  - [x] 13.1 Update main navigation menu
    - Add "Sales Returns" menu item to navigation component
    - Link to `/sales-return` route
    - Add appropriate icon from lucide-react (e.g., PackageX or RotateCcw)
    - Position in Sales section of navigation
    - _Requirements: 10.1_

  - [x] 13.2 Add delivery note navigation link (optional enhancement)
    - Add link from return detail view to original delivery note
    - Implement navigation to `/delivery-note/[name]` route
    - _Requirements: 6.6_

  - [x] 13.3 Write property test for delivery note navigation link
    - **Property 15: Delivery Note Navigation Link**
    - **Validates: Requirements 6.6**

- [ ] 14. Implement ERPNext backend configuration
  - [x] 14.1 Create Sales Return DocType in ERPNext
    - Create custom DocType "Sales Return" with fields: name, customer, customer_name, posting_date, delivery_note, company, status, grand_total, custom_notes
    - Create child table "Sales Return Item" with fields: name, item_code, item_name, qty, rate, amount, uom, warehouse, delivery_note_item, return_reason, return_notes
    - Configure naming series: "RET-.YYYY.-"
    - Set up field properties (required, read-only, calculated)
    - _Requirements: 1.5, 1.6, 3.4, 8.1, 8.2_

  - [x] 14.2 Add validation scripts to Sales Return DocType
    - Validate return quantity ≤ delivered quantity
    - Validate return reason is selected for all items
    - Validate notes when reason is "Other"
    - Calculate line totals (qty × rate)
    - Calculate document grand_total (sum of line amounts)
    - _Requirements: 2.1, 2.2, 2.3, 3.3, 6.5_

  - [x] 14.3 Add submit/cancel hooks for inventory updates
    - On submit: create stock entries to increase inventory for returned items
    - On submit: update stock ledger with return transactions
    - On cancel: create reversing stock entries to decrease inventory
    - On cancel: reverse stock ledger entries
    - Handle errors and rollback on failure
    - _Requirements: 4.2, 4.3, 4.4, 7.2, 7.3_

  - [x] 14.4 Configure permissions for Sales Return DocType
    - Set role permissions (Sales User, Sales Manager)
    - Configure create, read, update, delete, submit, cancel permissions
    - Set up workflow states if needed
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [ ] 15. Integration testing and bug fixes
  - [x] 15.1 Test complete create-submit flow
    - Test selecting delivery note
    - Test entering return quantities and reasons
    - Test saving as draft
    - Test submitting return
    - Verify inventory updates correctly
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 15.2 Test edit and cancel flows
    - Test editing draft return
    - Test cancelling submitted return
    - Verify inventory reversal works correctly
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 15.3 Test error scenarios
    - Test with invalid delivery note
    - Test with excessive return quantities
    - Test with missing required fields
    - Test with network errors
    - Verify error messages are user-friendly
    - _Requirements: 2.3, 9.7, 10.7_

  - [x] 15.4 Test list and search functionality
    - Test pagination with large datasets
    - Test all filter combinations
    - Test search functionality
    - Verify performance is acceptable
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 16. Final checkpoint - Complete testing and deployment preparation
  - Run all unit tests and property tests
  - Verify all acceptance criteria are met
  - Test on multiple browsers (Chrome, Firefox, Safari, Edge)
  - Test responsive design on mobile devices
  - Ensure all tests pass, ask the user if questions arise

## Notes

- Tasks marked with `*` are optional property-based tests and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties from the design document
- The implementation follows established patterns from delivery-note and sales-order modules
- All code should follow TypeScript best practices and Next.js 16 App Router conventions
- Use existing utilities from `lib/` and `utils/` directories where applicable
- Follow the project's color palette: Indigo (primary), Green (success), Yellow (warning), Red (danger)
