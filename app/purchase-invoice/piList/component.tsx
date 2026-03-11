'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Printer, 
  FileText, 
  ArrowUp, 
  Loader2, 
  Plus, 
  CreditCard, 
  AlertCircle 
} from 'lucide-react';

// ✅ Import reusable hooks & components
import { useIsMobile, useInfiniteScroll } from '@/hooks';
import {
  Pagination,
  ErrorDialog,
  BrowserStyleDatePicker,
  SkeletonCard,
  SkeletonList,
} from '@/components';
import PrintPreviewModal from '../../../components/print/PrintPreviewModal'; 
import PurchaseInvoicePrint, { PurchaseInvoicePrintProps } from '../../../components/print/PurchaseInvoicePrint';

import { formatDate, parseDate } from '../../../utils/format';

export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
interface PurchaseInvoice {
  name: string;
  supplier: string;
  supplier_name: string;
  posting_date: string;
  due_date: string;
  grand_total: number;
  outstanding_amount: number;
  status: string;
  currency: string;
  discount_amount?: number;
  total_taxes_and_charges?: number;
  creation?: string;
  company?: string;
}

// ─────────────────────────────────────────────────────────────
// Status Mapping: English (DB) → Indonesian (UI)
// ─────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  'Draft': 'Draft',
  'Submitted': 'Diajukan',
  'Paid': 'Lunas',
  'Unpaid': 'Belum Lunas',
  'Overdue': 'Jatuh Tempo',
  'Cancelled': 'Dibatalkan',
  'Return Issued': 'Retur Dikirim',
  'Debit Note Issued': 'Nota Debit Dikirim',
};

const STATUS_COLORS: Record<string, string> = {
  'Draft': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Submitted': 'bg-blue-100 text-blue-800 border-blue-200',
  'Paid': 'bg-green-100 text-green-800 border-green-200',
  'Unpaid': 'bg-orange-100 text-orange-800 border-orange-200',
  'Overdue': 'bg-red-100 text-red-800 border-red-200',
  'Cancelled': 'bg-gray-100 text-gray-800 border-gray-200',
  'Return Issued': 'bg-purple-100 text-purple-800 border-purple-200',
  'Debit Note Issued': 'bg-indigo-100 text-indigo-800 border-indigo-200',
};

const getStatusLabel = (status: string): string => STATUS_LABELS[status] || status;
const getStatusBadgeClass = (status: string): string =>
  STATUS_COLORS[status] || 'bg-gray-100 text-gray-800 border-gray-200';

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
export default function PurchaseInvoiceList() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ✅ Gunakan reusable hook
  const isMobile = useIsMobile(768);
  const pageSize = isMobile ? 10 : 20;
  const useInfiniteScrollMode = isMobile;

  // ─────────────────────────────────────────────────────────
  // State Management
  // ─────────────────────────────────────────────────────────
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [dateFilter, setDateFilter] = useState({
    from_date: '',
    to_date: ''
  });
  const [documentNumberFilter, setDocumentNumberFilter] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [error, setError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);

  // Debounce for search
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);



  // Print preview states
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [printData, setPrintData] = useState<PurchaseInvoicePrintProps['data'] | null>(null);
  const [loadingPrintData, setLoadingPrintData] = useState(false);
  
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
  const fetchInvoices = useCallback(async (reset = false) => {
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
      params.append('limit_start', ((currentPage - 1) * pageSize).toString());

      // 🔥 WAJIB: Urutkan dari yang terbaru (creation & posting_date descending)
      params.append('order_by', 'creation desc, posting_date desc');

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

      const response = await fetch(`/api/purchase/invoices?${params.toString()}`, {
        credentials: 'include',
      });
      const result = await response.json();

      if (result.success) {
        const invoicesData = result.data || [];

        // Handle pagination metadata
        if (result.total_records !== undefined) {
          setTotalRecords(result.total_records);
          setTotalPages(Math.ceil(result.total_records / pageSize));
          setHasMoreData(currentPage < Math.ceil(result.total_records / pageSize));
        } else {
          setTotalRecords(invoicesData.length);
          setTotalPages(1);
          setHasMoreData(false);
        }

        // ✅ Secondary sort by creation date (fallback jika API tidak sorting)
        invoicesData.sort((a: PurchaseInvoice, b: PurchaseInvoice) => {
          const dateA = new Date(a.creation || a.posting_date || '1970-01-01');
          const dateB = new Date(b.creation || b.posting_date || '1970-01-01');
          return dateB.getTime() - dateA.getTime();
        });

        if (reset) {
          setInvoices(invoicesData);
        } else {
          // Append untuk infinite scroll (hindari duplikat)
          setInvoices(prev => {
            const existingNames = new Set(prev.map(o => o.name));
            const newInvoices = invoicesData.filter((o: PurchaseInvoice) => !existingNames.has(o.name));
            return [...prev, ...newInvoices];
          });
        }

        // Empty state message
        setError(invoicesData.length === 0 && reset ?
          `Tidak ada faktur pembelian untuk perusahaan: ${companyToUse}` : '');

      } else {
        // 🔥 Handle API error message
        setError(result.message || 'Gagal memuat faktur pembelian');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Gagal memuat faktur pembelian');
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
    fetchInvoices(shouldReset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, useInfiniteScrollMode]);

  // Trigger fetch when filters change (after page reset)
  useEffect(() => {
    if (pageChangeSourceRef.current === 'filter') {
      const shouldReset = !useInfiniteScrollMode || currentPage === 1;
      fetchInvoices(shouldReset);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter, supplierFilter, statusFilter, documentNumberFilter]);

  // ─────────────────────────────────────────────────────────
  // Debounce Search Handler
  // ─────────────────────────────────────────────────────────
  const handleSearchChange = useCallback((value: string) => {
    setSupplierFilter(value);

    if (searchTimeout) clearTimeout(searchTimeout);

    const newTimeout = setTimeout(() => {
      setCurrentPage(1);
      fetchInvoices(true);
    }, 500);

    setSearchTimeout(newTimeout);
  }, [searchTimeout, fetchInvoices]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) clearTimeout(searchTimeout);
    };
  }, [searchTimeout]);

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
  const handleSubmit = async (piName: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActionLoading(piName);
    setSubmitError('');

    try {
      const response = await fetch(`/api/purchase/invoices/${piName}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const result = await response.json();

      if (result.success) {
        setSuccessMessage(`Faktur Pembelian ${piName} berhasil diajukan!`);
        setShowSuccessDialog(true);
        fetchInvoices(true);

        setTimeout(() => setShowSuccessDialog(false), 3000);
      } else {
        setSubmitError(result.message || 'Gagal mengajukan Faktur Pembelian');
      }
    } catch {
      setSubmitError('Gagal mengajukan Faktur Pembelian');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateNew = () => {
    router.push('/purchase-invoice/piMain');
  };

  const fetchDataForPrint = async (invoiceName: string) => {
    setLoadingPrintData(true);
    try {
      const response = await fetch(`/api/purchase/invoices?id=${invoiceName}&company=${selectedCompany}`);
      const result = await response.json();
      
      if (result.success && result.data) {
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

  const handlePrint = async (invoiceName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await fetchDataForPrint(invoiceName);
    setShowPrintPreview(true);
  };

  const handleCardClick = (invoice: PurchaseInvoice) => {
    if (invoice.name) {
      const paramKey = invoice.status === 'Draft' ? 'id' : 'name';
      router.push(`/purchase-invoice/piMain?${paramKey}=${invoice.name}`);
    }
  };

  const handleResetFilters = () => {
    setDateFilter({
      from_date: formatDate(new Date(Date.now() - 86400000)),
      to_date: formatDate(new Date()),
    });
    setSupplierFilter('');
    setDocumentNumberFilter('');
    setStatusFilter('');
    setCurrentPage(1);
  };

  const handleLoadMoreClick = () => {
    if (!loadingMore && hasMoreData) {
      setCurrentPage(prev => Math.min(prev + 1, totalPages));
    }
  };

  // Helper: Check if invoice is overdue
  const isOverdue = (invoice: PurchaseInvoice) => {
    if (invoice.status !== 'Unpaid' || !invoice.due_date) return false;
    const today = new Date();
    const due = parseDate(invoice.due_date);
    if (!due) return false;
    return new Date(due) < today;
  };

  // Helper: Calculate days until/after due date
  const getDueDateInfo = (dueDate?: string) => {
    if (!dueDate) return null;
    const parsed = parseDate(dueDate);
    if (!parsed) return null;

    const today = new Date();
    const due = new Date(parsed);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { text: `${Math.abs(diffDays)} hari lalu`, overdue: true };
    if (diffDays === 0) return { text: 'Hari ini', overdue: false };
    return { text: `${diffDays} hari lagi`, overdue: false };
  };

  // ─────────────────────────────────────────────────────────
  // Initial Loading - Menggunakan reusable SkeletonList
  // ─────────────────────────────────────────────────────────
  if (loading && invoices.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900">Faktur Pembelian</h1>
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
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Faktur Pembelian</h1>
            <p className="text-sm text-gray-600">Daftar faktur pembelian & pembayaran</p>
          </div>
          <button
            onClick={() => router.push('/purchase-invoice/piMain')}
            className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
          >
            <Plus className="w-4 h-4 mr-1" /> Buat Faktur
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {[
            { label: 'Cari Pemasok', value: supplierFilter, onChange: handleSearchChange, placeholder: 'Nama pemasok...' },
            { label: 'No. Dokumen', value: documentNumberFilter, onChange: setDocumentNumberFilter, placeholder: 'No. Faktur...' },
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
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        </div>
      )}

      {/* List Container */}
      <div className="px-4 py-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

          {/* Progress Indicator */}
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs text-gray-600 flex items-center justify-between">
            <span>
              <span className="font-medium">{invoices.length}</span> dari <span className="font-medium">{totalRecords}</span> data
            </span>
            {useInfiniteScrollMode && hasMoreData && (
              <span className="text-indigo-600">• Scroll untuk load lebih banyak</span>
            )}
          </div>

          {/* Table Header - Desktop Only */}
          {!isMobile && invoices.length > 0 && (
            <div className="hidden sm:flex items-center px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase">
              <div className="flex-1 min-w-0">
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-3">No. Faktur / Pemasok</div>
                  <div className="col-span-2">Tanggal</div>
                  <div className="col-span-2">Jatuh Tempo</div>
                  <div className="col-span-2 text-right">Total</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-1 text-right">Aksi</div>
                </div>
              </div>
            </div>
          )}

          {/* Invoices List */}
          <ul className="divide-y divide-gray-100">
            {invoices.map((invoice) => {
              const dueInfo = getDueDateInfo(invoice.due_date);
              const overdue = isOverdue(invoice);

              return (
                <li
                  key={invoice.name}
                  onClick={() => handleCardClick(invoice)}
                  className="cursor-pointer hover:bg-indigo-50/50 transition-colors"
                >
                  <div className="px-4 py-4">
                    {isMobile ? (
                      // ─── Mobile Card View ───
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-indigo-600 truncate">{invoice.name}</p>
                            <p className="text-xs text-gray-600 mt-0.5 truncate">{invoice.supplier_name}</p>
                          </div>
                          <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusBadgeClass(invoice.status)}`}>
                            {getStatusLabel(invoice.status)}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                          <div>📅 {invoice.posting_date}</div>
                          {invoice.due_date && (
                            <div className={overdue ? 'text-red-600 font-medium' : ''}>
                              ⏰ {invoice.due_date} {dueInfo?.text && `(${dueInfo.text})`}
                            </div>
                          )}
                        </div>

                        <div className="pt-2 border-t border-gray-100 space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Total:</span>
                            <span className="font-semibold text-gray-900">
                              {invoice.currency} {invoice.grand_total.toLocaleString('id-ID')}
                            </span>
                          </div>
                          {invoice.outstanding_amount > 0 && (
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-500">Sisa:</span>
                              <span className={`font-medium ${overdue ? 'text-red-600' : 'text-orange-600'}`}>
                                {invoice.currency} {invoice.outstanding_amount.toLocaleString('id-ID')}
                              </span>
                            </div>
                          )}
                          {(invoice.discount_amount || invoice.total_taxes_and_charges) && (
                            <div className="flex justify-between text-xs text-gray-400">
                              <span>
                                {invoice.discount_amount ? `Diskon: ${invoice.currency} ${invoice.discount_amount.toLocaleString('id-ID')}` : ''}
                                {invoice.discount_amount && invoice.total_taxes_and_charges ? ' • ' : ''}
                                {invoice.total_taxes_and_charges ? `Pajak: ${invoice.currency} ${invoice.total_taxes_and_charges.toLocaleString('id-ID')}` : ''}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                          <div className="flex items-center gap-1">
                            {overdue && invoice.status === 'Unpaid' && (
                              <span className="inline-flex items-center gap-1 text-xs text-red-600">
                                <AlertCircle className="h-3 w-3" /> Jatuh tempo
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => handlePrint(invoice.name, e)}
                              disabled={loadingPrintData}
                              className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg disabled:opacity-50"
                              title="Cetak"
                            >
                              {loadingPrintData ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                            </button>
                            {invoice.status === 'Draft' && (
                              <button
                                onClick={(e) => handleSubmit(invoice.name, e)}
                                disabled={actionLoading === invoice.name}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                              >
                                {actionLoading === invoice.name ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Ajukan'}
                              </button>
                            )}
                            {invoice.status === 'Submitted' && invoice.outstanding_amount > 0 && (
                              <button className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                                <CreditCard className="h-3 w-3" /> Bayar
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      // ─── Desktop Table Row ───
                      <div className="grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-3 min-w-0">
                          <p className="text-sm font-semibold text-indigo-600 truncate">{invoice.name}</p>
                          <p className="text-xs text-gray-600 mt-0.5 truncate">{invoice.supplier_name}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-sm text-gray-900">{invoice.posting_date}</p>
                        </div>
                        <div className="col-span-2">
                          {invoice.due_date ? (
                            <div className={overdue ? 'text-red-600 font-medium' : 'text-gray-900'}>
                              <p className="text-sm">{invoice.due_date}</p>
                              {dueInfo?.text && <p className="text-xs text-gray-500">{dueInfo.text}</p>}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-400">-</p>
                          )}
                        </div>
                        <div className="col-span-2 text-right">
                          <p className="text-sm font-semibold text-gray-900">
                            {invoice.currency} {invoice.grand_total.toLocaleString('id-ID')}
                          </p>
                          {invoice.outstanding_amount > 0 && (
                            <p className={`text-xs font-medium ${overdue ? 'text-red-600' : 'text-orange-600'}`}>
                              Sisa: {invoice.currency} {invoice.outstanding_amount.toLocaleString('id-ID')}
                            </p>
                          )}
                        </div>
                        <div className="col-span-2">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full border ${getStatusBadgeClass(invoice.status)}`}>
                              {getStatusLabel(invoice.status)}
                            </span>
                            {overdue && invoice.status === 'Unpaid' && (
                              <span
                                className="inline-flex items-center"
                                title="Jatuh tempo"  // ✅ Native browser tooltip di wrapper span
                                aria-label="Jatuh tempo"
                              >
                                <AlertCircle
                                  className="h-4 w-4 text-red-500 flex-shrink-0"
                                  aria-hidden="true"  // ✅ Icon dekoratif, sembunyikan dari screen reader
                                />
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="col-span-1">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={(e) => handlePrint(invoice.name, e)}
                              className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                              title="Cetak"
                            >
                              <Printer className="h-4 w-4" />
                            </button>
                            {invoice.status === 'Draft' && (
                              <button
                                onClick={(e) => handleSubmit(invoice.name, e)}
                                disabled={actionLoading === invoice.name}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg disabled:bg-gray-400"
                                title="Ajukan"
                              >
                                {actionLoading === invoice.name ? <Loader2 className="h-4 w-4 animate-spin" /> : '✓'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}

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
          {invoices.length === 0 && !loading && (
            <div className="text-center py-16 px-4">
              <FileText className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4 text-sm text-gray-500">Tidak ada faktur pembelian yang ditemukan</p>
              <button
                onClick={handleCreateNew}
                className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100"
              >
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

          {/* End of Data */}
          {!hasMoreData && invoices.length > 0 && (
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
              <button
                onClick={() => setShowSuccessDialog(false)}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Print Preview Modal */}
      {showPrintPreview && printData && (
        <PrintPreviewModal
          onClose={() => setShowPrintPreview(false)}
          title="Pratinjau Cetak Faktur Pembelian"
          paperMode="continuous"
        >
          <PurchaseInvoicePrint 
             data={printData as PurchaseInvoicePrintProps['data']} 
             companyName={selectedCompany}
           />
        </PrintPreviewModal>
      )}
    </div>
  );
}