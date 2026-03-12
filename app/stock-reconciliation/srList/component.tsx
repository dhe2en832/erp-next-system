'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Pagination from '../../components/Pagination';
import LoadingSpinner from '../../components/LoadingSpinner';
import BrowserStyleDatePicker from '@/components/BrowserStyleDatePicker';
import { Send, Search, Trash2, Filter, X } from 'lucide-react';
import { formatDate, parseDate } from '@/utils/format';

interface StockReconciliation {
  name: string;
  posting_date: string;
  posting_time: string;
  company: string;
  warehouse: string;
  purpose: string;
  docstatus: number;
}

interface Warehouse {
  name: string;
  warehouse_name: string;
}

// Status mapping
const STATUS_LABELS: Record<number, string> = {
  0: 'Draft',
  1: 'Diajukan',
  2: 'Dibatalkan',
};

const STATUS_COLORS: Record<number, string> = {
  0: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  1: 'bg-green-100 text-green-800 border-green-200',
  2: 'bg-gray-100 text-gray-800 border-gray-200',
};

const getStatusLabel = (docstatus: number): string => STATUS_LABELS[docstatus] || 'Unknown';
const getStatusBadgeClass = (docstatus: number): string => STATUS_COLORS[docstatus] || 'bg-gray-100 text-gray-800 border-gray-200';

export default function StockReconciliationList() {
  const router = useRouter();
  const [reconciliations, setReconciliations] = useState<StockReconciliation[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState({ 
    from_date: formatDate(new Date(Date.now() - 86400000)), 
    to_date: formatDate(new Date()) 
  });
  const [selectedCompany, setSelectedCompany] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [submittingDoc, setSubmittingDoc] = useState<string | null>(null);
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
      setError('');
      const params = new URLSearchParams({
        company: selectedCompany,
        ...(searchTerm && { search: searchTerm }),
        ...(warehouseFilter && { warehouse: warehouseFilter }),
        ...(statusFilter && { status: statusFilter }),
        ...(dateFilter.from_date && { from_date: parseDate(dateFilter.from_date) }),
        ...(dateFilter.to_date && { to_date: parseDate(dateFilter.to_date) }),
        order_by: 'creation desc, posting_date desc, posting_time desc'
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
    if (selectedCompany) { 
      fetchReconciliations(); 
      fetchWarehouses(); 
    }
  }, [selectedCompany, fetchReconciliations, fetchWarehouses]);

  const handleSubmit = async (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm(`Apakah Anda yakin ingin mengajukan rekonsiliasi ${name}?`)) {
      return;
    }

    try {
      setSubmittingDoc(name);
      setError('');
      const response = await fetch(`/api/inventory/reconciliation/${name}/submit`, {
        method: 'POST',
      });
      const data = await response.json();
      
      if (data.success) {
        setSuccessMessage(`Rekonsiliasi ${name} berhasil diajukan!`);
        setTimeout(() => setSuccessMessage(''), 3000);
        fetchReconciliations();
      } else {
        setError(data.message || 'Gagal mengajukan rekonsiliasi');
      }
    } catch {
      setError('Terjadi kesalahan saat mengajukan rekonsiliasi');
    } finally {
      setSubmittingDoc(null);
    }
  };

  const paginatedReconciliations = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return reconciliations.slice(start, start + PAGE_SIZE);
  }, [reconciliations, currentPage]);

  if (loading) {
    return <LoadingSpinner message="Memuat Rekonsiliasi Stok..." />;
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
            <button 
              onClick={() => router.push('/stock-reconciliation/srMain')} 
              className="w-full sm:w-auto bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center justify-center min-h-[44px]"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
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
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 pl-9 pr-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" 
                  placeholder="Cari rekonsiliasi..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gudang</label>
              <select 
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" 
                value={warehouseFilter} 
                onChange={(e) => setWarehouseFilter(e.target.value)}
              >
                <option value="">Semua Gudang</option>
                {warehouses.map((wh) => (
                  <option key={wh.name} value={wh.name}>{wh.warehouse_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select 
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Semua Status</option>
                <option value="Draft">Draft</option>
                <option value="Submitted">Diajukan</option>
                <option value="Cancelled">Dibatalkan</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dari Tanggal</label>
              <BrowserStyleDatePicker
                value={dateFilter.from_date}
                onChange={(value: string) => setDateFilter(prev => ({ ...prev, from_date: value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="DD/MM/YYYY"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sampai Tanggal</label>
              <BrowserStyleDatePicker
                value={dateFilter.to_date}
                onChange={(value: string) => setDateFilter(prev => ({ ...prev, to_date: value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="DD/MM/YYYY"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end space-x-2">
            <button 
              onClick={() => { 
                setSearchTerm(''); 
                setWarehouseFilter(''); 
                setStatusFilter(''); 
                setDateFilter({ 
                  from_date: formatDate(new Date(Date.now() - 86400000)), 
                  to_date: formatDate(new Date()) 
                }); 
              }} 
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors flex items-center"
            >
              <X className="w-4 h-4 mr-1" />
              Hapus Filter
            </button>
            <button 
              onClick={fetchReconciliations} 
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors flex items-center"
            >
              <Filter className="w-4 h-4 mr-1" />
              Terapkan Filter
            </button>
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            {successMessage}
          </div>
        </div>
      )}

      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>
        </div>
      )}

      {/* List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 mb-6">
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-900">
              Rekonsiliasi Stok ({reconciliations.length} entri)
              {reconciliations.length > PAGE_SIZE && ` — Hal. ${currentPage}`}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No. Entri</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal & Waktu</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gudang</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tujuan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedReconciliations.map((rec) => (
                  <tr 
                    key={rec.name} 
                    className="hover:bg-gray-50 cursor-pointer" 
                    onClick={() => router.push(`/stock-reconciliation/srMain?name=${rec.name}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">
                      {rec.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {rec.posting_date} {rec.posting_time}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {rec.warehouse}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {rec.purpose}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeClass(rec.docstatus)}`}>
                        {getStatusLabel(rec.docstatus)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {rec.docstatus === 0 && (
                        <button
                          onClick={(e) => handleSubmit(rec.name, e)}
                          disabled={submittingDoc === rec.name}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {submittingDoc === rec.name ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Mengajukan...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-1" />
                              Ajukan
                            </>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {reconciliations.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">Tidak ada rekonsiliasi stok ditemukan</p>
            </div>
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
