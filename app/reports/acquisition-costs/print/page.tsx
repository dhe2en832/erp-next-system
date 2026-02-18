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
        @page { size: A4; margin: 15mm; }
        body { font-family: Arial, sans-serif; font-size: 9px; color: #111; }
        .report-header { text-align: center; margin-bottom: 12px; border-bottom: 2px solid #111; padding-bottom: 6px; }
        .report-title { font-size: 15px; font-weight: 700; text-transform: uppercase; }
        .report-company { font-size: 13px; font-weight: 600; margin-top: 3px; }
        .report-period { font-size: 9px; color: #555; margin-top: 2px; }
        .section-title { font-size: 11px; font-weight: 700; margin-top: 12px; margin-bottom: 6px; padding: 4px 6px; background: #f1f5f9; border-left: 3px solid #4f46e5; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        th { background: #1e293b; color: #fff; padding: 5px 6px; text-align: left; font-size: 8px; text-transform: uppercase; }
        td { padding: 4px 6px; border-bottom: 1px solid #e5e7eb; font-size: 8px; }
        tr:nth-child(even) { background: #f8fafc; }
        .text-right { text-align: right; }
        .total-row { font-weight: 700; background: #f1f5f9 !important; border-top: 2px solid #111; }
      `}</style>
      <div className="report-header">
        <div className="report-title">Ongkir & Biaya Perolehan</div>
        <div className="report-company">{company}</div>
        <div className="report-period">Periode: {from_date} s/d {to_date}</div>
      </div>

      <div className="section-title">Biaya Masuk HPP (Expenses Included In Asset Valuation)</div>
      <table>
        <thead>
          <tr>
            <th>Tanggal</th>
            <th>Voucher</th>
            <th>Akun</th>
            <th className="text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {data.hpp_costs.length === 0 ? (
            <tr><td colSpan={4} style={{textAlign: 'center', padding: '12px', color: '#666'}}>Tidak ada biaya masuk HPP</td></tr>
          ) : (
            data.hpp_costs.map((e: any, i: number) => (
              <tr key={i}>
                <td>{e.posting_date}</td>
                <td>{e.voucher_no}<br/><span style={{fontSize: '7px', color: '#666'}}>{e.voucher_type}</span></td>
                <td>{e.account}</td>
                <td className="text-right">Rp {Math.abs(e.amount).toLocaleString('id-ID')}</td>
              </tr>
            ))
          )}
          <tr className="total-row">
            <td colSpan={3} className="text-right">TOTAL MASUK HPP:</td>
            <td className="text-right">Rp {hppTotal.toLocaleString('id-ID')}</td>
          </tr>
        </tbody>
      </table>

      <div className="section-title" style={{marginTop: '20px'}}>Beban Operasional (Freight/Ongkir)</div>
      <table>
        <thead>
          <tr>
            <th>Tanggal</th>
            <th>Voucher</th>
            <th>Akun</th>
            <th className="text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {data.operational_costs.length === 0 ? (
            <tr><td colSpan={4} style={{textAlign: 'center', padding: '12px', color: '#666'}}>Tidak ada beban operasional</td></tr>
          ) : (
            data.operational_costs.map((e: any, i: number) => (
              <tr key={i}>
                <td>{e.posting_date}</td>
                <td>{e.voucher_no}<br/><span style={{fontSize: '7px', color: '#666'}}>{e.voucher_type}</span></td>
                <td>{e.account}</td>
                <td className="text-right">Rp {Math.abs(e.amount).toLocaleString('id-ID')}</td>
              </tr>
            ))
          )}
          <tr className="total-row">
            <td colSpan={3} className="text-right">TOTAL BEBAN OPERASIONAL:</td>
            <td className="text-right">Rp {opTotal.toLocaleString('id-ID')}</td>
          </tr>
        </tbody>
      </table>
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
