'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PrintLayout, { PrintColumn, PrintSignature } from '../../components/PrintLayout';
import LoadingSpinner from '../../components/LoadingSpinner';

const DN_COLUMNS: PrintColumn[] = [
  { key: 'no', label: 'No', width: '28px', align: 'center' },
  { key: 'item_code', label: 'Kode', width: '90px' },
  { key: 'item_name', label: 'Nama Barang' },
  { key: 'qty', label: 'Qty', width: '55px', align: 'right' },
  { key: 'uom', label: 'Sat', width: '45px' },
];

const DN_SIGS: PrintSignature[] = [
  { label: 'Pengirim' },
  { label: 'Pengemudi' },
  { label: 'Penerima' },
];

function DeliveryNotePrint() {
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
      const response = await fetch(`/api/sales/delivery-notes/${encodeURIComponent(docName)}`, { credentials: 'include' });
      const result = await response.json();
      if (result.success && result.data) {
        setData(result.data);
      } else {
        setError('Gagal memuat data surat jalan');
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
      documentTitle="SURAT JALAN"
      documentNumber={data.name}
      documentDate={data.posting_date || ''}
      companyName={company}
      partyLabel="Pelanggan"
      partyName={data.customer_name || data.customer || ''}
      items={(data.items || []).map((item: any, idx: number) => ({
        no: idx + 1,
        item_code: item.item_code,
        item_name: item.item_name,
        qty: item.qty,
        uom: item.uom || item.stock_uom,
      }))}
      columns={DN_COLUMNS}
      showPrice={false}
      notes={data.custom_notes_dn || ''}
      referenceDoc={data.sales_order || ''}
      referenceLabel="No. SO"
      metaRight={[
        ...(data.lr_no ? [{ label: 'No. LR', value: data.lr_no }] : []),
      ]}
      signatures={DN_SIGS}
      status={data.status}
    />
  );
}

export default function DeliveryNotePrintPage() {
  return (
    <Suspense fallback={<LoadingSpinner message="Memuat..." />}>
      <DeliveryNotePrint />
    </Suspense>
  );
}
