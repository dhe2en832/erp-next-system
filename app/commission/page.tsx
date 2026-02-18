'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CommissionDashboard from '../../components/CommissionDashboard';
import PrintPreviewModal from '../../components/PrintPreviewModal';

function CommissionPrintContent({ company }: { company: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/setup/commission?limit_page_length=200&start=0')
      .then(r => r.json())
      .then(result => { if (!result.error) setData(result); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const fmt = (v: number) => `Rp ${(v || 0).toLocaleString('id-ID')}`;

  if (loading) return <div style={{ padding: '20px', color: '#555' }}>Memuat data...</div>;
  if (!data) return <div style={{ padding: '20px', color: '#dc2626' }}>Gagal memuat data komisi</div>;

  const today = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#111' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #111', paddingBottom: '6px', marginBottom: '10px' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700 }}>{company}</div>
          <div style={{ fontSize: '9px', color: '#555' }}>Dicetak: {today}</div>
        </div>
        <div style={{ fontSize: '15px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Laporan Komisi</div>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '12px' }}>
        {[
          { label: 'Total Penjualan', value: fmt(data.summary?.total_sales), color: '#2563eb' },
          { label: 'Total Terbayar', value: fmt(data.summary?.total_paid), color: '#16a34a' },
          { label: 'Potensi Komisi', value: fmt(data.summary?.potential_commission), color: '#ca8a04' },
          { label: 'Komisi Diperoleh', value: fmt(data.summary?.earned_commission), color: '#7c3aed' },
        ].map((s, i) => (
          <div key={i} style={{ border: '1px solid #e5e7eb', borderRadius: '4px', padding: '6px 8px' }}>
            <div style={{ fontSize: '8px', color: '#555' }}>{s.label}</div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: '9px', color: '#555', marginBottom: '10px' }}>
        Tarif Komisi: <strong>{data.summary?.commission_rate}%</strong> &mdash; Komisi dibayarkan setelah Sales Invoice berstatus &ldquo;Paid&rdquo;
      </div>

      {/* Sales Orders */}
      {data.sales_orders?.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontWeight: 700, fontSize: '11px', marginBottom: '4px', borderLeft: '3px solid #4f46e5', paddingLeft: '6px' }}>Sales Orders</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ background: '#1e293b', color: '#fff', padding: '3px 5px', textAlign: 'left', fontSize: '9px' }}>No. SO</th>
                <th style={{ background: '#1e293b', color: '#fff', padding: '3px 5px', textAlign: 'left', fontSize: '9px' }}>Tanggal</th>
                <th style={{ background: '#1e293b', color: '#fff', padding: '3px 5px', textAlign: 'left', fontSize: '9px' }}>Pelanggan</th>
                <th style={{ background: '#1e293b', color: '#fff', padding: '3px 5px', textAlign: 'right', fontSize: '9px' }}>Jumlah</th>
              </tr>
            </thead>
            <tbody>
              {data.sales_orders.map((so: any, i: number) => (
                <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                  <td style={{ padding: '2px 5px', borderBottom: '1px solid #e5e7eb' }}>{so.name}</td>
                  <td style={{ padding: '2px 5px', borderBottom: '1px solid #e5e7eb' }}>{so.transaction_date}</td>
                  <td style={{ padding: '2px 5px', borderBottom: '1px solid #e5e7eb' }}>{so.customer_name || so.customer || '-'}</td>
                  <td style={{ padding: '2px 5px', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>{fmt(so.base_grand_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Paid Invoices */}
      {data.paid_invoices?.length > 0 && (
        <div>
          <div style={{ fontWeight: 700, fontSize: '11px', marginBottom: '4px', borderLeft: '3px solid #16a34a', paddingLeft: '6px' }}>Faktur Terbayar</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ background: '#1e293b', color: '#fff', padding: '3px 5px', textAlign: 'left', fontSize: '9px' }}>No. Invoice</th>
                <th style={{ background: '#1e293b', color: '#fff', padding: '3px 5px', textAlign: 'left', fontSize: '9px' }}>Tanggal</th>
                <th style={{ background: '#1e293b', color: '#fff', padding: '3px 5px', textAlign: 'left', fontSize: '9px' }}>Pelanggan</th>
                <th style={{ background: '#1e293b', color: '#fff', padding: '3px 5px', textAlign: 'right', fontSize: '9px' }}>Jumlah</th>
                <th style={{ background: '#1e293b', color: '#fff', padding: '3px 5px', textAlign: 'right', fontSize: '9px' }}>Komisi</th>
              </tr>
            </thead>
            <tbody>
              {data.paid_invoices.map((inv: any, i: number) => (
                <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                  <td style={{ padding: '2px 5px', borderBottom: '1px solid #e5e7eb' }}>{inv.name}</td>
                  <td style={{ padding: '2px 5px', borderBottom: '1px solid #e5e7eb' }}>{inv.posting_date}</td>
                  <td style={{ padding: '2px 5px', borderBottom: '1px solid #e5e7eb' }}>{inv.customer_name || inv.customer || '-'}</td>
                  <td style={{ padding: '2px 5px', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>{fmt(inv.base_grand_total)}</td>
                  <td style={{ padding: '2px 5px', borderBottom: '1px solid #e5e7eb', textAlign: 'right', color: '#7c3aed', fontWeight: 600 }}>
                    {fmt((inv.base_grand_total || 0) * (data.summary?.commission_rate || 0) / 100)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function CommissionPage() {
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let company = localStorage.getItem('selected_company');
    if (!company) {
      const companyCookie = document.cookie.split(';').find(c => c.trim().startsWith('selected_company='));
      if (companyCookie) {
        company = companyCookie.split('=')[1];
        if (company) localStorage.setItem('selected_company', company);
      }
    }
    setSelectedCompany(company);
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (!selectedCompany) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-yellow-800">Perusahaan Belum Dipilih</h3>
          <p className="text-yellow-600 mt-2">Silakan pilih perusahaan terlebih dahulu untuk melihat dasbor komisi.</p>
          <button
            onClick={() => router.push('/select-company')}
            className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
          >
            Pilih Perusahaan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dasbor Komisi Penjualan</h1>
          <p className="text-gray-600">Lacak dan kelola komisi penjualan tim Anda</p>
        </div>
        <button
          onClick={() => setShowPreview(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm flex items-center gap-2"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
          Cetak Laporan
        </button>
      </div>

      <CommissionDashboard />

      {showPreview && (
        <PrintPreviewModal
          title={`Laporan Komisi — ${selectedCompany}`}
          onClose={() => setShowPreview(false)}
        >
          <CommissionPrintContent company={selectedCompany || ''} />
        </PrintPreviewModal>
      )}
    </div>
  );
}
