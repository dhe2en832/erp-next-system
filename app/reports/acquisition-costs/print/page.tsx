'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function AcquisitionCostsPrintContent() {
  const searchParams = useSearchParams();
  const company = searchParams.get('company') || '';
  const from_date = searchParams.get('from_date') || '';
  const to_date = searchParams.get('to_date') || '';
  const [data, setData] = useState<any>({ hpp_costs: [], operational_costs: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = new URLSearchParams({
          company,
          from_date: from_date.split('/').reverse().join('-'),
          to_date: to_date.split('/').reverse().join('-')
        });
        const response = await fetch(`/api/finance/reports/acquisition-costs?${params}`, { credentials: 'include' });
        const result = await response.json();
        if (result.success) setData(result.data || { hpp_costs: [], operational_costs: [] });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (company) fetchData();
  }, [company, from_date, to_date]);

  const hppTotal = data.hpp_costs.reduce((sum: number, e: any) => sum + Math.abs(e.amount), 0);
  const opTotal = data.operational_costs.reduce((sum: number, e: any) => sum + Math.abs(e.amount), 0);

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <>
      <style>{`
        @page { size: A4; margin: 12mm; }
        body { font-family: "Inter", Arial, sans-serif; font-size: 9px; color: #111; }
        .fin-print { width: 210mm; margin: 0 auto; }
        .fin-print table { table-layout: auto !important; width: 100%; border-collapse: collapse; margin-bottom: 8px; }
        .fin-print th, .fin-print td { padding: 4px 6px; vertical-align: top; }
        .fin-print th { background: #1e293b; color: #fff; font-size: 8px; text-transform: uppercase; }
        .fin-print td { font-size: 8px; border-bottom: 1px solid #e5e7eb; }
        .fin-print .doc-header { margin-bottom: 12px; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; }
        .fin-print .doc-company { font-size: 13px; font-weight: 700; color: #0f172a; }
        .fin-print .doc-title { font-size: 15px; font-weight: 800; letter-spacing: 0.3px; color: #111827; }
        .fin-print .doc-meta { font-size: 9px; color: #475569; margin-top: 2px; }
        .fin-print .section-title { font-size: 11px; font-weight: 800; margin: 10px 0 6px; padding: 4px 6px; background: #f8fafc; border-left: 3px solid #4f46e5; color: #0f172a; }
        .fin-print .total-row td { font-weight: 800; background: #f8fafc; }
        .fin-print .right { text-align: right; }
      `}</style>
      <div className="fin-print">
        <div className="doc-header">
          <div className="doc-company">{company}</div>
          <div className="doc-title">ONGKIR & BIAYA PEROLEHAN</div>
          <div className="doc-meta">Periode: {from_date} s/d {to_date}</div>
        </div>

        <div className="section-title">Biaya Masuk HPP (Expenses Included In Asset Valuation)</div>
        <table>
          <thead>
            <tr>
              <th style={{width:'16%'}}>Tanggal</th>
              <th style={{width:'24%'}}>Voucher</th>
              <th style={{width:'36%'}}>Akun</th>
              <th className="right" style={{width:'24%'}}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.hpp_costs.length === 0 ? (
              <tr><td colSpan={4} style={{textAlign: 'center', padding: '12px', color: '#666'}}>Tidak ada biaya masuk HPP</td></tr>
            ) : (
              data.hpp_costs.map((e: any, i: number) => (
                <tr key={i}>
                  <td>{e.posting_date}</td>
                  <td>{e.voucher_no}<br /><span style={{fontSize: '7px', color: '#666'}}>{e.voucher_type}</span></td>
                  <td>{e.account}</td>
                  <td className="right">Rp {Math.abs(e.amount).toLocaleString('id-ID')}</td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="total-row">
              <td colSpan={3} className="right">TOTAL MASUK HPP:</td>
              <td className="right">Rp {hppTotal.toLocaleString('id-ID')}</td>
            </tr>
          </tfoot>
        </table>

        <div className="section-title" style={{marginTop: '12px'}}>Beban Operasional (Freight/Ongkir)</div>
        <table>
          <thead>
            <tr>
              <th style={{width:'16%'}}>Tanggal</th>
              <th style={{width:'24%'}}>Voucher</th>
              <th style={{width:'36%'}}>Akun</th>
              <th className="right" style={{width:'24%'}}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.operational_costs.length === 0 ? (
              <tr><td colSpan={4} style={{textAlign: 'center', padding: '12px', color: '#666'}}>Tidak ada beban operasional</td></tr>
            ) : (
              data.operational_costs.map((e: any, i: number) => (
                <tr key={i}>
                  <td>{e.posting_date}</td>
                  <td>{e.voucher_no}<br /><span style={{fontSize: '7px', color: '#666'}}>{e.voucher_type}</span></td>
                  <td>{e.account}</td>
                  <td className="right">Rp {Math.abs(e.amount).toLocaleString('id-ID')}</td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="total-row">
              <td colSpan={3} className="right">TOTAL BEBAN OPERASIONAL:</td>
              <td className="right">Rp {opTotal.toLocaleString('id-ID')}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}

export default function AcquisitionCostsPrint() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AcquisitionCostsPrintContent />
    </Suspense>
  );
}
