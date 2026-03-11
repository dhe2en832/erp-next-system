'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PrintLayout, { PrintColumn, PrintSignature } from '../../components/PrintLayout';
import PrintPreviewModal from '../../../components/PrintPreviewModal';
import LoadingSpinner from '../../components/LoadingSpinner';

export const dynamic = 'force-dynamic';

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
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (name) fetchData(name);
  }, [name]);

  const fetchData = async (docName: string) => {
    try {
      const response = await fetch(`/api/sales/delivery-notes/${encodeURIComponent(docName)}`, { credentials: 'include' });
      const result = await response.json();
      if (result.success && result.data) {
        setData(result.data as Record<string, unknown>);
      } else {
        setError('Gagal memuat data surat jalan');
      }
    } catch { setError('Gagal memuat data'); }
    finally { setLoading(false); }
  };

  if (loading) return <LoadingSpinner message="Memuat data cetak..." />;
  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!data) return <div className="p-8 text-gray-500">Data tidak ditemukan</div>;

  const company = typeof window !== 'undefined' ? localStorage.getItem('selected_company') || '' : '';
  const docTitle = `Surat Jalan ${data.name as string}`;
  const customerAddress = (data.address_display as string) || (data.customer_address as string) || (data.shipping_address_name as string) || (data.shipping_address as string) || '';
  const totalQty = ((data.items as Record<string, unknown>[]) || []).reduce((acc: number, it: Record<string, unknown>) => acc + Number(it.qty || 0), 0);
  const totalItems = ((data.items as Record<string, unknown>[]) || []).length;

  const layoutContent = (
    <PrintLayout
      documentTitle="SURAT JALAN"
      documentNumber={data.name as string}
      documentDate={(data.posting_date as string) || ''}
      companyName={company}
      partyLabel="Pelanggan"
      partyName={(data.customer_name as string) || (data.customer as string) || ''}
      partyAddress={customerAddress}
      items={((data.items as Record<string, unknown>[]) || []).map((item: Record<string, unknown>, idx: number) => ({
        no: idx + 1,
        item_code: item.item_code as string,
        item_name: item.item_name as string,
        qty: item.qty as number,
        uom: (item.uom || item.stock_uom) as string,
      }))}
      columns={DN_COLUMNS}
      showPrice={false}
      totalQuantity={totalQty}
      totalItems={totalItems}
      notes={(data.custom_notes_dn as string) || ''}
      referenceDoc={(data.sales_order as string) || ''}
      referenceLabel="No. SO"
      metaRight={[{ label: 'Total Qty', value: totalQty.toString() }, ...(data.lr_no ? [{ label: 'No. LR', value: data.lr_no as string }] : [])]}
      signatures={DN_SIGS}
      status={data.status as string}
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
            <p className="font-semibold text-gray-800 text-lg">{data.name as string}</p>
            <p className="text-sm text-gray-500">{(data.customer_name as string) || (data.customer as string)}</p>
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
        <PrintPreviewModal
          title={docTitle}
          onClose={() => setShowPreview(false)}
          paperMode="continuous"
        >
          {layoutContent}
        </PrintPreviewModal>
      )}
    </>
  );
}

export default function DeliveryNotePrintPage() {
  return (
    <Suspense fallback={<LoadingSpinner message="Memuat..." />}>
      <DeliveryNotePrint />
    </Suspense>
  );
}
