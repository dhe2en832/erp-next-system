'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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

function calcOverdueDays(dueDate?: string): number {
  if (!dueDate) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

export default function AccountsReceivablePage() {
  const [data, setData] = useState<AREntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterInvoice, setFilterInvoice] = useState('');

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
    } catch {
      setError('Gagal memuat data piutang');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany]);

  useEffect(() => {
    if (selectedCompany) fetchData();
  }, [selectedCompany, fetchData]);

  const filteredData = useMemo(() => {
    return data.filter(entry => {
      const matchCustomer = !filterCustomer || 
        (entry.customer_name || entry.customer || '').toLowerCase().includes(filterCustomer.toLowerCase());
      const matchInvoice = !filterInvoice || 
        (entry.voucher_no || '').toLowerCase().includes(filterInvoice.toLowerCase());
      return matchCustomer && matchInvoice;
    });
  }, [data, filterCustomer, filterInvoice]);

  const totalOutstanding = filteredData.reduce((sum, entry) => sum + (entry.outstanding_amount || 0), 0);

  if (loading) return <LoadingSpinner message="Memuat data piutang usaha..." />;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Piutang Usaha</h1>
          <p className="text-sm text-gray-500">Daftar piutang usaha (Accounts Receivable)</p>
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 print:hidden">
        <input
          type="text"
          placeholder="Filter Pelanggan..."
          value={filterCustomer}
          onChange={(e) => setFilterCustomer(e.target.value)}
          className="border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:ring-indigo-500 focus:border-indigo-500"
        />
        <input
          type="text"
          placeholder="Filter No. Faktur..."
          value={filterInvoice}
          onChange={(e) => setFilterInvoice(e.target.value)}
          className="border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-600 font-medium">Jumlah Piutang</p>
          <p className="text-2xl font-bold text-blue-900">{filteredData.length}</p>
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
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Overdue (Hari)</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredData.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Tidak ada data piutang</td></tr>
            ) : (
              filteredData.map((entry, i) => {
                const overdue = calcOverdueDays(entry.due_date);
                return (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-indigo-600">{entry.voucher_no}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{entry.customer_name || entry.customer}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{entry.posting_date}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{entry.due_date || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">Rp {(entry.invoice_grand_total || 0).toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3 text-sm font-medium text-red-600 text-right">Rp {(entry.outstanding_amount || 0).toLocaleString('id-ID')}</td>
                    <td className={`px-4 py-3 text-sm text-right font-medium ${overdue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {overdue > 0 ? `${overdue} hari` : '-'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
