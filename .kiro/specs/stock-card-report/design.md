# Design Document: Stock Card Report (Laporan Kartu Stok)

## Overview

The Stock Card Report is a comprehensive inventory tracking feature that displays detailed transaction history for items with running balance calculations. This feature integrates with the ERPNext backend to fetch stock ledger entries and presents them in a user-friendly interface with advanced filtering, export capabilities, and print functionality.

### Key Design Goals

1. **Real-time Data Accuracy**: Fetch and display current stock movement data from ERPNext Stock Ledger
2. **Performance**: Handle large datasets efficiently with pagination and debounced filtering
3. **Usability**: Provide intuitive correlated filtering with immediate visual feedback
4. **Export Flexibility**: Support multiple export formats (Excel, PDF) and print functionality
5. **Responsive Design**: Ensure usability across desktop, tablet, and mobile devices
6. **Indonesian Language**: All UI elements and messages in Bahasa Indonesia

### Technical Context

- **Frontend**: Next.js 16 App Router with React 19 and TypeScript
- **Styling**: Tailwind CSS 4 with responsive design patterns
- **Backend Integration**: ERPNext REST API via Stock Ledger Entry doctype
- **Export Libraries**: xlsx for Excel, browser print API for PDF/printing
- **State Management**: React hooks with local state and session storage for filter persistence

## Architecture

### Component Structure

```
app/
├── reports/
│   └── stock-card/
│       ├── page.tsx                    # Main report page component
│       └── print/
│           └── page.tsx                # Print-optimized view
├── api/
│   └── inventory/
│       └── reports/
│           └── stock-card/
│               └── route.ts            # API endpoint for stock ledger data
components/
└── stock-card/
    ├── StockCardFilters.tsx            # Filter panel component
    ├── StockCardTable.tsx              # Data table component
    ├── StockCardSummary.tsx            # Summary statistics component
    └── StockCardExport.tsx             # Export buttons component
lib/
└── stock-card-utils.ts                 # Utility functions for calculations
types/
└── stock-card.ts                       # TypeScript type definitions
```

### Data Flow

1. **User Interaction** → Filter changes trigger state updates
2. **State Update** → Debounced API call (300ms) with filter parameters
3. **API Request** → Next.js API route forwards to ERPNext Stock Ledger Entry API
4. **Data Processing** → Calculate running balances, enrich with party information
5. **UI Rendering** → Display paginated results with summary statistics
6. **Export/Print** → Generate formatted output from current filtered data

### ERPNext Integration

The feature integrates with ERPNext's Stock Ledger Entry doctype, which records all stock movements:

**API Endpoint**: `/api/resource/Stock Ledger Entry`

**Key Fields**:
- `posting_date`: Transaction date
- `posting_time`: Transaction time
- `item_code`: Item identifier
- `warehouse`: Warehouse name
- `actual_qty`: Quantity change (positive for in, negative for out)
- `qty_after_transaction`: Running balance (calculated by ERPNext)
- `voucher_type`: Transaction type (Sales Invoice, Purchase Receipt, etc.)
- `voucher_no`: Source document reference
- `stock_uom`: Unit of measurement
- `valuation_rate`: Item value per unit
- `stock_value_difference`: Value change

**Related Doctypes for Enrichment**:
- `Item`: For item names and descriptions
- `Customer`: For customer names in sales transactions
- `Supplier`: For supplier names in purchase transactions

## Components and Interfaces

### 1. Main Report Page (`page.tsx`)

**Responsibilities**:
- Orchestrate filter state management
- Fetch data from API with debouncing
- Manage pagination state
- Coordinate export and print actions
- Display loading and error states

**State Management**:
```typescript
interface StockCardState {
  data: StockLedgerEntry[];
  loading: boolean;
  error: string | null;
  filters: StockCardFilters;
  pagination: PaginationState;
  selectedCompany: string;
}
```

**Key Hooks**:
- `useState` for local state
- `useEffect` for data fetching and filter persistence
- `useCallback` for memoized handlers
- `useMemo` for computed values (totals, filtered data)

### 2. Filter Component (`StockCardFilters.tsx`)

**Props Interface**:
```typescript
interface StockCardFiltersProps {
  filters: StockCardFilters;
  onFilterChange: (filters: StockCardFilters) => void;
  onClear: () => void;
  onRefresh: () => void;
  items: DropdownOption[];
  warehouses: DropdownOption[];
  customers: DropdownOption[];
  suppliers: DropdownOption[];
  loading: boolean;
}
```

**Filter State**:
```typescript
interface StockCardFilters {
  dateRange: {
    from_date: string; // DD/MM/YYYY format
    to_date: string;
  };
  item_code: string;
  warehouse: string;
  customer: string;
  supplier: string;
  transaction_type: TransactionType | '';
}

type TransactionType = 
  | 'Sales Invoice'
  | 'Purchase Receipt'
  | 'Delivery Note'
  | 'Stock Entry'
  | 'Stock Reconciliation';
```

**Features**:
- Correlated filtering with immediate UI feedback
- Date range validation (end date must be after start date)
- Dropdown population from ERPNext API
- Filter persistence in sessionStorage
- Clear all filters functionality

### 3. Data Table Component (`StockCardTable.tsx`)

**Props Interface**:
```typescript
interface StockCardTableProps {
  data: StockLedgerEntry[];
  loading: boolean;
  pagination: PaginationState;
  onPageChange: (page: number) => void;
}
```

**Table Columns**:
1. Tanggal (Date) - posting_date + posting_time
2. Jenis Transaksi (Transaction Type) - voucher_type
3. No. Referensi (Reference) - voucher_no (clickable link)
4. Masuk (In) - positive actual_qty
5. Keluar (Out) - negative actual_qty (absolute value)
6. Saldo (Balance) - qty_after_transaction
7. Gudang (Warehouse) - warehouse
8. Pihak (Party) - customer/supplier name
9. Sumber/Tujuan (Source/Destination) - contextual based on transaction type

**Features**:
- Responsive table with horizontal scroll on mobile
- Color coding: green for incoming, red for outgoing
- Pagination controls (20 items per page default)
- Empty state messaging
- Loading skeleton

### 4. Summary Component (`StockCardSummary.tsx`)

**Props Interface**:
```typescript
interface StockCardSummaryProps {
  openingBalance: number;
  closingBalance: number;
  totalIn: number;
  totalOut: number;
  transactionCount: number;
  itemName: string;
  uom: string;
}
```

**Display Cards**:
- Opening Balance (Saldo Awal)
- Total Masuk (Total In)
- Total Keluar (Total Out)
- Closing Balance (Saldo Akhir)
- Total Transaksi (Transaction Count)

### 5. Export Component (`StockCardExport.tsx`)

**Props Interface**:
```typescript
interface StockCardExportProps {
  data: StockLedgerEntry[];
  filters: StockCardFilters;
  summary: SummaryData;
  onExportExcel: () => void;
  onExportPDF: () => void;
  onPrint: () => void;
  loading: boolean;
}
```

**Export Functions**:

**Excel Export**:
- Uses `xlsx` library
- Includes header with filter parameters
- Summary section at top
- Detailed transaction table
- Formatted columns with proper widths
- File naming: `Laporan_Kartu_Stok_[ItemCode]_[Date].xlsx`

**PDF Export**:
- Uses browser print API with CSS media queries
- Opens print dialog with PDF save option
- Includes company logo and report header
- Page breaks for long reports
- Footer with page numbers

**Print**:
- Opens print-optimized view in new window
- Hides UI controls (buttons, filters)
- Optimized layout for A4 paper
- Print-specific CSS

### 6. API Route (`route.ts`)

**Endpoint**: `GET /api/inventory/reports/stock-card`

**Query Parameters**:
```typescript
interface StockCardAPIParams {
  company: string;
  item_code?: string;
  warehouse?: string;
  from_date?: string; // YYYY-MM-DD
  to_date?: string;
  customer?: string;
  supplier?: string;
  transaction_type?: string;
  page?: number;
  limit?: number;
}
```

**Response Format**:
```typescript
interface StockCardAPIResponse {
  success: boolean;
  data: StockLedgerEntry[];
  summary: {
    opening_balance: number;
    closing_balance: number;
    total_in: number;
    total_out: number;
    transaction_count: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
  message?: string;
}
```

**Processing Logic**:
1. Validate required parameters (company, item_code)
2. Build ERPNext API filters from query parameters
3. Fetch Stock Ledger Entries with filters
4. Enrich data with party information (customer/supplier names)
5. Calculate summary statistics
6. Apply pagination
7. Return formatted response

**Error Handling**:
- 400: Missing required parameters
- 401: Authentication failure
- 404: No data found
- 500: Server error

## Data Models

### Stock Ledger Entry

```typescript
interface StockLedgerEntry {
  name: string;                      // ERPNext document ID
  posting_date: string;              // YYYY-MM-DD
  posting_time: string;              // HH:MM:SS
  item_code: string;
  item_name?: string;                // Enriched from Item doctype
  warehouse: string;
  actual_qty: number;                // Positive = in, Negative = out
  qty_after_transaction: number;     // Running balance
  voucher_type: TransactionType;
  voucher_no: string;
  stock_uom: string;
  valuation_rate: number;
  stock_value_difference: number;
  company: string;
  // Enriched fields
  party_type?: 'Customer' | 'Supplier';
  party_name?: string;
  source_warehouse?: string;         // For transfers
  target_warehouse?: string;         // For transfers
}
```

### Filter State

```typescript
interface StockCardFilters {
  dateRange: {
    from_date: string;               // DD/MM/YYYY
    to_date: string;
  };
  item_code: string;
  warehouse: string;
  customer: string;
  supplier: string;
  transaction_type: TransactionType | '';
}
```

### Dropdown Options

```typescript
interface DropdownOption {
  value: string;
  label: string;
}
```

### Summary Data

```typescript
interface SummaryData {
  opening_balance: number;
  closing_balance: number;
  total_in: number;
  total_out: number;
  transaction_count: number;
  item_code: string;
  item_name: string;
  uom: string;
}
```

### Pagination State

```typescript
interface PaginationState {
  current_page: number;
  page_size: number;
  total_records: number;
  total_pages: number;
}
```

## Correctness Properties


*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Chronological Transaction Ordering

*For any* item selection, all returned transactions should be sorted in chronological order by posting_date and posting_time (earliest to latest).

**Validates: Requirements 1.1**

### Property 2: Complete Transaction Field Display

*For any* transaction in the report, the rendered output should contain all required fields: transaction date, transaction type, quantity, running balance, warehouse, and party information.

**Validates: Requirements 1.2**

### Property 3: Running Balance Calculation Accuracy

*For any* sequence of transactions, the running balance at each transaction should equal the sum of all previous transaction quantities plus the current transaction quantity.

**Validates: Requirements 1.3, 1.6**

### Property 4: Transaction Direction Classification

*For any* transaction, if actual_qty is positive it should be classified and displayed as incoming (Masuk), and if actual_qty is negative it should be classified and displayed as outgoing (Keluar) with absolute value.

**Validates: Requirements 1.4**

### Property 5: Opening Balance Temporal Consistency

*For any* date range and item, the opening balance should equal the qty_after_transaction of the last transaction before the from_date, or zero if no prior transactions exist.

**Validates: Requirements 1.5**

### Property 6: All Transaction Types Included

*For any* item with transactions of types Sales Invoice, Purchase Receipt, Delivery Note, Stock Entry, or Stock Reconciliation, all these transaction types should appear in the report results when no transaction type filter is applied.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

### Property 7: Voucher Reference Presence

*For any* transaction in the report, the voucher_no field should be present and non-empty, providing a reference to the source document.

**Validates: Requirements 2.6**

### Property 8: Multiple Filter AND Logic

*For any* combination of filters applied simultaneously, the returned results should satisfy ALL filter conditions (date range AND item AND warehouse AND customer/supplier AND transaction type).

**Validates: Requirements 3.7**

### Property 9: Filter Change Triggers Data Update

*For any* filter modification, the system should trigger a new API request and update the displayed data to reflect the new filter state.

**Validates: Requirements 3.8**

### Property 10: Filter State Persistence

*For any* filter configuration set by the user, if the user navigates away and returns to the report within the same session, the filter state should be restored from sessionStorage.

**Validates: Requirements 3.9**

### Property 11: Excel Export Data Completeness

*For any* filtered dataset displayed in the report, the exported Excel file should contain all visible rows with all displayed columns (date, transaction type, reference, quantity in/out, balance, warehouse, party), matching the current filter selections.

**Validates: Requirements 4.2, 4.3, 4.4**

### Property 12: Excel File Structure

*For any* Excel export, the generated file should have properly formatted headers in the first row and reasonable column widths for readability.

**Validates: Requirements 4.5**

### Property 13: Excel Filename Pattern

*For any* Excel export, the filename should match the pattern `Laporan_Kartu_Stok_[ItemCode]_[YYYYMMDD].xlsx` where ItemCode is the selected item and date is the export date.

**Validates: Requirements 4.6**

### Property 14: PDF Export Data Completeness

*For any* filtered dataset displayed in the report, the exported PDF should contain all visible rows with all displayed columns, matching the current filter selections.

**Validates: Requirements 5.2, 5.6**

### Property 15: PDF Document Structure

*For any* PDF export, the document should include proper page layout with company logo and report title in the header, page numbers in the footer, and appropriate page breaks for multi-page reports.

**Validates: Requirements 5.3, 5.4, 5.5**

### Property 16: PDF Filename Pattern

*For any* PDF export, the filename should match the pattern `Laporan_Kartu_Stok_[ItemCode]_[YYYYMMDD].pdf` where ItemCode is the selected item and date is the export date.

**Validates: Requirements 5.7**

### Property 17: Print Page Break Insertion

*For any* print operation with more than one page of data, page breaks should be inserted at appropriate intervals to prevent table rows from being split across pages.

**Validates: Requirements 6.3**

### Property 18: Print Header Content

*For any* print output, the header should include the report title, all active filter parameters, and the generation date/time.

**Validates: Requirements 6.4**

### Property 19: Print UI Element Exclusion

*For any* print view, interactive UI elements (buttons, filter inputs, navigation) should be hidden using print-specific CSS media queries.

**Validates: Requirements 6.6**

### Property 20: API Filter Parameter Transmission

*For any* active filter state, the API request should include query parameters corresponding to all non-empty filters (item_code, warehouse, from_date, to_date, customer, supplier, transaction_type).

**Validates: Requirements 8.2**

### Property 21: Contextual Warehouse Display

*For any* transaction, the system should display source warehouse for incoming stock, destination warehouse for outgoing stock, and both warehouses for stock transfers (Stock Entry type).

**Validates: Requirements 9.1, 9.2, 9.5**

### Property 22: Party Information Display

*For any* Sales Invoice transaction, the customer name should be displayed; for any Purchase Receipt transaction, the supplier name should be displayed.

**Validates: Requirements 9.3, 9.4**

### Property 23: Missing Data Placeholder

*For any* transaction where source, destination, or party information is not available, the system should display a dash (-) or "N/A" instead of empty space or null.

**Validates: Requirements 9.6**

### Property 24: Pagination Activation Threshold

*For any* filtered dataset containing more than 100 transactions, pagination controls should be active and visible, limiting the displayed results to the configured page size.

**Validates: Requirements 11.1**

### Property 25: API Request Debouncing

*For any* rapid sequence of filter changes within 300ms, only the final filter state should trigger an API request, with intermediate changes being debounced.

**Validates: Requirements 11.3**

### Property 26: Dropdown Options Caching

*For any* dropdown data (items, warehouses, customers, suppliers), after the initial fetch, subsequent requests within the same session should retrieve data from sessionStorage cache rather than making new API calls.

**Validates: Requirements 11.4**

### Property 27: Progress Indicator Timing

*For any* operation (data fetch, export) that takes longer than 500ms, a loading indicator should be displayed to provide user feedback.

**Validates: Requirements 11.5**

### Property 28: Date Range Validation

*For any* date range input where the end date is before the start date, the system should display a validation error message and prevent the API request.

**Validates: Requirements 12.2**

### Property 29: Input Validation Before API Call

*For any* user input (dates, item selection, filters), validation should occur on the client side before constructing and sending the API request.

**Validates: Requirements 12.6**

## Error Handling

### Client-Side Error Handling

**Input Validation Errors**:
- Empty item selection: Display "Pilih item untuk melihat laporan"
- Invalid date range: Display "Tanggal akhir harus setelah tanggal awal"
- Invalid date format: Display "Format tanggal tidak valid. Gunakan DD/MM/YYYY"

**API Communication Errors**:
- Network failure: Display "Gagal terhubung ke server. Periksa koneksi internet Anda."
- Timeout: Display "Permintaan timeout. Silakan coba lagi."
- 401 Unauthorized: Redirect to login page
- 403 Forbidden: Display "Anda tidak memiliki akses ke laporan ini"
- 404 Not Found: Display "Data tidak ditemukan"
- 500 Server Error: Display "Terjadi kesalahan server. Silakan coba lagi nanti."

**Export Errors**:
- Excel generation failure: Display "Gagal membuat file Excel. Silakan coba lagi." with retry button
- PDF generation failure: Display "Gagal membuat file PDF. Silakan coba lagi." with retry button
- Browser download blocked: Display "Download diblokir oleh browser. Periksa pengaturan popup."

**Empty State Handling**:
- No transactions found: Display "Tidak ada data untuk filter yang dipilih" with suggestion to adjust filters
- No item selected: Display empty state with instruction to select an item

### Server-Side Error Handling

**API Route Error Handling** (`/api/inventory/reports/stock-card/route.ts`):

```typescript
try {
  // Validate required parameters
  if (!company || !item_code) {
    return NextResponse.json(
      { success: false, message: 'Parameter company dan item_code wajib diisi' },
      { status: 400 }
    );
  }

  // Validate date format
  if (from_date && !isValidDate(from_date)) {
    return NextResponse.json(
      { success: false, message: 'Format tanggal tidak valid' },
      { status: 400 }
    );
  }

  // Check authentication
  const headers = getAuthHeaders(request);
  if (!headers['Authorization'] && !headers['Cookie']) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Fetch data from ERPNext
  const response = await fetch(erpNextUrl, { method: 'GET', headers });
  
  if (!response.ok) {
    const errorData = await response.json();
    return NextResponse.json(
      { success: false, message: errorData.message || 'Gagal mengambil data dari ERPNext' },
      { status: response.status }
    );
  }

  // Process and return data
  const data = await response.json();
  return NextResponse.json({ success: true, data: processedData });

} catch (error) {
  console.error('Stock Card Report API Error:', error);
  return NextResponse.json(
    { success: false, message: 'Terjadi kesalahan internal server' },
    { status: 500 }
  );
}
```

**ERPNext API Error Handling**:
- Handle ERPNext-specific error responses
- Parse and translate error messages to Indonesian
- Log errors for debugging while showing user-friendly messages
- Implement retry logic for transient failures

**Data Processing Errors**:
- Handle missing or malformed data from ERPNext
- Provide default values for optional fields
- Validate data types before processing
- Handle edge cases (empty arrays, null values)

### Error Recovery Strategies

**Automatic Retry**:
- Implement exponential backoff for transient network errors
- Maximum 3 retry attempts with 1s, 2s, 4s delays
- Display retry count to user

**Graceful Degradation**:
- If item names cannot be fetched, display item codes only
- If party information is unavailable, show "N/A"
- If summary calculation fails, display table without summary cards

**User-Initiated Recovery**:
- Provide "Retry" button for failed operations
- "Refresh Data" button to manually trigger data reload
- "Clear Filters" button to reset to default state

## Testing Strategy

### Dual Testing Approach

The Stock Card Report feature requires both unit testing and property-based testing for comprehensive coverage:

**Unit Tests**: Focus on specific examples, edge cases, error conditions, and integration points
**Property Tests**: Verify universal properties across all inputs using randomized test data

Together, these approaches ensure both concrete bug detection and general correctness verification.

### Property-Based Testing

**Library**: Use `fast-check` for JavaScript/TypeScript property-based testing

**Configuration**: Each property test should run minimum 100 iterations to ensure comprehensive input coverage

**Test Tagging**: Each property test must reference its design document property using this format:
```typescript
// Feature: stock-card-report, Property 3: Running Balance Calculation Accuracy
```

**Property Test Examples**:

```typescript
// Property 3: Running Balance Calculation Accuracy
test('running balance calculation', () => {
  fc.assert(
    fc.property(
      fc.array(fc.record({
        actual_qty: fc.integer({ min: -100, max: 100 }),
        posting_date: fc.date(),
      })),
      (transactions) => {
        const sorted = transactions.sort((a, b) => 
          a.posting_date.getTime() - b.posting_date.getTime()
        );
        
        let runningBalance = 0;
        for (const txn of sorted) {
          runningBalance += txn.actual_qty;
          const calculated = calculateRunningBalance(sorted, txn);
          expect(calculated).toBe(runningBalance);
        }
      }
    ),
    { numRuns: 100 }
  );
});

// Property 8: Multiple Filter AND Logic
test('multiple filters apply AND logic', () => {
  fc.assert(
    fc.property(
      fc.array(generateStockLedgerEntry()),
      fc.record({
        warehouse: fc.option(fc.string()),
        transaction_type: fc.option(fc.constantFrom(
          'Sales Invoice', 'Purchase Receipt', 'Delivery Note'
        )),
        from_date: fc.option(fc.date()),
      }),
      (transactions, filters) => {
        const filtered = applyFilters(transactions, filters);
        
        for (const txn of filtered) {
          if (filters.warehouse) {
            expect(txn.warehouse).toBe(filters.warehouse);
          }
          if (filters.transaction_type) {
            expect(txn.voucher_type).toBe(filters.transaction_type);
          }
          if (filters.from_date) {
            expect(new Date(txn.posting_date)).toBeGreaterThanOrEqual(filters.from_date);
          }
        }
      }
    ),
    { numRuns: 100 }
  );
});

// Property 10: Filter State Persistence (Round Trip)
test('filter persistence round trip', () => {
  fc.assert(
    fc.property(
      fc.record({
        item_code: fc.string(),
        warehouse: fc.string(),
        from_date: fc.date(),
        to_date: fc.date(),
      }),
      (filters) => {
        // Save to sessionStorage
        saveFiltersToSession(filters);
        
        // Retrieve from sessionStorage
        const restored = loadFiltersFromSession();
        
        // Should match original
        expect(restored).toEqual(filters);
      }
    ),
    { numRuns: 100 }
  );
});

// Property 25: API Request Debouncing
test('filter changes are debounced', async () => {
  fc.assert(
    fc.asyncProperty(
      fc.array(fc.string(), { minLength: 5, maxLength: 10 }),
      async (filterValues) => {
        const apiCallCount = { count: 0 };
        const mockAPI = () => { apiCallCount.count++; };
        
        // Rapidly change filters
        for (const value of filterValues) {
          changeFilter(value, mockAPI);
          await sleep(50); // Less than 300ms debounce
        }
        
        // Wait for debounce to complete
        await sleep(350);
        
        // Should only call API once (for the last value)
        expect(apiCallCount.count).toBe(1);
      }
    ),
    { numRuns: 100 }
  );
});
```

### Unit Testing

**Focus Areas**:
1. Specific examples demonstrating correct behavior
2. Edge cases (empty data, single transaction, boundary dates)
3. Error conditions (API failures, invalid inputs)
4. UI interactions (button clicks, filter changes)
5. Integration points (API routes, ERPNext communication)

**Unit Test Examples**:

```typescript
// Example: Empty item selection shows message
test('displays message when no item selected', () => {
  render(<StockCardReport />);
  expect(screen.getByText('Pilih item untuk melihat laporan')).toBeInTheDocument();
});

// Example: API error displays Indonesian message
test('shows Indonesian error message on API failure', async () => {
  mockAPI.mockRejectedValue(new Error('Network error'));
  render(<StockCardReport />);
  await waitFor(() => {
    expect(screen.getByText(/Gagal terhubung ke server/)).toBeInTheDocument();
  });
});

// Example: Export button exists
test('displays export to Excel button', () => {
  render(<StockCardExport data={mockData} />);
  expect(screen.getByText('Export to Excel')).toBeInTheDocument();
});

// Example: Print dialog opens
test('opens print dialog when print button clicked', () => {
  const printSpy = jest.spyOn(window, 'print').mockImplementation();
  render(<StockCardReport />);
  fireEvent.click(screen.getByText('Cetak Laporan'));
  expect(printSpy).toHaveBeenCalled();
});

// Edge case: Single transaction
test('handles single transaction correctly', () => {
  const singleTransaction = [{ actual_qty: 10, posting_date: '2024-01-01' }];
  const result = calculateRunningBalance(singleTransaction);
  expect(result[0].qty_after_transaction).toBe(10);
});

// Edge case: Empty date range
test('validates empty date range', () => {
  const validation = validateDateRange('', '');
  expect(validation.isValid).toBe(false);
  expect(validation.message).toContain('Tanggal wajib diisi');
});

// Integration: API route returns correct format
test('API route returns expected response format', async () => {
  const response = await fetch('/api/inventory/reports/stock-card?company=Test&item_code=ITEM-001');
  const data = await response.json();
  
  expect(data).toHaveProperty('success');
  expect(data).toHaveProperty('data');
  expect(data).toHaveProperty('summary');
  expect(data).toHaveProperty('pagination');
});
```

### Test Coverage Goals

- **Unit Test Coverage**: Minimum 80% code coverage
- **Property Test Coverage**: All 29 correctness properties implemented
- **Integration Test Coverage**: All API endpoints and ERPNext interactions
- **UI Test Coverage**: All user interactions and error states
- **Responsive Test Coverage**: All breakpoints (desktop, tablet, mobile)

### Testing Tools

- **Test Runner**: Jest
- **Property Testing**: fast-check
- **React Testing**: React Testing Library
- **API Mocking**: MSW (Mock Service Worker)
- **Coverage**: Jest coverage reports

### Continuous Testing

- Run unit tests on every commit
- Run property tests on pull requests
- Run integration tests before deployment
- Monitor test execution time and optimize slow tests
- Maintain test documentation with examples

