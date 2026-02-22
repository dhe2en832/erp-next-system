# Implementation Plan: Responsive List UI Redesign

## Overview

This implementation plan converts the responsive list UI redesign into actionable coding tasks. The feature implements a hybrid table/card layout for all list views with adaptive pagination, debounced filtering, and proper focus management. The implementation follows a phased approach: building reusable infrastructure first, then creating generic components, and finally migrating existing list views.

## Tasks

- [ ] 1. Create core responsive and debouncing hooks
  - [ ] 1.1 Implement useMediaQuery hook for breakpoint detection
    - Create `hooks/useMediaQuery.ts` with window.matchMedia integration
    - Handle SSR case (return false when window is undefined)
    - Add event listener for media query changes
    - Clean up listener on unmount
    - _Requirements: 1.3, 2.1, 2.2_
  
  - [ ]* 1.2 Write property test for useMediaQuery hook
    - **Property 1: Responsive Layout Switching**
    - **Property 2: Layout Transition Responsiveness**
    - **Validates: Requirements 1.1, 1.2, 1.3**
  
  - [ ] 1.3 Implement useDebounce hook for input debouncing
    - Create `hooks/useDebounce.ts` with 300ms delay support
    - Use setTimeout to delay value updates
    - Clear timeout on value change or unmount
    - Return debounced value
    - _Requirements: 3.3, 4.4, 5.3_
  
  - [ ]* 1.4 Write property test for useDebounce hook
    - **Property 10: Universal Input Debouncing**
    - **Property 11: Debounce Period Result Stability**
    - **Validates: Requirements 3.3, 3.4, 4.4, 5.3**

- [ ] 2. Create filter state management and data fetching hooks
  - [ ] 2.1 Implement useFilterState hook with URL synchronization
    - Create `hooks/useFilterState.ts` with URL param integration
    - Initialize filter state from URL search params
    - Update URL when filters change (without scroll)
    - Support all filter types (search, status, dates, document number)
    - _Requirements: 6.4, 6.5_
  
  - [ ]* 2.2 Write property test for useFilterState hook
    - **Property 18: URL State Synchronization**
    - **Validates: Requirements 6.4, 6.5**
  
  - [ ] 2.3 Implement useListData hook with request cancellation
    - Create `hooks/useListData.ts` for data fetching
    - Accept apiEndpoint, pageSize, filters, currentPage as options
    - Use AbortController for request cancellation
    - Cancel previous request when new request starts
    - Return documents, loading, error, totalRecords, totalPages, refetch
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  
  - [ ]* 2.4 Write property test for useListData hook
    - **Property 24: Paginated Data Fetching**
    - **Property 25: Request Cancellation on New Request**
    - **Property 26: Loading State Indication**
    - **Property 27: Error Handling with Retry**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5**

- [ ] 3. Update Pagination component for adaptive page sizes
  - [ ] 3.1 Modify existing Pagination component to support dynamic page sizes
    - Update `app/components/Pagination.tsx` to accept pageSize prop
    - Display current page info with page size context
    - Ensure pagination controls work with both 10 and 20 page sizes
    - Add ARIA labels for accessibility
    - _Requirements: 2.4, 2.5, 10.1_
  
  - [ ]* 3.2 Write property test for Pagination component
    - **Property 7: Pagination UI Presence**
    - **Property 8: Correct Page Data Fetching**
    - **Property 28: Keyboard Navigation Support**
    - **Validates: Requirements 2.4, 2.5, 10.1**

- [ ] 4. Create FilterPanel component with controlled inputs
  - [ ] 4.1 Implement FilterPanel component with all filter types
    - Create `components/list-view/FilterPanel.tsx`
    - Add search input with local state for focus preservation
    - Add document number input with local state
    - Add status select dropdown
    - Add date range filters using BrowserStyleDatePicker
    - Implement controlled input pattern to prevent focus loss
    - Add clear filters button
    - Apply responsive grid layout (1 col mobile, 2-5 cols desktop)
    - _Requirements: 3.1, 3.2, 4.1, 4.2, 5.1, 5.2, 6.3_
  
  - [ ]* 4.2 Write property test for FilterPanel component
    - **Property 9: Search Input Focus Preservation**
    - **Property 12: Consistent Search Implementation**
    - **Property 15: Filter Clearing Behavior**
    - **Property 16: Date Range Filtering**
    - **Validates: Requirements 3.1, 3.2, 4.1, 4.2, 4.3, 4.5, 5.1, 5.2, 5.5, 6.3**

- [ ] 5. Create ActiveFiltersDisplay component
  - [ ] 5.1 Implement ActiveFiltersDisplay component
    - Create `components/list-view/ActiveFiltersDisplay.tsx`
    - Display filter chips for each active filter
    - Add remove button (X) for each filter chip
    - Add "Clear All" button when multiple filters active
    - Use color-coded chips for visual distinction
    - Add ARIA labels for screen readers
    - _Requirements: 6.1, 6.2, 6.3_
  
  - [ ]* 5.2 Write unit tests for ActiveFiltersDisplay component
    - Test filter chip rendering
    - Test individual filter removal
    - Test clear all functionality
    - _Requirements: 6.1, 6.2, 6.3_

- [ ] 6. Create mobile DocumentCard component
  - [ ] 6.1 Implement DocumentCard component for mobile view
    - Create `components/list-view/DocumentCard.tsx`
    - Display document number prominently as primary identifier
    - Display party name and date as secondary information
    - Display status with color-coded badge
    - Add onClick handler for navigation
    - Add keyboard support (Enter/Space key)
    - Add focus indicators and ARIA labels
    - Add optional action buttons (print, submit)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 10.5_
  
  - [ ]* 6.2 Write property test for DocumentCard component
    - **Property 21: Mobile Card Rendering**
    - **Property 22: Complete Card Content Display**
    - **Property 23: Card Navigation**
    - **Property 32: Card Keyboard Accessibility**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 10.5**

- [ ] 7. Create desktop table view components
  - [ ] 7.1 Implement DesktopTableView component
    - Create `components/list-view/DesktopTableView.tsx`
    - Render table with configurable columns
    - Use renderTableRow prop for custom row rendering
    - Add table header with column labels
    - Add hover effects on rows
    - Add click handler for row navigation
    - Ensure proper table semantics for accessibility
    - _Requirements: 1.1, 10.2_
  
  - [ ] 7.2 Implement MobileCardView component
    - Create `components/list-view/MobileCardView.tsx`
    - Render list of DocumentCard components
    - Add visual separation between cards
    - Handle empty state
    - _Requirements: 1.2, 8.1_
  
  - [ ]* 7.3 Write unit tests for table and card view components
    - Test table rendering with various column configurations
    - Test card list rendering
    - Test empty state handling
    - _Requirements: 1.1, 1.2, 8.1_

- [ ] 8. Create generic ResponsiveListView container component
  - [ ] 8.1 Implement ResponsiveListView generic component
    - Create `components/list-view/ResponsiveListView.tsx`
    - Accept generic type parameter for document type
    - Use useMediaQuery to detect mobile/desktop (768px breakpoint)
    - Set pageSize based on viewport (20 desktop, 10 mobile)
    - Integrate useFilterState for filter management
    - Integrate useDebounce for filter debouncing (300ms)
    - Integrate useListData for data fetching
    - Render FilterPanel with filter controls
    - Render ActiveFiltersDisplay when filters active
    - Conditionally render DesktopTableView or MobileCardView
    - Render Pagination component
    - Handle loading and error states
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 3.3, 3.4, 9.4, 9.5_
  
  - [ ]* 8.2 Write property test for ResponsiveListView component
    - **Property 3: Hybrid Layout Consistency**
    - **Property 4: State Preservation During Layout Switch**
    - **Property 5: Adaptive Page Sizing**
    - **Property 6: Page Recalculation on Size Change**
    - **Property 17: Active Filter Visual Indication**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 6.1**
  
  - [ ] 8.3 Create index file for list-view components
    - Create `components/list-view/index.ts`
    - Export all list-view components
    - _Requirements: N/A_

- [ ] 9. Checkpoint - Verify core infrastructure
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Migrate Sales Invoice list view
  - [ ] 10.1 Create InvoiceTableRow component
    - Create `app/invoice/components/InvoiceTableRow.tsx`
    - Display invoice number, customer, date, total, status
    - Add print and submit action buttons
    - _Requirements: 1.1, 7.2_
  
  - [ ] 10.2 Create InvoiceCard component
    - Create `app/invoice/components/InvoiceCard.tsx`
    - Display invoice data in card format for mobile
    - Use DocumentCard as base with invoice-specific fields
    - _Requirements: 1.2, 8.1, 8.2, 8.3, 8.4_
  
  - [ ] 10.3 Refactor invoice page.tsx to use ResponsiveListView
    - Update `app/invoice/page.tsx`
    - Replace existing list implementation with ResponsiveListView
    - Configure columns for table view
    - Configure status options (Draft, Submitted, Paid, Unpaid)
    - Set searchFields to ['customer_name', 'customer']
    - Pass renderTableRow and renderCard functions
    - Enable print and submit buttons
    - _Requirements: 1.4, 7.2, 7.4_
  
  - [ ]* 10.4 Write integration test for Sales Invoice list view
    - Test responsive behavior
    - Test filtering and search
    - Test pagination
    - _Requirements: 1.4, 3.5, 7.3_

- [ ] 11. Migrate Purchase Invoice list view
  - [ ] 11.1 Create PurchaseInvoiceTableRow component
    - Create `app/purchase-invoice/components/PurchaseInvoiceTableRow.tsx`
    - Display purchase invoice data in table format
    - _Requirements: 1.1, 7.2_
  
  - [ ] 11.2 Create PurchaseInvoiceCard component
    - Create `app/purchase-invoice/components/PurchaseInvoiceCard.tsx`
    - Display purchase invoice data in card format
    - _Requirements: 1.2, 8.1_
  
  - [ ] 11.3 Refactor purchase-invoice page.tsx to use ResponsiveListView
    - Update `app/purchase-invoice/page.tsx`
    - Configure for purchase invoice document type
    - Set searchFields to ['supplier_name', 'supplier']
    - _Requirements: 1.4, 7.2_

- [ ] 12. Migrate Sales Order list view
  - [ ] 12.1 Create SalesOrderTableRow component
    - Create `app/sales-order/components/SalesOrderTableRow.tsx`
    - Display sales order data in table format
    - _Requirements: 1.1, 7.2_
  
  - [ ] 12.2 Create SalesOrderCard component
    - Create `app/sales-order/components/SalesOrderCard.tsx`
    - Display sales order data in card format
    - _Requirements: 1.2, 8.1_
  
  - [ ] 12.3 Refactor sales-order page.tsx to use ResponsiveListView
    - Update `app/sales-order/page.tsx`
    - Configure for sales order document type
    - _Requirements: 1.4, 7.2_

- [ ] 13. Migrate Purchase Order list view
  - [ ] 13.1 Create PurchaseOrderTableRow component
    - Create `app/purchase-orders/components/PurchaseOrderTableRow.tsx`
    - Display purchase order data in table format
    - _Requirements: 1.1, 7.2_
  
  - [ ] 13.2 Create PurchaseOrderCard component
    - Create `app/purchase-orders/components/PurchaseOrderCard.tsx`
    - Display purchase order data in card format
    - _Requirements: 1.2, 8.1_
  
  - [ ] 13.3 Refactor purchase-orders page.tsx to use ResponsiveListView
    - Update `app/purchase-orders/page.tsx`
    - Configure for purchase order document type
    - _Requirements: 1.4, 7.2_

- [ ] 14. Migrate Delivery Note list view
  - [ ] 14.1 Create DeliveryNoteTableRow component
    - Create `app/delivery-note/components/DeliveryNoteTableRow.tsx`
    - Display delivery note data in table format
    - _Requirements: 1.1, 7.2_
  
  - [ ] 14.2 Create DeliveryNoteCard component
    - Create `app/delivery-note/components/DeliveryNoteCard.tsx`
    - Display delivery note data in card format
    - _Requirements: 1.2, 8.1_
  
  - [ ] 14.3 Refactor delivery-note page.tsx to use ResponsiveListView
    - Update `app/delivery-note/page.tsx`
    - Configure for delivery note document type
    - _Requirements: 1.4, 7.2_

- [ ] 15. Migrate Purchase Receipt list view
  - [ ] 15.1 Create PurchaseReceiptTableRow component
    - Create `app/purchase-receipts/components/PurchaseReceiptTableRow.tsx`
    - Display purchase receipt data in table format
    - _Requirements: 1.1, 7.2_
  
  - [ ] 15.2 Create PurchaseReceiptCard component
    - Create `app/purchase-receipts/components/PurchaseReceiptCard.tsx`
    - Display purchase receipt data in card format
    - _Requirements: 1.2, 8.1_
  
  - [ ] 15.3 Refactor purchase-receipts page.tsx to use ResponsiveListView
    - Update `app/purchase-receipts/page.tsx`
    - Configure for purchase receipt document type
    - _Requirements: 1.4, 7.2_

- [ ] 16. Checkpoint - Verify primary transaction list views
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 17. Migrate Stock Entry list view
  - [ ] 17.1 Create StockEntryTableRow component
    - Create `app/stock-entry/components/StockEntryTableRow.tsx`
    - Display stock entry data in table format
    - _Requirements: 1.1, 7.2_
  
  - [ ] 17.2 Create StockEntryCard component
    - Create `app/stock-entry/components/StockEntryCard.tsx`
    - Display stock entry data in card format
    - _Requirements: 1.2, 8.1_
  
  - [ ] 17.3 Refactor stock-entry page.tsx to use ResponsiveListView
    - Update `app/stock-entry/page.tsx`
    - Configure for stock entry document type
    - _Requirements: 1.4, 7.2_

- [ ] 18. Migrate Stock Reconciliation list view
  - [ ] 18.1 Create StockReconciliationTableRow component
    - Create `app/stock-reconciliation/components/StockReconciliationTableRow.tsx`
    - Display stock reconciliation data in table format
    - _Requirements: 1.1, 7.2_
  
  - [ ] 18.2 Create StockReconciliationCard component
    - Create `app/stock-reconciliation/components/StockReconciliationCard.tsx`
    - Display stock reconciliation data in card format
    - _Requirements: 1.2, 8.1_
  
  - [ ] 18.3 Refactor stock-reconciliation page.tsx to use ResponsiveListView
    - Update `app/stock-reconciliation/page.tsx`
    - Configure for stock reconciliation document type
    - _Requirements: 1.4, 7.2_

- [ ] 19. Migrate master data list views (Items, Customers, Suppliers, Warehouses)
  - [ ] 19.1 Migrate Items list view
    - Create table row and card components for items
    - Update `app/items/page.tsx` to use ResponsiveListView
    - _Requirements: 1.4, 7.2_
  
  - [ ] 19.2 Migrate Customers list view
    - Create table row and card components for customers
    - Update `app/customers/page.tsx` to use ResponsiveListView
    - _Requirements: 1.4, 7.2_
  
  - [ ] 19.3 Migrate Suppliers list view
    - Create table row and card components for suppliers
    - Update `app/suppliers/page.tsx` to use ResponsiveListView
    - _Requirements: 1.4, 7.2_
  
  - [ ] 19.4 Migrate Warehouses list view
    - Create table row and card components for warehouses
    - Update `app/warehouse/page.tsx` to use ResponsiveListView
    - _Requirements: 1.4, 7.2_

- [ ] 20. Migrate HR list views (Employees, Sales Persons, Commission Payments)
  - [ ] 20.1 Migrate Employees list view
    - Create table row and card components for employees
    - Update `app/employees/page.tsx` to use ResponsiveListView
    - _Requirements: 1.4, 7.2_
  
  - [ ] 20.2 Migrate Sales Persons list view
    - Create table row and card components for sales persons
    - Update `app/sales-persons/page.tsx` to use ResponsiveListView
    - _Requirements: 1.4, 7.2_
  
  - [ ] 20.3 Migrate Commission Payments list view
    - Create table row and card components for commission payments
    - Update `app/commission-payment/page.tsx` to use ResponsiveListView
    - _Requirements: 1.4, 7.2_

- [ ] 21. Migrate Finance list views (Journal Entries, GL Entries, Payment Entries)
  - [ ] 21.1 Migrate Journal Entries list view
    - Create table row and card components for journal entries
    - Update `app/journal/page.tsx` to use ResponsiveListView
    - Add search functionality if missing
    - _Requirements: 1.4, 7.1, 7.2_
  
  - [ ] 21.2 Migrate GL Entries list view
    - Create table row and card components for GL entries
    - Update `app/gl-entry/page.tsx` to use ResponsiveListView
    - Add search functionality if missing
    - _Requirements: 1.4, 7.1, 7.2_
  
  - [ ] 21.3 Migrate Payment Entries list view
    - Create table row and card components for payment entries
    - Update `app/payment/page.tsx` to use ResponsiveListView
    - _Requirements: 1.4, 7.2_

- [ ] 22. Migrate remaining list views (Payment Terms, Accounting Periods)
  - [ ] 22.1 Migrate Payment Terms list view
    - Create table row and card components for payment terms
    - Update `app/payment-terms/page.tsx` to use ResponsiveListView
    - _Requirements: 1.4, 7.2_
  
  - [ ] 22.2 Migrate Accounting Periods list view
    - Create table row and card components for accounting periods
    - Update `app/accounting-period/page.tsx` to use ResponsiveListView
    - _Requirements: 1.4, 7.2_

- [ ] 23. Add accessibility enhancements
  - [ ] 23.1 Add ARIA live regions for result announcements
    - Add screen reader announcements for filter changes
    - Add result count announcements
    - Use aria-live="polite" for non-intrusive updates
    - _Requirements: 10.4_
  
  - [ ] 23.2 Verify focus indicators on all interactive elements
    - Ensure visible focus rings on all buttons, inputs, links
    - Test keyboard navigation flow
    - Verify focus trap doesn't occur
    - _Requirements: 10.3_
  
  - [ ]* 23.3 Run automated accessibility tests
    - Use jest-axe to test all list view components
    - Fix any WCAG violations found
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  
  - [ ]* 23.4 Write property test for accessibility compliance
    - **Property 29: ARIA Label Completeness**
    - **Property 30: Visible Focus Indicators**
    - **Property 31: Screen Reader Announcements**
    - **Validates: Requirements 10.2, 10.3, 10.4**

- [ ] 24. Performance optimization
  - [ ] 24.1 Add request cancellation to useListData hook
    - Verify AbortController properly cancels pending requests
    - Test rapid filter changes don't cause race conditions
    - _Requirements: 9.2, 9.3_
  
  - [ ] 24.2 Add memoization to expensive computations
    - Use useMemo for filtered/sorted data
    - Use memo() for DocumentCard and table row components
    - Profile performance with React DevTools
    - _Requirements: 9.1_
  
  - [ ]* 24.3 Write property test for performance characteristics
    - **Property 25: Request Cancellation on New Request**
    - **Validates: Requirements 9.2, 9.3**

- [ ] 25. Final checkpoint - Comprehensive testing
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties across all inputs
- Unit tests validate specific examples and edge cases
- Migration follows priority order: Sales → Purchase → Inventory → HR → Finance
- All list views must use the same responsive breakpoint (768px)
- All filters must use 300ms debounce delay
- All search inputs must preserve cursor focus during typing
- BrowserStyleDatePicker component must be used for all date filters
