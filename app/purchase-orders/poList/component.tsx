'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Printer, FileText, ArrowUp, Loader2, Plus } from 'lucide-react';
import PrintPreviewModal from '../../../components/print/PrintPreviewModal';
import PurchaseOrderPrint from '../../../components/print/PurchaseOrderPrint';

// ✅ Import reusable hooks & components
import { useIsMobile, useInfiniteScroll } from '@/hooks';
import {
  LoadingSpinner,
  Pagination,
  ErrorDialog,
  BrowserStyleDatePicker,
  SkeletonCard,
  SkeletonList,
} from '@/components';

import { formatDate, parseDate } from '../../../utils/format';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
interface PurchaseOrder {
  name: string;
  supplier: string;
  supplier_name: string;
  transaction_date: string;
  schedule_date: string;
  grand_total: number;
  status: string;
  currency: string;
  creation?: string;
  company?: string;
}

// ─────────────────────────────────────────────────────────────
// Helper: Format currency
// ─────────────────────────────────────────────────────────────
const formatCurrency = (amount: number, currency = 'IDR') => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
  }).format(amount);
};

// ─────────────────────────────────────────────────────────────
// Status Mapping: English (DB) → Indonesian (UI)
// ─────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  'Draft': 'Draft',
  'Submitted': 'Diajukan',
  'To Receive and Bill': 'Belum Diterima & Difaktur',
  'To Receive': 'Belum Diterima',
  'To Bill': 'Belum Difaktur',
  'Completed': 'Selesai',
  'Cancelled': 'Dibatalkan',
  'On Hold': 'Ditunda',
};

const STATUS_COLORS: Record<string, string> = {
  'Draft': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Submitted': 'bg-blue-100 text-blue-800 border-blue-200',
  'To Receive and Bill': 'bg-orange-100 text-orange-800 border-orange-200',
  'To Receive': 'bg-orange-100 text-orange-800 border-orange-200',
  'To Bill': 'bg-pink-100 text-pink-800 border-pink-200',
  'Completed': 'bg-green-100 text-green-800 border-green-200',
  'Cancelled': 'bg-red-100 text-red-800 border-red-200',
  'On Hold': 'bg-gray-100 text-gray-800 border-gray-200',
};

const getStatusLabel = (status: string): string => STATUS_LABELS[status] || status;
const getStatusBadgeClass = (status: string): string => 
  STATUS_COLORS[status] || 'bg-gray-100 text-gray-800 border-gray-200';

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
export default function PurchaseOrderList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // ✅ Gunakan reusable hook
  const isMobile = useIsMobile(768);
  const pageSize = isMobile ? 10 : 20;
  const useInfiniteScrollMode = isMobile;

  // ─────────────────────────────────────────────────────────
  // State Management
  // ─────────────────────────────────────────────────────────
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
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

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  
  // Ref untuk tracking pagination source (prevent race conditions)
  const pageChangeSourceRef = useRef<'pagination' | 'filter' | 'init'>('init');

  // ─────────────────────────────────────────────────────────
  // Sync URL dengan page state
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    const pageFromUrl = searchParams?.get('page');
    if (pageFromUrl && !isNaN(parseInt(pageFromUrl))) {
      const pageNum = parseInt(pageFromUrl);
      if (pageNum >= 1) setCurrentPage(pageNum);
    }
  }, [searchParams]);


  // ─────────────────────────────────────────────────────────
  // Company Selection from localStorage/cookies (WAJIB)
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
  // Fetch Data - MENGIKUTI POLA soList.tsx
  // ─────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async (reset = false) => {
    if (reset) {
      setLoading(true);
      setError('');
    } else {
      setLoadingMore(true);
    }

    // 🔥 CRITICAL: Pastikan company selalu ada
    let companyToUse = selectedCompany;

    if (!companyToUse) {
      const stored = localStorage.getItem('selected_company');
      if (stored) {
        companyToUse = stored;
      } else if (typeof window !== 'undefined') {
        const cookies = document.cookie.split(';');
        const cookie = cookies.find(c => c.trim().startsWith('selected_company='));
        if (cookie) companyToUse = cookie.split('=')[1];
      }
    }

    // 🔥 ERROR HANDLING: Jika company masih kosong, stop dan tampilkan error
    if (!companyToUse) {
      setError('Perusahaan belum dipilih. Silakan pilih perusahaan terlebih dahulu.');
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    // Update state jika company ditemukan dari storage
    if (!selectedCompany && companyToUse) {
      setSelectedCompany(companyToUse);
    }

    try {
      // ✅ BUILD PARAMS: Pola sederhana seperti soList (bukan JSON filters)
      const params = new URLSearchParams();
      
      // Pagination
      params.append('limit_page_length', pageSize.toString());
      params.append('start', ((currentPage - 1) * pageSize).toString());
      
      // 🔥 WAJIB: Urutkan dari yang terbaru
      params.append('order_by', 'creation desc');
      
      // 🔥 WAJIB: Company sebagai simple param (bukan di dalam filters JSON)
      params.append('company', companyToUse);
      
      // Filters sederhana (seperti soList)
      if (supplierFilter) params.append('search', supplierFilter);
      if (documentNumberFilter) params.append('documentNumber', documentNumberFilter);
      if (statusFilter) params.append('status', statusFilter);
      
      // Date filters dengan parsing
      if (dateFilter.from_date) {
        const parsed = parseDate(dateFilter.from_date);
        if (parsed) params.append('from_date', parsed);
      }
      if (dateFilter.to_date) {
        const parsed = parseDate(dateFilter.to_date);
        if (parsed) params.append('to_date', parsed);
      }

      const response = await fetch(`/api/purchase/orders?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        const ordersData = result.data || [];

        // Handle pagination metadata
        if (result.total_records !== undefined) {
          setTotalRecords(result.total_records);
          setTotalPages(Math.ceil(result.total_records / pageSize));
          setHasMoreData(currentPage < Math.ceil(result.total_records / pageSize));
        } else {
          setTotalRecords(ordersData.length);
          setTotalPages(1);
          setHasMoreData(false);
        }

        // ✅ Secondary sort by creation date (fallback jika API tidak sorting)
        ordersData.sort((a:any, b:any) => {
          const dateA = new Date(a.creation || a.transaction_date || '1970-01-01');
          const dateB = new Date(b.creation || b.transaction_date || '1970-01-01');
          return dateB.getTime() - dateA.getTime();
        });

        if (reset) {
          setOrders(ordersData);
        } else {
          // Append untuk infinite scroll (hindari duplikat)
          setOrders(prev => {
            const existingNames = new Set(prev.map(o => o.name));
            const newOrders = ordersData.filter((o: PurchaseOrder) => !existingNames.has(o.name));
            return [...prev, ...newOrders];
          });
        }

        // Empty state message
        setError(ordersData.length === 0 && reset ? 
          `Tidak ada pesanan pembelian untuk perusahaan: ${companyToUse}` : '');
          
      } else {
        // 🔥 Handle API error message
        setError(result.message || 'Gagal memuat pesanan pembelian');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Gagal memuat pesanan pembelian');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [currentPage, pageSize, dateFilter, supplierFilter, statusFilter, documentNumberFilter, selectedCompany]);

  // ─────────────────────────────────────────────────────────
  // Effects - FIXED VERSION - Prevent race conditions
  // ─────────────────────────────────────────────────────────
  
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
    fetchOrders(shouldReset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, useInfiniteScrollMode]);

  // Trigger fetch when filters change (after page reset)
  useEffect(() => {
    if (pageChangeSourceRef.current === 'filter') {
      const shouldReset = !useInfiniteScrollMode || currentPage === 1;
      fetchOrders(shouldReset);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter, supplierFilter, statusFilter, documentNumberFilter]);

  // ─────────────────────────────────────────────────────────
  // Infinite Scroll Handler (Mobile Only) - Menggunakan reusable hook
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

  // ✅ Gunakan reusable hook useInfiniteScroll
  const infiniteScrollSentinelRef = useInfiniteScroll(
    loadMoreData,
    hasMoreData && !loadingMore,
    loadingMore || loading,
    '100px'
  );

  // ─────────────────────────────────────────────────────────
  // Back to Top Button
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  // ─────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────
  const handleSubmitPO = async (poName: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const res = await fetch(`/api/purchase/orders/${poName}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await res.json();
      if (result.success) fetchOrders(true);
      else setSubmitError(result.message || 'Gagal mengajukan PO');
    } catch {
      setSubmitError('Terjadi kesalahan saat mengajukan PO');
    }
  };

  const handleReceivePO = async (poName: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const res = await fetch(`/api/purchase/orders/${poName}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await res.json();
      if (result.success) fetchOrders(true);
      else setError(result.message || 'Gagal menerima PO');
    } catch {
      setError('Error menerima PO');
    }
  };

  const handleCompletePO = async (poName: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const res = await fetch(`/api/purchase/orders/${poName}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await res.json();
      if (result.success) fetchOrders(true);
      else setError(result.message || 'Gagal menyelesaikan PO');
    } catch {
      setError('Error menyelesaikan PO');
    }
  };

  const fetchDataForPrint = async (poName: string) => {
    setLoadingPrintData(true);
    try {
      const response = await fetch(`/api/purchase/orders/${poName}`);
      const result = await response.json();
      
      if (result.success) {
        const poData = result.data;
        
        // Fetch supplier address separately if not available
        let supplierAddress = poData.address_display || 
                             poData.supplier_address || 
                             poData.shipping_address || 
                             '';
        
        // If no address found, try to fetch from supplier
        if (!supplierAddress && poData.supplier) {
          try {
            const supplierResponse = await fetch(`/api/purchase/suppliers/${encodeURIComponent(poData.supplier)}`);
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
          ...poData,
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

  const handlePrint = async (poName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await fetchDataForPrint(poName);
    setShowPrintPreview(true);
  };

  const handleCardClick = (poName: string) => {
    if (poName) router.push(`/purchase-orders/poMain?name=${poName}`);
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
  // Initial Loading - Menggunakan reusable SkeletonList
  // ─────────────────────────────────────────────────────────
  if (loading && orders.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900">Pesanan Pembelian</h1>
        </div>
        <div className="px-4 py-4 sm:px-6 lg:px-8">
          {/* ✅ Gunakan SkeletonList dengan mode auto */}
          <SkeletonList mode="auto" isMobile={isMobile} count={10} />
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <ErrorDialog isOpen={!!submitError} title="Gagal Mengajukan" message={submitError} onClose={() => setSubmitError('')} />

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6 lg:px-8 sticky top-0 z-30">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Pesanan Pembelian</h1>
          <button
            onClick={() => router.push('/purchase-orders/poMain')}
            className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
          >
            <Plus className="w-4 h-4 mr-1" /> Buat Pesanan
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {[
            { label: 'Cari Pemasok', value: supplierFilter, onChange: setSupplierFilter, placeholder: 'Nama pemasok...' },
            { label: 'No. Dokumen', value: documentNumberFilter, onChange: setDocumentNumberFilter, placeholder: 'No. PO...' },
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
                value={dateFilter[key]}
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

      {/* Error Banner */}
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
            <span className="font-medium">{orders.length}</span> dari <span className="font-medium">{totalRecords}</span> data
            {useInfiniteScrollMode && hasMoreData && (
              <span className="ml-2 text-indigo-600">• Scroll untuk load lebih banyak</span>
            )}
          </div>

          {/* Table Header - Desktop Only */}
          {!isMobile && orders.length > 0 && (
            <div className="hidden sm:flex items-center px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase">
              <div className="flex-1 min-w-0">
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-3">No. PO / Pemasok</div>
                  <div className="col-span-2">Tgl Transaksi</div>
                  <div className="col-span-2">Tgl Jadwal</div>
                  <div className="col-span-2 text-right">Total</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-1 text-right">Aksi</div>
                </div>
              </div>
            </div>
          )}

          {/* Orders List */}
          <ul className="divide-y divide-gray-100">
            {orders.map((order) => (
              <li
                key={order.name}
                onClick={() => handleCardClick(order.name)}
                className="cursor-pointer hover:bg-indigo-50/50 transition-colors"
              >
                <div className="px-4 py-4">
                  {isMobile ? (
                    // ─── Mobile Card View ───
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-indigo-600 truncate">{order.name}</p>
                          <p className="text-xs text-gray-600 mt-0.5 truncate">{order.supplier_name}</p>
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusBadgeClass(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                        <div>📅 {order.transaction_date}</div>
                        <div>📆 {order.schedule_date}</div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <span className="text-sm font-semibold text-gray-900">
                          {order.currency} {order.grand_total.toLocaleString('id-ID')}
                        </span>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={(e) => handlePrint(order.name, e)} 
                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" 
                            title="Cetak"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                          {order.status === 'Draft' && (
                            <button 
                              onClick={(e) => handleSubmitPO(order.name, e)} 
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                            >
                              Ajukan
                            </button>
                          )}
                          {order.status === 'Submitted' && (
                            <button 
                              onClick={(e) => handleReceivePO(order.name, e)} 
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700"
                            >
                              Terima
                            </button>
                          )}
                          {order.status === 'To Receive' && (
                            <button 
                              onClick={(e) => handleCompletePO(order.name, e)} 
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                            >
                              Selesai
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    // ─── Desktop Table Row ───
                    <div className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-3 min-w-0">
                        <p className="text-sm font-semibold text-indigo-600 truncate">{order.name}</p>
                        <p className="text-xs text-gray-600 mt-0.5 truncate">{order.supplier_name}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm text-gray-900">{order.transaction_date}</p>
                        <p className="text-xs text-gray-500">Transaksi</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm text-gray-900">{order.schedule_date}</p>
                        <p className="text-xs text-gray-500">Jadwal</p>
                      </div>
                      <div className="col-span-2 text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          {order.currency} {order.grand_total.toLocaleString('id-ID')}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full border ${getStatusBadgeClass(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                      </div>
                      <div className="col-span-1">
                        <div className="flex items-center justify-end gap-1">
                          <button 
                            onClick={(e) => handlePrint(order.name, e)} 
                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" 
                            title="Cetak"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                          {order.status === 'Draft' && (
                            <button 
                              onClick={(e) => handleSubmitPO(order.name, e)} 
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg" 
                              title="Ajukan"
                            >
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

            {/* ✅ Gunakan reusable SkeletonCard untuk loading more */}
            {loadingMore && useInfiniteScrollMode && (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            )}

            {/* ✅ Sentinel dari reusable hook useInfiniteScroll */}
            {useInfiniteScrollMode && hasMoreData && (
              <div ref={infiniteScrollSentinelRef} className="h-10"></div>
            )}
          </ul>

          {/* Empty State */}
          {orders.length === 0 && !loading && (
            <div className="text-center py-16 px-4">
              <FileText className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4 text-sm text-gray-500">Tidak ada pesanan pembelian yang ditemukan</p>
              <button 
                onClick={() => router.push('/purchase-orders/poMain')} 
                className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100"
              >
                + Buat Pesanan Baru
              </button>
            </div>
          )}

          {/* Load More Button (Mobile Fallback) */}
          {useInfiniteScrollMode && hasMoreData && !loadingMore && orders.length > 0 && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-center">
              <button
                onClick={handleLoadMoreClick}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                <Loader2 className="h-4 w-4" />
                Load More ({totalRecords - orders.length} remaining)
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
          {!hasMoreData && orders.length > 0 && (
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

      {/* Print Preview Modal */}
      {showPrintPreview && printData && !loadingPrintData && (
        <PrintPreviewModal
          title={`Purchase Order - ${printData.name}`}
          onClose={() => {
            setShowPrintPreview(false);
            setPrintData(null);
          }}
          paperMode="continuous"
        >
          <PurchaseOrderPrint
            data={printData}
            companyName={selectedCompany}
          />
        </PrintPreviewModal>
      )}
    </div>
  );
}