'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PrintLayout, { PrintColumn, PrintSignature } from '../../components/PrintLayout';
import PrintPreviewModal from '../../../components/PrintPreviewModal';
import LoadingSpinner from '../../components/LoadingSpinner';

function fixTerbilang(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/^IDR\s+/i, '')
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
  const [showPreview, setShowPreview] = useState(false);

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

  if (loading) return <LoadingSpinner message="Memuat data cetak..." />;
  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!data) return <div className="p-8 text-gray-500">Data tidak ditemukan</div>;

  const company = typeof window !== 'undefined' ? localStorage.getItem('selected_company') || '' : '';
  const docTitle = `Purchase Order ${data.name}`;

  const layoutContent = (
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

  return (
    <>
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 gap-4 p-8">
        <div className="bg-white rounded-xl shadow-lg p-8 flex flex-col items-center gap-4 max-w-sm w-full">
          <svg className="w-12 h-12 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          <div className="text-center">
            <p className="font-semibold text-gray-800 text-lg">{data.name}</p>
            <p className="text-sm text-gray-500">{data.supplier_name || data.supplier}</p>
          </div>
          <button
            onClick={() => setShowPreview(true)}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Pratinjau &amp; Cetak
          </button>
        </div>
      </div>
      {showPreview && (
        <PrintPreviewModal title={docTitle} onClose={() => setShowPreview(false)}>
          {layoutContent}
        </PrintPreviewModal>
      )}
    </>
  );
}

export default function PurchaseOrderPrintPage() {
  return (
    <Suspense fallback={<LoadingSpinner message="Memuat..." />}>
      <PurchaseOrderPrint />
    </Suspense>
  );
}
