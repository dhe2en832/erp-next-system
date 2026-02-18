'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function MarginAnalysisPrintContent() {
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
        const response = await fetch(`/api/finance/reports/margin-analysis?${params}`, { credentials: 'include' });
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

  const negativeMargins = data.filter(i => i.margin_pct < 0).length;
  const thinMargins = data.filter(i => i.margin_pct >= 0 && i.margin_pct < 10).length;

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <>
      <style>{`
        @page { size: A4 landscape; margin: 15mm; }
        body { font-family: Arial, sans-serif; font-size: 9px; color: #111; }
        .report-header { text-align: center; margin-bottom: 12px; border-bottom: 2px solid #111; padding-bottom: 6px; }
        .report-title { font-size: 15px; font-weight: 700; text-transform: uppercase; }
        .report-company { font-size: 13px; font-weight: 600; margin-top: 3px; }
        .report-period { font-size: 9px; color: #555; margin-top: 2px; }
        .summary-box { display: flex; gap: 12px; margin-bottom: 12px; }
        .summary-card { flex: 1; border: 1px solid #ddd; padding: 8px; border-radius: 4px; text-align: center; }
        .summary-card .label { font-size: 8px; color: #666; }
        .summary-card .value { font-size: 16px; font-weight: 700; margin-top: 2px; }
        table { width: 100%; border-collapse: collapse; margin-top: 6px; }
        th { background: #1e293b; color: #fff; padding: 5px 6px; text-align: left; font-size: 8px; text-transform: uppercase; }
        td { padding: 4px 6px; border-bottom: 1px solid #e5e7eb; font-size: 8px; }
        tr:nth-child(even) { background: #f8fafc; }
        .text-right { text-align: right; }
        .bg-red { background: #fee2e2 !important; }
        .bg-yellow { background: #fef3c7 !important; }
        .text-red { color: #dc2626; font-weight: 700; }
        .text-yellow { color: #ca8a04; font-weight: 700; }
        .text-green { color: #16a34a; font-weight: 700; }
      `}</style>
      <div className="report-header">
        <div className="report-title">Analisa Margin per Unit</div>
        <div className="report-company">{company}</div>
        <div className="report-period">Periode: {from_date} s/d {to_date}</div>
      </div>
      <div className="summary-box">
        <div className="summary-card">
          <div className="label">Total Item</div>
          <div className="value">{data.length}</div>
        </div>
        <div className="summary-card">
          <div className="label">Margin Negatif</div>
          <div className="value" style={{color: '#dc2626'}}>{negativeMargins}</div>
        </div>
        <div className="summary-card">
          <div className="label">Margin Tipis (&lt;10%)</div>
          <div className="value" style={{color: '#ca8a04'}}>{thinMargins}</div>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Kode Item</th>
            <th>Nama Item</th>
            <th className="text-right">Avg Beli</th>
            <th className="text-right">Avg Jual</th>
            <th className="text-right">Margin/Unit</th>
            <th className="text-right">Margin %</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, i) => (
            <tr key={i} className={item.margin_pct < 0 ? 'bg-red' : item.margin_pct < 10 ? 'bg-yellow' : ''}>
              <td>{item.item_code}</td>
              <td>{item.item_name}</td>
              <td className="text-right">Rp {item.avg_buy_price.toLocaleString('id-ID', {maximumFractionDigits:0})}</td>
              <td className="text-right">Rp {item.avg_sell_price.toLocaleString('id-ID', {maximumFractionDigits:0})}</td>
              <td className="text-right">Rp {item.margin_per_unit.toLocaleString('id-ID', {maximumFractionDigits:0})}</td>
              <td className={`text-right ${item.margin_pct < 0 ? 'text-red' : item.margin_pct < 10 ? 'text-yellow' : 'text-green'}`}>{item.margin_pct.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
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
