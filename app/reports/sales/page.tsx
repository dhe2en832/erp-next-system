'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import LoadingSpinner from '../../components/LoadingSpinner';

interface SalesEntry {
  name: string;
  customer: string;
  customer_name?: string;
  transaction_date: string;
  grand_total: number;
  status: string;
  per_delivered?: number;
  per_billed?: number;
}

const STATUS_OPTIONS = [
  { value: '', label: 'Semua Status' },
  { value: 'Draft', label: 'Draft' },
  { value: 'To Deliver and Bill', label: 'To Deliver and Bill' },
  { value: 'To Bill', label: 'To Bill' },
  { value: 'To Deliver', label: 'To Deliver' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Cancelled', label: 'Cancelled' },
];

export default function SalesReportPage() {
  const [data, setData] = useState<SalesEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('selected_company');
    if (saved) setSelectedCompany(saved);
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    setFromDate(firstDay.toISOString().split('T')[0]);
    setToDate(today.toISOString().split('T')[0]);
  }, []);

  const fetchData = useCallback(async () => {
    if (!selectedCompany) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ company: selectedCompany });
      if (fromDate) params.set('from_date', fromDate);
      if (toDate) params.set('to_date', toDate);

      const response = await fetch(`/api/finance/reports/sales?${params}`, { credentials: 'include' });
      const result = await response.json();
      if (result.success) {
        setData(result.data || []);
      } else {
        setError(result.message || 'Gagal memuat laporan penjualan');
      }
    } catch {
      setError('Gagal memuat laporan penjualan');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, fromDate, toDate]);

  useEffect(() => {
    if (selectedCompany) fetchData();
  }, [selectedCompany, fetchData]);

  const filteredData = useMemo(() => {
    return data.filter(entry => {
      const matchCustomer = !filterCustomer ||
        (entry.customer_name || entry.customer || '').toLowerCase().includes(filterCustomer.toLowerCase());
      const matchStatus = !filterStatus || entry.status === filterStatus;
      return matchCustomer && matchStatus;
    });
  }, [data, filterCustomer, filterStatus]);

  const totalSales = filteredData.reduce((sum, e) => sum + (e.grand_total || 0), 0);

  if (loading) return <LoadingSpinner message="Memuat laporan penjualan..." />;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan Penjualan</h1>
          <p className="text-sm text-gray-500">Ringkasan pesanan penjualan dengan progres pengiriman & penagihan</p>
        </div>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm flex items-center gap-2 print:hidden"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
          Cetak
        </button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6 print:hidden">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Dari Tanggal</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Sampai Tanggal</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Pelanggan</label>
          <input type="text" placeholder="Filter pelanggan..." value={filterCustomer} onChange={(e) => setFilterCustomer(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md text-sm">
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button onClick={fetchData} className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700">Tampilkan</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-600 font-medium">Jumlah SO</p>
          <p className="text-2xl font-bold text-blue-900">{filteredData.length}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-600 font-medium">Total Penjualan</p>
          <p className="text-2xl font-bold text-green-900">Rp {totalSales.toLocaleString('id-ID')}</p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">No. SO</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pelanggan</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">% Kirim</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">% Tagih</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredData.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Tidak ada data penjualan</td></tr>
            ) : (
              filteredData.map((entry) => (
                <tr key={entry.name} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-indigo-600">{entry.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{entry.customer_name || entry.customer}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{entry.transaction_date}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">Rp {(entry.grand_total || 0).toLocaleString('id-ID')}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${Math.min(entry.per_delivered || 0, 100)}%` }}></div>
                    </div>
                    <span className="text-xs text-gray-500">{(entry.per_delivered || 0).toFixed(0)}%</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: `${Math.min(entry.per_billed || 0, 100)}%` }}></div>
                    </div>
                    <span className="text-xs text-gray-500">{(entry.per_billed || 0).toFixed(0)}%</span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      entry.status === 'Completed' ? 'bg-green-100 text-green-800' :
                      entry.status === 'To Deliver and Bill' ? 'bg-yellow-100 text-yellow-800' :
                      entry.status === 'To Bill' ? 'bg-blue-100 text-blue-800' :
                      entry.status === 'To Deliver' ? 'bg-purple-100 text-purple-800' :
                      entry.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>{entry.status}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
