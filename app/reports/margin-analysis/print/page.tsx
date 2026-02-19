'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function MarginAnalysisPrintContent() {
  const searchParams = useSearchParams();
  const companyParam = searchParams.get('company') || '';
  const from_date = searchParams.get('from_date') || '';
  const to_date = searchParams.get('to_date') || '';

  const [company, setCompany] = useState(companyParam);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !error) {
      const t = setTimeout(() => window.print(), 300);
      return () => clearTimeout(t);
    }
  }, [loading, error]);

  // Fallback jika URL tidak ada company
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
    if (!company) return;
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({
          company,
          from_date: from_date.split('/').reverse().join('-'),
          to_date: to_date.split('/').reverse().join('-')
        });
        const response = await fetch(`/api/finance/reports/margin-analysis?${params}`, { credentials: 'include' });
        const result = await response.json();
        if (result.success) {
          setData(result.data || []);
        } else {
          setError(result.message || 'Gagal memuat analisa margin');
        }
      } catch (err) {
        console.error('Error fetching margin analysis:', err);
        setError('Gagal memuat analisa margin');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [company, from_date, to_date]);

  const negativeMargins = data.filter(i => i.margin_pct < 0).length;
  const thinMargins = data.filter(i => i.margin_pct >= 0 && i.margin_pct < 10).length;

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-600 text-sm">{error}</div>;

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
        .fin-print .doc-header { margin-bottom: 12px; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; text-align: left; }
        .fin-print .doc-company { font-size: 13px; font-weight: 700; color: #0f172a; }
        .fin-print .doc-title { font-size: 15px; font-weight: 800; letter-spacing: 0.3px; color: #111827; }
        .fin-print .doc-meta { font-size: 9px; color: #475569; margin-top: 2px; }
        .fin-print .summary-box { display: flex; gap: 10px; margin: 10px 0 6px; }
        .fin-print .summary-card { flex: 1; border: 1px solid #e2e8f0; padding: 8px; border-radius: 4px; text-align: center; background: #f8fafc; }
        .fin-print .summary-card .label { font-size: 8px; color: #475569; text-transform: uppercase; letter-spacing: 0.2px; }
        .fin-print .summary-card .value { font-size: 15px; font-weight: 800; margin-top: 2px; color: #0f172a; }
        .fin-print .right { text-align: right; }
        .fin-print .neg { color: #dc2626; font-weight: 800; }
        .fin-print .thin { color: #ca8a04; font-weight: 800; }
        .fin-print .good { color: #16a34a; font-weight: 800; }
      `}</style>
      <div className="fin-print">
        <div className="doc-header">
          <div className="doc-company">{company}</div>
          <div className="doc-title">ANALISA MARGIN PER UNIT</div>
          <div className="doc-meta">Periode: {from_date} s/d {to_date}</div>
        </div>
        <div className="summary-box">
          <div className="summary-card">
            <div className="label">Total Item</div>
            <div className="value">{data.length}</div>
          </div>
          <div className="summary-card">
            <div className="label">Margin Negatif</div>
            <div className="value neg">{negativeMargins}</div>
          </div>
          <div className="summary-card">
            <div className="label">Margin Tipis (&lt;10%)</div>
            <div className="value thin">{thinMargins}</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th style={{width:'14%'}}>Kode Item</th>
              <th style={{width:'26%'}}>Nama Item</th>
              <th className="right" style={{width:'15%'}}>Avg Beli</th>
              <th className="right" style={{width:'15%'}}>Avg Jual</th>
              <th className="right" style={{width:'15%'}}>Margin/Unit</th>
              <th className="right" style={{width:'15%'}}>Margin %</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, i) => (
              <tr key={i}>
                <td>{item.item_code}</td>
                <td>{item.item_name}</td>
                <td className="right">Rp {item.avg_buy_price.toLocaleString('id-ID', {maximumFractionDigits:0})}</td>
                <td className="right">Rp {item.avg_sell_price.toLocaleString('id-ID', {maximumFractionDigits:0})}</td>
                <td className="right">Rp {item.margin_per_unit.toLocaleString('id-ID', {maximumFractionDigits:0})}</td>
                <td className={`right ${item.margin_pct < 0 ? 'neg' : item.margin_pct < 10 ? 'thin' : 'good'}`}>
                  {item.margin_pct.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function MarginAnalysisPrint() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MarginAnalysisPrintContent />
    </Suspense>
  );
}
