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
        @page { size: A4; margin: 15mm; }
        body { font-family: Arial, sans-serif; font-size: 10px; color: #111; }
        .report-header { text-align: center; margin-bottom: 16px; border-bottom: 2px solid #111; padding-bottom: 8px; }
        .report-title { font-size: 16px; font-weight: 700; text-transform: uppercase; }
        .report-company { font-size: 14px; font-weight: 600; margin-top: 4px; }
        .report-period { font-size: 10px; color: #555; margin-top: 2px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th { background: #1e293b; color: #fff; padding: 6px 8px; text-align: left; font-size: 9px; text-transform: uppercase; }
        td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; font-size: 9px; }
        tr:nth-child(even) { background: #f8fafc; }
        .text-right { text-align: right; }
        .total-row { font-weight: 700; background: #f1f5f9 !important; border-top: 2px solid #111; }
      `}</style>
      <div className="report-header">
        <div className="report-title">Penyesuaian Persediaan & Stock Opname</div>
        <div className="report-company">{company}</div>
        <div className="report-period">Periode: {from_date} s/d {to_date}</div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Tanggal</th>
            <th>No. Transaksi</th>
            <th>Tujuan</th>
            <th className="text-right">Total Nilai</th>
            <th>Keterangan</th>
          </tr>
        </thead>
        <tbody>
          {data.map((e, i) => (
            <tr key={i}>
              <td>{e.posting_date}</td>
              <td>{e.name}</td>
              <td>{e.purpose}</td>
              <td className="text-right">Rp {(e.total_amount || 0).toLocaleString('id-ID')}</td>
              <td>{e.remarks || '-'}</td>
            </tr>
          ))}
          <tr className="total-row">
            <td colSpan={3} className="text-right">TOTAL:</td>
            <td className="text-right">Rp {total.toLocaleString('id-ID')}</td>
            <td></td>
          </tr>
        </tbody>
      </table>
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
