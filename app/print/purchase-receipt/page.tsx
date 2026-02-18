'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PrintLayout, { PrintColumn, PrintSignature } from '../../components/PrintLayout';
import LoadingSpinner from '../../components/LoadingSpinner';

const PR_COLUMNS: PrintColumn[] = [
  { key: 'no', label: 'No', width: '28px', align: 'center' },
  { key: 'item_code', label: 'Kode', width: '90px' },
  { key: 'item_name', label: 'Nama Barang' },
  { key: 'qty', label: 'Qty', width: '55px', align: 'right' },
  { key: 'uom', label: 'Sat', width: '45px' },
  { key: 'schedule_date', label: 'Tgl Butuh', width: '75px' },
];

const PR_SIGS: PrintSignature[] = [
  { label: 'Pemohon' },
  { label: 'Disetujui oleh' },
  { label: 'Diterima oleh' },
];

function PurchaseReceiptPrint() {
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
      const company = typeof window !== 'undefined' ? localStorage.getItem('selected_company') || '' : '';
      const params = new URLSearchParams({ company });
      const response = await fetch(`/api/purchase/receipts/${encodeURIComponent(docName)}?${params}`, { credentials: 'include' });
      const result = await response.json();
      if (result.success && result.data) {
        setData(result.data);
      } else {
        setError('Gagal memuat data penerimaan barang');
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
      documentTitle="PENERIMAAN BARANG"
      documentNumber={data.name}
      documentDate={data.posting_date || ''}
      companyName={company}
      partyLabel="Pemasok"
      partyName={data.supplier_name || data.supplier || ''}
      items={(data.items || []).map((item: any, idx: number) => ({
        no: idx + 1,
        item_code: item.item_code,
        item_name: item.item_name,
        qty: item.qty,
        uom: item.uom || item.stock_uom,
        schedule_date: item.schedule_date || '-',
      }))}
      columns={PR_COLUMNS}
      showPrice={false}
      referenceDoc={data.purchase_order || ''}
      referenceLabel="No. PO"
      signatures={PR_SIGS}
      status={data.status}
    />
  );
}

export default function PurchaseReceiptPrintPage() {
  return (
    <Suspense fallback={<LoadingSpinner message="Memuat..." />}>
      <PurchaseReceiptPrint />
    </Suspense>
  );
}
