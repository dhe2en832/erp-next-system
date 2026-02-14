'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Pagination from '../../components/Pagination';

interface StockReconciliation {
  name: string;
  posting_date: string;
  posting_time: string;
  company: string;
  warehouse: string;
  purpose: string;
  total_difference: number;
  total_qty: number;
  status: string;
}

interface Warehouse {
  name: string;
  warehouse_name: string;
}

export default function StockReconciliationList() {
  const router = useRouter();
  const [reconciliations, setReconciliations] = useState<StockReconciliation[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState({ from_date: '', to_date: '' });
  const [selectedCompany, setSelectedCompany] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  useEffect(() => {
    const savedCompany = localStorage.getItem('selected_company');
    if (savedCompany) {
      setSelectedCompany(savedCompany);
    } else {
      router.push('/select-company');
    }
  }, [router]);

  const fetchReconciliations = useCallback(async () => {
    if (!selectedCompany) return;
    try {
      setLoading(true);
      const params = new URLSearchParams({
        company: selectedCompany,
        ...(searchTerm && { search: searchTerm }),
        ...(warehouseFilter && { warehouse: warehouseFilter }),
        ...(statusFilter && { status: statusFilter }),
        ...(dateFilter.from_date && { from_date: dateFilter.from_date }),
        ...(dateFilter.to_date && { to_date: dateFilter.to_date })
      });
      const response = await fetch(`/api/inventory/reconciliation?${params}`);
      const data = await response.json();
      if (data.success) {
        setReconciliations(data.data || []);
      } else {
        setError(data.message || 'Gagal memuat rekonsiliasi stok');
      }
    } catch {
      setError('Terjadi kesalahan saat memuat rekonsiliasi stok');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, searchTerm, warehouseFilter, statusFilter, dateFilter]);

  const fetchWarehouses = useCallback(async () => {
    if (!selectedCompany) return;
    try {
      const response = await fetch(`/api/inventory/warehouses?company=${selectedCompany}`);
      const data = await response.json();
      if (data.success) setWarehouses(data.data || []);
    } catch (err) {
      console.error('Gagal memuat gudang:', err);
    }
  }, [selectedCompany]);

  useEffect(() => {
    if (selectedCompany) { fetchReconciliations(); fetchWarehouses(); }
  }, [selectedCompany, fetchReconciliations, fetchWarehouses]);

  const paginatedReconciliations = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return reconciliations.slice(start, start + PAGE_SIZE);
  }, [reconciliations, currentPage]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat Rekonsiliasi Stok...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Rekonsiliasi Stok</h1>
              <p className="mt-1 text-sm text-gray-600">Sesuaikan dan rekonsiliasi kuantitas stok</p>
            </div>
            <button onClick={() => router.push('/stock-reconciliation/srMain')} className="w-full sm:w-auto bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center justify-center min-h-[44px]">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Rekonsiliasi Baru
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="bg-white shadow rounded-lg p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cari</label>
              <input type="text" className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Cari rekonsiliasi..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gudang</label>
              <select className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)}>
                <option value="">Semua Gudang</option>
                {warehouses.map((wh) => (<option key={wh.name} value={wh.name}>{wh.warehouse_name}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">Semua Status</option>
                <option value="Draft">Draft</option>
                <option value="Submitted">Diajukan</option>
                <option value="Cancelled">Dibatalkan</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dari Tanggal</label>
              <input type="date" className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" value={dateFilter.from_date} onChange={(e) => setDateFilter(prev => ({ ...prev, from_date: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sampai Tanggal</label>
              <input type="date" className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" value={dateFilter.to_date} onChange={(e) => setDateFilter(prev => ({ ...prev, to_date: e.target.value }))} />
            </div>
          </div>
          <div className="mt-4 flex justify-end space-x-2">
            <button onClick={() => { setSearchTerm(''); setWarehouseFilter(''); setStatusFilter(''); setDateFilter({ from_date: '', to_date: '' }); }} className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400">Hapus Filter</button>
            <button onClick={fetchReconciliations} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">Terapkan Filter</button>
          </div>
        </div>
      </div>

      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>
        </div>
      )}

      {/* List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-900">Rekonsiliasi Stok ({reconciliations.length} entri){reconciliations.length > PAGE_SIZE && ` — Hal. ${currentPage}`}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No. Entri</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal & Waktu</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tujuan</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedReconciliations.map((rec) => (
                  <tr key={rec.name} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/stock-reconciliation/srMain?name=${rec.name}`)}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">{rec.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{rec.posting_date} {rec.posting_time}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{rec.purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {reconciliations.length === 0 && (
            <div className="text-center py-12"><p className="text-gray-500">Tidak ada rekonsiliasi stok ditemukan</p></div>
          )}
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(reconciliations.length / PAGE_SIZE)}
            totalRecords={reconciliations.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>
    </div>
  );
}
