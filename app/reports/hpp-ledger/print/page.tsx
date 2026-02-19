'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function HPPLedgerPrintContent() {
  const searchParams = useSearchParams();
  const companyParam = searchParams.get('company') || '';
  const from_date = searchParams.get('from_date') || '';
  const to_date = searchParams.get('to_date') || '';

  const [company, setCompany] = useState(companyParam);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fallback jika URL tidak membawa company (hindari loading terus)
  React.useEffect(() => {
    if (!companyParam) {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('selected_company') || '' : '';
      if (stored) setCompany(stored);
      else {
        setError('Perusahaan belum dipilih. Tambahkan parameter company di URL.');
        setLoading(false);
      }
    }
  }, [companyParam]);

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
        if (result.success) {
          setData(result.data || []);
        } else {
          setError(result.message || 'Gagal memuat data');
        }
      } catch (err) {
        console.error(err);
        setError('Gagal memuat data');
      } finally {
        setLoading(false);
      }
    };
    if (company) fetchData();
  }, [company, from_date, to_date]);

  const total = data.reduce((sum, e) => sum + Math.abs(e.amount), 0);

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-600 text-sm">{error}</div>;

  return (
    <>
      <style>{`
        @page { size: 210mm 297mm; margin: 12mm; }
        body { font-family: "Inter", Arial, sans-serif; font-size: 10px; color: #111; background: #fff; }
        header, nav, .no-print, .app-navbar { display: none !important; }
        main { padding: 0 !important; }
        .fin-print { width: 210mm; margin: 0 auto; }
        .fin-print table { table-layout: auto !important; width: 100%; border-collapse: collapse; margin-bottom: 8px; }
        .fin-print th, .fin-print td { padding: 4px 6px; vertical-align: top; }
        .fin-print th { background: #1e293b; color: #fff; font-size: 9px; text-transform: uppercase; }
        .fin-print td { font-size: 9px; border-bottom: 1px solid #e5e7eb; }
        .fin-print .doc-header { margin-bottom: 12px; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; }
        .fin-print .doc-company { font-size: 14px; font-weight: 700; color: #0f172a; }
        .fin-print .doc-title { font-size: 16px; font-weight: 800; letter-spacing: 0.3px; color: #111827; }
        .fin-print .doc-meta { font-size: 10px; color: #475569; margin-top: 2px; }
        .fin-print .total-row td { font-weight: 800; background: #f8fafc; }
        .fin-print .right { text-align: right; }
      `}</style>
      <div className="fin-print">
        <div className="doc-header">
          <div className="doc-company">{company}</div>
          <div className="doc-title">LEDGER HPP BARANG DAGANG</div>
          <div className="doc-meta">Periode: {from_date} s/d {to_date}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th style={{width:'12%'}}>Tanggal</th>
              <th style={{width:'20%'}}>Voucher</th>
              <th style={{width:'28%'}}>Akun</th>
              <th className="right" style={{width:'13%'}}>Debit</th>
              <th className="right" style={{width:'13%'}}>Kredit</th>
              <th className="right" style={{width:'14%'}}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.map((e, i) => (
              <tr key={i}>
                <td>{e.posting_date}</td>
                <td>{e.voucher_no}<br /><span style={{fontSize: '8px', color: '#666'}}>{e.voucher_type}</span></td>
                <td>{e.account}</td>
                <td className="right">{e.debit > 0 ? `Rp ${e.debit.toLocaleString('id-ID')}` : '-'}</td>
                <td className="right">{e.credit > 0 ? `Rp ${e.credit.toLocaleString('id-ID')}` : '-'}</td>
                <td className="right">Rp {Math.abs(e.amount).toLocaleString('id-ID')}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="total-row">
              <td colSpan={5} className="right">TOTAL HPP:</td>
              <td className="right">Rp {total.toLocaleString('id-ID')}</td>
            </tr>
          </tfoot>
        </table>
      </div>
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
