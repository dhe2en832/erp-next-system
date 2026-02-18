'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PrintLayout, { PrintColumn } from '../../components/PrintLayout';
import LoadingSpinner from '../../components/LoadingSpinner';

function fixTerbilang(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/^IDR\s+/i, 'Rp ')
    .replace(/\s+saja\.?$/i, ' rupiah');
}

const FJ_COLUMNS: PrintColumn[] = [
  { key: 'no', label: 'No', width: '28px', align: 'center' },
  { key: 'item_code', label: 'Kode', width: '75px' },
  { key: 'item_name', label: 'Nama Barang' },
  { key: 'qty', label: 'Qty', width: '40px', align: 'right' },
  { key: 'uom', label: 'Sat', width: '32px' },
  { key: 'rate', label: 'Harga', width: '80px', align: 'right', format: (v) => (v || 0).toLocaleString('id-ID') },
  { key: 'discount_percentage', label: 'Disc%', width: '40px', align: 'right', format: (v) => v ? `${v}%` : '-' },
  { key: 'amount', label: 'Jumlah', width: '90px', align: 'right', format: (v) => (v || 0).toLocaleString('id-ID') },
];

function InvoicePrint() {
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
      const response = await fetch(`/api/sales/invoices/details?invoice_name=${encodeURIComponent(docName)}`, { credentials: 'include' });
      const result = await response.json();
      if (result.success && result.data) {
        setData(result.data);
      } else {
        setError('Gagal memuat data faktur penjualan');
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
  const taxAmount = data.total_taxes_and_charges || 0;
  const subtotal = data.net_total || data.total || 0;

  return (
    <PrintLayout
      documentTitle="FAKTUR PENJUALAN"
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
        rate: item.rate,
        discount_percentage: item.discount_percentage,
        amount: item.amount,
      }))}
      columns={FJ_COLUMNS}
      showPrice={true}
      subtotal={subtotal}
      taxAmount={taxAmount > 0 ? taxAmount : undefined}
      totalAmount={data.grand_total || 0}
      terbilang={fixTerbilang(data.base_in_words || data.in_words || '')}
      notes={data.custom_notes_si || ''}
      metaRight={[
        ...(data.due_date ? [{ label: 'Jatuh Tempo', value: data.due_date }] : []),
        ...(data.payment_terms_template ? [{ label: 'Syarat Bayar', value: data.payment_terms_template }] : []),
        ...(data.outstanding_amount ? [{ label: 'Sisa Tagihan', value: `Rp ${Number(data.outstanding_amount).toLocaleString('id-ID')}` }] : []),
      ]}
      status={data.status}
    />
  );
}

export default function InvoicePrintPage() {
  return (
    <Suspense fallback={<LoadingSpinner message="Memuat..." />}>
      <InvoicePrint />
    </Suspense>
  );
}
