# Design Document: Print Document Redesign

## Overview

This design document specifies the technical approach for redesigning all print documents in the ERP system. The redesign addresses critical issues with the current print implementation:

1. **Incorrect dimensions**: Current print implementation uses 215mm x 145mm (measured on physical paper)
   - Width: 215mm (should be 210mm)
   - Height: 145mm (current, but should be flexible for continuous form)
2. **Wrong paper type assumption**: System treats all documents as fixed-size sheets, but transaction documents use continuous form
3. **Inconsistent layouts**: Transaction documents lack standardized structure
4. **Missing report layouts**: Financial and system reports need proper print formatting
5. **Preview/output mismatch**: Print preview doesn't accurately represent printed output

The redesign will create a unified print system with two distinct approaches:

**For Transaction Documents (SO, SJ, FJ, PO, PR, PI)**:
- **Continuous form printing**: Width 210mm, Height flexible (auto-adjusts to content)
- No fixed page height - document grows based on number of items
- Minimum height ~145mm for standard documents
- No page breaks within document
- Optimized for dot matrix or continuous form printers

**For Reports (Trial Balance, Balance Sheet, P&L, etc.)**:
- **Standard A4 portrait**: 210mm × 297mm fixed pages
- Supports pagination for multi-page reports
- Page breaks between pages
- Optimized for laser/inkjet printers

### Scope

This redesign covers:
- **Transaction Documents** (6 types): Sales Order, Delivery Note, Sales Invoice, Purchase Order, Purchase Receipt, Purchase Invoice
  - Print format: **Continuous form** (210mm width, flexible height)
  - Target: Dot matrix or continuous form printers
- **Financial Reports** (6+ types): Trial Balance, Balance Sheet, Profit & Loss Statement, Cash Flow Statement, General Ledger, and other accounting reports
  - Print format: **A4 portrait** (210mm × 297mm fixed)
  - Target: Laser/inkjet printers
- **System Reports** (10+ types): Inventory reports, Sales reports, Purchase reports, HR reports, and other printable reports
  - Print format: **A4 portrait** (210mm × 297mm fixed)
  - Target: Laser/inkjet printers

### Design Principles

1. **Correct Paper Format**: 
   - Continuous form (210mm width, flexible height) for transaction documents
   - A4 portrait (210mm × 297mm) for reports
2. **Consistency**: Standardized layouts within each document category
3. **Professional Appearance**: Clean, readable layouts suitable for business use
4. **Indonesian Localization**: All labels in Bahasa Indonesia with proper formatting
5. **Print Fidelity**: Preview matches actual print output exactly
6. **Flexibility**: Support both continuous form and standard sheet printing
7. **Maintainability**: Reusable components with clear separation of concerns


## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Document Pages                          │
│  (Sales Order, Invoice, Reports, etc.)                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              PrintPreviewModal Component                    │
│  - Zoom controls (50%-200%)                                 │
│  - Paper settings (A4, A5, Letter, Legal, F4)              │
│  - Orientation (Portrait/Landscape)                         │
│  - Print & Save PDF actions                                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Document Layout Components                     │
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │ PrintLayout      │  │ ReportLayout     │               │
│  │ (Transactions)   │  │ (Reports)        │               │
│  └──────────────────┘  └──────────────────┘               │
│                                                             │
│  Common Sub-components:                                     │
│  - DocumentHeader                                           │
│  - DocumentMetadata                                         │
│  - ItemTable                                                │
│  - TotalsSection                                            │
│  - SignatureSection                                         │
│  - DocumentFooter                                           │
│  - ReportHeader                                             │
│  - ReportTable                                              │
└─────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
PrintPreviewModal
├── Toolbar (zoom, settings, print, save PDF)
├── Settings Panel (paper size, orientation)
└── Preview Container
    └── Document Content (children prop)
        ├── PrintLayout (for transaction documents)
        │   ├── DocumentHeader
        │   ├── DocumentMetadata
        │   ├── ItemTable
        │   ├── TotalsSection
        │   ├── SignatureSection
        │   └── DocumentFooter
        │
        └── ReportLayout (for reports)
            ├── ReportHeader
            ├── ReportTable
            └── ReportFooter
```

### Data Flow

1. **Document Page** → Fetches document data from API
2. **Document Page** → Opens PrintPreviewModal with document data
3. **PrintPreviewModal** → Renders appropriate layout component (PrintLayout or ReportLayout)
4. **Layout Component** → Renders document with correct dimensions and styling
5. **User Action** → Print or Save PDF
6. **Browser** → Applies @page CSS rules and generates output


## Components and Interfaces

### 1. PrintPreviewModal Component

**Purpose**: Provides a standardized modal for previewing and printing all document types.

**Props Interface**:
```typescript
interface PrintPreviewModalProps {
  title: string;                          // Document title for toolbar
  onClose: () => void;                    // Close handler
  children: React.ReactNode;              // Document content to render
  printUrl?: string;                      // Optional direct print URL
  paperMode?: PaperMode;                  // 'continuous' | 'sheet' (default: 'sheet')
  defaultPaperSize?: PaperSize;           // Default: 'A4' (for sheet mode)
  defaultOrientation?: PaperOrientation;  // Default: 'portrait'
  fixedPageSizeMm?: { width: number; height: number }; // Override paper dimensions
  allowPaperSettings?: boolean;           // Default: true (disabled for continuous mode)
  zoomMin?: number;                       // Default: 50
  zoomMax?: number;                       // Default: 200
  useContentFrame?: boolean;              // Default: true
  contentFramePadding?: string;           // Default: '28px 34px'
  frameBackground?: string;               // Default: '#fff'
  frameShadow?: string;                   // Default: '0 8px 40px rgba(0,0,0,0.5)'
}

type PaperMode = 'continuous' | 'sheet';
type PaperSize = 'A4' | 'A5' | 'Letter' | 'Legal' | 'F4' | 'Continuous';
type PaperOrientation = 'portrait' | 'landscape';
```

**Key Changes**:
- Support two paper modes: continuous form and A4 portrait
- For continuous form: Width 210mm, Height auto (no fixed height)
- For A4 portrait: 210mm × 297mm fixed
- Remove hardcoded 215mm × 145mm dimensions
- Add `paperMode` prop: 'continuous' | 'sheet'
- Update @page CSS rules based on paper mode

**Dimension Calculations**:
```typescript
const PAPER_DIMS: Record<PaperSize, { w: number; h: number }> = {
  A4:     { w: 210, h: 297 },  // For reports (fixed height)
  A5:     { w: 148, h: 210 },
  Letter: { w: 216, h: 279 },
  Legal:  { w: 216, h: 356 },
  F4:     { w: 215, h: 330 },
  Continuous: { w: 210, h: 0 }, // For transaction docs (flexible height)
};

// Calculate page dimensions based on paper mode
if (paperMode === 'continuous') {
  // Continuous form: fixed width, auto height
  const pageW = 210; // mm
  const pageWidthPx = pageW * (96 / 25.4);
  // Height is auto - determined by content
  // No fixed pageHeightPx
} else {
  // Standard sheet: fixed width and height
  const pageW = orientation === 'portrait' ? dims.w : dims.h;
  const pageH = orientation === 'portrait' ? dims.h : dims.w;
  const pageWidthPx = pageW * (96 / 25.4);
  const pageHeightPx = pageH * (96 / 25.4);
}
```


### 2. PrintLayout Component (Transaction Documents)

**Purpose**: Renders transaction documents (SO, DN, SI, PO, PR, PI) with portrait orientation.

**Props Interface**:
```typescript
interface PrintLayoutProps {
  // Document identification
  documentTitle: string;                  // e.g., "SALES ORDER", "FAKTUR JUAL"
  documentNumber: string;                 // Document number
  documentDate: string;                   // Formatted date
  status?: string;                        // Document status badge
  
  // Company information
  companyName: string;                    // Company name
  companyLogo?: string;                   // Logo URL (optional)
  
  // Party information
  partyLabel: string;                     // "Pelanggan" or "Pemasok"
  partyName: string;                      // Customer/Supplier name
  partyAddress?: string;                  // Address (optional)
  
  // Reference information
  referenceDoc?: string;                  // Related document number
  referenceLabel?: string;                // Label for reference
  salesPerson?: string;                   // Sales person name
  
  // Additional metadata
  metaRight?: MetaItem[];                 // Right-side metadata
  
  // Items
  items: Record<string, any>[];           // Line items
  columns: PrintColumn[];                 // Column definitions
  
  // Pricing
  showPrice: boolean;                     // Show pricing columns
  subtotal?: number;                      // Subtotal amount
  taxAmount?: number;                     // Tax amount
  totalAmount?: number;                   // Grand total
  terbilang?: string;                     // Amount in words
  
  // Additional content
  notes?: string;                         // Document notes
  signatures?: PrintSignature[];          // Signature boxes
  
  // Layout options
  orientation?: 'portrait' | 'landscape'; // Default: 'portrait'
  paperSize?: PaperSize;                  // Default: 'A4'
}

interface PrintColumn {
  key: string;                            // Data key
  label: string;                          // Column header
  width?: string;                         // Column width (CSS)
  align?: 'left' | 'center' | 'right';   // Text alignment
  format?: (value: any) => string;        // Value formatter
}

interface PrintSignature {
  label: string;                          // Signature label
  name?: string;                          // Signer name (optional)
}

interface MetaItem {
  label: string;                          // Metadata label
  value: string;                          // Metadata value
}
```

**Layout Structure** (Portrait A4: 210mm x 297mm):
```
┌────────────────────────────────────────────────┐
│ [Logo]  Company Name          DOCUMENT TITLE  │ ← Header (60px)
│                                    [Status]    │
├────────────────────────────────────────────────┤
│ No. Dokumen : DOC-001    │ Additional Meta    │ ← Metadata (80px)
│ Tanggal     : 01 Jan 24  │ (if provided)      │
│ Pelanggan   : ABC Corp   │                    │
│ Referensi   : REF-001    │                    │
├────────────────────────────────────────────────┤
│ ┌──┬────────────┬─────┬────────┬────────────┐ │ ← Items Table
│ │No│ Item       │ Qty │ Price  │ Amount     │ │   (flexible height)
│ ├──┼────────────┼─────┼────────┼────────────┤ │
│ │1 │ Product A  │ 10  │ 10,000 │ 100,000    │ │
│ │2 │ Product B  │ 5   │ 20,000 │ 100,000    │ │
│ └──┴────────────┴─────┴────────┴────────────┘ │
│                                                │
│                          Subtotal: 200,000    │ ← Totals (60px)
│                          Pajak:     20,000    │
│                          Total:    220,000    │
│                                                │
│ Terbilang: Dua ratus dua puluh ribu rupiah    │ ← Terbilang (20px)
│                                                │
│ Catatan: [Notes text if provided]             │ ← Notes (40px)
│                                                │
│ ┌──────────────┐  ┌──────────────┐           │ ← Signatures (60px)
│ │              │  │              │           │
│ │  Dibuat Oleh │  │ Disetujui    │           │
│ │  [Name]      │  │ [Name]       │           │
│ └──────────────┘  └──────────────┘           │
│                                                │
│ ─────────────────────────────────────────────  │ ← Footer (20px)
│ Dicetak oleh sistem — 01 Januari 2024         │
└────────────────────────────────────────────────┘
```


### 3. ReportLayout Component (Financial & System Reports)

**Purpose**: Renders financial and system reports with professional table layouts.

**Props Interface**:
```typescript
interface ReportLayoutProps {
  // Report identification
  reportTitle: string;                    // e.g., "TRIAL BALANCE", "NERACA"
  reportSubtitle?: string;                // Additional title info
  
  // Company information
  companyName: string;                    // Company name
  companyLogo?: string;                   // Logo URL (optional)
  
  // Report parameters
  dateRange?: string;                     // e.g., "01 Jan 2024 - 31 Dec 2024"
  asOfDate?: string;                      // e.g., "Per 31 Desember 2024"
  generatedAt?: string;                   // Generation timestamp
  
  // Report data
  columns: ReportColumn[];                // Column definitions
  rows: ReportRow[];                      // Data rows
  
  // Report options
  showHierarchy?: boolean;                // Show account hierarchy
  showTotals?: boolean;                   // Show section totals
  paperSize?: PaperSize;                  // Default: 'A4'
}

interface ReportColumn {
  key: string;                            // Data key
  label: string;                          // Column header
  width?: string;                         // Column width
  align?: 'left' | 'center' | 'right';   // Alignment
  format?: (value: any) => string;        // Formatter
}

interface ReportRow {
  type: 'data' | 'subtotal' | 'total' | 'section-header';
  level?: number;                         // Hierarchy level (0-5)
  data: Record<string, any>;              // Row data
  bold?: boolean;                         // Bold text
  backgroundColor?: string;               // Row background
}
```

**Layout Structure** (Portrait A4: 210mm x 297mm):
```
┌────────────────────────────────────────────────┐
│           [Logo] Company Name                  │ ← Header (80px)
│                                                │
│              REPORT TITLE                      │
│         01 Jan 2024 - 31 Dec 2024             │
│         Generated: 01 Jan 2024 10:00          │
├────────────────────────────────────────────────┤
│ ┌────────────────────┬──────────┬──────────┐  │ ← Report Table
│ │ Account            │ Debit    │ Credit   │  │   (flexible height)
│ ├────────────────────┼──────────┼──────────┤  │
│ │ ASSETS             │          │          │  │   Section headers
│ │   Cash             │ 100,000  │     -    │  │   Indented items
│ │   Bank             │ 500,000  │     -    │  │   Subtotals
│ │ Total Assets       │ 600,000  │     -    │  │   Grand totals
│ │                    │          │          │  │
│ │ LIABILITIES        │          │          │  │
│ │   Accounts Payable │     -    │ 200,000  │  │
│ │ Total Liabilities  │     -    │ 200,000  │  │
│ │                    │          │          │  │
│ │ GRAND TOTAL        │ 600,000  │ 600,000  │  │
│ └────────────────────┴──────────┴──────────┘  │
│                                                │
│ ─────────────────────────────────────────────  │ ← Footer (20px)
│ Page 1 of 1 — Printed: 01 Jan 2024 10:00     │
└────────────────────────────────────────────────┘
```


## Data Models

### Document Data Structure

**Transaction Document Data**:
```typescript
interface TransactionDocument {
  name: string;                           // Document ID
  doctype: string;                        // Document type
  docstatus: number;                      // 0=Draft, 1=Submitted, 2=Cancelled
  
  // Basic info
  title: string;                          // Document title
  naming_series: string;                  // Document number
  posting_date: string;                   // Document date
  status: string;                         // Status text
  
  // Company
  company: string;                        // Company name
  
  // Party
  customer?: string;                      // Customer name (sales)
  supplier?: string;                      // Supplier name (purchase)
  customer_address?: string;              // Customer address
  supplier_address?: string;              // Supplier address
  
  // References
  sales_order?: string;                   // Related SO
  delivery_note?: string;                 // Related DN
  purchase_order?: string;                // Related PO
  purchase_receipt?: string;              // Related PR
  
  // Sales info
  sales_person?: string;                  // Sales person
  
  // Items
  items: TransactionItem[];               // Line items
  
  // Totals
  total_qty?: number;                     // Total quantity
  total?: number;                         // Subtotal
  total_taxes_and_charges?: number;       // Tax amount
  grand_total?: number;                   // Grand total
  in_words?: string;                      // Amount in words
  
  // Additional
  remarks?: string;                       // Notes
  custom_fields?: Record<string, any>;    // Custom fields
}

interface TransactionItem {
  idx: number;                            // Row number
  item_code: string;                      // Item code
  item_name: string;                      // Item name
  description?: string;                   // Description
  qty: number;                            // Quantity
  uom: string;                            // Unit of measure
  rate?: number;                          // Unit price
  amount?: number;                        // Line total
  warehouse?: string;                     // Warehouse
}
```

**Report Data Structure**:
```typescript
interface ReportData {
  report_name: string;                    // Report name
  filters: Record<string, any>;           // Applied filters
  columns: ReportColumn[];                // Column definitions
  data: ReportRow[];                      // Report rows
  message?: string;                       // Status message
  
  // Metadata
  company?: string;                       // Company name
  from_date?: string;                     // Start date
  to_date?: string;                       // End date
  as_on_date?: string;                    // As of date
}

interface ReportColumn {
  fieldname: string;                      // Field name
  label: string;                          // Column label
  fieldtype: string;                      // Data type
  width?: number;                         // Column width
  options?: string;                       // Additional options
}

interface ReportRow {
  [key: string]: any;                     // Dynamic fields
  indent?: number;                        // Hierarchy level
  is_total_row?: boolean;                 // Is total row
  account?: string;                       // Account name
  debit?: number;                         // Debit amount
  credit?: number;                        // Credit amount
  balance?: number;                       // Balance amount
}
```


## Layout Mockups and Examples

All layouts use A4 Portrait dimensions: **210mm width × 297mm height**

### 1. Sales Order Print Layout

**Dimensions**: 210mm × 297mm (A4 Portrait)
**Margins**: 10mm top/bottom, 12mm left/right
**Printable Area**: 186mm × 277mm

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 210mm Width (A4 Portrait)                                            ┃
┃ ┌──────────────────────────────────────────────────────────────────┐ ┃
┃ │ 12mm margin                                                      │ ┃
┃ │ ┌──────────────────────────────────────────────────────────────┐ │ ┃
┃ │ │ [LOGO]  PT. EXAMPLE COMPANY          SALES ORDER      [DRAFT]│ │ ┃ 60px
┃ │ │         Jl. Example No. 123                                  │ │ ┃ Header
┃ │ ├──────────────────────────────────────────────────────────────┤ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ │ No. Dokumen  : SO-2024-001      │ Tanggal Kirim : 15 Jan 24│ │ ┃ 80px
┃ │ │ Tanggal      : 10 Jan 2024      │ Syarat Bayar  : Net 30   │ │ ┃ Metadata
┃ │ │ Pelanggan    : PT. ABC Corp     │                          │ │ ┃
┃ │ │                Jl. Customer 456 │                          │ │ ┃
┃ │ │ Sales        : John Doe         │                          │ │ ┃
┃ │ ├──────────────────────────────────────────────────────────────┤ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ │ ┌───┬──────────┬────────────────────┬─────┬─────┬──────────┐│ │ ┃
┃ │ │ │No │ Kode     │ Nama Item          │ Qty │ Hrg │ Jumlah   ││ │ ┃
┃ │ │ ├───┼──────────┼────────────────────┼─────┼─────┼──────────┤│ │ ┃ Variable
┃ │ │ │ 1 │ ITEM-001 │ Product Alpha      │  10 │ 100 │  1,000   ││ │ ┃ Height
┃ │ │ │ 2 │ ITEM-002 │ Product Beta       │   5 │ 200 │  1,000   ││ │ ┃ (Items)
┃ │ │ │ 3 │ ITEM-003 │ Product Gamma      │   2 │ 500 │  1,000   ││ │ ┃
┃ │ │ └───┴──────────┴────────────────────┴─────┴─────┴──────────┘│ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ │                                      Subtotal : Rp 3,000,000│ │ ┃ 60px
┃ │ │                                      Pajak    : Rp   330,000│ │ ┃ Totals
┃ │ │                                      ─────────────────────── │ │ ┃
┃ │ │                                      TOTAL    : Rp 3,330,000│ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ │ Terbilang: Tiga juta tiga ratus tiga puluh ribu rupiah      │ │ ┃ 20px
┃ │ │                                                              │ │ ┃
┃ │ │ Catatan: Mohon konfirmasi penerimaan barang                 │ │ ┃ 30px
┃ │ │                                                              │ │ ┃
┃ │ │ ┌─────────────────┐        ┌─────────────────┐             │ │ ┃
┃ │ │ │                 │        │                 │             │ │ ┃ 60px
┃ │ │ │                 │        │                 │             │ │ ┃ Signatures
┃ │ │ │  Dibuat Oleh    │        │  Disetujui Oleh │             │ │ ┃
┃ │ │ │  John Doe       │        │  Jane Manager   │             │ │ ┃
┃ │ │ └─────────────────┘        └─────────────────┘             │ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ │ ──────────────────────────────────────────────────────────── │ │ ┃ 20px
┃ │ │ Dicetak oleh sistem — 10 Januari 2024 10:30 WIB             │ │ ┃ Footer
┃ │ └──────────────────────────────────────────────────────────────┘ │ ┃
┃ │                                                                  │ ┃
┃ └──────────────────────────────────────────────────────────────────┘ ┃
┃                                                                      ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
                            297mm Height
```

**Key Measurements**:
- Page: 210mm × 297mm
- Margins: 10mm (top/bottom), 12mm (left/right)
- Header height: 60px (~16mm)
- Metadata section: 80px (~21mm)
- Totals section: 60px (~16mm)
- Signature section: 60px (~16mm)
- Footer: 20px (~5mm)
- Item table: Flexible height (remaining space)


### 2. Delivery Note (Surat Jalan) Print Layout

**Dimensions**: 210mm × 297mm (A4 Portrait)
**Special Features**: Emphasizes delivery information, no pricing

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 210mm Width (A4 Portrait)                                            ┃
┃ ┌──────────────────────────────────────────────────────────────────┐ ┃
┃ │ ┌──────────────────────────────────────────────────────────────┐ │ ┃
┃ │ │ [LOGO]  PT. EXAMPLE COMPANY      SURAT JALAN      [SUBMITTED]│ │ ┃
┃ │ ├──────────────────────────────────────────────────────────────┤ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ │ No. Surat Jalan : SJ-2024-001   │ Tanggal Kirim : 12 Jan 24│ │ ┃
┃ │ │ Tanggal         : 12 Jan 2024   │ Pengemudi     : Ahmad    │ │ ┃
┃ │ │ Pelanggan       : PT. ABC Corp  │ No. Kendaraan : B1234XYZ │ │ ┃
┃ │ │                   Jl. Customer  │                          │ │ ┃
┃ │ │ Ref. Sales Order: SO-2024-001   │                          │ │ ┃
┃ │ ├──────────────────────────────────────────────────────────────┤ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ │ ┌───┬──────────┬────────────────────────┬─────┬────────────┐│ │ ┃
┃ │ │ │No │ Kode     │ Nama Item              │ Qty │ Gudang     ││ │ ┃
┃ │ │ ├───┼──────────┼────────────────────────┼─────┼────────────┤│ │ ┃
┃ │ │ │ 1 │ ITEM-001 │ Product Alpha          │  10 │ Gudang A   ││ │ ┃
┃ │ │ │ 2 │ ITEM-002 │ Product Beta           │   5 │ Gudang A   ││ │ ┃
┃ │ │ │ 3 │ ITEM-003 │ Product Gamma          │   2 │ Gudang B   ││ │ ┃
┃ │ │ └───┴──────────┴────────────────────────┴─────┴────────────┘│ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ │                                      Total Item : 3          │ │ ┃
┃ │ │                                      Total Qty  : 17         │ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ │ Catatan: Barang dikirim dalam kondisi baik                  │ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ │ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │ │ ┃
┃ │ │ │              │  │              │  │              │       │ │ ┃
┃ │ │ │              │  │              │  │              │       │ │ ┃
┃ │ │ │ Pengirim     │  │ Pengemudi    │  │ Penerima     │       │ │ ┃
┃ │ │ │ [Name]       │  │ Ahmad        │  │ [Name]       │       │ │ ┃
┃ │ │ └──────────────┘  └──────────────┘  └──────────────┘       │ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ │ ──────────────────────────────────────────────────────────── │ │ ┃
┃ │ │ Dicetak oleh sistem — 12 Januari 2024 08:00 WIB             │ │ ┃
┃ │ └──────────────────────────────────────────────────────────────┘ │ ┃
┃ └──────────────────────────────────────────────────────────────────┘ ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

**Key Features**:
- No pricing information (delivery document)
- Warehouse column instead of price
- Three signature boxes: Sender, Driver, Receiver
- Delivery-specific metadata (driver, vehicle number)
- Total items and quantity summary


### 3. Sales Invoice (Faktur Jual) Print Layout

**Dimensions**: 210mm × 297mm (A4 Portrait)
**Special Features**: Tax breakdown, payment terms, official invoice format

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 210mm Width (A4 Portrait)                                            ┃
┃ ┌──────────────────────────────────────────────────────────────────┐ ┃
┃ │ ┌──────────────────────────────────────────────────────────────┐ │ ┃
┃ │ │ [LOGO]  PT. EXAMPLE COMPANY      FAKTUR JUAL      [SUBMITTED]│ │ ┃
┃ │ │         NPWP: 01.234.567.8-901.000                           │ │ ┃
┃ │ ├──────────────────────────────────────────────────────────────┤ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ │ No. Faktur      : FJ-2024-001   │ Jatuh Tempo   : 09 Feb 24│ │ ┃
┃ │ │ Tanggal         : 10 Jan 2024   │ Syarat Bayar  : Net 30   │ │ ┃
┃ │ │ Pelanggan       : PT. ABC Corp  │ No. PO        : PO-123   │ │ ┃
┃ │ │                   Jl. Customer  │                          │ │ ┃
┃ │ │                   NPWP: 01.234  │                          │ │ ┃
┃ │ │ Ref. Surat Jalan: SJ-2024-001   │                          │ │ ┃
┃ │ │ Sales           : John Doe      │                          │ │ ┃
┃ │ ├──────────────────────────────────────────────────────────────┤ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ │ ┌───┬──────────┬──────────────────┬─────┬────────┬─────────┐│ │ ┃
┃ │ │ │No │ Kode     │ Nama Item        │ Qty │ Harga  │ Jumlah  ││ │ ┃
┃ │ │ ├───┼──────────┼──────────────────┼─────┼────────┼─────────┤│ │ ┃
┃ │ │ │ 1 │ ITEM-001 │ Product Alpha    │  10 │100,000 │1,000,000││ │ ┃
┃ │ │ │ 2 │ ITEM-002 │ Product Beta     │   5 │200,000 │1,000,000││ │ ┃
┃ │ │ │ 3 │ ITEM-003 │ Product Gamma    │   2 │500,000 │1,000,000││ │ ┃
┃ │ │ └───┴──────────┴──────────────────┴─────┴────────┴─────────┘│ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ │                                    Subtotal : Rp  3,000,000 │ │ ┃
┃ │ │                                    PPN 11%  : Rp    330,000 │ │ ┃
┃ │ │                                    ───────────────────────── │ │ ┃
┃ │ │                                    TOTAL    : Rp  3,330,000 │ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ │ Terbilang: Tiga juta tiga ratus tiga puluh ribu rupiah      │ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ │ Catatan: Pembayaran melalui transfer bank                   │ │ ┃
┃ │ │          Bank BCA 1234567890 a.n. PT. Example Company       │ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ │ ┌─────────────────┐        ┌─────────────────┐             │ │ ┃
┃ │ │ │                 │        │                 │             │ │ ┃
┃ │ │ │                 │        │                 │             │ │ ┃
┃ │ │ │  Hormat Kami    │        │  Penerima       │             │ │ ┃
┃ │ │ │  [Name]         │        │  [Name]         │             │ │ ┃
┃ │ │ └─────────────────┘        └─────────────────┘             │ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ │ ──────────────────────────────────────────────────────────── │ │ ┃
┃ │ │ Dicetak oleh sistem — 10 Januari 2024 14:30 WIB             │ │ ┃
┃ │ └──────────────────────────────────────────────────────────────┘ │ ┃
┃ └──────────────────────────────────────────────────────────────────┘ ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

**Key Features**:
- NPWP (tax ID) for both company and customer
- Tax breakdown (PPN 11%)
- Payment terms and due date
- Bank account information in notes
- Reference to delivery note
- Official invoice signatures


### 4. Purchase Order Print Layout

**Dimensions**: 210mm × 297mm (A4 Portrait)
**Special Features**: Delivery instructions, supplier information

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 210mm Width (A4 Portrait)                                            ┃
┃ ┌──────────────────────────────────────────────────────────────────┐ ┃
┃ │ ┌──────────────────────────────────────────────────────────────┐ │ ┃
┃ │ │ [LOGO]  PT. EXAMPLE COMPANY    PURCHASE ORDER     [SUBMITTED]│ │ ┃
┃ │ ├──────────────────────────────────────────────────────────────┤ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ │ No. PO          : PO-2024-001   │ Tgl Kirim     : 20 Jan 24│ │ ┃
┃ │ │ Tanggal         : 10 Jan 2024   │ Lokasi Kirim  : Gudang A │ │ ┃
┃ │ │ Pemasok         : PT. XYZ Supply│ Syarat Bayar  : Net 30   │ │ ┃
┃ │ │                   Jl. Supplier  │                          │ │ ┃
┃ │ │ Kontak          : 021-1234567   │                          │ │ ┃
┃ │ ├──────────────────────────────────────────────────────────────┤ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ │ ┌───┬──────────┬──────────────────┬─────┬────────┬─────────┐│ │ ┃
┃ │ │ │No │ Kode     │ Nama Item        │ Qty │ Harga  │ Jumlah  ││ │ ┃
┃ │ │ ├───┼──────────┼──────────────────┼─────┼────────┼─────────┤│ │ ┃
┃ │ │ │ 1 │ MAT-001  │ Raw Material A   │ 100 │ 50,000 │5,000,000││ │ ┃
┃ │ │ │ 2 │ MAT-002  │ Raw Material B   │  50 │100,000 │5,000,000││ │ ┃
┃ │ │ └───┴──────────┴──────────────────┴─────┴────────┴─────────┘│ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ │                                    Subtotal : Rp 10,000,000 │ │ ┃
┃ │ │                                    PPN 11%  : Rp  1,100,000 │ │ ┃
┃ │ │                                    ───────────────────────── │ │ ┃
┃ │ │                                    TOTAL    : Rp 11,100,000 │ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ │ Terbilang: Sebelas juta seratus ribu rupiah                 │ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ │ Catatan: Mohon kirim sesuai spesifikasi yang diminta        │ │ ┃
┃ │ │          Barang harus dalam kondisi baik                    │ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ │ ┌─────────────────┐        ┌─────────────────┐             │ │ ┃
┃ │ │ │                 │        │                 │             │ │ ┃
┃ │ │ │                 │        │                 │             │ │ ┃
┃ │ │ │  Dibuat Oleh    │        │  Disetujui Oleh │             │ │ ┃
┃ │ │ │  [Name]         │        │  [Manager]      │             │ │ ┃
┃ │ │ └─────────────────┘        └─────────────────┘             │ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ │ ──────────────────────────────────────────────────────────── │ │ ┃
┃ │ │ Dicetak oleh sistem — 10 Januari 2024 09:00 WIB             │ │ ┃
┃ │ └──────────────────────────────────────────────────────────────┘ │ ┃
┃ └──────────────────────────────────────────────────────────────────┘ ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

**Key Features**:
- Supplier contact information
- Expected delivery date and location
- Payment terms
- Delivery instructions in notes
- Approval signatures


### 5. Purchase Receipt Print Layout

**Dimensions**: 210mm × 297mm (A4 Portrait)
**Special Features**: Receipt confirmation, quality check notes

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 210mm Width (A4 Portrait)                                            ┃
┃ ┌──────────────────────────────────────────────────────────────────┐ ┃
┃ │ ┌──────────────────────────────────────────────────────────────┐ │ ┃
┃ │ │ [LOGO]  PT. EXAMPLE COMPANY  PURCHASE RECEIPT     [SUBMITTED]│ │ ┃
┃ │ ├──────────────────────────────────────────────────────────────┤ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ │ No. Penerimaan  : PR-2024-001   │ Tgl Terima    : 20 Jan 24│ │ ┃
┃ │ │ Tanggal         : 20 Jan 2024   │ Gudang        : Gudang A │ │ ┃
┃ │ │ Pemasok         : PT. XYZ Supply│ No. Surat Jln : SJ-XYZ   │ │ ┃
┃ │ │ Ref. PO         : PO-2024-001   │                          │ │ ┃
┃ │ ├──────────────────────────────────────────────────────────────┤ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ │ ┌───┬──────────┬────────────────┬────────┬────────┬────────┐│ │ ┃
┃ │ │ │No │ Kode     │ Nama Item      │ Dipesan│ Diterima│Gudang ││ │ ┃
┃ │ │ ├───┼──────────┼────────────────┼────────┼────────┼────────┤│ │ ┃
┃ │ │ │ 1 │ MAT-001  │ Raw Material A │   100  │   100  │Gudang A││ │ ┃
┃ │ │ │ 2 │ MAT-002  │ Raw Material B │    50  │    50  │Gudang A││ │ ┃
┃ │ │ └───┴──────────┴────────────────┴────────┴────────┴────────┘│ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ │                                      Total Diterima : 150    │ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ │ Catatan: Barang diterima dalam kondisi baik                 │ │ ┃
┃ │ │          Quality check: PASSED                              │ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ │ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │ │ ┃
┃ │ │ │              │  │              │  │              │       │ │ ┃
┃ │ │ │              │  │              │  │              │       │ │ ┃
┃ │ │ │ Penerima     │  │ QC Inspector │  │ Supervisor   │       │ │ ┃
┃ │ │ │ [Name]       │  │ [Name]       │  │ [Name]       │       │ │ ┃
┃ │ │ └──────────────┘  └──────────────┘  └──────────────┘       │ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ │ ──────────────────────────────────────────────────────────── │ │ ┃
┃ │ │ Dicetak oleh sistem — 20 Januari 2024 15:00 WIB             │ │ ┃
┃ │ └──────────────────────────────────────────────────────────────┘ │ ┃
┃ └──────────────────────────────────────────────────────────────────┘ ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

**Key Features**:
- Ordered vs Received quantity comparison
- Warehouse destination
- Supplier delivery note reference
- Quality check notes
- Three signatures: Receiver, QC Inspector, Supervisor


### 6. Purchase Invoice Print Layout

**Dimensions**: 210mm × 297mm (A4 Portrait)
**Special Features**: Supplier invoice, payment tracking

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 210mm Width (A4 Portrait)                                            ┃
┃ ┌──────────────────────────────────────────────────────────────────┐ ┃
┃ │ ┌──────────────────────────────────────────────────────────────┐ │ ┃
┃ │ │ [LOGO]  PT. EXAMPLE COMPANY  PURCHASE INVOICE     [SUBMITTED]│ │ ┃
┃ │ ├──────────────────────────────────────────────────────────────┤ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ │ No. Faktur      : PI-2024-001   │ Jatuh Tempo   : 19 Feb 24│ │ ┃
┃ │ │ Tanggal         : 20 Jan 2024   │ Syarat Bayar  : Net 30   │ │ ┃
┃ │ │ Pemasok         : PT. XYZ Supply│ No. Faktur    : INV-XYZ  │ │ ┃
┃ │ │                   Jl. Supplier  │ Supplier                 │ │ ┃
┃ │ │ Ref. PR         : PR-2024-001   │                          │ │ ┃
┃ │ ├──────────────────────────────────────────────────────────────┤ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ │ ┌───┬──────────┬──────────────────┬─────┬────────┬─────────┐│ │ ┃
┃ │ │ │No │ Kode     │ Nama Item        │ Qty │ Harga  │ Jumlah  ││ │ ┃
┃ │ │ ├───┼──────────┼──────────────────┼─────┼────────┼─────────┤│ │ ┃
┃ │ │ │ 1 │ MAT-001  │ Raw Material A   │ 100 │ 50,000 │5,000,000││ │ ┃
┃ │ │ │ 2 │ MAT-002  │ Raw Material B   │  50 │100,000 │5,000,000││ │ ┃
┃ │ │ └───┴──────────┴──────────────────┴─────┴────────┴─────────┘│ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ │                                    Subtotal : Rp 10,000,000 │ │ ┃
┃ │ │                                    PPN 11%  : Rp  1,100,000 │ │ ┃
┃ │ │                                    ───────────────────────── │ │ ┃
┃ │ │                                    TOTAL    : Rp 11,100,000 │ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ │ Terbilang: Sebelas juta seratus ribu rupiah                 │ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ │ Catatan: Pembayaran melalui transfer bank                   │ │ ┃
┃ │ │          Mohon sertakan nomor faktur sebagai referensi      │ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ │ ┌─────────────────┐        ┌─────────────────┐             │ │ ┃
┃ │ │ │                 │        │                 │             │ │ ┃
┃ │ │ │                 │        │                 │             │ │ ┃
┃ │ │ │  Diterima Oleh  │        │  Disetujui Oleh │             │ │ ┃
┃ │ │ │  [Name]         │        │  [Manager]      │             │ │ ┃
┃ │ │ └─────────────────┘        └─────────────────┘             │ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ │ ──────────────────────────────────────────────────────────── │ │ ┃
┃ │ │ Dicetak oleh sistem — 20 Januari 2024 16:00 WIB             │ │ ┃
┃ │ └──────────────────────────────────────────────────────────────┘ │ ┃
┃ └──────────────────────────────────────────────────────────────────┘ ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

**Key Features**:
- Supplier invoice number reference
- Payment due date
- Reference to purchase receipt
- Payment instructions
- Approval workflow signatures


### 7. Trial Balance Report Layout

**Dimensions**: 210mm × 297mm (A4 Portrait)
**Special Features**: Account hierarchy, debit/credit columns

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 210mm Width (A4 Portrait)                                            ┃
┃ ┌──────────────────────────────────────────────────────────────────┐ ┃
┃ │ ┌──────────────────────────────────────────────────────────────┐ │ ┃
┃ │ │                    [LOGO]                                    │ │ ┃
┃ │ │              PT. EXAMPLE COMPANY                             │ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ │                  TRIAL BALANCE                               │ │ ┃
┃ │ │            Per 31 Desember 2024                              │ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ │        Generated: 01 Januari 2025 10:00 WIB                 │ │ ┃
┃ │ ├──────────────────────────────────────────────────────────────┤ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ │ ┌────────────────────────────┬──────────────┬──────────────┐│ │ ┃
┃ │ │ │ Account                    │ Debit        │ Credit       ││ │ ┃
┃ │ │ ├────────────────────────────┼──────────────┼──────────────┤│ │ ┃
┃ │ │ │ ASSETS                     │              │              ││ │ ┃
┃ │ │ │   Current Assets           │              │              ││ │ ┃
┃ │ │ │     Cash                   │   1,000,000  │            - ││ │ ┃
┃ │ │ │     Bank - BCA             │   5,000,000  │            - ││ │ ┃
┃ │ │ │     Accounts Receivable    │   3,000,000  │            - ││ │ ┃
┃ │ │ │   Fixed Assets             │              │              ││ │ ┃
┃ │ │ │     Equipment              │  10,000,000  │            - ││ │ ┃
┃ │ │ │     Accumulated Depr.      │            - │   2,000,000  ││ │ ┃
┃ │ │ │                            │              │              ││ │ ┃
┃ │ │ │ LIABILITIES                │              │              ││ │ ┃
┃ │ │ │   Current Liabilities      │              │              ││ │ ┃
┃ │ │ │     Accounts Payable       │            - │   2,000,000  ││ │ ┃
┃ │ │ │     Tax Payable            │            - │     500,000  ││ │ ┃
┃ │ │ │                            │              │              ││ │ ┃
┃ │ │ │ EQUITY                     │              │              ││ │ ┃
┃ │ │ │   Capital                  │            - │  10,000,000  ││ │ ┃
┃ │ │ │   Retained Earnings        │            - │   4,500,000  ││ │ ┃
┃ │ │ │                            │              │              ││ │ ┃
┃ │ │ │ ═══════════════════════════════════════════════════════  ││ │ ┃
┃ │ │ │ TOTAL                      │  19,000,000  │  19,000,000  ││ │ ┃
┃ │ │ │ ═══════════════════════════════════════════════════════  ││ │ ┃
┃ │ │ └────────────────────────────┴──────────────┴──────────────┘│ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ │ ──────────────────────────────────────────────────────────── │ │ ┃
┃ │ │ Page 1 of 1 — Printed: 01 Januari 2025 10:00 WIB            │ │ ┃
┃ │ └──────────────────────────────────────────────────────────────┘ │ ┃
┃ └──────────────────────────────────────────────────────────────────┘ ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

**Key Features**:
- Centered company logo and name
- Report title and date prominently displayed
- Account hierarchy with indentation
- Debit and credit columns
- Bold totals with double underline
- Page number and print timestamp in footer
- Clean, professional table formatting


### 8. Balance Sheet Report Layout

**Dimensions**: 210mm × 297mm (A4 Portrait)
**Special Features**: Two-column format (Assets | Liabilities & Equity)

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 210mm Width (A4 Portrait)                                            ┃
┃ ┌──────────────────────────────────────────────────────────────────┐ ┃
┃ │ ┌──────────────────────────────────────────────────────────────┐ │ ┃
┃ │ │                    [LOGO]                                    │ │ ┃
┃ │ │              PT. EXAMPLE COMPANY                             │ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ │                 BALANCE SHEET                                │ │ ┃
┃ │ │                 (NERACA)                                     │ │ ┃
┃ │ │            Per 31 Desember 2024                              │ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ ├──────────────────────────────────────────────────────────────┤ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ │ ASSETS (ASET)                                                │ │ ┃
┃ │ │ ┌────────────────────────────────────────┬──────────────────┐│ │ ┃
┃ │ │ │ Current Assets (Aset Lancar)           │                  ││ │ ┃
┃ │ │ │   Cash (Kas)                           │      1,000,000   ││ │ ┃
┃ │ │ │   Bank - BCA                           │      5,000,000   ││ │ ┃
┃ │ │ │   Accounts Receivable (Piutang)        │      3,000,000   ││ │ ┃
┃ │ │ │   Inventory (Persediaan)               │      8,000,000   ││ │ ┃
┃ │ │ │ Total Current Assets                   │     17,000,000   ││ │ ┃
┃ │ │ │                                        │                  ││ │ ┃
┃ │ │ │ Fixed Assets (Aset Tetap)              │                  ││ │ ┃
┃ │ │ │   Equipment (Peralatan)                │     10,000,000   ││ │ ┃
┃ │ │ │   Accumulated Depreciation             │     (2,000,000)  ││ │ ┃
┃ │ │ │ Total Fixed Assets                     │      8,000,000   ││ │ ┃
┃ │ │ │                                        │                  ││ │ ┃
┃ │ │ │ TOTAL ASSETS                           │     25,000,000   ││ │ ┃
┃ │ │ └────────────────────────────────────────┴──────────────────┘│ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ │ LIABILITIES & EQUITY (KEWAJIBAN & EKUITAS)                   │ │ ┃
┃ │ │ ┌────────────────────────────────────────┬──────────────────┐│ │ ┃
┃ │ │ │ Current Liabilities (Kewajiban Lancar) │                  ││ │ ┃
┃ │ │ │   Accounts Payable (Hutang)            │      2,000,000   ││ │ ┃
┃ │ │ │   Tax Payable (Hutang Pajak)           │        500,000   ││ │ ┃
┃ │ │ │ Total Current Liabilities              │      2,500,000   ││ │ ┃
┃ │ │ │                                        │                  ││ │ ┃
┃ │ │ │ Equity (Ekuitas)                       │                  ││ │ ┃
┃ │ │ │   Capital (Modal)                      │     10,000,000   ││ │ ┃
┃ │ │ │   Retained Earnings (Laba Ditahan)     │     12,500,000   ││ │ ┃
┃ │ │ │ Total Equity                           │     22,500,000   ││ │ ┃
┃ │ │ │                                        │                  ││ │ ┃
┃ │ │ │ TOTAL LIABILITIES & EQUITY             │     25,000,000   ││ │ ┃
┃ │ │ └────────────────────────────────────────┴──────────────────┘│ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ │ ──────────────────────────────────────────────────────────── │ │ ┃
┃ │ │ Page 1 of 1 — Printed: 01 Januari 2025 10:00 WIB            │ │ ┃
┃ │ └──────────────────────────────────────────────────────────────┘ │ ┃
┃ └──────────────────────────────────────────────────────────────────┘ ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

**Key Features**:
- Bilingual labels (English/Indonesian)
- Grouped sections: Assets, Liabilities, Equity
- Indented sub-accounts
- Section totals in bold
- Grand totals emphasized
- Negative values in parentheses


### 9. Profit & Loss Statement Report Layout

**Dimensions**: 210mm × 297mm (A4 Portrait)
**Special Features**: Income vs Expenses, Net Profit calculation

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 210mm Width (A4 Portrait)                                            ┃
┃ ┌──────────────────────────────────────────────────────────────────┐ ┃
┃ │ ┌──────────────────────────────────────────────────────────────┐ │ ┃
┃ │ │                    [LOGO]                                    │ │ ┃
┃ │ │              PT. EXAMPLE COMPANY                             │ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ │            PROFIT & LOSS STATEMENT                           │ │ ┃
┃ │ │              (LAPORAN LABA RUGI)                             │ │ ┃
┃ │ │         01 Januari 2024 - 31 Desember 2024                   │ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ ├──────────────────────────────────────────────────────────────┤ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ │ ┌────────────────────────────────────────┬──────────────────┐│ │ ┃
┃ │ │ │ INCOME (PENDAPATAN)                    │                  ││ │ ┃
┃ │ │ │   Sales Revenue (Penjualan)            │     50,000,000   ││ │ ┃
┃ │ │ │   Service Revenue (Jasa)               │     10,000,000   ││ │ ┃
┃ │ │ │ Total Income                           │     60,000,000   ││ │ ┃
┃ │ │ │                                        │                  ││ │ ┃
┃ │ │ │ COST OF GOODS SOLD (HPP)               │                  ││ │ ┃
┃ │ │ │   Cost of Materials                    │     20,000,000   ││ │ ┃
┃ │ │ │   Direct Labor                         │      5,000,000   ││ │ ┃
┃ │ │ │ Total COGS                             │     25,000,000   ││ │ ┃
┃ │ │ │                                        │                  ││ │ ┃
┃ │ │ │ GROSS PROFIT (LABA KOTOR)              │     35,000,000   ││ │ ┃
┃ │ │ │                                        │                  ││ │ ┃
┃ │ │ │ OPERATING EXPENSES (BIAYA OPERASIONAL) │                  ││ │ ┃
┃ │ │ │   Salaries (Gaji)                      │     10,000,000   ││ │ ┃
┃ │ │ │   Rent (Sewa)                          │      3,000,000   ││ │ ┃
┃ │ │ │   Utilities (Utilitas)                 │      1,000,000   ││ │ ┃
┃ │ │ │   Marketing                            │      2,000,000   ││ │ ┃
┃ │ │ │   Depreciation (Penyusutan)            │      1,000,000   ││ │ ┃
┃ │ │ │ Total Operating Expenses               │     17,000,000   ││ │ ┃
┃ │ │ │                                        │                  ││ │ ┃
┃ │ │ │ OPERATING PROFIT (LABA OPERASIONAL)    │     18,000,000   ││ │ ┃
┃ │ │ │                                        │                  ││ │ ┃
┃ │ │ │ OTHER INCOME/EXPENSES                  │                  ││ │ ┃
┃ │ │ │   Interest Income                      │        500,000   ││ │ ┃
┃ │ │ │   Interest Expense                     │       (200,000)  ││ │ ┃
┃ │ │ │ Total Other Income/Expenses            │        300,000   ││ │ ┃
┃ │ │ │                                        │                  ││ │ ┃
┃ │ │ │ ═══════════════════════════════════════════════════════  ││ │ ┃
┃ │ │ │ NET PROFIT (LABA BERSIH)               │     18,300,000   ││ │ ┃
┃ │ │ │ ═══════════════════════════════════════════════════════  ││ │ ┃
┃ │ │ └────────────────────────────────────────┴──────────────────┘│ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ │ ──────────────────────────────────────────────────────────── │ │ ┃
┃ │ │ Page 1 of 1 — Printed: 01 Januari 2025 10:00 WIB            │ │ ┃
┃ │ └──────────────────────────────────────────────────────────────┘ │ ┃
┃ └──────────────────────────────────────────────────────────────────┘ ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

**Key Features**:
- Date range in header
- Bilingual labels
- Hierarchical structure: Income → COGS → Gross Profit → Operating Expenses → Net Profit
- Intermediate calculations (Gross Profit, Operating Profit)
- Net Profit emphasized with double underline
- Negative values in parentheses


### 10. Inventory Stock Report Layout

**Dimensions**: 210mm × 297mm (A4 Portrait)
**Special Features**: Stock levels, warehouse information

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 210mm Width (A4 Portrait)                                            ┃
┃ ┌──────────────────────────────────────────────────────────────────┐ ┃
┃ │ ┌──────────────────────────────────────────────────────────────┐ │ ┃
┃ │ │                    [LOGO]                                    │ │ ┃
┃ │ │              PT. EXAMPLE COMPANY                             │ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ │              INVENTORY STOCK REPORT                          │ │ ┃
┃ │ │              (LAPORAN STOK BARANG)                           │ │ ┃
┃ │ │            Per 31 Desember 2024                              │ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ ├──────────────────────────────────────────────────────────────┤ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ │ ┌────┬──────────┬──────────────────┬────────┬────┬─────────┐│ │ ┃
┃ │ │ │ No │ Kode     │ Nama Item        │ Gudang │ Qty│ Nilai   ││ │ ┃
┃ │ │ ├────┼──────────┼──────────────────┼────────┼────┼─────────┤│ │ ┃
┃ │ │ │  1 │ ITEM-001 │ Product Alpha    │Gudang A│ 100│1,000,000││ │ ┃
┃ │ │ │  2 │ ITEM-002 │ Product Beta     │Gudang A│  50│1,000,000││ │ ┃
┃ │ │ │  3 │ ITEM-003 │ Product Gamma    │Gudang B│  25│1,250,000││ │ ┃
┃ │ │ │  4 │ MAT-001  │ Raw Material A   │Gudang A│ 200│2,000,000││ │ ┃
┃ │ │ │  5 │ MAT-002  │ Raw Material B   │Gudang A│ 150│3,000,000││ │ ┃
┃ │ │ │  6 │ MAT-003  │ Raw Material C   │Gudang B│  80│1,600,000││ │ ┃
┃ │ │ │  7 │ CONS-001 │ Consumable Item  │Gudang A│ 500│  500,000││ │ ┃
┃ │ │ │  8 │ PACK-001 │ Packaging Mat.   │Gudang B│ 300│  600,000││ │ ┃
┃ │ │ └────┴──────────┴──────────────────┴────────┴────┴─────────┘│ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ │                                    Total Items : 8           │ │ ┃
┃ │ │                                    Total Qty   : 1,405       │ │ ┃
┃ │ │                                    Total Value : 10,950,000  │ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ │ ──────────────────────────────────────────────────────────── │ │ ┃
┃ │ │ Page 1 of 1 — Printed: 01 Januari 2025 10:00 WIB            │ │ ┃
┃ │ └──────────────────────────────────────────────────────────────┘ │ ┃
┃ └──────────────────────────────────────────────────────────────────┘ ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

**Key Features**:
- Item code and name
- Warehouse location
- Quantity on hand
- Stock value
- Summary totals at bottom
- Compact table format for many items


### 11. Sales Report Layout

**Dimensions**: 210mm × 297mm (A4 Portrait)
**Special Features**: Sales summary by customer, period analysis

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 210mm Width (A4 Portrait)                                            ┃
┃ ┌──────────────────────────────────────────────────────────────────┐ ┃
┃ │ ┌──────────────────────────────────────────────────────────────┐ │ ┃
┃ │ │                    [LOGO]                                    │ │ ┃
┃ │ │              PT. EXAMPLE COMPANY                             │ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ │                 SALES REPORT                                 │ │ ┃
┃ │ │              (LAPORAN PENJUALAN)                             │ │ ┃
┃ │ │         01 Januari 2024 - 31 Desember 2024                   │ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ ├──────────────────────────────────────────────────────────────┤ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ │ ┌────┬──────────────────┬──────┬──────────┬────────────────┐│ │ ┃
┃ │ │ │ No │ Customer         │ Inv  │ Qty      │ Total Sales    ││ │ ┃
┃ │ │ ├────┼──────────────────┼──────┼──────────┼────────────────┤│ │ ┃
┃ │ │ │  1 │ PT. ABC Corp     │   15 │      450 │     45,000,000 ││ │ ┃
┃ │ │ │  2 │ PT. XYZ Ltd      │   12 │      380 │     38,000,000 ││ │ ┃
┃ │ │ │  3 │ CV. Maju Jaya    │    8 │      200 │     20,000,000 ││ │ ┃
┃ │ │ │  4 │ PT. Sejahtera    │   10 │      300 │     30,000,000 ││ │ ┃
┃ │ │ │  5 │ UD. Berkah       │    5 │      120 │     12,000,000 ││ │ ┃
┃ │ │ │  6 │ PT. Global Trade │    7 │      180 │     18,000,000 ││ │ ┃
┃ │ │ │  7 │ CV. Sentosa      │    6 │      150 │     15,000,000 ││ │ ┃
┃ │ │ │  8 │ PT. Mandiri      │    9 │      250 │     25,000,000 ││ │ ┃
┃ │ │ └────┴──────────────────┴──────┴──────────┴────────────────┘│ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ │                              Total Customers : 8             │ │ ┃
┃ │ │                              Total Invoices  : 72            │ │ ┃
┃ │ │                              Total Quantity  : 2,030         │ │ ┃
┃ │ │                              Total Sales     : 203,000,000   │ │ ┃
┃ │ │                                                              │ │ ┃
┃ │ │ ──────────────────────────────────────────────────────────── │ │ ┃
┃ │ │ Page 1 of 1 — Printed: 01 Januari 2025 10:00 WIB            │ │ ┃
┃ │ └──────────────────────────────────────────────────────────────┘ │ ┃
┃ └──────────────────────────────────────────────────────────────────┘ ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

**Key Features**:
- Date range in header
- Customer-wise sales summary
- Invoice count per customer
- Quantity and sales amount
- Grand totals at bottom
- Bilingual title


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, I identified the following key properties that provide unique validation value. Many specific requirements have been consolidated into comprehensive properties that validate the same underlying behavior across all document types.

**Redundancy Analysis**:
- Requirements 2.1-2.7 (portrait orientation for each transaction document type) → Combined into Property 1
- Requirements 3.1-3.6 (portrait orientation for each report type) → Combined into Property 1
- Requirements 4.1-4.10 and 3.7-3.8 (report headers/footers) → Combined into Properties 2 and 3
- Requirements 5.1-5.10 (table formatting) → Combined into Property 4
- Requirements 11.1-11.7, 12.1-12.10 (document headers/metadata) → Combined into Properties 5 and 6
- Requirements 13.1-13.10 (item tables) → Combined into Property 7
- Requirements 17.1-17.9 (print styling) → Combined into Property 9

### Property 1: Correct A4 Portrait Dimensions

*For any* document type (transaction document, financial report, or system report), when rendered for print, the page dimensions SHALL be exactly 210mm width × 297mm height, and the aspect ratio SHALL equal 210:297.

**Validates: Requirements 1.1, 1.3, 1.4, 1.5, 1.6, 2.1-2.7, 3.1-3.6**

### Property 2: Report Header Completeness

*For any* financial report or system report, the rendered output SHALL contain a header section that includes the company name, report title, and either a date range or as-of date.

**Validates: Requirements 3.7, 4.1, 4.3, 4.4, 6.6**

### Property 3: Report Footer Presence

*For any* financial report or system report, the rendered output SHALL contain a footer section that includes page numbering and a print timestamp.

**Validates: Requirements 3.8, 4.8, 4.9, 6.7**

### Property 4: Currency Formatting Consistency

*For any* numeric currency value displayed in any document or report, the value SHALL be formatted using Indonesian locale (Rp X.XXX.XXX format with thousand separators).

**Validates: Requirements 3.10, 5.3, 14.6, 20.10**

### Property 5: Document Metadata Display

*For any* transaction document, the rendered output SHALL display document number, document date, and party name (customer or supplier) with clear labels in the metadata section.

**Validates: Requirements 12.2, 12.3, 12.4, 20.2, 20.3, 20.4, 20.5**

### Property 6: Table Column Alignment

*For any* table in any document or report, numeric columns SHALL be right-aligned and text columns SHALL be left-aligned.

**Validates: Requirements 5.2, 5.4, 13.3, 13.4**

### Property 7: Item Table Structure

*For any* transaction document with line items, the item table SHALL include row numbers, item identification (code/name), quantity, and appropriate additional columns based on document type (price for invoices, warehouse for receipts).

**Validates: Requirements 13.1, 13.9, 25.1-25.10**

### Property 8: Preview and Output Consistency

*For any* document, the CSS styles, dimensions, fonts, and margins used in the print preview SHALL be identical to those used in the actual print output.

**Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**

### Property 9: Print Media Query Application

*For any* document, when rendering for print (either preview or actual print), the system SHALL apply print-specific CSS media queries that hide UI controls, preserve backgrounds, and set appropriate page margins.

**Validates: Requirements 17.1, 17.2, 17.3, 17.7**

### Property 10: Indonesian Localization

*For any* label or text element in any document or report, the text SHALL be in Bahasa Indonesia according to the specified translations (e.g., "No. Dokumen", "Tanggal", "Pelanggan", "Pemasok", "Catatan", "Terbilang").

**Validates: Requirements 20.1-20.9**

### Property 11: Zoom Aspect Ratio Preservation

*For any* zoom level between 50% and 200%, the print preview SHALL maintain the correct aspect ratio (210:297) and the document SHALL remain centered in the viewport.

**Validates: Requirements 18.3, 18.6, 18.7**

### Property 12: Paper Size Dimension Calculation

*For any* paper size selection (A4, A5, Letter, Legal, F4) and orientation (portrait/landscape), the calculated page dimensions SHALL match the standard dimensions for that paper size and orientation.

**Validates: Requirements 19.2, 19.3, 19.6, 19.7**

### Property 13: Logo Display Fallback

*For any* document, when a company logo is not available or fails to load, the system SHALL display only the company name text without breaking the document layout.

**Validates: Requirements 10.5, 10.7**

### Property 14: Signature Section Page Break Prevention

*For any* document with signatures, the signature section SHALL not be split across page boundaries.

**Validates: Requirements 15.8, 17.5**

### Property 15: Address Formatting

*For any* customer or supplier address that is available, the address SHALL be displayed below the party name with proper line breaks and a smaller font size than the party name.

**Validates: Requirements 24.1, 24.2, 24.3, 24.4**

### Property 16: Component Prop Acceptance

*For any* valid prop passed to PrintLayout or ReportLayout components (orientation, paperSize, companyLogo, etc.), the component SHALL accept the prop and apply the corresponding styling or behavior without errors.

**Validates: Requirements 26.1-26.10, 27.1-27.8**

### Property 17: Error Handling Gracefully

*For any* error condition (missing data, failed API call, invalid document), the print system SHALL display a clear error message without crashing or showing broken layouts.

**Validates: Requirements 7.10, 23.6, 28.2, 28.3**


## Error Handling

### Error Categories

1. **Data Loading Errors**
   - Document not found
   - API connection failure
   - Invalid document data structure
   - Missing required fields

2. **Rendering Errors**
   - Invalid component props
   - Missing template data
   - Image loading failures (logo)
   - Font loading failures

3. **Print Errors**
   - Browser print dialog cancelled
   - Print permission denied
   - PDF generation failure

### Error Handling Strategy

**Data Loading Errors**:
```typescript
try {
  const document = await fetchDocument(documentName);
  if (!document) {
    throw new Error('Document not found');
  }
} catch (error) {
  // Display user-friendly error message
  showErrorDialog({
    title: 'Gagal Memuat Dokumen',
    message: 'Dokumen tidak dapat dimuat. Silakan coba lagi.',
    error: error.message
  });
  // Log error for debugging
  console.error('Document load error:', error);
}
```

**Rendering Errors**:
```typescript
// Use React Error Boundaries
<ErrorBoundary
  fallback={<PrintErrorFallback />}
  onError={(error, errorInfo) => {
    console.error('Print render error:', error, errorInfo);
  }}
>
  <PrintLayout {...props} />
</ErrorBoundary>

// Graceful fallbacks for missing data
const companyName = document.company || 'Company Name Not Available';
const logoUrl = document.company_logo || null; // Will trigger fallback in component
```

**Print Errors**:
```typescript
const handlePrint = async () => {
  try {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Pop-up blocked. Please allow pop-ups for this site.');
    }
    printWindow.document.write(buildPrintHtml());
    printWindow.document.close();
    printWindow.print();
  } catch (error) {
    showToast({
      type: 'error',
      message: 'Gagal mencetak dokumen. ' + error.message
    });
  }
};
```

### Validation Rules

**Before Rendering**:
1. Validate document data structure matches expected interface
2. Check for required fields (document number, date, party name)
3. Validate numeric values are valid numbers
4. Validate dates are valid date strings

**During Rendering**:
1. Use optional chaining for nested properties
2. Provide default values for missing optional fields
3. Handle empty arrays gracefully (show "No items" message)
4. Catch and log component errors with Error Boundaries

**After Rendering**:
1. Verify DOM elements are created correctly
2. Check computed dimensions match expected values
3. Validate CSS is applied correctly


## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests to ensure comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property tests**: Verify universal properties across all inputs
- Both are complementary and necessary for comprehensive coverage

### Unit Testing

**Focus Areas**:
1. Specific document examples (one test per document type)
2. Edge cases (empty items, missing optional fields, very long text)
3. Error conditions (invalid data, missing required fields)
4. Integration points (component composition, data flow)

**Example Unit Tests**:
```typescript
describe('PrintLayout Component', () => {
  it('should render Sales Order with all fields', () => {
    const props = createSalesOrderProps();
    render(<PrintLayout {...props} />);
    expect(screen.getByText('SALES ORDER')).toBeInTheDocument();
    expect(screen.getByText(props.documentNumber)).toBeInTheDocument();
  });

  it('should handle missing optional fields gracefully', () => {
    const props = { ...createMinimalProps(), notes: undefined };
    render(<PrintLayout {...props} />);
    expect(screen.queryByText('Catatan:')).not.toBeInTheDocument();
  });

  it('should display error message for invalid data', () => {
    const props = { ...createMinimalProps(), items: null };
    render(<PrintLayout {...props} />);
    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });
});
```

**Unit Test Coverage**:
- Component rendering with valid data
- Missing optional fields
- Empty arrays
- Invalid data types
- Error boundaries
- CSS class application
- Event handlers (zoom, print, close)

### Property-Based Testing

**Testing Library**: Use `fast-check` for TypeScript/JavaScript property-based testing

**Configuration**:
- Minimum 100 iterations per property test
- Each test references its design document property
- Tag format: `Feature: print-document-redesign, Property {number}: {property_text}`

**Property Test Examples**:

```typescript
import fc from 'fast-check';

describe('Property 1: Correct A4 Portrait Dimensions', () => {
  it('should use 210mm x 297mm dimensions for all document types', () => {
    // Feature: print-document-redesign, Property 1: Correct A4 Portrait Dimensions
    fc.assert(
      fc.property(
        fc.constantFrom('sales-order', 'delivery-note', 'sales-invoice', 
                       'purchase-order', 'purchase-receipt', 'purchase-invoice',
                       'trial-balance', 'balance-sheet', 'profit-loss'),
        (documentType) => {
          const { container } = render(<PrintPreviewModal {...createProps(documentType)} />);
          const pageElement = container.querySelector('.print-page');
          const computedStyle = window.getComputedStyle(pageElement);
          
          const widthMm = parseFloat(computedStyle.width) * 25.4 / 96;
          const heightMm = parseFloat(computedStyle.height) * 25.4 / 96;
          
          expect(widthMm).toBeCloseTo(210, 1);
          expect(heightMm).toBeCloseTo(297, 1);
          expect(widthMm / heightMm).toBeCloseTo(210 / 297, 0.01);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property 4: Currency Formatting Consistency', () => {
  it('should format all currency values with Indonesian locale', () => {
    // Feature: print-document-redesign, Property 4: Currency Formatting Consistency
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000000000 }),
        (amount) => {
          const formatted = formatCurrency(amount);
          
          // Should start with "Rp"
          expect(formatted).toMatch(/^Rp\s/);
          
          // Should have thousand separators
          if (amount >= 1000) {
            expect(formatted).toMatch(/\./);
          }
          
          // Should match Indonesian locale format
          const expected = new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
          }).format(amount);
          
          expect(formatted).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property 6: Table Column Alignment', () => {
  it('should right-align numeric columns and left-align text columns', () => {
    // Feature: print-document-redesign, Property 6: Table Column Alignment
    fc.assert(
      fc.property(
        fc.array(fc.record({
          item_code: fc.string(),
          item_name: fc.string(),
          qty: fc.integer({ min: 1, max: 1000 }),
          rate: fc.integer({ min: 100, max: 1000000 }),
          amount: fc.integer({ min: 100, max: 1000000000 })
        }), { minLength: 1, maxLength: 20 }),
        (items) => {
          const columns = [
            { key: 'item_code', label: 'Kode', align: 'left' },
            { key: 'item_name', label: 'Nama', align: 'left' },
            { key: 'qty', label: 'Qty', align: 'right' },
            { key: 'rate', label: 'Harga', align: 'right' },
            { key: 'amount', label: 'Jumlah', align: 'right' }
          ];
          
          const { container } = render(
            <PrintLayout items={items} columns={columns} {...otherProps} />
          );
          
          // Check text columns are left-aligned
          const textCells = container.querySelectorAll('td[style*="text-align: left"]');
          expect(textCells.length).toBeGreaterThan(0);
          
          // Check numeric columns are right-aligned
          const numericCells = container.querySelectorAll('td[style*="text-align: right"]');
          expect(numericCells.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property 10: Indonesian Localization', () => {
  it('should use Indonesian labels for all text elements', () => {
    // Feature: print-document-redesign, Property 10: Indonesian Localization
    fc.assert(
      fc.property(
        fc.constantFrom('sales-order', 'delivery-note', 'sales-invoice'),
        (documentType) => {
          const { container } = render(
            <PrintLayout {...createProps(documentType)} />
          );
          
          const html = container.innerHTML;
          
          // Should contain Indonesian labels
          expect(html).toMatch(/No\.\s*Dokumen/);
          expect(html).toMatch(/Tanggal/);
          expect(html).toMatch(/Pelanggan|Pemasok/);
          
          // Should NOT contain English labels
          expect(html).not.toMatch(/Document Number/);
          expect(html).not.toMatch(/Date:/);
          expect(html).not.toMatch(/Customer:|Supplier:/);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property 11: Zoom Aspect Ratio Preservation', () => {
  it('should maintain aspect ratio at all zoom levels', () => {
    // Feature: print-document-redesign, Property 11: Zoom Aspect Ratio Preservation
    fc.assert(
      fc.property(
        fc.integer({ min: 50, max: 200 }),
        (zoomLevel) => {
          const { container } = render(
            <PrintPreviewModal defaultZoom={zoomLevel} {...props} />
          );
          
          const previewElement = container.querySelector('[style*="transform: scale"]');
          const computedStyle = window.getComputedStyle(previewElement);
          
          const width = parseFloat(computedStyle.width);
          const height = parseFloat(computedStyle.height);
          const aspectRatio = width / height;
          
          expect(aspectRatio).toBeCloseTo(210 / 297, 0.01);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

**Property Test Coverage**:
- Dimension correctness across all document types (Property 1)
- Header/footer presence in all reports (Properties 2, 3)
- Currency formatting for all amounts (Property 4)
- Metadata display for all documents (Property 5)
- Column alignment for all tables (Property 6)
- Item table structure for all transactions (Property 7)
- Preview/output consistency (Property 8)
- Print media queries (Property 9)
- Indonesian localization (Property 10)
- Zoom behavior (Property 11)
- Paper size calculations (Property 12)
- Logo fallback (Property 13)
- Page break prevention (Property 14)
- Address formatting (Property 15)
- Component props (Property 16)
- Error handling (Property 17)

### Integration Testing

**Test Scenarios**:
1. End-to-end print flow: Open document → Open preview → Print → Verify output
2. Cross-browser testing: Chrome, Firefox, Safari, Edge
3. Physical printer testing: Print to actual printer and measure dimensions
4. PDF generation testing: Save as PDF and verify dimensions

**Manual Testing Checklist**:
- [ ] Print each document type on physical A4 paper
- [ ] Measure printed output with ruler (should be 210mm × 297mm)
- [ ] Verify preview matches printed output
- [ ] Test on different browsers
- [ ] Test with different paper sizes
- [ ] Test with missing optional data
- [ ] Test with very long text (item names, notes)
- [ ] Test with many items (50+ line items)
- [ ] Test logo loading and fallback
- [ ] Test zoom functionality
- [ ] Test paper settings changes

### Test Data Generators

Create generators for realistic test data:

```typescript
// Generators for property-based tests
const generateTransactionDocument = () => fc.record({
  documentNumber: fc.string({ minLength: 5, maxLength: 20 }),
  documentDate: fc.date(),
  companyName: fc.string({ minLength: 5, maxLength: 50 }),
  partyName: fc.string({ minLength: 5, maxLength: 50 }),
  items: fc.array(generateLineItem(), { minLength: 1, maxLength: 50 }),
  totalAmount: fc.integer({ min: 1000, max: 1000000000 })
});

const generateLineItem = () => fc.record({
  item_code: fc.string({ minLength: 3, maxLength: 20 }),
  item_name: fc.string({ minLength: 5, maxLength: 100 }),
  qty: fc.integer({ min: 1, max: 1000 }),
  rate: fc.integer({ min: 100, max: 10000000 }),
  amount: fc.integer({ min: 100, max: 10000000000 })
});

const generateReportData = () => fc.record({
  reportTitle: fc.string({ minLength: 10, maxLength: 50 }),
  companyName: fc.string({ minLength: 5, maxLength: 50 }),
  dateRange: fc.string(),
  rows: fc.array(generateReportRow(), { minLength: 5, maxLength: 100 })
});
```

### Performance Testing

**Metrics to Track**:
- Render time for documents with 1, 10, 50, 100 line items
- Preview load time
- Print dialog open time
- Memory usage during preview
- Browser responsiveness during zoom

**Performance Targets**:
- Preview render: < 500ms for documents with up to 50 items
- Zoom operation: < 100ms
- Print dialog open: < 200ms
- Memory usage: < 50MB for typical documents


## Implementation Approach

### Phase 1: Fix Core Dimensions (Priority: Critical)

**Goal**: Correct the fundamental dimension issue in PrintPreviewModal

**Current State**:
- Transaction documents (SO, SJ, FJ, PO, PR, PI) print at 215mm × 145mm (measured on physical paper)
- This is a non-standard short landscape format
- Only uses ~49% of A4 portrait height (145mm / 297mm)
- Wastes paper and looks unprofessional

**Target State**:
- All documents should use standard A4 portrait: 210mm × 297mm
- Full page utilization
- Professional appearance

**Tasks**:
1. Update `PAPER_DIMS` constant in `PrintPreviewModal.tsx`
   - Verify A4 dimensions are exactly `{ w: 210, h: 297 }`
   - Remove any hardcoded 215mm × 145mm or 215mm × 140mm values
   
2. Update dimension calculations
   - Ensure portrait calculation: `pageW = dims.w, pageH = dims.h`
   - Ensure landscape calculation: `pageW = dims.h, pageH = dims.w`
   - Verify pixel conversion: `pageWidthPx = pageW * (96 / 25.4)`

3. Update @page CSS rules
   - Set `@page { size: 210mm 297mm; }` for portrait
   - Set `@page { size: 297mm 210mm; }` for landscape

4. Test dimension fixes
   - Measure preview container dimensions
   - Verify aspect ratio is 210:297
   - Test actual print output

**Files to Modify**:
- `components/PrintPreviewModal.tsx`

**Estimated Effort**: 2-4 hours

### Phase 2: Enhance PrintLayout Component (Priority: High)

**Goal**: Add portrait orientation support and improve layout structure

**Tasks**:
1. Add new props to PrintLayout interface
   - `orientation?: 'portrait' | 'landscape'` (default: 'portrait')
   - `paperSize?: PaperSize` (default: 'A4')
   - `companyLogo?: string`
   - `partyAddress?: string`

2. Update CSS for portrait orientation
   - Adjust padding and margins for portrait
   - Optimize column widths for narrower page
   - Ensure all sections fit within 210mm width

3. Add company logo support
   - Render logo in header if provided
   - Handle loading errors gracefully
   - Maintain aspect ratio

4. Add address display
   - Show address below party name
   - Format multi-line addresses
   - Use smaller font size

5. Improve responsive layout
   - Adjust font sizes for readability
   - Optimize table column widths
   - Ensure proper spacing

**Files to Modify**:
- `components/PrintLayout.tsx`

**Estimated Effort**: 6-8 hours

### Phase 3: Create ReportLayout Component (Priority: High)

**Goal**: Build specialized component for financial and system reports

**Tasks**:
1. Create new `components/ReportLayout.tsx`
   - Define ReportLayoutProps interface
   - Implement report header with logo and title
   - Implement report table with hierarchy support
   - Implement report footer with pagination

2. Add hierarchy rendering
   - Support indentation levels (0-5)
   - Apply bold styling for totals
   - Handle section headers

3. Add report-specific styling
   - Centered header layout
   - Professional table formatting
   - Alternating row colors
   - Bold totals with underlines

4. Create report type variants
   - Trial Balance layout
   - Balance Sheet layout
   - P&L Statement layout
   - Generic report layout

**Files to Create**:
- `components/ReportLayout.tsx`
- `types/report-layout.ts`

**Estimated Effort**: 8-12 hours

### Phase 4: Update Document Print Pages (Priority: Medium)

**Goal**: Update all document pages to use corrected print components

**Tasks**:
1. Update Sales Order print page
   - Use portrait orientation
   - Add delivery date and payment terms
   - Test with sample data

2. Update Delivery Note print page
   - Use portrait orientation
   - Remove pricing, add warehouse column
   - Add three signature boxes

3. Update Sales Invoice print page
   - Use portrait orientation
   - Add NPWP fields
   - Add payment information

4. Update Purchase Order print page
   - Use portrait orientation
   - Add delivery instructions
   - Test with sample data

5. Update Purchase Receipt print page
   - Use portrait orientation
   - Add ordered vs received columns
   - Add QC signature

6. Update Purchase Invoice print page
   - Use portrait orientation
   - Add supplier invoice reference
   - Test with sample data

**Files to Modify**:
- `app/sales-order/print/[name]/page.tsx` (or similar)
- `app/delivery-note/print/[name]/page.tsx`
- `app/invoice/print/[name]/page.tsx`
- `app/purchase-orders/print/[name]/page.tsx`
- `app/purchase-receipt/print/[name]/page.tsx`
- `app/purchase-invoice/print/[name]/page.tsx`

**Estimated Effort**: 12-16 hours

### Phase 5: Update Report Print Pages (Priority: Medium)

**Goal**: Update all report pages to use ReportLayout component

**Tasks**:
1. Update Trial Balance report
   - Use ReportLayout component
   - Format account hierarchy
   - Add debit/credit columns

2. Update Balance Sheet report
   - Use ReportLayout component
   - Group by Assets/Liabilities/Equity
   - Add section totals

3. Update P&L Statement report
   - Use ReportLayout component
   - Calculate intermediate totals
   - Show net profit prominently

4. Update other financial reports
   - Cash Flow Statement
   - General Ledger
   - Other accounting reports

5. Update system reports
   - Inventory reports
   - Sales reports
   - Purchase reports
   - HR reports

**Files to Modify**:
- `app/reports/trial-balance/page.tsx` (or similar)
- `app/reports/balance-sheet/page.tsx`
- `app/reports/profit-loss/page.tsx`
- Other report pages

**Estimated Effort**: 16-20 hours

### Phase 6: Add Utility Functions (Priority: Low)

**Goal**: Create helper functions for common print operations

**Tasks**:
1. Create `utils/print-helpers.ts`
   - `formatCurrency(amount: number): string`
   - `formatDate(date: string): string`
   - `formatAddress(address: string): string[]`
   - `calculateTotals(items: Item[]): Totals`
   - `generateTerbilang(amount: number): string`

2. Create `utils/print-validation.ts`
   - `validateDocumentData(data: any): ValidationResult`
   - `validateReportData(data: any): ValidationResult`
   - `checkRequiredFields(data: any, fields: string[]): boolean`

3. Create `lib/print-context.tsx`
   - Context for print settings
   - Shared state for preview modal
   - Print action handlers

**Files to Create**:
- `utils/print-helpers.ts`
- `utils/print-validation.ts`
- `lib/print-context.tsx`

**Estimated Effort**: 4-6 hours

### Phase 7: Testing and Validation (Priority: Critical)

**Goal**: Comprehensive testing of all print functionality

**Tasks**:
1. Write unit tests
   - Component rendering tests
   - Edge case tests
   - Error handling tests

2. Write property-based tests
   - Dimension correctness
   - Formatting consistency
   - Localization
   - All 17 properties

3. Manual testing
   - Print each document type
   - Measure physical output
   - Test on different browsers
   - Test with various data scenarios

4. Performance testing
   - Measure render times
   - Test with large datasets
   - Monitor memory usage

5. Cross-browser testing
   - Chrome
   - Firefox
   - Safari
   - Edge

**Files to Create**:
- `tests/print-layout.test.tsx`
- `tests/report-layout.test.tsx`
- `tests/print-preview-modal.test.tsx`
- `tests/print-properties.test.tsx`

**Estimated Effort**: 16-20 hours

### Phase 8: Documentation and Cleanup (Priority: Low)

**Goal**: Document the new print system and clean up old code

**Tasks**:
1. Update component documentation
   - Add JSDoc comments
   - Document props and interfaces
   - Add usage examples

2. Create developer guide
   - How to add new document types
   - How to customize layouts
   - How to add new report types

3. Create user guide
   - How to print documents
   - How to use print preview
   - How to change paper settings

4. Clean up old code
   - Remove unused components
   - Remove hardcoded dimensions
   - Remove deprecated props

**Files to Create/Modify**:
- `docs/print-system-guide.md`
- `docs/print-customization.md`
- Component files (add documentation)

**Estimated Effort**: 4-6 hours

### Total Estimated Effort

- Phase 1: 2-4 hours
- Phase 2: 6-8 hours
- Phase 3: 8-12 hours
- Phase 4: 12-16 hours
- Phase 5: 16-20 hours
- Phase 6: 4-6 hours
- Phase 7: 16-20 hours
- Phase 8: 4-6 hours

**Total: 68-92 hours (approximately 2-3 weeks for one developer)**

### Implementation Order

1. **Week 1**: Phases 1-3 (Core fixes and new components)
2. **Week 2**: Phases 4-5 (Update all document and report pages)
3. **Week 3**: Phases 6-8 (Utilities, testing, documentation)

### Risk Mitigation

**Risk**: Breaking existing print functionality
**Mitigation**: 
- Maintain backward compatibility with existing props
- Test each document type after changes
- Keep old components until new ones are verified

**Risk**: Browser compatibility issues
**Mitigation**:
- Test on all major browsers early
- Use standard CSS properties
- Provide fallbacks for unsupported features

**Risk**: Performance issues with large documents
**Mitigation**:
- Test with 100+ line items
- Optimize rendering with React.memo
- Use virtualization if needed

**Risk**: Incorrect physical print dimensions
**Mitigation**:
- Test on actual printers early
- Measure output with ruler
- Adjust margins and padding as needed


## CSS and Styling Approach

### Print-Specific CSS

**Core @page Rules**:
```css
@page {
  size: 210mm 297mm; /* A4 Portrait */
  margin: 10mm 12mm; /* Top/Bottom: 10mm, Left/Right: 12mm */
}

@media print {
  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    margin: 0;
    padding: 0;
  }
  
  .no-print {
    display: none !important;
  }
  
  .page-break-avoid {
    page-break-inside: avoid;
    break-inside: avoid;
  }
  
  .page-break-before {
    page-break-before: always;
    break-before: always;
  }
}
```

### Dimension Calculations

**Current vs Target Dimensions**:
```typescript
// CURRENT (INCORRECT) - Measured on physical paper
const CURRENT_WIDTH_MM = 215;   // Should be 210mm
const CURRENT_HEIGHT_MM = 145;  // Should be 297mm (only 49% of correct height!)

// TARGET (CORRECT) - Standard A4 Portrait
const TARGET_WIDTH_MM = 210;
const TARGET_HEIGHT_MM = 297;
```

**Converting mm to pixels** (96 DPI standard):
```typescript
const MM_TO_PX = 96 / 25.4; // 3.7795275591

// A4 Portrait dimensions (TARGET)
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const A4_WIDTH_PX = A4_WIDTH_MM * MM_TO_PX;  // 793.7 px
const A4_HEIGHT_PX = A4_HEIGHT_MM * MM_TO_PX; // 1122.5 px

// Current incorrect dimensions (for reference)
const CURRENT_WIDTH_PX = 215 * MM_TO_PX;  // 812.5 px
const CURRENT_HEIGHT_PX = 145 * MM_TO_PX; // 547.9 px

// Margins
const MARGIN_TOP_MM = 10;
const MARGIN_BOTTOM_MM = 10;
const MARGIN_LEFT_MM = 12;
const MARGIN_RIGHT_MM = 12;

// Printable area
const PRINTABLE_WIDTH_MM = A4_WIDTH_MM - MARGIN_LEFT_MM - MARGIN_RIGHT_MM; // 186mm
const PRINTABLE_HEIGHT_MM = A4_HEIGHT_MM - MARGIN_TOP_MM - MARGIN_BOTTOM_MM; // 277mm
```

### Component Styling Strategy

**Inline Styles vs CSS Classes**:
- Use inline styles for dynamic values (dimensions, colors from props)
- Use CSS classes for static styling (borders, fonts, spacing)
- Use CSS-in-JS (style tag in component) for print-specific rules

**Example Component Styling**:
```typescript
export default function PrintLayout(props) {
  return (
    <>
      <style>{`
        .print-page {
          width: ${pageWidthPx}px;
          min-height: ${pageHeightPx}px;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 10px;
          color: #111;
          background: #fff;
          padding: 28px 34px;
          box-sizing: border-box;
        }
        
        @media print {
          .print-page {
            padding: 0;
            margin: 0;
          }
        }
      `}</style>
      
      <div className="print-page">
        {/* Content */}
      </div>
    </>
  );
}
```

### Typography

**Font Sizes**:
- Company name: 14px (bold)
- Document title: 16px (bold, uppercase)
- Section headers: 12px (bold)
- Body text: 10px
- Table headers: 10px (bold)
- Table content: 9-10px
- Footer: 8px
- Notes: 9px (italic)

**Font Weights**:
- Normal: 400
- Semi-bold: 600
- Bold: 700

**Line Heights**:
- Body text: 1.4
- Table content: 1.3
- Headers: 1.2

### Color Palette

**Document Colors**:
- Primary text: `#111` (near black)
- Secondary text: `#555` (dark gray)
- Tertiary text: `#9ca3af` (light gray)
- Borders: `#d1d5db` (light gray)
- Table header background: `#1e293b` (dark slate)
- Table header text: `#fff` (white)
- Alternating row background: `#f8fafc` (very light gray)
- Status badges: Contextual colors (green, yellow, red, blue)

**Print-Safe Colors**:
- Avoid pure white backgrounds (use #fff or #fefefe)
- Use dark colors for text (#111, not #000)
- Ensure sufficient contrast (WCAG AA minimum)
- Test colors on actual printers

### Responsive Scaling

**Zoom Implementation**:
```typescript
const scale = zoom / 100;

<div
  style={{
    transform: `scale(${scale})`,
    transformOrigin: 'top center',
    width: `${pageWidthPx}px`,
    minHeight: `${pageHeightPx}px`,
  }}
>
  {children}
</div>
```

**Maintaining Aspect Ratio**:
```typescript
// Always calculate both dimensions based on paper size and orientation
const aspectRatio = pageW / pageH; // Should be 210/297 for A4 portrait

// Verify aspect ratio
if (Math.abs(aspectRatio - (210/297)) > 0.01) {
  console.warn('Aspect ratio mismatch:', aspectRatio);
}
```

### Table Styling

**Responsive Column Widths**:
```css
.print-table {
  width: 100%;
  table-layout: fixed; /* Prevents overflow */
  border-collapse: collapse;
}

.print-table th,
.print-table td {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Allow wrapping for item names */
.print-table td.item-name {
  white-space: normal;
  word-wrap: break-word;
}
```

**Column Width Guidelines** (for 186mm printable width):
- Row number: 30px (8mm)
- Item code: 70px (19mm)
- Item name: Flexible (remaining space)
- Quantity: 50px (13mm)
- Price: 80px (21mm)
- Amount: 90px (24mm)

### Page Break Control

**Prevent Breaks**:
```css
.signature-section,
.totals-section,
.notes-section {
  page-break-inside: avoid;
  break-inside: avoid;
}

.print-table tr {
  page-break-inside: avoid;
  break-inside: avoid;
}
```

**Force Breaks**:
```css
.page-break {
  page-break-after: always;
  break-after: always;
}
```

### Browser-Specific Considerations

**Chrome/Edge**:
- Supports CSS `break-inside` and `page-break-inside`
- Good print preview accuracy
- Handles `print-color-adjust: exact` well

**Firefox**:
- Supports page break properties
- May need `-moz-` prefixes for some properties
- Print preview may differ slightly from Chrome

**Safari**:
- Requires `-webkit-print-color-adjust: exact`
- May have issues with flexbox in print
- Test thoroughly on macOS

**Cross-Browser CSS**:
```css
@media print {
  body {
    -webkit-print-color-adjust: exact;
    -moz-print-color-adjust: exact;
    -ms-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
```

### Performance Optimization

**CSS Performance**:
- Minimize use of box-shadow (expensive to print)
- Avoid complex gradients
- Use simple borders instead of decorative elements
- Limit use of transforms (except for zoom)

**Rendering Performance**:
- Use `will-change: transform` for zoom container
- Avoid re-rendering entire document on zoom
- Memoize expensive calculations
- Use React.memo for static sections

### Accessibility in Print

**Semantic HTML**:
- Use proper heading hierarchy (h1, h2, h3)
- Use table elements for tabular data
- Use semantic elements (header, footer, section)

**Print-Friendly Content**:
- Ensure sufficient contrast
- Use readable font sizes (minimum 9px)
- Provide clear visual hierarchy
- Include all necessary information (no hidden content)


## Summary

This design document provides a comprehensive technical specification for redesigning the print system in the ERP application. The redesign addresses critical issues with incorrect dimensions and inconsistent layouts while establishing a standardized, professional print system for all document types.

### Key Design Decisions

1. **Correct A4 Portrait Dimensions**: All documents use standard 210mm × 297mm dimensions
2. **Component Architecture**: Separate PrintLayout (transactions) and ReportLayout (reports) components
3. **Unified Preview Modal**: Single PrintPreviewModal component handles all document types
4. **Portrait-First Approach**: All documents default to portrait orientation
5. **Indonesian Localization**: All labels and formatting use Indonesian locale
6. **Property-Based Testing**: Comprehensive testing with 17 correctness properties
7. **Graceful Error Handling**: Robust error handling with user-friendly messages

### Design Highlights

**Architecture**:
- Clean separation between preview modal, layout components, and document pages
- Reusable components with clear prop interfaces
- Consistent data flow from API to rendered output

**Layout Mockups**:
- Detailed ASCII art mockups for all 11 document types
- Precise measurements and spacing guidelines
- Professional, business-appropriate designs

**Correctness Properties**:
- 17 properties covering all critical requirements
- Property-based testing with 100+ iterations per property
- Comprehensive validation of dimensions, formatting, and behavior

**Implementation Plan**:
- 8 phases with clear priorities and estimates
- Total effort: 68-92 hours (2-3 weeks)
- Risk mitigation strategies included

### Next Steps

1. **Review and Approval**: Stakeholders review design document and layout mockups
2. **Implementation**: Follow 8-phase implementation plan
3. **Testing**: Execute comprehensive testing strategy
4. **Deployment**: Roll out to production with monitoring

### Success Criteria

The redesign will be considered successful when:
- All documents print at correct A4 portrait dimensions (210mm × 297mm)
- Print preview matches actual print output exactly
- All 17 correctness properties pass with 100+ test iterations
- All document types have professional, consistent layouts
- Physical print output measures correctly with ruler
- Cross-browser testing passes on Chrome, Firefox, Safari, Edge
- User acceptance testing confirms improved print quality

---

**Document Version**: 1.0  
**Last Updated**: January 2025  
**Status**: Ready for Review

