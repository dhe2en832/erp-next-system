# Tasks: Print Preview Modal Implementation

## Phase 1: Delivery Note Module

### 1.1 Implement Delivery Note List View Print
- [x] 1.1.1 Add print state management to `app/delivery-note/dnList/component.tsx`
- [x] 1.1.2 Import PrintPreviewModal, DeliveryNotePrint, and Printer icon
- [x] 1.1.3 Implement `fetchDataForPrint` handler with address resolution
- [x] 1.1.4 Implement `handlePrint` handler with event propagation control
- [x] 1.1.5 Add print button to mobile list view
- [x] 1.1.6 Add print button to desktop list view
- [x] 1.1.7 Add PrintPreviewModal with DeliveryNotePrint component
- [x] 1.1.8 Test print functionality in list view

### 1.2 Implement Delivery Note Main View Print
- [x] 1.2.1 Add print state management to `app/delivery-note/dnMain/component.tsx`
- [x] 1.2.2 Import PrintPreviewModal and DeliveryNotePrint
- [x] 1.2.3 Implement `fetchDataForPrint` handler (reuse from list)
- [x] 1.2.4 Add print button to header (edit mode only)
- [x] 1.2.5 Add PrintPreviewModal with DeliveryNotePrint component
- [x] 1.2.6 Test print functionality in main view

## Phase 2: Sales Invoice Module

### 2.1 Implement Sales Invoice List View Print
- [x] 2.1.1 Add print state management to `app/invoice/siList/component.tsx`
- [x] 2.1.2 Import PrintPreviewModal, SalesInvoicePrint, and Printer icon
- [x] 2.1.3 Implement `fetchDataForPrint` handler with address resolution
- [x] 2.1.4 Implement `handlePrint` handler with event propagation control
- [x] 2.1.5 Add print button to mobile list view
- [x] 2.1.6 Add print button to desktop list view
- [x] 2.1.7 Add PrintPreviewModal with SalesInvoicePrint component
- [x] 2.1.8 Test print functionality in list view

### 2.2 Implement Sales Invoice Main View Print
- [x] 2.2.1 Add print state management to `app/invoice/siMain/component.tsx`
- [x] 2.2.2 Import PrintPreviewModal and SalesInvoicePrint
- [x] 2.2.3 Implement `fetchDataForPrint` handler (reuse from list)
- [x] 2.2.4 Add print button to header (edit mode only)
- [x] 2.2.5 Add PrintPreviewModal with SalesInvoicePrint component
- [x] 2.2.6 Test print functionality in main view

## Phase 3: Purchase Order Module

### 3.1 Implement Purchase Order List View Print
- [x] 3.1.1 Add print state management to `app/purchase-orders/poList/component.tsx`
- [x] 3.1.2 Import PrintPreviewModal, PurchaseOrderPrint, and Printer icon
- [x] 3.1.3 Implement `fetchDataForPrint` handler with supplier address resolution
- [x] 3.1.4 Implement `handlePrint` handler with event propagation control
- [x] 3.1.5 Add print button to mobile list view
- [x] 3.1.6 Add print button to desktop list view
- [x] 3.1.7 Add PrintPreviewModal with PurchaseOrderPrint component
- [x] 3.1.8 Test print functionality in list view

### 3.2 Implement Purchase Order Main View Print
- [x] 3.2.1 Add print state management to `app/purchase-orders/poMain/component.tsx`
- [x] 3.2.2 Import PrintPreviewModal and PurchaseOrderPrint
- [x] 3.2.3 Implement `fetchDataForPrint` handler (reuse from list)
- [x] 3.2.4 Add print button to header (edit mode only)
- [x] 3.2.5 Add PrintPreviewModal with PurchaseOrderPrint component
- [x] 3.2.6 Test print functionality in main view

## Phase 4: Purchase Receipt Module

### 4.1 Implement Purchase Receipt List View Print
- [-] 4.1.1 Add print state management to `app/purchase-receipts/prList/component.tsx`
- [ ] 4.1.2 Import PrintPreviewModal, PurchaseReceiptPrint, and Printer icon
- [ ] 4.1.3 Implement `fetchDataForPrint` handler with supplier address resolution
- [ ] 4.1.4 Implement `handlePrint` handler with event propagation control
- [ ] 4.1.5 Add print button to mobile list view
- [ ] 4.1.6 Add print button to desktop list view
- [ ] 4.1.7 Add PrintPreviewModal with PurchaseReceiptPrint component
- [ ] 4.1.8 Test print functionality in list view

### 4.2 Implement Purchase Receipt Main View Print
- [ ] 4.2.1 Add print state management to `app/purchase-receipts/prMain/component.tsx`
- [ ] 4.2.2 Import PrintPreviewModal and PurchaseReceiptPrint
- [ ] 4.2.3 Implement `fetchDataForPrint` handler (reuse from list)
- [ ] 4.2.4 Add print button to header (edit mode only)
- [ ] 4.2.5 Add PrintPreviewModal with PurchaseReceiptPrint component
- [ ] 4.2.6 Test print functionality in main view

## Phase 5: Purchase Invoice Module

### 5.1 Implement Purchase Invoice List View Print
- [ ] 5.1.1 Add print state management to `app/purchase-invoice/piList/component.tsx`
- [ ] 5.1.2 Import PrintPreviewModal, PurchaseInvoicePrint, and Printer icon
- [ ] 5.1.3 Implement `fetchDataForPrint` handler with supplier address resolution
- [ ] 5.1.4 Implement `handlePrint` handler with event propagation control
- [ ] 5.1.5 Add print button to mobile list view
- [ ] 5.1.6 Add print button to desktop list view
- [ ] 5.1.7 Add PrintPreviewModal with PurchaseInvoicePrint component
- [ ] 5.1.8 Test print functionality in list view

### 5.2 Implement Purchase Invoice Main View Print
- [ ] 5.2.1 Add print state management to `app/purchase-invoice/piMain/component.tsx`
- [ ] 5.2.2 Import PrintPreviewModal and PurchaseInvoicePrint
- [ ] 5.2.3 Implement `fetchDataForPrint` handler (reuse from list)
- [ ] 5.2.4 Add print button to header (edit mode only)
- [ ] 5.2.5 Add PrintPreviewModal with PurchaseInvoicePrint component
- [ ] 5.2.6 Test print functionality in main view

## Phase 6: Testing and Validation

### 6.1 Unit Testing
- [ ] 6.1.1 Write unit tests for Delivery Note print handlers
- [ ] 6.1.2 Write unit tests for Sales Invoice print handlers
- [ ] 6.1.3 Write unit tests for Purchase Order print handlers
- [ ] 6.1.4 Write unit tests for Purchase Receipt print handlers
- [ ] 6.1.5 Write unit tests for Purchase Invoice print handlers
- [ ] 6.1.6 Verify all unit tests pass

### 6.2 Property-Based Testing
- [ ] 6.2.1 Write property test for print button availability (Property 1)
- [ ] 6.2.2 Write property test for data fetching completeness (Property 2)
- [ ] 6.2.3 Write property test for address field resolution (Property 3)
- [ ] 6.2.4 Write property test for modal display (Property 4)
- [ ] 6.2.5 Write property test for error handling (Property 7)
- [ ] 6.2.6 Write property test for event propagation (Property 8)
- [ ] 6.2.7 Configure all property tests to run 100+ iterations
- [ ] 6.2.8 Verify all property tests pass

### 6.3 Integration Testing
- [ ] 6.3.1 Test complete print flow for Delivery Note
- [ ] 6.3.2 Test complete print flow for Sales Invoice
- [ ] 6.3.3 Test complete print flow for Purchase Order
- [ ] 6.3.4 Test complete print flow for Purchase Receipt
- [ ] 6.3.5 Test complete print flow for Purchase Invoice
- [ ] 6.3.6 Test address fetching fallback logic for all modules
- [ ] 6.3.7 Test error scenarios for all modules

### 6.4 Manual Testing
- [ ] 6.4.1 Complete manual testing checklist for Delivery Note
- [ ] 6.4.2 Complete manual testing checklist for Sales Invoice
- [ ] 6.4.3 Complete manual testing checklist for Purchase Order
- [ ] 6.4.4 Complete manual testing checklist for Purchase Receipt
- [ ] 6.4.5 Complete manual testing checklist for Purchase Invoice
- [ ] 6.4.6 Verify cross-module consistency
- [ ] 6.4.7 Verify performance requirements (NFR-1)

### 6.5 Code Review and Documentation
- [ ] 6.5.1 Review code for consistency across all modules
- [ ] 6.5.2 Verify no modifications to existing print components
- [ ] 6.5.3 Verify error handling implementation
- [ ] 6.5.4 Update inline code comments
- [ ] 6.5.5 Create implementation summary document
- [ ] 6.5.6 Update user documentation (if needed)

## Phase 7: Deployment and Monitoring

### 7.1 Pre-Deployment
- [ ] 7.1.1 Run full test suite
- [ ] 7.1.2 Verify build succeeds without errors
- [ ] 7.1.3 Check for TypeScript errors
- [ ] 7.1.4 Run ESLint and fix any issues
- [ ] 7.1.5 Review deployment checklist

### 7.2 Deployment
- [ ] 7.2.1 Deploy to staging environment
- [ ] 7.2.2 Smoke test all modules in staging
- [ ] 7.2.3 Deploy to production environment
- [ ] 7.2.4 Smoke test all modules in production

### 7.3 Post-Deployment Monitoring
- [ ] 7.3.1 Monitor error logs for print-related errors
- [ ] 7.3.2 Monitor API response times for print endpoints
- [ ] 7.3.3 Collect user feedback on print functionality
- [ ] 7.3.4 Address any critical issues immediately

## Notes

### Implementation Guidelines

1. **Follow the Pattern**: Each module should follow the exact same pattern as Sales Order
2. **Reuse Components**: Never modify existing print components
3. **Test Thoroughly**: Test both list and main views for each module
4. **Error Handling**: Always handle errors gracefully with user-friendly messages
5. **Performance**: Keep data fetching efficient (max 2 API calls)

### Code Review Checklist

Before marking a phase complete, verify:
- [ ] State management follows the pattern
- [ ] Handlers are implemented correctly
- [ ] Print buttons are positioned correctly
- [ ] Event propagation is controlled
- [ ] Error handling is implemented
- [ ] Loading states are shown
- [ ] PrintPreviewModal is used correctly
- [ ] Module-specific Print component is used
- [ ] No modifications to existing components
- [ ] Code is properly formatted and linted

### Testing Priorities

1. **Critical**: Print functionality works in both views
2. **Critical**: Address fetching works correctly
3. **Critical**: Error handling prevents crashes
4. **High**: Event propagation doesn't cause navigation
5. **High**: Loading states display correctly
6. **Medium**: Performance meets requirements
7. **Medium**: Accessibility requirements met

### Dependencies Between Tasks

- Phase 1 must complete before Phase 2 (establish pattern)
- Phases 2-5 can be done in parallel (same pattern)
- Phase 6 requires all implementation phases complete
- Phase 7 requires Phase 6 complete

### Estimated Effort

- Phase 1: 4-6 hours (includes pattern establishment)
- Phase 2: 2-3 hours (pattern replication)
- Phase 3: 2-3 hours (pattern replication)
- Phase 4: 2-3 hours (pattern replication)
- Phase 5: 2-3 hours (pattern replication)
- Phase 6: 6-8 hours (comprehensive testing)
- Phase 7: 2-3 hours (deployment and monitoring)

**Total Estimated Effort**: 20-28 hours

### Success Metrics

- [ ] All 10 files modified (5 modules × 2 views)
- [ ] Zero modifications to existing print components
- [ ] All manual tests pass
- [ ] All automated tests pass
- [ ] Performance requirements met
- [ ] Zero critical bugs in production
- [ ] User feedback positive
