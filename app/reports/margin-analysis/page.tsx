'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoadingSpinner from '../../components/LoadingSpinner';
import Pagination from '../../components/Pagination';
import PrintPreviewModal from '../../../components/PrintPreviewModal';
import BrowserStyleDatePicker from '../../../components/BrowserStyleDatePicker';

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

interface MarginItem {
  item_code: string;
  item_name: string;
  avg_buy_price: number;
  avg_sell_price: number;
  margin_per_unit: number;
  margin_pct: number;
  buy_qty: number;
  sell_qty: number;
}

export default function MarginAnalysisPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile(768);
  
  // ✅ Responsive pageSize
  const pageSize = isMobile ? 10 : 20;
  
  const [data, setData] = useState<MarginItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPrint, setShowPrint] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [dateFilter, setDateFilter] = useState(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const formatDate = (date: Date) => {
      const d = date.getDate().toString().padStart(2, '0');
      const m = (date.getMonth() + 1).toString().padStart(2, '0');
      const y = date.getFullYear();
      return `${d}/${m}/${y}`;
    };
    return { from_date: formatDate(firstDay), to_date: formatDate(today) };
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // ✅ FIX: Track pagination change source to prevent race conditions
  const pageChangeSourceRef = useRef<'pagination' | 'filter' | 'init'>('init');

  useEffect(() => {
    const saved = localStorage.getItem('selected_company');
    if (saved) setSelectedCompany(saved);
  }, []);

  // ✅ Sync URL dengan page state
  useEffect(() => {
    const pageFromUrl = searchParams.get('page');
    if (pageFromUrl && !isNaN(parseInt(pageFromUrl))) {
      const pageNum = parseInt(pageFromUrl);
      if (pageNum >= 1) setCurrentPage(pageNum);
    }
  }, [searchParams]);

  const fetchData = useCallback(async () => {
    if (!selectedCompany) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        company: selectedCompany,
        from_date: dateFilter.from_date.split('/').reverse().join('-'),
        to_date: dateFilter.to_date.split('/').reverse().join('-')
      });
      const response = await fetch(`/api/finance/reports/margin-analysis?${params}`, { credentials: 'include' });
      const result = await response.json();
      if (result.success) {
        setData(result.data || []);
      } else {
        setError(result.message || 'Gagal memuat analisa margin');
      }
    } catch (err) {
      console.error('Error fetching margin analysis:', err);
      setError('Gagal memuat analisa margin');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, dateFilter]);

  useEffect(() => {
    if (selectedCompany) fetchData();
  }, [selectedCompany, fetchData]);

  // ✅ Reset page when filters change
  useEffect(() => {
    pageChangeSourceRef.current = 'filter';
    setCurrentPage(1);
  }, [dateFilter]);

  // ✅ Fetch on page change
  useEffect(() => {
    if (selectedCompany) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // ✅ Trigger fetch on filter change (after reset)
  useEffect(() => {
    if (pageChangeSourceRef.current === 'filter' && selectedCompany) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const paginated = data.slice(start, start + pageSize);
    setTotalRecords(data.length);
    setTotalPages(Math.ceil(data.length / pageSize));
    return paginated;
  }, [data, currentPage, pageSize]);

  const negativeMargins = data.filter(item => item.margin_pct < 0).length;
  const thinMargins = data.filter(item => item.margin_pct >= 0 && item.margin_pct < 10).length;
  const printUrl = `/reports/margin-analysis/print?company=${selectedCompany}&from_date=${dateFilter.from_date}&to_date=${dateFilter.to_date}`;

  // ✅ handlePageChange callback
  const handlePageChange = useCallback((page: number) => {
    pageChangeSourceRef.current = 'pagination';
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  if (loading) return <LoadingSpinner message="Memuat analisa margin..." />;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analisa Margin per Unit</h1>
          <p className="text-sm text-gray-500">Perbandingan harga beli vs jual rata-rata per SKU</p>
        </div>
        <button onClick={() => setShowPrint(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm flex items-center gap-2">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
          Cetak Laporan
        </button>
      </div>

      {showPrint && (
        <PrintPreviewModal 
          title={`Analisa Margin — ${selectedCompany}`} 
          onClose={() => setShowPrint(false)} 
          printUrl=""
          useContentFrame={true}
          allowPaperSettings={true}
        >
          <div className="p-8 bg-white">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold">{selectedCompany}</h2>
              <h3 className="text-lg font-semibold mt-2">Analisa Margin per Unit</h3>
              <p className="text-sm text-gray-600 mt-1">
                Periode: {dateFilter.from_date} s/d {dateFilter.to_date}
              </p>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-2 px-2">Kode Item</th>
                  <th className="text-left py-2 px-2">Nama Item</th>
                  <th className="text-right py-2 px-2">Avg Beli</th>
                  <th className="text-right py-2 px-2">Avg Jual</th>
                  <th className="text-right py-2 px-2">Margin/Unit</th>
                  <th className="text-right py-2 px-2">Margin %</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item, i) => (
                  <tr key={i} className="border-b border-gray-200">
                    <td className="py-2 px-2 font-medium">{item.item_code}</td>
                    <td className="py-2 px-2">{item.item_name}</td>
                    <td className="py-2 px-2 text-right">Rp {item.avg_buy_price.toLocaleString('id-ID', {maximumFractionDigits:0})}</td>
                    <td className="py-2 px-2 text-right">Rp {item.avg_sell_price.toLocaleString('id-ID', {maximumFractionDigits:0})}</td>
                    <td className="py-2 px-2 text-right font-medium">Rp {item.margin_per_unit.toLocaleString('id-ID', {maximumFractionDigits:0})}</td>
                    <td className="py-2 px-2 text-right font-bold">{item.margin_pct.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-6 text-xs text-gray-500 text-center">
              Dicetak pada: {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </PrintPreviewModal>
      )}

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dari Tanggal</label>
            <BrowserStyleDatePicker value={dateFilter.from_date} onChange={(value: string) => setDateFilter(prev => ({ ...prev, from_date: value }))} className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="DD/MM/YYYY" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sampai Tanggal</label>
            <BrowserStyleDatePicker value={dateFilter.to_date} onChange={(value: string) => setDateFilter(prev => ({ ...prev, to_date: value }))} className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="DD/MM/YYYY" />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={fetchData} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors">Refresh Data</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-600 font-medium">Total Item</p>
          <p className="text-2xl font-bold text-blue-900">{data.length}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600 font-medium">Margin Negatif</p>
          <p className="text-2xl font-bold text-red-900">{negativeMargins}</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-600 font-medium">Margin Tipis (&lt;10%)</p>
          <p className="text-2xl font-bold text-yellow-900">{thinMargins}</p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-900">
            Analisa Margin 
            <span className="ml-2 px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full">{totalRecords} item</span>
          </h3>
        </div>
        
        {/* Desktop Table */}
        {!isMobile ? (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kode Item</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama Item</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg Beli</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg Jual</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Margin/Unit</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Margin %</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedData.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Tidak ada data margin</td></tr>
                ) : (
                  paginatedData.map((item, i) => (
                    <tr key={i} className={`hover:bg-gray-50 ${item.margin_pct < 0 ? 'bg-red-50' : item.margin_pct < 10 ? 'bg-yellow-50' : ''}`}>
                      <td className="px-4 py-3 text-sm font-medium text-indigo-600">{item.item_code}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.item_name}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">Rp {item.avg_buy_price.toLocaleString('id-ID', {maximumFractionDigits:0})}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">Rp {item.avg_sell_price.toLocaleString('id-ID', {maximumFractionDigits:0})}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">Rp {item.margin_per_unit.toLocaleString('id-ID', {maximumFractionDigits:0})}</td>
                      <td className={`px-4 py-3 text-sm text-right font-bold ${item.margin_pct < 0 ? 'text-red-600' : item.margin_pct < 10 ? 'text-yellow-600' : 'text-green-600'}`}>{item.margin_pct.toFixed(1)}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </>
        ) : (
          /* Mobile Cards */
          <div className="divide-y divide-gray-200">
            {paginatedData.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">Tidak ada data margin</div>
            ) : (
              paginatedData.map((item, i) => (
                <div key={i} className={`px-4 py-4 hover:bg-gray-50 ${item.margin_pct < 0 ? 'bg-red-50' : item.margin_pct < 10 ? 'bg-yellow-50' : ''}`}>
                  <div className="space-y-3">
                    {/* Row 1: Item Code + Margin % Badge */}
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-indigo-600 truncate">{item.item_code}</p>
                        <p className="text-sm text-gray-900 mt-1">{item.item_name}</p>
                      </div>
                      <span className={`ml-2 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
                        item.margin_pct < 0 
                          ? 'bg-red-100 text-red-700 border-red-200' 
                          : item.margin_pct < 10 
                            ? 'bg-yellow-100 text-yellow-700 border-yellow-200' 
                            : 'bg-green-100 text-green-700 border-green-200'
                      }`}>
                        {item.margin_pct.toFixed(1)}%
                      </span>
                    </div>
                    
                    {/* Row 2: Prices Grid */}
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Avg Beli</p>
                        <p className="text-sm font-semibold text-gray-900">Rp {item.avg_buy_price.toLocaleString('id-ID', {maximumFractionDigits:0})}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Avg Jual</p>
                        <p className="text-sm font-semibold text-gray-900">Rp {item.avg_sell_price.toLocaleString('id-ID', {maximumFractionDigits:0})}</p>
                      </div>
                    </div>
                    
                    {/* Row 3: Margin per Unit */}
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-500 mb-1">Margin per Unit</p>
                      <p className="text-base font-bold text-indigo-600">
                        Rp {item.margin_per_unit.toLocaleString('id-ID', {maximumFractionDigits:0})}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        
        <Pagination 
          currentPage={currentPage} 
          totalPages={totalPages} 
          totalRecords={totalRecords} 
          pageSize={pageSize} 
          onPageChange={handlePageChange} 
        />
      </div>
    </div>
  );
}
