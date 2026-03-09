# Design Document: Purchase Return and Debit Note

## Overview

This design document specifies the technical implementation for Purchase Return (Retur Pembelian) and Debit Note (Debit Memo) features in the ERPNext-based ERP system. These features enable users to return purchased goods to suppliers, following the same architectural patterns established in the sales module for Sales Return and Credit Note.

### Purpose

The Purchase Return and Debit Note modules provide:
- **Purchase Return**: Return goods from unpaid purchase receipts
- **Debit Note**: Return goods from paid purchase invoices and receive credit

### Key Differences from Sales Modules

- No commission calculations (unlike Sales Return and Credit Note)
- Supplier-focused instead of customer-focused
- Integration with purchase workflow (Purchase Receipt → Purchase Invoice)
- Debit notes reduce accounts payable instead of accounts receivable

### Design Principles

1. **Consistency**: Follow existing patterns from sales-return and credit-note modules
2. **Reusability**: Leverage shared components and utilities
3. **Maintainability**: Clear separation of concerns between UI, business logic, and API integration
4. **User Experience**: Indonesian language support with mobile-responsive design
5. **Data Integrity**: Proper validation and error handling throughout

## Architecture

### High-Level Architecture


```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (Client)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────┐      ┌──────────────────────┐        │
│  │  Purchase Return UI  │      │   Debit Note UI      │        │
│  │                      │      │                      │        │
│  │  - prList/component  │      │  - dnList/component  │        │
│  │  - prMain/component  │      │  - dnMain/component  │        │
│  │  - page.tsx          │      │  - page.tsx          │        │
│  └──────────┬───────────┘      └──────────┬───────────┘        │
│             │                               │                    │
│             └───────────┬───────────────────┘                    │
│                         │                                        │
│                         ▼                                        │
│              ┌─────────────────────┐                            │
│              │  Shared Components  │                            │
│              │                     │                            │
│              │  - LoadingSpinner   │                            │
│              │  - LoadingButton    │                            │
│              │  - ErrorDialog      │                            │
│              │  - DatePicker       │                            │
│              │  - SearchDialog     │                            │
│              └──────────┬──────────┘                            │
│                         │                                        │
└─────────────────────────┼────────────────────────────────────────┘
                          │
                          │ HTTP/HTTPS
                          │
┌─────────────────────────┼────────────────────────────────────────┐
│                         ▼                                         │
│                  Next.js API Routes                               │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  /api/purchase/purchase-return/                            │ │
│  │    - GET (list), POST (create)                             │ │
│  │    - [name]/route.ts: GET (detail), PUT (update)           │ │
│  │    - [name]/submit/route.ts: POST (submit)                 │ │
│  │    - [name]/cancel/route.ts: POST (cancel)                 │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  /api/purchase/debit-note/                                 │ │
│  │    - GET (list), POST (create)                             │ │
│  │    - [name]/route.ts: GET (detail), PUT (update)           │ │
│  │    - [name]/submit/route.ts: POST (submit)                 │ │
│  │    - [name]/cancel/route.ts: POST (cancel)                 │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│                         │                                         │
│                         │ ERPNext Client                          │
│                         ▼                                         │
│              ┌─────────────────────┐                             │
│              │   API Helpers       │                             │
│              │                     │                             │
│              │  - getERPNextClient │                             │
│              │  - errorHandler     │                             │
│              │  - authentication   │                             │
│              └──────────┬──────────┘                             │
└─────────────────────────┼────────────────────────────────────────┘
                          │
                          │ REST API
                          │
┌─────────────────────────┼────────────────────────────────────────┐
│                         ▼                                         │
│                    ERPNext Backend                                │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  - Purchase Receipt (with is_return=1)                           │
│  - Purchase Invoice (with is_return=1)                           │
│  - Stock Ledger Entry                                            │
│  - GL Entry                                                      │
│  - Accounts Payable                                              │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

### Module Structure

Following the established project structure pattern:

```
app/
├── purchase-return/
│   ├── page.tsx                    # Main page (list view)
│   ├── prList/
│   │   └── component.tsx           # List component
│   └── prMain/
│       └── component.tsx           # Create/Edit form
│
├── debit-note/
│   ├── page.tsx                    # Main page (list view)
│   ├── dnList/
│   │   └── component.tsx           # List component
│   └── dnMain/
│       └── component.tsx           # Create/Edit form
│
└── api/
    └── purchase/
        ├── purchase-return/
        │   ├── route.ts            # GET (list), POST (create)
        │   └── [name]/
        │       ├── route.ts        # GET (detail), PUT (update)
        │       ├── submit/
        │       │   └── route.ts    # POST (submit)
        │       └── cancel/
        │           └── route.ts    # POST (cancel)
        │
        └── debit-note/
            ├── route.ts            # GET (list), POST (create)
            └── [name]/
                ├── route.ts        # GET (detail), PUT (update)
                ├── submit/
                │   └── route.ts    # POST (submit)
                └── cancel/
                    └── route.ts    # POST (cancel)
```

### Data Flow

#### Purchase Return Creation Flow

```
1. User navigates to /purchase-return
2. User clicks "Create New"
3. User selects Purchase Receipt via dialog
   └─> GET /api/purchase/receipts (filtered for returnable)
4. System fetches receipt details
   └─> GET /api/purchase/receipts/{name}
5. System populates form with items
6. User selects items, enters quantities, reasons
7. User clicks "Save"
   └─> POST /api/purchase/purchase-return
       └─> ERPNext: make_purchase_return()
       └─> ERPNext: insert Purchase Receipt (is_return=1)
8. System displays success and redirects to list
```

#### Debit Note Creation Flow

```
1. User navigates to /debit-note
2. User clicks "Create New"
3. User selects Purchase Invoice via dialog
   └─> GET /api/purchase/invoices (filtered for paid)
4. System fetches invoice details
   └─> GET /api/purchase/invoices/{name}
5. System populates form with items
6. User selects items, enters quantities, reasons
7. User clicks "Save"
   └─> POST /api/purchase/debit-note
       └─> ERPNext: make_debit_note()
       └─> ERPNext: insert Purchase Invoice (is_return=1)
8. System displays success and redirects to list
```

## Components and Interfaces

### Frontend Components

#### 1. Purchase Return List Component (`prList/component.tsx`)

**Responsibilities:**
- Display paginated list of purchase returns
- Provide filtering by status, date range, supplier
- Handle search by document number or supplier name
- Navigate to detail view on row click

**Key Features:**
- Status badges with color coding (Draft: yellow, Submitted: green, Cancelled: gray)
- Responsive table with mobile scrolling
- Pagination controls
- Filter dropdowns and search input

**State Management:**
```typescript
interface ListState {
  returns: PurchaseReturn[];
  loading: boolean;
  error: string;
  filters: {
    status: string;
    fromDate: string;
    toDate: string;
    search: string;
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}
```

#### 2. Purchase Return Form Component (`prMain/component.tsx`)

**Responsibilities:**
- Create new purchase returns
- Edit draft purchase returns
- Display read-only view for submitted/cancelled returns
- Handle form validation
- Manage item selection and quantity input
- Calculate totals

**Key Features:**
- Purchase Receipt selection dialog
- Item selection with checkboxes
- Quantity validation (must not exceed remaining returnable)
- Return reason dropdown with conditional notes field
- Real-time total calculation
- Submit and cancel actions

**State Management:**
```typescript
interface FormState {
  formData: PurchaseReturnFormData;
  editingReturn: PurchaseReturn | null;
  currentStatus: string;
  loading: boolean;
  formLoading: boolean;
  error: string;
  showReceiptDialog: boolean;
  selectedReceipt: PurchaseReceipt | null;
}
```

#### 3. Debit Note List Component (`dnList/component.tsx`)

Similar to Purchase Return List but for debit notes.

#### 4. Debit Note Form Component (`dnMain/component.tsx`)

Similar to Purchase Return Form but:
- Selects Purchase Invoice instead of Purchase Receipt
- Filters for paid invoices only
- No commission calculations

### Shared Components

#### PurchaseReceiptDialog

**Purpose:** Allow users to search and select a purchase receipt for return creation

**Props:**
```typescript
interface PurchaseReceiptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (receipt: PurchaseReceipt) => void;
  selectedCompany: string;
  supplierFilter?: string;
}
```

**Features:**
- Search by document number or supplier
- Filter by supplier and date range
- Display document details (number, supplier, date, total)
- Pagination for large result sets
- Loading indicator

#### PurchaseInvoiceDialog

**Purpose:** Allow users to search and select a paid purchase invoice for debit note creation

**Props:**
```typescript
interface PurchaseInvoiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (invoice: PurchaseInvoice) => void;
  selectedCompany: string;
  supplierFilter?: string;
}
```

**Features:**
- Filter for paid invoices only
- Search and filter capabilities
- Similar UI to PurchaseReceiptDialog

### API Routes

#### Purchase Return API Routes

**GET /api/purchase/purchase-return**
- List purchase returns with pagination and filtering
- Query parameters: limit, start, search, status, from_date, to_date
- Returns: Array of purchase return documents

**POST /api/purchase/purchase-return**
- Create new purchase return
- Request body: PurchaseReturnFormData
- Uses ERPNext's `make_purchase_return()` method
- Returns: Created document

**GET /api/purchase/purchase-return/[name]**
- Fetch single purchase return details
- Returns: Full document with items

**PUT /api/purchase/purchase-return/[name]**
- Update draft purchase return
- Request body: Updated PurchaseReturnFormData
- Returns: Updated document

**POST /api/purchase/purchase-return/[name]/submit**
- Submit draft purchase return (docstatus 0 → 1)
- Returns: Submitted document

**POST /api/purchase/purchase-return/[name]/cancel**
- Cancel submitted purchase return (docstatus 1 → 2)
- Returns: Cancelled document

#### Debit Note API Routes

Same structure as Purchase Return but for debit notes:
- `/api/purchase/debit-note`
- `/api/purchase/debit-note/[name]`
- `/api/purchase/debit-note/[name]/submit`
- `/api/purchase/debit-note/[name]/cancel`

## Data Models

### TypeScript Interfaces

#### Purchase Return Types

```typescript
// Return reason enumeration
export type ReturnReason = 
  | 'Damaged'
  | 'Quality Issue'
  | 'Wrong Item'
  | 'Supplier Request'
  | 'Expired'
  | 'Other';

// Purchase Return document
export interface PurchaseReturn {
  name: string;
  supplier: string;
  supplier_name: string;
  posting_date: string;
  purchase_receipt: string;
  status: 'Draft' | 'Submitted' | 'Cancelled';
  company: string;
  grand_total: number;
  items: PurchaseReturnItem[];
  custom_notes?: string;
  creation: string;
  modified: string;
}

// Purchase Return item
export interface PurchaseReturnItem {
  name: string;
  item_code: string;
  item_name: string;
  qty: number;
  rate: number;
  amount: number;
  uom: string;
  warehouse: string;
  purchase_receipt_item: string;
  received_qty: number;
  return_reason: ReturnReason;
  return_notes?: string;
}

// Form data structure
export interface PurchaseReturnFormData {
  supplier: string;
  supplier_name: string;
  posting_date: string;
  purchase_receipt: string;
  custom_notes?: string;
  items: PurchaseReturnFormItem[];
}

// Form item with validation state
export interface PurchaseReturnFormItem {
  item_code: string;
  item_name: string;
  qty: number;
  rate: number;
  amount: number;
  uom: string;
  warehouse: string;
  purchase_receipt_item: string;
  received_qty: number;
  remaining_qty: number;
  return_reason: ReturnReason | '';
  return_notes?: string;
  selected: boolean;
}
```

#### Debit Note Types

```typescript
// Debit Note document (Purchase Invoice with is_return=1)
export interface DebitNote {
  name: string;
  doctype: 'Purchase Invoice';
  is_return: 1;
  return_against: string;
  supplier: string;
  supplier_name: string;
  posting_date: string;
  company: string;
  status: 'Draft' | 'Submitted' | 'Cancelled';
  docstatus: 0 | 1 | 2;
  grand_total: number;
  items: DebitNoteItem[];
  custom_return_notes?: string;
  creation: string;
  modified: string;
}

// Debit Note item
export interface DebitNoteItem {
  name: string;
  item_code: string;
  item_name: string;
  qty: number;
  rate: number;
  amount: number;
  uom: string;
  warehouse: string;
  purchase_invoice_item: string;
  received_qty: number;
  returned_qty: number;
  custom_return_reason: ReturnReason;
  custom_return_item_notes?: string;
}

// Form data structure
export interface DebitNoteFormData {
  supplier: string;
  supplier_name: string;
  posting_date: string;
  purchase_invoice: string;
  custom_notes?: string;
  items: DebitNoteFormItem[];
}

// Form item with validation state
export interface DebitNoteFormItem {
  item_code: string;
  item_name: string;
  qty: number;
  rate: number;
  amount: number;
  uom: string;
  warehouse: string;
  purchase_invoice_item: string;
  received_qty: number;
  returned_qty: number;
  remaining_qty: number;
  return_reason: ReturnReason | '';
  return_notes?: string;
  selected: boolean;
}
```

### ERPNext Document Structure

#### Purchase Return (Purchase Receipt with is_return=1)

```python
{
  "doctype": "Purchase Receipt",
  "is_return": 1,
  "return_against": "PR-00001",  # Original receipt
  "supplier": "SUP-00001",
  "posting_date": "2024-01-15",
  "company": "Company Name",
  "items": [
    {
      "item_code": "ITEM-001",
      "qty": -5,  # Negative for returns
      "rate": 100,
      "amount": -500,
      "warehouse": "Stores - CN",
      "purchase_receipt_item": "row-id",
      "return_reason": "Damaged",
      "return_item_notes": "Damaged during shipping"
    }
  ],
  "return_notes": "Overall return notes"
}
```

#### Debit Note (Purchase Invoice with is_return=1)

```python
{
  "doctype": "Purchase Invoice",
  "is_return": 1,
  "return_against": "PINV-00001",  # Original invoice
  "supplier": "SUP-00001",
  "posting_date": "2024-01-15",
  "company": "Company Name",
  "items": [
    {
      "item_code": "ITEM-001",
      "qty": -5,  # Negative for returns
      "rate": 100,
      "amount": -500,
      "warehouse": "Stores - CN",
      "purchase_invoice_item": "row-id",
      "custom_return_reason": "Quality Issue",
      "custom_return_item_notes": "Does not meet specifications"
    }
  ],
  "custom_return_notes": "Overall return notes"
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

After analyzing the acceptance criteria, I've identified the following testable properties. Note that many criteria are redundant or covered by other properties, so I've consolidated them to avoid duplication.

### Property 1: Document Selection Populates Form

*For any* valid Purchase Receipt or Purchase Invoice, when selected in the dialog, the system should fetch the document details and populate the form with supplier information and all items from that document.

**Validates: Requirements 1.4, 2.4**

### Property 2: Return Quantity Validation

*For any* return item, the system should validate that the return quantity is greater than zero and does not exceed the remaining returnable quantity (delivered quantity minus previously returned quantity).

**Validates: Requirements 1.7, 2.7, 7.3, 7.4**

### Property 3: Return Reason Required for Selected Items

*For any* selected return item, the system should require a return reason to be selected before allowing form submission.

**Validates: Requirements 1.8, 2.8, 8.2**

### Property 4: Conditional Notes Requirement

*For any* return item where the return reason is "Other", the system should require additional notes to be provided before allowing form submission.

**Validates: Requirements 1.9, 2.9, 8.3**

### Property 5: Total Amount Calculation

*For any* set of selected return items, the system should calculate the total return amount as the sum of (quantity × rate) for each selected item.

**Validates: Requirements 1.10, 2.10, 16.1, 16.2**

### Property 6: API Integration for Creation

*For any* valid return form submission, the system should send a POST request to the appropriate API endpoint (`/api/purchase/purchase-return` or `/api/purchase/debit-note`) with the correct request body structure.

**Validates: Requirements 1.11, 2.11, 12.1, 13.1**

### Property 7: API Integration for Updates

*For any* draft return document being modified, the system should send a PUT request to the appropriate API endpoint with the updated data.

**Validates: Requirements 3.8, 12.4, 13.4**

### Property 8: API Integration for Submission

*For any* draft return document being submitted, the system should send a POST request to the submit endpoint and update the document status to Submitted upon success.

**Validates: Requirements 4.3, 12.5, 13.5**

### Property 9: API Integration for Cancellation

*For any* submitted return document being cancelled, the system should send a POST request to the cancel endpoint and update the document status to Cancelled upon success.

**Validates: Requirements 5.3, 12.6, 13.6**

### Property 10: Draft Documents Are Editable

*For any* return document with Draft status, all form fields should be editable by the user.

**Validates: Requirements 3.2**

### Property 11: Submitted/Cancelled Documents Are Read-Only

*For any* return document with Submitted or Cancelled status, all form fields should be displayed in read-only mode.

**Validates: Requirements 3.3**

### Property 12: Document Detail Display

*For any* return document being viewed, the system should display the supplier name, posting date, reference document number, all return items with their quantities/rates/amounts, return reasons and notes, and the total return amount.

**Validates: Requirements 3.4, 3.5, 3.6, 3.7**

### Property 13: Conditional Button Display - Submit

*For any* return document with Draft status, the system should display a "Submit" button; for documents with Submitted or Cancelled status, the submit button should not be displayed.

**Validates: Requirements 4.1, 4.7**

### Property 14: Conditional Button Display - Cancel

*For any* return document with Submitted status, the system should display a "Cancel" button; for documents with Draft or Cancelled status, the cancel button should not be displayed.

**Validates: Requirements 5.1, 5.7**

### Property 15: List Filtering by Status

*For any* status filter value (Draft, Submitted, Cancelled), the system should return only documents matching that status when the filter is applied.

**Validates: Requirements 6.3**

### Property 16: List Filtering by Date Range

*For any* date range filter (from_date, to_date), the system should return only documents with posting dates within that range.

**Validates: Requirements 6.4, 14.4**

### Property 17: List Search Functionality

*For any* search query, the system should return documents where the supplier name or document number contains the search term.

**Validates: Requirements 6.5**

### Property 18: Status Badge Color Coding

*For any* return document in the list, the system should display a status badge with the correct color: yellow for Draft, green for Submitted, gray for Cancelled.

**Validates: Requirements 6.6**

### Property 19: Remaining Quantity Calculation

*For any* return item, the system should calculate the remaining returnable quantity as: delivered quantity minus previously returned quantity.

**Validates: Requirements 7.1, 7.2**

### Property 20: Inline Error Display for Invalid Quantity

*For any* return item with an invalid quantity (≤ 0 or > remaining quantity), the system should display an inline error message and prevent form submission.

**Validates: Requirements 7.5, 7.6**

### Property 21: Quantity Information Display

*For any* return item in the form, the system should display the delivered quantity, previously returned quantity, and remaining quantity.

**Validates: Requirements 7.7**

### Property 22: Optional Notes for Non-Other Reasons

*For any* return item where the return reason is not "Other", additional notes should be optional (not required for form submission).

**Validates: Requirements 8.4**

### Property 23: Error Handling - API Errors

*For any* failed API request, the system should parse the error response from ERPNext and display the error message to the user.

**Validates: Requirements 10.1**

### Property 24: Error Handling - Validation Errors

*For any* validation error, the system should display an inline error message next to the relevant field.

**Validates: Requirements 10.2**

### Property 25: Success Feedback

*For any* successful form submission, the system should display a success toast notification.

**Validates: Requirements 10.3**

### Property 26: Error Feedback

*For any* failed form submission, the system should display an error dialog with the error details.

**Validates: Requirements 10.4**

### Property 27: Loading State Display

*For any* API request in progress, the system should display a loading spinner and disable form buttons to prevent double-submission.

**Validates: Requirements 10.5, 10.6**

### Property 28: Network Error Handling

*For any* network error (connection failure, timeout), the system should display a user-friendly message about connectivity issues.

**Validates: Requirements 10.7**

### Property 29: Indonesian Date Format

*For any* date displayed in the UI, the system should format it as DD/MM/YYYY (Indonesian format).

**Validates: Requirements 11.2**

### Property 30: Indonesian Currency Format

*For any* monetary value displayed in the UI, the system should format it with "Rp" prefix and Indonesian number formatting.

**Validates: Requirements 11.3, 16.5**

### Property 31: Authentication in API Requests

*For any* API request, the system should include authentication credentials (cookies or headers) as required by the ERPNext API.

**Validates: Requirements 12.7, 13.7**

### Property 32: Dialog Filtering - Returnable Documents Only

*For any* document selection dialog (Purchase Receipt or Purchase Invoice), the system should only display documents that have items available for return.

**Validates: Requirements 14.5**

### Property 33: Auto-Population on Document Selection

*For any* document selected in the dialog, the system should automatically populate the supplier information and item list in the form.

**Validates: Requirements 14.6**

### Property 34: Dialog Loading Indicator

*For any* document selection dialog while fetching data, the system should display a loading indicator.

**Validates: Requirements 14.8**

### Property 35: Default Posting Date

*For any* new return document form, the posting date should default to the current date.

**Validates: Requirements 15.1**

### Property 36: Posting Date Format Validation

*For any* posting date input, the system should validate that it is in DD/MM/YYYY format and display an error message if invalid.

**Validates: Requirements 15.3, 15.5**

### Property 37: Posting Date Format Conversion

*For any* posting date being sent to the API, the system should convert it from DD/MM/YYYY display format to YYYY-MM-DD API format.

**Validates: Requirements 15.4**

### Property 38: Read-Only Posting Date for Submitted/Cancelled

*For any* return document with Submitted or Cancelled status, the posting date field should be displayed in read-only mode.

**Validates: Requirements 15.7**

### Property 39: Reactive Line Amount Calculation

*For any* return item, when the quantity is changed, the system should immediately recalculate the line amount as quantity × rate.

**Validates: Requirements 16.3**

### Property 40: Reactive Total Calculation

*For any* change to item quantities or selection, the system should immediately recalculate the total return amount.

**Validates: Requirements 16.4**

### Property 41: Selected Items Count Display

*For any* return form, the system should display the count of selected items with quantity > 0.

**Validates: Requirements 16.7**

### Property 42: Mobile Responsive Layout

*For any* viewport width, the system should render forms and lists in a responsive layout that adapts to the screen size.

**Validates: Requirements 9.1**

### Property 43: Touch-Friendly Interactive Elements

*For any* button or interactive element, the system should ensure it meets the minimum touch target size of 44x44 pixels for mobile accessibility.

**Validates: Requirements 9.3**

## Error Handling

### Error Categories

#### 1. Validation Errors

**Client-Side Validation:**
- Empty required fields (supplier, posting date, reference document)
- No items selected for return
- Return quantity ≤ 0
- Return quantity > remaining returnable quantity
- Missing return reason for selected items
- Missing notes when return reason is "Other"
- Invalid date format

**Handling Strategy:**
- Display inline error messages next to relevant fields
- Prevent form submission until all errors are resolved
- Use red border and text for error states
- Clear errors when user corrects the input

#### 2. API Errors

**ERPNext API Errors:**
- Document not found
- Insufficient permissions
- Accounting period closed
- Stock validation errors
- Duplicate document errors

**Handling Strategy:**
- Parse ERPNext error response using `handleERPNextError` utility
- Display error dialog with detailed message
- Show toast notification for user feedback
- Log errors to console for debugging

#### 3. Network Errors

**Connection Issues:**
- Request timeout
- Network unavailable
- Server unreachable

**Handling Strategy:**
- Display user-friendly message: "Gagal terhubung ke server. Silakan periksa koneksi internet Anda dan coba lagi."
- Show error dialog with retry option
- Disable form during request
- Re-enable form after error

#### 4. State Management Errors

**Concurrent Modification:**
- Document modified by another user
- Document status changed during edit

**Handling Strategy:**
- Refresh document before submission
- Display conflict message
- Offer to reload latest version

### Error Display Components

#### ErrorDialog Component

```typescript
interface ErrorDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onClose: () => void;
}
```

**Features:**
- Modal overlay
- Error icon
- Formatted error message (supports multi-line)
- Close button

#### Toast Notifications

```typescript
interface ToastProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}
```

**Features:**
- Auto-dismiss after duration
- Color-coded by type
- Positioned at top-right
- Stack multiple toasts

#### Inline Error Messages

```typescript
<div className="mt-1 text-sm text-red-600">
  {error}
</div>
```

**Features:**
- Displayed below field
- Red text color
- Small font size
- Cleared when field is corrected

### Error Recovery

#### Automatic Recovery

- Clear validation errors when user corrects input
- Retry failed API requests with exponential backoff
- Refresh stale data automatically

#### Manual Recovery

- "Retry" button for failed operations
- "Reload" button for stale data
- "Cancel" button to abandon operation

## Testing Strategy

### Dual Testing Approach

This feature will use both unit testing and property-based testing to ensure comprehensive coverage:

**Unit Tests:**
- Specific examples and edge cases
- Integration points between components
- Error conditions and boundary cases
- UI interactions and navigation

**Property Tests:**
- Universal properties across all inputs
- Validation logic with randomized data
- Calculation accuracy with varied inputs
- API integration with different payloads

### Property-Based Testing Configuration

**Library:** fast-check (JavaScript/TypeScript property-based testing library)

**Configuration:**
- Minimum 100 iterations per property test
- Each test references its design document property
- Tag format: `Feature: purchase-return-debit-note, Property {number}: {property_text}`

**Example Property Test:**

```typescript
import fc from 'fast-check';

describe('Feature: purchase-return-debit-note, Property 5: Total Amount Calculation', () => {
  it('should calculate total as sum of (qty × rate) for all selected items', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            qty: fc.float({ min: 0.01, max: 1000 }),
            rate: fc.float({ min: 0.01, max: 100000 }),
            selected: fc.boolean(),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (items) => {
          const expectedTotal = items
            .filter(item => item.selected)
            .reduce((sum, item) => sum + (item.qty * item.rate), 0);
          
          const calculatedTotal = calculateTotal(items);
          
          // Allow small floating point differences
          expect(Math.abs(calculatedTotal - expectedTotal)).toBeLessThan(0.01);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Unit Testing Focus Areas

#### Component Tests

**Purchase Return List:**
- Renders list of returns correctly
- Displays status badges with correct colors
- Handles pagination controls
- Filters by status, date range, search term
- Navigates to detail view on row click

**Purchase Return Form:**
- Renders form in create mode
- Renders form in edit mode with data
- Renders form in read-only mode for submitted/cancelled
- Validates required fields
- Validates return quantities
- Calculates totals correctly
- Handles document selection
- Submits form with correct API call

**Dialogs:**
- Purchase Receipt selection dialog displays documents
- Filters and searches work correctly
- Pagination works correctly
- Selection triggers callback with correct data

#### API Route Tests

**GET /api/purchase/purchase-return:**
- Returns list of returns
- Filters by status correctly
- Filters by date range correctly
- Searches by supplier/document number
- Paginates results correctly

**POST /api/purchase/purchase-return:**
- Creates new return with valid data
- Validates required fields
- Returns error for invalid data
- Calls ERPNext make_purchase_return method
- Returns created document

**PUT /api/purchase/purchase-return/[name]:**
- Updates draft return
- Returns error for submitted/cancelled returns
- Validates updated data

**POST /api/purchase/purchase-return/[name]/submit:**
- Submits draft return
- Returns error for non-draft returns
- Updates docstatus to 1

**POST /api/purchase/purchase-return/[name]/cancel:**
- Cancels submitted return
- Returns error for non-submitted returns
- Updates docstatus to 2

#### Utility Function Tests

**Validation Functions:**
- `validateReturnQuantity()` - validates quantity is valid
- `validateReturnReason()` - validates reason is selected
- `validateDateFormat()` - validates DD/MM/YYYY format
- `validateRequiredFields()` - validates all required fields

**Calculation Functions:**
- `calculateLineAmount()` - calculates qty × rate
- `calculateTotal()` - sums all selected items
- `calculateRemainingQty()` - calculates delivered - returned

**Format Functions:**
- `formatCurrency()` - formats as Rp X,XXX
- `formatDate()` - formats as DD/MM/YYYY
- `parseDate()` - converts DD/MM/YYYY to YYYY-MM-DD

### Integration Testing

**End-to-End Scenarios:**
1. Create purchase return from receipt
2. Edit draft purchase return
3. Submit purchase return
4. Cancel submitted purchase return
5. Create debit note from invoice
6. Filter and search returns
7. Handle API errors gracefully

### Test Data Generators

**For Property-Based Tests:**

```typescript
// Generate random return item
const returnItemArbitrary = fc.record({
  item_code: fc.string({ minLength: 5, maxLength: 20 }),
  item_name: fc.string({ minLength: 10, maxLength: 100 }),
  qty: fc.float({ min: 0.01, max: 1000 }),
  rate: fc.float({ min: 0.01, max: 100000 }),
  received_qty: fc.float({ min: 1, max: 1000 }),
  returned_qty: fc.float({ min: 0, max: 500 }),
  return_reason: fc.constantFrom('Damaged', 'Quality Issue', 'Wrong Item', 'Other'),
  selected: fc.boolean(),
});

// Generate random return document
const returnDocumentArbitrary = fc.record({
  supplier: fc.string({ minLength: 5, maxLength: 20 }),
  posting_date: fc.date({ min: new Date(2020, 0, 1), max: new Date() }),
  items: fc.array(returnItemArbitrary, { minLength: 1, maxLength: 20 }),
  status: fc.constantFrom('Draft', 'Submitted', 'Cancelled'),
});
```

### Test Coverage Goals

- **Unit Tests:** 80% code coverage minimum
- **Property Tests:** All correctness properties implemented
- **Integration Tests:** All critical user flows covered
- **Edge Cases:** All identified edge cases tested

