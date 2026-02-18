'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function HPPReconciliationPrintContent() {
  const searchParams = useSearchParams();
  const company = searchParams.get('company') || '';
  const from_date = searchParams.get('from_date') || '';
  const to_date = searchParams.get('to_date') || '';
  const [data, setData] = useState<any>({ entries: [], summary: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = new URLSearchParams({
          company,
          from_date: from_date.split('/').reverse().join('-'),
          to_date: to_date.split('/').reverse().join('-')
        });
        const response = await fetch(`/api/finance/reports/hpp-reconciliation?${params}`, { credentials: 'include' });
        const result = await response.json();
        if (result.success) setData(result.data || { entries: [], summary: {} });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (company) fetchData();
  }, [company, from_date, to_date]);

  const summary = data.summary || {};
  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <>
      <style>{`
        @page { size: A4; margin: 15mm; }
        body { font-family: Arial, sans-serif; font-size: 9px; color: #111; }
        .report-header { text-align: center; margin-bottom: 12px; border-bottom: 2px solid #111; padding-bottom: 6px; }
        .report-title { font-size: 15px; font-weight: 700; text-transform: uppercase; }
        .report-company { font-size: 13px; font-weight: 600; margin-top: 3px; }
        .report-period { font-size: 9px; color: #555; margin-top: 2px; }
        .summary-box { display: flex; gap: 10px; margin-bottom: 12px; padding: 10px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px; }
        .summary-item { flex: 1; text-align: center; }
        .summary-item .label { font-size: 8px; color: #666; font-weight: 600; }
        .summary-item .value { font-size: 14px; font-weight: 700; margin-top: 2px; }
        .warning-box { padding: 8px; background: #fee2e2; border: 1px solid #dc2626; border-radius: 4px; margin-bottom: 12px; }
        .warning-box p { font-size: 9px; font-weight: 700; color: #991b1b; margin: 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th { background: #1e293b; color: #fff; padding: 5px 6px; text-align: left; font-size: 8px; text-transform: uppercase; }
        td { padding: 4px 6px; border-bottom: 1px solid #e5e7eb; font-size: 8px; }
        tr:nth-child(even) { background: #f8fafc; }
        .text-right { text-align: right; }
      `}</style>
      <div className="report-header">
        <div className="report-title">Rekonsiliasi HPP</div>
        <div className="report-company">{company}</div>
        <div className="report-period">Periode: {from_date} s/d {to_date}</div>
      </div>
      
      <div className="summary-box">
        <div className="summary-item">
          <div className="label">TOTAL HPP</div>
          <div className="value" style={{color: '#dc2626'}}>Rp {(summary.total_hpp || 0).toLocaleString('id-ID')}</div>
        </div>
        <div className="summary-item">
          <div className="label">TOTAL SALES</div>
          <div className="value" style={{color: '#16a34a'}}>Rp {(summary.total_sales || 0).toLocaleString('id-ID')}</div>
        </div>
        <div className="summary-item">
          <div className="label">HPP % DARI SALES</div>
          <div className="value" style={{color: summary.hpp_percentage > 100 ? '#dc2626' : summary.hpp_percentage > 80 ? '#ca8a04' : '#2563eb'}}>{(summary.hpp_percentage || 0).toFixed(1)}%</div>
        </div>
      </div>

      {summary.warning && (
        <div className="warning-box">
          <p>⚠️ {summary.warning}</p>
        </div>
      )}

      <table>
        <thead>
          <tr>
            <th>Tanggal</th>
            <th>Voucher</th>
            <th>Akun</th>
            <th className="text-right">Debit</th>
            <th className="text-right">Kredit</th>
          </tr>
        </thead>
        <tbody>
          {data.entries.slice(0, 50).map((e: any, i: number) => (
            <tr key={i}>
              <td>{e.posting_date}</td>
              <td>{e.voucher_no}<br/><span style={{fontSize: '7px', color: '#666'}}>{e.voucher_type}</span></td>
              <td>{e.account}</td>
              <td className="text-right">{e.debit > 0 ? `Rp ${e.debit.toLocaleString('id-ID')}` : '-'}</td>
              <td className="text-right">{e.credit > 0 ? `Rp ${e.credit.toLocaleString('id-ID')}` : '-'}</td>
            </tr>
          ))}
          {data.entries.length > 50 && (
            <tr>
              <td colSpan={5} style={{textAlign: 'center', padding: '8px', color: '#666', fontStyle: 'italic'}}>
                ... dan {data.entries.length - 50} entri lainnya (hanya 50 teratas ditampilkan di cetak)
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  );
}

export default function HPPReconciliationPrint() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HPPReconciliationPrintContent />
    </Suspense>
  );
}
