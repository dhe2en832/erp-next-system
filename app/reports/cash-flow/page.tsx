'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoadingSpinner from '../../components/LoadingSpinner';
import PrintPreviewModal from '../../../components/PrintPreviewModal';

export const dynamic = 'force-dynamic';

// --- Types & Interfaces ---

interface CashFlowEntry {
  name: string;
  account: string;
  posting_date: string;
  debit: number;
  credit: number;
  balance: number;
  voucher_type?: string;
  voucher_no?: string;
  party?: string;
  remarks?: string;
}

interface FilterState {
  company: string;
  from_date: string;
  to_date: string;
  voucher_type: string;
  account: string;
}

// --- Helper Functions ---

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Konversi filter UI ke format JSON ERPNext [["field","operator","value"]]
const buildErpNextFilters = (filters: FilterState) => {
  const f: any[] = [];
  if (filters.company) f.push(['company', '=', filters.company]);
  if (filters.from_date) f.push(['posting_date', '>=', filters.from_date]);
  if (filters.to_date) f.push(['posting_date', '<=', filters.to_date]);
  if (filters.voucher_type) f.push(['voucher_type', '=', filters.voucher_type]);
  if (filters.account) f.push(['account', '=', filters.account]);
  return JSON.stringify(f);
};

// --- Components ---

// 1. Skeleton Loader Component
const SkeletonRow = () => (
  <div className="animate-pulse flex space-x-4 p-4 border-b border-gray-100">
    <div className="flex-1 space-y-2 py-1">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
    </div>
    <div className="space-y-2 py-1">
      <div className="h-4 bg-gray-200 rounded w-12"></div>
      <div className="h-4 bg-gray-200 rounded w-12"></div>
    </div>
  </div>
);

const SkeletonCard = () => (
  <div className="animate-pulse bg-white p-4 rounded-lg shadow border border-gray-100 space-y-3">
    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
    <div className="flex justify-between">
      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
    </div>
  </div>
);

export default function CashFlowPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // --- State Management ---
  const [data, setData] = useState<CashFlowEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [error, setError] = useState('');
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  
  // Device Detection
  const [isMobile, setIsMobile] = useState(false);
  
  // Filters State
  const [filters, setFilters] = useState<FilterState>({
    company: '',
    from_date: '',
    to_date: '',
    voucher_type: '',
    account: ''
  });

  // UI State
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);
  
  // ✅ FIX: Track pagination change source to prevent race conditions
  const pageChangeSourceRef = useRef<'pagination' | 'filter' | 'init'>('init');

  // --- Initialization & Effects ---

  // 1. Detect Screen Size for Hybrid Logic
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 2. Initialize Filters from LocalStorage/Defaults
  useEffect(() => {
    const savedCompany = localStorage.getItem('selected_company');
    const today = new Date().toISOString().split('T')[0];
    const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    setFilters(prev => ({
      ...prev,
      company: savedCompany || '',
      from_date: firstDay,
      to_date: today
    }));
  }, []);

  // Sync URL dengan page state
  useEffect(() => {
    const pageFromUrl = searchParams.get('page');
    if (pageFromUrl && !isNaN(parseInt(pageFromUrl))) {
      const pageNum = parseInt(pageFromUrl);
      if (pageNum >= 1) setPage(pageNum);
    }
  }, [searchParams]);

  // 3. Scroll Listener for Back to Top & Infinite Scroll
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // --- Data Fetching Logic ---

  const fetchData = useCallback(async (reset: boolean = false) => {
    if (!filters.company) {
      setError('Silakan pilih perusahaan terlebih dahulu');
      setLoading(false);
      return;
    }

    setLoading(reset); // Only show full spinner on reset
    if (!reset) setFetchingMore(true);
    setError('');

    try {
      const params = new URLSearchParams({
        company: filters.company,
      });
      
      if (filters.from_date) params.set('from_date', filters.from_date);
      if (filters.to_date) params.set('to_date', filters.to_date);

      const response = await fetch(`/api/finance/reports/cash-flow?${params}`, { credentials: 'include' });
      const result = await response.json();

      if (result.success) {
        let allData = result.data || [];
        
        // Apply frontend filters for voucher_type and account
        if (filters.voucher_type) {
          allData = allData.filter((entry: CashFlowEntry) => 
            entry.voucher_type === filters.voucher_type
          );
        }
        if (filters.account) {
          allData = allData.filter((entry: CashFlowEntry) => 
            entry.account?.toLowerCase().includes(filters.account.toLowerCase())
          );
        }
        
        setTotalItems(allData.length);
        
        // Frontend pagination
        const pageSize = isMobile ? 10 : 20;
        const currentPage = reset ? 1 : page;
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedData = allData.slice(startIndex, endIndex);
        
        setHasMore(endIndex < allData.length);

        if (reset) {
          setData(paginatedData);
          setPage(1);
          // Store all data for pagination
          (window as any).__cashFlowAllData = allData;
        } else {
          setData(prev => [...prev, ...paginatedData]);
          // Update stored data
          (window as any).__cashFlowAllData = allData;
        }
      } else {
        setError(result.message || 'Gagal memuat data');
        if (reset) setData([]);
      }
    } catch (err) {
      setError('Terjadi kesalahan koneksi');
      if (reset) setData([]);
    } finally {
      setLoading(false);
      setFetchingMore(false);
    }
  }, [filters, page, isMobile]);

  // Reset page when filters change
  useEffect(() => {
    pageChangeSourceRef.current = 'filter';
    setPage(1);
    if (isMobile) setData([]);
  }, [filters.company, filters.from_date, filters.to_date, filters.voucher_type, filters.account, isMobile]);

  // Fetch when page changes (separated from filter logic)
  useEffect(() => {
    if (filters.company) {
      // For page changes (not filter changes), use cached data if available
      if (pageChangeSourceRef.current === 'pagination' && (window as any).__cashFlowAllData) {
        const allData = (window as any).__cashFlowAllData;
        const pageSize = isMobile ? 10 : 20;
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedData = allData.slice(startIndex, endIndex);
        
        if (isMobile) {
          // Append for mobile infinite scroll
          setData(prev => [...prev, ...paginatedData]);
        } else {
          // Replace for desktop pagination
          setData(paginatedData);
        }
        setHasMore(endIndex < allData.length);
      } else {
        // Fetch fresh data
        const shouldReset = !isMobile || page === 1;
        fetchData(shouldReset);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, isMobile]);

  // Trigger fetch when filters change (after page reset)
  useEffect(() => {
    if (pageChangeSourceRef.current === 'filter' && filters.company) {
      const shouldReset = !isMobile || page === 1;
      fetchData(shouldReset);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.company, filters.from_date, filters.to_date, filters.voucher_type, filters.account]);

  // Infinite Scroll Observer (Mobile)
  useEffect(() => {
    if (!isMobile || !hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !fetchingMore) {
          fetchData(false);
        }
      },
      { threshold: 1.0 }
    );

    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [isMobile, hasMore, loading, fetchingMore, fetchData]);


  // --- Derived Data ---
  const totalDebit = useMemo(() => data.reduce((sum, e) => sum + (e.debit || 0), 0), [data]);
  const totalCredit = useMemo(() => data.reduce((sum, e) => sum + (e.credit || 0), 0), [data]);

  // --- Handlers ---
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleApplyFilter = () => {
    fetchData(true);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageChange = (newPage: number) => {
    pageChangeSourceRef.current = 'pagination';
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- Render Helpers ---
  
  const renderDesktopTable = () => (
    <div className="bg-white shadow rounded-lg overflow-hidden hidden md:block">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Voucher</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Akun</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Debit</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Kredit</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Saldo</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {loading ? (
            Array(5).fill(0).map((_, i) => (
              <tr key={i}><td colSpan={6}><SkeletonRow /></td></tr>
            ))
          ) : data.length === 0 ? (
            <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-500">Tidak ada data alur kas</td></tr>
          ) : (
            data.map((entry) => (
              <tr key={entry.name} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{entry.posting_date}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="text-gray-900 font-medium">{entry.voucher_type || '-'}</div>
                  <div className="text-gray-500 text-xs">{entry.voucher_no || '-'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{entry.account}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right font-medium">
                  {entry.debit ? formatCurrency(entry.debit) : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-right font-medium">
                  {entry.credit ? formatCurrency(entry.credit) : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-bold">
                  {formatCurrency(entry.balance)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      
      {/* Desktop Pagination */}
      {!loading && data.length > 0 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Menampilkan <span className="font-medium">{Math.min((page - 1) * 20 + 1, totalItems)}</span> sampai <span className="font-medium">{Math.min(page * 20, totalItems)}</span> dari <span className="font-medium">{totalItems}</span> hasil
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Sebelumnya
                </button>
                <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                  Halaman {page}
                </span>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={!hasMore}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Selanjutnya
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderMobileCards = () => (
    <div className="grid grid-cols-1 gap-4 md:hidden">
      {loading && data.length === 0 ? (
        Array(5).fill(0).map((_, i) => <SkeletonCard key={i} />)
      ) : data.length === 0 ? (
        <div className="text-center py-10 text-gray-500 bg-white rounded-lg shadow">Tidak ada data alur kas</div>
      ) : (
        data.map((entry) => (
          <div key={entry.name} className="bg-white p-4 rounded-lg shadow border border-gray-100">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded">{entry.posting_date}</span>
              <span className="text-xs font-bold text-gray-700">{entry.voucher_type || 'Umum'}</span>
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">{entry.account}</h3>
            <p className="text-xs text-gray-500 mb-3 truncate">{entry.voucher_no || '-'}</p>
            
            <div className="flex justify-between items-center pt-3 border-t border-gray-50">
              <div className="text-xs text-gray-500">
                <span className="block text-green-600 font-medium">{entry.debit ? formatCurrency(entry.debit) : '-'}</span>
                <span className="text-[10px]">Masuk</span>
              </div>
              <div className="text-xs text-gray-500 text-right">
                <span className="block text-red-600 font-medium">{entry.credit ? formatCurrency(entry.credit) : '-'}</span>
                <span className="text-[10px]">Keluar</span>
              </div>
              <div className="text-right">
                 <span className="block text-sm font-bold text-gray-800">{formatCurrency(entry.balance)}</span>
                 <span className="text-[10px] text-gray-400">Saldo</span>
              </div>
            </div>
          </div>
        ))
      )}
      
      {/* Mobile Infinite Scroll Loader */}
      {fetchingMore && (
        <div className="py-4 text-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p className="text-xs text-gray-500 mt-2">Memuat data...</p>
        </div>
      )}
      
      {/* Observer Target for Infinite Scroll */}
      <div ref={observerTarget} className="h-4" />
      
      {!hasMore && data.length > 0 && (
        <div className="text-center py-4 text-xs text-gray-400">Semua data telah dimuat</div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Alur Kas</h1>
              <p className="text-xs text-gray-500 mt-1">Laporan arus kas masuk dan keluar</p>
            </div>
            <button
              onClick={() => setShowPrintPreview(true)}
              className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
              title="Cetak Laporan"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r shadow-sm">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow border border-green-100 flex flex-col justify-between">
            <span className="text-xs font-medium text-green-600 uppercase tracking-wide">Total Masuk</span>
            <span className="text-lg font-bold text-gray-900 mt-1">{formatCurrency(totalDebit)}</span>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border border-red-100 flex flex-col justify-between">
            <span className="text-xs font-medium text-red-600 uppercase tracking-wide">Total Keluar</span>
            <span className="text-lg font-bold text-gray-900 mt-1">{formatCurrency(totalCredit)}</span>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border border-blue-100 flex flex-col justify-between">
            <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">Saldo Akhir</span>
            <span className="text-lg font-bold text-gray-900 mt-1">{formatCurrency(totalDebit - totalCredit)}</span>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Dari Tanggal</label>
              <input 
                type="date" 
                name="from_date"
                value={filters.from_date} 
                onChange={handleFilterChange} 
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500" 
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Sampai Tanggal</label>
              <input 
                type="date" 
                name="to_date"
                value={filters.to_date} 
                onChange={handleFilterChange} 
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500" 
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Jenis Voucher</label>
              <select 
                name="voucher_type"
                value={filters.voucher_type} 
                onChange={handleFilterChange} 
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Semua Jenis</option>
                <option value="Journal Entry">Journal Entry</option>
                <option value="Payment Entry">Payment Entry</option>
                <option value="Sales Invoice">Sales Invoice</option>
                <option value="Purchase Invoice">Purchase Invoice</option>
              </select>
            </div>
             <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Akun</label>
              <input 
                type="text" 
                name="account"
                placeholder="Cari akun..."
                value={filters.account} 
                onChange={handleFilterChange} 
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500" 
              />
            </div>
            <div className="flex items-end">
              <button 
                onClick={handleApplyFilter} 
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 shadow-sm transition-colors"
              >
                Terapkan Filter
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        {renderDesktopTable()}
        {renderMobileCards()}

      </div>

      {/* Print Preview Modal */}
      {showPrintPreview && (
        <PrintPreviewModal
          title={`Laporan Alur Kas — ${filters.company}`}
          onClose={() => setShowPrintPreview(false)}
          printUrl=""
          useContentFrame={true}
          allowPaperSettings={true}
        >
          <div className="p-8 bg-white">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold">{filters.company}</h2>
              <h3 className="text-lg font-semibold mt-2">Laporan Alur Kas</h3>
              <p className="text-sm text-gray-600 mt-1">
                Periode: {filters.from_date} s/d {filters.to_date}
              </p>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-2 px-2">Tanggal</th>
                  <th className="text-left py-2 px-2">Voucher</th>
                  <th className="text-left py-2 px-2">Akun</th>
                  <th className="text-right py-2 px-2">Debit</th>
                  <th className="text-right py-2 px-2">Kredit</th>
                  <th className="text-right py-2 px-2">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {data.map((entry) => (
                  <tr key={entry.name} className="border-b border-gray-200">
                    <td className="py-2 px-2">{entry.posting_date}</td>
                    <td className="py-2 px-2">
                      <div className="font-medium">{entry.voucher_type || '-'}</div>
                      <div className="text-xs text-gray-500">{entry.voucher_no || '-'}</div>
                    </td>
                    <td className="py-2 px-2">{entry.account}</td>
                    <td className="py-2 px-2 text-right">{entry.debit ? formatCurrency(entry.debit) : '-'}</td>
                    <td className="py-2 px-2 text-right">{entry.credit ? formatCurrency(entry.credit) : '-'}</td>
                    <td className="py-2 px-2 text-right font-medium">{formatCurrency(entry.balance)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300 font-bold">
                  <td colSpan={3} className="py-2 px-2 text-right">TOTAL:</td>
                  <td className="py-2 px-2 text-right">{formatCurrency(totalDebit)}</td>
                  <td className="py-2 px-2 text-right">{formatCurrency(totalCredit)}</td>
                  <td className="py-2 px-2 text-right">{formatCurrency(totalDebit - totalCredit)}</td>
                </tr>
              </tfoot>
            </table>

            <div className="mt-6 text-xs text-gray-500 text-center">
              Dicetak pada: {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </PrintPreviewModal>
      )}

      {/* Back to Top FAB */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 p-3 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-all transform hover:scale-105 z-50"
          aria-label="Back to top"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      )}
    </div>
  );
}