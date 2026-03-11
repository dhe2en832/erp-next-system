/**
 * Balance Sheet (Neraca) Report Print Component
 * 
 * Renders Balance Sheet report using ReportLayout with A4 fixed format.
 * 
 * Features:
 * - Account hierarchy for Assets, Liabilities, Equity
 * - Amount column
 * - Section totals and grand totals
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

export interface BalanceSheetData {
  companyName: string;
  companyLogo?: string;
  asOfDate: string;
  generatedAt?: string;
  accounts: BalanceSheetAccount[];
}

export interface BalanceSheetAccount {
  account: string;
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

function mapToReportRows(accounts: BalanceSheetAccount[]): ReportRow[] {
  return accounts.map(account => ({
    account: account.account,
    amount: account.amount,
    indent: account.indent || 0,
    isTotal: account.isTotal || false,
    isGrandTotal: account.isGrandTotal || false,
    type: account.type || (account.isGrandTotal ? 'total' : account.isTotal ? 'subtotal' : 'data'),
  }));
}

// ============================================================================
// Component
// ============================================================================

export default function BalanceSheetPrint({ data }: { data: BalanceSheetData }) {
  const columns: ReportColumn[] = [
    {
      key: 'account',
      label: 'Akun',
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

  const rows = mapToReportRows(data.accounts);

  return (
    <ReportLayout
      reportTitle="NERACA"
      reportSubtitle="Balance Sheet"
      companyName={data.companyName}
      companyLogo={data.companyLogo}
      asOfDate={data.asOfDate}
      generatedAt={data.generatedAt}
      columns={columns}
      rows={rows}
      showHierarchy={true}
      showTotals={true}
      paperMode="sheet"
    />
  );
}
