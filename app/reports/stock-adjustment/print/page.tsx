'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function StockAdjustmentPrintContent() {
  const searchParams = useSearchParams();
  const company = searchParams.get('company') || '';
  const from_date = searchParams.get('from_date') || '';
  const to_date = searchParams.get('to_date') || '';
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !error) {
      const t = setTimeout(() => window.print(), 300);
      return () => clearTimeout(t);
    }
  }, [loading, error]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = new URLSearchParams({
          company,
          from_date: from_date.split('/').reverse().join('-'),
          to_date: to_date.split('/').reverse().join('-')
        });
        const response = await fetch(`/api/finance/reports/stock-adjustment?${params}`, { credentials: 'include' });
        const result = await response.json();
        if (result.success) setData(result.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (company) fetchData();
  }, [company, from_date, to_date]);

  const total = data.reduce((sum, e) => sum + (e.total_amount || 0), 0);
  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <>
      <style>{`
        @page { size: 210mm 297mm; margin: 12mm; }
        html, body { width: 210mm; margin: 0 auto; padding: 0; }
        body { font-family: "Inter", Arial, sans-serif; font-size: 10px; color: #111; background: #fff; }
        header, nav, .no-print, .app-navbar { display: none !important; }
        main { padding: 0 !important; }
        .fin-print { width: 100%; max-width: 210mm; margin: 0 auto; }
        .fin-print table { table-layout: fixed; width: 100%; border-collapse: collapse; margin-bottom: 8px; }
        .fin-print th, .fin-print td { padding: 4px 6px; vertical-align: top; word-break: break-word; }
        .fin-print th { background: #1e293b; color: #fff; font-size: 9px; text-transform: uppercase; }
        .fin-print td { font-size: 9px; border-bottom: 1px solid #e5e7eb; }
        .fin-print .doc-header { margin-bottom: 12px; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; }
        .fin-print .doc-company { font-size: 14px; font-weight: 700; color: #0f172a; }
        .fin-print .doc-title { font-size: 16px; font-weight: 800; letter-spacing: 0.3px; color: #111827; }
        .fin-print .doc-meta { font-size: 10px; color: #475569; margin-top: 2px; }
        .fin-print .total-row td { font-weight: 800; background: #f8fafc; }
        .fin-print .right { text-align: right; white-space: nowrap; }
      `}</style>
      <div className="fin-print">
        <div className="doc-header">
          <div className="doc-company">{company}</div>
          <div className="doc-title">PENYESUAIAN PERSEDIAAN & STOCK OPNAME</div>
          <div className="doc-meta">Periode: {from_date} s/d {to_date}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th style={{width:'16%'}}>Tanggal</th>
              <th style={{width:'24%'}}>No. Transaksi</th>
              <th style={{width:'18%'}}>Tujuan</th>
              <th className="right" style={{width:'18%'}}>Total Nilai</th>
              <th style={{width:'24%'}}>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {data.map((e, i) => (
              <tr key={i}>
                <td>{e.posting_date}</td>
                <td>{e.name}</td>
                <td>{e.purpose}</td>
                <td className="right">Rp {(e.total_amount || 0).toLocaleString('id-ID')}</td>
                <td>{e.remarks || '-'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="total-row">
              <td colSpan={3} className="right">TOTAL:</td>
              <td className="right">Rp {total.toLocaleString('id-ID')}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}

export default function StockAdjustmentPrint() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <StockAdjustmentPrintContent />
    </Suspense>
  );
}
