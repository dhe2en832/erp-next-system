# Requirements Document: Print Preview Modal Implementation

## Feature Overview

Implement print preview functionality across five transaction modules (Delivery Note, Sales Invoice, Purchase Order, Purchase Receipt, Purchase Invoice) by reusing existing PrintPreviewModal and module-specific Print components, following the exact pattern established in the Sales Order module.

## Business Requirements

### Requirement 1: Delivery Note Print Preview

**User Story**: As a user, I want to print Delivery Notes from both list and detail views, so that I can generate physical copies for delivery documentation.

#### Acceptance Criteria

1.1. WHEN a user clicks the print button in Delivery Note list view THEN the system SHALL fetch the delivery note data and display the print preview modal

1.2. WHEN a user clicks the print button in Delivery Note detail view THEN the system SHALL display the print preview modal with current document data

1.3. WHEN the delivery note has no address data THEN the system SHALL attempt to fetch the customer address from the customer master

1.4. WHEN the print preview opens THEN the system SHALL display the delivery note using the DeliveryNotePrint component with continuous form format

### Requirement 2: Sales Invoice Print Preview

**User Story**: As a user, I want to print Sales Invoices from both list and detail views, so that I can generate physical copies for customer billing.

#### Acceptance Criteria

2.1. WHEN a user clicks the print button in Sales Invoice list view THEN the system SHALL fetch the invoice data and display the print preview modal

2.2. WHEN a user clicks the print button in Sales Invoice detail view THEN the system SHALL display the print preview modal with current document data

2.3. WHEN the sales invoice has no address data THEN the system SHALL attempt to fetch the customer address from the customer master

2.4. WHEN the print preview opens THEN the system SHALL display the sales invoice using the SalesInvoicePrint component with continuous form format

### Requirement 3: Purchase Order Print Preview

**User Story**: As a user, I want to print Purchase Orders from both list and detail views, so that I can generate physical copies for supplier ordering.

#### Acceptance Criteria

3.1. WHEN a user clicks the print button in Purchase Order list view THEN the system SHALL fetch the purchase order data and display the print preview modal

3.2. WHEN a user clicks the print button in Purchase Order detail view THEN the system SHALL display the print preview modal with current document data

3.3. WHEN the purchase order has no address data THEN the system SHALL attempt to fetch the supplier address from the supplier master

3.4. WHEN the print preview opens THEN the system SHALL display the purchase order using the PurchaseOrderPrint component with continuous form format

### Requirement 4: Purchase Receipt Print Preview

**User Story**: As a user, I want to print Purchase Receipts from both list and detail views, so that I can generate physical copies for goods receiving documentation.

#### Acceptance Criteria

4.1. WHEN a user clicks the print button in Purchase Receipt list view THEN the system SHALL fetch the purchase receipt data and display the print preview modal

4.2. WHEN a user clicks the print button in Purchase Receipt detail view THEN the system SHALL display the print preview modal with current document data

4.3. WHEN the purchase receipt has no address data THEN the system SHALL attempt to fetch the supplier address from the supplier master

4.4. WHEN the print preview opens THEN the system SHALL display the purchase receipt using the PurchaseReceiptPrint component with continuous form format

### Requirement 5: Purchase Invoice Print Preview

**User Story**: As a user, I want to print Purchase Invoices from both list and detail views, so that I can generate physical copies for supplier payment processing.

#### Acceptance Criteria

5.1. WHEN a user clicks the print button in Purchase Invoice list view THEN the system SHALL fetch the purchase invoice data and display the print preview modal

5.2. WHEN a user clicks the print button in Purchase Invoice detail view THEN the system SHALL display the print preview modal with current document data

5.3. WHEN the purchase invoice has no address data THEN the system SHALL attempt to fetch the supplier address from the supplier master

5.4. WHEN the print preview opens THEN the system SHALL display the purchase invoice using the PurchaseInvoicePrint component with continuous form format

### Requirement 6: Component Reusability

**User Story**: As a developer, I want to reuse existing print components without modification, so that the implementation is consistent and maintainable.

#### Acceptance Criteria

6.1. WHEN implementing print functionality for any module THEN the system SHALL reuse the existing PrintPreviewModal component without modification

6.2. WHEN implementing print functionality for any module THEN the system SHALL reuse the existing module-specific Print component (DeliveryNotePrint, SalesInvoicePrint, etc.) without modification

### Requirement 7: State Management Consistency

**User Story**: As a developer, I want consistent state management across all modules, so that the code is predictable and maintainable.

#### Acceptance Criteria

7.1. WHEN implementing print functionality for any module THEN the system SHALL use the same state management pattern (showPrintPreview, printData, loadingPrintData)

7.2. WHEN implementing print functionality for any module THEN the system SHALL use the same handler pattern (fetchDataForPrint, handlePrint)

### Requirement 8: Error Handling

**User Story**: As a user, I want clear error messages when print fails, so that I understand what went wrong.

#### Acceptance Criteria

8.1. WHEN document data fetch fails THEN the system SHALL display "Gagal memuat data untuk print" and NOT open the print preview

8.2. WHEN a network error occurs THEN the system SHALL display "Terjadi kesalahan saat memuat data" and log the error to console

### Requirement 9: User Interaction

**User Story**: As a user, I want print buttons that don't interfere with other interactions, so that I can print without accidentally navigating away.

#### Acceptance Criteria

9.1. WHEN a user clicks the print button in list view THEN the system SHALL NOT trigger the row click handler (navigation to detail view)

## Technical Requirements

### TR-1: API Endpoints

The system SHALL use the following API endpoints:

**Delivery Note**:
- Document: `/api/sales/delivery-notes/[name]`
- Customer: `/api/sales/customers/customer/[name]`

**Sales Invoice**:
- Document: `/api/sales/invoices/[name]`
- Customer: `/api/sales/customers/customer/[name]`

**Purchase Order**:
- Document: `/api/purchase/orders/[name]`
- Supplier: `/api/purchase/suppliers/[name]`

**Purchase Receipt**:
- Document: `/api/purchase/receipts/[name]`
- Supplier: `/api/purchase/suppliers/[name]`

**Purchase Invoice**:
- Document: `/api/purchase/invoices/[name]`
- Supplier: `/api/purchase/suppliers/[name]`

### TR-2: Address Field Priority

The system SHALL check address fields in the following priority order:

**Sales Modules** (Delivery Note, Sales Invoice):
1. `address_display`
2. `customer_address`
3. `shipping_address_name`
4. `primary_address` (from customer master)

**Purchase Modules** (Purchase Order, Purchase Receipt, Purchase Invoice):
1. `address_display`
2. `supplier_address`
3. `shipping_address`
4. `primary_address` (from supplier master)

### TR-3: State Management

Each module SHALL implement the following state:

```typescript
const [showPrintPreview, setShowPrintPreview] = useState(false);
const [printData, setPrintData] = useState<any>(null);
const [loadingPrintData, setLoadingPrintData] = useState(false);
```

### TR-4: Component Imports

Each module SHALL import the following components:

```typescript
import PrintPreviewModal from '../../../components/print/PrintPreviewModal';
import [Module]Print from '../../../components/print/[Module]Print';
import { Printer } from 'lucide-react';
```

### TR-5: File Modifications

The system SHALL modify the following files:

**Delivery Note**:
- `app/delivery-note/dnList/component.tsx`
- `app/delivery-note/dnMain/component.tsx`

**Sales Invoice**:
- `app/invoice/siList/component.tsx` (or `fjList/component.tsx`)
- `app/invoice/siMain/component.tsx` (or `fjMain/component.tsx`)

**Purchase Order**:
- `app/purchase-orders/poList/component.tsx`
- `app/purchase-orders/poMain/component.tsx`

**Purchase Receipt**:
- `app/purchase-receipts/prList/component.tsx`
- `app/purchase-receipts/prMain/component.tsx`

**Purchase Invoice**:
- `app/purchase-invoice/piList/component.tsx`
- `app/purchase-invoice/piMain/component.tsx`

## Non-Functional Requirements

### NFR-1: Performance

- Print data SHALL be fetched within 2 seconds under normal network conditions
- Print preview modal SHALL open within 500ms after data is loaded
- Maximum 2 API calls per print operation (document + optional address)

### NFR-2: Usability

- Print buttons SHALL be clearly visible with printer icon
- Print buttons SHALL have hover states for visual feedback
- Loading state SHALL be indicated during data fetch
- Error messages SHALL be in Indonesian (Bahasa Indonesia)

### NFR-3: Consistency

- All modules SHALL follow the exact same implementation pattern
- All modules SHALL use the same button styles and positioning
- All modules SHALL use the same error messages

### NFR-4: Maintainability

- No modifications to existing print components
- Minimal code duplication across modules
- Clear separation of concerns (data fetching, state management, rendering)

### NFR-5: Accessibility

- Print buttons SHALL be keyboard accessible (Tab navigation)
- Print buttons SHALL have descriptive title attributes
- Modal SHALL be closeable via Escape key

## Constraints

### C-1: Component Reuse

The implementation MUST reuse existing components without modification:
- PrintPreviewModal
- DeliveryNotePrint
- SalesInvoicePrint
- PurchaseOrderPrint
- PurchaseReceiptPrint
- PurchaseInvoicePrint
- PrintLayout

### C-2: Pattern Consistency

The implementation MUST follow the exact pattern from Sales Order module:
- Same state management
- Same handler structure
- Same button placement
- Same error handling

### C-3: No Breaking Changes

The implementation MUST NOT:
- Modify existing print components
- Change existing API endpoints
- Break existing functionality in list or detail views

### C-4: Technology Stack

The implementation MUST use:
- React hooks (useState)
- TypeScript
- Existing API patterns
- lucide-react for icons

## Success Criteria

The feature will be considered successful when:

1. ✅ All 5 modules have print functionality in both list and detail views
2. ✅ Print preview displays correctly with proper formatting
3. ✅ Address data is fetched and displayed correctly
4. ✅ Error handling works as specified
5. ✅ No modifications to existing print components
6. ✅ All manual testing checklist items pass
7. ✅ Code follows the established pattern consistently
8. ✅ Performance meets NFR-1 requirements

## Out of Scope

The following are explicitly out of scope for this feature:

- Modifications to PrintPreviewModal component
- Modifications to any Print component
- Modifications to PrintLayout component
- New print formats or templates
- Batch printing functionality
- Print history tracking
- Email integration
- PDF storage to document attachments
- Print queue management
- Custom print layouts per user

## Dependencies

### External Dependencies
- lucide-react (already installed)
- Next.js App Router
- React 19.2.3
- TypeScript 5

### Internal Dependencies
- Existing print components (all already exist)
- Existing API endpoints (all already exist)
- Existing type definitions (types/print.ts)

## Risks and Mitigation

### Risk 1: API Endpoint Variations
**Risk**: Different modules may have slightly different API response structures
**Mitigation**: Test with actual API responses, add defensive checks for missing fields

### Risk 2: Address Field Inconsistency
**Risk**: Address fields may vary across different document types
**Mitigation**: Implement priority-based address resolution with fallbacks

### Risk 3: Performance Issues
**Risk**: Sequential API calls may be slow
**Mitigation**: Only fetch address if not present in document, consider caching

### Risk 4: Component Compatibility
**Risk**: Existing print components may not work with all document types
**Mitigation**: All print components already exist and are tested, no modifications needed

## Approval

This requirements document should be reviewed and approved by:
- [ ] Product Owner
- [ ] Technical Lead
- [ ] UX Designer
- [ ] QA Lead

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-01-XX | System | Initial requirements document |
