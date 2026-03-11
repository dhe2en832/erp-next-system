/**
 * Trial Balance Report Print Component
 * 
 * Renders Trial Balance report using ReportLayout with A4 fixed format.
 * 
 * Features:
 * - Account hierarchy with indentation
 * - Debit and Credit columns
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

export interface TrialBalanceData {
  companyName: string;
  companyLogo?: string;
  asOfDate: string;
  generatedAt?: string;
  accounts: TrialBalanceAccount[];
}

export interface TrialBalanceAccount {
  account: string;
  debit: number;
  credit: number;
  indent?: number;
  isTotal?: boolean;
  isGrandTotal?: boolean;
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

function mapToReportRows(accounts: TrialBalanceAccount[]): ReportRow[] {
  return accounts.map(account => ({
    account: account.account,
    debit: account.debit,
    credit: account.credit,
    indent: account.indent || 0,
    isTotal: account.isTotal || false,
    isGrandTotal: account.isGrandTotal || false,
    type: account.isGrandTotal ? 'total' : account.isTotal ? 'subtotal' : 'data',
  }));
}

// ============================================================================
// Component
// ============================================================================

export default function TrialBalancePrint({ data }: { data: TrialBalanceData }) {
  const columns: ReportColumn[] = [
    {
      key: 'account',
      label: 'Akun',
      align: 'left',
      width: '60%',
    },
    {
      key: 'debit',
      label: 'Debit',
      align: 'right',
      width: '20%',
      format: formatCurrency,
    },
    {
      key: 'credit',
      label: 'Kredit',
      align: 'right',
      width: '20%',
      format: formatCurrency,
    },
  ];

  const rows = mapToReportRows(data.accounts);

  return (
    <ReportLayout
      reportTitle="NERACA SALDO"
      reportSubtitle="Trial Balance"
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
