'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useIsMobile } from '../../../hooks';
import {
  LoadingSpinner,
  Pagination,
  BrowserStyleDatePicker,
  ErrorDialog,
  SkeletonList,
} from '../../../components';
import { formatDate, parseDate } from '../../../utils/format';
import { PaymentWithReferences } from '../../../types/payment-details';

interface PaymentListProps {
  onEdit: (payment: PaymentWithReferences) => void;
  onCreate: () => void;
  selectedCompany: string;
}

// ─────────────────────────────────────────────────────────────
// Status Mapping: ERPNext Value (EN) → Indonesian Label (UI)
// ─────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  'Draft': 'Draft',
  'Submitted': 'Diajukan',
  'Cancelled': 'Dibatalkan',
};

const STATUS_COLORS: Record<string, string> = {
  'Draft': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Submitted': 'bg-green-100 text-green-800 border-green-200',
  'Cancelled': 'bg-red-100 text-red-800 border-red-200',
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
export default function PaymentList({ onEdit, onCreate, selectedCompany }: PaymentListProps) {
  const isMobile = useIsMobile(768);
  
  // Dynamic pageSize: Mobile 10, Desktop 20
  const pageSize = isMobile ? 10 : 20;

  const [payments, setPayments] = useState<PaymentWithReferences[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [createdJournalEntry, setCreatedJournalEntry] = useState('');
  
  const [dateFilter, setDateFilter] = useState({
    from_date: formatDate(new Date(Date.now() - 86400000)),
    to_date: formatDate(new Date()),
  });
  const [searchFilter, setSearchFilter] = useState('');
  const [documentNumberFilter, setDocumentNumberFilter] = useState('');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modeOfPaymentFilter, setModeOfPaymentFilter] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState<string>('');

  // Ref untuk tracking pagination source (prevent race conditions)
  const pageChangeSourceRef = useRef<'pagination' | 'filter' | 'init'>('init');

  // Warkat dialog states
  const [showClearWarkatDialog, setShowClearWarkatDialog] = useState(false);
  const [showBounceWarkatDialog, setShowBounceWarkatDialog] = useState(false);
  const [selectedWarkatPayment, setSelectedWarkatPayment] = useState('');
  const [selectedWarkatPaymentType, setSelectedWarkatPaymentType] = useState<'Pay' | 'Receive'>('Pay');
  const [bankAccounts, setBankAccounts] = useState<Array<{ name: string; account_name: string; account_type: string }>>([]);
  const [selectedBankAccount, setSelectedBankAccount] = useState('');
  const [bounceReason, setBounceReason] = useState('');
  const [clearanceDate, setClearanceDate] = useState('');
  const [warkatLoading, setWarkatLoading] = useState(false);
  const [loadingBankAccounts, setLoadingBankAccounts] = useState(false);

  // ─────────────────────────────────────────────────────────
  // Debounced filters untuk mencegah fetch berlebihan
  // ─────────────────────────────────────────────────────────
  const debouncedSearch = useMemo(() => {
    return { searchFilter, documentNumberFilter };
  }, [searchFilter, documentNumberFilter]);

  // ─────────────────────────────────────────────────────────
  // Fetch Data dari ERPNext API (dengan useCallback)
  // ─────────────────────────────────────────────────────────
  const fetchPayments = useCallback(async () => {
    if (!selectedCompany) {
      setError('Perusahaan belum dipilih. Silakan pilih perusahaan terlebih dahulu.');
      setLoading(false);
      return;
    }
    
    try {
      const params = new URLSearchParams();
      params.append('limit_page_length', pageSize.toString());
      params.append('limit_start', ((currentPage - 1) * pageSize).toString());
      
      // ✅ REQUEST FIELD SPESIFIK DARI ERPNext
      params.append('fields', JSON.stringify([
        'name', 'payment_type', 'party', 'party_name', 'party_type',
        'paid_amount', 'received_amount', 'status', 'posting_date',
        'total_allocated_amount', 'mode_of_payment', 'custom_notes_payment',
        'clearance_date', 'references'
      ]));
      
      // ✅ SORTING: Data terbaru paling atas
      params.append('order_by', 'creation desc, posting_date desc');
      
      // ✅ BUILD FILTERS ARRAY UNTUK ERPNext (Format JSON)
      const filters: [string, string, string | number][] = [
        ["company", "=", selectedCompany],
      ];

      if (paymentTypeFilter) filters.push(["payment_type", "=", paymentTypeFilter]);
      if (statusFilter) filters.push(["status", "=", statusFilter]);
      if (modeOfPaymentFilter) filters.push(["mode_of_payment", "=", modeOfPaymentFilter]);
      
      if (dateFilter.from_date) {
        const parsed = parseDate(dateFilter.from_date);
        if (parsed) filters.push(["posting_date", ">=", parsed]);
      }
      if (dateFilter.to_date) {
        const parsed = parseDate(dateFilter.to_date);
        if (parsed) filters.push(["posting_date", "<=", parsed]);
      }
      if (debouncedSearch.searchFilter.trim()) {
        filters.push(["party_name", "like", `%${debouncedSearch.searchFilter.trim()}%`]);
      }
      if (debouncedSearch.documentNumberFilter.trim()) {
        filters.push(["name", "like", `%${debouncedSearch.documentNumberFilter.trim()}%`]);
      }

      params.append('filters', JSON.stringify(filters));

      const response = await fetch(`/api/finance/payments?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        const filteredData = data.data || [];
        
        if (data.total_records !== undefined) {
          setTotalRecords(data.total_records);
          setTotalPages(Math.ceil(data.total_records / pageSize));
        } else {
          setTotalRecords(filteredData.length);
          setTotalPages(1);
        }
        setPayments(filteredData);
        setError('');
      } else {
        setError(data.message || 'Gagal memuat data pembayaran');
      }
    } catch (err) {
      console.error('❌ Error fetching payments:', err);
      setError('Gagal memuat data pembayaran');
    } finally {
      setLoading(false);
    }
  }, [
    selectedCompany,
    currentPage,
    pageSize,
    dateFilter,
    debouncedSearch.searchFilter,
    debouncedSearch.documentNumberFilter,
    paymentTypeFilter,
    statusFilter,
    modeOfPaymentFilter,
  ]);

  // ─────────────────────────────────────────────────────────
  // Effects - FIXED VERSION - Prevent race conditions
  // ─────────────────────────────────────────────────────────
  
  // Reset page when filters change
  useEffect(() => {
    pageChangeSourceRef.current = 'filter';
    setCurrentPage(1);
  }, [dateFilter, searchFilter, documentNumberFilter, paymentTypeFilter, statusFilter, modeOfPaymentFilter]);

  // Fetch when page changes (separated from filter logic)
  useEffect(() => {
    if (selectedCompany) {
      fetchPayments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, selectedCompany]);

  // Trigger fetch when filters change (after page reset)
  useEffect(() => {
    if (pageChangeSourceRef.current === 'filter' && selectedCompany) {
      fetchPayments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter, searchFilter, documentNumberFilter, paymentTypeFilter, statusFilter, modeOfPaymentFilter, selectedCompany]);

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
  const handleSubmitPayment = async (paymentName: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSubmittingPayment(paymentName);
    try {
      const res = await fetch(`/api/finance/payments/${paymentName}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage(`Payment ${paymentName} berhasil diajukan!`);
        fetchPayments();
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        setSubmitError(data.message || 'Gagal mengajukan pembayaran');
      }
    } catch {
      setSubmitError('Terjadi kesalahan saat mengajukan pembayaran');
    } finally {
      setSubmittingPayment('');
    }
  };

  const handlePrint = (paymentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`/print/payment-entry?name=${encodeURIComponent(paymentName)}`, '_blank');
  };

  const handleCardClick = (payment: PaymentWithReferences) => onEdit(payment);

  const handleResetFilters = () => {
    setDateFilter({
      from_date: formatDate(new Date(Date.now() - 86400000)),
      to_date: formatDate(new Date()),
    });
    setSearchFilter('');
    setDocumentNumberFilter('');
    setPaymentTypeFilter('');
    setStatusFilter('');
    setModeOfPaymentFilter('');
    setCurrentPage(1);
  };

  // ─────────────────────────────────────────────────────────
  // Warkat Dialog Handlers
  // ─────────────────────────────────────────────────────────
  const fetchBankAccounts = async () => {
    setLoadingBankAccounts(true);
    try {
      const res = await fetch(`/api/finance/accounts/cash-bank?company=${selectedCompany}`);
      const data = await res.json();
      if (data.success) setBankAccounts(data.data || []);
    } catch (err) {
      console.error('Error fetching bank accounts:', err);
    } finally {
      setLoadingBankAccounts(false);
    }
  };

  const handleOpenClearWarkat = (paymentName: string, paymentType: 'Pay' | 'Receive', e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedWarkatPayment(paymentName);
    setSelectedWarkatPaymentType(paymentType);
    setSelectedBankAccount('');
    setClearanceDate(formatDate(new Date()));
    setShowClearWarkatDialog(true);
    fetchBankAccounts();
  };

  const handleOpenBounceWarkat = (paymentName: string, paymentType: 'Pay' | 'Receive', e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedWarkatPayment(paymentName);
    setSelectedWarkatPaymentType(paymentType);
    setBounceReason('');
    setShowBounceWarkatDialog(true);
  };

  const handleClearWarkat = async () => {
    if (!selectedBankAccount) { setError('Pilih akun bank terlebih dahulu'); return; }
    if (!clearanceDate) { setError('Pilih tanggal pencairan terlebih dahulu'); return; }
    
    setWarkatLoading(true);
    setError('');
    try {
      const res = await fetch('/api/finance/payments/clear-warkat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: selectedCompany,
          payment_entry: selectedWarkatPayment,
          bank_account: selectedBankAccount,
          payment_type: selectedWarkatPaymentType,
          clearance_date: parseDate(clearanceDate),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCreatedJournalEntry(data.journal_entry || '');
        setSuccessMessage(`Warkat ${selectedWarkatPayment} berhasil dicairkan!`);
        setShowClearWarkatDialog(false);
        fetchPayments();
        setTimeout(() => { setSuccessMessage(''); setCreatedJournalEntry(''); }, 5000);
      } else {
        setSubmitError(data.message || 'Gagal mencairkan warkat');
      }
    } catch {
      setSubmitError('Terjadi kesalahan saat mencairkan warkat');
    } finally {
      setWarkatLoading(false);
    }
  };

  const handleBounceWarkat = async () => {
    setWarkatLoading(true);
    setError('');
    try {
      const res = await fetch('/api/finance/payments/bounce-warkat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: selectedCompany,
          payment_entry: selectedWarkatPayment,
          reason: bounceReason || 'Warkat ditolak',
          payment_type: selectedWarkatPaymentType,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage(`Warkat ${selectedWarkatPayment} berhasil ditolak!`);
        setShowBounceWarkatDialog(false);
        fetchPayments();
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        setSubmitError(data.message || 'Gagal menolak warkat');
      }
    } catch {
      setSubmitError('Terjadi kesalahan saat menolak warkat');
    } finally {
      setWarkatLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // Initial Loading State
  // ─────────────────────────────────────────────────────────
  if (loading && payments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-sm text-gray-600">Memuat Data Pembayaran...</p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  // Render UI
  // ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <ErrorDialog isOpen={!!submitError} title="Gagal" message={submitError} onClose={() => setSubmitError('')} />
      
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6 lg:px-8 sticky top-0 z-30">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Manajemen Pembayaran</h1>
          <button
            onClick={onCreate}
            className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
          >
            + Buat Pembayaran
          </button>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="px-4 py-3 sm:px-6 lg:px-8">
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
            <div className="flex-1">
              <span>{successMessage}</span>
              {createdJournalEntry && (
                <a
                  href={`${process.env.NEXT_PUBLIC_ERPNEXT_URL || 'http://localhost:8000'}/app/journal-entry/${createdJournalEntry}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-3 inline-flex items-center text-teal-700 hover:text-teal-900 font-medium"
                >
                  <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Lihat JE: {createdJournalEntry}
                </a>
              )}
            </div>
            <button onClick={() => { setSuccessMessage(''); setCreatedJournalEntry(''); }} className="text-green-700 hover:text-green-900 font-bold">✕</button>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Cari Nama', value: searchFilter, onChange: setSearchFilter, placeholder: 'Nama pelanggan/pemasok...' },
            { label: 'No. Dokumen', value: documentNumberFilter, onChange: setDocumentNumberFilter, placeholder: 'Nomor pembayaran...' },
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
            <label className="block text-xs font-medium text-gray-500 mb-1">Tipe</label>
            <select
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={paymentTypeFilter}
              onChange={(e) => setPaymentTypeFilter(e.target.value)}
            >
              <option value="">Semua</option>
              <option value="Receive">Penerimaan</option>
              <option value="Pay">Pembayaran</option>
            </select>
          </div>
          
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
          
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Metode</label>
            <select
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={modeOfPaymentFilter}
              onChange={(e) => setModeOfPaymentFilter(e.target.value)}
            >
              <option value="">Semua Metode</option>
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Warkat">Warkat</option>
              <option value="Credit Card">Credit Card</option>
            </select>
          </div>
          
          {['from_date', 'to_date'].map((key) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                {key === 'from_date' ? 'Dari Tanggal' : 'Sampai Tanggal'}
              </label>
              <BrowserStyleDatePicker
                value={dateFilter[key as keyof typeof dateFilter]}
                onChange={(value: string) => setDateFilter(prev => ({ ...prev, [key]: value }))}
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
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs text-gray-600">
            <span className="font-medium">{payments.length}</span> dari <span className="font-medium">{totalRecords}</span> data
          </div>

          {/* Desktop Table Header */}
          {!isMobile && payments.length > 0 && (
            <div className="hidden md:flex items-center px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase">
              <div className="flex-1 min-w-0">
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-2">Dokumen</div>
                  <div className="col-span-2">Tipe</div>
                  <div className="col-span-2">Pihak</div>
                  <div className="col-span-2">Metode</div>
                  <div className="col-span-1">Tanggal</div>
                  <div className="col-span-1 text-right">Jumlah</div>
                  <div className="col-span-1 text-center">Status</div>
                  <div className="col-span-1 text-center">Aksi</div>
                </div>
              </div>
            </div>
          )}

          {/* List Content */}
          {loading && payments.length === 0 ? (
            <SkeletonList 
              mode="auto" 
              isMobile={isMobile} 
              count={isMobile ? 3 : 5}
              cardProps={{ className: "px-4 py-4" }}
              tableProps={{ columns: 8 }}
            />
          ) : (
            <>
              {isMobile ? (
                // ─── Mobile Card Layout ───
                <ul className="divide-y divide-gray-100">
                  {payments.map((payment) => (
                    <li 
                      key={payment.name}
                      onClick={() => handleCardClick(payment)}
                      className="cursor-pointer hover:bg-indigo-50/50 transition-colors"
                    >
                      <div className="px-4 py-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-indigo-600 truncate">{payment.name}</p>
                              <p className="text-xs text-gray-600 mt-0.5 truncate">
                                {payment.party_type === 'Customer' ? 'Pelanggan' : 'Pemasok'}: {payment.party_name || payment.party}
                              </p>
                            </div>
                            <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusBadgeClass(payment.status)}`}>
                              {getStatusLabel(payment.status)}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                            <div>📋 {payment.payment_type === 'Receive' ? 'Penerimaan' : 'Pembayaran'}</div>
                            <div>💳 {payment.mode_of_payment || '-'}</div>
                            <div>📅 {payment.posting_date}</div>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                            <span className={`text-sm font-semibold ${payment.payment_type === 'Receive' ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(payment.payment_type === 'Receive' ? (payment.received_amount || 0) : (payment.paid_amount || 0))}
                            </span>
                            <div className="flex items-center gap-1">
                              <button onClick={(e) => handlePrint(payment.name, e)} className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Cetak">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                              </button>
                              {payment.status === 'Draft' && (
                                <button 
                                  onClick={(e) => handleSubmitPayment(payment.name, e)} 
                                  disabled={submittingPayment === payment.name}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                                >
                                  {submittingPayment === payment.name ? (
                                    <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                  ) : null}
                                  {submittingPayment === payment.name ? '...' : 'Ajukan'}
                                </button>
                              )}
                              {payment.status === 'Submitted' && payment.mode_of_payment === 'Warkat' && !payment.clearance_date && (
                                <>
                                  <button onClick={(e) => handleOpenClearWarkat(payment.name, payment.payment_type, e)} className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg" title="Cairkan">
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                  </button>
                                  <button onClick={(e) => handleOpenBounceWarkat(payment.name, payment.payment_type, e)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Tolak">
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                          {payment.custom_notes_payment && <p className="text-xs text-gray-400 italic truncate">📝 {payment.custom_notes_payment}</p>}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                // ─── Desktop Table Layout ───
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <tbody className="bg-white divide-y divide-gray-100">
                      {payments.map((payment) => (
                        <tr 
                          key={payment.name}
                          onClick={() => handleCardClick(payment)}
                          className="cursor-pointer hover:bg-indigo-50/50 transition-colors"
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            <p className="text-sm font-semibold text-indigo-600 truncate">{payment.name}</p>
                            {payment.custom_notes_payment && <p className="text-xs text-gray-400 truncate mt-0.5">📝 {payment.custom_notes_payment}</p>}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <p className="text-sm text-gray-900">{payment.payment_type === 'Receive' ? 'Penerimaan' : 'Pembayaran'}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-gray-900 truncate">{payment.party_name || payment.party}</p>
                            <p className="text-xs text-gray-500">{payment.party_type === 'Customer' ? 'Pelanggan' : 'Pemasok'}</p>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <p className="text-sm text-gray-900">{payment.mode_of_payment || '-'}</p>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <p className="text-sm text-gray-900">{payment.posting_date}</p>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <p className={`text-sm font-semibold ${payment.payment_type === 'Receive' ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(payment.payment_type === 'Receive' ? (payment.received_amount || 0) : (payment.paid_amount || 0))}
                            </p>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusBadgeClass(payment.status)}`}>
                              {getStatusLabel(payment.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={(e) => handlePrint(payment.name, e)} className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Cetak">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                              </button>
                              {payment.status === 'Draft' && (
                                <button 
                                  onClick={(e) => handleSubmitPayment(payment.name, e)} 
                                  disabled={submittingPayment === payment.name}
                                  className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50" 
                                  title="Ajukan"
                                >
                                  {submittingPayment === payment.name ? (
                                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                  ) : (
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                  )}
                                </button>
                              )}
                              {payment.status === 'Submitted' && payment.mode_of_payment === 'Warkat' && !payment.clearance_date && (
                                <>
                                  <button onClick={(e) => handleOpenClearWarkat(payment.name, payment.payment_type, e)} className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg" title="Cairkan">
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                  </button>
                                  <button onClick={(e) => handleOpenBounceWarkat(payment.name, payment.payment_type, e)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Tolak">
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* Empty State */}
          {payments.length === 0 && !loading && (
            <div className="text-center py-16 px-4">
              <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-4 text-sm text-gray-500">Tidak ada data pembayaran</p>
              <button onClick={onCreate} className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100">
                + Buat Pembayaran Baru
              </button>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
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
          Halaman {currentPage} dari {totalPages}
        </p>
      </div>

      {/* Back to Top FAB */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 inline-flex items-center justify-center w-12 h-12 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all transform hover:scale-105"
          title="Kembali ke atas"
          aria-label="Kembali ke atas"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      )}

      {/* ─────────────────────────────────────────────────────
          Dialog: Cairkan Warkat
          ───────────────────────────────────────────────────── */}
      {showClearWarkatDialog && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => !warkatLoading && setShowClearWarkatDialog(false)} />
            <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full p-6 z-10">
              <h3 className="text-lg font-bold text-gray-900 mb-1">Cairkan Warkat</h3>
              <p className="text-sm text-gray-500 mb-4">Pembayaran: <span className="font-medium text-gray-900">{selectedWarkatPayment}</span></p>
              
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-700">
                <p className="font-medium mb-1">Jurnal yang akan terbentuk:</p>
                {selectedWarkatPaymentType === 'Pay' ? (
                  <>
                    <p>Dr Warkat Keluar → Cr Bank</p>
                    <p className="mt-1">Uang keluar dari bank, warkat selesai.</p>
                  </>
                ) : (
                  <>
                    <p>Dr Bank → Cr Warkat Masuk</p>
                    <p className="mt-1">Dana masuk ke bank, warkat selesai.</p>
                  </>
                )}
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Akun Bank</label>
                {loadingBankAccounts ? (
                  <p className="text-sm text-gray-500">Memuat akun bank...</p>
                ) : (
                  <select
                    className="block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm"
                    value={selectedBankAccount}
                    onChange={(e) => setSelectedBankAccount(e.target.value)}
                  >
                    <option value="">-- Pilih Akun Bank --</option>
                    {bankAccounts.map((acc) => (
                      <option key={acc.name} value={acc.name}>{acc.name} ({acc.account_type})</option>
                    ))}
                  </select>
                )}
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Pencairan</label>
                <BrowserStyleDatePicker
                  value={clearanceDate}
                  onChange={(value: string) => setClearanceDate(value)}
                  className="block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm"
                  placeholder="DD/MM/YYYY"
                />
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowClearWarkatDialog(false)}
                  disabled={warkatLoading}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleClearWarkat}
                  disabled={warkatLoading || !selectedBankAccount}
                  className="px-4 py-2 text-sm text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 flex items-center"
                >
                  {warkatLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      Memproses...
                    </>
                  ) : 'Cairkan Warkat'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────
          Dialog: Tolak Warkat
          ───────────────────────────────────────────────────── */}
      {showBounceWarkatDialog && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => !warkatLoading && setShowBounceWarkatDialog(false)} />
            <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full p-6 z-10">
              <h3 className="text-lg font-bold text-gray-900 mb-1">Tolak Warkat</h3>
              <p className="text-sm text-gray-500 mb-4">Pembayaran: <span className="font-medium text-gray-900">{selectedWarkatPayment}</span></p>
              
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700">
                <p className="font-medium mb-1">Jurnal yang akan terbentuk:</p>
                {selectedWarkatPaymentType === 'Pay' ? (
                  <>
                    <p>Dr Warkat Keluar → Cr Hutang Dagang</p>
                    <p className="mt-1">Hutang muncul kembali, warkat dibatalkan.</p>
                  </>
                ) : (
                  <>
                    <p>Dr Piutang Dagang → Cr Warkat Masuk</p>
                    <p className="mt-1">Piutang muncul kembali, warkat dibatalkan.</p>
                  </>
                )}
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Alasan Penolakan</label>
                <textarea
                  className="block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm"
                  rows={3}
                  value={bounceReason}
                  onChange={(e) => setBounceReason(e.target.value)}
                  placeholder="cth: Saldo tidak cukup, warkat kadaluarsa, dll"
                />
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowBounceWarkatDialog(false)}
                  disabled={warkatLoading}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleBounceWarkat}
                  disabled={warkatLoading}
                  className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center"
                >
                  {warkatLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      Memproses...
                    </>
                  ) : 'Tolak Warkat'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}