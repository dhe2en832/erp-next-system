/**
 * Print System Type Definitions
 * 
 * This file contains all TypeScript type definitions for the print system redesign.
 * It supports dual paper mode: continuous form for transactions and A4 sheet for reports.
 */

// ============================================================================
// Paper Mode Types
// ============================================================================

/**
 * Paper mode determines the print format
 * - 'continuous': Continuous form (210mm × flexible height) for transaction documents
 * - 'sheet': Standard sheet (210mm × 297mm fixed) for reports
 */
export type PaperMode = 'continuous' | 'sheet';

/**
 * Paper size options for sheet mode
 */
export type PaperSize = 'A4' | 'A5' | 'Letter' | 'Legal' | 'F4';

/**
 * Paper orientation for sheet mode
 */
export type PaperOrientation = 'portrait' | 'landscape';

// ============================================================================
// Component Props Interfaces
// ============================================================================

/**
 * Props for PrintPreviewModal component
 * Provides a unified modal for previewing and printing all document types
 */
export interface PrintPreviewModalProps {
  /** Document title displayed in toolbar */
  title: string;
  
  /** Close handler callback */
  onClose: () => void;
  
  /** Document content to render */
  children: React.ReactNode;
  
  /** Paper mode: 'continuous' for transactions, 'sheet' for reports (REQUIRED) */
  paperMode: PaperMode;
  
  /** Default paper size for sheet mode (default: 'A4') */
  defaultPaperSize?: PaperSize;
  
  /** Default orientation for sheet mode (default: 'portrait') */
  defaultOrientation?: PaperOrientation;
  
  /** Allow paper settings panel (default: false for continuous mode) */
  allowPaperSettings?: boolean;
  
  /** Minimum zoom percentage (default: 50) */
  zoomMin?: number;
  
  /** Maximum zoom percentage (default: 200) */
  zoomMax?: number;
}

/**
 * Props for PrintLayout component (Transaction Documents)
 * Renders transaction documents with continuous form format
 */
export interface PrintLayoutProps {
  // Document identification
  /** Document title (e.g., "SALES ORDER", "FAKTUR JUAL") */
  documentTitle: string;
  
  /** Document number */
  documentNumber: string;
  
  /** Formatted date string */
  documentDate: string;
  
  /** Document status badge (optional) */
  status?: string;
  
  // Company information
  /** Company name */
  companyName: string;
  
  /** Company logo URL (optional) */
  companyLogo?: string;
  
  /** Company NPWP for invoices (optional) */
  companyNpwp?: string;
  
  // Party information
  /** Label for party ("Pelanggan" or "Pemasok") */
  partyLabel: string;
  
  /** Customer/Supplier name */
  partyName: string;
  
  /** Party address (optional) */
  partyAddress?: string;
  
  /** Party NPWP for invoices (optional) */
  partyNpwp?: string;
  
  // Reference information
  /** Related document number (optional) */
  referenceDoc?: string;
  
  /** Label for reference document (optional) */
  referenceLabel?: string;
  
  /** Sales person name (optional) */
  salesPerson?: string;
  
  // Document-specific fields
  /** Delivery date for SO, PO (optional) */
  deliveryDate?: string;
  
  /** Payment terms for SO, Invoice (optional) */
  paymentTerms?: string;
  
  /** Due date for Invoice (optional) */
  dueDate?: string;
  
  /** Driver name for Delivery Note (optional) */
  driverName?: string;
  
  /** Vehicle number for Delivery Note (optional) */
  vehicleNumber?: string;
  
  /** Warehouse for Delivery Note, Purchase Receipt (optional) */
  warehouse?: string;
  
  /** Payment method for Payment documents (optional) */
  paymentMethod?: string;
  
  /** Bank account for Payment documents (optional) */
  bankAccount?: string;
  
  // Items
  /** Line items array */
  items: Record<string, unknown>[];
  
  /** Column definitions for item table */
  columns: PrintColumn[];
  
  // Pricing
  /** Show pricing columns */
  showPrice: boolean;
  
  /** Subtotal amount (optional) */
  subtotal?: number;
  
  /** Tax amount (optional) */
  taxAmount?: number;
  
  /** Grand total amount (optional) */
  totalAmount?: number;
  
  /** Amount in words (Terbilang) (optional) */
  terbilang?: string;
  
  // Summary statistics
  /** Total quantity of all items (optional) */
  totalQuantity?: number;
  
  /** Total number of unique items (optional) */
  totalItems?: number;
  
  // Additional content
  /** Document notes (optional) */
  notes?: string;
  
  /** Signature boxes (optional) */
  signatures?: PrintSignature[];
  
  // Layout options
  /** Paper mode - fixed to 'continuous' for transactions */
  paperMode: 'continuous';
}

/**
 * Props for ReportLayout component (Financial & System Reports)
 * Renders reports with A4 fixed format
 */
export interface ReportLayoutProps {
  // Report identification
  /** Report title (e.g., "TRIAL BALANCE", "NERACA") */
  reportTitle: string;
  
  /** Additional title info (optional) */
  reportSubtitle?: string;
  
  // Company information
  /** Company name */
  companyName: string;
  
  /** Company logo URL (optional) */
  companyLogo?: string;
  
  // Report parameters
  /** Date range (e.g., "01 Jan 2024 - 31 Dec 2024") (optional) */
  dateRange?: string;
  
  /** As-of date (e.g., "Per 31 Desember 2024") (optional) */
  asOfDate?: string;
  
  /** Generation timestamp (optional) */
  generatedAt?: string;
  
  // Report data
  /** Column definitions */
  columns: ReportColumn[];
  
  /** Data rows */
  rows: ReportRow[];
  
  // Report options
  /** Show account hierarchy (optional) */
  showHierarchy?: boolean;
  
  /** Show section totals (optional) */
  showTotals?: boolean;
  
  // Layout options
  /** Paper mode - fixed to 'sheet' for reports */
  paperMode: 'sheet';
  
  /** Paper size (default: 'A4') (optional) */
  paperSize?: PaperSize;
  
  /** Orientation (default: 'portrait') (optional) */
  orientation?: PaperOrientation;
}

// ============================================================================
// Supporting Types
// ============================================================================

/**
 * Column definition for transaction document item tables
 */
export interface PrintColumn {
  /** Column key matching item property */
  key: string;
  
  /** Column header label */
  label: string;
  
  /** Column width (optional) */
  width?: string;
  
  /** Text alignment (optional) */
  align?: 'left' | 'center' | 'right';
  
  /** Value formatter function (optional) */
  format?: (value: unknown) => string;
}

/**
 * Signature box definition
 */
export interface PrintSignature {
  /** Signature label (e.g., "Dibuat Oleh", "Disetujui Oleh") */
  label: string;
  
  /** Person name (optional) */
  name?: string;
}

/**
 * Column definition for report tables
 */
export interface ReportColumn {
  /** Column key matching row property */
  key: string;
  
  /** Column header label */
  label: string;
  
  /** Column width (optional) */
  width?: string;
  
  /** Text alignment (optional) */
  align?: 'left' | 'center' | 'right';
  
  /** Value formatter function (optional) */
  format?: (value: unknown) => string;
}

/**
 * Report row data
 */
export interface ReportRow {
  /** Row data keyed by column key */
  [key: string]: unknown;
  
  /** Indentation level for hierarchy (0-5) (optional) */
  indent?: number;
  
  /** Is this a section total row? (optional) */
  isTotal?: boolean;
  
  /** Is this a grand total row? (optional) */
  isGrandTotal?: boolean;
  
  /** Row type for styling (optional) */
  type?: 'header' | 'data' | 'subtotal' | 'total';
}

// ============================================================================
// Paper Dimensions
// ============================================================================

/**
 * Paper dimensions in millimeters
 */
export interface PaperDimensions {
  /** Width in millimeters */
  w: number;
  
  /** Height in millimeters */
  h: number;
}
