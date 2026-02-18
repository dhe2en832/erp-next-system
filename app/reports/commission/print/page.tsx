'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import A4ReportLayout, { fmtIDR, fmtDate, getTerbilang, ReportColumn } from '../../../components/A4ReportLayout';
import LoadingSpinner from '../../../components/LoadingSpinner';

const SO_COLUMNS: ReportColumn[] = [
  { key: 'name', label: 'No. SO', width: '120px' },
  { key: 'transaction_date', label: 'Tanggal', width: '80px', format: (v) => fmtDate(v) },
  { key: 'customer', label: 'Pelanggan' },
  { key: 'base_grand_total', label: 'Total', width: '110px', align: 'right', format: (v) => fmtIDR(v || 0) },
];

const INV_COLUMNS: ReportColumn[] = [
  { key: 'name', label: 'No. Invoice', width: '120px' },
  { key: 'posting_date', label: 'Tanggal', width: '80px', format: (v) => fmtDate(v) },
  { key: 'customer', label: 'Pelanggan' },
  { key: 'base_grand_total', label: 'Total', width: '110px', align: 'right', format: (v) => fmtIDR(v || 0) },
];

function CommissionPrint() {
  const searchParams = useSearchParams();
  const salesPerson = searchParams.get('sales_person') || '';
  const company = searchParams.get('company') || '';

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const params = new URLSearchParams({ sales_person: salesPerson, limit_page_length: '500', start: '0' });
        const res = await fetch(`/api/commission?${params}`, { credentials: 'include' });
        const json = await res.json();
        if (!json.error) setData(json);
        else setError(json.message || 'Gagal memuat');
      } catch { setError('Gagal memuat data'); }
      finally { setLoading(false); }
    };
    fetch_();
  }, [salesPerson]);

  useEffect(() => {
    if (!loading && !error) setTimeout(() => window.print(), 500);
  }, [loading, error]);

  if (loading) return <LoadingSpinner message="Memuat laporan komisi..." />;
  if (error) return <div style={{ padding: '20px', color: 'red' }}>{error}</div>;

  const summary = data?.summary || {};
  const salesOrders: any[] = data?.sales_orders || [];
  const paidInvoices: any[] = data?.paid_invoices || [];

  const earnedCommission = summary.earned_commission || 0;
  const potentialCommission = summary.potential_commission || 0;

  const CSS_EXTRA = `
.comm-section-title { font-size: 11px; font-weight: 700; background: #e2e8f0; padding: 5px 6px; border: 1px solid #cbd5e1; color: #334155; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0; }
.comm-table { width: 100%; border-collapse: collapse; font-size: 10.5px; margin-bottom: 12px; }
.comm-table th { padding: 5px 6px; font-weight: 700; font-size: 10px; text-transform: uppercase; background: #1e293b; color: #fff; border: 1px solid #334155; }
.comm-table td { padding: 4px 6px; border: 1px solid #e2e8f0; }
.comm-table tbody tr:nth-child(even) td { background: #f8fafc; }
`;

  const content = (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS_EXTRA }} />

      <div className="comm-section-title">Sales Orders</div>
      <table className="comm-table">
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>No. SO</th>
            <th style={{ textAlign: 'left', width: '80px' }}>Tanggal</th>
            <th style={{ textAlign: 'left' }}>Pelanggan</th>
            <th style={{ textAlign: 'right', width: '110px' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {salesOrders.length === 0 ? (
            <tr><td colSpan={4} style={{ textAlign: 'center', color: '#94a3b8', padding: '12px' }}>Tidak ada data</td></tr>
          ) : salesOrders.map((r: any, i: number) => (
            <tr key={i}>
              <td>{r.name}</td>
              <td>{fmtDate(r.transaction_date)}</td>
              <td>{r.customer || '-'}</td>
              <td style={{ textAlign: 'right' }}>{fmtIDR(r.base_grand_total || 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="comm-section-title">Invoice Terbayar</div>
      <table className="comm-table">
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>No. Invoice</th>
            <th style={{ textAlign: 'left', width: '80px' }}>Tanggal</th>
            <th style={{ textAlign: 'left' }}>Pelanggan</th>
            <th style={{ textAlign: 'right', width: '110px' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {paidInvoices.length === 0 ? (
            <tr><td colSpan={4} style={{ textAlign: 'center', color: '#94a3b8', padding: '12px' }}>Tidak ada data</td></tr>
          ) : paidInvoices.map((r: any, i: number) => (
            <tr key={i}>
              <td>{r.name}</td>
              <td>{fmtDate(r.posting_date)}</td>
              <td>{r.customer || '-'}</td>
              <td style={{ textAlign: 'right' }}>{fmtIDR(r.base_grand_total || 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );

  return (
    <A4ReportLayout
      reportTitle="LAPORAN KOMISI PENJUALAN"
      companyName={company}
      reportSubtitle={salesPerson ? `Sales Person: ${salesPerson}` : undefined}
      columns={[]}
      data={[]}
      summaryCards={[
        { label: 'Total Penjualan', value: fmtIDR(summary.total_sales || 0) },
        { label: 'Total Terbayar', value: fmtIDR(summary.total_paid || 0) },
        { label: 'Komisi Potensial', value: fmtIDR(potentialCommission) },
        { label: 'Komisi Diterima', value: fmtIDR(earnedCommission), color: '#16a34a' },
        { label: 'Rate Komisi', value: `${summary.commission_rate || 0}%` },
      ]}
      terbilang={getTerbilang(earnedCommission)}
    >
      {content}
    </A4ReportLayout>
  );
}

export default function CommissionPrintPage() {
  return (
    <Suspense fallback={<LoadingSpinner message="Memuat..." />}>
      <CommissionPrint />
    </Suspense>
  );
}
