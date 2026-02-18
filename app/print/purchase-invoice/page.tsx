'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PrintLayout, { PrintColumn } from '../../components/PrintLayout';
import LoadingSpinner from '../../components/LoadingSpinner';

const PI_COLUMNS: PrintColumn[] = [
  { key: 'no', label: 'No', width: '28px', align: 'center' },
  { key: 'item_code', label: 'Kode', width: '80px' },
  { key: 'item_name', label: 'Nama Barang' },
  { key: 'qty', label: 'Qty', width: '45px', align: 'right' },
  { key: 'uom', label: 'Sat', width: '35px' },
  { key: 'rate', label: 'Harga', width: '90px', align: 'right', format: (v) => (v || 0).toLocaleString('id-ID') },
  { key: 'amount', label: 'Jumlah', width: '95px', align: 'right', format: (v) => (v || 0).toLocaleString('id-ID') },
];

function PurchaseInvoicePrint() {
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
      const response = await fetch(`/api/purchase/invoices/detail?name=${encodeURIComponent(docName)}`, { credentials: 'include' });
      const result = await response.json();
      if (result.success && result.data) {
        setData(result.data);
      } else {
        setError('Gagal memuat data faktur pembelian');
      }
    } catch { setError('Gagal memuat data'); }
    finally { setLoading(false); }
  };

  if (loading) return <LoadingSpinner message="Memuat data cetak..." />;
  if (error) return <div style={{ padding: '20px', color: 'red' }}>{error}</div>;
  if (!data) return <div style={{ padding: '20px' }}>Data tidak ditemukan</div>;

  const company = typeof window !== 'undefined' ? localStorage.getItem('selected_company') || '' : '';
  const taxAmount = data.total_taxes_and_charges || 0;
  const subtotal = data.net_total || data.total || 0;

  return (
    <PrintLayout
      documentTitle="FAKTUR PEMBELIAN"
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
        rate: item.rate,
        amount: item.amount,
      }))}
      columns={PI_COLUMNS}
      showPrice={true}
      subtotal={subtotal}
      taxAmount={taxAmount > 0 ? taxAmount : undefined}
      totalAmount={data.grand_total || 0}
      metaRight={[
        ...(data.due_date ? [{ label: 'Jatuh Tempo', value: data.due_date }] : []),
        ...(data.bill_no ? [{ label: 'No. Tagihan', value: data.bill_no }] : []),
      ]}
      status={data.status}
    />
  );
}

export default function PurchaseInvoicePrintPage() {
  return (
    <Suspense fallback={<LoadingSpinner message="Memuat..." />}>
      <PurchaseInvoicePrint />
    </Suspense>
  );
}
