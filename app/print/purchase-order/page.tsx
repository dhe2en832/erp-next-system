'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PrintLayout, { PrintColumn, PrintSignature } from '../../components/PrintLayout';
import LoadingSpinner from '../../components/LoadingSpinner';

function fixTerbilang(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/^IDR\s+/i, 'Rp ')
    .replace(/\s+saja\.?$/i, ' rupiah');
}

const PO_COLUMNS: PrintColumn[] = [
  { key: 'no', label: 'No', width: '28px', align: 'center' },
  { key: 'item_code', label: 'Kode', width: '80px' },
  { key: 'item_name', label: 'Nama Barang' },
  { key: 'qty', label: 'Qty', width: '45px', align: 'right' },
  { key: 'uom', label: 'Sat', width: '35px' },
  { key: 'rate', label: 'Est. Harga', width: '90px', align: 'right', format: (v) => (v || 0).toLocaleString('id-ID') },
  { key: 'amount', label: 'Jumlah', width: '95px', align: 'right', format: (v) => (v || 0).toLocaleString('id-ID') },
];

const PO_SIGS: PrintSignature[] = [
  { label: 'Dibuat oleh' },
  { label: 'Disetujui oleh' },
  { label: 'Pemasok' },
];

function PurchaseOrderPrint() {
  const searchParams = useSearchParams();
  const name = searchParams.get('name');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (name) fetchData(name);
  }, [name]);

  const fetchData = async (docName: string) => {
    try {
      const response = await fetch(`/api/purchase/orders/${encodeURIComponent(docName)}`, { credentials: 'include' });
      const result = await response.json();
      if (result.success && result.data) {
        setData(result.data);
      } else {
        setError('Gagal memuat data pesanan pembelian');
      }
    } catch { setError('Gagal memuat data'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!loading && !error && data) setTimeout(() => window.print(), 500);
  }, [loading, error, data]);

  if (loading) return <LoadingSpinner message="Memuat data cetak..." />;
  if (error) return <div style={{ padding: '20px', color: 'red' }}>{error}</div>;
  if (!data) return <div style={{ padding: '20px' }}>Data tidak ditemukan</div>;

  const company = typeof window !== 'undefined' ? localStorage.getItem('selected_company') || '' : '';

  return (
    <PrintLayout
      documentTitle="PURCHASE ORDER"
      documentNumber={data.name}
      documentDate={data.transaction_date || ''}
      companyName={company}
      partyLabel="Pemasok"
      partyName={data.supplier_name || data.supplier || ''}
      items={(data.items || []).map((item: any, idx: number) => ({
        no: idx + 1,
        item_code: item.item_code,
        item_name: item.item_name,
        qty: item.qty,
        uom: item.uom || item.stock_uom,
        rate: item.rate,
        amount: item.amount,
      }))}
      columns={PO_COLUMNS}
      showPrice={true}
      totalAmount={data.grand_total || 0}
      terbilang={fixTerbilang(data.base_in_words || data.in_words || '')}
      metaRight={[
        ...(data.schedule_date ? [{ label: 'Tgl Kirim', value: data.schedule_date }] : []),
        ...(data.payment_terms_template ? [{ label: 'Syarat Bayar', value: data.payment_terms_template }] : []),
      ]}
      signatures={PO_SIGS}
      status={data.status}
    />
  );
}

export default function PurchaseOrderPrintPage() {
  return (
    <Suspense fallback={<LoadingSpinner message="Memuat..." />}>
      <PurchaseOrderPrint />
    </Suspense>
  );
}
