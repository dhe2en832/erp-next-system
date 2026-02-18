'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import A4ReportLayout, { fmtIDR, getTerbilang, ReportColumn } from '../../../components/A4ReportLayout';
import LoadingSpinner from '../../../components/LoadingSpinner';

const COLUMNS: ReportColumn[] = [
  { key: 'item_code', label: 'Kode Barang', width: '100px' },
  { key: 'item_name', label: 'Nama Barang' },
  { key: 'warehouse', label: 'Gudang', width: '120px' },
  { key: 'actual_qty', label: 'Stok', width: '60px', align: 'right', format: (v) => (v || 0).toLocaleString('id-ID') },
  { key: 'stock_uom', label: 'Sat', width: '40px' },
  { key: 'stock_value', label: 'Nilai Stok', width: '110px', align: 'right', format: (v) => fmtIDR(v || 0) },
];

function StockPrint() {
  const searchParams = useSearchParams();
  const company = searchParams.get('company') || '';

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const params = new URLSearchParams({ company });
        const res = await fetch(`/api/inventory/reports/stock-balance?${params}`, { credentials: 'include' });
        const json = await res.json();
        if (json.success) setData(json.data || []);
        else setError(json.message || 'Gagal memuat');
      } catch { setError('Gagal memuat data'); }
      finally { setLoading(false); }
    };
    fetch_();
  }, [company]);

  useEffect(() => {
    if (!loading && !error) setTimeout(() => window.print(), 500);
  }, [loading, error]);

  if (loading) return <LoadingSpinner message="Memuat laporan stok..." />;
  if (error) return <div style={{ padding: '20px', color: 'red' }}>{error}</div>;

  const totalValue = data.reduce((s, r) => s + (r.stock_value || 0), 0);
  const totalQty = data.reduce((s, r) => s + (r.actual_qty || 0), 0);

  return (
    <A4ReportLayout
      reportTitle="LAPORAN STOK BARANG"
      companyName={company}
      columns={COLUMNS}
      data={data}
      summaryCards={[
        { label: 'Total Item', value: data.length },
        { label: 'Total Qty', value: totalQty.toLocaleString('id-ID') },
        { label: 'Total Nilai Stok', value: fmtIDR(totalValue) },
      ]}
      footerTotals={[
        { label: 'Total Nilai Persediaan', value: fmtIDR(totalValue) },
      ]}
      terbilang={getTerbilang(totalValue)}
    />
  );
}

export default function StockPrintPage() {
  return (
    <Suspense fallback={<LoadingSpinner message="Memuat..." />}>
      <StockPrint />
    </Suspense>
  );
}
