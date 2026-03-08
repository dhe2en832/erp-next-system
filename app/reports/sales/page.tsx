'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoadingSpinner from '../../components/LoadingSpinner';
import Pagination from '../../components/Pagination';
import PrintPreviewModal from '../../../components/PrintPreviewModal';
import BrowserStyleDatePicker from '../../../components/BrowserStyleDatePicker';
import SalesPersonDialog from '../../components/SalesPersonDialog';
import { User, Users } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface SalesEntry {
  name: string;
  customer: string;
  customer_name?: string;
  transaction_date: string;
  grand_total: number;
  status: string;
  per_delivered?: number;
  per_billed?: number;
  sales_person?: string;
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

export default function SalesReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile(768);
  const pageSize = isMobile ? 10 : 20;

  const [data, setData] = useState<SalesEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSalesPerson, setFilterSalesPerson] = useState('');
  const [showSalesPersonDialog, setShowSalesPersonDialog] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // ✅ FIX: Track pagination change source to prevent race conditions
  const pageChangeSourceRef = useRef<'pagination' | 'filter' | 'init'>('init');

  // Helper to format date to DD/MM/YYYY
  const formatToDDMMYYYY = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  // Helper to format Date object to DD/MM/YYYY
  const formatDateToDDMMYYYY = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
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
    
    // Always use current date, not cached values
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Set default dates in DD/MM/YYYY format using direct Date formatting
    setFromDate(formatDateToDDMMYYYY(firstDay));
    setToDate(formatDateToDDMMYYYY(today));
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
      // Convert DD/MM/YYYY to YYYY-MM-DD for API
      if (fromDate) params.set('from_date', formatToYYYYMMDD(fromDate));
      if (toDate) params.set('to_date', formatToYYYYMMDD(toDate));

      const response = await fetch(`/api/finance/reports/sales?${params}`, { credentials: 'include' });
      const result = await response.json();
      if (result.success) {
        let allData = result.data || [];
        
        // Apply frontend filters
        if (filterCustomer) {
          allData = allData.filter((entry: SalesEntry) =>
            (entry.customer_name || entry.customer || '').toLowerCase().includes(filterCustomer.toLowerCase()) ||
            (entry.name || '').toLowerCase().includes(filterCustomer.toLowerCase())
          );
        }
        if (filterStatus) {
          allData = allData.filter((entry: SalesEntry) => entry.status === filterStatus);
        }
        if (filterSalesPerson) {
          allData = allData.filter((entry: SalesEntry) =>
            (entry.sales_person || '').toLowerCase().includes(filterSalesPerson.toLowerCase())
          );
        }
        
        setTotalRecords(allData.length);
        setTotalPages(Math.ceil(allData.length / pageSize));
        
        // Store all data for pagination
        (window as any).__salesAllData = allData;
        
        // Frontend pagination
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedData = allData.slice(startIndex, endIndex);
        
        setData(paginatedData);
      } else {
        setError(result.message || 'Gagal memuat laporan penjualan');
      }
    } catch {
      setError('Gagal memuat laporan penjualan');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, fromDate, toDate, filterCustomer, filterStatus, filterSalesPerson, currentPage, pageSize]);

  // Reset page when filters change
  useEffect(() => {
    pageChangeSourceRef.current = 'filter';
    setCurrentPage(1);
  }, [filterCustomer, filterStatus, filterSalesPerson, fromDate, toDate]);

  // Fetch when page changes (separated from filter logic)
  useEffect(() => {
    if (selectedCompany) {
      // For page changes (not filter changes), use cached data if available
      if (pageChangeSourceRef.current === 'pagination' && (window as any).__salesAllData) {
        const allData = (window as any).__salesAllData;
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedData = allData.slice(startIndex, endIndex);
        setData(paginatedData);
      } else {
        fetchData();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // Trigger fetch when filters change (after page reset)
  useEffect(() => {
    if (pageChangeSourceRef.current === 'filter' && selectedCompany) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCustomer, filterStatus, filterSalesPerson, fromDate, toDate]);

  // Memoized handlers
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterCustomer(e.target.value);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilterCustomer('');
    setFilterStatus('');
    setFilterSalesPerson('');
    setCurrentPage(1);
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    // Set default dates in DD/MM/YYYY format
    setFromDate(formatToDDMMYYYY(firstDay.toISOString().split('T')[0]));
    setToDate(formatToDDMMYYYY(today.toISOString().split('T')[0]));
  }, []);

  const handlePageChange = useCallback((page: number) => {
    pageChangeSourceRef.current = 'pagination';
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSalesPersonSelect = useCallback((salesPerson: { name: string; full_name: string }) => {
    setFilterSalesPerson(salesPerson.full_name);
  }, []);

  const totalSales = useMemo(() => {
    if (typeof window === 'undefined') return 0;
    const allData = typeof window !== 'undefined' ? (window as any).__salesAllData || data : data;
    return allData.reduce((sum: number, e: SalesEntry) => sum + (e.grand_total || 0), 0);
  }, [data]);

  const avgSales = useMemo(() => {
    return totalRecords > 0 ? totalSales / totalRecords : 0;
  }, [totalSales, totalRecords]);

  const printParams = new URLSearchParams({ company: selectedCompany });
  if (fromDate) printParams.set('from_date', formatToYYYYMMDD(fromDate));
  if (toDate) printParams.set('to_date', formatToYYYYMMDD(toDate));
  const printUrl = `/reports/sales/print?${printParams.toString()}`;

  if (loading && data.length === 0) return <LoadingSpinner message="Memuat laporan penjualan..." />;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan Penjualan</h1>
          <p className="text-sm text-gray-500">Ringkasan pesanan penjualan dengan progres pengiriman & penagihan</p>
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
          title={`Laporan Penjualan — ${selectedCompany}`}
          onClose={() => setShowPrintPreview(false)}
          printUrl=""
          useContentFrame={true}
          allowPaperSettings={true}
        >
          <div className="p-8 bg-white">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold">{selectedCompany}</h2>
              <h3 className="text-lg font-semibold mt-2">Laporan Penjualan</h3>
              <p className="text-sm text-gray-600 mt-1">
                Periode: {fromDate} s/d {toDate}
              </p>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-2 px-2">No. SO</th>
                  <th className="text-left py-2 px-2">Pelanggan</th>
                  <th className="text-left py-2 px-2">Tanggal</th>
                  <th className="text-right py-2 px-2">Total</th>
                  <th className="text-left py-2 px-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.map((entry) => (
                  <tr key={entry.name} className="border-b border-gray-200">
                    <td className="py-2 px-2 font-medium">{entry.name}</td>
                    <td className="py-2 px-2">{entry.customer_name || entry.customer}</td>
                    <td className="py-2 px-2">{entry.transaction_date}</td>
                    <td className="py-2 px-2 text-right">Rp {(entry.grand_total || 0).toLocaleString('id-ID')}</td>
                    <td className="py-2 px-2">{entry.status}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300 font-bold">
                  <td colSpan={3} className="py-2 px-2 text-right">TOTAL:</td>
                  <td className="py-2 px-2 text-right">Rp {totalSales.toLocaleString('id-ID')}</td>
                  <td className="py-2 px-2"></td>
                </tr>
              </tfoot>
            </table>

            <div className="mt-6 text-xs text-gray-500 text-center">
              Dicetak pada: {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </PrintPreviewModal>
      )}

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4 mb-6 print:hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dari Tanggal</label>
            <BrowserStyleDatePicker
              value={fromDate}
              onChange={(value: string) => setFromDate(value)}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="DD/MM/YYYY"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sampai Tanggal</label>
            <BrowserStyleDatePicker
              value={toDate}
              onChange={(value: string) => setToDate(value)}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="DD/MM/YYYY"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cari</label>
            <input 
              type="text" 
              placeholder="No. SO atau Pelanggan..." 
              value={filterCustomer} 
              onChange={handleSearchChange} 
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" 
            />
          </div>
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sales Person</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
              <input 
                type="text" 
                placeholder="Nama sales person..." 
                value={filterSalesPerson} 
                onChange={(e) => setFilterSalesPerson(e.target.value)} 
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 pl-9 pr-10 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" 
              />
              <button
                type="button"
                onClick={() => setShowSalesPersonDialog(true)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors"
                title="Pilih dari daftar"
              >
                <Users className="w-4 h-4" />
              </button>
            </div>
          </div>
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
          <p className="text-sm text-blue-600 font-medium">Total SO</p>
          <p className="text-2xl font-bold text-blue-900">{totalRecords}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-600 font-medium">Total Penjualan</p>
          <p className="text-xl font-bold text-green-900">Rp {totalSales.toLocaleString('id-ID')}</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <p className="text-sm text-purple-600 font-medium">Rata-rata SO</p>
          <p className="text-xl font-bold text-purple-900">Rp {avgSales.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <p className="text-sm text-orange-600 font-medium">Halaman</p>
          <p className="text-xl font-bold text-orange-900">{currentPage} / {totalPages || 1}</p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-sm font-medium text-gray-900">
            Data Penjualan 
            <span className="ml-2 px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full">{totalRecords} entri</span>
          </h3>
        </div>

        {/* Desktop Table */}
        {!isMobile ? (
          <>
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
                {data.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Tidak ada data penjualan</td></tr>
                ) : (
                  data.map((entry) => (
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
          </>
        ) : (
          /* Mobile Cards */
          <div className="divide-y divide-gray-200">
            {data.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">Tidak ada data penjualan</div>
            ) : (
              data.map((entry) => (
                <div key={entry.name} className="px-4 py-4 hover:bg-gray-50">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-indigo-600 truncate">{entry.name}</p>
                        <p className="text-sm text-gray-900 mt-1">{entry.customer_name || entry.customer}</p>
                        <p className="text-xs text-gray-500 mt-1">{entry.transaction_date}</p>
                      </div>
                      <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        entry.status === 'Completed' ? 'bg-green-100 text-green-800' :
                        entry.status === 'To Deliver and Bill' ? 'bg-yellow-100 text-yellow-800' :
                        entry.status === 'To Bill' ? 'bg-blue-100 text-blue-800' :
                        entry.status === 'To Deliver' ? 'bg-purple-100 text-purple-800' :
                        entry.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>{entry.status}</span>
                    </div>
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-sm font-medium text-gray-900">Rp {(entry.grand_total || 0).toLocaleString('id-ID')}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Pengiriman</p>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${Math.min(entry.per_delivered || 0, 100)}%` }}></div>
                        </div>
                        <span className="text-xs text-gray-500">{(entry.per_delivered || 0).toFixed(0)}%</span>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Penagihan</p>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-green-500 h-2 rounded-full" style={{ width: `${Math.min(entry.per_billed || 0, 100)}%` }}></div>
                        </div>
                        <span className="text-xs text-gray-500">{(entry.per_billed || 0).toFixed(0)}%</span>
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

      {/* Sales Person Dialog */}
      <SalesPersonDialog
        isOpen={showSalesPersonDialog}
        onClose={() => setShowSalesPersonDialog(false)}
        onSelect={handleSalesPersonSelect}
      />
    </div>
  );
}
