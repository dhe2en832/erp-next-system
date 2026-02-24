# Design Document: Print System Redesign

## Overview

This design document specifies the technical approach for redesigning all print documents in the ERP system with **DUAL PAPER MODE** support.

### Two Print Modes

| Mode | Document Types | Dimensions | Paper Type | Printer |
|------|---------------|------------|------------|---------|
| **Continuous** | SO, SJ, FJ, PO, PR, PI, Payment Pay, Payment Receive | 210mm × Flexible | Continuous Form (9.5" width) | Dot Matrix |
| **Sheet** | All Reports (Financial, System) | 210mm × 297mm | A4 Standard | Laser/Inkjet |

### Design Principles

1. **Correct Paper Format**: Continuous for transactions, A4 for reports
2. **Consistency**: Standardized layouts within each document category
3. **Professional Appearance**: Clean, readable layouts suitable for business use
4. **Indonesian Localization**: All labels in Bahasa Indonesia
5. **Print Fidelity**: Preview matches actual print output exactly
6. **Flexibility**: Support both continuous form and standard sheet printing
7. **Maintainability**: Reusable components with clear separation of concerns

---

## Architecture

### High-Level Architecture

┌─────────────────────────────────────────────────────────────┐
│ Document Pages │
│ (Sales Order, Invoice, Reports, Payment, etc.) │
└────────────────────┬────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────┐
│ PrintPreviewModal Component │
│ - Zoom controls (50%-200%) │
│ - Paper mode indicator (continuous/sheet) │
│ - Paper settings (for sheet mode only) │
│ - Print & Save PDF actions │
└────────────────────┬────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────┐
│ Document Layout Components │
│ │
│ ┌──────────────────┐ ┌──────────────────┐ │
│ │ PrintLayout │ │ ReportLayout │ │
│ │ (Transactions) │ │ (Reports) │ │
│ │ Mode: Continuous │ │ Mode: Sheet │ │
│ └──────────────────┘ └──────────────────┘ │
│ │
│ Common Sub-components: │
│ - DocumentHeader, DocumentMetadata, ItemTable │
│ - TotalsSection, SignatureSection, DocumentFooter │
│ - ReportHeader, ReportTable, ReportFooter │
└─────────────────────────────────────────────────────────────┘


### Component Hierarchy
PrintPreviewModal
├── Toolbar (zoom, settings, print, save PDF)
├── Settings Panel (paper size, orientation) - Sheet mode only
└── Preview Container
└── Document Content (children prop)
├── PrintLayout (for transaction documents)
│ ├── DocumentHeader
│ ├── DocumentMetadata
│ ├── ItemTable
│ ├── TotalsSection
│ ├── SignatureSection
│ └── DocumentFooter
│
└── ReportLayout (for reports)
├── ReportHeader
├── ReportTable
└── ReportFooter


---

## Components and Interfaces

### 1. PrintPreviewModal Component

**Purpose**: Provides a standardized modal for previewing and printing all document types with dual paper mode support.

**Props Interface**:
```typescript
interface PrintPreviewModalProps {
  title: string;                          // Document title for toolbar
  onClose: () => void;                    // Close handler
  children: React.ReactNode;              // Document content to render
  paperMode?: PaperMode;                  // 'continuous' | 'sheet' (REQUIRED)
  defaultPaperSize?: PaperSize;           // Default: 'A4' (for sheet mode)
  defaultOrientation?: PaperOrientation;  // Default: 'portrait'
  allowPaperSettings?: boolean;           // Default: false for continuous mode
  zoomMin?: number;                       // Default: 50
  zoomMax?: number;                       // Default: 200
}

type PaperMode = 'continuous' | 'sheet';
type PaperSize = 'A4' | 'A5' | 'Letter' | 'Legal' | 'F4';
type PaperOrientation = 'portrait' | 'landscape';

const PAPER_DIMS: Record<PaperSize, { w: number; h: number }> = {
  A4:     { w: 210, h: 297 },
  A5:     { w: 148, h: 210 },
  Letter: { w: 216, h: 279 },
  Legal:  { w: 216, h: 356 },
  F4:     { w: 215, h: 330 },
};

// Calculate page dimensions based on paper mode
if (paperMode === 'continuous') {
  // Continuous form: fixed width, auto height
  const pageW = 210; // mm (printable width)
  const tractorMarginLeft = 5;  // mm
  const tractorMarginRight = 5; // mm
  const totalWidth = pageW + tractorMarginLeft + tractorMarginRight; // 220mm
  // Height is auto - determined by content
  // No fixed pageHeightPx
} else {
  // Standard sheet: fixed width and height
  const dims = PAPER_DIMS[paperSize];
  const pageW = orientation === 'portrait' ? dims.w : dims.h;
  const pageH = orientation === 'portrait' ? dims.h : dims.w;
  const pageWidthPx = pageW * (96 / 25.4);
  const pageHeightPx = pageH * (96 / 25.4);
}

2. PrintLayout Component (Transaction Documents)
Purpose: Renders transaction documents (SO, SJ, FJ, PO, PR, PI, Payment) with continuous form format.
Props Interface:

interface PrintLayoutProps {
  // Document identification
  documentTitle: string;                  // e.g., "SALES ORDER", "FAKTUR JUAL"
  documentNumber: string;                 // Document number
  documentDate: string;                   // Formatted date
  status?: string;                        // Document status badge
  
  // Company information
  companyName: string;                    // Company name
  companyLogo?: string;                   // Logo URL (optional)
  companyNpwp?: string;                   // NPWP (for invoices)
  
  // Party information
  partyLabel: string;                     // "Pelanggan" or "Pemasok"
  partyName: string;                      // Customer/Supplier name
  partyAddress?: string;                  // Address (optional)
  partyNpwp?: string;                     // NPWP (for invoices)
  
  // Reference information
  referenceDoc?: string;                  // Related document number
  referenceLabel?: string;                // Label for reference
  salesPerson?: string;                   // Sales person name
  
  // Document-specific fields
  deliveryDate?: string;                  // For SO, PO
  paymentTerms?: string;                  // For SO, Invoice
  dueDate?: string;                       // For Invoice
  driverName?: string;                    // For SJ
  vehicleNumber?: string;                 // For SJ
  warehouse?: string;                     // For SJ, PR
  paymentMethod?: string;                 // For Payment
  bankAccount?: string;                   // For Payment
  
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
  paperMode: 'continuous';                // Fixed for transactions
}

Layout Structure (Continuous Form):

┌────────────────────────────────────────────────┐
│ [5mm]                              [5mm]       │ ← Tractor margins
│ o o o o o o o o o o o o o o o o o o o o o o    │
│ o ┌──────────────────────────────────────────┐ o │
│ o │ [Logo]  Company Name    DOCUMENT TITLE   │ o │ ← Header (60px)
│ o │                              [Status]    │ o │
│ o ├──────────────────────────────────────────┤ o │
│ o │                                          │ o │
│ o │ No. Dokumen : DOC-001  │ Additional Meta │ o │ ← Metadata (80px)
│ o │ Tanggal     : 01 Jan 24│ (if provided)   │ o │
│ o │ Pelanggan   : ABC Corp │                 │ o │
│ o ├──────────────────────────────────────────┤ o │
│ o │                                          │ o │
│ o │ ┌──┬────────┬─────┬────────┬──────────┐  │ o │ ← Items Table
│ o │ │No│ Item   │ Qty │ Price  │ Amount   │  │ o │   (flexible)
│ o │ ├──┼────────┼─────┼────────┼──────────┤  │ o │
│ o │ │1 │ Prod A │ 10  │ 10,000 │ 100,000  │  │ o │
│ o │ └──┴────────┴─────┴────────┴──────────┘  │ o │
│ o │                                          │ o │
│ o │                    Subtotal: 200,000     │ o │ ← Totals (60px)
│ o │                    Pajak:     20,000     │ o │
│ o │                    Total:    220,000     │ o │
│ o │                                          │ o │
│ o │ Terbilang: Dua ratus dua puluh ribu      │ o │ ← Terbilang (20px)
│ o │                                          │ o │
│ o │ Catatan: [Notes text if provided]        │ o │ ← Notes (40px)
│ o │                                          │ o │
│ o │ ┌──────────┐    ┌──────────┐            │ o │ ← Signatures (60px)
│ o │ │          │    │          │            │ o │
│ o │ │ Dibuat   │    │ Disetujui│            │ o │
│ o │ └──────────┘    └──────────┘            │ o │
│ o │                                          │ o │
│ o │ ──────────────────────────────────────── │ o │ ← Footer (20px)
│ o │ Dicetak oleh sistem — 01 Januari 2024    │ o │
│ o └──────────────────────────────────────────┘ o │
│ o o o o o o o o o o o o o o o o o o o o o o    │
│ o o o o o o o o o o o o o o o o o o o o o o    │
└────────────────────────────────────────────────┘
     210mm printable width (220mm total with margins)
     Height: Flexible (auto-adjusts to content)

     3. ReportLayout Component (Financial & System Reports)
Purpose: Renders financial and system reports with A4 fixed format.
Props Interface:

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
  
  // Layout options
  paperMode: 'sheet';                     // Fixed for reports
  paperSize?: PaperSize;                  // Default: 'A4'
  orientation?: PaperOrientation;         // Default: 'portrait'
}

Layout Structure (A4 Fixed):
┌────────────────────────────────────────────────┐
│ 10mm margin                                    │
│ ┌────────────────────────────────────────────┐ │
│ │                                            │ │
│ │           [Logo] Company Name              │ │ ← Header (80px)
│ │                                            │ │
│ │              REPORT TITLE                  │ │
│ │         01 Jan 2024 - 31 Dec 2024         │ │
│ │         Generated: 01 Jan 2024 10:00      │ │
│ ├────────────────────────────────────────────┤ │
│ │                                            │ │
│ │ ┌────────────────────┬────────┬────────┐  │ │ ← Report Table
│ │ │ Account            │ Debit  │ Credit │  │ │   (flexible)
│ │ ├────────────────────┼────────┼────────┤  │ │
│ │ │ ASSETS             │        │        │  │ │   Section headers
│ │ │   Cash             │ 100,000│   -    │  │ │   Indented items
│ │ │   Bank             │ 500,000│   -    │  │ │   Subtotals
│ │ │ Total Assets       │ 600,000│   -    │  │ │   Grand totals
│ │ │                    │        │        │  │ │
│ │ │ LIABILITIES        │        │        │  │ │
│ │ │   Accounts Payable │   -    │ 200,000│  │ │
│ │ │                    │        │        │  │ │
│ │ │ ══════════════════════════════════════ │  │ │
│ │ │ TOTAL                600,000   600,000│  │ │
│ │ │ ══════════════════════════════════════ │  │ │
│ │ └────────────────────┴────────┴────────┘  │ │
│ │                                            │ │
│ │ ────────────────────────────────────────── │ │ ← Footer (20px)
│ │ Page 1 of 1 — Printed: 01 Jan 2024 10:00  │ │
│ └────────────────────────────────────────────┘ │
│ 10mm margin                                    │
└────────────────────────────────────────────────┘
     210mm × 297mm (A4 Fixed)

     CSS and Styling Approach
Print-Specific CSS
Continuous Form @page Rules:

@page continuous {
  size: 210mm auto;  /* Fixed width, auto height */
  margin: 0 5mm;     /* 5mm left/right for tractor holes */
}

@media print {
  .continuous-mode {
    width: 210mm;
    min-height: auto;
    page-break-inside: avoid;
  }
  
  .continuous-mode .no-break {
    page-break-inside: avoid;
    break-inside: avoid;
  }
}

A4 Sheet @page Rules:
@page sheet {
  size: A4 portrait;  /* 210mm × 297mm */
  margin: 10mm 12mm;  /* Top/Bottom: 10mm, Left/Right: 12mm */
}

@media print {
  .sheet-mode {
    width: 210mm;
    height: 297mm;
  }
  
  .sheet-mode .page-break {
    page-break-after: always;
    break-after: always;
  }
  
  .sheet-mode .no-break {
    page-break-inside: avoid;
    break-inside: avoid;
  }
}

Common Print Styles:
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
  
  .print-page {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10px;
    color: #111;
    background: #fff;
    box-sizing: border-box;
  }
  
  .print-table {
    width: 100%;
    table-layout: fixed;
    border-collapse: collapse;
  }
  
  .print-table th,
  .print-table td {
    overflow: hidden;
    text-overflow: ellipsis;
    border: 1px solid #d1d5db;
    padding: 4px 6px;
  }
  
  .text-right {
    text-align: right;
  }
  
  .text-left {
    text-align: left;
  }
  
  .font-bold {
    font-weight: 700;
  }
  
  .totals-section {
    page-break-inside: avoid;
    break-inside: avoid;
  }
  
  .signature-section {
    page-break-inside: avoid;
    break-inside: avoid;
    margin-top: 20px;
  }
}

Dimension Calculations
// Conversion constants
const MM_TO_PX = 96 / 25.4; // 3.7795275591

// Continuous Form Dimensions
const CONTINUOUS_PRINTABLE_WIDTH_MM = 210;
const CONTINUOUS_TRACTOR_MARGIN_MM = 5;
const CONTINUOUS_TOTAL_WIDTH_MM = 210 + 5 + 5; // 220mm
const CONTINUOUS_WIDTH_PX = CONTINUOUS_PRINTABLE_WIDTH_MM * MM_TO_PX; // 793.7px

// A4 Sheet Dimensions
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const A4_WIDTH_PX = A4_WIDTH_MM * MM_TO_PX;  // 793.7px
const A4_HEIGHT_PX = A4_HEIGHT_MM * MM_TO_PX; // 1122.5px

// Margins
const A4_MARGIN_TOP_MM = 10;
const A4_MARGIN_BOTTOM_MM = 10;
const A4_MARGIN_LEFT_MM = 12;
const A4_MARGIN_RIGHT_MM = 12;

// Printable Area (A4)
const A4_PRINTABLE_WIDTH_MM = A4_WIDTH_MM - A4_MARGIN_LEFT_MM - A4_MARGIN_RIGHT_MM; // 186mm
const A4_PRINTABLE_HEIGHT_MM = A4_HEIGHT_MM - A4_MARGIN_TOP_MM - A4_MARGIN_BOTTOM_MM; // 277mm

Layout Mockups
1. Sales Order (Continuous Form)
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ o o o o o o o o o o o o o o o o o o o o o o o o o o o o o o ┃
┃ o ┌──────────────────────────────────────────────────────┐ o ┃
┃ o │ [LOGO]  PT. EXAMPLE COMPANY      SALES ORDER  [DRAFT]│ o ┃
┃ o ├──────────────────────────────────────────────────────┤ o ┃
┃ o │                                                      │ o ┃
┃ o │ No. Dokumen  : SO-2024-001    │ Tgl Kirim : 15 Jan 24│ o ┃
┃ o │ Tanggal      : 10 Jan 2024    │ Syarat Bayar: Net 30 │ o ┃
┃ o │ Pelanggan    : PT. ABC Corp   │                        │ o ┃
┃ o │                Jl. Customer 456│                        │ o ┃
┃ o │ Sales        : John Doe       │                        │ o ┃
┃ o ├──────────────────────────────────────────────────────┤ o ┃
┃ o │                                                      │ o ┃
┃ o │ ┌───┬──────────┬────────────────┬─────┬─────┬──────┐│ o ┃
┃ o │ │No │ Kode     │ Nama Item      │ Qty │ Hrg │Jumlah││ o ┃
┃ o │ ├───┼──────────┼────────────────┼─────┼─────┼──────┤│ o ┃
┃ o │ │ 1 │ ITEM-001 │ Product Alpha  │  10 │ 100 │ 1,000││ o ┃
┃ o │ │ 2 │ ITEM-002 │ Product Beta   │   5 │ 200 │ 1,000││ o ┃
┃ o │ └───┴──────────┴────────────────┴─────┴─────┴──────┘│ o ┃
┃ o │                                                      │ o ┃
┃ o │                              Subtotal : Rp 3,000,000 │ o ┃
┃ o │                              Pajak    : Rp   330,000 │ o ┃
┃ o │                              ─────────────────────── │ o ┃
┃ o │                              TOTAL    : Rp 3,330,000 │ o ┃
┃ o │                                                      │ o ┃
┃ o │ Terbilang: Tiga juta tiga ratus tiga puluh ribu rupiah│ o ┃
┃ o │                                                      │ o ┃
┃ o │ Catatan: Mohon konfirmasi penerimaan barang          │ o ┃
┃ o │                                                      │ o ┃
┃ o │ ┌─────────────────┐        ┌─────────────────┐      │ o ┃
┃ o │ │                 │        │                 │      │ o ┃
┃ o │ │  Dibuat Oleh    │        │  Disetujui Oleh │      │ o ┃
┃ o │ │  John Doe       │        │  Jane Manager   │      │ o ┃
┃ o │ └─────────────────┘        └─────────────────┘      │ o ┃
┃ o │                                                      │ o ┃
┃ o │ ──────────────────────────────────────────────────── │ o ┃
┃ o │ Dicetak oleh sistem — 10 Januari 2024 10:30 WIB     │ o ┃
┃ o └──────────────────────────────────────────────────────┘ o ┃
┃ o o o o o o o o o o o o o o o o o o o o o o o o o o o o o o ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
     210mm printable width | Height: Flexible (content-based)

     2. Delivery Note / Surat Jalan (Continuous Form)
     ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ o o o o o o o o o o o o o o o o o o o o o o o o o o o o o o ┃
┃ o ┌──────────────────────────────────────────────────────┐ o ┃
┃ o │ [LOGO]  PT. EXAMPLE COMPANY    SURAT JALAN [SUBMITTED]│ o ┃
┃ o ├──────────────────────────────────────────────────────┤ o ┃
┃ o │                                                      │ o ┃
┃ o │ No. Surat Jalan : SJ-2024-001 │ Tgl Kirim : 12 Jan 24│ o ┃
┃ o │ Tanggal         : 12 Jan 2024 │ Pengemudi   : Ahmad  │ o ┃
┃ o │ Pelanggan       : PT. ABC Corp│ No. Kendaraan: B1234 │ o ┃
┃ o │ Ref. Sales Order: SO-2024-001 │                        │ o ┃
┃ o ├──────────────────────────────────────────────────────┤ o ┃
┃ o │                                                      │ o ┃
┃ o │ ┌───┬──────────┬────────────────────┬─────┬────────┐│ o ┃
┃ o │ │No │ Kode     │ Nama Item          │ Qty │ Gudang ││ o ┃
┃ o │ ├───┼──────────┼────────────────────┼─────┼────────┤│ o ┃
┃ o │ │ 1 │ ITEM-001 │ Product Alpha      │  10 │Gudang A││ o ┃
┃ o │ │ 2 │ ITEM-002 │ Product Beta       │   5 │Gudang A││ o ┃
┃ o │ └───┴──────────┴────────────────────┴─────┴────────┘│ o ┃
┃ o │                                                      │ o ┃
┃ o │                              Total Item : 3          │ o ┃
┃ o │                              Total Qty  : 17         │ o ┃
┃ o │                                                      │ o ┃
┃ o │ Catatan: Barang dikirim dalam kondisi baik           │ o ┃
┃ o │                                                      │ o ┃
┃ o │ ┌──────────┐  ┌──────────┐  ┌──────────┐           │ o ┃
┃ o │ │          │  │          │  │          │           │ o ┃
┃ o │ │ Pengirim │  │Pengemudi │  │ Penerima │           │ o ┃
┃ o │ └──────────┘  └──────────┘  └──────────┘           │ o ┃
┃ o │                                                      │ o ┃
┃ o │ ──────────────────────────────────────────────────── │ o ┃
┃ o │ Dicetak oleh sistem — 12 Januari 2024 08:00 WIB     │ o ┃
┃ o └──────────────────────────────────────────────────────┘ o ┃
┃ o o o o o o o o o o o o o o o o o o o o o o o o o o o o o o ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
     NO PRICING | 3 Signatures | Warehouse Column

     3. Trial Balance Report (A4 Fixed)
     ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 10mm margin                                                  ┃
┃ ┌──────────────────────────────────────────────────────────┐ ┃
┃ │                                                          │ ┃
┃ │                    [LOGO]                                │ ┃
┃ │              PT. EXAMPLE COMPANY                         │ ┃
┃ │                                                          │ ┃
┃ │                  TRIAL BALANCE                           │ ┃
┃ │            Per 31 Desember 2024                          │ ┃
┃ │                                                          │ ┃
┃ │         Generated: 01 Januari 2025 10:00 WIB            │ ┃
┃ ├──────────────────────────────────────────────────────────┤ ┃
┃ │                                                          │ ┃
┃ │ ┌────────────────────────────┬──────────────┬──────────┐│ ┃
┃ │ │ Account                    │ Debit        │ Credit   ││ ┃
┃ │ ├────────────────────────────┼──────────────┼──────────┤│ ┃
┃ │ │ ASSETS                     │              │          ││ ┃
┃ │ │   Current Assets           │              │          ││ ┃
┃ │ │     Cash                   │   1,000,000  │        - ││ ┃
┃ │ │     Bank - BCA             │   5,000,000  │        - ││ ┃
┃ │ │   Fixed Assets             │              │          ││ ┃
┃ │ │     Equipment              │  10,000,000  │        - ││ ┃
┃ │ │                            │              │          ││ ┃
┃ │ │ LIABILITIES                │              │          ││ ┃
┃ │ │   Accounts Payable         │            - │ 2,000,000││ ┃
┃ │ │                            │              │          ││ ┃
┃ │ │ ════════════════════════════════════════════════════ ││ ┃
┃ │ │ TOTAL                      │  19,000,000  │ 19,000,000││ ┃
┃ │ │ ════════════════════════════════════════════════════ ││ ┃
┃ │ └────────────────────────────┴──────────────┴──────────┘│ ┃
┃ │                                                          │ ┃
┃ │ ──────────────────────────────────────────────────────── │ ┃
┃ │ Page 1 of 1 — Printed: 01 Januari 2025 10:00 WIB        │ ┃
┃ └──────────────────────────────────────────────────────────┘ ┃
┃ 10mm margin                                                  ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
     210mm × 297mm (A4 Fixed) | Page Numbers | Pagination Support

     Summary
This design document provides a comprehensive technical specification for redesigning the print system with DUAL PAPER MODE support:
Key Design Decisions
Two Paper Modes: Continuous form for transactions, A4 sheet for reports
Transaction Documents: 210mm width × flexible height (SO, SJ, FJ, PO, PR, PI, Payment)
Report Documents: 210mm × 297mm fixed (all financial and system reports)
Component Architecture: Separate PrintLayout (transactions) and ReportLayout (reports)
Unified Preview Modal: Single PrintPreviewModal handles both paper modes
Indonesian Localization: All labels and formatting use Indonesian locale
Property-Based Testing: 17 correctness properties with 100+ iterations each
Success Criteria
All transaction documents print on continuous form with correct 210mm width
All report documents print on A4 with correct 210mm × 297mm dimensions
Print preview matches actual print output exactly
All 17 correctness properties pass with 100+ test iterations
Physical print output measures correctly with ruler
Cross-browser testing passes on Chrome, Firefox, Safari, Edge
User acceptance testing confirms improved print quality
Document Version: 2.0 (Final - Dual Paper Mode)
Last Updated: January 2025
Status: Ready for Implementation