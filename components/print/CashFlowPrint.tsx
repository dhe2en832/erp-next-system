/**
 * Cash Flow Report Print Component
 * 
 * Renders Cash Flow report using ReportLayout with A4 fixed format.
 * 
 * Features:
 * - Sections: Operating, Investing, Financing activities
 * - Amount column
 * - Section totals and net cash flow
 * - Indonesian localization
 * 
 * @validates Requirements 1.3, 5.6, 5.7, 5.8
 */

import React from 'react';
import ReportLayout from './ReportLayout';
import { ReportColumn, ReportRow } from '@/types/print';

// ============================================================================
// Types
// ============================================================================

export interface CashFlowData {
  companyName: string;
  companyLogo?: string;
  dateRange: string;
  generatedAt?: string;
  activities: CashFlowActivity[];
}

export interface CashFlowActivity {
  activity: string;
  amount: number;
  indent?: number;
  isTotal?: boolean;
  isGrandTotal?: boolean;
  type?: 'header' | 'data' | 'subtotal' | 'total';
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatCurrency(value: unknown): string {
  const numValue = typeof value === 'number' ? value : Number(value);
  if (isNaN(numValue) || numValue === 0) return '-';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numValue).replace('IDR', 'Rp').trim();
}

function mapToReportRows(activities: CashFlowActivity[]): ReportRow[] {
  return activities.map(activity => ({
    activity: activity.activity,
    amount: activity.amount,
    indent: activity.indent || 0,
    isTotal: activity.isTotal || false,
    isGrandTotal: activity.isGrandTotal || false,
    type: activity.type || (activity.isGrandTotal ? 'total' : activity.isTotal ? 'subtotal' : 'data'),
  }));
}

// ============================================================================
// Component
// ============================================================================

export default function CashFlowPrint({ data }: { data: CashFlowData }) {
  const columns: ReportColumn[] = [
    {
      key: 'activity',
      label: 'Aktivitas',
      align: 'left',
      width: '70%',
    },
    {
      key: 'amount',
      label: 'Jumlah',
      align: 'right',
      width: '30%',
      format: formatCurrency,
    },
  ];

  const rows = mapToReportRows(data.activities);

  return (
    <ReportLayout
      reportTitle="LAPORAN ARUS KAS"
      reportSubtitle="Cash Flow Statement"
      companyName={data.companyName}
      companyLogo={data.companyLogo}
      dateRange={data.dateRange}
      generatedAt={data.generatedAt}
      columns={columns}
      rows={rows}
      showHierarchy={true}
      showTotals={true}
      paperMode="sheet"
    />
  );
}
