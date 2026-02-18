'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import A4ReportLayout, { fmtIDR, fmtDate, ReportColumn } from '../../../components/A4ReportLayout';
import LoadingSpinner from '../../../components/LoadingSpinner';
import React from 'react';

const CSS_EXTRA = `
.cf-section-title { font-size: 11px; font-weight: 700; background: #e2e8f0; padding: 5px 6px; border: 1px solid #cbd5e1; color: #334155; text-transform: uppercase; letter-spacing: 0.5px; }
.cf-table { width: 100%; border-collapse: collapse; font-size: 10.5px; margin-bottom: 8px; }
.cf-table th { padding: 5px 6px; font-weight: 700; font-size: 10px; text-transform: uppercase; background: #1e293b; color: #fff; border: 1px solid #334155; }
.cf-table td { padding: 4px 6px; border: 1px solid #e2e8f0; }
.cf-table tbody tr:nth-child(even) td { background: #f8fafc; }
.cf-subtotal td { background: #f1f5f9 !important; font-weight: 700; border-top: 2px solid #334155; }
.cf-grand td { background: #1e293b !important; color: #fff !important; font-weight: 700; font-size: 12px; }
`;

function CashFlowPrint() {
  const searchParams = useSearchParams();
  const company = searchParams.get('company') || '';
  const fromDate = searchParams.get('from_date') || '';
  const toDate = searchParams.get('to_date') || '';

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const params = new URLSearchParams({ company });
        if (fromDate) params.set('from_date', fromDate);
        if (toDate) params.set('to_date', toDate);
        const res = await fetch(`/api/finance/reports/cash-flow?${params}`, { credentials: 'include' });
        const json = await res.json();
        if (json.success) setData(json.data || []);
        else setError(json.message || 'Gagal memuat');
      } catch { setError('Gagal memuat data'); }
      finally { setLoading(false); }
    };
    fetch_();
  }, [company, fromDate, toDate]);

  useEffect(() => {
    if (!loading && !error) setTimeout(() => window.print(), 500);
  }, [loading, error]);

  if (loading) return <LoadingSpinner message="Memuat laporan arus kas..." />;
  if (error) return <div style={{ padding: '20px', color: 'red' }}>{error}</div>;

  const kasmasuk = data.filter(r => (r.debit || 0) > 0);
  const kaskeluar = data.filter(r => (r.credit || 0) > 0);
  const totalMasuk = kasmasuk.reduce((s, r) => s + (r.debit || 0), 0);
  const totalKeluar = kaskeluar.reduce((s, r) => s + (r.credit || 0), 0);
  const saldo = totalMasuk - totalKeluar;
  const periodLabel = fromDate && toDate ? `Periode: ${fmtDate(fromDate)} – ${fmtDate(toDate)}` : '';

  const content = (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS_EXTRA }} />
      <div className="cf-section-title">A. Kas Masuk</div>
      <table className="cf-table">
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>Akun</th>
            <th style={{ textAlign: 'left', width: '80px' }}>Tanggal</th>
            <th style={{ textAlign: 'left', width: '100px' }}>Jenis</th>
            <th style={{ textAlign: 'left', width: '110px' }}>Voucher</th>
            <th style={{ textAlign: 'right', width: '110px' }}>Jumlah</th>
          </tr>
        </thead>
        <tbody>
          {kasmasuk.length === 0 ? (
            <tr><td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8', padding: '12px' }}>Tidak ada kas masuk</td></tr>
          ) : kasmasuk.map((r, i) => (
            <tr key={i}>
              <td>{r.account}</td>
              <td>{fmtDate(r.posting_date)}</td>
              <td>{r.voucher_type || '-'}</td>
              <td>{r.voucher_no || '-'}</td>
              <td style={{ textAlign: 'right' }}>{fmtIDR(r.debit || 0)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="cf-subtotal">
            <td colSpan={4} style={{ textAlign: 'right', fontWeight: 700 }}>Subtotal Kas Masuk</td>
            <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmtIDR(totalMasuk)}</td>
          </tr>
        </tfoot>
      </table>

      <div className="cf-section-title" style={{ marginTop: '12px' }}>B. Kas Keluar</div>
      <table className="cf-table">
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>Akun</th>
            <th style={{ textAlign: 'left', width: '80px' }}>Tanggal</th>
            <th style={{ textAlign: 'left', width: '100px' }}>Jenis</th>
            <th style={{ textAlign: 'left', width: '110px' }}>Voucher</th>
            <th style={{ textAlign: 'right', width: '110px' }}>Jumlah</th>
          </tr>
        </thead>
        <tbody>
          {kaskeluar.length === 0 ? (
            <tr><td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8', padding: '12px' }}>Tidak ada kas keluar</td></tr>
          ) : kaskeluar.map((r, i) => (
            <tr key={i}>
              <td>{r.account}</td>
              <td>{fmtDate(r.posting_date)}</td>
              <td>{r.voucher_type || '-'}</td>
              <td>{r.voucher_no || '-'}</td>
              <td style={{ textAlign: 'right' }}>{fmtIDR(r.credit || 0)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="cf-subtotal">
            <td colSpan={4} style={{ textAlign: 'right', fontWeight: 700 }}>Subtotal Kas Keluar</td>
            <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmtIDR(totalKeluar)}</td>
          </tr>
        </tfoot>
      </table>

      <table className="cf-table" style={{ marginTop: '8px' }}>
        <tbody>
          <tr className="cf-subtotal">
            <td style={{ fontWeight: 700 }}>Total Kas Masuk</td>
            <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmtIDR(totalMasuk)}</td>
          </tr>
          <tr className="cf-subtotal">
            <td style={{ fontWeight: 700 }}>Total Kas Keluar</td>
            <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmtIDR(totalKeluar)}</td>
          </tr>
          <tr className="cf-grand">
            <td style={{ fontWeight: 700 }}>SALDO AKHIR</td>
            <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmtIDR(saldo)}</td>
          </tr>
        </tbody>
      </table>
    </>
  );

  return (
    <A4ReportLayout
      reportTitle="LAPORAN ARUS KAS"
      companyName={company}
      periodLabel={periodLabel}
      columns={[]}
      data={[]}
      summaryCards={[
        { label: 'Total Kas Masuk', value: fmtIDR(totalMasuk), color: '#16a34a' },
        { label: 'Total Kas Keluar', value: fmtIDR(totalKeluar), color: '#dc2626' },
        { label: 'Saldo Akhir', value: fmtIDR(saldo), color: saldo >= 0 ? '#16a34a' : '#dc2626' },
      ]}
    >
      {content}
    </A4ReportLayout>
  );
}

export default function CashFlowPrintPage() {
  return (
    <Suspense fallback={<LoadingSpinner message="Memuat..." />}>
      <CashFlowPrint />
    </Suspense>
  );
}
