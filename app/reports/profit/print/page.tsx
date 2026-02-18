'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import A4ReportLayout, { fmtIDR, fmtDate, getTerbilang, ReportColumn } from '../../../components/A4ReportLayout';
import LoadingSpinner from '../../../components/LoadingSpinner';

const INVOICE_COLUMNS: ReportColumn[] = [
  { key: 'invoice', label: 'No. Invoice', width: '120px' },
  { key: 'customer', label: 'Pelanggan' },
  { key: 'sales', label: 'Total Penjualan', width: '110px', align: 'right', format: (v, r) => fmtIDR(v || r.total_sales || 0) },
  { key: 'hpp', label: 'HPP', width: '100px', align: 'right', format: (v, r) => fmtIDR(v || r.total_hpp || 0) },
  { key: 'commission', label: 'Komisi', width: '90px', align: 'right', format: (v) => fmtIDR(v || 0) },
  { key: 'profit', label: 'Profit', width: '100px', align: 'right', format: (v, r) => fmtIDR(v || r.company_profit || 0) },
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
  const byInvoice: any[] = data?.by_invoice || [];
  const periodLabel = fromDate && toDate ? `Periode: ${fmtDate(fromDate)} – ${fmtDate(toDate)}` : '';

  const totalSales = summary.total_sales || 0;
  const totalHpp = summary.total_hpp || 0;
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
        { label: 'Total HPP', value: fmtIDR(totalHpp) },
        { label: 'Total Komisi', value: fmtIDR(totalCommission) },
        { label: 'Total Profit', value: fmtIDR(totalProfit), color: totalProfit >= 0 ? '#16a34a' : '#dc2626' },
      ]}
      footerTotals={[
        { label: 'Total Penjualan', value: fmtIDR(totalSales) },
        { label: 'Total HPP', value: fmtIDR(totalHpp) },
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
