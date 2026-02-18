'use client';

import { useState, useEffect, useCallback } from 'react';
import LoadingSpinner from '../../components/LoadingSpinner';
import PrintPreviewModal from '../../../components/PrintPreviewModal';
import BrowserStyleDatePicker from '../../../components/BrowserStyleDatePicker';

export default function HPPReconciliationPage() {
  const [data, setData] = useState<any>({ entries: [], summary: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPrint, setShowPrint] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [dateFilter, setDateFilter] = useState(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const formatDate = (date: Date) => `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    return { from_date: formatDate(firstDay), to_date: formatDate(today) };
  });

  useEffect(() => {
    const saved = localStorage.getItem('selected_company');
    if (saved) setSelectedCompany(saved);
  }, []);

  const fetchData = useCallback(async () => {
    if (!selectedCompany) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        company: selectedCompany,
        from_date: dateFilter.from_date.split('/').reverse().join('-'),
        to_date: dateFilter.to_date.split('/').reverse().join('-')
      });
      const response = await fetch(`/api/finance/reports/hpp-reconciliation?${params}`, { credentials: 'include' });
      const result = await response.json();
      if (result.success) {
        setData(result.data || { entries: [], summary: {} });
      } else {
        setError(result.message || 'Gagal memuat rekonsiliasi HPP');
      }
    } catch (err) {
      console.error('Error fetching HPP reconciliation:', err);
      setError('Gagal memuat rekonsiliasi HPP');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, dateFilter]);

  useEffect(() => {
    if (selectedCompany) fetchData();
  }, [selectedCompany, fetchData]);

  const summary = data.summary || {};
  const printUrl = `/reports/hpp-reconciliation/print?company=${selectedCompany}&from_date=${dateFilter.from_date}&to_date=${dateFilter.to_date}`;

  if (loading) return <LoadingSpinner message="Memuat rekonsiliasi HPP..." />;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rekonsiliasi HPP</h1>
          <p className="text-sm text-gray-500">Validasi HPP vs Sales - deteksi masalah margin</p>
        </div>
        <button onClick={() => setShowPrint(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm flex items-center gap-2">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
          Cetak Laporan
        </button>
      </div>

      {showPrint && (
        <PrintPreviewModal title={`Rekonsiliasi HPP — ${selectedCompany}`} onClose={() => setShowPrint(false)} printUrl={printUrl} useContentFrame={false} allowPaperSettings={false}>
          <iframe src={printUrl} title="Pratinjau" style={{ width: '210mm', height: '297mm', border: 0, background: '#fff', boxShadow: '0 8px 40px rgba(0,0,0,0.45)' }} />
        </PrintPreviewModal>
      )}

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dari Tanggal</label>
            <BrowserStyleDatePicker value={dateFilter.from_date} onChange={(value: string) => setDateFilter(prev => ({ ...prev, from_date: value }))} className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="DD/MM/YYYY" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sampai Tanggal</label>
            <BrowserStyleDatePicker value={dateFilter.to_date} onChange={(value: string) => setDateFilter(prev => ({ ...prev, to_date: value }))} className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="DD/MM/YYYY" />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={fetchData} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors">Refresh Data</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600 font-medium">Total HPP</p>
          <p className="text-2xl font-bold text-red-900">Rp {(summary.total_hpp || 0).toLocaleString('id-ID')}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-600 font-medium">Total Sales</p>
          <p className="text-2xl font-bold text-green-900">Rp {(summary.total_sales || 0).toLocaleString('id-ID')}</p>
        </div>
        <div className={`border rounded-lg p-4 ${summary.hpp_percentage > 100 ? 'bg-red-50 border-red-200' : summary.hpp_percentage > 80 ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-200'}`}>
          <p className={`text-sm font-medium ${summary.hpp_percentage > 100 ? 'text-red-600' : summary.hpp_percentage > 80 ? 'text-yellow-600' : 'text-blue-600'}`}>HPP % dari Sales</p>
          <p className={`text-2xl font-bold ${summary.hpp_percentage > 100 ? 'text-red-900' : summary.hpp_percentage > 80 ? 'text-yellow-900' : 'text-blue-900'}`}>{(summary.hpp_percentage || 0).toFixed(1)}%</p>
        </div>
      </div>

      {summary.warning && (
        <div className="mb-6 p-4 bg-red-50 border border-red-300 rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <p className="text-sm font-semibold text-red-900">{summary.warning}</p>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-900">Detail Entry HPP <span className="ml-2 px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full">{data.entries.length} entri</span></h3>
        </div>
        <div className="overflow-x-auto" style={{maxHeight: '500px'}}>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Voucher</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Akun</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Debit</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Kredit</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.entries.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Tidak ada entry HPP</td></tr>
              ) : (
                data.entries.map((e: any, i: number) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{e.posting_date}</td>
                    <td className="px-4 py-3 text-sm"><div className="font-medium text-indigo-600">{e.voucher_no}</div><div className="text-xs text-gray-500">{e.voucher_type}</div></td>
                    <td className="px-4 py-3 text-sm text-gray-700">{e.account}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">{e.debit > 0 ? `Rp ${e.debit.toLocaleString('id-ID')}` : '-'}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">{e.credit > 0 ? `Rp ${e.credit.toLocaleString('id-ID')}` : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
