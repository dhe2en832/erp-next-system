'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoadingSpinner from '../../components/LoadingSpinner';
import Pagination from '../../components/Pagination';
import { formatDate, parseDate } from '../../../utils/format';
import BrowserStyleDatePicker from '../../../components/BrowserStyleDatePicker';
import { Printer, FileText, Truck, CreditCard, Send, ArrowUp, Loader2 } from 'lucide-react';
import ErrorDialog from '../../../components/ErrorDialog';
import PrintPreviewModal from '../../../components/print/PrintPreviewModal';
import SalesOrderPrint, { SalesOrderPrintProps } from '../../../components/print/SalesOrderPrint';

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
// Types
// ─────────────────────────────────────────────────────────────
interface SalesOrder {
  name: string;
  customer: string;
  customer_name: string;
  transaction_date: string;
  grand_total: number;
  status: string;
  delivery_date: string;
  creation?: string;
  custom_notes_so?: string;
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
// Status Mapping: ERPNext Value (EN) → Indonesian Label (UI)
// ─────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  'Draft': 'Draft',
  'Submitted': 'Diajukan',
  'To Deliver and Bill': 'Belum Dikirim & Difaktur',
  'To Deliver': 'Belum Dikirim',
  'To Bill': 'Belum Difaktur',
  'Completed': 'Selesai',
  'Cancelled': 'Dibatalkan',
};

const STATUS_COLORS: Record<string, string> = {
  'Draft': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Submitted': 'bg-green-100 text-green-800 border-green-200',
  'To Deliver and Bill': 'bg-purple-100 text-purple-800 border-purple-200',
  'To Deliver': 'bg-orange-100 text-orange-800 border-orange-200',
  'To Bill': 'bg-pink-100 text-pink-800 border-pink-200',
  'Completed': 'bg-blue-100 text-blue-800 border-blue-200',
  'Cancelled': 'bg-red-100 text-red-800 border-red-200',
};

// Helper: Get Indonesian label
const getStatusLabel = (status: string): string => {
  return STATUS_LABELS[status] || status;
};

// Helper: Get badge color class
const getStatusBadgeClass = (status: string): string => {
  return STATUS_COLORS[status] || 'bg-gray-100 text-gray-800 border-gray-200';
};

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
export default function SalesOrderList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile(768);

  // Dynamic pageSize: Mobile 10, Desktop 20
  const pageSize = isMobile ? 10 : 20;

  // Use infinite scroll only on mobile
  const useInfiniteScrollMode = isMobile;

  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [dateFilter, setDateFilter] = useState({
    from_date: formatDate(new Date(Date.now() - 86400000)),
    to_date: formatDate(new Date()),
  });
  const [nameFilter, setNameFilter] = useState('');
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
  const [printOrderData, setPrintOrderData] = useState<SalesOrderPrintProps['data'] | null>(null);
  const [loadingPrintData, setLoadingPrintData] = useState(false);

  // Ref untuk sentinel infinite scroll
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  
  // Ref untuk tracking pagination source (prevent race conditions)
  const pageChangeSourceRef = useRef<'pagination' | 'filter' | 'init'>('init');

  // ─────────────────────────────────────────────────────────
  // Sync URL dengan page state (untuk bookmark/share)
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    const pageFromUrl = searchParams.get('page');
    if (pageFromUrl && !isNaN(parseInt(pageFromUrl))) {
      const pageNum = parseInt(pageFromUrl);
      if (pageNum >= 1) {
        setCurrentPage(pageNum);
      }
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
  // Fetch Data
  // ─────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async (reset = false) => {
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

      // ✅ Sort by creation date descending (newest first)
      params.append('order_by', 'creation desc, transaction_date desc');
      if (companyToUse) params.append('company', companyToUse);
      if (nameFilter) params.append('search', nameFilter);
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

      const response = await fetch(`/api/sales/orders?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        const ordersData = result.data || [];
        // console.log('Unique statuses:', [...new Set(ordersData.map((o: SalesOrder) => o.status))]);


        if (result.total_records !== undefined) {
          setTotalRecords(result.total_records);
          setTotalPages(Math.ceil(result.total_records / pageSize));
          setHasMoreData(currentPage < Math.ceil(result.total_records / pageSize));
        } else {
          setTotalRecords(ordersData.length);
          setTotalPages(1);
          setHasMoreData(false);
        }

        ordersData.sort((a: SalesOrder, b: SalesOrder) => {
          const dateA = new Date(a.creation || a.transaction_date || '1970-01-01');
          const dateB = new Date(b.creation || b.transaction_date || '1970-01-01');
          return dateB.getTime() - dateA.getTime();
        });

        if (reset) {
          setOrders(ordersData);
        } else {
          // Append untuk infinite scroll
          setOrders(prev => {
            const existingNames = new Set(prev.map(o => o.name));
            const newOrders = ordersData.filter((o: SalesOrder) => !existingNames.has(o.name));
            return [...prev, ...newOrders];
          });
        }

        setError(ordersData.length === 0 && reset ? `Tidak ada pesanan penjualan untuk perusahaan: ${companyToUse}` : '');
      } else {
        setError(result.message || 'Gagal memuat pesanan penjualan');
      }
    } catch {
      setError('Gagal memuat pesanan penjualan');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [currentPage, pageSize, dateFilter, nameFilter, statusFilter, documentNumberFilter, selectedCompany]);

  // ─────────────────────────────────────────────────────────
  // Effects - FIXED VERSION - Prevent race conditions
  // ─────────────────────────────────────────────────────────
  
  // Reset page when filters change
  useEffect(() => {
    pageChangeSourceRef.current = 'filter';
    setCurrentPage(1);
  }, [dateFilter, nameFilter, statusFilter, documentNumberFilter]);

  // Fetch when page changes (separated from filter logic)
  useEffect(() => {
    // Always reset for desktop pagination
    // Only append for mobile infinite scroll when page > 1
    const shouldReset = !useInfiniteScrollMode || currentPage === 1;
    fetchOrders(shouldReset);
     
  }, [currentPage, useInfiniteScrollMode]);

  // Trigger fetch when filters change (after page reset)
  useEffect(() => {
    if (pageChangeSourceRef.current === 'filter') {
      const shouldReset = !useInfiniteScrollMode || currentPage === 1;
      fetchOrders(shouldReset);
    }
     
  }, [dateFilter, nameFilter, statusFilter, documentNumberFilter]);

  // ─────────────────────────────────────────────────────────
  // Infinite Scroll Handler (Mobile Only)
  // ─────────────────────────────────────────────────────────
  const loadMoreData = useCallback(() => {
    if (!loadingMore && hasMoreData && useInfiniteScrollMode) {
      setCurrentPage(prev => {
        const nextPage = prev + 1;
        if (nextPage <= totalPages) {
          return nextPage;
        }
        return prev;
      });
    }
  }, [loadingMore, hasMoreData, useInfiniteScrollMode, totalPages]);

  // Setup intersection observer untuk infinite scroll
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
  const handleSubmitSalesOrder = async (orderName: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const res = await fetch(`/api/sales/orders/${orderName}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await res.json();
      if (result.success) fetchOrders(true);
      else setSubmitError(result.message || 'Gagal mengajukan Sales Order');
    } catch {
      setSubmitError('Terjadi kesalahan saat mengajukan Sales Order');
    }
  };

  const handleCreateDeliveryNote = async (orderName: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/sales/delivery-notes/from-sales-order/${orderName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await res.json();
      if (result.success) {
        const dnName = result.data?.name || 'Unknown';
        alert(`✅ Delivery Note ${dnName} created!\n\n📦 Status: Draft\n\n🔔 Next: Submit untuk mengurangi stok`);
        fetchOrders(true);
      } else {
        alert(`❌ Gagal: ${result.message}`);
      }
    } catch {
      alert('❌ Error creating Delivery Note');
    }
  };

  const handleCreateSalesInvoice = async (orderName: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const res = await fetch(`/api/sales/invoices/from-sales-order/${orderName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await res.json();
      if (result.success) {
        const invName = result.data?.name || 'Unknown';
        alert(`✅ Sales Invoice ${invName} created!\n\n💰 Jurnal aktif setelah submit`);
        fetchOrders(true);
      } else {
        alert(`❌ Gagal: ${result.message}`);
      }
    } catch {
      alert('❌ Error creating Sales Invoice');
    }
  };

  const fetchOrderForPrint = async (orderName: string) => {
    setLoadingPrintData(true);
    try {
      const response = await fetch(`/api/sales/orders/${orderName}`);
      const result = await response.json();
      if (result.success) {
        const orderData = result.data;
        
        // Fetch customer address separately if not available
        let customerAddress = orderData.address_display || 
                             orderData.customer_address || 
                             orderData.shipping_address_name || 
                             '';
        
        // If no address found, try to fetch from customer
        if (!customerAddress && orderData.customer) {
          try {
            const customerResponse = await fetch(`/api/sales/customers/customer/${encodeURIComponent(orderData.customer)}`);
            const customerResult = await customerResponse.json();
            if (customerResult.success && customerResult.data) {
              customerAddress = customerResult.data.primary_address || 
                              customerResult.data.customer_primary_address ||
                              '';
            }
          } catch (err) {
            console.error('Failed to fetch customer address:', err);
          }
        }
        
        // Debug: Log available address fields
        // console.log('Order data for print:', {
        //   address_display: orderData.address_display,
        //   customer_address: orderData.customer_address,
        //   shipping_address_name: orderData.shipping_address_name,
        //   fetched_customer_address: customerAddress,
        // });
        
        setPrintOrderData({
          ...orderData,
          customer_address: customerAddress,
        });
      } else {
        alert('Gagal memuat data pesanan untuk print');
      }
    } catch (error) {
      console.error('Error fetching order for print:', error);
      alert('Terjadi kesalahan saat memuat data pesanan');
    } finally {
      setLoadingPrintData(false);
    }
  };

  const handlePrint = async (orderName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await fetchOrderForPrint(orderName);
    setShowPrintPreview(true);
  };

  const handleCardClick = (orderName: string) => {
    if (orderName) router.push(`/sales-order/soMain?name=${orderName}`);
  };

  const handleResetFilters = () => {
    setDateFilter({
      from_date: formatDate(new Date(Date.now() - 86400000)),
      to_date: formatDate(new Date()),
    });
    setNameFilter('');
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
  // Skeleton Loader Component
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
  // Initial Loading
  // ─────────────────────────────────────────────────────────
  if (loading && orders.length === 0) {
    return <LoadingSpinner message="Memuat Pesanan Penjualan..." />;
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
          <h1 className="text-2xl font-bold text-gray-900">Pesanan Penjualan</h1>
          <button
            onClick={() => router.push('/sales-order/soMain')}
            className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
          >
            + Buat Pesanan
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {[
            { label: 'Cari Nama', value: nameFilter, onChange: setNameFilter, placeholder: 'Nama pelanggan...' },
            { label: 'No. Dokumen', value: documentNumberFilter, onChange: setDocumentNumberFilter, placeholder: 'Nomor pesanan...' },
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
              <option value="To Deliver and Bill">Belum Dikirim & Difaktur</option>
              <option value="To Deliver">Belum Dikirim</option>
              <option value="To Bill">Belum Difaktur</option>
              <option value="Completed">Selesai</option>
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
                  <div className="col-span-3">Dokumen / Pelanggan</div>
                  <div className="col-span-2">Tanggal</div>
                  <div className="col-span-2">Pengiriman</div>
                  <div className="col-span-2 text-right">Total</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-1 text-right">Aksi</div>
                </div>
              </div>
            </div>
          )}

          {/* Cards */}
          <ul className="divide-y divide-gray-100">
            {orders.map((order) => (
              <li
                key={order.name}
                onClick={() => handleCardClick(order.name)}
                className="cursor-pointer hover:bg-indigo-50/50 transition-colors"
              >
                <div className="px-4 py-4">
                  {isMobile ? (
                    // ─── Mobile Card ───
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-indigo-600 truncate">{order.name}</p>
                          <p className="text-xs text-gray-600 mt-0.5 truncate">{order.customer_name}</p>
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusBadgeClass(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                        <div>📅 {order.transaction_date}</div>
                        <div>🚚 {order.delivery_date}</div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <span className="text-sm font-semibold text-gray-900">{formatCurrency(order.grand_total)}</span>
                        <div className="flex items-center gap-1">
                          <button onClick={(e) => handlePrint(order.name, e)} className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Cetak">
                            <Printer className="h-4 w-4" />
                          </button>
                          {order.status === 'Draft' && (
                            <button onClick={(e) => handleSubmitSalesOrder(order.name, e)} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700">
                              <Send className="h-3 w-3" /> Ajukan
                            </button>
                          )}
                          {order.status === 'Submitted' && (
                            <>
                              <button onClick={(e) => handleCreateDeliveryNote(order.name, e)} className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg" title="Surat Jalan">
                                <Truck className="h-4 w-4" />
                              </button>
                              <button onClick={(e) => handleCreateSalesInvoice(order.name, e)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Faktur">
                                <CreditCard className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      {order.custom_notes_so && <p className="text-xs text-gray-400 italic truncate">📝 {order.custom_notes_so}</p>}
                    </div>
                  ) : (
                    // ─── Desktop Row ───
                    <div className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-3 min-w-0">
                        <p className="text-sm font-semibold text-indigo-600 truncate">{order.name}</p>
                        <p className="text-xs text-gray-600 mt-0.5 truncate">{order.customer_name}</p>
                        {order.custom_notes_so && <p className="text-xs text-gray-400 truncate mt-1">📝 {order.custom_notes_so}</p>}
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm text-gray-900">{order.transaction_date}</p>
                        <p className="text-xs text-gray-500">Transaksi</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm text-gray-900">{order.delivery_date}</p>
                        <p className="text-xs text-gray-500">Pengiriman</p>
                      </div>
                      <div className="col-span-2 text-right">
                        <p className="text-sm font-semibold text-gray-900">{formatCurrency(order.grand_total)}</p>
                      </div>
                      <div className="col-span-2">
                        <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full border ${getStatusBadgeClass(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                      </div>
                      <div className="col-span-1">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={(e) => handlePrint(order.name, e)} className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Cetak">
                            <Printer className="h-4 w-4" />
                          </button>
                          {order.status === 'Draft' && (
                            <button onClick={(e) => handleSubmitSalesOrder(order.name, e)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg" title="Ajukan">
                              <Send className="h-4 w-4" />
                            </button>
                          )}
                          {order.status === 'Submitted' && (
                            <>
                              <button onClick={(e) => handleCreateDeliveryNote(order.name, e)} className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg" title="Surat Jalan">
                                <Truck className="h-4 w-4" />
                              </button>
                              <button onClick={(e) => handleCreateSalesInvoice(order.name, e)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Faktur">
                                <CreditCard className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </li>
            ))}

            {/* Skeleton Loaders saat loading more */}
            {loadingMore && useInfiniteScrollMode && (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            )}

            {/* Sentinel untuk infinite scroll */}
            {useInfiniteScrollMode && hasMoreData && (
              <div ref={sentinelRef} className="h-10"></div>
            )}
          </ul>

          {/* Empty State */}
          {orders.length === 0 && !loading && (
            <div className="text-center py-16 px-4">
              <FileText className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4 text-sm text-gray-500">Tidak ada pesanan penjualan yang ditemukan</p>
              <button onClick={() => router.push('/sales-order/soMain')} className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100">
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
      {showPrintPreview && printOrderData && !loadingPrintData && (
        <PrintPreviewModal
          title={`Sales Order - ${printOrderData.name}`}
          onClose={() => {
            setShowPrintPreview(false);
            setPrintOrderData(null);
          }}
          paperMode="continuous"
        >
          <SalesOrderPrint
            data={printOrderData}
            companyName={selectedCompany}
          />
        </PrintPreviewModal>
      )}
    </div>
  );
}