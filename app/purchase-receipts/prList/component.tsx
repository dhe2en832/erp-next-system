'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoadingSpinner from '../../components/LoadingSpinner';
import Pagination from '../../components/Pagination';
import { formatDate, parseDate } from '../../../utils/format';
import BrowserStyleDatePicker from '../../../components/BrowserStyleDatePicker';
import { Printer, FileText, ArrowUp, Loader2, Plus } from 'lucide-react';
import ErrorDialog from '../../../components/ErrorDialog';
import PrintPreviewModal from '../../../components/print/PrintPreviewModal';
import PurchaseReceiptPrint from '../../../components/print/PurchaseReceiptPrint';

// ─────────────────────────────────────────────────────────────
// Hook: Deteksi mobile (breakpoint 768px) - INLINE seperti soList
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
// Hook: Infinite Scroll Observer - INLINE seperti soList
// ─────────────────────────────────────────────────────────────
function useInfiniteScroll(callback: () => void, hasMore: boolean, isLoading: boolean) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isLoading || !hasMore) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          callback();
        }
      },
      { rootMargin: '100px' }
    );

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [callback, hasMore, isLoading]);

  return sentinelRef;
}

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
interface PurchaseReceipt {
  name: string;
  supplier: string;
  supplier_name: string;
  posting_date: string;
  status: string;
  grand_total: number;
  currency: string;
  creation?: string;
}

interface Supplier {
  name: string;
  supplier_name: string;
}

// ─────────────────────────────────────────────────────────────
// Helper: Format currency
// ─────────────────────────────────────────────────────────────
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
};

// ─────────────────────────────────────────────────────────────
// Status Mapping: English (DB) → Indonesian (UI)
// ─────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  'Draft': 'Draft',
  'Submitted': 'Diajukan',
  'To Bill': 'Belum Ditagih',
  'Completed': 'Selesai',
  'Cancelled': 'Dibatalkan',
  'Return Issued': 'Retur Dikirim',
};

const STATUS_COLORS: Record<string, string> = {
  'Draft': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Submitted': 'bg-blue-100 text-blue-800 border-blue-200',
  'To Bill': 'bg-orange-100 text-orange-800 border-orange-200',
  'Completed': 'bg-green-100 text-green-800 border-green-200',
  'Cancelled': 'bg-red-100 text-red-800 border-red-200',
  'Return Issued': 'bg-purple-100 text-purple-800 border-purple-200',
};

const getStatusLabel = (status: string): string => STATUS_LABELS[status] || status;
const getStatusBadgeClass = (status: string): string => 
  STATUS_COLORS[status] || 'bg-gray-100 text-gray-800 border-gray-200';

// ─────────────────────────────────────────────────────────────
// Skeleton Card - INLINE seperti soList
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
export default function PurchaseReceiptList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile(768);

  // Dynamic pageSize: Mobile 10, Desktop 20
  const pageSize = isMobile ? 10 : 20;
  const useInfiniteScrollMode = isMobile;

  const [receipts, setReceipts] = useState<PurchaseReceipt[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [dateFilter, setDateFilter] = useState({
    from_date: formatDate(new Date(Date.now() - 86400000)),
    to_date: formatDate(new Date()),
  });
  const [supplierFilter, setSupplierFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [documentNumberFilter, setDocumentNumberFilter] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [error, setError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);

  // Print preview states
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [printData, setPrintData] = useState<any>(null);
  const [loadingPrintData, setLoadingPrintData] = useState(false);

  // Ref untuk sentinel infinite scroll
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  
  // Ref untuk tracking pagination source (prevent race conditions)
  const pageChangeSourceRef = useRef<'pagination' | 'filter' | 'init'>('init');

  // ─────────────────────────────────────────────────────────
  // Sync URL dengan page state (untuk bookmark/share)
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    const pageFromUrl = searchParams?.get('page');
    if (pageFromUrl && !isNaN(parseInt(pageFromUrl))) {
      const pageNum = parseInt(pageFromUrl);
      if (pageNum >= 1) setCurrentPage(pageNum);
    }
  }, [searchParams]);

  // Update URL with debounce to prevent throttling
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const timeoutId = setTimeout(() => {
      const newParams = new URLSearchParams(searchParams?.toString() || '');
      if (currentPage > 1) {
        newParams.set('page', currentPage.toString());
      } else {
        newParams.delete('page');
      }
      const newUrl = `${window.location.pathname}${newParams.toString() ? `?${newParams.toString()}` : ''}`;
      window.history.replaceState({}, '', newUrl);
    }, 100); // Debounce 100ms

    return () => clearTimeout(timeoutId);
  }, [currentPage, searchParams]);

  // ─────────────────────────────────────────────────────────
  // Company Selection from localStorage/cookies
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
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
  // Fetch Suppliers
  // ─────────────────────────────────────────────────────────
  const fetchSuppliers = useCallback(async () => {
    const companyToUse = selectedCompany || localStorage.getItem('selected_company');
    if (!companyToUse) return;

    try {
      const response = await fetch(`/api/purchase/suppliers?company=${encodeURIComponent(companyToUse)}`);
      const data = await response.json();
      if (data.success) setSuppliers(data.data || []);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    }
  }, [selectedCompany]);

  // ─────────────────────────────────────────────────────────
  // Fetch Data - MENGIKUTI POLA soList.tsx
  // ─────────────────────────────────────────────────────────
  const fetchReceipts = useCallback(async (reset = false) => {
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

      // ✅ WAJIB: Urutkan dari yang terbaru (creation descending)
      params.append('order_by', 'creation desc');
      
      if (companyToUse) params.append('company', companyToUse);
      if (supplierFilter) params.append('search', supplierFilter);
      if (documentNumberFilter) params.append('documentNumber', documentNumberFilter);
      if (statusFilter) params.append('status', statusFilter);
      
      if (dateFilter.from_date) {
        const parsed = parseDate(dateFilter.from_date);
        if (parsed) params.append('from_date', parsed);
      }
      if (dateFilter.to_date) {
        const parsed = parseDate(dateFilter.to_date);
        if (parsed) params.append('to_date', parsed);
      }

      const response = await fetch(`/api/purchase/receipts?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        const receiptsData = result.data || [];

        if (result.total_records !== undefined) {
          setTotalRecords(result.total_records);
          setTotalPages(Math.ceil(result.total_records / pageSize));
          setHasMoreData(currentPage < Math.ceil(result.total_records / pageSize));
        } else {
          setTotalRecords(receiptsData.length);
          setTotalPages(1);
          setHasMoreData(false);
        }

        // ✅ Secondary sort by creation date (fallback jika API tidak sorting)
        receiptsData.sort((a: any, b: any) => {
          const dateA = new Date(a.creation || a.posting_date || '1970-01-01');
          const dateB = new Date(b.creation || b.posting_date || '1970-01-01');
          return dateB.getTime() - dateA.getTime();
        });

        if (reset) {
          setReceipts(receiptsData);
        } else {
          // Append untuk infinite scroll (hindari duplikat)
          setReceipts(prev => {
            const existingNames = new Set(prev.map(o => o.name));
            const newReceipts = receiptsData.filter((o: PurchaseReceipt) => !existingNames.has(o.name));
            return [...prev, ...newReceipts];
          });
        }

        setError(receiptsData.length === 0 && reset ? `Tidak ada penerimaan barang untuk perusahaan: ${companyToUse}` : '');
      } else {
        setError(result.message || 'Gagal memuat penerimaan barang');
      }
    } catch {
      setError('Gagal memuat penerimaan barang');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [currentPage, pageSize, dateFilter, supplierFilter, statusFilter, documentNumberFilter, selectedCompany]);

  // ─────────────────────────────────────────────────────────
  // Effects - FIXED VERSION - Prevent race conditions
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (selectedCompany) fetchSuppliers();
  }, [selectedCompany, fetchSuppliers]);

  // Reset page when filters change
  useEffect(() => {
    pageChangeSourceRef.current = 'filter';
    setCurrentPage(1);
  }, [dateFilter, supplierFilter, statusFilter, documentNumberFilter]);

  // Fetch when page changes (separated from filter logic)
  useEffect(() => {
    // Always reset for desktop pagination
    // Only append for mobile infinite scroll when page > 1
    const shouldReset = !useInfiniteScrollMode || currentPage === 1;
    fetchReceipts(shouldReset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, useInfiniteScrollMode]);

  // Trigger fetch when filters change (after page reset)
  useEffect(() => {
    if (pageChangeSourceRef.current === 'filter') {
      const shouldReset = !useInfiniteScrollMode || currentPage === 1;
      fetchReceipts(shouldReset);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter, supplierFilter, statusFilter, documentNumberFilter]);

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

  // Setup intersection observer untuk infinite scroll - POLA soList
  useEffect(() => {
    if (!useInfiniteScrollMode || loading || loadingMore || !hasMoreData) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreData();
        }
      },
      { rootMargin: '100px' }
    );

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => observer.disconnect();
  }, [useInfiniteScrollMode, loading, loadingMore, hasMoreData, loadMoreData]);

  // ─────────────────────────────────────────────────────────
  // Back to Top Button
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  // ─────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────
  const handleSubmit = async (prName: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActionLoading(true);
    try {
      const res = await fetch(`/api/purchase/receipts/${prName}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await res.json();
      if (result.success) {
        setSuccessMessage(`Penerimaan Barang ${prName} berhasil diajukan!`);
        setShowSuccessDialog(true);
        fetchReceipts(true);
        setTimeout(() => {
          router.push(`/purchase-receipts/prMain?name=${prName}`);
        }, 2000);
      } else {
        setSubmitError(result.message || 'Gagal mengajukan Penerimaan Barang');
      }
    } catch {
      setSubmitError('Gagal mengajukan Penerimaan Barang');
    } finally {
      setActionLoading(false);
    }
  };

  const fetchDataForPrint = async (prName: string) => {
    setLoadingPrintData(true);
    try {
      const response = await fetch(`/api/purchase/receipts/${prName}`);
      const result = await response.json();
      
      if (result.success) {
        const prData = result.data;
        
        // Fetch supplier address separately if not available
        let supplierAddress = prData.address_display || 
                             prData.supplier_address || 
                             prData.shipping_address || 
                             '';
        
        // If no address found, try to fetch from supplier
        if (!supplierAddress && prData.supplier) {
          try {
            const supplierResponse = await fetch(`/api/purchase/suppliers/${encodeURIComponent(prData.supplier)}`);
            const supplierResult = await supplierResponse.json();
            if (supplierResult.success && supplierResult.data) {
              supplierAddress = supplierResult.data.primary_address || 
                              supplierResult.data.supplier_primary_address ||
                              '';
            }
          } catch (err) {
            console.error('Failed to fetch supplier address:', err);
          }
        }
        
        setPrintData({
          ...prData,
          supplier_address: supplierAddress,
        });
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

  const handlePrint = async (prName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await fetchDataForPrint(prName);
    setShowPrintPreview(true);
  };

  const handleCardClick = (receipt: PurchaseReceipt) => {
    if (receipt.name) {
      const paramKey = receipt.status === 'Draft' ? 'id' : 'name';
      router.push(`/purchase-receipts/prMain?${paramKey}=${receipt.name}`);
    }
  };

  const handleResetFilters = () => {
    setDateFilter({
      from_date: formatDate(new Date(Date.now() - 86400000)),
      to_date: formatDate(new Date()),
    });
    setSupplierFilter('');
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
  // Initial Loading - MENGGUNAKAN POLA soList.tsx
  // ─────────────────────────────────────────────────────────
  if (loading && receipts.length === 0) {
    return <LoadingSpinner message="Memuat Penerimaan Barang..." />;
  }

  // ─────────────────────────────────────────────────────────
  // Render UI - MENGIKUTI POLA soList.tsx
  // ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <ErrorDialog isOpen={!!submitError} title="Gagal Mengajukan" message={submitError} onClose={() => setSubmitError('')} />

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6 lg:px-8 sticky top-0 z-30">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Penerimaan Barang</h1>
          <button
            onClick={() => router.push('/purchase-receipts/prMain')}
            className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
          >
            <Plus className="w-4 h-4 mr-1" /> Buat Penerimaan
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {[
            { label: 'Cari Pemasok', value: supplierFilter, onChange: setSupplierFilter, placeholder: 'Nama pemasok...' },
            { label: 'No. Dokumen', value: documentNumberFilter, onChange: setDocumentNumberFilter, placeholder: 'No. PR...' },
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
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {(['from_date', 'to_date'] as const).map((key) => (
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

      {/* Error */}
      {error && (
        <div className="px-4 py-3 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        </div>
      )}

      {/* List Container */}
      <div className="px-4 py-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

          {/* Progress Indicator */}
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs text-gray-600">
            <span className="font-medium">{receipts.length}</span> dari <span className="font-medium">{totalRecords}</span> data
            {useInfiniteScrollMode && hasMoreData && (
              <span className="ml-2 text-indigo-600">• Scroll untuk load lebih banyak</span>
            )}
          </div>

          {/* Table Header - Desktop Only */}
          {!isMobile && receipts.length > 0 && (
            <div className="hidden sm:flex items-center px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase">
              <div className="flex-1 min-w-0">
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-3">No. PR / Pemasok</div>
                  <div className="col-span-2">Tanggal</div>
                  <div className="col-span-2 text-right">Total</div>
                  <div className="col-span-3">Status</div>
                  <div className="col-span-2 text-right">Aksi</div>
                </div>
              </div>
            </div>
          )}

          {/* Cards/Rows - POLA soList.tsx */}
          <ul className="divide-y divide-gray-100">
            {receipts.map((receipt) => (
              <li
                key={receipt.name}
                onClick={() => handleCardClick(receipt)}
                className="cursor-pointer hover:bg-indigo-50/50 transition-colors"
              >
                <div className="px-4 py-4">
                  {isMobile ? (
                    // ─── Mobile Card ───
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-indigo-600 truncate">{receipt.name}</p>
                          <p className="text-xs text-gray-600 mt-0.5 truncate">{receipt.supplier_name}</p>
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusBadgeClass(receipt.status)}`}>
                          {getStatusLabel(receipt.status)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                        <div>📅 {receipt.posting_date}</div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <span className="text-sm font-semibold text-gray-900">{formatCurrency(receipt.grand_total)}</span>
                        <div className="flex items-center gap-1">
                          <button onClick={(e) => handlePrint(receipt.name, e)} className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Cetak">
                            <Printer className="h-4 w-4" />
                          </button>
                          {receipt.status === 'Draft' && (
                            <button onClick={(e) => handleSubmit(receipt.name, e)} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700">
                              Ajukan
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    // ─── Desktop Row ───
                    <div className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-3 min-w-0">
                        <p className="text-sm font-semibold text-indigo-600 truncate">{receipt.name}</p>
                        <p className="text-xs text-gray-600 mt-0.5 truncate">{receipt.supplier_name}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm text-gray-900">{receipt.posting_date}</p>
                      </div>
                      <div className="col-span-2 text-right">
                        <p className="text-sm font-semibold text-gray-900">{formatCurrency(receipt.grand_total)}</p>
                      </div>
                      <div className="col-span-3">
                        <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full border ${getStatusBadgeClass(receipt.status)}`}>
                          {getStatusLabel(receipt.status)}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={(e) => handlePrint(receipt.name, e)} className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Cetak">
                            <Printer className="h-4 w-4" />
                          </button>
                          {receipt.status === 'Draft' && (
                            <button onClick={(e) => handleSubmit(receipt.name, e)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg" title="Ajukan">
                              ✓
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </li>
            ))}

            {/* Skeleton Loaders saat loading more - POLA soList */}
            {loadingMore && useInfiniteScrollMode && (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            )}

            {/* Sentinel untuk infinite scroll - POLA soList */}
            {useInfiniteScrollMode && hasMoreData && (
              <div ref={sentinelRef} className="h-10"></div>
            )}
          </ul>

          {/* Empty State */}
          {receipts.length === 0 && !loading && (
            <div className="text-center py-16 px-4">
              <FileText className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4 text-sm text-gray-500">Tidak ada penerimaan barang yang ditemukan</p>
              <button onClick={() => router.push('/purchase-receipts/prMain')} className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100">
                + Buat Penerimaan Baru
              </button>
            </div>
          )}

          {/* Load More Button (Mobile Fallback) */}
          {useInfiniteScrollMode && hasMoreData && !loadingMore && receipts.length > 0 && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-center">
              <button
                onClick={handleLoadMoreClick}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                <Loader2 className="h-4 w-4" />
                Load More ({totalRecords - receipts.length} remaining)
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

          {/* End of Data */}
          {!hasMoreData && receipts.length > 0 && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-center text-xs text-gray-500">
              ✓ Semua data telah dimuat
            </div>
          )}

          {/* Pagination - Desktop Only */}
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
          title="Back to top"
          aria-label="Back to top"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}

      {/* Success Dialog */}
      {showSuccessDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-green-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">Sukses!</h3>
              </div>
            </div>
            <div className="text-sm text-gray-600">{successMessage}</div>
            <div className="mt-4 flex justify-end">
              <button onClick={() => setShowSuccessDialog(false)} className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Preview Modal */}
      {showPrintPreview && printData && !loadingPrintData && (
        <PrintPreviewModal
          title={`Purchase Receipt - ${printData.name}`}
          onClose={() => {
            setShowPrintPreview(false);
            setPrintData(null);
          }}
          paperMode="continuous"
        >
          <PurchaseReceiptPrint
            data={printData}
            companyName={selectedCompany}
          />
        </PrintPreviewModal>
      )}
    </div>
  );
}