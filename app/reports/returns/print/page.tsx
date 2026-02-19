'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function ReturnsPrintContent() {
  const searchParams = useSearchParams();
  const company = searchParams.get('company') || '';
  const from_date = searchParams.get('from_date') || '';
  const to_date = searchParams.get('to_date') || '';
  const [data, setData] = useState<any>({ sales_returns: [], purchase_returns: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = new URLSearchParams({
          company,
          from_date: from_date.split('/').reverse().join('-'),
          to_date: to_date.split('/').reverse().join('-')
        });
        const response = await fetch(`/api/finance/reports/returns?${params}`, { credentials: 'include' });
        const result = await response.json();
        if (result.success) setData(result.data || { sales_returns: [], purchase_returns: [] });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (company) fetchData();
  }, [company, from_date, to_date]);

  const srTotal = data.sales_returns.reduce((sum: number, e: any) => sum + (e.grand_total || 0), 0);
  const prTotal = data.purchase_returns.reduce((sum: number, e: any) => sum + (e.grand_total || 0), 0);

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <>
      <style>{`
        @page { size: A4; margin: 12mm; }
        body { font-family: "Inter", Arial, sans-serif; font-size: 9px; color: #111; background: #fff; }
        header, nav, .no-print, .app-navbar { display: none !important; }
        main { padding: 0 !important; }
        .fin-print { width: 210mm; margin: 0 auto; }
        .fin-print table { table-layout: auto !important; width: 100%; border-collapse: collapse; margin-bottom: 8px; }
        .fin-print th, .fin-print td { padding: 4px 6px; vertical-align: top; }
        .fin-print th { background: #1e293b; color: #fff; font-size: 8px; text-transform: uppercase; }
        .fin-print td { font-size: 8px; border-bottom: 1px solid #e5e7eb; }
        .fin-print .doc-header { margin-bottom: 12px; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; }
        .fin-print .doc-company { font-size: 13px; font-weight: 700; color: #0f172a; }
        .fin-print .doc-title { font-size: 15px; font-weight: 800; letter-spacing: 0.3px; color: #111827; }
        .fin-print .doc-meta { font-size: 9px; color: #475569; margin-top: 2px; }
        .fin-print .section-title { font-size: 11px; font-weight: 800; margin: 10px 0 6px; padding: 4px 6px; background: #f8fafc; border-left: 3px solid #dc2626; color: #0f172a; }
        .fin-print .total-row td { font-weight: 800; background: #f8fafc; }
        .fin-print .right { text-align: right; }
      `}</style>
      <div className="fin-print">
        <div className="doc-header">
          <div className="doc-company">{company}</div>
          <div className="doc-title">RETUR PENJUALAN & PEMBELIAN</div>
          <div className="doc-meta">Periode: {from_date} s/d {to_date}</div>
        </div>

      <div className="section-title">Retur Penjualan (Sales Return)</div>
      <table>
        <thead>
          <tr>
            <th>Tanggal</th>
            <th>No. Invoice</th>
            <th>Customer</th>
            <th className="text-right">Total</th>
            <th>Return Against</th>
          </tr>
        </thead>
        <tbody>
          {data.sales_returns.length === 0 ? (
            <tr><td colSpan={5} style={{textAlign: 'center', padding: '12px', color: '#666'}}>Tidak ada retur penjualan</td></tr>
          ) : (
            data.sales_returns.map((e: any, i: number) => (
              <tr key={i}>
                <td>{e.posting_date}</td>
                <td>{e.name}</td>
                <td>{e.customer_name || e.customer}</td>
                <td className="text-right" style={{color: '#dc2626', fontWeight: 700}}>Rp {Math.abs(e.grand_total).toLocaleString('id-ID')}</td>
                <td>{e.return_against || '-'}</td>
              </tr>
            ))
          )}
          <tr className="total-row">
            <td colSpan={3} className="text-right">TOTAL RETUR PENJUALAN:</td>
            <td className="text-right">Rp {Math.abs(srTotal).toLocaleString('id-ID')}</td>
            <td></td>
          </tr>
        </tbody>
      </table>

      <div className="section-title" style={{borderLeftColor: '#2563eb'}}>Retur Pembelian (Purchase Return)</div>
      <table>
        <thead>
          <tr>
            <th>Tanggal</th>
            <th>No. Invoice</th>
            <th>Supplier</th>
            <th className="text-right">Total</th>
            <th>Return Against</th>
          </tr>
        </thead>
        <tbody>
          {data.purchase_returns.length === 0 ? (
            <tr><td colSpan={5} style={{textAlign: 'center', padding: '12px', color: '#666'}}>Tidak ada retur pembelian</td></tr>
          ) : (
            data.purchase_returns.map((e: any, i: number) => (
              <tr key={i}>
                <td>{e.posting_date}</td>
                <td>{e.name}</td>
                <td>{e.supplier_name || e.supplier}</td>
                <td className="text-right" style={{color: '#2563eb', fontWeight: 700}}>Rp {Math.abs(e.grand_total).toLocaleString('id-ID')}</td>
                <td>{e.return_against || '-'}</td>
              </tr>
            ))
          )}
          <tr className="total-row">
            <td colSpan={3} className="text-right">TOTAL RETUR PEMBELIAN:</td>
            <td className="text-right">Rp {Math.abs(prTotal).toLocaleString('id-ID')}</td>
            <td></td>
          </tr>
        </tbody>
      </table>
      </div>
    </>
  );
}

export default function ReturnsPrint() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ReturnsPrintContent />
    </Suspense>
  );
}
