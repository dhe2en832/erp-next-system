'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Search, X, Eye, ArrowUp, ChevronLeft, ChevronRight, BookOpen, Calendar } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

export const dynamic = 'force-dynamic';

// ─── Types ───────────────────────────────────────────────────────────────────

interface GLEntry {
  name: string;
  posting_date: string;
  account: string;
  debit: number;
  credit: number;
  voucher_type: string;
  voucher_no: string;
  cost_center: string;
  company: string;
  remarks: string;
  fiscal_year: string;
  is_opening: string;
  project: string | null;
}

type FilterState = {
  from_date: string;
  to_date: string;
  account: string;
  voucher_type: string;
};

type FetchMode = 'replace' | 'append';

// ─── Constants ────────────────────────────────────────────────────────────────

const FIELDS = [
  'name', 'posting_date', 'account', 'debit', 'credit',
  'voucher_type', 'voucher_no', 'cost_center', 'company',
  'remarks', 'fiscal_year', 'is_opening', 'project',
];

// Label Bahasa Indonesia — value tetap ERPNext untuk API
const VOUCHER_TYPE_OPTIONS: { label: string; value: string }[] = [
  { label: 'Semua Tipe Voucher', value: '' },
  { label: 'Jurnal Umum', value: 'Journal Entry' },
  { label: 'Faktur Penjualan', value: 'Sales Invoice' },
  { label: 'Faktur Pembelian', value: 'Purchase Invoice' },
  { label: 'Entri Pembayaran', value: 'Payment Entry' },
  { label: 'Tanda Terima Pembelian', value: 'Purchase Receipt' },
  { label: 'Surat Jalan', value: 'Delivery Note' },
  { label: 'Entri Stok', value: 'Stock Entry' },
  { label: 'Pesanan Pembelian', value: 'Purchase Order' },
  { label: 'Pesanan Penjualan', value: 'Sales Order' },
  { label: 'Penyesuaian Stok', value: 'Stock Reconciliation' },
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

function voucherLabel(value: string): string {
  return VOUCHER_TYPE_OPTIONS.find(o => o.value === value)?.label ?? value;
}

// company dikirim terpisah sebagai param `company`, BUKAN di dalam filters[]
function buildFilters(search: string, filters: FilterState): string {
  const f: [string, string, string][] = [];
  if (search) f.push(['account', 'like', `%${search}%`]);
  if (filters.from_date) f.push(['posting_date', '>=', filters.from_date]);
  if (filters.to_date) f.push(['posting_date', '<=', filters.to_date]);
  if (filters.account) f.push(['account', 'like', `%${filters.account}%`]);
  if (filters.voucher_type) f.push(['voucher_type', '=', filters.voucher_type]);
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
  value: string;       // YYYY-MM-DD (internal)
  onChange: (v: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}

function BrowserStyleDatePicker({ value, onChange, label, placeholder = 'DD/MM/YYYY', className = '' }: DatePickerProps) {
  const [display, setDisplay] = useState(value ? isoToDisplay(value) : '');
  const [prevValue, setPrevValue] = useState(value);
  const nativeRef = useRef<HTMLInputElement>(null);

  if (value !== prevValue) {
    setPrevValue(value);
    setDisplay(value ? isoToDisplay(value) : '');
  }

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
      // showPicker API untuk browser modern
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
        {/* Tombol kalender */}
        <button
          type="button"
          onClick={openPicker}
          className="absolute right-2.5 text-gray-400 hover:text-blue-500 transition-colors"
          tabIndex={-1}
          aria-label="Buka kalender"
        >
          <Calendar className="w-4 h-4" />
        </button>
        {/* Native date input — tersembunyi, hanya untuk menampilkan picker */}
        <input
          ref={nativeRef}
          type="date"
          defaultValue={value}
          onChange={e => { onChange(e.target.value); }}
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
      {Array.from({ length: 7 }).map((_, i) => (
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
        <div className="h-4 bg-gray-200 rounded w-1/3" />
        <div className="h-4 bg-gray-200 rounded w-1/4" />
      </div>
      <div className="h-3 bg-gray-200 rounded w-2/3" />
      <div className="flex justify-between">
        <div className="h-5 bg-gray-200 rounded w-1/3" />
        <div className="h-5 bg-gray-200 rounded w-1/3" />
      </div>
    </div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function GLDetailModal({ entry, onClose }: { entry: GLEntry; onClose: () => void }) {
  const rows = [
    { label: 'No. Entry', value: entry.name },
    { label: 'Tanggal Posting', value: formatDate(entry.posting_date) },
    { label: 'Akun', value: entry.account },
    { label: 'Pusat Biaya', value: entry.cost_center || '-' },
    { label: 'Tipe Voucher', value: voucherLabel(entry.voucher_type) },
    { label: 'No. Voucher', value: entry.voucher_no },
    { label: 'Perusahaan', value: entry.company },
    { label: 'Tahun Fiskal', value: entry.fiscal_year || '-' },
    { label: 'Proyek', value: entry.project || '-' },
    { label: 'Keterangan', value: entry.remarks || '-' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Detail GL Entry</h2>
              <p className="text-xs text-gray-400 font-mono">{entry.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mx-6 mt-4 grid grid-cols-2 gap-3">
          <div className="bg-emerald-50 rounded-xl p-3 text-center">
            <p className="text-xs text-emerald-600 font-medium mb-1">Debit</p>
            <p className="text-sm font-bold text-emerald-700">{entry.debit > 0 ? formatCurrency(entry.debit) : '-'}</p>
          </div>
          <div className="bg-rose-50 rounded-xl p-3 text-center">
            <p className="text-xs text-rose-600 font-medium mb-1">Kredit</p>
            <p className="text-sm font-bold text-rose-700">{entry.credit > 0 ? formatCurrency(entry.credit) : '-'}</p>
          </div>
        </div>

        <div className="px-6 py-4 space-y-1">
          {rows.map(({ label, value }) => (
            <div key={label} className="flex items-start justify-between gap-4 py-2 border-b border-gray-50 last:border-0">
              <span className="text-sm text-gray-500 shrink-0 w-36">{label}</span>
              <span className="text-sm text-gray-900 text-right font-medium break-all">{value}</span>
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
        <span className="font-medium text-gray-900">{totalRecords.toLocaleString('id-ID')}</span> entri
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

export default function GLEntryPage() {
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const pageSize = isMobile ? 10 : 20;

  const [currentPage, setCurrentPage] = useState<number>(() => {
    const p = parseInt(searchParams.get('page') ?? '1', 10);
    return isNaN(p) || p < 1 ? 1 : p;
  });

  const [glEntries, setGLEntries] = useState<GLEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedGLEntry, setSelectedGLEntry] = useState<GLEntry | null>(null);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [showBackToTop, setShowBackToTop] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  // Default: kemarin s/d hari ini
  const [filters, setFilters] = useState<FilterState>({
    from_date: getYesterday(),
    to_date: getToday(),
    account: '',
    voucher_type: '',
  });

  // ✅ FIX: Track pagination change source to prevent race conditions
  const pageChangeSourceRef = useRef<'pagination' | 'filter' | 'init'>('init');
  const sentinelRef = useRef<HTMLDivElement>(null);

  // ── Calculate Totals ──
  const totals = useMemo(() => {
    const totalDebit = glEntries.reduce((sum, entry) => sum + (entry.debit || 0), 0);
    const totalCredit = glEntries.reduce((sum, entry) => sum + (entry.credit || 0), 0);
    return { totalDebit, totalCredit };
  }, [glEntries]);
  const hasMoreRef = useRef(false);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    const h = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('selected_company');
    if (stored) { setSelectedCompany(stored); return; }
    const cookie = document.cookie.split(';').find(c => c.trim().startsWith('selected_company='));
    if (cookie) setSelectedCompany(decodeURIComponent(cookie.split('=')[1].trim()));
  }, []);

  // ✅ Sync URL dengan page state (desktop only)
  useEffect(() => {
    const pageFromUrl = searchParams.get('page');
    if (pageFromUrl && !isNaN(parseInt(pageFromUrl))) {
      const pageNum = parseInt(pageFromUrl);
      if (pageNum >= 1) setCurrentPage(pageNum);
    }
  }, [searchParams]);

  // ✅ Reset page when filters change
  useEffect(() => {
    pageChangeSourceRef.current = 'filter';
    setCurrentPage(1);
    if (isMobile) setGLEntries([]);
  }, [searchTerm, filters, isMobile]);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchGLEntries = useCallback(async (page: number, mode: FetchMode = 'replace') => {
    if (!selectedCompany) {
      setError('Tidak ada perusahaan yang dipilih. Silakan pilih perusahaan terlebih dahulu.');
      return;
    }
    if (mode === 'replace') setLoading(true);
    else setLoadingMore(true);
    loadingMoreRef.current = true;
    setError('');

    try {
      const filtersJson = buildFilters(searchTerm, filters);
      const start = (page - 1) * pageSize;

      const params = new URLSearchParams({
        company: selectedCompany,   // ← param terpisah, BUKAN di dalam filters[]
        filters: filtersJson,
        fields: JSON.stringify(FIELDS),
        limit_page_length: String(pageSize),
        limit_start: String(start),
        order_by: 'posting_date desc, name desc',
      });

      const res = await fetch(`/api/finance/gl-entry?${params}`);
      const data: { success: boolean; data?: GLEntry[]; total_records?: number; message?: string } = await res.json();

      if (data.success) {
        const entries = data.data ?? [];
        const total = data.total_records ?? 0;
        const pages = Math.ceil(total / pageSize);
        setGLEntries(prev => (mode === 'append' ? [...prev, ...entries] : entries));
        setTotalRecords(total);
        setTotalPages(pages);
        hasMoreRef.current = page < pages;
      } else {
        setError(data.message ?? 'Gagal memuat data GL Entry');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat memuat data');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  }, [selectedCompany, searchTerm, filters, pageSize]);

  // ✅ Fetch on company/page change
  useEffect(() => {
    if (selectedCompany) {
      fetchGLEntries(isMobile ? 1 : currentPage, 'replace');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompany, currentPage, isMobile]);

  // ✅ Trigger fetch on filter change (after reset)
  useEffect(() => {
    if (pageChangeSourceRef.current === 'filter' && selectedCompany) {
      fetchGLEntries(isMobile ? 1 : currentPage, 'replace');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, filters]);

  useEffect(() => {
    if (!isMobile || !sentinelRef.current) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMoreRef.current && !loadingMoreRef.current) {
        setCurrentPage(prev => { const next = prev + 1; fetchGLEntries(next, 'append'); return next; });
      }
    }, { rootMargin: '200px' });
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [isMobile, fetchGLEntries]);

  const handlePageChange = (page: number) => { 
    pageChangeSourceRef.current = 'pagination';
    setCurrentPage(page); 
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilters({ from_date: getYesterday(), to_date: getToday(), account: '', voucher_type: '' });
  };

  // Dianggap "active" jika ada filter di luar default
  const hasActiveFilters = !!(searchTerm || filters.account || filters.voucher_type);

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50 text-gray-700 placeholder:text-gray-400';

  // ── Mobile Card ──────────────────────────────────────────────────────────
  const MobileCard = ({ entry }: { entry: GLEntry }) => (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:bg-gray-50 transition-colors cursor-pointer"
      onClick={() => setSelectedGLEntry(entry)}>
      <div className="space-y-3">
        {/* Row 1: Voucher No + Date */}
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-indigo-600 truncate">{entry.voucher_no}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
                {voucherLabel(entry.voucher_type)}
              </span>
            </p>
          </div>
          <span className="ml-2 text-xs text-gray-500">📅 {formatDate(entry.posting_date)}</span>
        </div>
        
        {/* Row 2: Account */}
        <div className="text-sm text-gray-700 line-clamp-2" title={entry.account}>
          💼 {entry.account}
        </div>
        
        {/* Row 3: Debit + Kredit */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-500 mb-1">Debit</p>
            <p className="text-sm font-semibold text-emerald-700">
              {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Kredit</p>
            <p className="text-sm font-semibold text-rose-700">
              {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const progressPct = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {!isMobile && totalPages > 1 && (
        <div className="fixed top-0 left-0 w-full z-50 h-0.5 bg-gray-100">
          <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${progressPct}%` }} />
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-200">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Buku Besar</h1>
              <p className="text-sm text-gray-500">General Ledger Entry</p>
            </div>
            {!loading && totalRecords > 0 && (
              <span className="ml-auto text-sm font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {totalRecords.toLocaleString('id-ID')} entri
              </span>
            )}
          </div>
        </div>

        {/* ── Filter Panel ──────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4">
          {/* Row 1: Cari + 2 tanggal */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Cari Akun</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Nama akun..."
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

          {/* Row 2: Filter akun + tipe voucher + reset */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Filter Akun</label>
              <input
                type="text"
                placeholder="Kode / nama akun..."
                value={filters.account}
                onChange={e => setFilters(prev => ({ ...prev, account: e.target.value }))}
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tipe Voucher</label>
              <select
                value={filters.voucher_type}
                onChange={e => setFilters(prev => ({ ...prev, voucher_type: e.target.value }))}
                className={inputCls}
              >
                {VOUCHER_TYPE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={clearFilters}
                disabled={!hasActiveFilters && filters.from_date === getYesterday() && filters.to_date === getToday()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-default"
              >
                <X className="w-4 h-4" />
                Reset ke Default
              </button>
            </div>
          </div>

          {/* Badges filter aktif */}
          {(hasActiveFilters || filters.voucher_type) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {filters.voucher_type && (
                <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">
                  {voucherLabel(filters.voucher_type)}
                  <button onClick={() => setFilters(p => ({ ...p, voucher_type: '' }))}><X className="w-3 h-3" /></button>
                </span>
              )}
              {filters.account && (
                <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">
                  Akun: {filters.account}
                  <button onClick={() => setFilters(p => ({ ...p, account: '' }))}><X className="w-3 h-3" /></button>
                </span>
              )}
              {searchTerm && (
                <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">
                  &quot;{searchTerm}&quot;
                  <button onClick={() => setSearchTerm('')}><X className="w-3 h-3" /></button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
        )}

        {/* ── MOBILE: Card List ──────────────────────────────────────────── */}
        {isMobile ? (
          <div className="space-y-3">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
              : glEntries.length === 0
                ? <div className="text-center py-16 text-gray-400">
                    <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Tidak ada data GL Entry</p>
                  </div>
                : glEntries.map(entry => <MobileCard key={entry.name} entry={entry} />)
            }
            <div ref={sentinelRef} />
            {loadingMore && (
              <div className="flex justify-center py-4">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {!hasMoreRef.current && !loading && glEntries.length > 0 && (
              <p className="text-center text-xs text-gray-400 py-4">Semua data telah dimuat</p>
            )}

            {/* Totals Summary - Mobile */}
            {glEntries.length > 0 && (
              <div className="px-4 py-4 bg-indigo-50 border-t-2 border-indigo-200 sticky bottom-0">
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-gray-700 mb-2">
                    Total ({glEntries.length} entries):
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">Debit</p>
                      <p className="text-sm font-bold text-red-700">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totals.totalDebit)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">Kredit</p>
                      <p className="text-sm font-bold text-green-700">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totals.totalCredit)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">Selisih</p>
                      <p className={`text-sm font-bold ${Math.abs(totals.totalDebit - totals.totalCredit) < 0.01 ? 'text-green-700' : 'text-orange-700'}`}>
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Math.abs(totals.totalDebit - totals.totalCredit))}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── DESKTOP: Table ───────────────────────────────────────────── */
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <div className="max-h-[500px] overflow-y-auto">
                <table className="min-w-full">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-4 py-3 text-left   text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Tanggal</th>
                      <th className="px-4 py-3 text-left   text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Akun</th>
                      <th className="px-4 py-3 text-right  text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Debit</th>
                      <th className="px-4 py-3 text-right  text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Kredit</th>
                      <th className="px-4 py-3 text-left   text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Tipe Voucher</th>
                      <th className="px-4 py-3 text-left   text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">No. Voucher</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {loading
                      ? Array.from({ length: pageSize }).map((_, i) => <SkeletonRow key={i} />)
                      : glEntries.length === 0
                        ? <tr>
                            <td colSpan={7} className="px-6 py-16 text-center text-gray-400">
                              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                              <p className="text-sm">Tidak ada data GL Entry ditemukan</p>
                            </td>
                          </tr>
                        : glEntries.map(entry => (
                            <tr key={entry.name} className="hover:bg-blue-50/40 transition-colors group">
                              <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                                {formatDate(entry.posting_date)}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 max-w-[220px]">
                                <span className="line-clamp-1 block" title={entry.account}>{entry.account}</span>
                              </td>
                              {/* Debit — rata kanan, tabular nums */}
                              <td className="px-4 py-3 text-sm text-right whitespace-nowrap tabular-nums">
                                {entry.debit > 0
                                  ? <span className="font-semibold text-emerald-700">{formatCurrency(entry.debit)}</span>
                                  : <span className="text-gray-300">-</span>}
                              </td>
                              {/* Kredit — rata kanan, tabular nums */}
                              <td className="px-4 py-3 text-sm text-right whitespace-nowrap tabular-nums">
                                {entry.credit > 0
                                  ? <span className="font-semibold text-rose-700">{formatCurrency(entry.credit)}</span>
                                  : <span className="text-gray-300">-</span>}
                              </td>
                              <td className="px-4 py-3 text-sm whitespace-nowrap">
                                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
                                  {voucherLabel(entry.voucher_type)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 font-mono whitespace-nowrap">
                                {entry.voucher_no}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => setSelectedGLEntry(entry)}
                                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  Detail
                                </button>
                              </td>
                            </tr>
                          ))
                    }
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals Summary */}
            {glEntries.length > 0 && (
              <div className="px-4 py-4 bg-indigo-50 border-t-2 border-indigo-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-gray-700">
                    Total ({glEntries.length} entries):
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs text-gray-500 mb-0.5">Total Debit</p>
                      <p className="text-base font-bold text-red-700">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totals.totalDebit)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 mb-0.5">Total Kredit</p>
                      <p className="text-base font-bold text-green-700">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totals.totalCredit)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 mb-0.5">Selisih</p>
                      <p className={`text-base font-bold ${Math.abs(totals.totalDebit - totals.totalCredit) < 0.01 ? 'text-green-700' : 'text-orange-700'}`}>
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Math.abs(totals.totalDebit - totals.totalCredit))}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

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

      {selectedGLEntry && (
        <GLDetailModal entry={selectedGLEntry} onClose={() => setSelectedGLEntry(null)} />
      )}

      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-40 w-10 h-10 bg-gray-900 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-700 transition-all active:scale-95"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}