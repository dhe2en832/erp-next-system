'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import A4ReportLayout, { fmtIDR, fmtDate, getTerbilang, ReportColumn } from '../../../components/A4ReportLayout';
import LoadingSpinner from '../../../components/LoadingSpinner';

const COLUMNS: ReportColumn[] = [
  { key: 'name', label: 'No. SO', width: '110px' },
  { key: 'customer_name', label: 'Pelanggan' },
  { key: 'transaction_date', label: 'Tanggal', width: '80px', format: (v) => fmtDate(v) },
  { key: 'grand_total', label: 'Total', width: '100px', align: 'right', format: (v) => fmtIDR(v || 0) },
  { key: 'per_delivered', label: '% Kirim', width: '60px', align: 'right', format: (v) => `${(v || 0).toFixed(0)}%` },
  { key: 'per_billed', label: '% Tagih', width: '60px', align: 'right', format: (v) => `${(v || 0).toFixed(0)}%` },
  { key: 'status', label: 'Status', width: '90px' },
];

function SalesPrint() {
  const searchParams = useSearchParams();
  const company = searchParams.get('company') || '';
  const fromDate = searchParams.get('from_date') || '';
  const toDate = searchParams.get('to_date') || '';

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const params = new URLSearchParams({ company });
        if (fromDate) params.set('from_date', fromDate);
        if (toDate) params.set('to_date', toDate);
        const res = await fetch(`/api/finance/reports/sales?${params}`, { credentials: 'include' });
        const json = await res.json();
        if (json.success) setData(json.data || []);
        else setError(json.message || 'Gagal memuat');
      } catch { setError('Gagal memuat data'); }
      finally { setLoading(false); }
    };
    fetch_();
  }, [company, fromDate, toDate]);

  useEffect(() => {
    if (!loading && !error) {
      setTimeout(() => window.print(), 500);
    }
  }, [loading, error]);

  if (loading) return <LoadingSpinner message="Memuat laporan penjualan..." />;
  if (error) return <div style={{ padding: '20px', color: 'red' }}>{error}</div>;

  const totalSales = data.reduce((s, r) => s + (r.grand_total || 0), 0);
  const periodLabel = fromDate && toDate ? `Periode: ${fmtDate(fromDate)} – ${fmtDate(toDate)}` : '';

  return (
    <A4ReportLayout
      reportTitle="LAPORAN PENJUALAN"
      companyName={company}
      periodLabel={periodLabel}
      columns={COLUMNS}
      data={data}
      summaryCards={[
        { label: 'Total SO', value: data.length },
        { label: 'Total Penjualan', value: fmtIDR(totalSales) },
        { label: 'Rata-rata SO', value: data.length > 0 ? fmtIDR(Math.round(totalSales / data.length)) : 'Rp 0' },
      ]}
      footerTotals={[{ label: 'Total Penjualan', value: fmtIDR(totalSales) }]}
      terbilang={getTerbilang(totalSales)}
    />
  );
}

export default function SalesPrintPage() {
  return (
    <Suspense fallback={<LoadingSpinner message="Memuat..." />}>
      <SalesPrint />
    </Suspense>
  );
}
