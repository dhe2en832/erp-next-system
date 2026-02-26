'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  FileDown, Printer, Package, AlertCircle,
  ArrowDownCircle, ArrowUpCircle, BarChart3,
  Calendar, FileText, ArrowUp, Loader2, Eye, X,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import PrintPreviewModal from '../../../components/PrintPreviewModal';

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
interface StockLedgerEntry {
  name: string;
  posting_date: string;
  posting_time: string;
  item_code: string;
  item_name: string;
  warehouse: string;
  voucher_type: string;
  voucher_no: string;
  actual_qty: number;
  qty_after_transaction: number;
  stock_uom: string;
  stock_value_difference?: number;
  party?: string;
  party_name?: string;
  batch_no?: string;
  serial_no?: string;
}

interface SummaryData {
  opening_balance: number;
  closing_balance: number;
  total_in: number;
  total_out: number;
  transaction_count: number;
  item_name: string;
  uom: string;
}

interface DropdownOption {
  value: string;
  label: string;
}

interface StockCardAPIResponse {
  success: boolean;
  data?: StockLedgerEntry[];
  summary?: SummaryData;
  pagination: {
    current_page: number;
    page_size: number;
    total_records: number;
    total_pages: number;
  };
  message?: string;
}

interface FilterState {
  from_date: string;
  to_date: string;
  item_code: string;
  warehouse: string;
  customer: string;
  supplier: string;
  transaction_type: string;
}

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const TRANSACTION_TYPE_OPTIONS: { label: string; value: string }[] = [
  { label: 'Semua Transaksi', value: '' },
  { label: 'Faktur Penjualan', value: 'Sales Invoice' },
  { label: 'Faktur Pembelian', value: 'Purchase Invoice' },
  { label: 'Entri Stok', value: 'Stock Entry' },
  { label: 'Tanda Terima Pembelian', value: 'Purchase Receipt' },
  { label: 'Surat Jalan', value: 'Delivery Note' },
  { label: 'Penyesuaian Stok', value: 'Stock Reconciliation' },
  { label: 'Pesanan Manufaktur', value: 'Work Order' },
];

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function isoToDisplay(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function displayToISO(display: string): string {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(display)) return '';
  const [dd, mm, yyyy] = display.split('/');
  return `${yyyy}-${mm}-${dd}`;
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

function voucherTypeLabel(value: string): string {
  return TRANSACTION_TYPE_OPTIONS.find(o => o.value === value)?.label ?? value;
}

// ─────────────────────────────────────────────────────────────
// BrowserStyleDatePicker
// ─────────────────────────────────────────────────────────────
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

  useEffect(() => { setDisplay(value ? isoToDisplay(value) : ''); }, [value]);

  const handleTextChange = (raw: string) => {
    let v = raw.replace(/[^\d/]/g, '').slice(0, 10);
    const digits = v.replace(/\//g, '');
    if (digits.length === 2 && !v.includes('/')) v += '/';
    else if (digits.length === 4 && v.split('/').length === 2) v += '/';
    setDisplay(v);
    const iso = displayToISO(v);
    if (iso) onChange(iso);
    else if (!v) onChange('');
  };

  const handleBlur = () => {
    if (display && !displayToISO(display)) setDisplay(value ? isoToDisplay(value) : '');
  };

  const openPicker = () => {
    if (!nativeRef.current) return;
    if (value) nativeRef.current.value = value;
    if (typeof nativeRef.current.showPicker === 'function') nativeRef.current.showPicker();
    else nativeRef.current.click();
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
          tabIndex={-1}
          aria-label="Buka kalender"
          className="absolute right-2.5 text-gray-400 hover:text-emerald-500 transition-colors"
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

// ─────────────────────────────────────────────────────────────
// Skeleton Loaders
// ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <li className="px-4 py-4 border-b border-gray-100">
      <div className="space-y-3 animate-pulse">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-1/2 mt-2" />
          </div>
          <div className="h-5 bg-gray-200 rounded w-20" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="h-8 bg-gray-200 rounded" />
          <div className="h-8 bg-gray-200 rounded" />
          <div className="h-8 bg-gray-200 rounded" />
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="h-4 bg-gray-200 rounded w-24" />
          <div className="h-8 w-8 bg-gray-200 rounded" />
        </div>
      </div>
    </li>
  );
}

// ─────────────────────────────────────────────────────────────
// Summary Panel
// ─────────────────────────────────────────────────────────────
function SummaryPanel({ summary }: { summary: SummaryData }) {
  const cards = [
    { label: 'Saldo Awal',   value: `${summary.opening_balance.toLocaleString('id-ID')} ${summary.uom}`, icon: <BarChart3 className="w-4 h-4" />,       color: 'blue'    },
    { label: 'Total Masuk',  value: `${summary.total_in.toLocaleString('id-ID')} ${summary.uom}`,         icon: <ArrowDownCircle className="w-4 h-4" />, color: 'emerald' },
    { label: 'Total Keluar', value: `${summary.total_out.toLocaleString('id-ID')} ${summary.uom}`,        icon: <ArrowUpCircle className="w-4 h-4" />,   color: 'orange'  },
    { label: 'Saldo Akhir',  value: `${summary.closing_balance.toLocaleString('id-ID')} ${summary.uom}`, icon: <Package className="w-4 h-4" />,         color: 'indigo'  },
  ] as const;

  const colorMap = {
    blue:    { bg: 'bg-blue-50',    border: 'border-blue-200',    icon: 'text-blue-500',    label: 'text-blue-500',    value: 'text-blue-900' },
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'text-emerald-500', label: 'text-emerald-500', value: 'text-emerald-900' },
    orange:  { bg: 'bg-orange-50',  border: 'border-orange-200',  icon: 'text-orange-500',  label: 'text-orange-500',  value: 'text-orange-900' },
    indigo:  { bg: 'bg-indigo-50',  border: 'border-indigo-200',  icon: 'text-indigo-500',  label: 'text-indigo-500',  value: 'text-indigo-900' },
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3 sm:px-6 lg:px-8">
      {summary.item_name && (
        <div className="flex items-center gap-2 mb-2">
          <Package className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-sm font-semibold text-gray-700">{summary.item_name}</span>
          <span className="text-xs text-gray-400 ml-auto">{summary.transaction_count} transaksi</span>
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {cards.map(({ label, value, icon, color }) => {
          const c = colorMap[color];
          return (
            <div key={label} className={`${c.bg} ${c.border} border rounded-lg p-2.5`}>
              <div className={`flex items-center gap-1 mb-0.5 ${c.icon}`}>
                {icon}
                <span className={`text-xs font-medium ${c.label}`}>{label}</span>
              </div>
              <p className={`text-sm font-bold ${c.value} leading-tight`}>{value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Detail Modal
// ─────────────────────────────────────────────────────────────
function StockDetailModal({ entry, onClose }: { entry: StockLedgerEntry; onClose: () => void }) {
  const isIn = entry.actual_qty > 0;
  const rows = [
    { label: 'No. Voucher',    value: entry.voucher_no },
    { label: 'Tipe Transaksi', value: voucherTypeLabel(entry.voucher_type) },
    { label: 'Kode Item',      value: entry.item_code },
    { label: 'Nama Item',      value: entry.item_name },
    { label: 'Gudang',         value: entry.warehouse },
    { label: 'Tanggal',        value: formatDate(entry.posting_date) },
    { label: 'Waktu',          value: entry.posting_time?.slice(0, 5) || '-' },
    { label: 'Pihak',          value: entry.party_name || entry.party || '-' },
    { label: 'Batch No',       value: entry.batch_no || '-' },
    { label: 'Serial No',      value: entry.serial_no || '-' },
    { label: 'Nilai',          value: entry.stock_value_difference ? formatCurrency(entry.stock_value_difference) : '-' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Package className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Detail Kartu Stok</h2>
              <p className="text-xs text-gray-400 font-mono">{entry.voucher_no}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Qty highlight */}
        <div className="mx-6 mt-4 grid grid-cols-2 gap-3">
          <div className={`rounded-xl p-3 text-center ${isIn ? 'bg-emerald-50' : 'bg-orange-50'}`}>
            <p className={`text-xs font-medium mb-1 ${isIn ? 'text-emerald-600' : 'text-orange-600'}`}>
              {isIn ? 'Qty Masuk' : 'Qty Keluar'}
            </p>
            <p className={`text-sm font-bold ${isIn ? 'text-emerald-700' : 'text-orange-700'}`}>
              {Math.abs(entry.actual_qty).toLocaleString('id-ID')} {entry.stock_uom}
            </p>
          </div>
          <div className="bg-indigo-50 rounded-xl p-3 text-center">
            <p className="text-xs text-indigo-600 font-medium mb-1">Saldo Setelah</p>
            <p className="text-sm font-bold text-indigo-700">
              {entry.qty_after_transaction.toLocaleString('id-ID')} {entry.stock_uom}
            </p>
          </div>
        </div>

        {/* Fields */}
        <div className="px-6 py-4 space-y-1">
          {rows.map(({ label, value }) => (
            <div key={label} className="flex items-start justify-between gap-4 py-2 border-b border-gray-50 last:border-0">
              <span className="text-sm text-gray-500 shrink-0 w-32">{label}</span>
              <span className="text-sm text-gray-900 text-right font-medium break-all">{value}</span>
            </div>
          ))}
        </div>

        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Pagination (Desktop)
// ─────────────────────────────────────────────────────────────
function Pagination({ currentPage, totalPages, totalRecords, pageSize, onPageChange }: {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  pageSize: number;
  onPageChange: (p: number) => void;
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
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3">
      <p className="text-sm text-gray-500">
        Menampilkan <span className="font-medium text-gray-900">{start}–{end}</span> dari{' '}
        <span className="font-medium text-gray-900">{totalRecords.toLocaleString('id-ID')}</span> transaksi
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          ‹
        </button>
        {pages.map((p, i) =>
          p === '...'
            ? <span key={`ell-${i}`} className="w-8 h-8 flex items-center justify-center text-gray-400 text-sm">…</span>
            : <button
                key={p}
                onClick={() => onPageChange(p as number)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${currentPage === p ? 'bg-emerald-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                {p}
              </button>
        )}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          ›
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
export default function StockCardReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile(768);

  // Dynamic pageSize: Mobile 10, Desktop 20
  const pageSize = isMobile ? 10 : 20;

  // ── State ──────────────────────────────────────────────────
  const [entries, setEntries] = useState<StockLedgerEntry[]>([]);
  const [summary, setSummary] = useState<SummaryData | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<StockLedgerEntry | null>(null);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [showPrint, setShowPrint] = useState(false);

  // Dropdown options
  const [items, setItems] = useState<DropdownOption[]>([]);
  const [warehouses, setWarehouses] = useState<DropdownOption[]>([]);
  const [customers, setCustomers] = useState<DropdownOption[]>([]);
  const [suppliers, setSuppliers] = useState<DropdownOption[]>([]);

  // Filters
  const [filters, setFilters] = useState<FilterState>({
    from_date: getYesterday(),
    to_date: getToday(),
    item_code: '',
    warehouse: '',
    customer: '',
    supplier: '',
    transaction_type: '',
  });

  // Refs
  const pageChangeSourceRef = useRef<'pagination' | 'filter' | 'init'>('init');

  // ── URL Sync ───────────────────────────────────────────────
  useEffect(() => {
    const pageFromUrl = searchParams.get('page');
    if (pageFromUrl && !isNaN(parseInt(pageFromUrl))) {
      const n = parseInt(pageFromUrl);
      if (n >= 1) setCurrentPage(n);
    }
  }, [searchParams]);

  // ── Company from localStorage / cookie ────────────────────
  useEffect(() => {
    let saved = localStorage.getItem('selected_company');
    if (!saved) {
      const cookie = document.cookie.split(';').find(c => c.trim().startsWith('selected_company='));
      if (cookie) { saved = cookie.split('=')[1]; if (saved) localStorage.setItem('selected_company', saved); }
    }
    if (saved) setSelectedCompany(saved);
  }, []);

  // ── Fetch dropdown options ─────────────────────────────────
  const fetchDropdownOptions = useCallback(async () => {
    if (!selectedCompany) return;
    try {
      const [itemsRes, whRes, custRes, suppRes] = await Promise.all([
        fetch(`/api/inventory/items?company=${encodeURIComponent(selectedCompany)}&limit=1000`, { credentials: 'include' }),
        fetch(`/api/inventory/warehouses?company=${encodeURIComponent(selectedCompany)}`, { credentials: 'include' }),
        fetch(`/api/sales/customers?company=${encodeURIComponent(selectedCompany)}&limit=1000`, { credentials: 'include' }),
        fetch(`/api/purchase/suppliers?company=${encodeURIComponent(selectedCompany)}&limit=1000`, { credentials: 'include' }),
      ]);
      const [id, wd, cd, sd] = await Promise.all([itemsRes.json(), whRes.json(), custRes.json(), suppRes.json()]);
      if (id.success) setItems((id.data ?? []).map((i: { item_code?: string; item_name?: string; name: string }) => ({ value: i.item_code || i.name, label: `${i.item_name || i.name} (${i.item_code || i.name})` })));
      if (wd.success) setWarehouses((wd.data ?? []).map((w: { name: string; warehouse_name?: string }) => ({ value: w.name, label: w.warehouse_name || w.name })));
      if (cd.success) setCustomers((cd.data ?? []).map((c: { name: string; customer_name?: string }) => ({ value: c.name, label: c.customer_name || c.name })));
      if (sd.success) setSuppliers((sd.data ?? []).map((s: { name: string; supplier_name?: string }) => ({ value: s.name, label: s.supplier_name || s.name })));
    } catch (err) { console.error('Gagal memuat opsi dropdown:', err); }
  }, [selectedCompany]);

  useEffect(() => {
    if (selectedCompany) fetchDropdownOptions();
  }, [selectedCompany, fetchDropdownOptions]);

  // ── Fetch data ─────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!selectedCompany) return;

    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        company: selectedCompany,
        page: String(currentPage),
        limit: String(pageSize),
        order_by: 'posting_date desc, posting_time desc',
      });
      if (filters.item_code)       params.set('item_code',        filters.item_code);
      if (filters.from_date)       params.set('from_date',        filters.from_date);
      if (filters.to_date)         params.set('to_date',          filters.to_date);
      if (filters.warehouse)       params.set('warehouse',        filters.warehouse);
      if (filters.customer)        params.set('customer',         filters.customer);
      if (filters.supplier)        params.set('supplier',         filters.supplier);
      if (filters.transaction_type) params.set('transaction_type', filters.transaction_type);

      const res = await fetch(`/api/inventory/reports/stock-card?${params}`, { credentials: 'include' });
      const result: StockCardAPIResponse = await res.json();

      if (result.success) {
        const data = result.data ?? [];
        const total = result.pagination?.total_records ?? 0;
        const pages = result.pagination?.total_pages ?? Math.ceil(total / pageSize);

        setEntries(data);
        setSummary(result.summary);
        setTotalRecords(total);
        setTotalPages(pages);
        
        if (data.length === 0) setError('Tidak ada data kartu stok untuk filter yang dipilih.');
        else setError('');
      } else {
        setError(result.message || 'Gagal memuat laporan kartu stok');
        setEntries([]);
        setSummary(undefined);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat memuat data');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, currentPage, pageSize, filters]);

  // ── Reset page when filters change ────────────────────────
  useEffect(() => {
    pageChangeSourceRef.current = 'filter';
    setCurrentPage(1);
  }, [filters]);

  // ── Fetch on page change ───────────────────────────────────
  useEffect(() => {
    if (selectedCompany) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // ── Trigger fetch on filter change ────────────────────────
  useEffect(() => {
    if (pageChangeSourceRef.current === 'filter' && selectedCompany) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // ── Back to top ────────────────────────────────────────────
  useEffect(() => {
    const h = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  // ── Export Excel ───────────────────────────────────────────
  const handleExportExcel = useCallback(() => {
    if (!entries.length) { alert('Tidak ada data untuk diekspor'); return; }
    const rows = entries.map((e, i) => ({
      'No': i + 1,
      'Tanggal': e.posting_date,
      'Waktu': e.posting_time,
      'Kode Item': e.item_code,
      'Nama Item': e.item_name,
      'Gudang': e.warehouse,
      'Jenis Transaksi': voucherTypeLabel(e.voucher_type),
      'No. Voucher': e.voucher_no,
      'Pihak': e.party_name || '-',
      'Qty Masuk': e.actual_qty > 0 ? e.actual_qty : 0,
      'Qty Keluar': e.actual_qty < 0 ? Math.abs(e.actual_qty) : 0,
      'Saldo': e.qty_after_transaction,
      'UOM': e.stock_uom,
      'Nilai': e.stock_value_difference || 0,
    }));
    if (summary) rows.push({ 'No': 0, 'Tanggal': '', 'Waktu': '', 'Kode Item': '', 'Nama Item': 'RINGKASAN', 'Gudang': '', 'Jenis Transaksi': '', 'No. Voucher': '', 'Pihak': '', 'Qty Masuk': summary.total_in, 'Qty Keluar': summary.total_out, 'Saldo': summary.closing_balance, 'UOM': summary.uom, 'Nilai': 0 });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Kartu Stok');
    XLSX.writeFile(wb, `Kartu_Stok_${selectedCompany}_${getToday()}.xlsx`);
  }, [entries, summary, selectedCompany]);

  const handleResetFilters = () => {
    setFilters({ from_date: getYesterday(), to_date: getToday(), item_code: '', warehouse: '', customer: '', supplier: '', transaction_type: '' });
    setSummary(undefined);
  };

  const handlePageChange = useCallback((page: number) => {
    pageChangeSourceRef.current = 'pagination';
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500';

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Sticky Header ──────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6 lg:px-8 sticky top-0 z-30">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Laporan Kartu Stok</h1>
            <p className="text-sm text-gray-500">Pergerakan stok per item dengan detail transaksi</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              disabled={loading || !entries.length}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              <FileDown className="h-4 w-4" />
              Export Excel
            </button>
            <button
              onClick={() => setShowPrint(true)}
              disabled={loading || !entries.length}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 text-white text-sm font-medium rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              <Printer className="h-4 w-4" />
              Cetak
            </button>
          </div>
        </div>
      </div>

      {/* ── Filter Bar ─────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6 lg:px-8">
        {/* Row 1: Item + Tanggal */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Item</label>
            <select value={filters.item_code} onChange={e => setFilters(p => ({ ...p, item_code: e.target.value }))} className={inputCls}>
              <option value="">Semua Item</option>
              {items.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Gudang</label>
            <select value={filters.warehouse} onChange={e => setFilters(p => ({ ...p, warehouse: e.target.value }))} className={inputCls}>
              <option value="">Semua Gudang</option>
              {warehouses.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Tipe Transaksi</label>
            <select value={filters.transaction_type} onChange={e => setFilters(p => ({ ...p, transaction_type: e.target.value }))} className={inputCls}>
              {TRANSACTION_TYPE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>

          <div>
            <BrowserStyleDatePicker
              label="Dari Tanggal"
              value={filters.from_date}
              onChange={v => setFilters(p => ({ ...p, from_date: v }))}
              placeholder="DD/MM/YYYY"
              className={inputCls}
            />
          </div>

          <div>
            <BrowserStyleDatePicker
              label="Sampai Tanggal"
              value={filters.to_date}
              onChange={v => setFilters(p => ({ ...p, to_date: v }))}
              placeholder="DD/MM/YYYY"
              className={inputCls}
            />
          </div>
        </div>

        {/* Row 2: Customer / Supplier */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Pelanggan</label>
            <select value={filters.customer} onChange={e => setFilters(p => ({ ...p, customer: e.target.value, supplier: '' }))} className={inputCls}>
              <option value="">Semua Pelanggan</option>
              {customers.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Pemasok</label>
            <select value={filters.supplier} onChange={e => setFilters(p => ({ ...p, supplier: e.target.value, customer: '' }))} className={inputCls}>
              <option value="">Semua Pemasok</option>
              {suppliers.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleResetFilters}
              className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors w-full sm:w-auto"
            >
              ⟲ Reset Filter
            </button>
          </div>
        </div>
      </div>

      {/* ── Summary Panel (muncul jika ada data) ───────────── */}
      {summary && <SummaryPanel summary={summary} />}

      {/* ── Error ──────────────────────────────────────────── */}
      {error && (
        <div className="px-4 py-3 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        </div>
      )}

      {/* ── List Container ─────────────────────────────────── */}
      <div className="px-4 py-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

          {/* Progress Indicator */}
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs text-gray-600 flex items-center justify-between">
            <span>
              Menampilkan <span className="font-medium">{entries.length}</span> dari{' '}
              <span className="font-medium">{totalRecords.toLocaleString('id-ID')}</span> transaksi
            </span>
            {totalPages > 1 && (
              <span className="text-gray-500">Halaman {currentPage} dari {totalPages}</span>
            )}
          </div>

          {/* ── Table Header — Desktop Only ─────────────────── */}
          {!isMobile && entries.length > 0 && (
            <div className="hidden sm:flex items-center px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div className="grid grid-cols-12 gap-3 w-full">
                <div className="col-span-2">Tanggal / Waktu</div>
                <div className="col-span-3">Item</div>
                <div className="col-span-2">Gudang</div>
                <div className="col-span-2">Tipe / Voucher</div>
                <div className="col-span-1 text-right">Masuk</div>
                <div className="col-span-1 text-right">Keluar</div>
                <div className="col-span-1 text-right">Saldo</div>
              </div>
            </div>
          )}

          {/* ── Rows ───────────────────────────────────────── */}
          <ul className="divide-y divide-gray-100">

            {/* Skeleton — initial loading */}
            {loading && Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}

            {entries.map(entry => {
              const isIn = entry.actual_qty > 0;
              return (
                <li key={entry.name || entry.voucher_no} className="cursor-pointer hover:bg-emerald-50/40 transition-colors"
                  onClick={() => setSelectedEntry(entry)}>
                  <div className="px-4 py-4">
                    {isMobile ? (
                      // ─── Mobile Card ───────────────────────
                      <div className="space-y-3">
                        {/* Row 1: Voucher + Tanggal */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-emerald-700 truncate font-mono">{entry.voucher_no}</p>
                            <p className="text-xs text-gray-500 mt-0.5 truncate">{entry.item_name}</p>
                          </div>
                          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border bg-gray-100 text-gray-700 border-gray-200 shrink-0">
                            {voucherTypeLabel(entry.voucher_type)}
                          </span>
                        </div>

                        {/* Row 2: Meta info */}
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                          <span>📅 {formatDate(entry.posting_date)}</span>
                          <span className="truncate">🏪 {entry.warehouse}</span>
                        </div>

                        {/* Row 3: Qty boxes */}
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-emerald-50 rounded-lg p-2 text-center">
                            <p className="text-[10px] text-emerald-600 font-medium">MASUK</p>
                            <p className="text-sm font-bold text-emerald-700">
                              {isIn ? `+${entry.actual_qty.toLocaleString('id-ID')}` : '-'}
                            </p>
                          </div>
                          <div className="bg-orange-50 rounded-lg p-2 text-center">
                            <p className="text-[10px] text-orange-600 font-medium">KELUAR</p>
                            <p className="text-sm font-bold text-orange-700">
                              {!isIn ? Math.abs(entry.actual_qty).toLocaleString('id-ID') : '-'}
                            </p>
                          </div>
                          <div className="bg-indigo-50 rounded-lg p-2 text-center">
                            <p className="text-[10px] text-indigo-600 font-medium">SALDO</p>
                            <p className="text-sm font-bold text-indigo-700">
                              {entry.qty_after_transaction.toLocaleString('id-ID')}
                            </p>
                          </div>
                        </div>

                        {/* Row 4: UOM + party */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                          <span className="text-xs text-gray-400">{entry.stock_uom}</span>
                          {entry.party_name && (
                            <span className="text-xs text-gray-500 truncate max-w-[160px]">{entry.party_name}</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      // ─── Desktop Row ────────────────────────
                      <div className="grid grid-cols-12 gap-3 items-center">
                        <div className="col-span-2 min-w-0">
                          <p className="text-sm text-gray-900">{formatDate(entry.posting_date)}</p>
                          {entry.posting_time && (
                            <p className="text-xs text-gray-400">{entry.posting_time.slice(0, 5)}</p>
                          )}
                        </div>
                        <div className="col-span-3 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate" title={entry.item_name}>{entry.item_name}</p>
                          <p className="text-xs text-gray-400 font-mono">{entry.item_code}</p>
                        </div>
                        <div className="col-span-2 min-w-0">
                          <p className="text-sm text-gray-600 truncate" title={entry.warehouse}>{entry.warehouse}</p>
                          {entry.party_name && (
                            <p className="text-xs text-gray-400 truncate">{entry.party_name}</p>
                          )}
                        </div>
                        <div className="col-span-2 min-w-0">
                          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border bg-gray-100 text-gray-700 border-gray-200">
                            {voucherTypeLabel(entry.voucher_type)}
                          </span>
                          <p className="text-xs text-gray-400 font-mono mt-0.5 truncate">{entry.voucher_no}</p>
                        </div>
                        {/* Qty Masuk */}
                        <div className="col-span-1 text-right tabular-nums">
                          {isIn
                            ? <span className="text-sm font-semibold text-emerald-700">+{entry.actual_qty.toLocaleString('id-ID')} <span className="text-xs font-normal text-emerald-400">{entry.stock_uom}</span></span>
                            : <span className="text-gray-300 text-sm">-</span>
                          }
                        </div>
                        {/* Qty Keluar */}
                        <div className="col-span-1 text-right tabular-nums">
                          {!isIn
                            ? <span className="text-sm font-semibold text-orange-700">{Math.abs(entry.actual_qty).toLocaleString('id-ID')} <span className="text-xs font-normal text-orange-400">{entry.stock_uom}</span></span>
                            : <span className="text-gray-300 text-sm">-</span>
                          }
                        </div>
                        {/* Saldo */}
                        <div className="col-span-1 text-right tabular-nums">
                          <span className="text-sm font-semibold text-indigo-700">{entry.qty_after_transaction.toLocaleString('id-ID')} <span className="text-xs font-normal text-indigo-400">{entry.stock_uom}</span></span>
                        </div>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {/* ── Empty State ─────────────────────────────────── */}
          {entries.length === 0 && !loading && (
            <div className="text-center py-16 px-4">
              <FileText className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4 text-sm text-gray-500">Tidak ada transaksi stok ditemukan</p>
              <p className="mt-1 text-xs text-gray-400">Coba ubah filter atau rentang tanggal</p>
            </div>
          )}

          {/* ── Pagination (Mobile & Desktop) ────────────────── */}
          {totalPages > 1 && (
            <div className="bg-gray-50 border-t border-gray-200">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalRecords={totalRecords}
                pageSize={pageSize}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </div>

      </div>

      {/* ── Detail Modal ────────────────────────────────────── */}
      {selectedEntry && (
        <StockDetailModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
      )}

      {/* ── Back to Top FAB ─────────────────────────────────── */}
      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-50 inline-flex items-center justify-center w-12 h-12 bg-emerald-600 text-white rounded-full shadow-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all transform hover:scale-105"
          title="Kembali ke atas"
          aria-label="Back to top"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}

      {/* Print Modal */}
      {showPrint && (
        <PrintPreviewModal
          title={`Laporan Kartu Stok — ${selectedCompany}`}
          onClose={() => setShowPrint(false)}
          printUrl=""
          useContentFrame={true}
          allowPaperSettings={true}
        >
          <div className="p-8 bg-white">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold">{selectedCompany}</h2>
              <h3 className="text-lg font-semibold mt-2">Laporan Kartu Stok</h3>
              <p className="text-sm text-gray-600 mt-1">
                Periode: {isoToDisplay(filters.from_date)} s/d {isoToDisplay(filters.to_date)}
              </p>
              {summary && (
                <p className="text-sm text-gray-600 mt-1">
                  {summary.item_name} - Saldo Akhir: {summary.closing_balance.toLocaleString('id-ID')} {summary.uom}
                </p>
              )}
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-2 px-2">Tanggal</th>
                  <th className="text-left py-2 px-2">Item</th>
                  <th className="text-left py-2 px-2">Gudang</th>
                  <th className="text-left py-2 px-2">Tipe / Voucher</th>
                  <th className="text-right py-2 px-2">Masuk</th>
                  <th className="text-right py-2 px-2">Keluar</th>
                  <th className="text-right py-2 px-2">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, index) => {
                  const isIn = entry.actual_qty > 0;
                  return (
                    <tr key={entry.name || entry.voucher_no || `stock-${index}`} className="border-b border-gray-200">
                      <td className="py-2 px-2">{formatDate(entry.posting_date)}</td>
                      <td className="py-2 px-2">
                        <div className="font-medium">{entry.item_name}</div>
                        <div className="text-xs text-gray-500">{entry.item_code}</div>
                      </td>
                      <td className="py-2 px-2">{entry.warehouse}</td>
                      <td className="py-2 px-2">
                        <div>{voucherTypeLabel(entry.voucher_type)}</div>
                        <div className="text-xs text-gray-500">{entry.voucher_no}</div>
                      </td>
                      <td className="py-2 px-2 text-right">
                        {isIn ? `${entry.actual_qty.toLocaleString('id-ID')} ${entry.stock_uom}` : '-'}
                      </td>
                      <td className="py-2 px-2 text-right">
                        {!isIn ? `${Math.abs(entry.actual_qty).toLocaleString('id-ID')} ${entry.stock_uom}` : '-'}
                      </td>
                      <td className="py-2 px-2 text-right font-medium">
                        {entry.qty_after_transaction.toLocaleString('id-ID')} {entry.stock_uom}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {summary && (
                <tfoot>
                  <tr className="border-t-2 border-gray-300 font-bold">
                    <td colSpan={4} className="py-2 px-2 text-right">RINGKASAN:</td>
                    <td className="py-2 px-2 text-right">{summary.total_in.toLocaleString('id-ID')} {summary.uom}</td>
                    <td className="py-2 px-2 text-right">{summary.total_out.toLocaleString('id-ID')} {summary.uom}</td>
                    <td className="py-2 px-2 text-right">{summary.closing_balance.toLocaleString('id-ID')} {summary.uom}</td>
                  </tr>
                </tfoot>
              )}
            </table>

            <div className="mt-6 text-xs text-gray-500 text-center">
              Dicetak pada: {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </PrintPreviewModal>
      )}
    </div>
  );
}