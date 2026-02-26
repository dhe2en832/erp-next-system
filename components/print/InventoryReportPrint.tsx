/**
 * InventoryReportPrint Component
 * 
 * Print page for Inventory reports using the generic SystemReportPrint template.
 * Displays item code, name, warehouse, quantity, and value.
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

export interface InventoryReportData {
  /** Item code */
  item_code: string;
  
  /** Item name */
  item_name: string;
  
  /** Warehouse name */
  warehouse: string;
  
  /** Quantity in stock */
  qty: number;
  
  /** Unit of measure */
  uom?: string;
  
  /** Valuation rate */
  valuation_rate?: number;
  
  /** Total value (qty × valuation_rate) */
  value: number;
}

export interface InventoryReportPrintProps {
  /** Company name */
  companyName: string;
  
  /** Company logo URL (optional) */
  companyLogo?: string;
  
  /** Date range for the report (optional) */
  dateRange?: string;
  
  /** As-of date for the report (optional) */
  asOfDate?: string;
  
  /** Inventory data */
  data: InventoryReportData[];
  
  /** Group by warehouse (optional) */
  groupByWarehouse?: boolean;
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
 * Format quantity with thousand separators
 */
function formatQty(value: any): string {
  const num = parseFloat(value) || 0;
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * InventoryReportPrint Component
 * 
 * Renders inventory report with columns:
 * - Kode Item (Item Code)
 * - Nama Item (Item Name)
 * - Gudang (Warehouse)
 * - Qty (Quantity)
 * - Nilai (Value)
 */
export default function InventoryReportPrint(props: InventoryReportPrintProps) {
  const {
    companyName,
    companyLogo,
    dateRange,
    asOfDate,
    data,
    groupByWarehouse = false,
  } = props;

  // Define columns
  const columns: ReportColumn[] = [
    {
      key: 'item_code',
      label: 'Kode Item',
      width: '15%',
      align: 'left',
    },
    {
      key: 'item_name',
      label: 'Nama Item',
      width: '35%',
      align: 'left',
    },
    {
      key: 'warehouse',
      label: 'Gudang',
      width: '20%',
      align: 'left',
    },
    {
      key: 'qty',
      label: 'Qty',
      width: '15%',
      align: 'right',
      format: formatQty,
    },
    {
      key: 'value',
      label: 'Nilai',
      width: '15%',
      align: 'right',
      format: formatCurrency,
    },
  ];

  // Format row to include UOM in qty display
  const formatRow = (row: Record<string, any>): Record<string, any> => {
    return {
      ...row,
      qty: row.uom ? `${formatQty(row.qty)} ${row.uom}` : formatQty(row.qty),
    };
  };

  return (
    <SystemReportPrint
      reportTitle="LAPORAN INVENTORY"
      reportSubtitle="Daftar Stok Barang"
      companyName={companyName}
      companyLogo={companyLogo}
      dateRange={dateRange}
      asOfDate={asOfDate}
      columns={columns}
      data={data}
      groupBy={groupByWarehouse ? 'warehouse' : undefined}
      showSubtotals={groupByWarehouse}
      showGrandTotal={true}
      sumFields={['value']}
      formatRow={formatRow}
    />
  );
}
