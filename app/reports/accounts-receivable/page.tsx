'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, X, Eye, ArrowUp, ChevronLeft, ChevronRight,
  Printer, AlertCircle, Calendar, User, Users,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import PrintPreviewModal from '../../../components/PrintPreviewModal';
import SalesPersonDialog from '../../components/SalesPersonDialog';

export const dynamic = 'force-dynamic';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AREntry {
  name: string;
  customer: string;
  customer_name: string;
  posting_date: string;
  due_date: string;
  voucher_no: string;
  voucher_type: string;
  invoice_grand_total: number;
  outstanding_amount: number;
  sales_person?: string;
  territory?: string;
  age?: number;
}

type FilterState = {
  from_date: string;
  to_date: string;
  customer: string;
  voucher_no: string;
  sales_person: string;
};

type FetchMode = 'replace' | 'append';

// ─── Constants ────────────────────────────────────────────────────────────────

const FIELDS = [
  'name', 'customer', 'customer_name', 'posting_date', 'due_date',
  'voucher_no', 'voucher_type', 'invoice_grand_total',
  'outstanding_amount', 'sales_person', 'territory',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isoToDisplay(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function calcOverdueDays(dueDate?: string): number {
  if (!dueDate) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

/**
 * Build ERPNext filters — company dikirim terpisah sebagai param `company`
 */
function buildFilters(filters: FilterState, search: string): string {
  const f: [string, string, string][] = [];
  if (filters.from_date) f.push(['posting_date', '>=', filters.from_date]);
  if (filters.to_date) f.push(['posting_date', '<=', filters.to_date]);
  if (filters.customer) f.push(['customer_name', 'like', `%${filters.customer}%`]);
  if (filters.voucher_no) f.push(['voucher_no', 'like', `%${filters.voucher_no}%`]);
  if (filters.sales_person) f.push(['sales_person', 'like', `%${filters.sales_person}%`]);
  if (search) f.push(['customer_name', 'like', `%${search}%`]);
  return JSON.stringify(f);
}

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

// ─── BrowserStyleDatePicker ───────────────────────────────────────────────────

interface DatePickerProps {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}

function BrowserStyleDatePicker({ value, onChange, label, placeholder = 'DD/MM/YYYY', className = '' }: DatePickerProps) {
  const [display, setDisplay] = useState('');
  const nativeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDisplay(value ? isoToDisplay(value) : '');
  }, [value]);

  const commit = (raw: string) => {
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
      const [dd, mm, yyyy] = raw.split('/');
      const iso = `${yyyy}-${mm}-${dd}`;
      if (!isNaN(new Date(iso).getTime())) { onChange(iso); return; }
    }
    if (!raw) onChange('');
  };

  const handleTextChange = (raw: string) => {
    let v = raw.replace(/[^\d/]/g, '').slice(0, 10);
    const digits = v.replace(/\//g, '');
    if (digits.length === 2 && !v.includes('/')) v += '/';
    else if (digits.length === 4 && v.split('/').length === 2) v += '/';
    setDisplay(v);
    commit(v);
  };

  const handleBlur = () => {
    if (display && !/^\d{2}\/\d{2}\/\d{4}$/.test(display)) {
      setDisplay(value ? isoToDisplay(value) : '');
    }
  };

  const openPicker = () => {
    if (nativeRef.current) {
      if (value) nativeRef.current.value = value;
      if (typeof nativeRef.current.showPicker === 'function') {
        nativeRef.current.showPicker();
      } else {
        nativeRef.current.click();
      }
    }
  };

  return (
    <div>
      {label && <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>}
      <div className="relative flex items-center">
        <input
          type="text"
          inputMode="numeric"
          value={display}
          onChange={e => handleTextChange(e.target.value)}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={`${className} pr-9`}
        />
        <button
          type="button"
          onClick={openPicker}
          className="absolute right-2.5 text-gray-400 hover:text-blue-500 transition-colors"
          tabIndex={-1}
          aria-label="Buka kalender"
        >
          <Calendar className="w-4 h-4" />
        </button>
        <input
          ref={nativeRef}
          type="date"
          defaultValue={value}
          onChange={e => onChange(e.target.value)}
          className="sr-only"
          tabIndex={-1}
        />
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 8 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-200 rounded" />
        </td>
      ))}
    </tr>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse bg-white rounded-xl border border-gray-100 p-4 space-y-3">
      <div className="flex justify-between">
        <div className="h-4 bg-gray-200 rounded w-2/5" />
        <div className="h-4 bg-gray-200 rounded w-1/4" />
      </div>
      <div className="h-3 bg-gray-200 rounded w-3/5" />
      <div className="flex justify-between mt-2">
        <div className="h-5 bg-gray-200 rounded w-1/3" />
        <div className="h-5 bg-gray-200 rounded w-1/3" />
      </div>
    </div>
  );
}

// ─── Summary Cards ─────────────────────────────────────────────────────────────

function SummaryCards({ data, loading }: { data: AREntry[]; loading: boolean }) {
  const totalOutstanding = data.reduce((s, e) => s + (e.outstanding_amount || 0), 0);
  const totalInvoice = data.reduce((s, e) => s + (e.invoice_grand_total || 0), 0);
  const overdueCount = data.filter(e => calcOverdueDays(e.due_date) > 0).length;

  const cards = [
    { label: 'Jumlah Faktur', value: loading ? '-' : data.length.toLocaleString('id-ID'), color: 'blue' },
    { label: 'Total Faktur', value: loading ? '-' : formatCurrency(totalInvoice), color: 'indigo' },
    { label: 'Total Outstanding', value: loading ? '-' : formatCurrency(totalOutstanding), color: 'orange' },
    { label: 'Faktur Terlambat', value: loading ? '-' : overdueCount.toLocaleString('id-ID'), color: 'red' },
  ] as const;

  const colorMap = {
    blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   label: 'text-blue-600',   value: 'text-blue-900' },
    indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', label: 'text-indigo-600', value: 'text-indigo-900' },
    orange: { bg: 'bg-orange-50', border: 'border-orange-200', label: 'text-orange-600', value: 'text-orange-900' },
    red:    { bg: 'bg-red-50',    border: 'border-red-200',    label: 'text-red-600',    value: 'text-red-900' },
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(({ label, value, color }) => {
        const c = colorMap[color];
        return (
          <div key={label} className={`${c.bg} ${c.border} border rounded-xl p-4`}>
            <p className={`text-xs font-medium ${c.label} mb-1`}>{label}</p>
            <p className={`text-lg font-bold ${c.value} leading-tight`}>{value}</p>
          </div>
        );
      })}
    </div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function ARDetailModal({ entry, onClose }: { entry: AREntry; onClose: () => void }) {
  const overdue = calcOverdueDays(entry.due_date);
  const rows = [
    { label: 'No. Faktur', value: entry.voucher_no },
    { label: 'Tipe Dokumen', value: entry.voucher_type || '-' },
    { label: 'Pelanggan', value: entry.customer_name || entry.customer },
    { label: 'Kode Pelanggan', value: entry.customer },
    { label: 'Sales Person', value: entry.sales_person || '-' },
    { label: 'Wilayah', value: entry.territory || '-' },
    { label: 'Tanggal Posting', value: formatDate(entry.posting_date) },
    { label: 'Jatuh Tempo', value: formatDate(entry.due_date) },
    { label: 'Status', value: overdue > 0 ? `Terlambat ${overdue} hari` : 'Tepat Waktu' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Detail Piutang</h2>
              <p className="text-xs text-gray-400 font-mono">{entry.voucher_no}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Amount cards */}
        <div className="mx-6 mt-4 grid grid-cols-2 gap-3">
          <div className="bg-indigo-50 rounded-xl p-3 text-center">
            <p className="text-xs text-indigo-600 font-medium mb-1">Total Faktur</p>
            <p className="text-sm font-bold text-indigo-700">{formatCurrency(entry.invoice_grand_total)}</p>
          </div>
          <div className={`rounded-xl p-3 text-center ${(entry.outstanding_amount || 0) > 0 ? 'bg-orange-50' : 'bg-emerald-50'}`}>
            <p className={`text-xs font-medium mb-1 ${(entry.outstanding_amount || 0) > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>Outstanding</p>
            <p className={`text-sm font-bold ${(entry.outstanding_amount || 0) > 0 ? 'text-orange-700' : 'text-emerald-700'}`}>
              {formatCurrency(entry.outstanding_amount || 0)}
            </p>
          </div>
        </div>

        {/* Overdue badge */}
        {overdue > 0 && (
          <div className="mx-6 mt-3 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span className="text-sm font-medium text-red-700">Terlambat {overdue} hari</span>
          </div>
        )}

        <div className="px-6 py-4 space-y-1">
          {rows.map(({ label, value }) => (
            <div key={label} className="flex items-start justify-between gap-4 py-2 border-b border-gray-50 last:border-0">
              <span className="text-sm text-gray-500 shrink-0 w-36">{label}</span>
              <span className={`text-sm text-right font-medium break-all ${label === 'Status' && overdue > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {value}
              </span>
            </div>
          ))}
        </div>

        <div className="px-6 pb-6">
          <button onClick={onClose} className="w-full py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function PaginationBar({ currentPage, totalPages, totalRecords, pageSize, onPageChange }: {
  currentPage: number; totalPages: number; totalRecords: number; pageSize: number; onPageChange: (p: number) => void;
}) {
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalRecords);

  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push('...');
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-100">
      <p className="text-sm text-gray-500">
        Menampilkan <span className="font-medium text-gray-900">{start}–{end}</span> dari{' '}
        <span className="font-medium text-gray-900">{totalRecords.toLocaleString('id-ID')}</span> faktur
      </p>
      <div className="flex items-center gap-1">
        <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        {pages.map((p, i) =>
          p === '...'
            ? <span key={`ell-${i}`} className="w-8 h-8 flex items-center justify-center text-gray-400 text-sm">…</span>
            : <button key={p} onClick={() => onPageChange(p as number)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${currentPage === p ? 'bg-gray-900 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {p}
              </button>
        )}
        <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AccountsReceivablePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const pageSize = isMobile ? 10 : 20;

  const [currentPage, setCurrentPage] = useState<number>(() => {
    const p = parseInt(searchParams.get('page') ?? '1', 10);
    return isNaN(p) || p < 1 ? 1 : p;
  });

  const [arEntries, setArEntries] = useState<AREntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedEntry, setSelectedEntry] = useState<AREntry | null>(null);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [showSalesPersonDialog, setShowSalesPersonDialog] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<FilterState>({
    from_date: getYesterday(),
    to_date: getToday(),
    customer: '',
    voucher_no: '',
    sales_person: '',
  });

  const sentinelRef = useRef<HTMLDivElement>(null);
  const hasMoreRef = useRef(false);
  const loadingMoreRef = useRef(false);
  
  // ✅ FIX: Track pagination change source to prevent race conditions
  const pageChangeSourceRef = useRef<'pagination' | 'filter' | 'init'>('init');

  // Back to top
  useEffect(() => {
    const h = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  // Company dari localStorage / cookie
  useEffect(() => {
    const stored = localStorage.getItem('selected_company');
    if (stored) { setSelectedCompany(stored); return; }
    const cookie = document.cookie.split(';').find(c => c.trim().startsWith('selected_company='));
    if (cookie) setSelectedCompany(decodeURIComponent(cookie.split('=')[1].trim()));
  }, []);

  // Sync URL dengan page state
  useEffect(() => {
    const pageFromUrl = searchParams.get('page');
    if (pageFromUrl && !isNaN(parseInt(pageFromUrl))) {
      const pageNum = parseInt(pageFromUrl);
      if (pageNum >= 1) setCurrentPage(pageNum);
    }
  }, [searchParams]);


  // Reset ke page 1 saat filter berubah
  useEffect(() => {
    pageChangeSourceRef.current = 'filter';
    setCurrentPage(1);
    if (isMobile) setArEntries([]);
  }, [searchTerm, filters, isMobile]);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchAREntries = useCallback(async (page: number, mode: FetchMode = 'replace') => {
    if (!selectedCompany) {
      setError('Tidak ada perusahaan yang dipilih. Silakan pilih perusahaan terlebih dahulu.');
      return;
    }
    if (mode === 'replace') setLoading(true);
    else setLoadingMore(true);
    loadingMoreRef.current = true;
    setError('');

    try {
      const filtersJson = buildFilters(filters, searchTerm);
      const start = (page - 1) * pageSize;

      const params = new URLSearchParams({
        company: selectedCompany,
        filters: filtersJson,
        fields: JSON.stringify(FIELDS),
        limit_page_length: String(pageSize),
        limit_start: String(start),
        order_by: 'posting_date desc, name desc',
      });

      const res = await fetch(`/api/finance/reports/accounts-receivable?${params}`, { credentials: 'include' });
      const data: { success: boolean; data?: AREntry[]; total_records?: number; message?: string } = await res.json();

      if (data.success) {
        const entries = data.data ?? [];
        const total = data.total_records ?? 0;
        const pages = Math.ceil(total / pageSize);
        setArEntries(prev => (mode === 'append' ? [...prev, ...entries] : entries));
        setTotalRecords(total);
        setTotalPages(pages);
        hasMoreRef.current = page < pages;
      } else {
        setError(data.message ?? 'Gagal memuat data piutang');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat memuat data');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  }, [selectedCompany, searchTerm, filters, pageSize]);

  // Fetch when page changes (separated from filter logic)
  useEffect(() => {
    if (selectedCompany) {
      const shouldReset = !isMobile || currentPage === 1;
      fetchAREntries(currentPage, shouldReset ? 'replace' : 'append');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, isMobile]);

  // Trigger fetch when filters change (after page reset)
  useEffect(() => {
    if (pageChangeSourceRef.current === 'filter' && selectedCompany) {
      const shouldReset = !isMobile || currentPage === 1;
      fetchAREntries(currentPage, shouldReset ? 'replace' : 'append');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, filters]);

  // Infinite scroll (mobile)
  useEffect(() => {
    if (!isMobile || !sentinelRef.current) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMoreRef.current && !loadingMoreRef.current) {
        setCurrentPage(prev => { const next = prev + 1; fetchAREntries(next, 'append'); return next; });
      }
    }, { rootMargin: '200px' });
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [isMobile, fetchAREntries]);

  const handlePageChange = (page: number) => {
    pageChangeSourceRef.current = 'pagination';
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilters({ from_date: getYesterday(), to_date: getToday(), customer: '', voucher_no: '', sales_person: '' });
  };

  const handleSalesPersonSelect = (salesPerson: { name: string; full_name: string }) => {
    setFilters(prev => ({ ...prev, sales_person: salesPerson.full_name }));
  };

  const hasExtraFilters = !!(searchTerm || filters.customer || filters.voucher_no || filters.sales_person);

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50 text-gray-700 placeholder:text-gray-400';

  const progressPct = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0;

  // Print URL
  const printParams = new URLSearchParams({ company: selectedCompany });
  if (filters.from_date) printParams.set('from_date', filters.from_date);
  if (filters.to_date) printParams.set('to_date', filters.to_date);
  const printUrl = `/reports/accounts-receivable/print?${printParams.toString()}`;

  // ── Mobile Card ──────────────────────────────────────────────────────────
  const MobileCard = ({ entry }: { entry: AREntry }) => {
    const overdue = calcOverdueDays(entry.due_date);
    return (
      <div
        className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm active:scale-[0.99] transition-transform cursor-pointer"
        onClick={() => setSelectedEntry(entry)}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="text-xs font-mono text-indigo-600 font-medium truncate">{entry.voucher_no}</span>
          <span className="shrink-0 text-xs text-gray-500">{formatDate(entry.posting_date)}</span>
        </div>

        {/* Customer */}
        <p className="text-sm font-semibold text-gray-900 mb-0.5 line-clamp-1">
          {entry.customer_name || entry.customer}
        </p>
        {entry.sales_person && (
          <p className="text-xs text-gray-500 mb-3 flex items-center gap-1">
            <User className="w-3 h-3" />
            {entry.sales_person}
          </p>
        )}

        {/* Amounts + Overdue */}
        <div className="flex items-center justify-between">
          <div className="flex gap-3">
            <div>
              <p className="text-[10px] text-gray-500 font-medium">FAKTUR</p>
              <p className="text-sm font-semibold text-gray-700">{formatCurrency(entry.invoice_grand_total)}</p>
            </div>
            <div>
              <p className="text-[10px] text-orange-500 font-medium">OUTSTANDING</p>
              <p className="text-sm font-bold text-orange-700">{formatCurrency(entry.outstanding_amount || 0)}</p>
            </div>
          </div>
          {overdue > 0 ? (
            <span className="text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full font-medium">
              +{overdue}h
            </span>
          ) : (
            <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
              Tepat Waktu
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Progress bar */}
      {!isMobile && totalPages > 1 && (
        <div className="fixed top-0 left-0 w-full z-50 h-0.5 bg-gray-100">
          <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${progressPct}%` }} />
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-200">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Piutang Usaha</h1>
              <p className="text-sm text-gray-500">Accounts Receivable</p>
            </div>
            <div className="ml-auto flex items-center gap-3">
              {!loading && totalRecords > 0 && (
                <span className="text-sm font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                  {totalRecords.toLocaleString('id-ID')} faktur
                </span>
              )}
              <button
                onClick={() => setShowPrint(true)}
                className="hidden sm:inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
              >
                <Printer className="w-4 h-4" />
                Cetak
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <SummaryCards data={arEntries} loading={loading} />

        {/* ── Filter Panel ──────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4">
          {/* Row 1: Pencarian + 2 Tanggal */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Cari Pelanggan</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Nama pelanggan..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className={`${inputCls} pl-9`}
                />
              </div>
            </div>

            <BrowserStyleDatePicker
              label="Dari Tanggal"
              value={filters.from_date}
              onChange={v => setFilters(prev => ({ ...prev, from_date: v }))}
              placeholder="DD/MM/YYYY"
              className={inputCls}
            />

            <BrowserStyleDatePicker
              label="Sampai Tanggal"
              value={filters.to_date}
              onChange={v => setFilters(prev => ({ ...prev, to_date: v }))}
              placeholder="DD/MM/YYYY"
              className={inputCls}
            />
          </div>

          {/* Row 2: Filter lanjutan */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Filter No. Faktur */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">No. Faktur</label>
              <input
                type="text"
                placeholder="Cari no. faktur..."
                value={filters.voucher_no}
                onChange={e => setFilters(prev => ({ ...prev, voucher_no: e.target.value }))}
                className={inputCls}
              />
            </div>

            {/* Filter Sales Person */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Sales Person</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Nama sales person..."
                  value={filters.sales_person}
                  onChange={e => setFilters(prev => ({ ...prev, sales_person: e.target.value }))}
                  className={`${inputCls} pl-9 pr-10`}
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

            {/* Reset */}
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                disabled={!hasExtraFilters && filters.from_date === getYesterday() && filters.to_date === getToday()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-default"
              >
                <X className="w-4 h-4" />
                Reset ke Default
              </button>
            </div>
          </div>

          {/* Active filter badges */}
          {hasExtraFilters && (
            <div className="mt-3 flex flex-wrap gap-2">
              {filters.customer && (
                <span className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-medium">
                  Pelanggan: {filters.customer}
                  <button onClick={() => setFilters(p => ({ ...p, customer: '' }))}><X className="w-3 h-3" /></button>
                </span>
              )}
              {filters.voucher_no && (
                <span className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full">
                  Faktur: {filters.voucher_no}
                  <button onClick={() => setFilters(p => ({ ...p, voucher_no: '' }))}><X className="w-3 h-3" /></button>
                </span>
              )}
              {filters.sales_person && (
                <span className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full">
                  Sales: {filters.sales_person}
                  <button onClick={() => setFilters(p => ({ ...p, sales_person: '' }))}><X className="w-3 h-3" /></button>
                </span>
              )}
              {searchTerm && (
                <span className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full">
                  "{searchTerm}"
                  <button onClick={() => setSearchTerm('')}><X className="w-3 h-3" /></button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* ── MOBILE: Card List ──────────────────────────────────────────────── */}
        {isMobile ? (
          <div className="space-y-3">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
              : arEntries.length === 0
                ? <div className="text-center py-16 text-gray-400">
                    <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Tidak ada data piutang</p>
                  </div>
                : arEntries.map(entry => <MobileCard key={entry.name || entry.voucher_no} entry={entry} />)
            }
            <div ref={sentinelRef} />
            {loadingMore && (
              <div className="flex justify-center py-4">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {!hasMoreRef.current && !loading && arEntries.length > 0 && (
              <p className="text-center text-xs text-gray-400 py-4">Semua data telah dimuat</p>
            )}
          </div>
        ) : (
          /* ── DESKTOP: Table ───────────────────────────────────────────────── */
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-left   text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">No. Faktur</th>
                    <th className="px-4 py-3 text-left   text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Pelanggan</th>
                    <th className="px-4 py-3 text-left   text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Sales Person</th>
                    <th className="px-4 py-3 text-left   text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Tgl Posting</th>
                    <th className="px-4 py-3 text-left   text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Jatuh Tempo</th>
                    <th className="px-4 py-3 text-right  text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Total Faktur</th>
                    <th className="px-4 py-3 text-right  text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Outstanding</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Overdue</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading
                    ? Array.from({ length: pageSize }).map((_, i) => <SkeletonRow key={i} />)
                    : arEntries.length === 0
                      ? <tr>
                          <td colSpan={9} className="px-6 py-16 text-center text-gray-400">
                            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">Tidak ada data piutang ditemukan</p>
                          </td>
                        </tr>
                      : arEntries.map(entry => {
                          const overdue = calcOverdueDays(entry.due_date);
                          return (
                            <tr key={entry.name || entry.voucher_no} className="hover:bg-indigo-50/30 transition-colors group">
                              <td className="px-4 py-3 text-sm font-medium text-indigo-600 whitespace-nowrap font-mono">
                                {entry.voucher_no}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 max-w-[200px]">
                                <span className="line-clamp-1 block" title={entry.customer_name || entry.customer}>
                                  {entry.customer_name || entry.customer}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                                {entry.sales_person ? (
                                  <span className="inline-flex items-center gap-1">
                                    <User className="w-3 h-3 text-gray-400" />
                                    {entry.sales_person}
                                  </span>
                                ) : (
                                  <span className="text-gray-300">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                                {formatDate(entry.posting_date)}
                              </td>
                              <td className="px-4 py-3 text-sm whitespace-nowrap">
                                <span className={overdue > 0 ? 'text-red-600 font-medium' : 'text-gray-600'}>
                                  {formatDate(entry.due_date)}
                                </span>
                              </td>
                              {/* Total Faktur — rata kanan */}
                              <td className="px-4 py-3 text-sm text-right whitespace-nowrap tabular-nums text-gray-700 font-medium">
                                {formatCurrency(entry.invoice_grand_total)}
                              </td>
                              {/* Outstanding — rata kanan */}
                              <td className="px-4 py-3 text-sm text-right whitespace-nowrap tabular-nums">
                                {(entry.outstanding_amount || 0) > 0
                                  ? <span className="font-semibold text-orange-700">{formatCurrency(entry.outstanding_amount)}</span>
                                  : <span className="text-emerald-600 font-medium">Lunas</span>
                                }
                              </td>
                              {/* Overdue badge */}
                              <td className="px-4 py-3 text-center whitespace-nowrap">
                                {overdue > 0
                                  ? <span className="inline-flex items-center justify-center text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full font-medium">
                                      {overdue} hari
                                    </span>
                                  : <span className="inline-flex items-center justify-center text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                                      Tepat Waktu
                                    </span>
                                }
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => setSelectedEntry(entry)}
                                  className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  Detail
                                </button>
                              </td>
                            </tr>
                          );
                        })
                  }
                </tbody>
              </table>
            </div>

            {!loading && totalPages > 0 && (
              <PaginationBar
                currentPage={currentPage}
                totalPages={totalPages}
                totalRecords={totalRecords}
                pageSize={pageSize}
                onPageChange={handlePageChange}
              />
            )}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedEntry && (
        <ARDetailModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
      )}

      {/* Back to Top FAB */}
      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-40 w-10 h-10 bg-gray-900 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-700 transition-all active:scale-95"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      )}

      {/* Print Modal */}
      {showPrint && (
        <PrintPreviewModal
          title={`Laporan Piutang Usaha — ${selectedCompany}`}
          onClose={() => setShowPrint(false)}
          printUrl=""
          useContentFrame={true}
          allowPaperSettings={true}
        >
          <div className="p-8 bg-white">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold">{selectedCompany}</h2>
              <h3 className="text-lg font-semibold mt-2">Laporan Piutang Usaha</h3>
              <p className="text-sm text-gray-600 mt-1">
                Periode: {isoToDisplay(filters.from_date)} s/d {isoToDisplay(filters.to_date)}
              </p>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-2 px-2">No. Faktur</th>
                  <th className="text-left py-2 px-2">Tanggal</th>
                  <th className="text-left py-2 px-2">Pelanggan</th>
                  <th className="text-left py-2 px-2">Status</th>
                  <th className="text-right py-2 px-2">Grand Total</th>
                  <th className="text-right py-2 px-2">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {arEntries.map((entry, index) => (
                  <tr key={entry.name || entry.voucher_no || `ar-${index}`} className="border-b border-gray-200">
                    <td className="py-2 px-2 font-medium">{entry.voucher_no}</td>
                    <td className="py-2 px-2">{formatDate(entry.posting_date)}</td>
                    <td className="py-2 px-2">{entry.customer_name || entry.customer}</td>
                    <td className="py-2 px-2">
                      {calcOverdueDays(entry.due_date) > 0 ? 'Terlambat' : 'Tepat Waktu'}
                    </td>
                    <td className="py-2 px-2 text-right">{formatCurrency(entry.invoice_grand_total)}</td>
                    <td className="py-2 px-2 text-right">{formatCurrency(entry.outstanding_amount || 0)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300 font-bold">
                  <td colSpan={4} className="py-2 px-2 text-right">TOTAL:</td>
                  <td className="py-2 px-2 text-right">
                    {formatCurrency(arEntries.reduce((sum, e) => sum + (e.invoice_grand_total || 0), 0))}
                  </td>
                  <td className="py-2 px-2 text-right">
                    {formatCurrency(arEntries.reduce((sum, e) => sum + (e.outstanding_amount || 0), 0))}
                  </td>
                </tr>
              </tfoot>
            </table>

            <div className="mt-6 text-xs text-gray-500 text-center">
              Dicetak pada: {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </PrintPreviewModal>
      )}

      {/* Sales Person Dialog */}
      <SalesPersonDialog
        isOpen={showSalesPersonDialog}
        onClose={() => setShowSalesPersonDialog(false)}
        onSelect={handleSalesPersonSelect}
      />
    </div>
  );
}