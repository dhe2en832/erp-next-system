'use client';

import { useState, useEffect, useCallback } from 'react';
import LoadingSpinner from '../../components/LoadingSpinner';

interface AREntry {
  customer: string;
  customer_name?: string;
  posting_date: string;
  voucher_no: string;
  voucher_type: string;
  invoice_grand_total: number;
  outstanding_amount: number;
  due_date?: string;
  age?: number;
}

export default function AccountsReceivablePage() {
  const [data, setData] = useState<AREntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('selected_company');
    if (saved) setSelectedCompany(saved);
  }, []);

  const fetchData = useCallback(async () => {
    if (!selectedCompany) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/finance/reports/accounts-receivable?company=${encodeURIComponent(selectedCompany)}`, { credentials: 'include' });
      const result = await response.json();
      if (result.success) {
        setData(result.data || []);
      } else {
        setError(result.message || 'Gagal memuat data piutang');
      }
    } catch (err) {
      console.error('Error fetching AR:', err);
      setError('Gagal memuat data piutang');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany]);

  useEffect(() => {
    if (selectedCompany) fetchData();
  }, [selectedCompany, fetchData]);

  const totalOutstanding = data.reduce((sum, entry) => sum + (entry.outstanding_amount || 0), 0);

  if (loading) return <LoadingSpinner message="Memuat data piutang usaha..." />;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Piutang Usaha</h1>
        <p className="text-sm text-gray-500">Daftar piutang usaha (Accounts Receivable)</p>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-600 font-medium">Jumlah Piutang</p>
          <p className="text-2xl font-bold text-blue-900">{data.length}</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <p className="text-sm text-orange-600 font-medium">Total Outstanding</p>
          <p className="text-2xl font-bold text-orange-900">Rp {totalOutstanding.toLocaleString('id-ID')}</p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">No. Faktur</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pelanggan</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jatuh Tempo</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Faktur</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Outstanding</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Tidak ada data piutang</td></tr>
            ) : (
              data.map((entry, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-indigo-600">{entry.voucher_no}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{entry.customer_name || entry.customer}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{entry.posting_date}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{entry.due_date || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">Rp {(entry.invoice_grand_total || 0).toLocaleString('id-ID')}</td>
                  <td className="px-4 py-3 text-sm font-medium text-red-600 text-right">Rp {(entry.outstanding_amount || 0).toLocaleString('id-ID')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
