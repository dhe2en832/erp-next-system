'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import A4ReportLayout, { fmtIDR, fmtDate, getTerbilang, ReportColumn } from '../../../components/A4ReportLayout';
import LoadingSpinner from '../../../components/LoadingSpinner';

function calcOverdue(dueDate?: string): number {
  if (!dueDate) return 0;
  const today = new Date(); today.setHours(0,0,0,0);
  const due = new Date(dueDate); due.setHours(0,0,0,0);
  const diff = Math.floor((today.getTime() - due.getTime()) / 86400000);
  return diff > 0 ? diff : 0;
}

const COLUMNS: ReportColumn[] = [
  { key: 'voucher_no', label: 'No. Faktur', width: '110px' },
  { key: 'supplier_name', label: 'Pemasok', format: (v, r) => v || r.supplier || '-' },
  { key: 'posting_date', label: 'Tanggal', width: '75px', format: (v) => fmtDate(v) },
  { key: 'due_date', label: 'Jatuh Tempo', width: '75px', format: (v) => fmtDate(v) },
  { key: 'invoice_grand_total', label: 'Total', width: '100px', align: 'right', format: (v) => fmtIDR(v || 0) },
  { key: 'outstanding_amount', label: 'Outstanding', width: '100px', align: 'right', format: (v) => fmtIDR(v || 0) },
  { key: 'due_date', label: 'Umur (hr)', width: '65px', align: 'right',
    format: (v) => { const d = calcOverdue(v); return d > 0 ? `${d} hr` : '-'; },
    highlight: (v) => { const d = calcOverdue(v); return d > 0 ? 'overdue-cell' : ''; }
  },
];

function APPrint() {
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
        const res = await fetch(`/api/finance/reports/accounts-payable?${params}`, { credentials: 'include' });
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

  if (loading) return <LoadingSpinner message="Memuat data hutang..." />;
  if (error) return <div style={{ padding: '20px', color: 'red' }}>{error}</div>;

  const totalOutstanding = data.reduce((s, r) => s + (r.outstanding_amount || 0), 0);
  const totalInvoice = data.reduce((s, r) => s + (r.invoice_grand_total || 0), 0);
  const periodLabel = fromDate && toDate ? `Periode: ${fmtDate(fromDate)} – ${fmtDate(toDate)}` : '';

  return (
    <A4ReportLayout
      reportTitle="DAFTAR HUTANG SUPPLIER"
      companyName={company}
      periodLabel={periodLabel}
      columns={COLUMNS}
      data={data}
      summaryCards={[
        { label: 'Jumlah Faktur', value: data.length },
        { label: 'Total Faktur', value: fmtIDR(totalInvoice) },
        { label: 'Total Outstanding', value: fmtIDR(totalOutstanding), color: '#dc2626' },
      ]}
      footerTotals={[
        { label: 'Total Hutang', value: fmtIDR(totalInvoice) },
        { label: 'Total Outstanding', value: fmtIDR(totalOutstanding) },
      ]}
      terbilang={getTerbilang(totalOutstanding)}
    />
  );
}

export default function APPrintPage() {
  return (
    <Suspense fallback={<LoadingSpinner message="Memuat..." />}>
      <APPrint />
    </Suspense>
  );
}
