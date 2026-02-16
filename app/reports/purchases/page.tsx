'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import LoadingSpinner from '../../components/LoadingSpinner';
import Pagination from '../../components/Pagination';
import BrowserStyleDatePicker from '../../../components/BrowserStyleDatePicker';

interface PurchaseEntry {
  name: string;
  supplier: string;
  supplier_name?: string;
  transaction_date: string;
  grand_total: number;
  status: string;
}

const STATUS_OPTIONS = [
  { value: '', label: 'Semua Status' },
  { value: 'Draft', label: 'Draft' },
  { value: 'To Receive and Bill', label: 'To Receive and Bill' },
  { value: 'To Bill', label: 'To Bill' },
  { value: 'To Receive', label: 'To Receive' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Cancelled', label: 'Cancelled' },
];

export default function PurchaseReportPage() {
  const [data, setData] = useState<PurchaseEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  // Helper to convert YYYY-MM-DD to DD/MM/YYYY
  const formatToDDMMYYYY = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  // Helper to convert DD/MM/YYYY to YYYY-MM-DD
  const formatToYYYYMMDD = (dateStr: string) => {
    if (!dateStr) return '';
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    const saved = localStorage.getItem('selected_company');
    if (saved) setSelectedCompany(saved);
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    // Set default dates in DD/MM/YYYY format
    setFromDate(formatToDDMMYYYY(firstDay.toISOString().split('T')[0]));
    setToDate(formatToDDMMYYYY(today.toISOString().split('T')[0]));
  }, []);

  const fetchData = useCallback(async () => {
    if (!selectedCompany) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ company: selectedCompany });
      // Convert DD/MM/YYYY to YYYY-MM-DD for API
      if (fromDate) params.set('from_date', formatToYYYYMMDD(fromDate));
      if (toDate) params.set('to_date', formatToYYYYMMDD(toDate));

      const response = await fetch(`/api/finance/reports/purchases?${params}`, { credentials: 'include' });
      const result = await response.json();
      if (result.success) {
        setData(result.data || []);
      } else {
        setError(result.message || 'Gagal memuat laporan pembelian');
      }
    } catch (err) {
      console.error('Error fetching purchase report:', err);
      setError('Gagal memuat laporan pembelian');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, fromDate, toDate]);

  useEffect(() => {
    if (selectedCompany) fetchData();
  }, [selectedCompany, fetchData]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  // Frontend filtering
  const filteredData = useMemo(() => {
    return data.filter(entry => {
      const matchSearch = !searchTerm ||
        (entry.supplier_name || entry.supplier || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (entry.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = !filterStatus || entry.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [data, searchTerm, filterStatus]);

  // Pagination
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredData.slice(start, start + PAGE_SIZE);
  }, [filteredData, currentPage]);

  // Memoized handlers
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setFilterStatus('');
    setCurrentPage(1);
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    // Set default dates in DD/MM/YYYY format
    setFromDate(formatToDDMMYYYY(firstDay.toISOString().split('T')[0]));
    setToDate(formatToDDMMYYYY(today.toISOString().split('T')[0]));
  }, []);

  const totalPurchases = filteredData.reduce((sum, e) => sum + (e.grand_total || 0), 0);

  if (loading) return <LoadingSpinner message="Memuat laporan pembelian..." />;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Laporan Pembelian</h1>
        <p className="text-sm text-gray-500">Ringkasan pesanan pembelian</p>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Date From */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dari Tanggal</label>
            <BrowserStyleDatePicker
              value={fromDate}
              onChange={(value: string) => setFromDate(value)}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="DD/MM/YYYY"
            />
          </div>
          
          {/* Date To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sampai Tanggal</label>
            <BrowserStyleDatePicker
              value={toDate}
              onChange={(value: string) => setToDate(value)}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="DD/MM/YYYY"
            />
          </div>
          
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cari</label>
            <input 
              type="text" 
              placeholder="No. PO atau Pemasok..." 
              value={searchTerm} 
              onChange={handleSearchChange} 
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" 
            />
          </div>
          
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)} 
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-end space-x-2">
            <button 
              onClick={handleClearFilters}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors text-sm"
            >
              Hapus Filter
            </button>
            <button 
              onClick={fetchData}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors text-sm"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-600 font-medium">Total PO</p>
          <p className="text-2xl font-bold text-blue-900">{filteredData.length}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-600 font-medium">Total Pembelian</p>
          <p className="text-xl font-bold text-green-900">Rp {totalPurchases.toLocaleString('id-ID')}</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <p className="text-sm text-purple-600 font-medium">Rata-rata PO</p>
          <p className="text-xl font-bold text-purple-900">
            Rp {filteredData.length > 0 ? (totalPurchases / filteredData.length).toLocaleString('id-ID', { maximumFractionDigits: 0 }) : 0}
          </p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <p className="text-sm text-orange-600 font-medium">Halaman</p>
          <p className="text-xl font-bold text-orange-900">{currentPage} / {Math.ceil(filteredData.length / PAGE_SIZE) || 1}</p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-sm font-medium text-gray-900">
            Data Pembelian 
            <span className="ml-2 px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full">{filteredData.length} entri</span>
          </h3>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">No. PO</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pemasok</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedData.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Tidak ada data pembelian</td></tr>
            ) : (
              paginatedData.map((entry) => (
                <tr key={entry.name} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-indigo-600">{entry.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{entry.supplier_name || entry.supplier}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{entry.transaction_date}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">Rp {(entry.grand_total || 0).toLocaleString('id-ID')}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      entry.status === 'Completed' ? 'bg-green-100 text-green-800' :
                      entry.status === 'To Receive and Bill' ? 'bg-yellow-100 text-yellow-800' :
                      entry.status === 'To Bill' ? 'bg-blue-100 text-blue-800' :
                      entry.status === 'To Receive' ? 'bg-purple-100 text-purple-800' :
                      entry.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>{entry.status}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        
        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil(filteredData.length / PAGE_SIZE)}
          totalRecords={filteredData.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}
