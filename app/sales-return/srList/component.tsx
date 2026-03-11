'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoadingSpinner from '../../components/LoadingSpinner';
import Pagination from '../../components/Pagination';
import { formatDate, parseDate } from '../../../utils/format';
import BrowserStyleDatePicker from '../../../components/BrowserStyleDatePicker';
import { Printer, FileText, Send, ArrowUp, Loader2, RotateCcw } from 'lucide-react';
import ErrorDialog from '../../../components/ErrorDialog';
import { SalesReturn } from '../../../types/sales-return';
import PrintPreviewModal from '../../../components/print/PrintPreviewModal';
import SalesReturnPrint from '../../../components/print/SalesReturnPrint';

export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────
// Hook: Deteksi mobile (breakpoint 768px)
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// Status Mapping: ERPNext Value (EN) → Indonesian Label (UI)
// Sales Return status: Draft, Submitted, Cancelled
// ─────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  'Draft': 'Draft',
  'Submitted': 'Diajukan',
  'Cancelled': 'Dibatalkan',
};

const STATUS_COLORS: Record<string, string> = {
  'Draft': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Submitted': 'bg-green-100 text-green-800 border-green-200',
  'Cancelled': 'bg-gray-100 text-gray-800 border-gray-200',
};

const getStatusLabel = (status: string): string => STATUS_LABELS[status] || status;
const getStatusBadgeClass = (status: string): string => STATUS_COLORS[status] || 'bg-gray-100 text-gray-800 border-gray-200';

// ─────────────────────────────────────────────────────────────
// Helper: Format currency IDR
// ─────────────────────────────────────────────────────────────
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
};

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
export default function SalesReturnList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile(768);
  
  // Dynamic pageSize: Mobile 10, Desktop 20
  const pageSize = isMobile ? 10 : 20;
  const useInfiniteScrollMode = isMobile;

  const [returns, setReturns] = useState<SalesReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [dateFilter, setDateFilter] = useState({
    from_date: formatDate(new Date(Date.now() - 86400000)),
    to_date: formatDate(new Date()),
  });
  const [customerFilter, setCustomerFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [documentNumberFilter, setDocumentNumberFilter] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [error, setError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);

  // Print preview states
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [printData, setPrintData] = useState<SalesReturn | null>(null);
  const [loadingPrintData, setLoadingPrintData] = useState(false);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  
  // Ref untuk tracking pagination source (prevent race conditions)
  const pageChangeSourceRef = useRef<'pagination' | 'filter' | 'init'>('init');

  // ─────────────────────────────────────────────────────────
  // Sync URL dengan page state (bookmark/share)
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    const pageFromUrl = searchParams.get('page');
    if (pageFromUrl && !isNaN(parseInt(pageFromUrl))) {
      const pageNum = parseInt(pageFromUrl);
      if (pageNum >= 1) setCurrentPage(pageNum);
    }
  }, [searchParams]);

  // ─────────────────────────────────────────────────────────
  // Company Selection from localStorage/cookies
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    let savedCompany = localStorage.getItem('selected_company');
    if (!savedCompany) {
      const cookies = document.cookie.split(';');
      const companyCookie = cookies.find(c => c.trim().startsWith('selected_company='));
      if (companyCookie) {
        savedCompany = companyCookie.split('=')[1];
        if (savedCompany) localStorage.setItem('selected_company', savedCompany);
      }
    }
    if (savedCompany) setSelectedCompany(savedCompany);
  }, []);

  // ─────────────────────────────────────────────────────────
  // Fetch Data dari ERPNext API
  // ─────────────────────────────────────────────────────────
  const fetchReturns = useCallback(async (reset = false) => {
    if (reset) {
      setLoading(true);
      setError('');
    } else {
      setLoadingMore(true);
    }

    let companyToUse = selectedCompany;
    if (!companyToUse) {
      const stored = localStorage.getItem('selected_company');
      if (stored) companyToUse = stored;
      else {
        const cookies = document.cookie.split(';');
        const cookie = cookies.find(c => c.trim().startsWith('selected_company='));
        if (cookie) companyToUse = cookie.split('=')[1];
      }
    }
    
    if (!companyToUse) {
      setError('Perusahaan belum dipilih. Silakan pilih perusahaan terlebih dahulu.');
      setLoading(false);
      setLoadingMore(false);
      return;
    }
    
    if (!selectedCompany && companyToUse) setSelectedCompany(companyToUse);
    
    try {
      const params = new URLSearchParams();
      params.append('limit_page_length', pageSize.toString());
      params.append('start', ((currentPage - 1) * pageSize).toString());
      
      // ✅ REQUEST FIELD SPESIFIK DARI ERPNext
      params.append('fields', JSON.stringify([
        'name',
        'customer',
        'customer_name',
        'posting_date',
        'status',
        'grand_total',
        'delivery_note',
        'custom_notes',
        'is_return',
        'items'
      ]));
      
      // ✅ SORTING: Data terbaru paling atas
      params.append('order_by', 'creation desc, posting_date desc');
      
      // ✅ BUILD FILTERS ARRAY UNTUK ERPNext (Format JSON)
      // ⚠️ PENTING: Sales Return menggunakan is_return = 1 (bukan 0)
      const filters: [string, string, string | number][] = [
        ["company", "=", companyToUse],
        ["is_return", "=", 1],  // ✅ INCLUDE SALES RETURN ONLY
      ];

      // Filter status
      if (statusFilter) {
        filters.push(["status", "=", statusFilter]);
      }

      // Filter tanggal posting
      if (dateFilter.from_date) {
        const parsed = parseDate(dateFilter.from_date);
        if (parsed) filters.push(["posting_date", ">=", parsed]);
      }
      if (dateFilter.to_date) {
        const parsed = parseDate(dateFilter.to_date);
        if (parsed) filters.push(["posting_date", "<=", parsed]);
      }

      // Filter search dengan LIKE (case-insensitive)
      if (customerFilter) {
        filters.push(["customer_name", "like", `%${customerFilter}%`]);
      }
      if (documentNumberFilter) {
        filters.push(["name", "like", `%${documentNumberFilter}%`]);
      }

      // Append filters sebagai JSON string (ERPNext requirement)
      params.append('filters', JSON.stringify(filters));

      // 🔍 DEBUG: Log filters yang dikirim ke API
      // console.log('🔍 ERPNext Filters:', JSON.stringify(filters));

      const response = await fetch(`/api/sales/delivery-note-return?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        const filteredData = data.data || [];
        
        if (data.total_records !== undefined) {
          setTotalRecords(data.total_records);
          setTotalPages(Math.ceil(data.total_records / pageSize));
          setHasMoreData(currentPage < Math.ceil(data.total_records / pageSize));
        } else {
          setTotalRecords(filteredData.length);
          setTotalPages(1);
          setHasMoreData(false);
        }
        
        if (reset) {
          setReturns(filteredData);
        } else {
          // Append untuk infinite scroll (hindari duplikat)
          setReturns(prev => {
            const existingNames = new Set(prev.map((o: SalesReturn) => o.name));
            const newItems = filteredData.filter((o: SalesReturn) => !existingNames.has(o.name));
            return [...prev, ...newItems];
          });
        }
        
        setError(filteredData.length === 0 && reset ? `Tidak ada retur untuk perusahaan: ${companyToUse}` : '');
      } else {
        setError(data.message || 'Gagal memuat retur penjualan');
      }
    } catch (err) {
      console.error('❌ Error fetching sales returns:', err);
      setError('Gagal memuat retur penjualan');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [selectedCompany, dateFilter, customerFilter, documentNumberFilter, statusFilter, currentPage, pageSize]);

  // ─────────────────────────────────────────────────────────
  // Effects
  // ─────────────────────────────────────────────────────────
  // Effects - FIXED VERSION - Prevent race conditions
  // ─────────────────────────────────────────────────────────
  
  // Reset page when filters change
  useEffect(() => {
    pageChangeSourceRef.current = 'filter';
    setCurrentPage(1);
  }, [dateFilter, customerFilter, documentNumberFilter, statusFilter]);

  // Fetch when page changes (separated from filter logic)
  useEffect(() => {
    // Always reset for desktop pagination
    // Only append for mobile infinite scroll when page > 1
    const shouldReset = !useInfiniteScrollMode || currentPage === 1;
    fetchReturns(shouldReset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, useInfiniteScrollMode]);

  // Trigger fetch when filters change (after page reset)
  useEffect(() => {
    if (pageChangeSourceRef.current === 'filter') {
      const shouldReset = !useInfiniteScrollMode || currentPage === 1;
      fetchReturns(shouldReset);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter, customerFilter, documentNumberFilter, statusFilter]);

  // ─────────────────────────────────────────────────────────
  // Infinite Scroll Handler (Mobile Only)
  // ─────────────────────────────────────────────────────────
  const loadMoreData = useCallback(() => {
    if (!loadingMore && hasMoreData && useInfiniteScrollMode) {
      setCurrentPage(prev => {
        const nextPage = prev + 1;
        if (nextPage <= totalPages) return nextPage;
        return prev;
      });
    }
  }, [loadingMore, hasMoreData, useInfiniteScrollMode, totalPages]);

  // Setup Intersection Observer untuk infinite scroll
  useEffect(() => {
    if (!useInfiniteScrollMode || loading || loadingMore || !hasMoreData) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreData();
        }
      },
      { rootMargin: '100px' } // Trigger 100px sebelum bottom
    );

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => {
      if (observer) observer.disconnect();
    };
  }, [useInfiniteScrollMode, loading, loadingMore, hasMoreData, loadMoreData]);

  // ─────────────────────────────────────────────────────────
  // Back to Top Button
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ─────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────
  const handleSubmitReturn = async (returnName: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    if (!confirm(`Apakah Anda yakin ingin mengajukan retur ${returnName}? Stok akan diperbarui.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/sales/delivery-note-return/${returnName}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: returnName }),
      });
      const result = await res.json();
      if (result.success) {
        setSuccessMessage(`✅ Retur ${returnName} berhasil diajukan!`);
        fetchReturns(true);
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        setSubmitError(result.message || 'Gagal mengajukan retur');
      }
    } catch {
      setSubmitError('Terjadi kesalahan saat mengajukan retur');
    }
  };

  const handlePrint = async (returnName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await fetchDataForPrint(returnName);
    setShowPrintPreview(true);
  };

  const fetchDataForPrint = async (returnName: string) => {
    setLoadingPrintData(true);
    try {
      const response = await fetch(`/api/sales/delivery-note-return/${encodeURIComponent(returnName)}`);
      const result = await response.json();
      
      if (result.success) {
        setPrintData(result.data);
      } else {
        alert('Gagal memuat data untuk print');
      }
    } catch (error) {
      console.error('Error fetching data for print:', error);
      alert('Terjadi kesalahan saat memuat data');
    } finally {
      setLoadingPrintData(false);
    }
  };

  const handleCardClick = (returnName: string) => {
    if (returnName) router.push(`/sales-return/srMain?name=${returnName}`);
  };

  const handleResetFilters = () => {
    setDateFilter({
      from_date: formatDate(new Date(Date.now() - 86400000)),
      to_date: formatDate(new Date()),
    });
    setCustomerFilter('');
    setStatusFilter('');
    setDocumentNumberFilter('');
    setCurrentPage(1);
  };

  const handleLoadMoreClick = () => {
    if (!loadingMore && hasMoreData) {
      setCurrentPage(prev => Math.min(prev + 1, totalPages));
    }
  };

  // ─────────────────────────────────────────────────────────
  // Skeleton Loader Component (untuk infinite scroll)
  // ─────────────────────────────────────────────────────────
  const SkeletonCard = () => (
    <li className="px-4 py-4 border-b border-gray-100">
      <div className="space-y-3 animate-pulse">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2 mt-2"></div>
          </div>
          <div className="h-5 bg-gray-200 rounded w-16"></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="h-3 bg-gray-200 rounded"></div>
          <div className="h-3 bg-gray-200 rounded"></div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="h-4 bg-gray-200 rounded w-24"></div>
          <div className="flex gap-2">
            <div className="h-8 w-8 bg-gray-200 rounded"></div>
            <div className="h-8 w-8 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    </li>
  );

  // ─────────────────────────────────────────────────────────
  // Initial Loading State
  // ─────────────────────────────────────────────────────────
  if (loading && returns.length === 0) {
    return <LoadingSpinner message="Memuat Retur Penjualan..." />;
  }

  // ─────────────────────────────────────────────────────────
  // Render UI
  // ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <ErrorDialog isOpen={!!submitError} title="Gagal Mengajukan" message={submitError} onClose={() => setSubmitError('')} />
      
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6 lg:px-8 sticky top-0 z-30">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Retur Penjualan</h1>
          <button
            onClick={() => router.push('/sales-return/srMain')}
            className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            + Buat Retur
          </button>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="px-4 py-3 sm:px-6 lg:px-8">
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
            <span>{successMessage}</span>
            <button onClick={() => setSuccessMessage('')} className="text-green-700 hover:text-green-900 font-bold">✕</button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="px-4 py-3 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-700 hover:text-red-900 font-bold">✕</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {[
            { label: 'Cari Pelanggan', value: customerFilter, onChange: setCustomerFilter, placeholder: 'Nama pelanggan...' },
            { label: 'No. Dokumen', value: documentNumberFilter, onChange: setDocumentNumberFilter, placeholder: 'Nomor retur...' },
          ].map((field, i) => (
            <div key={i}>
              <label className="block text-xs font-medium text-gray-500 mb-1">{field.label}</label>
              <input
                type="text"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={field.placeholder}
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
              />
            </div>
          ))}
          
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Semua Status</option>
              <option value="Draft">Draft</option>
              <option value="Submitted">Diajukan</option>
              <option value="Cancelled">Dibatalkan</option>
            </select>
          </div>
          
          {['from_date', 'to_date'].map((key) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                {key === 'from_date' ? 'Dari Tanggal' : 'Sampai Tanggal'}
              </label>
              <BrowserStyleDatePicker
                value={dateFilter[key as keyof typeof dateFilter]}
                onChange={(value: string) => setDateFilter({ ...dateFilter, [key]: value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="DD/MM/YYYY"
              />
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-end">
          <button
            onClick={handleResetFilters}
            className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            ⟲ Reset Filter
          </button>
        </div>
      </div>

      {/* List Container */}
      <div className="px-4 py-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          
          {/* Progress Indicator */}
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs text-gray-600 flex items-center justify-between">
            <div>
              <span className="font-medium">{returns.length}</span> dari <span className="font-medium">{totalRecords}</span> data
            </div>
            {useInfiniteScrollMode && hasMoreData && (
              <span className="text-indigo-600">• Scroll untuk load lebih banyak</span>
            )}
          </div>

          {/* Table Header - Desktop Only */}
          {!isMobile && returns.length > 0 && (
            <div className="hidden sm:flex items-center px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase">
              <div className="flex-1 min-w-0">
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-3">Dokumen / Pelanggan</div>
                  <div className="col-span-2">Tanggal</div>
                  <div className="col-span-3">Surat Jalan</div>
                  <div className="col-span-2 text-right">Total</div>
                  <div className="col-span-1">Status</div>
                  <div className="col-span-1 text-right">Aksi</div>
                </div>
              </div>
            </div>
          )}

          {/* Cards / Rows List */}
          <ul className="divide-y divide-gray-100">
            {returns.map((ret) => (
              <li 
                key={ret.name}
                onClick={() => handleCardClick(ret.name)}
                className="cursor-pointer hover:bg-indigo-50/50 transition-colors"
              >
                <div className="px-4 py-4">
                  {isMobile ? (
                    // ─── Mobile Card Layout ───
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-indigo-600 truncate">{ret.name}</p>
                          <p className="text-xs text-gray-600 mt-0.5 truncate">{ret.customer_name}</p>
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusBadgeClass(ret.status)}`}>
                          {getStatusLabel(ret.status)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                        <div>📅 {ret.posting_date}</div>
                        <div>📦 Item: {ret.items?.length || 0}</div>
                      </div>
                      {ret.delivery_note && (
                        <div className="text-xs text-gray-500">
                          📄 Surat Jalan: {ret.delivery_note}
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <span className="text-sm font-semibold text-gray-900">{formatCurrency(ret.grand_total)}</span>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={(e) => handlePrint(ret.name, e)} 
                            disabled={loadingPrintData}
                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg disabled:opacity-50" 
                            title="Cetak"
                          >
                            {loadingPrintData ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                          </button>
                          {ret.status === 'Draft' && (
                            <button 
                              onClick={(e) => handleSubmitReturn(ret.name, e)} 
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                            >
                              <Send className="h-3 w-3" /> Ajukan
                            </button>
                          )}
                        </div>
                      </div>
                      {ret.custom_notes && <p className="text-xs text-gray-400 italic truncate">📝 {ret.custom_notes}</p>}
                    </div>
                  ) : (
                    // ─── Desktop Row Layout ───
                    <div className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-3 min-w-0">
                        <p className="text-sm font-semibold text-indigo-600 truncate">{ret.name}</p>
                        <p className="text-xs text-gray-600 mt-0.5 truncate">{ret.customer_name}</p>
                        {ret.custom_notes && <p className="text-xs text-gray-400 truncate mt-1">📝 {ret.custom_notes}</p>}
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm text-gray-900">{ret.posting_date}</p>
                        <p className="text-xs text-gray-500">Posting</p>
                      </div>
                      <div className="col-span-3">
                        {ret.delivery_note ? (
                          <>
                            <p className="text-sm text-indigo-600 truncate">{ret.delivery_note}</p>
                            <p className="text-xs text-gray-500">Surat Jalan</p>
                          </>
                        ) : (
                          <p className="text-xs text-gray-400">-</p>
                        )}
                      </div>
                      <div className="col-span-2 text-right">
                        <p className="text-sm font-semibold text-gray-900">{formatCurrency(ret.grand_total)}</p>
                        <p className="text-xs text-gray-500">{ret.items?.length || 0} item</p>
                      </div>
                      <div className="col-span-1">
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusBadgeClass(ret.status)}`}>
                          {getStatusLabel(ret.status)}
                        </span>
                      </div>
                      <div className="col-span-1">
                        <div className="flex items-center justify-end gap-1">
                          <button 
                            onClick={(e) => handlePrint(ret.name, e)} 
                            disabled={loadingPrintData}
                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg disabled:opacity-50" 
                            title="Cetak"
                          >
                            {loadingPrintData ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                          </button>
                          {ret.status === 'Draft' && (
                            <button onClick={(e) => handleSubmitReturn(ret.name, e)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg" title="Ajukan">
                              <Send className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </li>
            ))}

            {/* Skeleton Loaders saat loading more (infinite scroll) */}
            {loadingMore && useInfiniteScrollMode && (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            )}

            {/* Sentinel element untuk trigger infinite scroll */}
            {useInfiniteScrollMode && hasMoreData && (
              <div ref={sentinelRef} className="h-10"></div>
            )}
          </ul>

          {/* Empty State */}
          {returns.length === 0 && !loading && (
            <div className="text-center py-16 px-4">
              <FileText className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4 text-sm text-gray-500">Tidak ada retur penjualan ditemukan</p>
              <button onClick={() => router.push('/sales-return/srMain')} className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100">
                + Buat Retur Baru
              </button>
            </div>
          )}

          {/* Load More Button (Mobile Fallback) */}
          {useInfiniteScrollMode && hasMoreData && !loadingMore && returns.length > 0 && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-center">
              <button
                onClick={handleLoadMoreClick}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                <Loader2 className="h-4 w-4" />
                Load More ({totalRecords - returns.length} remaining)
              </button>
            </div>
          )}

          {/* Loading More Indicator */}
          {loadingMore && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-center">
              <div className="inline-flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Memuat data...
              </div>
            </div>
          )}

          {/* End of Data Indicator */}
          {!hasMoreData && returns.length > 0 && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-center text-xs text-gray-500">
              ✓ Semua data telah dimuat
            </div>
          )}

          {/* Pagination Controls - Desktop Only */}
          {!useInfiniteScrollMode && totalPages > 1 && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalRecords={totalRecords}
                pageSize={pageSize}
                onPageChange={(page) => {
                  pageChangeSourceRef.current = 'pagination';
                  setCurrentPage(page);
                }}
              />
            </div>
          )}
        </div>
        <p className="mt-3 text-xs text-gray-500 text-center">
          Halaman {currentPage} dari {totalPages} • {isMobile ? 'Scroll untuk load lebih banyak' : 'Gunakan pagination untuk navigasi'}
        </p>
      </div>

      {/* Back to Top FAB Button */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 inline-flex items-center justify-center w-12 h-12 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all transform hover:scale-105"
          title="Kembali ke atas"
          aria-label="Kembali ke atas"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}

      {/* Print Preview Modal */}
      {showPrintPreview && printData && (
        <PrintPreviewModal
          title={`Retur Penjualan - ${printData.name}`}
          onClose={() => {
            setShowPrintPreview(false);
            setPrintData(null);
          }}
          paperMode="continuous"
        >
          <SalesReturnPrint data={printData} companyName={selectedCompany} />
        </PrintPreviewModal>
      )}
    </div>
  );
}