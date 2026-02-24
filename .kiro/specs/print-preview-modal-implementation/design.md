# Design Document: Print Preview Modal Implementation

## Overview

This design document specifies the implementation of print preview functionality across five transaction modules: Delivery Note, Sales Invoice, Purchase Order, Purchase Receipt, and Purchase Invoice. The implementation follows the exact pattern established in the Sales Order module, reusing existing components (PrintPreviewModal and module-specific Print components) to provide consistent print functionality across all transaction documents.

### Scope

The feature adds print preview capabilities to both List and Main (detail/edit) views for:
- Delivery Note (Sales module)
- Sales Invoice (Sales module)
- Purchase Order (Purchase module)
- Purchase Receipt (Purchase module)
- Purchase Invoice (Purchase module)

### Design Principles

1. **Consistency**: Follow the exact pattern from Sales Order implementation
2. **Reusability**: Leverage existing PrintPreviewModal and Print components
3. **Minimal Changes**: Add only necessary state management and handlers
4. **User Experience**: Provide seamless print preview from both list and detail views

## Architecture

### Component Hierarchy

```
Module List/Main Component
├── PrintPreviewModal (reused)
│   └── [Module]Print Component (reused)
│       └── PrintLayout (reused)
└── Print Button (new)
```

### State Management Pattern

Each module (List and Main views) will implement the following state pattern:

```typescript
// Print preview state
const [showPrintPreview, setShowPrintPreview] = useState(false);
const [printData, setPrintData] = useState<any>(null);
const [loadingPrintData, setLoadingPrintData] = useState(false);
```

### Data Flow

1. User clicks Print button
2. Component fetches document data via API
3. Component fetches additional data (customer/supplier address) if needed
4. Component sets printData state
5. Component opens PrintPreviewModal
6. PrintPreviewModal renders module-specific Print component
7. Print component renders using PrintLayout

## Components and Interfaces

### Existing Components (Reused)

#### PrintPreviewModal
- **Location**: `components/print/PrintPreviewModal.tsx`
- **Purpose**: Provides modal UI with zoom, print, and PDF export controls
- **Props**: 
  - `title`: Document title
  - `onClose`: Close handler
  - `children`: Print component to render
  - `paperMode`: 'continuous' for transaction documents

#### Module Print Components
All print components already exist and will be reused:
- `DeliveryNotePrint.tsx`
- `SalesInvoicePrint.tsx`
- `PurchaseOrderPrint.tsx`
- `PurchaseReceiptPrint.tsx`
- `PurchaseInvoicePrint.tsx`

#### PrintLayout
- **Location**: `components/print/PrintLayout.tsx`
- **Purpose**: Renders transaction documents with continuous form format
- **Used by**: All module print components

### New Implementations

#### Print Button Component (Inline)

Each List and Main view will add a print button:

**List View (Mobile)**:
```tsx
<button 
  onClick={(e) => handlePrint(doc.name, e)} 
  className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" 
  title="Cetak"
>
  <Printer className="h-4 w-4" />
</button>
```

**List View (Desktop)**:
```tsx
<button 
  onClick={(e) => handlePrint(doc.name, e)} 
  className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" 
  title="Cetak"
>
  <Printer className="h-5 w-5" />
</button>
```

**Main View (Header)**:
```tsx
<button
  onClick={() => setShowPrintPreview(true)}
  className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 flex items-center gap-2"
>
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
  </svg>
  Print
</button>
```

## Data Models

### API Endpoints by Module

#### Delivery Note
- **Document API**: `/api/sales/delivery-notes/[name]`
- **Customer API**: `/api/sales/customers/customer/[name]`
- **Address Fields**: `address_display`, `customer_address`, `shipping_address_name`, `primary_address`

#### Sales Invoice
- **Document API**: `/api/sales/invoices/[name]`
- **Customer API**: `/api/sales/customers/customer/[name]`
- **Address Fields**: `address_display`, `customer_address`, `shipping_address_name`, `primary_address`

#### Purchase Order
- **Document API**: `/api/purchase/orders/[name]`
- **Supplier API**: `/api/purchase/suppliers/[name]`
- **Address Fields**: `address_display`, `supplier_address`, `shipping_address`, `primary_address`

#### Purchase Receipt
- **Document API**: `/api/purchase/receipts/[name]`
- **Supplier API**: `/api/purchase/suppliers/[name]`
- **Address Fields**: `address_display`, `supplier_address`, `shipping_address`, `primary_address`

#### Purchase Invoice
- **Document API**: `/api/purchase/invoices/[name]`
- **Supplier API**: `/api/purchase/suppliers/[name]`
- **Address Fields**: `address_display`, `supplier_address`, `shipping_address`, `primary_address`

### Data Fetching Pattern

```typescript
const fetchDataForPrint = async (docName: string) => {
  setLoadingPrintData(true);
  try {
    // 1. Fetch document data
    const response = await fetch(`/api/[module]/[docName]`);
    const result = await response.json();
    
    if (result.success) {
      const docData = result.data;
      
      // 2. Determine address field priority
      let address = docData.address_display || 
                   docData.customer_address ||  // Sales modules
                   docData.supplier_address ||  // Purchase modules
                   docData.shipping_address_name || 
                   docData.shipping_address ||
                   '';
      
      // 3. Fetch from customer/supplier if no address
      if (!address && (docData.customer || docData.supplier)) {
        try {
          const partyName = docData.customer || docData.supplier;
          const partyAPI = docData.customer 
            ? `/api/sales/customers/customer/${encodeURIComponent(partyName)}`
            : `/api/purchase/suppliers/${encodeURIComponent(partyName)}`;
          
          const partyResponse = await fetch(partyAPI);
          const partyResult = await partyResponse.json();
          
          if (partyResult.success && partyResult.data) {
            address = partyResult.data.primary_address || 
                     partyResult.data.customer_primary_address ||
                     partyResult.data.supplier_primary_address ||
                     '';
          }
        } catch (err) {
          console.error('Failed to fetch party address:', err);
        }
      }
      
      // 4. Set print data with address
      setPrintData({
        ...docData,
        customer_address: address,  // Sales modules
        supplier_address: address,  // Purchase modules
      });
    } else {
      alert('Gagal memuat data untuk print');
    }
  } catch (error) {
    console.error('Error fetching data for print:', error);
    alert('Terjadi kesalahan saat memuat data');
  } finally {
    setLoadingPrintData(false);
  }
};
```

### Print Handler Pattern

```typescript
const handlePrint = async (docName: string, e: React.MouseEvent) => {
  e.stopPropagation(); // Prevent row click in list view
  await fetchDataForPrint(docName);
  setShowPrintPreview(true);
};
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Print Button Availability

*For any* document in list or detail view, a print button should be visible and clickable regardless of document status (Draft, Submitted, Completed, Cancelled).

**Validates: Requirements 1.1, 2.1, 3.1, 4.1, 5.1**

### Property 2: Data Fetching Completeness

*For any* document print request, the system should fetch both the document data and party address data (if not already present) before displaying the print preview.

**Validates: Requirements 1.2, 2.2, 3.2, 4.2, 5.2**

### Property 3: Address Field Resolution

*For any* document with a customer or supplier, if the document's address fields are empty, the system should attempt to fetch the address from the customer/supplier master data.

**Validates: Requirements 1.3, 2.3, 3.3, 4.3, 5.3**

### Property 4: Print Preview Modal Display

*For any* successful data fetch, the PrintPreviewModal should open with the correct module-specific print component rendered inside.

**Validates: Requirements 1.4, 2.4, 3.4, 4.4, 5.4**

### Property 5: Component Reusability

*For any* module implementation, the PrintPreviewModal and module-specific Print components should be reused without modification.

**Validates: Requirements 6.1, 6.2**

### Property 6: State Management Consistency

*For any* module (List or Main view), the print state management pattern (showPrintPreview, printData, loadingPrintData) should be identical across all implementations.

**Validates: Requirements 7.1, 7.2**

### Property 7: Error Handling

*For any* failed API request during data fetching, the system should display an appropriate error message and not open the print preview modal.

**Validates: Requirements 8.1, 8.2**

### Property 8: Event Propagation Control

*For any* print button click in a list view, the click event should not trigger the row click handler (navigation to detail view).

**Validates: Requirements 9.1**

## Error Handling

### Error Scenarios

1. **Document Not Found**
   - Display: "Gagal memuat data untuk print"
   - Action: Do not open print preview

2. **Network Error**
   - Display: "Terjadi kesalahan saat memuat data"
   - Action: Log error to console, do not open print preview

3. **Party Address Fetch Failure**
   - Display: No error (graceful degradation)
   - Action: Continue with empty address, log warning to console

4. **Invalid Document Name**
   - Display: "Gagal memuat data untuk print"
   - Action: Do not open print preview

### Error Handling Implementation

```typescript
try {
  // Fetch document
  const response = await fetch(`/api/[module]/[name]`);
  const result = await response.json();
  
  if (!result.success) {
    alert('Gagal memuat data untuk print');
    return;
  }
  
  // Process data...
  
} catch (error) {
  console.error('Error fetching data for print:', error);
  alert('Terjadi kesalahan saat memuat data');
} finally {
  setLoadingPrintData(false);
}
```

## Testing Strategy

### Unit Testing

Unit tests should focus on:
1. State initialization (showPrintPreview, printData, loadingPrintData)
2. Print button rendering in different contexts (list mobile, list desktop, main view)
3. Event handler registration (handlePrint, fetchDataForPrint)
4. Error message display logic

### Property-Based Testing

Property-based tests should verify:
1. **Property 1**: Print button always renders for any document status
2. **Property 2**: Data fetching always attempts both document and address fetch
3. **Property 3**: Address resolution follows priority order for any document
4. **Property 4**: Modal opens only after successful data fetch
5. **Property 7**: Error handling prevents modal opening on any API failure
6. **Property 8**: Event propagation stops for any list view print click

**Test Configuration**:
- Minimum 100 iterations per property test
- Use fast-check or similar PBT library for TypeScript
- Tag format: **Feature: print-preview-modal-implementation, Property {number}: {property_text}**

### Integration Testing

Integration tests should verify:
1. Complete print flow from button click to modal display
2. API endpoint responses for each module
3. Address fetching fallback logic
4. PrintPreviewModal integration with Print components
5. Cross-module consistency (same pattern works for all 5 modules)

### Manual Testing Checklist

For each module (Delivery Note, Sales Invoice, Purchase Order, Purchase Receipt, Purchase Invoice):

**List View**:
- [ ] Print button visible on mobile view
- [ ] Print button visible on desktop view
- [ ] Print button click does not navigate to detail view
- [ ] Loading state displays during data fetch
- [ ] Print preview opens with correct data
- [ ] Address displays correctly (from document or party master)

**Main View**:
- [ ] Print button visible in header (edit mode only)
- [ ] Print button click opens preview
- [ ] Preview displays current document data
- [ ] Address displays correctly

**Error Cases**:
- [ ] Invalid document name shows error
- [ ] Network error shows error message
- [ ] Missing address gracefully degrades

## Implementation Plan

### Phase 1: Delivery Note Module
1. Add state management to `dnList/component.tsx`
2. Add print button to list view (mobile and desktop)
3. Implement `fetchDataForPrint` handler
4. Implement `handlePrint` handler
5. Add PrintPreviewModal with DeliveryNotePrint
6. Add state management to `dnMain/component.tsx`
7. Add print button to main view header
8. Test both views

### Phase 2: Sales Invoice Module
1. Add state management to `siList/component.tsx` (or `fjList/component.tsx`)
2. Add print button to list view
3. Implement handlers
4. Add PrintPreviewModal with SalesInvoicePrint
5. Add state management to `siMain/component.tsx` (or `fjMain/component.tsx`)
6. Add print button to main view
7. Test both views

### Phase 3: Purchase Order Module
1. Add state management to `poList/component.tsx`
2. Add print button to list view
3. Implement handlers (use supplier API)
4. Add PrintPreviewModal with PurchaseOrderPrint
5. Add state management to `poMain/component.tsx`
6. Add print button to main view
7. Test both views

### Phase 4: Purchase Receipt Module
1. Add state management to `prList/component.tsx`
2. Add print button to list view
3. Implement handlers (use supplier API)
4. Add PrintPreviewModal with PurchaseReceiptPrint
5. Add state management to `prMain/component.tsx`
6. Add print button to main view
7. Test both views

### Phase 5: Purchase Invoice Module
1. Add state management to `piList/component.tsx`
2. Add print button to list view
3. Implement handlers (use supplier API)
4. Add PrintPreviewModal with PurchaseInvoicePrint
5. Add state management to `piMain/component.tsx`
6. Add print button to main view
7. Test both views

### Phase 6: Testing and Validation
1. Run unit tests for all modules
2. Run property-based tests
3. Perform manual testing checklist
4. Verify consistency across all modules
5. Performance testing (data fetch speed)

## File Modifications Required

### Delivery Note Module
- `app/delivery-note/dnList/component.tsx` - Add print functionality to list view
- `app/delivery-note/dnMain/component.tsx` - Add print functionality to main view

### Sales Invoice Module
- `app/invoice/siList/component.tsx` (or `fjList/component.tsx`) - Add print functionality to list view
- `app/invoice/siMain/component.tsx` (or `fjMain/component.tsx`) - Add print functionality to main view

### Purchase Order Module
- `app/purchase-orders/poList/component.tsx` - Add print functionality to list view
- `app/purchase-orders/poMain/component.tsx` - Add print functionality to main view

### Purchase Receipt Module
- `app/purchase-receipts/prList/component.tsx` - Add print functionality to list view
- `app/purchase-receipts/prMain/component.tsx` - Add print functionality to main view

### Purchase Invoice Module
- `app/purchase-invoice/piList/component.tsx` - Add print functionality to list view
- `app/purchase-invoice/piMain/component.tsx` - Add print functionality to main view

**Note**: No modifications required to:
- `components/print/PrintPreviewModal.tsx` (reused as-is)
- `components/print/[Module]Print.tsx` (reused as-is)
- `components/print/PrintLayout.tsx` (reused as-is)
- `types/print.ts` (no changes needed)

## Dependencies

### External Dependencies
- `lucide-react` - For Printer icon component (already installed)
- No new dependencies required

### Internal Dependencies
- `components/print/PrintPreviewModal.tsx` - Existing component
- `components/print/DeliveryNotePrint.tsx` - Existing component
- `components/print/SalesInvoicePrint.tsx` - Existing component
- `components/print/PurchaseOrderPrint.tsx` - Existing component
- `components/print/PurchaseReceiptPrint.tsx` - Existing component
- `components/print/PurchaseInvoicePrint.tsx` - Existing component
- `components/print/PrintLayout.tsx` - Existing component
- `types/print.ts` - Existing type definitions

## Performance Considerations

### Data Fetching Optimization
1. **Lazy Loading**: Print data only fetched when print button clicked
2. **Caching**: Consider caching print data for current document in Main view
3. **Parallel Requests**: Document and address fetched sequentially (address only if needed)

### Rendering Optimization
1. **Conditional Rendering**: PrintPreviewModal only renders when showPrintPreview is true
2. **Component Reuse**: All print components already optimized for rendering

### Network Optimization
1. **Minimal Requests**: Maximum 2 API calls per print (document + optional address)
2. **Error Fast-Fail**: Stop processing on first error to avoid unnecessary requests

## Security Considerations

### Data Access
- All API endpoints require authentication (existing ERPNext auth)
- Document access controlled by ERPNext permissions
- No additional security measures needed (leveraging existing API security)

### Input Validation
- Document names validated by API endpoints
- No user input directly used in print rendering
- XSS protection handled by React's built-in escaping

## Accessibility

### Keyboard Navigation
- Print buttons accessible via Tab key
- Modal closeable via Escape key (existing PrintPreviewModal feature)

### Screen Readers
- Print buttons have descriptive `title` attributes
- Modal has appropriate ARIA labels (existing PrintPreviewModal feature)

### Visual Indicators
- Loading state shows spinner during data fetch
- Clear visual feedback for button hover states
- High contrast colors for print button icons

## Internationalization

All user-facing text in Indonesian (Bahasa Indonesia):
- Button title: "Cetak"
- Error messages: "Gagal memuat data untuk print", "Terjadi kesalahan saat memuat data"
- Modal title: "[Module Name] - [Document Number]"

## Monitoring and Logging

### Console Logging
```typescript
// Success case
console.log('Print data loaded:', { docName, hasAddress: !!address });

// Error case
console.error('Failed to fetch print data:', error);
console.error('Failed to fetch party address:', err);
```

### Debug Information
```typescript
// Address field debugging
console.log('Address fields:', {
  address_display: docData.address_display,
  customer_address: docData.customer_address,
  supplier_address: docData.supplier_address,
  shipping_address_name: docData.shipping_address_name,
  fetched_address: address,
});
```

## Future Enhancements

### Potential Improvements
1. **Print Queue**: Batch printing multiple documents
2. **Print Templates**: Multiple print format options
3. **Print History**: Track printed documents
4. **Email Integration**: Send print output via email
5. **PDF Storage**: Save generated PDFs to document attachments

### Scalability
- Pattern easily extensible to other transaction modules
- Component architecture supports custom print layouts
- API pattern supports additional data sources

## Conclusion

This design provides a comprehensive blueprint for implementing print preview functionality across five transaction modules. By following the established Sales Order pattern and reusing existing components, the implementation will be consistent, maintainable, and efficient. The design emphasizes minimal code changes, maximum reusability, and adherence to existing architectural patterns.
