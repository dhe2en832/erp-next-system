'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import A4ReportLayout, { fmtIDR, fmtDate, getTerbilang, ReportColumn } from '../../../components/A4ReportLayout';
import LoadingSpinner from '../../../components/LoadingSpinner';

const COLUMNS: ReportColumn[] = [
  { key: 'name', label: 'No. PO', width: '110px' },
  { key: 'supplier_name', label: 'Pemasok', format: (v, r) => v || r.supplier || '-' },
  { key: 'transaction_date', label: 'Tanggal', width: '80px', format: (v) => fmtDate(v) },
  { key: 'grand_total', label: 'Total', width: '110px', align: 'right', format: (v) => fmtIDR(v || 0) },
  { key: 'status', label: 'Status', width: '110px' },
];

function PurchasesPrint() {
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
        const res = await fetch(`/api/finance/reports/purchases?${params}`, { credentials: 'include' });
        const json = await res.json();
        if (json.success) setData(json.data || []);
        else setError(json.message || 'Gagal memuat');
      } catch { setError('Gagal memuat data'); }
      finally { setLoading(false); }
    };
    fetch_();
  }, [company, fromDate, toDate]);

  useEffect(() => {
    if (!loading && !error) setTimeout(() => window.print(), 500);
  }, [loading, error]);

  if (loading) return <LoadingSpinner message="Memuat laporan pembelian..." />;
  if (error) return <div style={{ padding: '20px', color: 'red' }}>{error}</div>;

  const totalPurchases = data.reduce((s, r) => s + (r.grand_total || 0), 0);
  const periodLabel = fromDate && toDate ? `Periode: ${fmtDate(fromDate)} – ${fmtDate(toDate)}` : '';

  return (
    <A4ReportLayout
      reportTitle="LAPORAN PEMBELIAN"
      companyName={company}
      periodLabel={periodLabel}
      columns={COLUMNS}
      data={data}
      summaryCards={[
        { label: 'Total PO', value: data.length },
        { label: 'Total Pembelian', value: fmtIDR(totalPurchases) },
        { label: 'Rata-rata PO', value: data.length > 0 ? fmtIDR(Math.round(totalPurchases / data.length)) : 'Rp 0' },
      ]}
      footerTotals={[{ label: 'Total Pembelian', value: fmtIDR(totalPurchases) }]}
      terbilang={getTerbilang(totalPurchases)}
    />
  );
}

export default function PurchasesPrintPage() {
  return (
    <Suspense fallback={<LoadingSpinner message="Memuat..." />}>
      <PurchasesPrint />
    </Suspense>
  );
}
