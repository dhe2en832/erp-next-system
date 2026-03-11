/**
 * General Ledger Report Print Component
 * 
 * Renders General Ledger report using ReportLayout with A4 fixed format.
 * 
 * Features:
 * - Date, Account, Debit, Credit, Balance columns
 * - Running balance calculation
 * - Pagination support for long ledgers
 * - Indonesian localization
 * 
 * @validates Requirements 1.3, 3.3, 3.4, 3.5
 */

import React from 'react';
import ReportLayout from './ReportLayout';
import { ReportColumn, ReportRow } from '@/types/print';

// ============================================================================
// Types
// ============================================================================

export interface GeneralLedgerData {
  companyName: string;
  companyLogo?: string;
  dateRange: string;
  generatedAt?: string;
  entries: GeneralLedgerEntry[];
}

export interface GeneralLedgerEntry {
  date: string;
  account: string;
  debit: number;
  credit: number;
  balance: number;
  indent?: number;
  isTotal?: boolean;
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

function mapToReportRows(entries: GeneralLedgerEntry[]): ReportRow[] {
  return entries.map(entry => ({
    date: entry.date,
    account: entry.account,
    debit: entry.debit,
    credit: entry.credit,
    balance: entry.balance,
    indent: entry.indent || 0,
    isTotal: entry.isTotal || false,
    type: entry.type || (entry.isTotal ? 'subtotal' : 'data'),
  }));
}

// ============================================================================
// Component
// ============================================================================

export default function GeneralLedgerPrint({ data }: { data: GeneralLedgerData }) {
  const columns: ReportColumn[] = [
    {
      key: 'date',
      label: 'Tanggal',
      align: 'left',
      width: '15%',
    },
    {
      key: 'account',
      label: 'Akun',
      align: 'left',
      width: '35%',
    },
    {
      key: 'debit',
      label: 'Debit',
      align: 'right',
      width: '15%',
      format: formatCurrency,
    },
    {
      key: 'credit',
      label: 'Kredit',
      align: 'right',
      width: '15%',
      format: formatCurrency,
    },
    {
      key: 'balance',
      label: 'Saldo',
      align: 'right',
      width: '20%',
      format: formatCurrency,
    },
  ];

  const rows = mapToReportRows(data.entries);

  return (
    <ReportLayout
      reportTitle="BUKU BESAR"
      reportSubtitle="General Ledger"
      companyName={data.companyName}
      companyLogo={data.companyLogo}
      dateRange={data.dateRange}
      generatedAt={data.generatedAt}
      columns={columns}
      rows={rows}
      showHierarchy={false}
      showTotals={true}
      paperMode="sheet"
    />
  );
}
