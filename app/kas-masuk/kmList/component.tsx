'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import Pagination from '../../components/Pagination';
import { formatDate, parseDate } from '@/utils/format';
import BrowserStyleDatePicker from '@/components/BrowserStyleDatePicker';
import { FileText, ArrowUp, Loader2 } from 'lucide-react';

// Hook: Deteksi mobile (breakpoint 768px)
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

export default function KasMasukList() {
  const router = useRouter();
  const isMobile = useIsMobile(768);

  const pageSize = isMobile ? 10 : 20;

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState({
    from_date: formatDate(new Date(Date.now() - 86400000)),
    to_date: formatDate(new Date()),
  });
  const [nameFilter, setNameFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const pageChangeSourceRef = useRef<'pagination' | 'filter' | 'init'>('init');

  // Company from localStorage/cookie
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

  // Fetch
  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setError('');

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
      return;
    }

    if (!selectedCompany && company) setSelectedCompany(company);

    try {
      const params = new URLSearchParams();
      params.append('limit_page_length', String(pageSize));
      params.append('start', String((currentPage - 1) * pageSize));
      params.append('order_by', 'creation desc, posting_date desc');
      params.append('company', company);
      
      // Filter untuk Kas Masuk: cari di user_remark
      if (nameFilter) {
        // Jika ada filter nama, gunakan itu
        params.append('search', nameFilter);
      }
      
      if (statusFilter) params.append('status', statusFilter);
      if (dateFilter.from_date) {
        const parsed = parseDate(dateFilter.from_date);
        if (parsed) params.append('from_date', parsed);
      }
      if (dateFilter.to_date) {
        const parsed = parseDate(dateFilter.to_date);
        if (parsed) params.append('to_date', parsed);
      }
      
      // Tambahkan filter khusus untuk kas masuk
      params.append('kas_type', 'masuk');

      const res = await fetch(`/api/finance/journal?${params}`);
      const result = await res.json();

      if (result.success) {
        const data: JournalEntry[] = result.data || [];

        if (result.total_records !== undefined) {
          setTotalRecords(result.total_records);
          setTotalPages(Math.ceil(result.total_records / pageSize));
        } else {
          setTotalRecords(data.length);
          setTotalPages(1);
        }

        setEntries(data);
        setError(data.length === 0 ? `Tidak ada kas masuk untuk perusahaan: ${company}` : '');
      } else {
        setError(result.message || 'Gagal memuat kas masuk');
      }
    } catch {
      setError('Gagal memuat kas masuk');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, dateFilter, nameFilter, statusFilter, selectedCompany]);

  // Reset page when filters change
  useEffect(() => {
    pageChangeSourceRef.current = 'filter';
    setCurrentPage(1);
  }, [dateFilter, nameFilter, statusFilter]);

  // Fetch when page changes
  useEffect(() => {
    if (selectedCompany) {
      fetchEntries();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, selectedCompany]);

  // Trigger fetch when filters change
  useEffect(() => {
    if (pageChangeSourceRef.current === 'filter' && selectedCompany) {
      fetchEntries();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter, nameFilter, statusFilter]);

  // Back to Top
  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Reset Filters
  const handleResetFilters = () => {
    setDateFilter({
      from_date: formatDate(new Date(Date.now() - 86400000)),
      to_date: formatDate(new Date()),
    });
    setNameFilter('');
    setStatusFilter('');
    setCurrentPage(1);
  };

  // Submit Journal Entry
  const handleSubmit = async (e: React.MouseEvent, journalName: string) => {
    e.stopPropagation(); // Prevent row click
    
    if (!confirm(`Submit jurnal ${journalName}?`)) return;
    
    setSubmittingId(journalName);
    setError('');
    
    try {
      const res = await fetch(`/api/finance/journal/${encodeURIComponent(journalName)}/submit`, {
        method: 'POST',
        credentials: 'include',
      });
      
      const data = await res.json();
      
      if (data.success) {
        // Refresh the list
        fetchEntries();
      } else {
        setError(data.message || 'Gagal submit journal entry');
      }
    } catch {
      setError('Terjadi kesalahan saat submit journal entry');
    } finally {
      setSubmittingId(null);
    }
  };

  if (loading && entries.length === 0) {
    return <LoadingSpinner message="Memuat Kas Masuk..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6 lg:px-8 sticky top-0 z-30">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Kas Masuk</h1>
          <button
            onClick={() => router.push('/kas-masuk/kmMain')}
            className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
          >
            + Buat Kas Masuk
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
          </div>

          {/* Table Header - Desktop */}
          {!isMobile && entries.length > 0 && (
            <div className="hidden sm:flex items-center px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase">
              <div className="flex-1 grid grid-cols-12 gap-4">
                <div className="col-span-2">Nama</div>
                <div className="col-span-2">Tanggal</div>
                <div className="col-span-3">Catatan</div>
                <div className="col-span-2 text-right">Total</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-1">Aksi</div>
              </div>
            </div>
          )}

          {/* Items */}
          <ul className="divide-y divide-gray-100">
            {entries.map(entry => (
              <li
                key={entry.name}
                className="hover:bg-indigo-50/50 transition-colors"
              >
                <div className="px-4 py-4">
                  {isMobile ? (
                    // Mobile Card
                    <div className="space-y-3">
                      <div 
                        onClick={() => router.push(`/kas-masuk/kmMain?name=${encodeURIComponent(entry.name)}`)}
                        className="cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-indigo-600 truncate">💰 {entry.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">📅 {entry.posting_date}</p>
                          </div>
                          <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusBadgeClass(entry.status)}`}>
                            {entry.status === 'Submitted' ? '✓ ' : entry.status === 'Draft' ? '📝 ' : '✗ '}{entry.status}
                          </span>
                        </div>

                        {entry.user_remark && (
                          <div className="text-xs text-gray-500 truncate mt-2">📝 {entry.user_remark}</div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-2">
                          <div>
                            <p className="text-xs text-gray-500 mb-0.5">Total Penerimaan</p>
                            <p className="text-sm font-semibold text-emerald-700">{formatCurrency(entry.total_debit)}</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Submit Button - Mobile */}
                      {entry.status === 'Draft' && (
                        <button
                          onClick={(e) => handleSubmit(e, entry.name)}
                          disabled={submittingId === entry.name}
                          className="w-full bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 text-sm font-medium flex items-center justify-center gap-2"
                        >
                          {submittingId === entry.name ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            '✓ Submit'
                          )}
                        </button>
                      )}
                    </div>
                  ) : (
                    // Desktop Row
                    <div className="grid grid-cols-12 gap-4 items-center">
                      <div 
                        className="col-span-2 min-w-0 cursor-pointer"
                        onClick={() => router.push(`/kas-masuk/kmMain?name=${encodeURIComponent(entry.name)}`)}
                      >
                        <p className="text-sm font-semibold text-indigo-600 truncate">{entry.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Kas Masuk</p>
                      </div>
                      <div 
                        className="col-span-2 cursor-pointer"
                        onClick={() => router.push(`/kas-masuk/kmMain?name=${encodeURIComponent(entry.name)}`)}
                      >
                        <p className="text-sm text-gray-900">{entry.posting_date}</p>
                        <p className="text-xs text-gray-500">Posting</p>
                      </div>
                      <div 
                        className="col-span-3 min-w-0 cursor-pointer"
                        onClick={() => router.push(`/kas-masuk/kmMain?name=${encodeURIComponent(entry.name)}`)}
                      >
                        {entry.user_remark ? (
                          <p className="text-sm text-gray-600 truncate">{entry.user_remark}</p>
                        ) : (
                          <p className="text-sm text-gray-300 italic">—</p>
                        )}
                      </div>
                      <div 
                        className="col-span-2 text-right cursor-pointer"
                        onClick={() => router.push(`/kas-masuk/kmMain?name=${encodeURIComponent(entry.name)}`)}
                      >
                        <p className="text-sm font-semibold text-emerald-600">{formatCurrency(entry.total_debit)}</p>
                      </div>
                      <div 
                        className="col-span-2 cursor-pointer"
                        onClick={() => router.push(`/kas-masuk/kmMain?name=${encodeURIComponent(entry.name)}`)}
                      >
                        <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full border ${getStatusBadgeClass(entry.status)}`}>
                          {entry.status}
                        </span>
                      </div>
                      <div className="col-span-1">
                        {entry.status === 'Draft' && (
                          <button
                            onClick={(e) => handleSubmit(e, entry.name)}
                            disabled={submittingId === entry.name}
                            className="bg-green-600 text-white px-3 py-1.5 rounded-md hover:bg-green-700 disabled:opacity-50 text-xs font-medium flex items-center gap-1"
                            title="Submit jurnal"
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
          </ul>

          {/* Empty State */}
          {entries.length === 0 && !loading && (
            <div className="text-center py-16 px-4">
              <FileText className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4 text-sm text-gray-500">Tidak ada kas masuk yang ditemukan</p>
              <button
                onClick={() => router.push('/kas-masuk/kmMain')}
                className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100"
              >
                + Buat Kas Masuk Baru
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
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </div>
          )}
        </div>

        <p className="mt-3 text-xs text-gray-500 text-center">
          Halaman {currentPage} dari {totalPages}
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
