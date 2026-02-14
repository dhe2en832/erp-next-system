'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import LoadingSpinner from '../../components/LoadingSpinner';

interface CashFlowEntry {
  account: string;
  posting_date: string;
  debit: number;
  credit: number;
  balance: number;
  voucher_type?: string;
  voucher_no?: string;
}

export default function CashFlowPage() {
  const [data, setData] = useState<CashFlowEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filterVoucherType, setFilterVoucherType] = useState('');
  const [filterAccount, setFilterAccount] = useState('');

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

      const response = await fetch(`/api/finance/reports/cash-flow?${params}`, { credentials: 'include' });
      const result = await response.json();
      if (result.success) {
        setData(result.data || []);
      } else {
        setError(result.message || 'Gagal memuat data alur kas');
      }
    } catch {
      setError('Gagal memuat data alur kas');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, fromDate, toDate]);

  useEffect(() => {
    if (selectedCompany) fetchData();
  }, [selectedCompany, fetchData]);

  const voucherTypes = useMemo(() => {
    const types = new Set(data.map(e => e.voucher_type).filter(Boolean));
    return Array.from(types).sort();
  }, [data]);

  const accountList = useMemo(() => {
    const accounts = new Set(data.map(e => e.account).filter(Boolean));
    return Array.from(accounts).sort();
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter(entry => {
      const matchType = !filterVoucherType || entry.voucher_type === filterVoucherType;
      const matchAccount = !filterAccount || entry.account === filterAccount;
      return matchType && matchAccount;
    });
  }, [data, filterVoucherType, filterAccount]);

  const totalDebit = filteredData.reduce((sum, e) => sum + (e.debit || 0), 0);
  const totalCredit = filteredData.reduce((sum, e) => sum + (e.credit || 0), 0);

  if (loading) return <LoadingSpinner message="Memuat data alur kas..." />;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alur Kas</h1>
          <p className="text-sm text-gray-500">Pergerakan kas masuk dan keluar</p>
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
          <label className="block text-xs font-medium text-gray-500 mb-1">Jenis Kas</label>
          <select value={filterVoucherType} onChange={(e) => setFilterVoucherType(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md text-sm">
            <option value="">Semua Jenis</option>
            {voucherTypes.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Akun</label>
          <select value={filterAccount} onChange={(e) => setFilterAccount(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md text-sm">
            <option value="">Semua Akun</option>
            {accountList.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button onClick={fetchData} className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700">Tampilkan</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-600 font-medium">Total Kas Masuk</p>
          <p className="text-2xl font-bold text-green-900">Rp {totalDebit.toLocaleString('id-ID')}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600 font-medium">Total Kas Keluar</p>
          <p className="text-2xl font-bold text-red-900">Rp {totalCredit.toLocaleString('id-ID')}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-600 font-medium">Saldo Bersih</p>
          <p className="text-2xl font-bold text-blue-900">Rp {(totalDebit - totalCredit).toLocaleString('id-ID')}</p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Akun</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jenis</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Voucher</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Debit</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Credit</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredData.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Tidak ada data alur kas</td></tr>
            ) : (
              filteredData.map((entry, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{entry.account}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{entry.posting_date}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{entry.voucher_type || '-'}</td>
                  <td className="px-4 py-3 text-sm text-indigo-600">{entry.voucher_no || '-'}</td>
                  <td className="px-4 py-3 text-sm text-green-600 text-right">{entry.debit ? `Rp ${entry.debit.toLocaleString('id-ID')}` : '-'}</td>
                  <td className="px-4 py-3 text-sm text-red-600 text-right">{entry.credit ? `Rp ${entry.credit.toLocaleString('id-ID')}` : '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
