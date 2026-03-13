'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoadingSpinner from '../../components/LoadingSpinner';
import Pagination from '../../components/Pagination';
import { formatDate, parseDate } from '../../../utils/format';
import BrowserStyleDatePicker from '../../../components/BrowserStyleDatePicker';
import { Printer, FileText, Send, ArrowUp, Loader2, CreditCard } from 'lucide-react';
import ErrorDialog from '../../../components/ErrorDialog';
import PrintPreviewModal from '../../../components/print/PrintPreviewModal';
import SalesInvoicePrint, { SalesInvoicePrintProps } from '../../../components/print/SalesInvoicePrint';

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
// Sales Invoice status: Draft, Submitted, Unpaid, Paid, Overdue, Cancelled
// ─────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  'Draft': 'Draft',
  'Submitted': 'Diajukan',
  'Unpaid': 'Belum Lunas',
  'Paid': 'Lunas',
  'Overdue': 'Jatuh Tempo',
  'Cancelled': 'Dibatalkan',
  'Internal Transfer': 'Transfer Internal',
};

const STATUS_COLORS: Record<string, string> = {
  'Draft': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Submitted': 'bg-blue-100 text-blue-800 border-blue-200',
  'Unpaid': 'bg-red-100 text-red-800 border-red-200',
  'Paid': 'bg-green-100 text-green-800 border-green-200',
  'Overdue': 'bg-orange-100 text-orange-800 border-orange-200',
  'Cancelled': 'bg-gray-100 text-gray-800 border-gray-200',
  'Internal Transfer': 'bg-purple-100 text-purple-800 border-purple-200',
};

const getStatusLabel = (status: string): string => STATUS_LABELS[status] || status;
const getStatusBadgeClass = (status: string): string => STATUS_COLORS[status] || 'bg-gray-100 text-gray-800 border-gray-200';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
interface InvoiceItem {
  item_code: string;
  item_name: string;
  qty: number;
  rate: number;
  amount: number;
  income_account: string;
  cost_center: string;
  warehouse: string;
  delivery_note?: string;
  sales_order?: string;
  so_detail?: string;
  dn_detail?: string;
  custom_komisi_sales?: number;
}

interface Invoice {
  name: string;
  customer: string;
  customer_name: string;
  posting_date: string;
  due_date?: string;  // Optional - some invoices might not have due date
  grand_total: number;
  outstanding_amount: number;
  paid_amount: number;
  status: string;
  delivery_note?: string;
  items?: InvoiceItem[];
  custom_total_komisi_sales?: number;
  custom_notes_si?: string;
  discount_amount?: number;
  total_taxes_and_charges?: number;
  is_return?: number;
  customer_address?: string;
}

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
export default function SalesInvoiceList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile(768);
  
  // Dynamic pageSize: Mobile 10, Desktop 20
  const pageSize = isMobile ? 10 : 20;
  const useInfiniteScrollMode = isMobile;

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [dateFilter, setDateFilter] = useState({
    from_date: formatDate(new Date(Date.now() - 86400000)),
    to_date: formatDate(new Date()),
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [documentNumberFilter, setDocumentNumberFilter] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submittingInvoice, setSubmittingInvoice] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);

  // Print preview states
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [printData, setPrintData] = useState<SalesInvoicePrintProps['data'] | null>(null);
  const [loadingPrintData, setLoadingPrintData] = useState(false);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  
  // Ref untuk tracking pagination source (prevent race conditions)
  const pageChangeSourceRef = useRef<'pagination' | 'filter' | 'init'>('init');
  
  // Ref untuk tracking mount/navigation untuk forced refresh
  const hasInitialFetchRef = useRef(false);

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
  const fetchInvoices = useCallback(async (reset = false) => {
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
        'due_date',
        'grand_total',
        'outstanding_amount',
        'paid_amount',
        'status',
        'delivery_note',
        'custom_notes_si',
        'discount_amount',
        'total_taxes_and_charges',
        'is_return',
        'customer_address'
      ]));
      
      // ✅ SORTING: Data terbaru paling atas
      params.append('order_by', 'creation desc, posting_date desc');
      
      // ✅ BUILD FILTERS ARRAY UNTUK ERPNext (Format JSON)
      const filters: [string, string, string | number][] = [
        ["company", "=", companyToUse],
        ["is_return", "=", 0],  // ✅ EXCLUDE SALES RETURN
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
      if (searchTerm) {
        filters.push(["customer_name", "like", `%${searchTerm}%`]);
      }
      if (documentNumberFilter) {
        filters.push(["name", "like", `%${documentNumberFilter}%`]);
      }

      // Append filters sebagai JSON string (ERPNext requirement)
      params.append('filters', JSON.stringify(filters));

      // 🔍 DEBUG: Log filters yang dikirim ke API
      // console.log('🔍 ERPNext Filters:', JSON.stringify(filters));

      // Cache-busting: Add timestamp to prevent browser caching
      params.append('_t', Date.now().toString());

      const response = await fetch(`/api/sales/invoices?${params.toString()}`);
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
          setInvoices(filteredData);
        } else {
          // Append untuk infinite scroll (hindari duplikat)
          setInvoices(prev => {
            const existingNames = new Set(prev.map((o: Invoice) => o.name));
            const newItems = filteredData.filter((o: Invoice) => !existingNames.has(o.name));
            return [...prev, ...newItems];
          });
        }
        
        setError(filteredData.length === 0 && reset ? `Tidak ada faktur untuk perusahaan: ${companyToUse}` : '');
      } else {
        setError(data.message || 'Gagal memuat faktur penjualan');
      }
    } catch (err) {
      console.error('❌ Error fetching invoices:', err);
      setError('Gagal memuat faktur penjualan');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [selectedCompany, dateFilter, searchTerm, statusFilter, documentNumberFilter, currentPage, pageSize]);

  // ─────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────
  // Effects - FIXED VERSION - Prevent race conditions
  // ─────────────────────────────────────────────────────────
  
  // Reset page when filters change
  useEffect(() => {
    pageChangeSourceRef.current = 'filter';
    setCurrentPage(1);
  }, [dateFilter, searchTerm, statusFilter, documentNumberFilter]);

  // Fetch when page changes (separated from filter logic)
  useEffect(() => {
    // Skip if initial fetch from mount effect hasn't run yet
    if (!hasInitialFetchRef.current) return;
    
    // Always reset for desktop pagination
    // Only append for mobile infinite scroll when page > 1
    const shouldReset = !useInfiniteScrollMode || currentPage === 1;
    fetchInvoices(shouldReset);
     
  }, [currentPage, useInfiniteScrollMode]);

  // Trigger fetch when filters change (after page reset)
  useEffect(() => {
    // Skip if initial fetch from mount effect hasn't run yet
    if (!hasInitialFetchRef.current) return;
    
    if (pageChangeSourceRef.current === 'filter') {
      const shouldReset = !useInfiniteScrollMode || currentPage === 1;
      fetchInvoices(shouldReset);
    }
     
  }, [dateFilter, searchTerm, statusFilter, documentNumberFilter]);

  // ─────────────────────────────────────────────────────────
  // Forced Refresh on Component Mount (after navigation)
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    // Trigger a forced refresh when component mounts
    // This ensures fresh data when users navigate back to the list from detail view
    // The cache-busting parameter from Task 3.4 ensures we get fresh data from server
    if (!hasInitialFetchRef.current) {
      hasInitialFetchRef.current = true;
      fetchInvoices(true);
    }
     
  }, []); // Empty dependency array - runs once per mount

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
  const handleSubmitSalesInvoice = async (invoiceName: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      setSubmittingInvoice(invoiceName);
      const res = await fetch(`/api/sales/invoices/${invoiceName}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await res.json();
      if (result.success) {
        setSuccessMessage(`✅ Faktur Penjualan ${invoiceName} berhasil diajukan!`);
        fetchInvoices(true);
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        setSubmitError(result.message || 'Gagal mengajukan Faktur Penjualan');
      }
    } catch {
      setSubmitError('Terjadi kesalahan saat mengajukan Faktur Penjualan');
    } finally {
      setSubmittingInvoice(null);
    }
  };

  const fetchDataForPrint = async (invoiceName: string) => {
    setLoadingPrintData(true);
    try {
      const response = await fetch(`/api/sales/invoices/${invoiceName}`);
      const result = await response.json();
      
      if (result.success) {
        const invoiceData = result.data;
        
        // Fetch customer address separately if not available
        let customerAddress = invoiceData.address_display || 
                             invoiceData.customer_address || 
                             invoiceData.shipping_address_name || 
                             '';
        
        // If no address found, try to fetch from customer
        if (!customerAddress && invoiceData.customer) {
          try {
            const customerResponse = await fetch(`/api/sales/customers/customer/${encodeURIComponent(invoiceData.customer)}`);
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
        
        setPrintData({
          ...invoiceData,
          customer_address: customerAddress,
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

  const handlePrint = async (invoiceName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await fetchDataForPrint(invoiceName);
    setShowPrintPreview(true);
  };

  const handleCardClick = (invoiceName: string) => {
    if (invoiceName) router.push(`/invoice/siMain?name=${invoiceName}`);
  };

  const handleResetFilters = () => {
    setDateFilter({
      from_date: formatDate(new Date(Date.now() - 86400000)),
      to_date: formatDate(new Date()),
    });
    setSearchTerm('');
    setStatusFilter('');
    setDocumentNumberFilter('');
    setCurrentPage(1);
  };

  const handleLoadMoreClick = () => {
    if (!loadingMore && hasMoreData) {
      setCurrentPage(prev => Math.min(prev + 1, totalPages));
    }
  };

  // Helper: Hitung jumlah yang sudah dibayar
  const getPaidAmount = (invoice: Invoice): number => {
    return invoice.paid_amount || (invoice.grand_total - invoice.outstanding_amount) || 0;
  };

  // Helper: Hitung persentase pembayaran
  const getPaymentPercent = (invoice: Invoice): number => {
    if (!invoice.grand_total || invoice.grand_total <= 0) return 0;
    return Math.min((getPaidAmount(invoice) / invoice.grand_total) * 100, 100);
  };

  // Helper: Hitung selisih hari jatuh tempo dari hari ini
  const getDueInDays = (dueDate?: string): string | null => {
    if (!dueDate) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return `${Math.abs(diffDays)} hari yang lalu`;
    } else if (diffDays === 0) {
      return 'Hari ini';
    } else {
      return `${diffDays} hari lagi`;
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
  if (loading && invoices.length === 0) {
    return <LoadingSpinner message="Memuat Faktur Penjualan..." />;
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
          <h1 className="text-2xl font-bold text-gray-900">Faktur Penjualan</h1>
          <button
            onClick={() => router.push('/invoice/siMain')}
            className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
          >
            + Buat Faktur Baru
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {[
            { label: 'Cari Pelanggan', value: searchTerm, onChange: setSearchTerm, placeholder: 'Nama pelanggan...' },
            { label: 'No. Dokumen', value: documentNumberFilter, onChange: setDocumentNumberFilter, placeholder: 'Nomor faktur...' },
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
              <option value="Unpaid">Belum Lunas</option>
              <option value="Paid">Lunas</option>
              <option value="Overdue">Jatuh Tempo</option>
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
              <span className="font-medium">{invoices.length}</span> dari <span className="font-medium">{totalRecords}</span> data
            </div>
            {useInfiniteScrollMode && hasMoreData && (
              <span className="text-indigo-600">• Scroll untuk load lebih banyak</span>
            )}
          </div>

          {/* Table Header - Desktop Only */}
          {!isMobile && invoices.length > 0 && (
            <div className="hidden sm:flex items-center px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase">
              <div className="flex-1 min-w-0">
                <div className="grid grid-cols-13 gap-4">
                  <div className="col-span-2">Dokumen / Pelanggan</div>
                  <div className="col-span-1">Status</div>
                  <div className="col-span-2">Tanggal</div>
                  <div className="col-span-2">Jatuh Tempo</div>
                  <div className="col-span-2">Tenggang</div>
                  <div className="col-span-2 text-right">Total</div>
                  <div className="col-span-2 text-right">Pembayaran</div>
                  <div className="col-span-2 text-right">Aksi</div>
                </div>
              </div>
            </div>
          )}

          {/* Cards / Rows List */}
          <ul className="divide-y divide-gray-100">
            {invoices.map((invoice) => (
              <li 
                key={invoice.name}
                onClick={() => handleCardClick(invoice.name)}
                className="cursor-pointer hover:bg-indigo-50/50 transition-colors"
              >
                <div className="px-4 py-4">
                  {isMobile ? (
                    // ─── Mobile Card Layout ───
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-indigo-600 truncate">{invoice.name}</p>
                          <p className="text-xs text-gray-600 mt-0.5 truncate">{invoice.customer_name || invoice.customer}</p>
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusBadgeClass(invoice.status)}`}>
                          {getStatusLabel(invoice.status)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                        <div>📅 {invoice.posting_date}</div>
                        <div>⏰ {invoice.due_date || '-'}</div>
                      </div>
                      {getDueInDays(invoice.due_date) && (
                        <div className={`text-xs font-medium ${
                          getDueInDays(invoice.due_date)?.includes('yang lalu') 
                            ? 'text-red-600' 
                            : getDueInDays(invoice.due_date) === 'Hari ini'
                            ? 'text-orange-600'
                            : 'text-gray-700'
                        }`}>
                          ⏳ {getDueInDays(invoice.due_date)}
                        </div>
                      )}
                      <div className="pt-2 border-t border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-gray-900">{formatCurrency(invoice.grand_total)}</span>
                          <span className={`text-xs font-medium ${invoice.outstanding_amount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                            Sisa: {formatCurrency(invoice.outstanding_amount)}
                          </span>
                        </div>
                        {/* Payment Progress Bar */}
                        {invoice.grand_total && invoice.grand_total > 0 && (
                          <div className="w-full">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${getPaymentPercent(invoice)}%` }}
                              ></div>
                            </div>
                            <div className="text-xs text-gray-500 mt-1 text-right">
                              {Math.round(getPaymentPercent(invoice))}% Lunas
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-1">
                          <button onClick={(e) => handlePrint(invoice.name, e)} className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Cetak">
                            <Printer className="h-4 w-4" />
                          </button>
                          {invoice.status === 'Draft' && (
                            <button 
                              onClick={(e) => handleSubmitSalesInvoice(invoice.name, e)} 
                              disabled={submittingInvoice === invoice.name}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                            >
                              {submittingInvoice === invoice.name ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Send className="h-3 w-3" />
                              )}
                              {submittingInvoice === invoice.name ? '...' : 'Ajukan'}
                            </button>
                          )}
                        </div>
                        {invoice.status !== 'Draft' && invoice.status !== 'Cancelled' && (
                          <button className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100">
                            <CreditCard className="h-3 w-3" />
                            Bayar
                          </button>
                        )}
                      </div>
                      {invoice.custom_notes_si && <p className="text-xs text-gray-400 italic truncate">📝 {invoice.custom_notes_si}</p>}
                    </div>
                  ) : (
                    // ─── Desktop Row Layout ───
                    <div className="grid grid-cols-13 gap-4 items-center">
                      <div className="col-span-2 min-w-0">
                        <p className="text-sm font-semibold text-indigo-600 truncate">{invoice.name}</p>
                        <p className="text-xs text-gray-600 mt-0.5 truncate">{invoice.customer_name || invoice.customer}</p>
                        {invoice.custom_notes_si && <p className="text-xs text-gray-400 truncate mt-1">📝 {invoice.custom_notes_si}</p>}
                      </div>
                      <div className="col-span-1">
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusBadgeClass(invoice.status)}`}>
                          {getStatusLabel(invoice.status)}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm text-gray-900">{invoice.posting_date}</p>
                        <p className="text-xs text-gray-500">Posting</p>
                      </div>
                      <div className="col-span-2">
                        {invoice.due_date ? (
                          <>
                            <p className={`text-sm ${new Date(invoice.due_date) < new Date() && invoice.outstanding_amount > 0 ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                              {invoice.due_date}
                            </p>
                            <p className="text-xs text-gray-500">Jatuh Tempo</p>
                          </>
                        ) : (
                          <p className="text-sm text-gray-400">-</p>
                        )}
                      </div>
                      <div className="col-span-2">
                        {getDueInDays(invoice.due_date) ? (
                          <>
                            <p className={`text-sm font-medium ${
                              getDueInDays(invoice.due_date)?.includes('yang lalu') 
                                ? 'text-red-600' 
                                : getDueInDays(invoice.due_date) === 'Hari ini'
                                ? 'text-orange-600'
                                : 'text-gray-700'
                            }`}>
                              {getDueInDays(invoice.due_date)}
                            </p>
                            <p className="text-xs text-gray-500">Tenggang</p>
                          </>
                        ) : (
                          <p className="text-sm text-gray-400">-</p>
                        )}
                      </div>
                      <div className="col-span-2 text-right">
                        <p className="text-sm font-semibold text-gray-900">{formatCurrency(invoice.grand_total)}</p>
                      </div>
                      <div className="col-span-2 text-right">
                        <p className={`text-sm font-medium ${invoice.outstanding_amount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                          {formatCurrency(invoice.outstanding_amount)}
                        </p>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                          <div
                            className="bg-green-600 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${getPaymentPercent(invoice)}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{Math.round(getPaymentPercent(invoice))}%</p>
                      </div>
                      <div className="col-span-2">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={(e) => handlePrint(invoice.name, e)} className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Cetak">
                            <Printer className="h-4 w-4" />
                          </button>
                          {invoice.status === 'Draft' && (
                            <button 
                              onClick={(e) => handleSubmitSalesInvoice(invoice.name, e)} 
                              disabled={submittingInvoice === invoice.name}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg disabled:text-gray-400" 
                              title="Ajukan"
                            >
                              {submittingInvoice === invoice.name ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Send className="h-4 w-4" />
                              )}
                            </button>
                          )}
                          {invoice.status !== 'Draft' && invoice.status !== 'Cancelled' && (
                            <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Bayar">
                              <CreditCard className="h-4 w-4" />
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
          {invoices.length === 0 && !loading && (
            <div className="text-center py-16 px-4">
              <FileText className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4 text-sm text-gray-500">Tidak ada faktur penjualan ditemukan</p>
              <button onClick={() => router.push('/invoice/siMain')} className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100">
                + Buat Faktur Baru
              </button>
            </div>
          )}

          {/* Load More Button (Mobile Fallback) */}
          {useInfiniteScrollMode && hasMoreData && !loadingMore && invoices.length > 0 && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-center">
              <button
                onClick={handleLoadMoreClick}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                <Loader2 className="h-4 w-4" />
                Load More ({totalRecords - invoices.length} remaining)
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
          {!hasMoreData && invoices.length > 0 && (
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
      {showPrintPreview && printData && !loadingPrintData && (
        <PrintPreviewModal
          title={`Sales Invoice - ${printData.name}`}
          onClose={() => {
            setShowPrintPreview(false);
            setPrintData(null);
          }}
          paperMode="continuous"
        >
          <SalesInvoicePrint
            data={printData}
            companyName={selectedCompany}
          />
        </PrintPreviewModal>
      )}
    </div>
  );
}