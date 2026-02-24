/**
 * Print System Utilities
 * 
 * This file contains constants and utility functions for the print system.
 * It provides dimension calculations, paper size definitions, and helper functions.
 */

import { PaperSize, PaperDimensions, PaperOrientation, PaperMode } from '@/types/print';

// ============================================================================
// Conversion Constants
// ============================================================================

/**
 * Conversion constant from millimeters to pixels
 * Based on 96 DPI standard: 96 pixels per inch / 25.4 mm per inch
 */
export const MM_TO_PX = 96 / 25.4; // 3.7795275591

/**
 * Conversion constant from pixels to millimeters
 */
export const PX_TO_MM = 25.4 / 96; // 0.2645833333

// ============================================================================
// Paper Dimensions
// ============================================================================

/**
 * Standard paper dimensions in millimeters
 * Maps paper size to width and height
 */
export const PAPER_DIMS: Record<PaperSize, PaperDimensions> = {
  A4:     { w: 210, h: 297 },
  A5:     { w: 148, h: 210 },
  Letter: { w: 216, h: 279 },
  Legal:  { w: 216, h: 356 },
  F4:     { w: 215, h: 330 },
};

// ============================================================================
// Continuous Form Constants
// ============================================================================

/**
 * Continuous form printable width in millimeters
 * This is the actual print area excluding tractor holes
 */
export const CONTINUOUS_PRINTABLE_WIDTH_MM = 210;

/**
 * Tractor hole margin on each side in millimeters
 * Standard continuous form has 5mm margins on left and right for tractor holes
 */
export const CONTINUOUS_TRACTOR_MARGIN_MM = 5;

/**
 * Total continuous form width including tractor holes
 * 210mm printable + 5mm left + 5mm right = 220mm (approximately 9.5 inches)
 */
export const CONTINUOUS_TOTAL_WIDTH_MM = 
  CONTINUOUS_PRINTABLE_WIDTH_MM + 
  (CONTINUOUS_TRACTOR_MARGIN_MM * 2); // 220mm

/**
 * Continuous form printable width in pixels
 */
export const CONTINUOUS_WIDTH_PX = CONTINUOUS_PRINTABLE_WIDTH_MM * MM_TO_PX; // ~793.7px

/**
 * Continuous form total width in pixels (including tractor margins)
 */
export const CONTINUOUS_TOTAL_WIDTH_PX = CONTINUOUS_TOTAL_WIDTH_MM * MM_TO_PX; // ~831.5px

// ============================================================================
// A4 Sheet Constants
// ============================================================================

/**
 * A4 paper width in millimeters
 */
export const A4_WIDTH_MM = 210;

/**
 * A4 paper height in millimeters
 */
export const A4_HEIGHT_MM = 297;

/**
 * A4 paper width in pixels
 */
export const A4_WIDTH_PX = A4_WIDTH_MM * MM_TO_PX; // ~793.7px

/**
 * A4 paper height in pixels
 */
export const A4_HEIGHT_PX = A4_HEIGHT_MM * MM_TO_PX; // ~1122.5px

// ============================================================================
// Margin Constants
// ============================================================================

/**
 * Standard margins for A4 sheet mode in millimeters
 */
export const A4_MARGINS = {
  top: 10,
  bottom: 10,
  left: 12,
  right: 12,
} as const;

/**
 * Continuous form margins in millimeters
 * Only left and right margins for tractor holes
 */
export const CONTINUOUS_MARGINS = {
  top: 0,
  bottom: 0,
  left: CONTINUOUS_TRACTOR_MARGIN_MM,
  right: CONTINUOUS_TRACTOR_MARGIN_MM,
} as const;

/**
 * A4 printable area dimensions in millimeters
 * Calculated by subtracting margins from paper size
 */
export const A4_PRINTABLE_AREA = {
  width: A4_WIDTH_MM - A4_MARGINS.left - A4_MARGINS.right,   // 186mm
  height: A4_HEIGHT_MM - A4_MARGINS.top - A4_MARGINS.bottom, // 277mm
} as const;

/**
 * Continuous form printable area dimensions in millimeters
 */
export const CONTINUOUS_PRINTABLE_AREA = {
  width: CONTINUOUS_PRINTABLE_WIDTH_MM, // 210mm
  height: 'auto', // Flexible height based on content
} as const;

// ============================================================================
// Dimension Calculation Functions
// ============================================================================

/**
 * Calculate page dimensions in millimeters based on paper mode and settings
 * 
 * @param paperMode - 'continuous' or 'sheet'
 * @param paperSize - Paper size (only used for sheet mode)
 * @param orientation - Paper orientation (only used for sheet mode)
 * @returns Object with width and height in millimeters
 */
export function calculatePageDimensionsMm(
  paperMode: PaperMode,
  paperSize: PaperSize = 'A4',
  orientation: PaperOrientation = 'portrait'
): { width: number; height: number | 'auto' } {
  if (paperMode === 'continuous') {
    return {
      width: CONTINUOUS_PRINTABLE_WIDTH_MM,
      height: 'auto', // Flexible height for continuous form
    };
  }
  
  // Sheet mode
  const dims = PAPER_DIMS[paperSize];
  const width = orientation === 'portrait' ? dims.w : dims.h;
  const height = orientation === 'portrait' ? dims.h : dims.w;
  
  return { width, height };
}

/**
 * Calculate page dimensions in pixels based on paper mode and settings
 * 
 * @param paperMode - 'continuous' or 'sheet'
 * @param paperSize - Paper size (only used for sheet mode)
 * @param orientation - Paper orientation (only used for sheet mode)
 * @returns Object with width and height in pixels
 */
export function calculatePageDimensionsPx(
  paperMode: PaperMode,
  paperSize: PaperSize = 'A4',
  orientation: PaperOrientation = 'portrait'
): { width: number; height: number | 'auto' } {
  const dimsMm = calculatePageDimensionsMm(paperMode, paperSize, orientation);
  
  return {
    width: dimsMm.width * MM_TO_PX,
    height: dimsMm.height === 'auto' ? 'auto' : dimsMm.height * MM_TO_PX,
  };
}

/**
 * Get margins for a specific paper mode
 * 
 * @param paperMode - 'continuous' or 'sheet'
 * @returns Margin object with top, bottom, left, right in millimeters
 */
export function getMargins(paperMode: PaperMode) {
  return paperMode === 'continuous' ? CONTINUOUS_MARGINS : A4_MARGINS;
}

/**
 * Get printable area dimensions for a specific paper mode
 * 
 * @param paperMode - 'continuous' or 'sheet'
 * @returns Object with width and height of printable area
 */
export function getPrintableArea(paperMode: PaperMode) {
  return paperMode === 'continuous' 
    ? CONTINUOUS_PRINTABLE_AREA 
    : A4_PRINTABLE_AREA;
}

/**
 * Convert millimeters to pixels
 * 
 * @param mm - Value in millimeters
 * @returns Value in pixels
 */
export function mmToPx(mm: number): number {
  return mm * MM_TO_PX;
}

/**
 * Convert pixels to millimeters
 * 
 * @param px - Value in pixels
 * @returns Value in millimeters
 */
export function pxToMm(px: number): number {
  return px * PX_TO_MM;
}

/**
 * Validate paper mode matches document type
 * Transaction documents must use 'continuous', reports must use 'sheet'
 * 
 * @param paperMode - Paper mode to validate
 * @param documentType - 'transaction' or 'report'
 * @returns true if valid, false otherwise
 */
export function validatePaperMode(
  paperMode: PaperMode,
  documentType: 'transaction' | 'report'
): boolean {
  if (documentType === 'transaction') {
    return paperMode === 'continuous';
  }
  return paperMode === 'sheet';
}

/**
 * Get CSS @page rule string for a specific paper mode
 * 
 * @param paperMode - 'continuous' or 'sheet'
 * @param paperSize - Paper size (only used for sheet mode)
 * @param orientation - Paper orientation (only used for sheet mode)
 * @returns CSS @page rule string
 */
export function getPageRule(
  paperMode: PaperMode,
  paperSize: PaperSize = 'A4',
  orientation: PaperOrientation = 'portrait'
): string {
  if (paperMode === 'continuous') {
    return `@page { size: ${CONTINUOUS_PRINTABLE_WIDTH_MM}mm auto; margin: 0 ${CONTINUOUS_TRACTOR_MARGIN_MM}mm; }`;
  }
  
  // Sheet mode
  const dims = calculatePageDimensionsMm(paperMode, paperSize, orientation);
  const margins = getMargins(paperMode);
  
  return `@page { size: ${dims.width}mm ${dims.height}mm ${orientation}; margin: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm; }`;
}

/**
 * Format dimensions for display
 * 
 * @param width - Width in millimeters
 * @param height - Height in millimeters or 'auto'
 * @returns Formatted string (e.g., "210mm × 297mm" or "210mm × auto")
 */
export function formatDimensions(width: number, height: number | 'auto'): string {
  return `${width}mm × ${height === 'auto' ? 'auto' : `${height}mm`}`;
}

/**
 * Get paper size name with dimensions
 * 
 * @param paperSize - Paper size
 * @returns Formatted string (e.g., "A4 (210×297mm)")
 */
export function getPaperSizeLabel(paperSize: PaperSize): string {
  const dims = PAPER_DIMS[paperSize];
  return `${paperSize} (${dims.w}×${dims.h}mm)`;
}

/**
 * Calculate aspect ratio for a paper size
 * 
 * @param paperSize - Paper size
 * @param orientation - Paper orientation
 * @returns Aspect ratio (width / height)
 */
export function calculateAspectRatio(
  paperSize: PaperSize,
  orientation: PaperOrientation = 'portrait'
): number {
  const dims = PAPER_DIMS[paperSize];
  const width = orientation === 'portrait' ? dims.w : dims.h;
  const height = orientation === 'portrait' ? dims.h : dims.w;
  
  return width / height;
}

// ============================================================================
// Indonesian Localization
// ============================================================================

/**
 * Indonesian label translations for print documents
 * All labels are in Bahasa Indonesia as per requirements
 */
export const INDONESIAN_LABELS = {
  // Document metadata
  documentNumber: 'No. Dokumen',
  date: 'Tanggal',
  customer: 'Pelanggan',
  supplier: 'Pemasok',
  notes: 'Catatan',
  
  // Financial terms
  subtotal: 'Subtotal',
  tax: 'Pajak',
  total: 'Total',
  terbilang: 'Terbilang',
  
  // Document types
  salesOrder: 'SALES ORDER',
  deliveryNote: 'SURAT JALAN',
  salesInvoice: 'FAKTUR JUAL',
  purchaseOrder: 'PURCHASE ORDER',
  purchaseReceipt: 'PENERIMAAN BARANG',
  purchaseInvoice: 'FAKTUR BELI',
  paymentPay: 'PEMBAYARAN KELUAR',
  paymentReceive: 'PEMBAYARAN MASUK',
  
  // Additional fields
  deliveryDate: 'Tgl Kirim',
  paymentTerms: 'Syarat Bayar',
  salesPerson: 'Sales',
  driverName: 'Pengemudi',
  vehicleNumber: 'No. Kendaraan',
  warehouse: 'Gudang',
  paymentMethod: 'Metode Bayar',
  bankAccount: 'Rekening Bank',
  dueDate: 'Jatuh Tempo',
  npwp: 'NPWP',
  
  // Signatures
  createdBy: 'Dibuat Oleh',
  approvedBy: 'Disetujui Oleh',
  sender: 'Pengirim',
  driver: 'Pengemudi',
  receiver: 'Penerima',
  qc: 'QC',
  supervisor: 'Supervisor',
  
  // Status
  draft: 'Draft',
  submitted: 'Submitted',
  cancelled: 'Dibatalkan',
  
  // Footer
  printedBy: 'Dicetak oleh sistem',
  page: 'Halaman',
  of: 'dari',
} as const;

/**
 * Indonesian month names
 */
const INDONESIAN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
] as const;

/**
 * Format currency with Indonesian locale
 * Format: "Rp X.XXX.XXX" with thousand separators
 * 
 * @param amount - Numeric amount to format
 * @returns Formatted currency string (e.g., "Rp 1.000.000")
 */
export function formatCurrency(amount: number): string {
  // Handle negative numbers
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  
  // Format with thousand separators using Indonesian locale
  const formatted = new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(absAmount);
  
  // Add currency symbol
  return isNegative ? `-Rp ${formatted}` : `Rp ${formatted}`;
}

/**
 * Format date with Indonesian locale
 * Format: "31 Desember 2024"
 * 
 * @param date - Date string or Date object
 * @returns Formatted date string (e.g., "31 Desember 2024")
 */
export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Check if date is valid
  if (isNaN(dateObj.getTime())) {
    return '';
  }
  
  const day = dateObj.getDate();
  const month = INDONESIAN_MONTHS[dateObj.getMonth()];
  const year = dateObj.getFullYear();
  
  return `${day} ${month} ${year}`;
}

/**
 * Convert number to Indonesian words (Terbilang)
 * Converts numeric amount to Indonesian words for legal documents
 * 
 * @param amount - Numeric amount to convert
 * @returns Indonesian words representation (e.g., "satu juta rupiah")
 */
export function numberToWords(amount: number): string {
  // Handle zero
  if (amount === 0) {
    return 'nol rupiah';
  }
  
  // Handle negative numbers
  if (amount < 0) {
    return `minus ${numberToWords(Math.abs(amount))}`;
  }
  
  // Round to nearest integer (no decimal support for terbilang)
  const rounded = Math.round(amount);
  
  // Basic number words
  const ones = [
    '', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan'
  ];
  
  const teens = [
    'sepuluh', 'sebelas', 'dua belas', 'tiga belas', 'empat belas',
    'lima belas', 'enam belas', 'tujuh belas', 'delapan belas', 'sembilan belas'
  ];
  
  // Helper function to convert numbers less than 1000
  function convertHundreds(n: number): string {
    if (n === 0) return '';
    
    let result = '';
    
    // Hundreds place
    if (n >= 100) {
      const hundreds = Math.floor(n / 100);
      if (hundreds === 1) {
        result += 'seratus';
      } else {
        result += ones[hundreds] + ' ratus';
      }
      n %= 100;
      if (n > 0) result += ' ';
    }
    
    // Tens and ones place
    if (n >= 20) {
      const tens = Math.floor(n / 10);
      result += ones[tens] + ' puluh';
      n %= 10;
      if (n > 0) result += ' ' + ones[n];
    } else if (n >= 10) {
      result += teens[n - 10];
    } else if (n > 0) {
      result += ones[n];
    }
    
    return result;
  }
  
  // Handle large numbers
  if (rounded >= 1000000000000) { // Triliun
    const trillions = Math.floor(rounded / 1000000000000);
    let result = trillions === 1 ? 'satu triliun' : convertHundreds(trillions) + ' triliun';
    const remainder = rounded % 1000000000000;
    if (remainder > 0) {
      result += ' ' + numberToWords(remainder).replace(' rupiah', '');
    }
    return result + ' rupiah';
  }
  
  if (rounded >= 1000000000) { // Miliar
    const billions = Math.floor(rounded / 1000000000);
    let result = billions === 1 ? 'satu miliar' : convertHundreds(billions) + ' miliar';
    const remainder = rounded % 1000000000;
    if (remainder > 0) {
      result += ' ' + numberToWords(remainder).replace(' rupiah', '');
    }
    return result + ' rupiah';
  }
  
  if (rounded >= 1000000) { // Juta
    const millions = Math.floor(rounded / 1000000);
    let result = millions === 1 ? 'satu juta' : convertHundreds(millions) + ' juta';
    const remainder = rounded % 1000000;
    if (remainder > 0) {
      result += ' ' + numberToWords(remainder).replace(' rupiah', '');
    }
    return result + ' rupiah';
  }
  
  if (rounded >= 1000) { // Ribu
    const thousands = Math.floor(rounded / 1000);
    let result = thousands === 1 ? 'seribu' : convertHundreds(thousands) + ' ribu';
    const remainder = rounded % 1000;
    if (remainder > 0) {
      result += ' ' + numberToWords(remainder).replace(' rupiah', '');
    }
    return result + ' rupiah';
  }
  
  // Less than 1000
  return convertHundreds(rounded) + ' rupiah';
}

/**
 * Format date and time with Indonesian locale
 * Format: "31 Desember 2024 10:30 WIB"
 * 
 * @param date - Date string or Date object
 * @returns Formatted date and time string
 */
export function formatDateTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Check if date is valid
  if (isNaN(dateObj.getTime())) {
    return '';
  }
  
  const dateStr = formatDate(dateObj);
  const hours = dateObj.getHours().toString().padStart(2, '0');
  const minutes = dateObj.getMinutes().toString().padStart(2, '0');
  
  return `${dateStr} ${hours}:${minutes} WIB`;
}

/**
 * Get Indonesian label by key
 * 
 * @param key - Label key
 * @returns Indonesian label text
 */
export function getLabel(key: keyof typeof INDONESIAN_LABELS): string {
  return INDONESIAN_LABELS[key];
}
