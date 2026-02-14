'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PrintLayout from '../../components/PrintLayout';
import LoadingSpinner from '../../components/LoadingSpinner';

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
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!data) return <div className="p-6">Data tidak ditemukan</div>;

  const company = localStorage.getItem('selected_company') || '';

  return (
    <PrintLayout
      documentTitle="PESANAN PENJUALAN"
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
      showPrice={true}
      totalAmount={data.grand_total || data.total || 0}
      notes={data.custom_notes_so || ''}
      salesPerson={data.sales_team?.[0]?.sales_person || ''}
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
