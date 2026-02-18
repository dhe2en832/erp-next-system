'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PrintLayout, { PrintColumn } from '../../components/PrintLayout';
import LoadingSpinner from '../../components/LoadingSpinner';

const SO_COLUMNS: PrintColumn[] = [
  { key: 'no', label: 'No', width: '28px', align: 'center' },
  { key: 'item_code', label: 'Kode', width: '80px' },
  { key: 'item_name', label: 'Nama Barang' },
  { key: 'qty', label: 'Qty', width: '45px', align: 'right' },
  { key: 'uom', label: 'Sat', width: '35px' },
  { key: 'rate', label: 'Harga', width: '90px', align: 'right', format: (v) => (v || 0).toLocaleString('id-ID') },
  { key: 'amount', label: 'Jumlah', width: '95px', align: 'right', format: (v) => (v || 0).toLocaleString('id-ID') },
];

function SalesOrderPrint() {
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
      const response = await fetch(`/api/sales/orders?name=${encodeURIComponent(docName)}`, { credentials: 'include' });
      const result = await response.json();
      if (result.success && result.data) {
        setData(result.data);
      } else {
        setError('Gagal memuat data pesanan penjualan');
      }
    } catch { setError('Gagal memuat data'); }
    finally { setLoading(false); }
  };

  if (loading) return <LoadingSpinner message="Memuat data cetak..." />;
  if (error) return <div style={{ padding: '20px', color: 'red' }}>{error}</div>;
  if (!data) return <div style={{ padding: '20px' }}>Data tidak ditemukan</div>;

  const company = typeof window !== 'undefined' ? localStorage.getItem('selected_company') || '' : '';

  return (
    <PrintLayout
      documentTitle="SALES ORDER"
      documentNumber={data.name}
      documentDate={data.transaction_date || data.posting_date || ''}
      companyName={company}
      partyLabel="Pelanggan"
      partyName={data.customer_name || data.customer || ''}
      items={(data.items || []).map((item: any, idx: number) => ({
        no: idx + 1,
        item_code: item.item_code,
        item_name: item.item_name,
        qty: item.qty,
        uom: item.uom || item.stock_uom,
        rate: item.rate,
        amount: item.amount,
      }))}
      columns={SO_COLUMNS}
      showPrice={true}
      totalAmount={data.grand_total || data.total || 0}
      notes={data.custom_notes_so || ''}
      salesPerson={data.sales_team?.[0]?.sales_person || ''}
      metaRight={[
        ...(data.delivery_date ? [{ label: 'Tgl Kirim', value: data.delivery_date }] : []),
        ...(data.payment_terms_template ? [{ label: 'Syarat Bayar', value: data.payment_terms_template }] : []),
      ]}
      status={data.status}
    />
  );
}

export default function SalesOrderPrintPage() {
  return (
    <Suspense fallback={<LoadingSpinner message="Memuat..." />}>
      <SalesOrderPrint />
    </Suspense>
  );
}
