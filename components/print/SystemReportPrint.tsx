/**
 * SystemReportPrint Component
 * 
 * Generic template for system reports (Inventory, Sales, Purchase, HR, etc.)
 * Uses ReportLayout with dynamic column definitions and optional grouping/totals.
 * 
 * Paper Format: A4 Sheet (Fixed)
 * - Width: 210mm
 * - Height: 297mm
 * 
 * Features:
 * - Dynamic column definitions
 * - Optional grouping by field
 * - Optional subtotals and grand totals
 * - Flexible data structure
 * 
 * @validates Requirements 1.3
 */

import React from 'react';
import ReportLayout from './ReportLayout';
import { ReportColumn, ReportRow } from '@/types/print';

// ============================================================================
// Types
// ============================================================================

export interface SystemReportPrintProps {
  /** Report title (e.g., "LAPORAN INVENTORY", "LAPORAN PENJUALAN") */
  reportTitle: string;
  
  /** Additional subtitle (optional) */
  reportSubtitle?: string;
  
  /** Company name */
  companyName: string;
  
  /** Company logo URL (optional) */
  companyLogo?: string;
  
  /** Date range for the report (optional) */
  dateRange?: string;
  
  /** As-of date for the report (optional) */
  asOfDate?: string;
  
  /** Column definitions */
  columns: ReportColumn[];
  
  /** Report data rows */
  data: Record<string, unknown>[];
  
  /** Field to group by (optional) */
  groupBy?: string;
  
  /** Show subtotals for groups (optional) */
  showSubtotals?: boolean;
  
  /** Show grand total row (optional) */
  showGrandTotal?: boolean;
  
  /** Fields to sum for totals (optional) */
  sumFields?: string[];
  
  /** Custom row formatter (optional) */
  formatRow?: (row: Record<string, unknown>) => Record<string, unknown>;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Group data by a specific field
 */
function groupData(
  data: Record<string, unknown>[],
  groupBy: string
): Map<string, Record<string, unknown>[]> {
  const groups = new Map<string, Record<string, unknown>[]>();
  
  data.forEach((row) => {
    const groupValue = (row[groupBy] as string) || 'Lainnya';
    if (!groups.has(groupValue)) {
      groups.set(groupValue, []);
    }
    groups.get(groupValue)!.push(row);
  });
  
  return groups;
}

/**
 * Calculate subtotal for a group
 */
function calculateSubtotal(
  rows: Record<string, unknown>[],
  sumFields: string[]
): Record<string, unknown> {
  const subtotal: Record<string, unknown> = {};
  
  sumFields.forEach((field) => {
    subtotal[field] = rows.reduce((sum, row) => sum + (Number(row[field]) || 0), 0);
  });
  
  return subtotal;
}

/**
 * Calculate grand total for all data
 */
function calculateGrandTotal(
  data: Record<string, unknown>[],
  sumFields: string[]
): Record<string, unknown> {
  return calculateSubtotal(data, sumFields);
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * SystemReportPrint Component
 * 
 * Generic template that can be used for any system report by providing
 * appropriate column definitions and data.
 */
export default function SystemReportPrint(props: SystemReportPrintProps) {
  const {
    reportTitle,
    reportSubtitle,
    companyName,
    companyLogo,
    dateRange,
    asOfDate,
    columns,
    data,
    groupBy,
    showSubtotals = false,
    showGrandTotal = false,
    sumFields = [],
    formatRow,
  } = props;

  // Generate timestamp
  const generatedAt = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  }).format(new Date());

  // Build report rows
  const buildRows = (): ReportRow[] => {
    const rows: ReportRow[] = [];

    if (groupBy && data.length > 0) {
      // Grouped report with optional subtotals
      const groups = groupData(data, groupBy);
      
      groups.forEach((groupRows, groupValue) => {
        // Add group header
        rows.push({
          [columns[0].key]: groupValue,
          type: 'header',
          indent: 0,
        });
        
        // Add group data rows
        groupRows.forEach((row) => {
          const formattedRow = formatRow ? formatRow(row) : row;
          rows.push({
            ...formattedRow,
            type: 'data',
            indent: 1,
          });
        });
        
        // Add subtotal if enabled
        if (showSubtotals && sumFields.length > 0) {
          const subtotal = calculateSubtotal(groupRows, sumFields);
          rows.push({
            [columns[0].key]: `Subtotal ${groupValue}`,
            ...subtotal,
            type: 'subtotal',
            isTotal: true,
            indent: 1,
          });
        }
      });
    } else {
      // Flat report without grouping
      data.forEach((row) => {
        const formattedRow = formatRow ? formatRow(row) : row;
        rows.push({
          ...formattedRow,
          type: 'data',
        });
      });
    }

    // Add grand total if enabled
    if (showGrandTotal && sumFields.length > 0 && data.length > 0) {
      const grandTotal = calculateGrandTotal(data, sumFields);
      rows.push({
        [columns[0].key]: 'TOTAL',
        ...grandTotal,
        type: 'total',
        isGrandTotal: true,
      });
    }

    return rows;
  };

  const rows = buildRows();

  return (
    <ReportLayout
      reportTitle={reportTitle}
      reportSubtitle={reportSubtitle}
      companyName={companyName}
      companyLogo={companyLogo}
      dateRange={dateRange}
      asOfDate={asOfDate}
      generatedAt={generatedAt}
      columns={columns}
      rows={rows}
      showHierarchy={!!groupBy}
      showTotals={showSubtotals || showGrandTotal}
      paperMode="sheet"
      paperSize="A4"
      orientation="portrait"
    />
  );
}
