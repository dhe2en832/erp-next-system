/**
 * SalesReportPrint Component
 * 
 * Print page for Sales reports using the generic SystemReportPrint template.
 * Displays date, customer, document number, and amount.
 * 
 * Paper Format: A4 Sheet (Fixed)
 * - Width: 210mm
 * - Height: 297mm
 * 
 * @validates Requirements 1.3
 */

import React from 'react';
import SystemReportPrint from './SystemReportPrint';
import { ReportColumn } from '@/types/print';

// ============================================================================
// Types
// ============================================================================

export interface SalesReportData {
  /** Transaction date */
  date: string;
  
  /** Customer name */
  customer: string;
  
  /** Document number (SO, SJ, or Invoice) */
  document: string;
  
  /** Document type (optional) */
  document_type?: string;
  
  /** Transaction amount */
  amount: number;
  
  /** Status (optional) */
  status?: string;
}

export interface SalesReportPrintProps {
  /** Company name */
  companyName: string;
  
  /** Company logo URL (optional) */
  companyLogo?: string;
  
  /** Date range for the report */
  dateRange: string;
  
  /** Sales data */
  data: SalesReportData[];
  
  /** Group by customer (optional) */
  groupByCustomer?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format currency in Indonesian Rupiah
 */
function formatCurrency(value: any): string {
  const num = parseFloat(value) || 0;
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
function formatDate(value: any): string {
  if (!value) return '-';
  try {
    const date = new Date(value);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return value;
  }
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * SalesReportPrint Component
 * 
 * Renders sales report with columns:
 * - Tanggal (Date)
 * - Pelanggan (Customer)
 * - No. Dokumen (Document)
 * - Jumlah (Amount)
 */
export default function SalesReportPrint(props: SalesReportPrintProps) {
  const {
    companyName,
    companyLogo,
    dateRange,
    data,
    groupByCustomer = false,
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
      key: 'customer',
      label: 'Pelanggan',
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
      reportTitle="LAPORAN PENJUALAN"
      reportSubtitle="Ringkasan Transaksi Penjualan"
      companyName={companyName}
      companyLogo={companyLogo}
      dateRange={dateRange}
      columns={columns}
      data={data}
      groupBy={groupByCustomer ? 'customer' : undefined}
      showSubtotals={groupByCustomer}
      showGrandTotal={true}
      sumFields={['amount']}
    />
  );
}
