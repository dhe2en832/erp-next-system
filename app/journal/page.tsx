'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoadingSpinner from '../../components/LoadingSpinner';
import Pagination from '../components/Pagination';
import { formatDate, parseDate } from '../../utils/format';
import BrowserStyleDatePicker from '../../components/BrowserStyleDatePicker';
import { FileText, ArrowUp, Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────
// Hook: Deteksi mobile (breakpoint 768px)
// ─────────────────────────────────────────────────────────────
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [breakpoint]);
  return isMobile;
}

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
interface JournalEntry {
  name: string;
  voucher_type: string;
  posting_date: string;
  total_debit: number;
  total_credit: number;
  status: string;
  user_remark: string;
  company?: string;
  creation?: string;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);

const STATUS_COLORS: Record<string, string> = {
  Submitted: 'bg-green-100 text-green-800 border-green-200',
  Draft: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  Cancelled: 'bg-red-100 text-red-800 border-red-200',
};

const getStatusBadgeClass = (status: string) =>
  STATUS_COLORS[status] || 'bg-gray-100 text-gray-800 border-gray-200';

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
export default function JournalPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile(768);

  const pageSize = isMobile ? 10 : 20;
  const useInfiniteScrollMode = isMobile;

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [dateFilter, setDateFilter] = useState({
    from_date: formatDate(new Date(Date.now() - 86400000)),
    to_date: formatDate(new Date()),
  });
  const [nameFilter, setNameFilter] = useState('');
  const [voucherTypeFilter, setVoucherTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  // ✅ FIX: Track pagination change source to prevent race conditions
  const pageChangeSourceRef = useRef<'pagination' | 'filter' | 'init'>('init');
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // ── Calculate Totals ──
  const totals = useMemo(() => {
    const totalDebit = entries.reduce((sum, entry) => sum + (entry.total_debit || 0), 0);
    const totalCredit = entries.reduce((sum, entry) => sum + (entry.total_credit || 0), 0);
    return { totalDebit, totalCredit };
  }, [entries]);

  // ── Sync URL page ──
  useEffect(() => {
    const p = searchParams.get('page');
    if (p && !isNaN(parseInt(p))) setCurrentPage(Math.max(1, parseInt(p)));
  }, [searchParams]);

  // ── Company from localStorage/cookie ──
  useEffect(() => {
    let company = localStorage.getItem('selected_company');
    if (!company) {
      const c = document.cookie.split(';').find(c => c.trim().startsWith('selected_company='));
      if (c) {
        company = c.split('=')[1];
        if (company) localStorage.setItem('selected_company', company);
      }
    }
    if (company) setSelectedCompany(company);
  }, []);

  // ── Fetch ──
  const fetchEntries = useCallback(async (reset = false) => {
    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    if (reset) setError('');

    let company = selectedCompany;
    if (!company) {
      company = localStorage.getItem('selected_company') || '';
      if (!company) {
        const c = document.cookie.split(';').find(c => c.trim().startsWith('selected_company='));
        if (c) company = c.split('=')[1] || '';
      }
    }

    if (!company) {
      setError('Perusahaan belum dipilih. Silakan pilih perusahaan terlebih dahulu.');
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    if (!selectedCompany && company) setSelectedCompany(company);

    try {
      const params = new URLSearchParams();
      params.append('limit_page_length', String(pageSize));
      params.append('start', String((currentPage - 1) * pageSize));
      params.append('order_by', 'creation desc');
      params.append('company', company);
      if (nameFilter) params.append('search', nameFilter);
      if (voucherTypeFilter) params.append('voucher_type', voucherTypeFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (dateFilter.from_date) {
        const parsed = parseDate(dateFilter.from_date);
        if (parsed) params.append('from_date', parsed);
      }
      if (dateFilter.to_date) {
        const parsed = parseDate(dateFilter.to_date);
        if (parsed) params.append('to_date', parsed);
      }

      const res = await fetch(`/api/finance/journal?${params}`);
      const result = await res.json();

      if (result.success) {
        const data: JournalEntry[] = result.data || [];

        if (result.total_records !== undefined) {
          setTotalRecords(result.total_records);
          setTotalPages(Math.ceil(result.total_records / pageSize));
          setHasMoreData(currentPage < Math.ceil(result.total_records / pageSize));
        } else {
          setTotalRecords(data.length);
          setTotalPages(1);
          setHasMoreData(false);
        }

        if (reset) {
          setEntries(data);
          setError(data.length === 0 ? `Tidak ada jurnal untuk perusahaan: ${company}` : '');
        } else {
          setEntries(prev => {
            const existing = new Set(prev.map(e => e.name));
            return [...prev, ...data.filter(e => !existing.has(e.name))];
          });
        }
      } else {
        setError(result.message || 'Gagal memuat jurnal');
      }
    } catch {
      setError('Gagal memuat jurnal');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [currentPage, pageSize, dateFilter, nameFilter, voucherTypeFilter, statusFilter, selectedCompany]);

  // ── Effects ──
  // ✅ Reset page when filters change
  useEffect(() => {
    pageChangeSourceRef.current = 'filter';
    setCurrentPage(1);
    if (isMobile) setEntries([]);
  }, [dateFilter, nameFilter, voucherTypeFilter, statusFilter, isMobile]);

  // ✅ Fetch when page changes (separated from filter logic)
  useEffect(() => {
    if (selectedCompany) {
      fetchEntries(useInfiniteScrollMode ? false : true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, selectedCompany]);

  // ✅ Trigger fetch when filters change (after page reset)
  useEffect(() => {
    if (pageChangeSourceRef.current === 'filter' && selectedCompany) {
      fetchEntries(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter, nameFilter, voucherTypeFilter, statusFilter]);

  // ── Infinite Scroll ──
  const loadMoreData = useCallback(() => {
    if (!loadingMore && hasMoreData && useInfiniteScrollMode) {
      setCurrentPage(prev => (prev + 1 <= totalPages ? prev + 1 : prev));
    }
  }, [loadingMore, hasMoreData, useInfiniteScrollMode, totalPages]);

  useEffect(() => {
    if (!useInfiniteScrollMode || loading || loadingMore || !hasMoreData) return;
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) loadMoreData(); },
      { rootMargin: '100px' }
    );
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [useInfiniteScrollMode, loading, loadingMore, hasMoreData, loadMoreData]);

  // ── Back to Top ──
  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ── Reset Filters ──
  const handleResetFilters = () => {
    setDateFilter({
      from_date: formatDate(new Date(Date.now() - 86400000)),
      to_date: formatDate(new Date()),
    });
    setNameFilter('');
    setVoucherTypeFilter('');
    setStatusFilter('');
    setCurrentPage(1);
  };

  // ── Submit Journal Entry ──
  const handleSubmit = async (e: React.MouseEvent, entryName: string) => {
    e.stopPropagation(); // Prevent navigation to detail page
    
    if (!confirm(`Apakah Anda yakin ingin submit jurnal ${entryName}?`)) {
      return;
    }

    setSubmittingId(entryName);
    try {
      const response = await fetch(`/api/finance/journal/${encodeURIComponent(entryName)}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      const result = await response.json();

      if (result.success) {
        alert('Jurnal berhasil di-submit!');
        // Refresh data
        fetchEntries(true);
      } else {
        alert(`Gagal submit jurnal: ${result.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error submitting journal:', error);
      alert('Gagal submit jurnal. Silakan coba lagi.');
    } finally {
      setSubmittingId(null);
    }
  };

  // ── Skeleton ──
  const SkeletonCard = () => (
    <li className="px-4 py-4 border-b border-gray-100">
      <div className="space-y-3 animate-pulse">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-1/2 mt-2" />
          </div>
          <div className="h-5 bg-gray-200 rounded w-16" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="h-3 bg-gray-200 rounded" />
          <div className="h-3 bg-gray-200 rounded" />
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="h-4 bg-gray-200 rounded w-32" />
          <div className="h-4 bg-gray-200 rounded w-32" />
        </div>
      </div>
    </li>
  );

  if (loading && entries.length === 0) {
    return <LoadingSpinner message="Memuat Jurnal Umum..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6 lg:px-8 sticky top-0 z-30">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Jurnal Umum</h1>
          <button
            onClick={() => router.push('/journal/journalMain')}
            className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
          >
            + Buat Jurnal
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Cari Nama</label>
            <input
              type="text"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Nama jurnal..."
              value={nameFilter}
              onChange={e => setNameFilter(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Tipe Voucher</label>
            <select
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={voucherTypeFilter}
              onChange={e => setVoucherTypeFilter(e.target.value)}
            >
              <option value="">Semua Tipe</option>
              <option value="Journal Entry">Journal Entry</option>
              <option value="Opening Entry">Opening Entry</option>
              <option value="Bank Entry">Bank Entry</option>
              <option value="Cash Entry">Cash Entry</option>
              <option value="Credit Card Entry">Credit Card Entry</option>
              <option value="Debit Note">Debit Note</option>
              <option value="Credit Note">Credit Note</option>
              <option value="Contra Entry">Contra Entry</option>
              <option value="Excise Entry">Excise Entry</option>
              <option value="Write Off">Write Off</option>
              <option value="Depreciation">Depreciation</option>
              <option value="Exchange Rate Revaluation">Exchange Rate Revaluation</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="">Semua Status</option>
              <option value="Draft">Draft</option>
              <option value="Submitted">Submitted</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {(['from_date', 'to_date'] as const).map(key => (
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

      {/* Error */}
      {error && (
        <div className="px-4 py-3 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
        </div>
      )}

      {/* List */}
      <div className="px-4 py-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

          {/* Progress */}
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs text-gray-600">
            <span className="font-medium">{entries.length}</span> dari{' '}
            <span className="font-medium">{totalRecords}</span> data
            {useInfiniteScrollMode && hasMoreData && (
              <span className="ml-2 text-indigo-600">• Scroll untuk load lebih banyak</span>
            )}
          </div>

          {/* Table Header - Desktop */}
          {!isMobile && entries.length > 0 && (
            <div className="hidden sm:flex items-center px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase">
              <div className="flex-1 grid grid-cols-12 gap-4">
                <div className="col-span-3">Nama / Tipe</div>
                <div className="col-span-2">Tanggal</div>
                <div className="col-span-2">Catatan</div>
                <div className="col-span-2 text-right">Debit / Credit</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-1 text-center">Aksi</div>
              </div>
            </div>
          )}

          {/* Items */}
          <ul className="divide-y divide-gray-100">
            {entries.map(entry => (
              <li
                key={entry.name}
                onClick={() => router.push(`/journal/journalMain?name=${encodeURIComponent(entry.name)}`)}
                className="cursor-pointer hover:bg-indigo-50/50 transition-colors"
              >
                <div className="px-4 py-4">
                  {isMobile ? (
                    // ── Mobile Card ──
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-indigo-600 truncate">📄 {entry.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">🏷️ {entry.voucher_type}</p>
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusBadgeClass(entry.status)}`}>
                          {entry.status === 'Submitted' ? '✓ ' : entry.status === 'Draft' ? '📝 ' : '✗ '}{entry.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                        <div>📅 {entry.posting_date}</div>
                        {entry.user_remark && (
                          <div className="truncate col-span-2">� {entry.user_remark}</div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">Debit</p>
                          <p className="text-sm font-semibold text-emerald-700">{formatCurrency(entry.total_debit)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500 mb-0.5">Kredit</p>
                          <p className="text-sm font-semibold text-rose-700">{formatCurrency(entry.total_credit)}</p>
                        </div>
                      </div>

                      {/* Submit Button for Draft */}
                      {entry.status === 'Draft' && (
                        <div className="pt-2 border-t border-gray-100">
                          <button
                            onClick={(e) => handleSubmit(e, entry.name)}
                            disabled={submittingId === entry.name}
                            className="w-full px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {submittingId === entry.name ? (
                              <span className="flex items-center justify-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Submitting...
                              </span>
                            ) : (
                              '✓ Submit Jurnal'
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    // ── Desktop Row ──
                    <div className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-3 min-w-0">
                        <p className="text-sm font-semibold text-indigo-600 truncate">{entry.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{entry.voucher_type}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm text-gray-900">{entry.posting_date}</p>
                        <p className="text-xs text-gray-500">Posting</p>
                      </div>
                      <div className="col-span-2 min-w-0">
                        {entry.user_remark ? (
                          <p className="text-sm text-gray-600 truncate">{entry.user_remark}</p>
                        ) : (
                          <p className="text-sm text-gray-300 italic">—</p>
                        )}
                      </div>
                      <div className="col-span-2 text-right">
                        <p className="text-sm font-semibold text-red-600">{formatCurrency(entry.total_debit)}</p>
                        <p className="text-xs font-medium text-green-600">{formatCurrency(entry.total_credit)}</p>
                      </div>
                      <div className="col-span-2">
                        <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full border ${getStatusBadgeClass(entry.status)}`}>
                          {entry.status}
                        </span>
                      </div>
                      <div className="col-span-1 text-center">
                        {entry.status === 'Draft' && (
                          <button
                            onClick={(e) => handleSubmit(e, entry.name)}
                            disabled={submittingId === entry.name}
                            className="inline-flex items-center justify-center px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            title="Submit Jurnal"
                          >
                            {submittingId === entry.name ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              '✓ Submit'
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </li>
            ))}

            {/* Skeleton saat loading more */}
            {loadingMore && useInfiniteScrollMode && (
              <><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
            )}

            {/* Sentinel infinite scroll */}
            {useInfiniteScrollMode && hasMoreData && (
              <div ref={sentinelRef} className="h-10" />
            )}
          </ul>

          {/* Empty State */}
          {entries.length === 0 && !loading && (
            <div className="text-center py-16 px-4">
              <FileText className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4 text-sm text-gray-500">Tidak ada jurnal yang ditemukan</p>
              <button
                onClick={() => router.push('/journal/journalMain')}
                className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100"
              >
                + Buat Jurnal Baru
              </button>
            </div>
          )}

          {/* Load More Button (Mobile fallback) */}
          {useInfiniteScrollMode && hasMoreData && !loadingMore && entries.length > 0 && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-center">
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                <Loader2 className="h-4 w-4" />
                Load More ({totalRecords - entries.length} remaining)
              </button>
            </div>
          )}

          {/* Loading More */}
          {loadingMore && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-center">
              <div className="inline-flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Memuat data...
              </div>
            </div>
          )}

          {/* End of Data */}
          {!hasMoreData && entries.length > 0 && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-center text-xs text-gray-500">
              ✓ Semua data telah dimuat
            </div>
          )}

          {/* Totals Summary */}
          {entries.length > 0 && (
            <div className="px-4 py-4 bg-indigo-50 border-t-2 border-indigo-200">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-700">
                  Total ({entries.length} {useInfiniteScrollMode ? 'dari ' + totalRecords : 'entries'}):
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-xs text-gray-500 mb-0.5">Total Debit</p>
                    <p className="text-base font-bold text-red-700">{formatCurrency(totals.totalDebit)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 mb-0.5">Total Kredit</p>
                    <p className="text-base font-bold text-green-700">{formatCurrency(totals.totalCredit)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 mb-0.5">Selisih</p>
                    <p className={`text-base font-bold ${Math.abs(totals.totalDebit - totals.totalCredit) < 0.01 ? 'text-green-700' : 'text-orange-700'}`}>
                      {formatCurrency(Math.abs(totals.totalDebit - totals.totalCredit))}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Pagination Desktop */}
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
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </div>
          )}
        </div>

        <p className="mt-3 text-xs text-gray-500 text-center">
          Halaman {currentPage} dari {totalPages} •{' '}
          {isMobile ? 'Scroll untuk load lebih banyak' : 'Gunakan pagination untuk navigasi'}
        </p>
      </div>

      {/* Back to Top */}
      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-50 inline-flex items-center justify-center w-12 h-12 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all transform hover:scale-105"
          title="Back to top"
          aria-label="Back to top"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
