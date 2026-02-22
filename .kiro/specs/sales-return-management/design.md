# Design Document: Sales Return Management

## Overview

The Sales Return Management feature enables users to process customer product returns based on previously issued delivery notes. This feature integrates seamlessly with the existing ERPNext-based ERP system architecture, following established patterns used in other sales modules (delivery notes, sales orders, invoices).

### Key Design Goals

1. **Consistency**: Follow existing module patterns (delivery-note, sales-order) for predictable user experience
2. **Data Integrity**: Maintain accurate inventory levels and proper linkage between returns and delivery notes
3. **Validation**: Prevent invalid return quantities and ensure business rule compliance
4. **Traceability**: Track return reasons and maintain complete audit trail
5. **User Experience**: Provide intuitive UI with clear feedback and error handling

### System Context

The Sales Return Management module operates within the Next.js frontend application and communicates with the ERPNext backend via REST API. It integrates with:

- **Delivery Note Module**: Source documents for returns
- **Inventory Manager**: Stock level updates
- **Customer Module**: Customer information retrieval
- **ERPNext API**: Backend data persistence and business logic

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js Frontend                         │
│                                                              │
│  ┌────────────────┐      ┌──────────────────┐              │
│  │  Sales Return  │      │  Sales Return    │              │
│  │  List Page     │◄────►│  Form Component  │              │
│  │  (page.tsx)    │      │  (srMain)        │              │
│  └────────┬───────┘      └────────┬─────────┘              │
│           │                       │                          │
│           │                       │                          │
│  ┌────────▼───────────────────────▼─────────┐              │
│  │     API Routes (/api/sales-return)       │              │
│  │  - GET /                (list)            │              │
│  │  - POST /               (create)          │              │
│  │  - GET /[name]          (detail)          │              │
│  │  - PUT /[name]          (update)          │              │
│  │  - POST /[name]/submit  (submit)          │              │
│  │  - POST /[name]/cancel  (cancel)          │              │
│  └────────────────┬─────────────────────────┘              │
│                   │                                          │
└───────────────────┼──────────────────────────────────────────┘
                    │
                    │ HTTP/REST
                    │
┌───────────────────▼──────────────────────────────────────────┐
│                  ERPNext Backend                              │
│                                                               │
│  ┌──────────────┐  ┌─────────────────┐  ┌────────────────┐ │
│  │ Sales Return │  │  Delivery Note  │  │   Inventory    │ │
│  │   DocType    │◄─┤     DocType     │  │    Manager     │ │
│  └──────┬───────┘  └─────────────────┘  └────────┬───────┘ │
│         │                                          │         │
│         └──────────────────┬───────────────────────┘         │
│                            │                                 │
│                    ┌───────▼────────┐                        │
│                    │  Stock Ledger  │                        │
│                    └────────────────┘                        │
└──────────────────────────────────────────────────────────────┘
```

### Module Structure

Following the established project structure pattern:

```
app/
├── sales-return/
│   ├── page.tsx                    # Main page (renders list)
│   ├── srList/
│   │   └── component.tsx           # List view component
│   └── srMain/
│       └── component.tsx           # Create/Edit form component
│
└── api/
    └── sales/
        └── sales-return/
            ├── route.ts            # GET (list) + POST (create)
            └── [name]/
                ├── route.ts        # GET (detail) + PUT (update)
                ├── submit/
                │   └── route.ts    # POST (submit)
                └── cancel/
                    └── route.ts    # POST (cancel)
```

### Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SalesReturnList                           │
│  - Displays paginated list of returns                        │
│  - Filters: date range, customer, status, document number    │
│  - Actions: Create new, View details, Submit draft           │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ Navigation
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                    SalesReturnMain                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Header Section                                       │   │
│  │  - Delivery Note selector (DeliveryNoteDialog)       │   │
│  │  - Customer info (read-only from DN)                 │   │
│  │  - Posting date picker                               │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Items Section                                        │   │
│  │  - Item list from selected DN                        │   │
│  │  - Quantity input with validation                    │   │
│  │  - Return reason dropdown per item                   │   │
│  │  - Additional notes for "Other" reason               │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Summary Section                                      │   │
│  │  - Total items returned                              │   │
│  │  - Total value                                       │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Actions                                              │   │
│  │  - Save (Draft)                                      │   │
│  │  - Cancel                                            │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Frontend Components

#### 1. SalesReturnList Component

**Location**: `app/sales-return/srList/component.tsx`

**Responsibilities**:
- Display paginated list of sales return documents
- Provide filtering capabilities (date range, customer, status, document number)
- Handle navigation to create/edit forms
- Display document status badges
- Provide submit action for draft returns

**State Management**:
```typescript
interface ListState {
  returns: SalesReturn[];
  loading: boolean;
  error: string;
  filters: {
    from_date: string;
    to_date: string;
    customer: string;
    status: string;
    documentNumber: string;
  };
  pagination: {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
    pageSize: number;
  };
}
```

**Key Features**:
- Real-time filtering with debounced search
- Status-based color coding (Draft: yellow, Submitted: green, Cancelled: gray)
- Responsive grid layout for mobile/desktop
- Toast notifications for success/error messages

#### 2. SalesReturnMain Component

**Location**: `app/sales-return/srMain/component.tsx`

**Responsibilities**:
- Create new return documents from delivery notes
- Edit draft return documents
- View submitted/cancelled returns (read-only)
- Validate return quantities against delivered quantities
- Capture return reasons and additional notes

**State Management**:
```typescript
interface FormState {
  formData: SalesReturnFormData;
  loading: boolean;
  error: string;
  selectedDeliveryNote: DeliveryNote | null;
  editingReturn: SalesReturn | null;
  currentStatus: string;
  showDeliveryNoteDialog: boolean;
}
```

**Validation Rules**:
- Return quantity must be > 0
- Return quantity must not exceed delivered quantity
- Return reason is required for each item
- Additional notes required when reason is "Other"
- Delivery note must be in "Submitted" status

#### 3. DeliveryNoteDialog Component

**Location**: `app/components/DeliveryNoteDialog.tsx` (new)

**Responsibilities**:
- Display searchable list of submitted delivery notes
- Filter by customer, date range, document number
- Show delivery note details (customer, date, items)
- Handle selection and pass data to parent component

**Props Interface**:
```typescript
interface DeliveryNoteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (deliveryNote: DeliveryNote) => void;
  selectedCompany: string;
  customerFilter?: string;
}
```

### API Endpoints

#### 1. List Sales Returns

**Endpoint**: `GET /api/sales-return`

**Query Parameters**:
- `limit_page_length`: number (default: 20)
- `start`: number (default: 0)
- `search`: string (customer name search)
- `documentNumber`: string (return document number)
- `status`: string (Draft | Submitted | Cancelled)
- `from_date`: string (YYYY-MM-DD)
- `to_date`: string (YYYY-MM-DD)
- `filters`: JSON string (additional ERPNext filters)

**Response**:
```typescript
{
  success: boolean;
  data: SalesReturn[];
  total_records: number;
}
```

#### 2. Create Sales Return

**Endpoint**: `POST /api/sales-return`

**Request Body**:
```typescript
{
  company: string;
  customer: string;
  posting_date: string;  // YYYY-MM-DD
  delivery_note: string;  // DN reference
  naming_series: string;  // "RET-.YYYY.-"
  items: Array<{
    item_code: string;
    item_name: string;
    qty: number;
    rate: number;
    amount: number;
    warehouse: string;
    delivery_note_item: string;  // Link to DN item
    return_reason: string;
    return_notes?: string;
  }>;
  custom_notes?: string;
}
```

**Response**:
```typescript
{
  success: boolean;
  data: {
    name: string;  // Generated return number
    status: string;
    // ... other fields
  };
}
```

#### 3. Get Sales Return Details

**Endpoint**: `GET /api/sales-return/[name]`

**Response**:
```typescript
{
  success: boolean;
  data: SalesReturn;
}
```

#### 4. Update Sales Return

**Endpoint**: `PUT /api/sales-return/[name]`

**Request Body**: Same as POST (only allowed for Draft status)

**Response**: Same as POST

#### 5. Submit Sales Return

**Endpoint**: `POST /api/sales-return/[name]/submit`

**Request Body**:
```typescript
{
  name: string;
}
```

**Response**:
```typescript
{
  success: boolean;
  data: {
    name: string;
    status: "Submitted";
  };
}
```

**Side Effects**:
- Updates inventory (increases stock quantities)
- Changes document status to "Submitted"
- Creates stock ledger entries

#### 6. Cancel Sales Return

**Endpoint**: `POST /api/sales-return/[name]/cancel`

**Request Body**:
```typescript
{
  name: string;
}
```

**Response**:
```typescript
{
  success: boolean;
  data: {
    name: string;
    status: "Cancelled";
  };
}
```

**Side Effects**:
- Reverses inventory adjustments (decreases stock quantities)
- Changes document status to "Cancelled"
- Creates reversing stock ledger entries

## Data Models

### TypeScript Type Definitions

**Location**: `types/sales-return.ts` (new file)

```typescript
/**
 * Sales Return Document
 * Represents a customer return based on a delivery note
 */
export interface SalesReturn {
  name: string;                    // Return document number (RET-YYYY-NNNNN)
  customer: string;                // Customer ID
  customer_name: string;           // Customer display name
  posting_date: string;            // Return date (YYYY-MM-DD)
  delivery_note: string;           // Reference to source delivery note
  status: 'Draft' | 'Submitted' | 'Cancelled';
  company: string;                 // Company name
  grand_total: number;             // Total value of returned items
  items: SalesReturnItem[];        // Line items
  custom_notes?: string;           // Additional notes
  creation: string;                // Creation timestamp
  modified: string;                // Last modified timestamp
  owner: string;                   // Document owner
}

/**
 * Sales Return Line Item
 */
export interface SalesReturnItem {
  name: string;                    // Item row ID
  item_code: string;               // Item code
  item_name: string;               // Item description
  qty: number;                     // Return quantity
  rate: number;                    // Unit price
  amount: number;                  // Line total (qty * rate)
  uom: string;                     // Unit of measure
  warehouse: string;               // Warehouse for stock return
  delivery_note_item: string;      // Link to DN item row
  delivered_qty: number;           // Original delivered quantity
  return_reason: ReturnReason;     // Reason for return
  return_notes?: string;           // Additional notes (required for "Other")
}

/**
 * Return Reason Enumeration
 */
export type ReturnReason = 
  | 'Damaged'
  | 'Wrong Item'
  | 'Quality Issue'
  | 'Customer Request'
  | 'Expired'
  | 'Other';

/**
 * Form Data for Creating/Editing Returns
 */
export interface SalesReturnFormData {
  customer: string;
  customer_name: string;
  posting_date: string;            // DD/MM/YYYY format for display
  delivery_note: string;
  custom_notes?: string;
  items: SalesReturnFormItem[];
}

/**
 * Form Item with Validation State
 */
export interface SalesReturnFormItem {
  item_code: string;
  item_name: string;
  qty: number;
  rate: number;
  amount: number;
  uom: string;
  warehouse: string;
  delivery_note_item: string;
  delivered_qty: number;           // For validation
  remaining_qty: number;           // Calculated: delivered - already returned
  return_reason: ReturnReason | '';
  return_notes?: string;
  selected: boolean;               // Whether item is selected for return
}

/**
 * Delivery Note (for selection dialog)
 */
export interface DeliveryNote {
  name: string;
  customer: string;
  customer_name: string;
  posting_date: string;
  status: string;
  grand_total: number;
  items: DeliveryNoteItem[];
}

/**
 * Delivery Note Item
 */
export interface DeliveryNoteItem {
  name: string;                    // Item row ID
  item_code: string;
  item_name: string;
  qty: number;
  rate: number;
  amount: number;
  uom: string;
  warehouse: string;
  stock_uom: string;
}
```

### ERPNext DocType Structure

The Sales Return will be implemented as a custom DocType in ERPNext with the following structure:

**DocType Name**: `Sales Return`

**Key Fields**:
- `name`: Primary key (auto-generated: RET-YYYY-NNNNN)
- `customer`: Link to Customer
- `customer_name`: Data (fetched from Customer)
- `posting_date`: Date
- `delivery_note`: Link to Delivery Note
- `company`: Link to Company
- `status`: Select (Draft, Submitted, Cancelled)
- `grand_total`: Currency (calculated)
- `items`: Table (Sales Return Item)
- `custom_notes`: Text

**Child Table**: `Sales Return Item`
- `item_code`: Link to Item
- `item_name`: Data
- `qty`: Float
- `rate`: Currency
- `amount`: Currency (calculated)
- `uom`: Link to UOM
- `warehouse`: Link to Warehouse
- `delivery_note_item`: Data (link to DN item row)
- `return_reason`: Select
- `return_notes`: Text

### Database Relationships

```
┌─────────────────┐
│   Customer      │
└────────┬────────┘
         │
         │ 1:N
         │
┌────────▼────────┐      ┌──────────────────┐
│ Delivery Note   │◄─────┤  Sales Return    │
└────────┬────────┘  1:N └────────┬─────────┘
         │                        │
         │ 1:N                    │ 1:N
         │                        │
┌────────▼────────┐      ┌────────▼─────────┐
│ DN Item         │      │ SR Item          │
└─────────────────┘      └──────────────────┘
         │                        │
         │                        │
         └────────────┬───────────┘
                      │
                      │ N:1
                      │
              ┌───────▼────────┐
              │   Item Master  │
              └────────────────┘
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property Reflection

After analyzing all acceptance criteria, I've identified the following redundancies and consolidations:

**Redundant Properties**:
- 8.1 and 8.3 both test for unique return numbers - consolidate into single property
- 1.1 and 1.2 both test delivery note data retrieval/display - can be combined
- 5.3, 5.4, 5.5, 5.6 all test filtering - can be consolidated into a general filtering property
- 6.2, 6.3, 6.4 all test detail display - can be consolidated into comprehensive detail display property
- 10.5, 10.6, 10.7 all test user feedback - can be consolidated into general feedback property

**Properties to Combine**:
- Return quantity validations (2.1, 2.2) can be combined into single validation property
- Status transitions (1.6, 4.5, 7.4) follow same pattern - can be generalized
- API endpoint tests (9.1-9.6) are examples of API contract, not properties

**Final Property Set**: After reflection, we have 20 unique, non-redundant properties to test.

### Correctness Properties

### Property 1: Delivery Note Data Retrieval

*For any* valid submitted Delivery Note, when selected in the return form, the system should retrieve and display all delivery note information including number, date, customer name, and all line items with their quantities, prices, and warehouses.

**Validates: Requirements 1.1, 1.2**

### Property 2: Item Selection State

*For any* item in a delivery note, the user should be able to toggle its selection state for inclusion in the return document, and the selection state should be preserved until form submission.

**Validates: Requirements 1.3**

### Property 3: Return Quantity Validation

*For any* return item, the return quantity must be greater than zero and must not exceed the originally delivered quantity from the delivery note, and attempting to save with invalid quantities should be rejected with an error message.

**Validates: Requirements 1.4, 2.1, 2.2, 2.3**

### Property 4: Remaining Quantity Calculation

*For any* delivery note item, the remaining returnable quantity should equal the delivered quantity minus the sum of all previously returned quantities for that item.

**Validates: Requirements 2.4**

### Property 5: Delivery Note Linkage

*For any* created return document, it should maintain a reference to the originating delivery note, and this reference should be retrievable when viewing the return details.

**Validates: Requirements 1.5**

### Property 6: Initial Draft Status

*For any* newly saved return document, its status should be "Draft" until explicitly submitted.

**Validates: Requirements 1.6**

### Property 7: Return Reason Selection

*For any* return item, a return reason must be selected from the predefined list ("Damaged", "Wrong Item", "Quality Issue", "Customer Request", "Expired", "Other"), and the selected reason should be stored with the item.

**Validates: Requirements 3.1, 3.4**

### Property 8: Conditional Notes Requirement

*For any* return item with reason "Other", additional text notes must be provided, and attempting to save without notes should be rejected with an error message.

**Validates: Requirements 3.3**

### Property 9: Submit API Call

*For any* draft return document, when submitted, the system should send the complete return data to the ERPNext API with all items, quantities, reasons, and metadata.

**Validates: Requirements 4.1**

### Property 10: Status Transition on Submit

*For any* draft return document, when the submit API call succeeds, the document status should change from "Draft" to "Submitted".

**Validates: Requirements 4.5**

### Property 11: Paginated List Display

*For any* collection of return documents, the list view should display them with pagination, showing return number, date, customer name, delivery note reference, status, and total items for each return.

**Validates: Requirements 5.1, 5.2**

### Property 12: List Filtering

*For any* filter criteria (date range, customer name, status, or document number), applying the filter should return only return documents that match all specified criteria.

**Validates: Requirements 5.3, 5.4, 5.5, 5.6**

### Property 13: Complete Detail Display

*For any* return document, when viewed in detail mode, the system should display all return information including linked delivery note details, customer information, all return items with their quantities, reasons, and prices, and the calculated total value.

**Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**

### Property 14: Total Value Calculation

*For any* return document, the total value should equal the sum of all item amounts (quantity × rate) across all return items.

**Validates: Requirements 6.5**

### Property 15: Delivery Note Navigation Link

*For any* return document, a navigation link to the original delivery note should be provided and should navigate to the correct delivery note detail page.

**Validates: Requirements 6.6**

### Property 16: Cancel API Call

*For any* submitted return document, when cancelled, the system should send a cancellation request to the ERPNext API with the return document name.

**Validates: Requirements 7.1**

### Property 17: Status Transition on Cancel

*For any* submitted return document, when the cancel API call succeeds, the document status should change from "Submitted" to "Cancelled".

**Validates: Requirements 7.4**

### Property 18: Unique Return Number Generation

*For any* newly created return document, the system should generate a unique return number following the pattern "RET-YYYY-NNNNN" where YYYY is the current year and NNNNN is a sequential number, and no two returns should ever have the same number.

**Validates: Requirements 8.1, 8.2, 8.3**

### Property 19: Return Number Display

*For any* return document, the return number should be prominently displayed in both the list view and detail view.

**Validates: Requirements 8.4**

### Property 20: API Error Handling

*For any* API operation that fails, the system should return an appropriate HTTP status code (4xx for client errors, 5xx for server errors) and include a user-friendly error message in the response body.

**Validates: Requirements 9.7**

### Property 21: User Feedback Display

*For any* user operation (save, submit, cancel), the system should provide visual feedback through loading indicators during processing, success toast notifications on completion, and error messages (toast or dialog) on failure.

**Validates: Requirements 10.5, 10.6, 10.7**

## Error Handling

### Error Categories

#### 1. Validation Errors

**Client-Side Validation**:
- Return quantity validation (must be > 0 and ≤ delivered quantity)
- Return reason selection (required for all items)
- Additional notes requirement (when reason is "Other")
- Delivery note selection (required)
- Date validation (posting date format and range)

**Handling Strategy**:
- Validate on blur and before form submission
- Display inline error messages below invalid fields
- Prevent form submission until all validations pass
- Use red color (#EF4444) for error states
- Provide clear, actionable error messages in Indonesian

**Example Error Messages**:
```typescript
const validationMessages = {
  qtyZero: 'Jumlah retur harus lebih dari 0',
  qtyExceeds: 'Jumlah retur melebihi jumlah yang dikirim',
  reasonRequired: 'Alasan retur harus dipilih',
  notesRequired: 'Catatan tambahan diperlukan untuk alasan "Lainnya"',
  dnRequired: 'Surat jalan harus dipilih',
  dateInvalid: 'Format tanggal tidak valid (DD/MM/YYYY)',
};
```

#### 2. API Errors

**ERPNext API Error Types**:
- Authentication errors (401)
- Authorization errors (403)
- Not found errors (404)
- Validation errors from ERPNext (400)
- Closed accounting period errors
- Inventory errors (insufficient stock for cancellation)
- Server errors (500)

**Handling Strategy**:
- Use `handleERPNextError` utility from `utils/erpnext-error-handler.ts`
- Extract user-friendly messages from ERPNext response
- Display errors using toast notifications or error dialogs
- Log detailed error information to console for debugging
- Maintain document state on error (don't clear form)

**Error Response Structure**:
```typescript
interface APIErrorResponse {
  success: false;
  message: string;
  _server_messages?: string;  // ERPNext server messages
  exc?: string;               // Exception details
  exception?: string;         // Exception message
}
```

**Error Extraction Priority**:
1. Parse `_server_messages` (most user-friendly)
2. Parse `exc` for exception details
3. Use `message` field
4. Use `exception` field
5. Default fallback message

#### 3. Network Errors

**Error Types**:
- Connection timeout
- Network unavailable
- DNS resolution failure
- CORS errors

**Handling Strategy**:
```typescript
try {
  const response = await fetch(url, options);
  // ... handle response
} catch (error) {
  console.error('Network error:', error);
  setError('Tidak dapat terhubung ke server. Periksa koneksi internet Anda.');
  // Show error toast
}
```

#### 4. State Management Errors

**Error Types**:
- Invalid state transitions (e.g., submitting a cancelled return)
- Concurrent modification conflicts
- Stale data issues

**Handling Strategy**:
- Validate state before operations
- Refresh data after errors
- Use optimistic UI updates with rollback on failure
- Display clear error messages about state conflicts

### Error Display Components

#### Toast Notifications

**Usage**: Temporary success/error messages

```typescript
// Success toast (green)
showToast('Retur berhasil disimpan', 'success');

// Error toast (red)
showToast('Gagal menyimpan retur', 'error');

// Warning toast (yellow)
showToast('Beberapa item tidak dapat diretur', 'warning');
```

#### Error Dialog

**Usage**: Critical errors requiring user acknowledgment

```typescript
<ErrorDialog
  isOpen={!!criticalError}
  title="Gagal Menyimpan Retur"
  message={criticalError}
  onClose={() => setCriticalError('')}
/>
```

#### Inline Error Messages

**Usage**: Field-level validation errors

```tsx
<div className="mt-1">
  <input
    type="number"
    value={qty}
    onChange={handleQtyChange}
    className={`border ${qtyError ? 'border-red-500' : 'border-gray-300'}`}
  />
  {qtyError && (
    <p className="mt-1 text-sm text-red-600">{qtyError}</p>
  )}
</div>
```

### Error Recovery Strategies

#### 1. Retry Logic

For transient network errors:
```typescript
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      if (response.status >= 500 && i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        continue;
      }
      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

#### 2. Form State Preservation

Preserve form data on errors:
```typescript
const [formData, setFormData] = useState<SalesReturnFormData>(() => {
  // Try to restore from sessionStorage on mount
  const saved = sessionStorage.getItem('draft-return');
  return saved ? JSON.parse(saved) : getInitialFormData();
});

// Save to sessionStorage on changes
useEffect(() => {
  sessionStorage.setItem('draft-return', JSON.stringify(formData));
}, [formData]);

// Clear on successful save
const handleSaveSuccess = () => {
  sessionStorage.removeItem('draft-return');
  // ... navigate or show success
};
```

#### 3. Graceful Degradation

Handle missing data gracefully:
```typescript
const displayCustomerName = return.customer_name || return.customer || 'Unknown Customer';
const displayTotal = return.grand_total?.toLocaleString('id-ID') || '0';
```

### Logging Strategy

**Development**:
- Log all API requests and responses
- Log validation errors
- Log state transitions

**Production**:
- Log only errors and critical events
- Sanitize sensitive data before logging
- Use structured logging format

```typescript
const logError = (context: string, error: any, metadata?: any) => {
  console.error(`[${context}]`, {
    message: error.message || error,
    stack: error.stack,
    metadata,
    timestamp: new Date().toISOString(),
  });
};
```

## Testing Strategy

### Dual Testing Approach

The Sales Return Management feature will employ both unit testing and property-based testing to ensure comprehensive coverage and correctness.

#### Unit Testing

**Purpose**: Verify specific examples, edge cases, and integration points

**Framework**: Jest + React Testing Library

**Test Categories**:

1. **Component Rendering Tests**
   - Verify components render without crashing
   - Check presence of key UI elements
   - Test conditional rendering based on state

2. **User Interaction Tests**
   - Form input handling
   - Button click handlers
   - Dialog open/close behavior
   - Navigation actions

3. **Edge Case Tests**
   - Empty delivery note (no items)
   - Single item return
   - Maximum quantity return
   - Zero quantity handling
   - Missing optional fields

4. **Integration Tests**
   - API endpoint responses
   - Error handling flows
   - State management integration
   - Toast notification triggers

**Example Unit Tests**:

```typescript
// Component rendering
describe('SalesReturnMain', () => {
  it('should render the form with all required fields', () => {
    render(<SalesReturnMain />);
    expect(screen.getByLabelText(/Surat Jalan/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Tanggal Posting/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Simpan/i })).toBeInTheDocument();
  });

  it('should display error when return quantity exceeds delivered quantity', async () => {
    const { getByLabelText, getByText } = render(<SalesReturnMain />);
    const qtyInput = getByLabelText(/Jumlah Retur/i);
    
    fireEvent.change(qtyInput, { target: { value: '150' } });
    fireEvent.blur(qtyInput);
    
    await waitFor(() => {
      expect(getByText(/melebihi jumlah yang dikirim/i)).toBeInTheDocument();
    });
  });
});

// API integration
describe('Sales Return API', () => {
  it('should create a return document with Draft status', async () => {
    const mockReturn = createMockReturn();
    const response = await fetch('/api/sales-return', {
      method: 'POST',
      body: JSON.stringify(mockReturn),
    });
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.status).toBe('Draft');
  });
});
```

#### Property-Based Testing

**Purpose**: Verify universal properties across all valid inputs

**Framework**: fast-check (JavaScript property-based testing library)

**Configuration**:
- Minimum 100 iterations per property test
- Each test tagged with reference to design property
- Tag format: `Feature: sales-return-management, Property {number}: {property_text}`

**Property Test Structure**:

```typescript
import fc from 'fast-check';

describe('Sales Return Properties', () => {
  it('Property 3: Return Quantity Validation', () => {
    fc.assert(
      fc.property(
        fc.record({
          deliveredQty: fc.integer({ min: 1, max: 1000 }),
          returnQty: fc.integer({ min: -10, max: 1100 }),
        }),
        ({ deliveredQty, returnQty }) => {
          const isValid = validateReturnQuantity(returnQty, deliveredQty);
          
          // Property: valid only if 0 < returnQty <= deliveredQty
          if (returnQty > 0 && returnQty <= deliveredQty) {
            expect(isValid).toBe(true);
          } else {
            expect(isValid).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 4: Remaining Quantity Calculation', () => {
    fc.assert(
      fc.property(
        fc.record({
          deliveredQty: fc.integer({ min: 1, max: 1000 }),
          previousReturns: fc.array(fc.integer({ min: 1, max: 100 }), { maxLength: 5 }),
        }),
        ({ deliveredQty, previousReturns }) => {
          const totalReturned = previousReturns.reduce((sum, qty) => sum + qty, 0);
          const remaining = calculateRemainingQty(deliveredQty, previousReturns);
          
          // Property: remaining = delivered - sum(previous returns)
          expect(remaining).toBe(deliveredQty - totalReturned);
          expect(remaining).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 14: Total Value Calculation', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            qty: fc.integer({ min: 1, max: 100 }),
            rate: fc.integer({ min: 100, max: 100000 }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (items) => {
          const returnDoc = createReturnWithItems(items);
          const calculatedTotal = calculateTotal(returnDoc);
          const expectedTotal = items.reduce((sum, item) => sum + (item.qty * item.rate), 0);
          
          // Property: total = sum of all (qty × rate)
          expect(calculatedTotal).toBe(expectedTotal);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 18: Unique Return Number Generation', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        async (count) => {
          const returnNumbers = new Set<string>();
          
          // Generate multiple returns
          for (let i = 0; i < count; i++) {
            const returnDoc = await createReturn(generateRandomReturnData());
            returnNumbers.add(returnDoc.name);
          }
          
          // Property: all return numbers are unique
          expect(returnNumbers.size).toBe(count);
          
          // Property: all follow naming pattern
          returnNumbers.forEach(name => {
            expect(name).toMatch(/^RET-\d{4}-\d{5}$/);
          });
        }
      ),
      { numRuns: 50 } // Fewer runs due to async operations
    );
  });
});
```

**Generators for Property Tests**:

```typescript
// Custom generators for domain objects
const arbitraryReturnReason = fc.constantFrom(
  'Damaged',
  'Wrong Item',
  'Quality Issue',
  'Customer Request',
  'Expired',
  'Other'
);

const arbitraryReturnItem = fc.record({
  item_code: fc.string({ minLength: 5, maxLength: 20 }),
  item_name: fc.string({ minLength: 10, maxLength: 100 }),
  qty: fc.integer({ min: 1, max: 100 }),
  rate: fc.integer({ min: 100, max: 1000000 }),
  delivered_qty: fc.integer({ min: 1, max: 100 }),
  return_reason: arbitraryReturnReason,
  return_notes: fc.option(fc.string({ maxLength: 200 })),
});

const arbitraryDeliveryNote = fc.record({
  name: fc.string({ minLength: 10, maxLength: 20 }),
  customer: fc.string({ minLength: 5, maxLength: 50 }),
  customer_name: fc.string({ minLength: 5, maxLength: 100 }),
  posting_date: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
  items: fc.array(arbitraryReturnItem, { minLength: 1, maxLength: 10 }),
});
```

### Test Coverage Goals

- **Unit Test Coverage**: Minimum 80% code coverage
- **Property Test Coverage**: All 21 correctness properties must have corresponding property tests
- **Integration Test Coverage**: All API endpoints must have integration tests
- **E2E Test Coverage**: Critical user flows (create return, submit return, cancel return)

### Testing Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Clarity**: Test names should clearly describe what is being tested
3. **Maintainability**: Use test helpers and factories to reduce duplication
4. **Speed**: Unit tests should run quickly; use mocks for external dependencies
5. **Reliability**: Tests should be deterministic and not flaky

### Continuous Integration

- Run all tests on every pull request
- Block merges if tests fail
- Generate and publish coverage reports
- Run property tests with higher iteration counts in CI (500+ runs)


## Implementation Approach

### Phase 1: Backend API Implementation

**Duration**: 2-3 days

**Tasks**:

1. **Create API Route Structure**
   - Create `/app/api/sales/sales-return/route.ts` for list and create operations
   - Create `/app/api/sales/sales-return/[name]/route.ts` for detail, update operations
   - Create `/app/api/sales/sales-return/[name]/submit/route.ts` for submit operation
   - Create `/app/api/sales/sales-return/[name]/cancel/route.ts` for cancel operation

2. **Implement GET /api/sales-return (List)**
   - Parse query parameters (pagination, filters, search)
   - Build ERPNext API filters
   - Handle authentication (API key priority, session fallback)
   - Extract and return data with total records
   - Implement error handling

3. **Implement POST /api/sales-return (Create)**
   - Validate request body
   - Transform frontend data to ERPNext format
   - Handle CSRF token for session auth
   - Call ERPNext API to create document
   - Return created document with generated name

4. **Implement GET /api/sales-return/[name] (Detail)**
   - Validate name parameter
   - Use ERPNext form.load.getdoc method for complete data
   - Handle authentication
   - Return document with all child tables

5. **Implement PUT /api/sales-return/[name] (Update)**
   - Validate name parameter and request body
   - Check document status (only Draft can be updated)
   - Transform and send update to ERPNext
   - Handle errors and return updated document

6. **Implement POST /api/sales-return/[name]/submit**
   - Validate name parameter
   - Call ERPNext submit method
   - Handle inventory update errors
   - Return updated document with Submitted status

7. **Implement POST /api/sales-return/[name]/cancel**
   - Validate name parameter
   - Call ERPNext cancel method
   - Handle inventory reversal errors
   - Return updated document with Cancelled status

**Testing**:
- Unit tests for each endpoint
- Integration tests with mock ERPNext responses
- Error handling tests

### Phase 2: Type Definitions

**Duration**: 1 day

**Tasks**:

1. **Create Type Definition File**
   - Create `/types/sales-return.ts`
   - Define `SalesReturn` interface
   - Define `SalesReturnItem` interface
   - Define `ReturnReason` type
   - Define `SalesReturnFormData` interface
   - Define `SalesReturnFormItem` interface
   - Define `DeliveryNote` and `DeliveryNoteItem` interfaces

2. **Export Types**
   - Add exports to type definition file
   - Document each interface with JSDoc comments

### Phase 3: Shared Components

**Duration**: 2 days

**Tasks**:

1. **Create DeliveryNoteDialog Component**
   - Create `/app/components/DeliveryNoteDialog.tsx`
   - Implement searchable delivery note list
   - Add filters (customer, date range, document number)
   - Add pagination
   - Handle selection and callback
   - Style with Tailwind CSS

2. **Enhance Existing Components** (if needed)
   - Verify LoadingSpinner works for new module
   - Verify ErrorDialog works for new module
   - Verify Pagination component works for new module
   - Verify toast notifications work for new module

**Testing**:
- Component rendering tests
- User interaction tests
- Dialog open/close tests

### Phase 4: List View Implementation

**Duration**: 2-3 days

**Tasks**:

1. **Create List Component**
   - Create `/app/sales-return/srList/component.tsx`
   - Implement state management for list data
   - Implement pagination logic
   - Implement filter controls (date range, customer, status, document number)
   - Implement search functionality
   - Display return documents in responsive grid
   - Add status badges with color coding
   - Add submit button for draft returns
   - Add navigation to detail/edit view

2. **Create Page Component**
   - Create `/app/sales-return/page.tsx`
   - Render SalesReturnList component

3. **Implement Filtering Logic**
   - Debounce search input
   - Reset pagination on filter change
   - Build query parameters for API call
   - Handle filter state in URL (optional)

4. **Implement Submit Action**
   - Add submit button for draft returns
   - Show confirmation dialog
   - Call submit API endpoint
   - Handle success/error responses
   - Refresh list after submit
   - Show toast notification

**Testing**:
- List rendering tests
- Filter functionality tests
- Pagination tests
- Submit action tests

### Phase 5: Form View Implementation

**Duration**: 3-4 days

**Tasks**:

1. **Create Form Component**
   - Create `/app/sales-return/srMain/component.tsx`
   - Implement form state management
   - Implement delivery note selection
   - Implement item list display
   - Implement quantity input with validation
   - Implement return reason dropdown
   - Implement conditional notes field
   - Implement totals calculation
   - Implement save functionality
   - Implement read-only mode for submitted/cancelled returns

2. **Implement Delivery Note Selection**
   - Add delivery note selector button
   - Open DeliveryNoteDialog on click
   - Handle delivery note selection
   - Load delivery note items into form
   - Populate customer information
   - Set default values

3. **Implement Item Management**
   - Display items from selected delivery note
   - Add checkbox for item selection
   - Add quantity input with validation
   - Add return reason dropdown
   - Add conditional notes field
   - Calculate line totals
   - Calculate document total

4. **Implement Validation**
   - Validate return quantity > 0
   - Validate return quantity ≤ delivered quantity
   - Validate return reason selected
   - Validate notes when reason is "Other"
   - Show inline error messages
   - Prevent save with validation errors

5. **Implement Save Functionality**
   - Collect form data
   - Transform to API format
   - Call create/update API endpoint
   - Handle success (show print dialog, navigate to list)
   - Handle errors (display error message, preserve form state)
   - Implement form state preservation in sessionStorage

6. **Implement Edit Mode**
   - Load return document by name from URL
   - Populate form with existing data
   - Disable editing for non-draft returns
   - Show read-only indicators

**Testing**:
- Form rendering tests
- Validation tests
- Save functionality tests
- Edit mode tests
- Error handling tests

### Phase 6: Navigation Integration

**Duration**: 1 day

**Tasks**:

1. **Add Navigation Menu Item**
   - Update `/app/components/navigation.tsx` or `/app/components/Navbar.tsx`
   - Add "Sales Returns" menu item
   - Link to `/sales-return`
   - Add appropriate icon (lucide-react)

2. **Update Delivery Note Module** (optional)
   - Add "Create Return" button on delivery note detail view
   - Link to return form with pre-selected delivery note

**Testing**:
- Navigation tests
- Link functionality tests

### Phase 7: ERPNext Backend Configuration

**Duration**: 2-3 days

**Tasks**:

1. **Create Sales Return DocType**
   - Create custom DocType "Sales Return" in ERPNext
   - Add fields: customer, posting_date, delivery_note, company, status, grand_total, custom_notes
   - Create child table "Sales Return Item"
   - Add fields to child table: item_code, item_name, qty, rate, amount, uom, warehouse, delivery_note_item, return_reason, return_notes

2. **Configure Naming Series**
   - Set naming series to "RET-.YYYY.-"
   - Configure auto-increment

3. **Add Validation Scripts**
   - Validate return quantity ≤ delivered quantity
   - Validate return reason is selected
   - Validate notes when reason is "Other"
   - Calculate line totals and document total

4. **Add Submit/Cancel Hooks**
   - On submit: create stock entries to increase inventory
   - On cancel: create reversing stock entries to decrease inventory
   - Update stock ledger

5. **Configure Permissions**
   - Set role permissions for Sales Return DocType
   - Configure workflow states if needed

**Testing**:
- DocType creation tests
- Validation tests in ERPNext
- Stock entry tests
- Permission tests

### Phase 8: Integration Testing

**Duration**: 2 days

**Tasks**:

1. **End-to-End Testing**
   - Test complete flow: select DN → create return → save → submit
   - Test edit flow: edit draft → save → submit
   - Test cancel flow: cancel submitted return
   - Test error scenarios
   - Test with various data combinations

2. **Cross-Browser Testing**
   - Test on Chrome, Firefox, Safari, Edge
   - Test responsive design on mobile devices
   - Verify all features work consistently

3. **Performance Testing**
   - Test with large delivery notes (many items)
   - Test list view with many returns
   - Verify pagination performance
   - Check API response times

**Testing**:
- E2E tests with Playwright or Cypress
- Performance benchmarks
- Cross-browser compatibility tests

### Phase 9: Documentation and Deployment

**Duration**: 1-2 days

**Tasks**:

1. **User Documentation**
   - Create user guide for sales return process
   - Document common scenarios and workflows
   - Add screenshots and examples
   - Translate to Indonesian

2. **Developer Documentation**
   - Document API endpoints
   - Document component props and interfaces
   - Add code comments
   - Update README if needed

3. **Deployment**
   - Deploy frontend changes
   - Deploy ERPNext DocType and scripts
   - Run database migrations if needed
   - Verify deployment in staging environment
   - Deploy to production

4. **Training**
   - Train users on new feature
   - Provide support during initial rollout
   - Gather feedback for improvements

### Total Estimated Duration

**8-10 weeks** (assuming 1 developer working full-time)

### Dependencies

- ERPNext backend access for DocType creation
- Access to staging environment for testing
- User feedback for requirements validation

### Risk Mitigation

1. **ERPNext API Changes**: Follow existing patterns from delivery-note module to minimize risk
2. **Inventory Errors**: Implement comprehensive error handling and rollback mechanisms
3. **Performance Issues**: Implement pagination and lazy loading from the start
4. **User Adoption**: Provide clear documentation and training

## Security Considerations

### Authentication and Authorization

1. **API Authentication**
   - Use API key authentication as primary method
   - Fall back to session-based authentication
   - Validate authentication on every API request
   - Return 401 for unauthenticated requests

2. **Authorization**
   - Verify user has permission to create/edit/submit/cancel returns
   - Check ERPNext role permissions
   - Enforce document-level permissions (users can only edit their own drafts)

3. **CSRF Protection**
   - Implement CSRF token for session-based authentication
   - Use existing CSRF utilities from `lib/csrf-protection.ts`
   - Validate CSRF token on state-changing operations (POST, PUT, DELETE)

### Input Validation and Sanitization

1. **Client-Side Validation**
   - Validate all user inputs before submission
   - Use TypeScript types for compile-time validation
   - Implement runtime validation with zod or similar library

2. **Server-Side Validation**
   - Never trust client-side validation alone
   - Validate all inputs in API routes
   - Sanitize inputs to prevent injection attacks
   - Use existing utilities from `lib/input-sanitization.ts`

3. **SQL Injection Prevention**
   - Use ERPNext ORM (no raw SQL queries)
   - Parameterize all database queries
   - Validate and sanitize filter parameters

4. **XSS Prevention**
   - Escape all user-generated content before rendering
   - Use React's built-in XSS protection (JSX escaping)
   - Sanitize HTML content if displaying rich text
   - Set appropriate Content-Security-Policy headers

### Data Protection

1. **Sensitive Data Handling**
   - Don't log sensitive data (customer details, prices)
   - Mask sensitive data in error messages
   - Use HTTPS for all API communications
   - Store API keys in environment variables, never in code

2. **Data Integrity**
   - Validate data consistency before saving
   - Use database transactions for multi-step operations
   - Implement optimistic locking to prevent concurrent modifications
   - Maintain audit trail (ERPNext handles this automatically)

3. **Access Control**
   - Implement row-level security (users can only access their company's data)
   - Filter data by company in all API queries
   - Verify user has access to referenced documents (delivery notes)

### Rate Limiting

1. **API Rate Limiting**
   - Implement rate limiting on API endpoints
   - Use sliding window algorithm
   - Return 429 (Too Many Requests) when limit exceeded
   - Configure reasonable limits (e.g., 100 requests per minute per user)

2. **Brute Force Protection**
   - Implement exponential backoff for failed operations
   - Lock accounts after multiple failed attempts
   - Use CAPTCHA for suspicious activity

### Secure Configuration

1. **Environment Variables**
   - Store all secrets in environment variables
   - Never commit `.env` files to version control
   - Use different credentials for dev/staging/production
   - Rotate API keys regularly

2. **HTTPS Enforcement**
   - Enforce HTTPS in production
   - Redirect HTTP to HTTPS
   - Use HSTS headers
   - Validate SSL certificates

3. **Dependency Security**
   - Regularly update dependencies
   - Run `npm audit` to check for vulnerabilities
   - Use Dependabot or similar for automated updates
   - Review security advisories

### Logging and Monitoring

1. **Security Logging**
   - Log all authentication attempts
   - Log all authorization failures
   - Log all data modifications
   - Log suspicious activity patterns

2. **Monitoring**
   - Monitor for unusual API usage patterns
   - Alert on repeated authentication failures
   - Monitor for SQL injection attempts
   - Track error rates and investigate spikes

3. **Log Protection**
   - Don't log sensitive data
   - Sanitize logs before storage
   - Restrict access to logs
   - Implement log rotation and retention policies

## Performance Considerations

### Frontend Performance

1. **Component Optimization**
   - Use React.memo for expensive components
   - Implement useMemo for expensive calculations
   - Use useCallback for event handlers passed to child components
   - Avoid unnecessary re-renders

2. **Code Splitting**
   - Use Next.js dynamic imports for large components
   - Lazy load DeliveryNoteDialog
   - Split vendor bundles
   - Implement route-based code splitting

3. **Asset Optimization**
   - Optimize images (use Next.js Image component)
   - Minimize CSS and JavaScript
   - Use tree shaking to remove unused code
   - Implement gzip/brotli compression

4. **Rendering Performance**
   - Use virtualization for long lists (react-window)
   - Implement pagination (20 items per page)
   - Debounce search inputs (300ms delay)
   - Use skeleton loaders for better perceived performance

### API Performance

1. **Query Optimization**
   - Request only needed fields from ERPNext
   - Use ERPNext filters to reduce data transfer
   - Implement server-side pagination
   - Cache frequently accessed data

2. **Response Optimization**
   - Compress API responses (gzip)
   - Use appropriate HTTP caching headers
   - Implement ETag for conditional requests
   - Return minimal data structures

3. **Database Performance**
   - Ensure ERPNext has proper indexes on Sales Return DocType
   - Index frequently queried fields (customer, posting_date, status)
   - Optimize ERPNext queries
   - Use database query profiling to identify slow queries

### Network Performance

1. **Request Optimization**
   - Batch multiple requests when possible
   - Use HTTP/2 for multiplexing
   - Implement request deduplication
   - Cancel pending requests on navigation

2. **Caching Strategy**
   - Cache delivery note list for 5 minutes
   - Cache customer data for 10 minutes
   - Invalidate cache on data modifications
   - Use stale-while-revalidate pattern

3. **Loading States**
   - Show loading indicators immediately
   - Implement optimistic UI updates
   - Use skeleton screens for better UX
   - Provide progress feedback for long operations

### Scalability Considerations

1. **Horizontal Scaling**
   - Design stateless API routes
   - Use session storage for temporary data
   - Avoid server-side session state
   - Support load balancing

2. **Data Volume Handling**
   - Implement efficient pagination
   - Use cursor-based pagination for large datasets
   - Limit maximum page size
   - Implement data archiving strategy

3. **Concurrent Users**
   - Handle concurrent modifications gracefully
   - Use optimistic locking
   - Implement retry logic for conflicts
   - Show clear error messages for conflicts

### Performance Monitoring

1. **Metrics to Track**
   - Page load time
   - Time to interactive
   - API response times
   - Error rates
   - User engagement metrics

2. **Monitoring Tools**
   - Use Next.js Analytics
   - Implement custom performance tracking
   - Monitor Core Web Vitals
   - Set up alerts for performance degradation

3. **Performance Budgets**
   - Set maximum bundle size (< 200KB initial load)
   - Set maximum API response time (< 500ms)
   - Set maximum page load time (< 3s)
   - Monitor and enforce budgets in CI/CD

## Accessibility Considerations

### Keyboard Navigation

1. **Focus Management**
   - Ensure all interactive elements are keyboard accessible
   - Implement logical tab order
   - Show visible focus indicators
   - Trap focus in modal dialogs

2. **Keyboard Shortcuts**
   - Implement common shortcuts (Esc to close dialogs)
   - Document keyboard shortcuts
   - Don't override browser shortcuts
   - Provide alternative mouse interactions

### Screen Reader Support

1. **Semantic HTML**
   - Use appropriate HTML elements (button, input, select)
   - Use heading hierarchy correctly (h1, h2, h3)
   - Use lists for list content
   - Use tables for tabular data

2. **ARIA Attributes**
   - Add aria-label for icon buttons
   - Use aria-describedby for error messages
   - Implement aria-live for dynamic content
   - Use aria-required for required fields

3. **Alternative Text**
   - Provide alt text for images
   - Use aria-label for icon-only buttons
   - Describe purpose, not appearance
   - Keep descriptions concise

### Visual Accessibility

1. **Color Contrast**
   - Ensure WCAG AA compliance (4.5:1 for normal text)
   - Don't rely on color alone to convey information
   - Use patterns in addition to colors
   - Test with color blindness simulators

2. **Text Sizing**
   - Use relative units (rem, em) for font sizes
   - Support browser zoom up to 200%
   - Ensure text remains readable when zoomed
   - Don't disable user zoom on mobile

3. **Visual Indicators**
   - Show loading states clearly
   - Provide visual feedback for actions
   - Use icons with text labels
   - Ensure error messages are visible

### Form Accessibility

1. **Labels and Instructions**
   - Associate labels with inputs using htmlFor
   - Provide clear instructions
   - Indicate required fields
   - Explain validation requirements

2. **Error Handling**
   - Announce errors to screen readers
   - Associate errors with fields using aria-describedby
   - Provide clear, actionable error messages
   - Focus first error field on validation failure

3. **Input Types**
   - Use appropriate input types (number, date, email)
   - Provide input masks for formatted data
   - Support autocomplete where appropriate
   - Implement clear/reset functionality

### Testing for Accessibility

1. **Automated Testing**
   - Use axe-core or similar tool
   - Run accessibility tests in CI/CD
   - Fix all critical and serious issues
   - Document known limitations

2. **Manual Testing**
   - Test with keyboard only
   - Test with screen reader (NVDA, JAWS, VoiceOver)
   - Test with browser zoom
   - Test with high contrast mode

3. **User Testing**
   - Include users with disabilities in testing
   - Gather feedback on accessibility
   - Iterate based on feedback
   - Document accessibility features

**Note**: While we strive for accessibility compliance, we cannot claim full WCAG compliance without comprehensive manual testing with assistive technologies and expert accessibility review.

## Maintenance and Support

### Ongoing Maintenance

1. **Bug Fixes**
   - Monitor error logs for issues
   - Prioritize critical bugs
   - Implement fixes with tests
   - Deploy fixes promptly

2. **Dependency Updates**
   - Update dependencies monthly
   - Test updates in staging
   - Review breaking changes
   - Update documentation

3. **Performance Monitoring**
   - Monitor performance metrics
   - Investigate performance degradation
   - Optimize slow queries
   - Implement caching improvements

### Feature Enhancements

1. **User Feedback**
   - Collect user feedback regularly
   - Prioritize enhancement requests
   - Implement high-value features
   - Communicate roadmap to users

2. **Potential Enhancements**
   - Bulk return creation from multiple delivery notes
   - Return analytics and reporting
   - Return approval workflow
   - Integration with quality inspection
   - Automated return reason suggestions based on patterns
   - Return history tracking per customer/item

### Support Strategy

1. **Documentation**
   - Maintain up-to-date user documentation
   - Create troubleshooting guides
   - Document common issues and solutions
   - Provide video tutorials

2. **Training**
   - Provide initial training for new users
   - Offer refresher training periodically
   - Create self-service training materials
   - Maintain FAQ document

3. **Support Channels**
   - Provide email support
   - Implement in-app help
   - Create support ticket system
   - Establish SLA for response times

### Backup and Recovery

1. **Data Backup**
   - ERPNext handles database backups
   - Verify backup integrity regularly
   - Test restore procedures
   - Document recovery process

2. **Disaster Recovery**
   - Maintain disaster recovery plan
   - Document recovery procedures
   - Test recovery annually
   - Keep offline backups

---

## Conclusion

This design document provides a comprehensive blueprint for implementing the Sales Return Management feature. The design follows established patterns from existing modules (delivery-note, sales-order) to ensure consistency and maintainability. The implementation approach is phased to allow for iterative development and testing, with clear milestones and deliverables.

Key design decisions:
- **Consistency**: Follow existing module patterns for predictable user experience
- **Validation**: Comprehensive client and server-side validation to ensure data integrity
- **Error Handling**: Robust error handling with user-friendly messages
- **Testing**: Dual testing approach (unit + property-based) for comprehensive coverage
- **Security**: Multiple layers of security including authentication, authorization, input validation, and CSRF protection
- **Performance**: Optimized for scalability with pagination, caching, and efficient queries
- **Accessibility**: Designed with accessibility in mind, though full WCAG compliance requires additional testing

The estimated implementation timeline is 8-10 weeks for a single developer, with the most complex phases being the form view implementation and ERPNext backend configuration. The design is flexible enough to accommodate changes based on user feedback and technical constraints discovered during implementation.

