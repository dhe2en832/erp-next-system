'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PrintLayout from '../../components/PrintLayout';
import LoadingSpinner from '../../components/LoadingSpinner';

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
      const response = await fetch(`/api/purchase/receipts?name=${encodeURIComponent(docName)}`, { credentials: 'include' });
      const result = await response.json();
      if (result.success && result.data) {
        setData(result.data);
      } else {
        setError('Gagal memuat data penerimaan barang');
      }
    } catch { setError('Gagal memuat data'); }
    finally { setLoading(false); }
  };

  if (loading) return <LoadingSpinner message="Memuat data cetak..." />;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!data) return <div className="p-6">Data tidak ditemukan</div>;

  const company = localStorage.getItem('selected_company') || '';

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
      }))}
      showPrice={false}
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
