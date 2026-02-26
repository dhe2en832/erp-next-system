'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoadingSpinner from '../../components/LoadingSpinner';
import Pagination from '../../components/Pagination';
import PrintPreviewModal from '../../../components/PrintPreviewModal';
import BrowserStyleDatePicker from '../../../components/BrowserStyleDatePicker';

export const dynamic = 'force-dynamic';

interface StockEntry {
  item_code: string;
  item_name?: string;
  warehouse: string;
  actual_qty: number;
  stock_value?: number;
  stock_uom?: string;
}

interface Warehouse {
  name: string;
  warehouse_name: string;
}

// Hook: Deteksi mobile (breakpoint 768px)
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < breakpoint);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [breakpoint]);

  return isMobile;
}

export default function StockBalancePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile(768);
  const pageSize = isMobile ? 10 : 20;
  const [data, setData] = useState<StockEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [dateFilter, setDateFilter] = useState(() => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const formatDateToDDMMYYYY = (date: Date) => {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };
    
    return {
      from_date: formatDateToDDMMYYYY(yesterday),
      to_date: formatDateToDDMMYYYY(today)
    };
  });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // ✅ FIX: Track pagination change source to prevent race conditions
  const pageChangeSourceRef = useRef<'pagination' | 'filter' | 'init'>('init');

  useEffect(() => {
    const saved = localStorage.getItem('selected_company');
    if (saved) setSelectedCompany(saved);
  }, []);

  // Sync URL dengan page state
  useEffect(() => {
    const pageFromUrl = searchParams.get('page');
    if (pageFromUrl && !isNaN(parseInt(pageFromUrl))) {
      const pageNum = parseInt(pageFromUrl);
      if (pageNum >= 1) setCurrentPage(pageNum);
    }
  }, [searchParams]);

  const fetchData = useCallback(async () => {
    if (!selectedCompany) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ company: selectedCompany });
      const response = await fetch(`/api/inventory/reports/stock-balance?${params}`, { credentials: 'include' });
      const result = await response.json();
      if (result.success) {
        setData(result.data || []);
      } else {
        setError(result.message || 'Gagal memuat data stok per gudang');
      }
    } catch (err) {
      console.error('Error fetching stock balance:', err);
      setError('Gagal memuat data stok per gudang');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany]);

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
      fetchData();
      fetchWarehouses();
    }
  }, [selectedCompany, fetchData, fetchWarehouses]);

  // Reset page when filters change
  useEffect(() => {
    pageChangeSourceRef.current = 'filter';
    setCurrentPage(1);
  }, [searchTerm, warehouseFilter]);

  // Frontend filtering
  const filteredData = useMemo(() => {
    let filtered = data;
    
    // Apply warehouse filter
    if (warehouseFilter.trim()) {
      filtered = filtered.filter(entry => entry.warehouse === warehouseFilter.trim());
    }
    
    // Apply search filter (item_code or item_name)
    if (searchTerm.trim()) {
      const search = searchTerm.trim().toLowerCase();
      filtered = filtered.filter(entry => 
        entry.item_code?.toLowerCase().includes(search) ||
        entry.item_name?.toLowerCase().includes(search)
      );
    }
    
    return filtered;
  }, [data, warehouseFilter, searchTerm]);

  // Pagination
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const paginated = filteredData.slice(start, start + pageSize);
    setTotalRecords(filteredData.length);
    setTotalPages(Math.ceil(filteredData.length / pageSize));
    return paginated;
  }, [filteredData, currentPage, pageSize]);

  const totalQty = filteredData.reduce((sum, e) => sum + (e.actual_qty || 0), 0);
  const totalValue = filteredData.reduce((sum, e) => sum + (e.stock_value || 0), 0);

  const printParams = new URLSearchParams({ company: selectedCompany });
  const printUrl = `/reports/stock-balance/print?${printParams.toString()}`;

  // Memoized handlers to prevent input losing focus
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleWarehouseChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setWarehouseFilter(e.target.value);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    pageChangeSourceRef.current = 'pagination';
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleRefresh = () => {
    fetchData();
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setWarehouseFilter('');
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const formatDateToDDMMYYYY = (date: Date) => {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };
    
    setDateFilter({
      from_date: formatDateToDDMMYYYY(yesterday),
      to_date: formatDateToDDMMYYYY(today)
    });
    setCurrentPage(1);
  };

  if (loading) return <LoadingSpinner message="Memuat data stok per gudang..." />;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stok per Gudang</h1>
          <p className="text-sm text-gray-500">Ringkasan saldo stok per gudang</p>
        </div>
        <button
          onClick={() => setShowPrintPreview(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm flex items-center gap-2"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
          Cetak Laporan
        </button>
      </div>

      {showPrintPreview && (
        <PrintPreviewModal
          title={`Stok per Gudang — ${selectedCompany}`}
          onClose={() => setShowPrintPreview(false)}
          paperMode="sheet"
          printUrl={printUrl}
          useContentFrame={false}
        >
          <iframe
            src={printUrl}
            title="Pratinjau Stok per Gudang"
            style={{ width: '210mm', height: '297mm', border: 0, background: '#fff', boxShadow: '0 8px 40px rgba(0,0,0,0.45)' }}
          />
        </PrintPreviewModal>
      )}

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search Item */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cari Barang</label>
            <input
              type="text"
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Kode atau nama barang..."
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
          
          {/* Warehouse Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gudang</label>
            <select
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={warehouseFilter}
              onChange={handleWarehouseChange}
            >
              <option value="">Semua Gudang</option>
              {warehouses.map((wh) => (
                <option key={wh.name} value={wh.name}>{wh.warehouse_name}</option>
              ))}
            </select>
          </div>
          
          {/* Date Filters */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dari Tanggal</label>
            <BrowserStyleDatePicker
              value={dateFilter.from_date}
              onChange={(value: string) => setDateFilter(prev => ({ ...prev, from_date: value }))}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="DD/MM/YYYY"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sampai Tanggal</label>
            <BrowserStyleDatePicker
              value={dateFilter.to_date}
              onChange={(value: string) => setDateFilter(prev => ({ ...prev, to_date: value }))}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="DD/MM/YYYY"
            />
          </div>
        </div>
        
        <div className="mt-4 flex justify-end space-x-2">
          <button 
            onClick={handleClearFilters}
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
          >
            Hapus Filter
          </button>
          <button 
            onClick={handleRefresh}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
          >
            Refresh Data
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-600 font-medium">Total Item (Tampil)</p>
          <p className="text-2xl font-bold text-blue-900">{filteredData.length}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-600 font-medium">Total Qty</p>
          <p className="text-2xl font-bold text-green-900">{totalQty.toLocaleString('id-ID')}</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <p className="text-sm text-purple-600 font-medium">Total Nilai Stok</p>
          <p className="text-2xl font-bold text-purple-900">Rp {totalValue.toLocaleString('id-ID')}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-sm font-medium text-gray-900">
            Data Stok 
            <span className="ml-2 px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full">{totalRecords} entri</span>
          </h3>
        </div>
        
        {/* Desktop Table */}
        {!isMobile ? (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kode Barang</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama Barang</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gudang</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">UoM</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Nilai Stok</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      Tidak ada data stok yang sesuai dengan filter
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((entry, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-indigo-600">{entry.item_code}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{entry.item_name || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{entry.warehouse}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">{entry.actual_qty.toLocaleString('id-ID')}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{entry.stock_uom || 'Nos'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">Rp {(entry.stock_value || 0).toLocaleString('id-ID')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </>
        ) : (
          /* Mobile Cards */
          <div className="divide-y divide-gray-200">
            {paginatedData.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">Tidak ada data stok yang sesuai dengan filter</div>
            ) : (
              paginatedData.map((entry, i) => (
                <div key={i} className="px-4 py-4 hover:bg-gray-50">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-indigo-600 truncate">{entry.item_code}</p>
                        <p className="text-sm text-gray-900 mt-1">{entry.item_name || '-'}</p>
                        <p className="text-xs text-gray-500 mt-1">📦 {entry.warehouse}</p>
                      </div>
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                        {entry.stock_uom || 'Nos'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Qty</p>
                        <p className="text-sm font-semibold text-gray-900">{entry.actual_qty.toLocaleString('id-ID')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Nilai Stok</p>
                        <p className="text-sm font-semibold text-gray-900">Rp {(entry.stock_value || 0).toLocaleString('id-ID')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalRecords={totalRecords}
          pageSize={pageSize}
          onPageChange={handlePageChange}
        />
      </div>
    </div>
  );
}
