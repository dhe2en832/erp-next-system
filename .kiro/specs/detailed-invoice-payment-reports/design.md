# Dokumen Desain: Laporan Detail Faktur dan Pembayaran

## Overview

Fitur ini menambahkan empat laporan baru ke sistem ERP untuk memberikan visibilitas yang lebih detail terhadap transaksi faktur dan pembayaran. Setiap laporan dirancang dengan pola arsitektur yang konsisten dengan laporan existing, menggunakan komponen UI yang dapat digunakan kembali, dan mengikuti prinsip responsive design.

### Tujuan Bisnis

- Memberikan transparansi penuh terhadap detail item dalam setiap faktur penjualan dan pembelian
- Memungkinkan analisis mendalam terhadap komposisi transaksi
- Menyediakan tracking pembayaran yang komprehensif dengan referensi ke faktur terkait
- Mendukung kebutuhan audit dan dokumentasi dengan fungsi cetak yang lengkap

### Ruang Lingkup

Fitur ini mencakup:
1. Laporan Detail Penjualan Per Faktur (`/reports/sales-invoice-details`)
2. Laporan Detail Pembelian Per Faktur (`/reports/purchase-invoice-details`)
3. Laporan Pembayaran (`/reports/payment-summary`)
4. Laporan Detail Pembayaran (`/reports/payment-details`)
5. Empat API endpoint backend untuk mengambil data dari ERPNext
6. Fungsi cetak untuk semua laporan dengan format A4

## Architecture

### System Architecture

Sistem menggunakan arsitektur client-server dengan Next.js sebagai frontend dan ERPNext sebagai backend:

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (Client)                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Report Pages (React Components)                       │ │
│  │  - SalesInvoiceDetailsPage                             │ │
│  │  - PurchaseInvoiceDetailsPage                          │ │
│  │  - PaymentSummaryPage                                  │ │
│  │  - PaymentDetailsPage                                  │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Next.js Server (API Routes)                     │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  API Endpoints                                         │ │
│  │  - GET /api/finance/reports/sales-invoice-details     │ │
│  │  - GET /api/finance/reports/purchase-invoice-details  │ │
│  │  - GET /api/finance/reports/payment-summary           │ │
│  │  - GET /api/finance/reports/payment-details           │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Authentication Layer                                  │ │
│  │  - API Key (primary)                                   │ │
│  │  - Session Cookie (fallback)                           │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ REST API
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    ERPNext Backend                           │
│  - Sales Invoice DocType                                     │
│  - Purchase Invoice DocType                                  │
│  - Payment Entry DocType                                     │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Request**: Pengguna mengakses halaman laporan dengan filter tertentu
2. **Client-Side Rendering**: React component merender UI dengan loading state
3. **API Call**: Component melakukan fetch ke Next.js API route dengan parameter filter
4. **Authentication**: API route memvalidasi kredensial (API key atau session)
5. **ERPNext Query**: API route membuat query ke ERPNext REST API dengan filter
6. **Data Processing**: API route memproses response dari ERPNext
7. **Response**: Data dikembalikan ke client dalam format JSON standar
8. **Client Update**: Component memperbarui state dan merender data
9. **Pagination**: Data lengkap disimpan di window object untuk pagination frontend
10. **Print**: Saat cetak, data dikirim ke halaman print terpisah atau modal preview


### Technology Stack

- **Frontend**: Next.js 16.1.6 (App Router), React 19.2.3, TypeScript 5
- **Styling**: Tailwind CSS 4 dengan color palette: Indigo (primary), Green (success), Yellow (warning), Red (danger)
- **State Management**: React hooks (useState, useEffect, useCallback, useMemo, useRef)
- **HTTP Client**: Native fetch API dengan credentials: 'include'
- **Backend**: Next.js API Routes dengan ERPNext REST API integration
- **Authentication**: Dual authentication (API Key primary, Session fallback)

## Components and Interfaces

### Component Hierarchy

```
ReportPage (Sales/Purchase/Payment)
├── FilterSection
│   ├── BrowserStyleDatePicker (from/to date)
│   ├── SearchInput (customer/supplier/party)
│   ├── StatusSelect (invoice status)
│   ├── TypeSelect (payment type)
│   ├── ModeSelect (payment mode)
│   └── ActionButtons (Clear/Refresh)
├── SummaryCards
│   ├── TotalCountCard
│   ├── TotalAmountCard
│   ├── AverageCard
│   └── PageInfoCard
├── DataTable (Desktop)
│   ├── TableHeader
│   ├── TableBody
│   │   ├── InvoiceRow (with expandable items)
│   │   └── PaymentRow (with expandable references)
│   └── EmptyState
├── DataCards (Mobile)
│   └── ItemCard[]
├── Pagination
└── PrintPreviewModal
    └── PrintContent
```

### Shared Components

Semua komponen berikut sudah ada dan akan digunakan kembali:

1. **BrowserStyleDatePicker** (`components/BrowserStyleDatePicker.tsx`)
   - Props: `value: string`, `onChange: (value: string) => void`, `placeholder?: string`, `className?: string`
   - Format: DD/MM/YYYY untuk display, YYYY-MM-DD untuk internal
   - Features: Browser native date picker, clear button, calendar icon

2. **Pagination** (`app/components/Pagination.tsx`)
   - Props: `currentPage: number`, `totalPages: number`, `totalRecords: number`, `pageSize: number`, `onPageChange: (page: number) => void`
   - Features: Previous/Next buttons, page numbers dengan smart ellipsis, responsive

3. **PrintPreviewModal** (`components/PrintPreviewModal.tsx`)
   - Props: `title: string`, `onClose: () => void`, `children: React.ReactNode`, `paperMode?: 'continuous' | 'sheet'`, `printUrl?: string`
   - Features: Zoom controls, paper settings, print/save PDF buttons

4. **LoadingSpinner** (`app/components/LoadingSpinner.tsx`)
   - Props: `message?: string`
   - Features: Centered spinner dengan pesan loading


### New Components to Create

#### 1. SalesInvoiceDetailsPage (`app/reports/sales-invoice-details/page.tsx`)

**State Management**:
```typescript
interface SalesInvoiceWithItems {
  name: string;
  customer: string;
  customer_name?: string;
  posting_date: string;
  status: string;
  grand_total: number;
  items: SalesInvoiceItem[];
}

interface SalesInvoiceItem {
  item_code: string;
  item_name: string;
  qty: number;
  uom: string;
  rate: number;
  discount_amount: number;
  tax_amount: number;
  amount: number;
}

// State hooks
const [data, setData] = useState<SalesInvoiceWithItems[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState('');
const [selectedCompany, setSelectedCompany] = useState('');
const [fromDate, setFromDate] = useState(''); // DD/MM/YYYY
const [toDate, setToDate] = useState(''); // DD/MM/YYYY
const [filterCustomer, setFilterCustomer] = useState('');
const [filterStatus, setFilterStatus] = useState('');
const [currentPage, setCurrentPage] = useState(1);
const [expandedInvoices, setExpandedInvoices] = useState<Set<string>>(new Set());
```

**Key Features**:
- Expandable invoice rows untuk menampilkan detail items
- Frontend filtering berdasarkan customer/invoice number dan status
- Frontend pagination dengan data caching di window object
- Responsive table/card view berdasarkan breakpoint 768px
- Summary cards: Total Invoices, Total Sales, Average Invoice, Current Page


#### 2. PurchaseInvoiceDetailsPage (`app/reports/purchase-invoice-details/page.tsx`)

**State Management**:
```typescript
interface PurchaseInvoiceWithItems {
  name: string;
  supplier: string;
  supplier_name?: string;
  posting_date: string;
  status: string;
  grand_total: number;
  items: PurchaseInvoiceItem[];
}

interface PurchaseInvoiceItem {
  item_code: string;
  item_name: string;
  qty: number;
  uom: string;
  rate: number;
  discount_amount: number;
  tax_amount: number;
  amount: number;
}
```

**Key Features**: Sama seperti SalesInvoiceDetailsPage, tetapi untuk purchase invoices

#### 3. PaymentSummaryPage (`app/reports/payment-summary/page.tsx`)

**State Management**:
```typescript
interface PaymentEntry {
  name: string;
  posting_date: string;
  payment_type: 'Receive' | 'Pay';
  party_type: string;
  party: string;
  party_name?: string;
  mode_of_payment: string;
  paid_amount: number;
  status: string;
}

const [filterPaymentType, setFilterPaymentType] = useState(''); // '', 'Receive', 'Pay'
const [filterModeOfPayment, setFilterModeOfPayment] = useState('');
const [filterParty, setFilterParty] = useState('');
```

**Key Features**:
- Filter berdasarkan payment type (Receive/Pay)
- Filter berdasarkan mode of payment
- Summary cards: Total Transactions, Total Received, Total Paid, Net Balance


#### 4. PaymentDetailsPage (`app/reports/payment-details/page.tsx`)

**State Management**:
```typescript
interface PaymentWithReferences {
  name: string;
  posting_date: string;
  payment_type: 'Receive' | 'Pay';
  party_type: string;
  party: string;
  party_name?: string;
  mode_of_payment: string;
  paid_amount: number;
  status: string;
  references: PaymentReference[];
}

interface PaymentReference {
  reference_doctype: string;
  reference_name: string;
  allocated_amount: number;
  outstanding_amount: number;
}

const [expandedPayments, setExpandedPayments] = useState<Set<string>>(new Set());
```

**Key Features**:
- Expandable payment rows untuk menampilkan invoice references
- Menampilkan allocated amount dan outstanding amount per invoice
- Summary cards sama seperti PaymentSummaryPage

#### 5. Print Pages

Setiap laporan memiliki print page terpisah:
- `/reports/sales-invoice-details/print/page.tsx`
- `/reports/purchase-invoice-details/print/page.tsx`
- `/reports/payment-summary/print/page.tsx`
- `/reports/payment-details/print/page.tsx`

**Print Page Structure**:
```typescript
// Server-side rendering untuk print
export default async function PrintPage({ searchParams }: { searchParams: Promise<{ [key: string]: string }> }) {
  const params = await searchParams;
  const company = params.company;
  const fromDate = params.from_date;
  const toDate = params.to_date;
  
  // Fetch data server-side
  const data = await fetchReportData(company, fromDate, toDate);
  
  return (
    <div className="print-container">
      <PrintHeader company={company} title="..." period={`${fromDate} - ${toDate}`} />
      <PrintTable data={data} />
      <PrintSummary totals={calculateTotals(data)} />
      <PrintFooter />
    </div>
  );
}
```


### Component Reusability Pattern

Untuk menghindari duplikasi kode, kita akan membuat komponen yang dapat digunakan kembali:

**FilterSection Component**:
```typescript
interface FilterSectionProps {
  fromDate: string;
  toDate: string;
  onFromDateChange: (date: string) => void;
  onToDateChange: (date: string) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  additionalFilters?: React.ReactNode;
  onClearFilters: () => void;
  onRefresh: () => void;
}
```

**SummaryCards Component**:
```typescript
interface SummaryCard {
  label: string;
  value: string | number;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

interface SummaryCardsProps {
  cards: SummaryCard[];
}
```

**ExpandableRow Hook**:
```typescript
function useExpandableRows() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  
  const toggleRow = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  
  const isExpanded = (id: string) => expanded.has(id);
  
  return { toggleRow, isExpanded };
}
```


## Data Models

### TypeScript Interfaces

#### Sales Invoice Models

```typescript
// types/sales-invoice-details.ts
export interface SalesInvoiceItem {
  item_code: string;
  item_name: string;
  description?: string;
  qty: number;
  uom: string;
  rate: number;
  discount_percentage?: number;
  discount_amount: number;
  tax_amount: number;
  amount: number;
}

export interface SalesInvoiceWithItems {
  name: string;
  customer: string;
  customer_name?: string;
  posting_date: string;
  due_date?: string;
  status: string;
  docstatus: number;
  grand_total: number;
  outstanding_amount?: number;
  items: SalesInvoiceItem[];
}

export interface SalesInvoiceDetailsResponse {
  success: boolean;
  data: SalesInvoiceWithItems[];
  message?: string;
}
```

#### Purchase Invoice Models

```typescript
// types/purchase-invoice-details.ts
export interface PurchaseInvoiceItem {
  item_code: string;
  item_name: string;
  description?: string;
  qty: number;
  uom: string;
  rate: number;
  discount_percentage?: number;
  discount_amount: number;
  tax_amount: number;
  amount: number;
}

export interface PurchaseInvoiceWithItems {
  name: string;
  supplier: string;
  supplier_name?: string;
  posting_date: string;
  due_date?: string;
  status: string;
  docstatus: number;
  grand_total: number;
  outstanding_amount?: number;
  items: PurchaseInvoiceItem[];
}

export interface PurchaseInvoiceDetailsResponse {
  success: boolean;
  data: PurchaseInvoiceWithItems[];
  message?: string;
}
```


#### Payment Models

```typescript
// types/payment-details.ts
export interface PaymentReference {
  reference_doctype: string;
  reference_name: string;
  total_amount: number;
  allocated_amount: number;
  outstanding_amount: number;
}

export interface PaymentEntry {
  name: string;
  posting_date: string;
  payment_type: 'Receive' | 'Pay';
  party_type: string;
  party: string;
  party_name?: string;
  mode_of_payment: string;
  paid_amount: number;
  received_amount?: number;
  status: string;
  docstatus: number;
}

export interface PaymentWithReferences extends PaymentEntry {
  references: PaymentReference[];
}

export interface PaymentSummaryResponse {
  success: boolean;
  data: PaymentEntry[];
  message?: string;
}

export interface PaymentDetailsResponse {
  success: boolean;
  data: PaymentWithReferences[];
  message?: string;
}
```

### ERPNext API Data Structure

#### Sales Invoice Query

```
GET /api/resource/Sales Invoice
Fields: name, customer, customer_name, posting_date, status, docstatus, grand_total, outstanding_amount
Filters: [
  ['docstatus', '=', '1'],
  ['company', '=', company],
  ['posting_date', '>=', from_date],
  ['posting_date', '<=', to_date]
]

GET /api/resource/Sales Invoice/{name}
Returns: Full document including items array
```

#### Purchase Invoice Query

```
GET /api/resource/Purchase Invoice
Fields: name, supplier, supplier_name, posting_date, status, docstatus, grand_total, outstanding_amount
Filters: [
  ['docstatus', '=', '1'],
  ['company', '=', company],
  ['posting_date', '>=', from_date],
  ['posting_date', '<=', to_date]
]

GET /api/resource/Purchase Invoice/{name}
Returns: Full document including items array
```


#### Payment Entry Query

```
GET /api/resource/Payment Entry
Fields: name, posting_date, payment_type, party_type, party, party_name, mode_of_payment, paid_amount, received_amount, status, docstatus
Filters: [
  ['docstatus', '=', '1'],
  ['company', '=', company],
  ['posting_date', '>=', from_date],
  ['posting_date', '<=', to_date]
]

GET /api/resource/Payment Entry/{name}
Returns: Full document including references array (child table: Payment Entry Reference)
```

### API Response Format

Semua API endpoint mengikuti format response standar:

**Success Response**:
```json
{
  "success": true,
  "data": [...],
  "message": "Data retrieved successfully"
}
```

**Error Response**:
```json
{
  "success": false,
  "data": null,
  "message": "Error description"
}
```

### API Endpoints Design

#### 1. Sales Invoice Details API

**Endpoint**: `GET /api/finance/reports/sales-invoice-details`

**Query Parameters**:
- `company` (required): Company name
- `from_date` (optional): Start date (YYYY-MM-DD)
- `to_date` (optional): End date (YYYY-MM-DD)
- `customer` (optional): Customer filter (applied frontend)
- `status` (optional): Status filter (applied frontend)

**Implementation Strategy**:
1. Fetch list of sales invoices dengan filters dasar (company, date range)
2. Untuk setiap invoice, fetch detail document untuk mendapatkan items
3. Combine data dan return sebagai array of SalesInvoiceWithItems
4. Frontend akan melakukan filtering tambahan (customer, status)

**Error Handling**:
- 400: Missing required parameter (company)
- 401: Unauthorized (missing or invalid credentials)
- 500: Internal server error (ERPNext connection failed)


#### 2. Purchase Invoice Details API

**Endpoint**: `GET /api/finance/reports/purchase-invoice-details`

**Query Parameters**:
- `company` (required): Company name
- `from_date` (optional): Start date (YYYY-MM-DD)
- `to_date` (optional): End date (YYYY-MM-DD)
- `supplier` (optional): Supplier filter (applied frontend)
- `status` (optional): Status filter (applied frontend)

**Implementation**: Sama seperti Sales Invoice Details API, tetapi menggunakan Purchase Invoice DocType

#### 3. Payment Summary API

**Endpoint**: `GET /api/finance/reports/payment-summary`

**Query Parameters**:
- `company` (required): Company name
- `from_date` (optional): Start date (YYYY-MM-DD)
- `to_date` (optional): End date (YYYY-MM-DD)
- `payment_type` (optional): 'Receive' or 'Pay' (applied frontend)
- `mode_of_payment` (optional): Payment mode filter (applied frontend)
- `party` (optional): Party filter (applied frontend)

**Implementation Strategy**:
1. Fetch list of payment entries dengan filters dasar (company, date range)
2. Return array of PaymentEntry (tanpa references)
3. Frontend akan melakukan filtering tambahan

#### 4. Payment Details API

**Endpoint**: `GET /api/finance/reports/payment-details`

**Query Parameters**: Sama seperti Payment Summary API

**Implementation Strategy**:
1. Fetch list of payment entries dengan filters dasar (company, date range)
2. Untuk setiap payment, fetch detail document untuk mendapatkan references
3. Combine data dan return sebagai array of PaymentWithReferences
4. Frontend akan melakukan filtering tambahan

### API Route File Structure

```
app/api/finance/reports/
├── sales-invoice-details/
│   └── route.ts
├── purchase-invoice-details/
│   └── route.ts
├── payment-summary/
│   └── route.ts
└── payment-details/
    └── route.ts
```


### Authentication Helper

Semua API routes akan menggunakan helper function yang sama:

```typescript
// Reuse from existing pattern
function getAuthHeaders(request: NextRequest): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const sid = request.cookies.get('sid')?.value;
  const apiKey = process.env.ERP_API_KEY;
  const apiSecret = process.env.ERP_API_SECRET;

  if (apiKey && apiSecret) {
    headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
  } else if (sid) {
    headers['Cookie'] = `sid=${sid}`;
  }
  return headers;
}
```

### Performance Optimization Strategy

#### Backend Optimization

1. **Batch Fetching**: Fetch invoice list terlebih dahulu, kemudian batch fetch details
2. **Parallel Requests**: Gunakan `Promise.all()` untuk fetch multiple invoice details secara parallel
3. **Limit Results**: Set reasonable limit (500) untuk mencegah timeout
4. **Caching**: Consider implementing Redis cache untuk data yang sering diakses

#### Frontend Optimization

1. **Data Caching**: Simpan full dataset di `window.__reportData` untuk pagination
2. **Frontend Filtering**: Apply customer/status filters di frontend untuk menghindari re-fetch
3. **Debouncing**: Debounce URL updates (100ms) untuk mencegah throttling
4. **Memoization**: Gunakan `useMemo` untuk expensive calculations (totals, averages)
5. **Callback Optimization**: Gunakan `useCallback` untuk event handlers
6. **Lazy Expansion**: Hanya render detail items ketika row di-expand
7. **Virtual Scrolling**: Consider untuk dataset yang sangat besar (future enhancement)

#### Pagination Strategy

```typescript
// Store full data in window object
(window as any).__salesInvoiceData = allData;

// Frontend pagination
const startIndex = (currentPage - 1) * pageSize;
const endIndex = startIndex + pageSize;
const paginatedData = allData.slice(startIndex, endIndex);

// Track pagination source to prevent race conditions
const pageChangeSourceRef = useRef<'pagination' | 'filter' | 'init'>('init');
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

Setelah menganalisis semua acceptance criteria, berikut adalah refleksi untuk menghilangkan redundansi:

**Redundansi yang Diidentifikasi**:
1. Properties untuk Sales Invoice dan Purchase Invoice pada dasarnya identik (hanya berbeda DocType)
2. Properties untuk Payment Summary dan Payment Details memiliki overlap dalam kalkulasi total
3. Filter UI presence tests dapat digabungkan menjadi satu comprehensive test per report
4. Print functionality tests memiliki pola yang sama untuk semua reports

**Konsolidasi**:
- Gabungkan invoice field display properties menjadi satu property yang comprehensive
- Gabungkan payment calculation properties untuk menghindari duplikasi
- Fokus pada properties yang memberikan unique validation value

### Property 1: Invoice Field Display Completeness

*For any* invoice data (sales atau purchase) yang di-render dalam laporan, semua field yang required (nomor faktur, tanggal, nama pihak terkait, status, grand total) harus muncul dalam output HTML.

**Validates: Requirements 1.3, 3.3**

### Property 2: Invoice Item Field Display Completeness

*For any* item dalam invoice yang di-render, semua field yang required (kode item, nama item, kuantitas, satuan, harga satuan, diskon, pajak, total) harus muncul dalam output HTML.

**Validates: Requirements 1.4, 3.4**

### Property 3: Invoice Summary Calculation Correctness

*For any* set of invoices, ringkasan total harus dihitung dengan benar: jumlah faktur = count of invoices, total penjualan/pembelian = sum of grand_total, rata-rata = total / count.

**Validates: Requirements 1.8, 3.8**


### Property 4: Pagination Page Size Correctness

*For any* viewport size, pagination harus menampilkan jumlah item yang benar per halaman: 20 items untuk desktop (width >= 768px) dan 10 items untuk mobile (width < 768px).

**Validates: Requirements 1.9, 3.9, 5.9, 6.9**

### Property 5: Print Filter Consistency

*For any* set of active filters (periode tanggal, customer/supplier/party, status), laporan cetak harus mencerminkan filter yang sama dengan yang ditampilkan di layar utama.

**Validates: Requirements 2.4, 4.4, 7.5**

### Property 6: Payment Field Display Completeness

*For any* payment entry yang di-render dalam laporan, semua field yang required (nomor pembayaran, tanggal, tipe, pihak terkait, metode pembayaran, jumlah) harus muncul dalam output HTML.

**Validates: Requirements 5.3, 6.3**

### Property 7: Payment Summary Calculation Correctness

*For any* set of payment entries, ringkasan total harus dihitung dengan benar: jumlah transaksi = count of payments, total penerimaan = sum of paid_amount where payment_type='Receive', total pembayaran = sum of paid_amount where payment_type='Pay', saldo bersih = total penerimaan - total pembayaran.

**Validates: Requirements 5.8, 6.8**

### Property 8: API Response Structure Consistency

*For any* API call ke report endpoints, response harus memiliki struktur JSON standar dengan fields: success (boolean), data (array), dan message (string).

**Validates: Requirements 8.5, 9.5**

### Property 9: API Error Response Format

*For any* error condition dalam API (missing parameter, authentication failure, ERPNext error), response harus memiliki success: false dan message yang deskriptif.

**Validates: Requirements 8.6, 9.6**

### Property 10: API Error Handling Gracefully

*For any* timeout atau connection error saat memanggil ERPNext API, sistem harus menangani error dengan graceful (tidak crash) dan mengembalikan error response yang proper.

**Validates: Requirements 8.8, 9.8**


### Property 11: Filter Change Resets Pagination

*For any* filter change (date range, customer/supplier/party, status, payment type, mode), current page harus di-reset ke halaman 1.

**Validates: Requirements 11.1**

### Property 12: API Error Display

*For any* API error response, sistem harus menampilkan pesan error yang deskriptif kepada pengguna dalam format yang konsisten (red background dengan border).

**Validates: Requirements 12.2**

### Property 13: Date Range Validation

*For any* date range input dimana tanggal dari lebih besar dari tanggal sampai, sistem harus menampilkan warning kepada pengguna.

**Validates: Requirements 12.4**

### Example-Based Tests

Berikut adalah tests yang lebih cocok sebagai examples daripada properties:

**Example 1: Route Existence**
- Test bahwa route `/reports/sales-invoice-details` merender SalesInvoiceDetailsPage
- Test bahwa route `/reports/purchase-invoice-details` merender PurchaseInvoiceDetailsPage
- Test bahwa route `/reports/payment-summary` merender PaymentSummaryPage
- Test bahwa route `/reports/payment-details` merender PaymentDetailsPage
- **Validates: Requirements 1.1, 3.1, 5.1, 6.1**

**Example 2: Filter UI Presence**
- Test bahwa filter components (date pickers, search input, status select) ada di halaman
- **Validates: Requirements 1.5, 1.6, 1.7, 3.5, 3.6, 3.7, 5.4-5.7, 6.5-6.7**

**Example 3: Print Button Presence**
- Test bahwa tombol "Cetak Laporan" ada di setiap halaman laporan
- **Validates: Requirements 2.1, 4.1, 7.1, 7.2**

**Example 4: Print Modal Interaction**
- Test bahwa clicking print button menampilkan PrintPreviewModal
- **Validates: Requirements 2.2, 7.3**

**Example 5: Print Route Existence**
- Test bahwa print routes (`/reports/*/print`) merender print pages
- **Validates: Requirements 2.8, 4.8, 7.9, 7.10**


**Example 6: Print Header Content**
- Test bahwa print page menampilkan header dengan nama perusahaan, judul laporan, dan periode
- **Validates: Requirements 2.5, 4.5, 7.6**

**Example 7: Print Summary Content**
- Test bahwa print page menyertakan ringkasan total di akhir laporan
- **Validates: Requirements 2.7, 4.7, 7.8**

**Example 8: API Endpoint Existence**
- Test bahwa API endpoints `/api/finance/reports/sales-invoice-details`, `/api/finance/reports/purchase-invoice-details`, `/api/finance/reports/payment-summary`, `/api/finance/reports/payment-details` exist dan respond
- **Validates: Requirements 8.1, 8.2, 9.1, 9.2**

**Example 9: API Parameter Acceptance**
- Test bahwa API endpoints menerima query parameters yang specified (company, from_date, to_date, etc.)
- **Validates: Requirements 8.4, 9.4**

**Example 10: Company Redirect**
- Test bahwa ketika company tidak dipilih, user di-redirect ke halaman select-company
- **Validates: Requirements 12.1**

**Example 11: Empty State Display**
- Test bahwa ketika tidak ada data, sistem menampilkan pesan "Tidak ada data" di tengah tabel
- **Validates: Requirements 12.3**

**Example 12: Network Error Display**
- Test bahwa ketika terjadi network error, sistem menampilkan pesan "Gagal memuat laporan" dengan opsi refresh
- **Validates: Requirements 12.5**

## Error Handling

### Error Categories

#### 1. Client-Side Errors

**Missing Company**:
```typescript
useEffect(() => {
  const saved = localStorage.getItem('selected_company');
  if (!saved) {
    router.push('/select-company');
    return;
  }
  setSelectedCompany(saved);
}, [router]);
```

**Invalid Date Range**:
```typescript
useEffect(() => {
  if (fromDate && toDate) {
    const from = parseDate(fromDate); // DD/MM/YYYY to Date
    const to = parseDate(toDate);
    if (from && to && from > to) {
      setError('Tanggal dari tidak boleh lebih besar dari tanggal sampai');
    }
  }
}, [fromDate, toDate]);
```


**Empty Data State**:
```typescript
{data.length === 0 ? (
  <tr>
    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
      Tidak ada data
    </td>
  </tr>
) : (
  // Render data rows
)}
```

#### 2. API Errors

**Authentication Error (401)**:
```typescript
if (response.status === 401) {
  return NextResponse.json(
    { success: false, message: 'Unauthorized. Please check your credentials.' },
    { status: 401 }
  );
}
```

**Missing Parameter (400)**:
```typescript
if (!company) {
  return NextResponse.json(
    { success: false, message: 'Company parameter is required' },
    { status: 400 }
  );
}
```

**ERPNext API Error**:
```typescript
if (!response.ok) {
  const errorData = await response.json();
  return NextResponse.json(
    { 
      success: false, 
      message: errorData.message || 'Failed to fetch data from ERPNext' 
    },
    { status: response.status }
  );
}
```

**Network/Timeout Error**:
```typescript
try {
  const response = await fetch(erpNextUrl, { 
    method: 'GET', 
    headers,
    signal: AbortSignal.timeout(30000) // 30 second timeout
  });
  // ... handle response
} catch (error) {
  if (error.name === 'TimeoutError') {
    return NextResponse.json(
      { success: false, message: 'Request timeout. Please try again.' },
      { status: 504 }
    );
  }
  return NextResponse.json(
    { success: false, message: 'Network error. Please check your connection.' },
    { status: 500 }
  );
}
```


#### 3. Frontend Error Display

**Error Message Component**:
```typescript
{error && (
  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
    {error}
  </div>
)}
```

**Loading State**:
```typescript
if (loading && data.length === 0) {
  return <LoadingSpinner message="Memuat laporan..." />;
}
```

**Graceful Degradation**:
```typescript
const fetchData = async () => {
  setLoading(true);
  setError('');
  try {
    const response = await fetch(apiUrl, { credentials: 'include' });
    const result = await response.json();
    
    if (result.success) {
      setData(result.data || []);
    } else {
      setError(result.message || 'Gagal memuat laporan');
    }
  } catch (err) {
    setError('Gagal memuat laporan. Silakan coba lagi.');
    console.error('Fetch error:', err);
  } finally {
    setLoading(false);
  }
};
```

### Error Recovery

**Refresh Button**:
```typescript
<button 
  onClick={fetchData}
  className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors text-sm"
>
  Refresh
</button>
```

**Clear Filters**:
```typescript
const handleClearFilters = () => {
  setFilterCustomer('');
  setFilterStatus('');
  setCurrentPage(1);
  setError('');
  // Reset to default dates
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  setFromDate(formatToDDMMYYYY(firstDay.toISOString().split('T')[0]));
  setToDate(formatToDDMMYYYY(today.toISOString().split('T')[0]));
};
```


## Testing Strategy

### Dual Testing Approach

Fitur ini akan menggunakan kombinasi unit tests dan property-based tests untuk memastikan correctness yang komprehensif:

**Unit Tests**: Fokus pada specific examples, edge cases, dan integration points
**Property Tests**: Fokus pada universal properties yang harus berlaku untuk semua inputs

### Unit Testing Focus Areas

1. **Route Rendering**
   - Test bahwa setiap route merender component yang benar
   - Test bahwa print routes merender print pages
   - Test redirect behavior ketika company tidak dipilih

2. **UI Component Presence**
   - Test bahwa filter components ada dan berfungsi
   - Test bahwa summary cards ditampilkan dengan benar
   - Test bahwa print button ada dan clickable
   - Test bahwa pagination controls ada

3. **User Interactions**
   - Test filter changes trigger data refresh
   - Test pagination navigation
   - Test expand/collapse invoice rows
   - Test print modal open/close

4. **Edge Cases**
   - Test empty data state
   - Test invalid date range warning
   - Test network error handling
   - Test missing company redirect

5. **Integration Points**
   - Test API endpoint responses
   - Test authentication header generation
   - Test ERPNext API integration

### Property-Based Testing Configuration

**Library**: Pilih property-based testing library untuk TypeScript/JavaScript:
- **fast-check** (recommended untuk TypeScript)
- **jsverify** (alternative)

**Configuration**:
```typescript
// Minimum 100 iterations per property test
fc.assert(
  fc.property(
    // generators
    fc.array(invoiceGenerator),
    // property test
    (invoices) => {
      const totals = calculateTotals(invoices);
      return totals.count === invoices.length &&
             totals.total === invoices.reduce((sum, inv) => sum + inv.grand_total, 0);
    }
  ),
  { numRuns: 100 }
);
```


### Property Test Implementation

**Property 1: Invoice Field Display Completeness**
```typescript
// Feature: detailed-invoice-payment-reports, Property 1: For any invoice data, all required fields must appear in HTML output
fc.assert(
  fc.property(
    invoiceWithItemsGenerator,
    (invoice) => {
      const html = renderInvoiceRow(invoice);
      return html.includes(invoice.name) &&
             html.includes(invoice.posting_date) &&
             html.includes(invoice.customer || invoice.supplier) &&
             html.includes(invoice.status) &&
             html.includes(invoice.grand_total.toString());
    }
  ),
  { numRuns: 100 }
);
```

**Property 3: Invoice Summary Calculation Correctness**
```typescript
// Feature: detailed-invoice-payment-reports, Property 3: For any set of invoices, summary totals must be calculated correctly
fc.assert(
  fc.property(
    fc.array(invoiceGenerator),
    (invoices) => {
      const summary = calculateInvoiceSummary(invoices);
      const expectedTotal = invoices.reduce((sum, inv) => sum + inv.grand_total, 0);
      const expectedAvg = invoices.length > 0 ? expectedTotal / invoices.length : 0;
      
      return summary.count === invoices.length &&
             Math.abs(summary.total - expectedTotal) < 0.01 &&
             Math.abs(summary.average - expectedAvg) < 0.01;
    }
  ),
  { numRuns: 100 }
);
```

**Property 7: Payment Summary Calculation Correctness**
```typescript
// Feature: detailed-invoice-payment-reports, Property 7: For any set of payments, summary totals must be calculated correctly
fc.assert(
  fc.property(
    fc.array(paymentEntryGenerator),
    (payments) => {
      const summary = calculatePaymentSummary(payments);
      const expectedReceived = payments
        .filter(p => p.payment_type === 'Receive')
        .reduce((sum, p) => sum + p.paid_amount, 0);
      const expectedPaid = payments
        .filter(p => p.payment_type === 'Pay')
        .reduce((sum, p) => sum + p.paid_amount, 0);
      const expectedNet = expectedReceived - expectedPaid;
      
      return summary.count === payments.length &&
             Math.abs(summary.totalReceived - expectedReceived) < 0.01 &&
             Math.abs(summary.totalPaid - expectedPaid) < 0.01 &&
             Math.abs(summary.netBalance - expectedNet) < 0.01;
    }
  ),
  { numRuns: 100 }
);
```


**Property 11: Filter Change Resets Pagination**
```typescript
// Feature: detailed-invoice-payment-reports, Property 11: For any filter change, current page must reset to 1
fc.assert(
  fc.property(
    fc.string(), // random filter value
    fc.integer({ min: 2, max: 10 }), // current page > 1
    (filterValue, currentPage) => {
      const state = { currentPage, filterCustomer: '' };
      const newState = applyFilterChange(state, { filterCustomer: filterValue });
      return newState.currentPage === 1;
    }
  ),
  { numRuns: 100 }
);
```

### Test Data Generators

**Invoice Generator**:
```typescript
const invoiceGenerator = fc.record({
  name: fc.string({ minLength: 5, maxLength: 20 }),
  customer: fc.string({ minLength: 3, maxLength: 30 }),
  posting_date: fc.date().map(d => d.toISOString().split('T')[0]),
  status: fc.constantFrom('Draft', 'Submitted', 'Paid', 'Unpaid', 'Cancelled'),
  grand_total: fc.float({ min: 100, max: 1000000, noNaN: true }),
  items: fc.array(itemGenerator, { minLength: 1, maxLength: 10 })
});

const itemGenerator = fc.record({
  item_code: fc.string({ minLength: 3, maxLength: 20 }),
  item_name: fc.string({ minLength: 5, maxLength: 50 }),
  qty: fc.float({ min: 1, max: 1000, noNaN: true }),
  uom: fc.constantFrom('Pcs', 'Kg', 'Box', 'Unit'),
  rate: fc.float({ min: 100, max: 100000, noNaN: true }),
  discount_amount: fc.float({ min: 0, max: 10000, noNaN: true }),
  tax_amount: fc.float({ min: 0, max: 10000, noNaN: true }),
  amount: fc.float({ min: 100, max: 100000, noNaN: true })
});
```

**Payment Generator**:
```typescript
const paymentEntryGenerator = fc.record({
  name: fc.string({ minLength: 5, maxLength: 20 }),
  posting_date: fc.date().map(d => d.toISOString().split('T')[0]),
  payment_type: fc.constantFrom('Receive', 'Pay'),
  party: fc.string({ minLength: 3, maxLength: 30 }),
  mode_of_payment: fc.constantFrom('Cash', 'Bank Transfer', 'Check', 'Credit Card'),
  paid_amount: fc.float({ min: 100, max: 1000000, noNaN: true }),
  status: fc.constantFrom('Draft', 'Submitted', 'Cancelled')
});
```


### Test Organization

```
tests/
├── unit/
│   ├── reports/
│   │   ├── sales-invoice-details.test.tsx
│   │   ├── purchase-invoice-details.test.tsx
│   │   ├── payment-summary.test.tsx
│   │   └── payment-details.test.tsx
│   └── api/
│       ├── sales-invoice-details-api.test.ts
│       ├── purchase-invoice-details-api.test.ts
│       ├── payment-summary-api.test.ts
│       └── payment-details-api.test.ts
└── property/
    ├── invoice-calculations.property.test.ts
    ├── payment-calculations.property.test.ts
    ├── pagination.property.test.ts
    └── api-responses.property.test.ts
```

### Testing Best Practices

1. **Avoid Over-Testing**: Property tests handle comprehensive input coverage, jadi unit tests fokus pada specific examples dan edge cases
2. **Test Behavior, Not Implementation**: Test apa yang user lihat dan alami, bukan internal implementation details
3. **Mock External Dependencies**: Mock ERPNext API calls untuk unit tests, gunakan integration tests untuk end-to-end testing
4. **Test Error Paths**: Pastikan error handling di-test dengan baik
5. **Keep Tests Fast**: Unit tests harus cepat (<100ms per test), property tests boleh lebih lambat tapi tetap reasonable

## UI/UX Design Patterns

### Responsive Design

**Breakpoint**: 768px (mobile vs desktop)

**Mobile View** (< 768px):
- Card-based layout untuk data
- 10 items per page
- Stacked filters (vertical layout)
- Simplified table dengan essential fields only
- Expandable sections untuk detail

**Desktop View** (>= 768px):
- Table-based layout
- 20 items per page
- Horizontal filter layout
- Full table dengan semua columns
- Inline expandable rows


### Color Scheme

Mengikuti existing color palette:

**Summary Cards**:
- Blue (`bg-blue-50 border-blue-200 text-blue-600/900`): Total count
- Green (`bg-green-50 border-green-200 text-green-600/900`): Total amount/received
- Purple (`bg-purple-50 border-purple-200 text-purple-600/900`): Average/paid
- Orange (`bg-orange-50 border-orange-200 text-orange-600/900`): Page info/net balance

**Status Badges**:
- Green: Completed, Paid, Submitted
- Yellow: Draft, Unpaid
- Blue: To Bill, Partially Paid
- Red: Cancelled
- Gray: Other statuses

**Interactive Elements**:
- Primary buttons: `bg-indigo-600 hover:bg-indigo-700`
- Secondary buttons: `bg-gray-300 hover:bg-gray-400`
- Danger buttons: `bg-red-600 hover:bg-red-700`

**Error/Warning**:
- Error: `bg-red-50 border-red-200 text-red-700`
- Warning: `bg-yellow-50 border-yellow-200 text-yellow-700`
- Info: `bg-blue-50 border-blue-200 text-blue-700`

### Typography

**Headers**:
- Page title: `text-2xl font-bold text-gray-900`
- Section title: `text-sm font-medium text-gray-900`
- Card label: `text-sm font-medium`

**Body Text**:
- Regular: `text-sm text-gray-900`
- Secondary: `text-sm text-gray-500`
- Small: `text-xs text-gray-500`

**Numbers**:
- Currency: `text-sm text-gray-900 text-right` dengan format `Rp X.XXX.XXX`
- Percentages: `text-xs text-gray-500`

### Spacing

**Consistent spacing menggunakan Tailwind scale**:
- Container padding: `p-6`
- Card padding: `p-4`
- Section margin: `mb-6`
- Element gap: `gap-4`
- Table cell padding: `px-4 py-3`


### Expandable Rows Pattern

**Desktop Table**:
```typescript
<tbody>
  {data.map((invoice) => (
    <React.Fragment key={invoice.name}>
      {/* Main row */}
      <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleRow(invoice.name)}>
        <td className="px-4 py-3">
          <button className="text-gray-500 hover:text-gray-700">
            {isExpanded(invoice.name) ? '▼' : '▶'}
          </button>
        </td>
        <td className="px-4 py-3 text-sm font-medium text-indigo-600">{invoice.name}</td>
        {/* Other columns */}
      </tr>
      
      {/* Expanded detail row */}
      {isExpanded(invoice.name) && (
        <tr>
          <td colSpan={7} className="px-4 py-4 bg-gray-50">
            <div className="ml-8">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Detail Items:</h4>
              <table className="min-w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Kode Item</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Nama Item</th>
                    {/* Other item columns */}
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item, idx) => (
                    <tr key={idx} className="border-t border-gray-200">
                      <td className="px-3 py-2 text-xs">{item.item_code}</td>
                      <td className="px-3 py-2 text-xs">{item.item_name}</td>
                      {/* Other item cells */}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  ))}
</tbody>
```

**Mobile Card**:
```typescript
<div className="divide-y divide-gray-200">
  {data.map((invoice) => (
    <div key={invoice.name} className="px-4 py-4">
      <div className="space-y-3">
        {/* Invoice summary */}
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <p className="text-sm font-medium text-indigo-600">{invoice.name}</p>
            <p className="text-sm text-gray-900 mt-1">{invoice.customer}</p>
          </div>
          <span className="status-badge">{invoice.status}</span>
        </div>
        
        {/* Expand button */}
        <button 
          onClick={() => toggleRow(invoice.name)}
          className="text-sm text-indigo-600 hover:text-indigo-700"
        >
          {isExpanded(invoice.name) ? '▼ Sembunyikan Detail' : '▶ Lihat Detail'}
        </button>
        
        {/* Expanded items */}
        {isExpanded(invoice.name) && (
          <div className="mt-3 pl-4 border-l-2 border-indigo-200">
            {invoice.items.map((item, idx) => (
              <div key={idx} className="mb-3 pb-3 border-b border-gray-100 last:border-0">
                <p className="text-xs font-medium text-gray-900">{item.item_name}</p>
                <p className="text-xs text-gray-500">{item.item_code}</p>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <span className="text-xs text-gray-500">Qty:</span>
                    <span className="text-xs text-gray-900 ml-1">{item.qty} {item.uom}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Total:</span>
                    <span className="text-xs text-gray-900 ml-1">Rp {item.amount.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  ))}
</div>
```


### Print Layout

**Print Page Structure**:
```html
<div className="print-container" style="width: 210mm; padding: 28px 34px;">
  <!-- Header -->
  <div className="doc-header">
    <div>
      <div className="doc-company">{company}</div>
      <div className="doc-title">{reportTitle}</div>
    </div>
    <div className="doc-meta">
      <div>Periode: {fromDate} - {toDate}</div>
      <div>Dicetak: {new Date().toLocaleString('id-ID')}</div>
    </div>
  </div>
  
  <!-- Filters Applied -->
  {filters && (
    <div className="section-header">Filter yang Diterapkan</div>
    <div className="print-meta">
      {filterCustomer && <div><span className="print-meta-label">Pelanggan:</span> <span className="print-meta-value">{filterCustomer}</span></div>}
      {filterStatus && <div><span className="print-meta-label">Status:</span> <span className="print-meta-value">{filterStatus}</span></div>}
    </div>
  )}
  
  <!-- Data Table -->
  <table>
    <thead>
      <tr>
        <th>No. Faktur</th>
        <th>Tanggal</th>
        <th>Pelanggan</th>
        <th>Status</th>
        <th className="right">Total</th>
      </tr>
    </thead>
    <tbody>
      {data.map(invoice => (
        <React.Fragment key={invoice.name}>
          <tr>
            <td>{invoice.name}</td>
            <td>{invoice.posting_date}</td>
            <td>{invoice.customer_name || invoice.customer}</td>
            <td>{invoice.status}</td>
            <td className="right">Rp {invoice.grand_total.toLocaleString('id-ID')}</td>
          </tr>
          {/* Item details */}
          {invoice.items.map((item, idx) => (
            <tr key={idx} style="background: #f8fafc;">
              <td colSpan={2} style="padding-left: 20px; font-size: 9px;">{item.item_code}</td>
              <td style="font-size: 9px;">{item.item_name}</td>
              <td className="right" style="font-size: 9px;">{item.qty} {item.uom}</td>
              <td className="right" style="font-size: 9px;">Rp {item.amount.toLocaleString('id-ID')}</td>
            </tr>
          ))}
        </React.Fragment>
      ))}
    </tbody>
  </table>
  
  <!-- Summary -->
  <div className="section-header">Ringkasan</div>
  <table>
    <tbody>
      <tr className="total-row">
        <td>Total Faktur:</td>
        <td className="right">{totalCount}</td>
      </tr>
      <tr className="total-row">
        <td>Total Penjualan:</td>
        <td className="right">Rp {totalAmount.toLocaleString('id-ID')}</td>
      </tr>
      <tr className="total-row">
        <td>Rata-rata per Faktur:</td>
        <td className="right">Rp {averageAmount.toLocaleString('id-ID')}</td>
      </tr>
    </tbody>
  </table>
  
  <!-- Footer -->
  <div className="print-footer">
    Laporan ini dihasilkan secara otomatis oleh sistem ERP
  </div>
</div>
```


### Loading States

**Initial Load**:
```typescript
if (loading && data.length === 0) {
  return <LoadingSpinner message="Memuat laporan..." />;
}
```

**Refresh/Filter Change** (with existing data):
```typescript
{loading && data.length > 0 && (
  <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
    <LoadingSpinner message="Memperbarui data..." />
  </div>
)}
```

**Pagination** (no loading indicator, instant with cached data):
```typescript
// No loading state shown during pagination
// Data is sliced from cached window object
```

### Accessibility

**Keyboard Navigation**:
- Tab order yang logical untuk filters dan buttons
- Enter key untuk submit filters
- Arrow keys untuk pagination navigation
- Space/Enter untuk expand/collapse rows

**Screen Reader Support**:
```typescript
<button 
  aria-label={`${isExpanded(invoice.name) ? 'Sembunyikan' : 'Tampilkan'} detail untuk faktur ${invoice.name}`}
  aria-expanded={isExpanded(invoice.name)}
  onClick={() => toggleRow(invoice.name)}
>
  {isExpanded(invoice.name) ? '▼' : '▶'}
</button>
```

**ARIA Labels**:
```typescript
<table aria-label="Tabel laporan detail penjualan">
  <thead>
    <tr>
      <th scope="col">No. Faktur</th>
      <th scope="col">Tanggal</th>
      {/* ... */}
    </tr>
  </thead>
</table>
```

## Implementation Roadmap

### Phase 1: API Development (Week 1)

1. **Setup API Routes Structure**
   - Create directory structure untuk 4 endpoints
   - Setup authentication helper function
   - Create TypeScript interfaces

2. **Implement Sales Invoice Details API**
   - Fetch invoice list dari ERPNext
   - Fetch detail untuk setiap invoice (parallel)
   - Combine data dan return response

3. **Implement Purchase Invoice Details API**
   - Reuse pattern dari Sales Invoice API
   - Adjust untuk Purchase Invoice DocType

4. **Implement Payment APIs**
   - Payment Summary API (tanpa references)
   - Payment Details API (dengan references)

5. **Testing & Error Handling**
   - Test semua endpoints dengan Postman/curl
   - Implement comprehensive error handling
   - Add logging untuk debugging


### Phase 2: Frontend Components (Week 2)

1. **Create Shared Components**
   - FilterSection component
   - SummaryCards component
   - useExpandableRows hook
   - Helper functions (date formatting, calculations)

2. **Implement Sales Invoice Details Page**
   - Page component dengan state management
   - Filter section
   - Summary cards
   - Desktop table dengan expandable rows
   - Mobile card view
   - Pagination

3. **Implement Purchase Invoice Details Page**
   - Reuse components dari Sales Invoice page
   - Adjust labels dan fields untuk purchase

4. **Implement Payment Summary Page**
   - Similar structure tanpa expandable rows
   - Payment-specific filters
   - Payment summary calculations

5. **Implement Payment Details Page**
   - Add expandable rows untuk references
   - Payment reference display

### Phase 3: Print Functionality (Week 3)

1. **Create Print Pages**
   - Sales Invoice Details print page
   - Purchase Invoice Details print page
   - Payment Summary print page
   - Payment Details print page

2. **Print Layout Styling**
   - A4 paper size (210mm x 297mm)
   - Print-specific CSS
   - Header, footer, dan summary sections

3. **Print Modal Integration**
   - Integrate PrintPreviewModal
   - Pass correct printUrl
   - Test print preview dan actual printing

### Phase 4: Testing & Refinement (Week 4)

1. **Unit Tests**
   - Component rendering tests
   - API endpoint tests
   - Error handling tests
   - Edge case tests

2. **Property-Based Tests**
   - Calculation correctness tests
   - Field display tests
   - Pagination tests
   - API response format tests

3. **Integration Testing**
   - End-to-end user flows
   - Cross-browser testing
   - Mobile responsiveness testing
   - Print functionality testing

4. **Performance Optimization**
   - Profile dan optimize slow operations
   - Implement caching strategies
   - Optimize re-renders
   - Test dengan large datasets

5. **Documentation**
   - User documentation
   - Developer documentation
   - API documentation
   - Troubleshooting guide


## Security Considerations

### Authentication & Authorization

1. **API Key Protection**
   - API keys stored di environment variables (never in code)
   - Keys tidak pernah exposed ke client-side
   - Rotation policy untuk API keys

2. **Session Management**
   - Session cookies dengan HttpOnly flag
   - Secure flag untuk HTTPS
   - SameSite policy untuk CSRF protection

3. **Authorization Checks**
   - Verify user permissions di ERPNext
   - Company-level access control
   - Role-based access untuk reports

### Data Security

1. **Input Validation**
   - Validate semua query parameters
   - Sanitize user inputs
   - Prevent SQL injection (ERPNext handles this)

2. **Output Encoding**
   - Escape HTML dalam rendered content
   - Prevent XSS attacks
   - Safe JSON serialization

3. **Rate Limiting**
   - Implement rate limiting untuk API endpoints
   - Prevent abuse dan DoS attacks
   - Reasonable timeout values (30s)

### Data Privacy

1. **Sensitive Data Handling**
   - Tidak log sensitive data (amounts, customer names)
   - Mask data dalam error messages
   - Secure data transmission (HTTPS only)

2. **Access Logging**
   - Log API access untuk audit trail
   - Track who accessed what reports
   - Retention policy untuk logs

## Performance Benchmarks

### Target Performance Metrics

**API Response Times**:
- Invoice list fetch: < 2s untuk 500 invoices
- Invoice detail fetch (parallel): < 5s untuk 50 invoices
- Payment list fetch: < 2s untuk 500 payments
- Total API response: < 10s untuk typical query

**Frontend Rendering**:
- Initial page load: < 1s
- Filter application: < 500ms
- Pagination: < 100ms (instant with cache)
- Expand/collapse: < 50ms

**Memory Usage**:
- Client-side data cache: < 10MB untuk 500 records
- No memory leaks pada repeated operations
- Efficient garbage collection


### Optimization Strategies

**Backend Optimization**:
1. Parallel fetching dengan `Promise.all()` untuk invoice details
2. Batch requests untuk multiple invoices
3. Limit results untuk prevent timeout (500 max)
4. Consider Redis caching untuk frequently accessed data

**Frontend Optimization**:
1. Memoization dengan `useMemo` untuk expensive calculations
2. Callback optimization dengan `useCallback`
3. Data caching di window object untuk pagination
4. Debouncing untuk URL updates
5. Lazy rendering untuk expandable content
6. Virtual scrolling untuk very large datasets (future)

**Network Optimization**:
1. Compress API responses (gzip)
2. Minimize payload size (only required fields)
3. HTTP/2 untuk multiplexing
4. CDN untuk static assets

## Monitoring & Observability

### Logging Strategy

**API Logs**:
```typescript
console.log(`[API] ${endpoint} - Company: ${company}, Date Range: ${fromDate} to ${toDate}`);
console.log(`[API] ${endpoint} - Fetched ${invoiceCount} invoices in ${duration}ms`);
console.error(`[API] ${endpoint} - Error: ${error.message}`);
```

**Performance Logs**:
```typescript
const startTime = performance.now();
// ... operation
const duration = performance.now() - startTime;
console.log(`[Performance] ${operation} took ${duration}ms`);
```

### Error Tracking

**Client-Side Errors**:
- Capture unhandled errors dengan error boundary
- Log errors ke console dengan context
- Display user-friendly error messages
- Provide recovery actions (refresh, clear filters)

**Server-Side Errors**:
- Log errors dengan full stack trace
- Include request context (company, params)
- Return sanitized error messages ke client
- Alert on critical errors

### Metrics to Track

**Usage Metrics**:
- Report access frequency
- Most used filters
- Average session duration
- Peak usage times

**Performance Metrics**:
- API response times (p50, p95, p99)
- Frontend render times
- Error rates
- Cache hit rates

**Business Metrics**:
- Number of invoices processed
- Total transaction amounts
- Report generation frequency
- User adoption rate


## Future Enhancements

### Phase 2 Features (Post-MVP)

1. **Export Functionality**
   - Export ke Excel (XLSX)
   - Export ke CSV
   - Export ke PDF (server-side generation)
   - Custom column selection

2. **Advanced Filtering**
   - Multi-select untuk status
   - Amount range filters
   - Item-level filtering
   - Saved filter presets

3. **Sorting & Grouping**
   - Sortable columns
   - Group by customer/supplier
   - Group by date (daily, weekly, monthly)
   - Subtotals per group

4. **Visualization**
   - Charts untuk trends
   - Pie charts untuk distribution
   - Bar charts untuk comparisons
   - Interactive dashboards

5. **Scheduling & Automation**
   - Scheduled report generation
   - Email delivery
   - Automated alerts
   - Recurring reports

6. **Customization**
   - User preferences untuk default filters
   - Custom column visibility
   - Personalized layouts
   - Saved views

### Technical Debt & Improvements

1. **Code Refactoring**
   - Extract common patterns ke shared utilities
   - Reduce code duplication
   - Improve type safety
   - Better error handling

2. **Performance Improvements**
   - Implement virtual scrolling
   - Server-side pagination option
   - GraphQL untuk flexible queries
   - WebSocket untuk real-time updates

3. **Testing Coverage**
   - Increase unit test coverage (>80%)
   - Add E2E tests dengan Playwright
   - Visual regression testing
   - Load testing

4. **Documentation**
   - Interactive API documentation
   - Video tutorials
   - FAQ section
   - Best practices guide

## Conclusion

Desain ini menyediakan blueprint komprehensif untuk implementasi fitur Laporan Detail Faktur dan Pembayaran. Dengan mengikuti arsitektur yang konsisten dengan sistem existing, menggunakan komponen yang dapat digunakan kembali, dan menerapkan best practices untuk performance dan security, fitur ini akan memberikan nilai bisnis yang signifikan sambil mempertahankan kualitas kode yang tinggi.

Key success factors:
- Konsistensi dengan existing patterns
- Reusability komponen
- Comprehensive error handling
- Performance optimization
- Thorough testing
- Clear documentation

Implementasi akan dilakukan secara bertahap (4 minggu) dengan fokus pada API development, frontend components, print functionality, dan testing/refinement.
