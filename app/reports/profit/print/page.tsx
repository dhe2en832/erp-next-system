'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import A4ReportLayout, { fmtIDR, fmtDate, getTerbilang, ReportColumn } from '../../../components/A4ReportLayout';
import LoadingSpinner from '../../../components/LoadingSpinner';

const INVOICE_COLUMNS: ReportColumn[] = [
  { key: 'invoice', label: 'No. Invoice', width: '120px' },
  { key: 'customer', label: 'Pelanggan' },
  { key: 'sales_person', label: 'Sales', width: '80px' },
  { key: 'sales', label: 'Total Penjualan', width: '110px', align: 'right', format: (v) => fmtIDR(v || 0) },
  { key: 'hpp_total', label: 'HPP Total', width: '100px', align: 'right', format: (v) => fmtIDR(v || 0) },
  { key: 'gross_profit', label: 'Gross Profit', width: '100px', align: 'right', format: (v) => fmtIDR(v || 0) },
  { key: 'commission', label: 'Komisi', width: '90px', align: 'right', format: (v) => fmtIDR(v || 0) },
  { key: 'profit', label: 'Profit', width: '100px', align: 'right', format: (v) => fmtIDR(v || 0) },
];

function ProfitPrint() {
  const searchParams = useSearchParams();
  const company = searchParams.get('company') || '';
  const fromDate = searchParams.get('from_date') || '';
  const toDate = searchParams.get('to_date') || '';
  const mode = searchParams.get('mode') || 'valuation';

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const payload: any = { from_date: fromDate, to_date: toDate, mode };
        if (company) payload.company = company;
        const res = await fetch('/api/profit-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          credentials: 'include',
        });
        const json = await res.json();
        if (json.success) setData(json.data);
        else setError(json.message || 'Gagal memuat');
      } catch { setError('Gagal memuat data'); }
      finally { setLoading(false); }
    };
    fetch_();
  }, [company, fromDate, toDate, mode]);

  useEffect(() => {
    if (!loading && !error) setTimeout(() => window.print(), 500);
  }, [loading, error]);

  if (loading) return <LoadingSpinner message="Memuat laporan profit..." />;
  if (error) return <div style={{ padding: '20px', color: 'red' }}>{error}</div>;

  const summary = data?.summary || {};
  // Convert by_invoice object to array
  const byInvoice: any[] = Object.entries(data?.by_invoice || {}).map(([invoice, row]: [string, any]) => ({
    invoice,
    ...row,
  }));
  const periodLabel = fromDate && toDate ? `Periode: ${fmtDate(fromDate)} – ${fmtDate(toDate)}` : '';

  const totalSales = summary.total_sales || 0;
  const totalHppBase = summary.total_hpp_base || 0;
  const totalFinancialCost = summary.total_financial_cost || 0;
  const totalHppTotal = summary.total_hpp_total || 0;
  const totalGrossProfit = summary.total_gross_profit || 0;
  const totalCommission = summary.total_commission || 0;
  const totalProfit = summary.total_company_profit || 0;

  return (
    <A4ReportLayout
      reportTitle="LAPORAN PROFIT & KOMISI"
      companyName={company}
      periodLabel={periodLabel}
      columns={INVOICE_COLUMNS}
      data={byInvoice}
      summaryCards={[
        { label: 'Total Penjualan', value: fmtIDR(totalSales) },
        { label: 'HPP Base', value: fmtIDR(totalHppBase) },
        { label: 'Financial Cost', value: fmtIDR(totalFinancialCost) },
        { label: 'HPP Total', value: fmtIDR(totalHppTotal) },
        { label: 'Gross Profit', value: fmtIDR(totalGrossProfit) },
        { label: 'Total Komisi', value: fmtIDR(totalCommission) },
        { label: 'Total Profit', value: fmtIDR(totalProfit), color: totalProfit >= 0 ? '#16a34a' : '#dc2626' },
      ]}
      footerTotals={[
        { label: 'Total Penjualan', value: fmtIDR(totalSales) },
        { label: 'Total HPP Total', value: fmtIDR(totalHppTotal) },
        { label: 'Total Gross Profit', value: fmtIDR(totalGrossProfit) },
        { label: 'Total Komisi', value: fmtIDR(totalCommission) },
        { label: 'Total Profit Bersih', value: fmtIDR(totalProfit) },
      ]}
      terbilang={getTerbilang(totalProfit)}
    />
  );
}

export default function ProfitPrintPage() {
  return (
    <Suspense fallback={<LoadingSpinner message="Memuat..." />}>
      <ProfitPrint />
    </Suspense>
  );
}
