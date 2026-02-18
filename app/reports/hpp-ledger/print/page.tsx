'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function HPPLedgerPrintContent() {
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
        const response = await fetch(`/api/finance/reports/hpp-ledger?${params}`, { credentials: 'include' });
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

  const total = data.reduce((sum, e) => sum + Math.abs(e.amount), 0);

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
        <div className="report-title">Ledger HPP Barang Dagang</div>
        <div className="report-company">{company}</div>
        <div className="report-period">Periode: {from_date} s/d {to_date}</div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Tanggal</th>
            <th>Voucher</th>
            <th>Akun</th>
            <th className="text-right">Debit</th>
            <th className="text-right">Kredit</th>
            <th className="text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {data.map((e, i) => (
            <tr key={i}>
              <td>{e.posting_date}</td>
              <td>{e.voucher_no}<br/><span style={{fontSize: '8px', color: '#666'}}>{e.voucher_type}</span></td>
              <td>{e.account}</td>
              <td className="text-right">{e.debit > 0 ? `Rp ${e.debit.toLocaleString('id-ID')}` : '-'}</td>
              <td className="text-right">{e.credit > 0 ? `Rp ${e.credit.toLocaleString('id-ID')}` : '-'}</td>
              <td className="text-right">Rp {Math.abs(e.amount).toLocaleString('id-ID')}</td>
            </tr>
          ))}
          <tr className="total-row">
            <td colSpan={5} className="text-right">TOTAL HPP:</td>
            <td className="text-right">Rp {total.toLocaleString('id-ID')}</td>
          </tr>
        </tbody>
      </table>
    </>
  );
}

export default function HPPLedgerPrint() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HPPLedgerPrintContent />
    </Suspense>
  );
}
