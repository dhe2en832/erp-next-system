/**
 * PurchaseReportPrint Component
 * 
 * Print page for Purchase reports using the generic SystemReportPrint template.
 * Displays date, supplier, document number, and amount.
 * 
 * Paper Format: A4 Sheet (Fixed)
 * - Width: 210mm
 * - Height: 297mm
 * 
 * @validates Requirements 1.3
 */

import SystemReportPrint from './SystemReportPrint';
import { ReportColumn } from '@/types/print';

// ============================================================================
// Types
// ============================================================================

export interface PurchaseReportData {
  [key: string]: unknown;
  /** Transaction date */
  date: string;
  
  /** Supplier name */
  supplier: string;
  
  /** Document number (PO, PR, or Invoice) */
  document: string;
  
  /** Document type (optional) */
  document_type?: string;
  
  /** Transaction amount */
  amount: number;
  
  /** Status (optional) */
  status?: string;
}

export interface PurchaseReportPrintProps {
  /** Company name */
  companyName: string;
  
  /** Company logo URL (optional) */
  companyLogo?: string;
  
  /** Date range for the report */
  dateRange: string;
  
  /** Purchase data */
  data: PurchaseReportData[];
  
  /** Group by supplier (optional) */
  groupBySupplier?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format currency in Indonesian Rupiah
 */
function formatCurrency(value: unknown): string {
  const num = typeof value === 'number' ? value : parseFloat(value as string) || 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Format date in Indonesian locale
 */
function formatDate(value: unknown): string {
  if (!value) return '-';
  try {
    const date = new Date(value as string | number | Date);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return value as string;
  }
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * PurchaseReportPrint Component
 * 
 * Renders purchase report with columns:
 * - Tanggal (Date)
 * - Pemasok (Supplier)
 * - No. Dokumen (Document)
 * - Jumlah (Amount)
 */
export default function PurchaseReportPrint(props: PurchaseReportPrintProps) {
  const {
    companyName,
    companyLogo,
    dateRange,
    data,
    groupBySupplier = false,
  } = props;

  // Define columns
  const columns: ReportColumn[] = [
    {
      key: 'date',
      label: 'Tanggal',
      width: '15%',
      align: 'left',
      format: formatDate,
    },
    {
      key: 'supplier',
      label: 'Pemasok',
      width: '35%',
      align: 'left',
    },
    {
      key: 'document',
      label: 'No. Dokumen',
      width: '25%',
      align: 'left',
    },
    {
      key: 'amount',
      label: 'Jumlah',
      width: '25%',
      align: 'right',
      format: formatCurrency,
    },
  ];

  return (
    <SystemReportPrint
      reportTitle="LAPORAN PEMBELIAN"
      reportSubtitle="Ringkasan Transaksi Pembelian"
      companyName={companyName}
      companyLogo={companyLogo}
      dateRange={dateRange}
      columns={columns}
      data={data}
      groupBy={groupBySupplier ? 'supplier' : undefined}
      showSubtotals={groupBySupplier}
      showGrandTotal={true}
      sumFields={['amount']}
    />
  );
}
