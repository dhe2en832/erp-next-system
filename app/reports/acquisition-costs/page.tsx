'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoadingSpinner from '../../components/LoadingSpinner';
import Pagination from '../../components/Pagination';
import PrintPreviewModal from '../../../components/PrintPreviewModal';
import BrowserStyleDatePicker from '../../../components/BrowserStyleDatePicker';

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

export default function AcquisitionCostsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile(768);
  
  // ✅ Responsive pageSize
  const pageSize = isMobile ? 10 : 20;
  
  const [data, setData] = useState<any>({ hpp_costs: [], operational_costs: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPrint, setShowPrint] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [dateFilter, setDateFilter] = useState(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const formatDate = (date: Date) => `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    return { from_date: formatDate(firstDay), to_date: formatDate(today) };
  });
  
  // Separate pagination for each table
  const [hppPage, setHppPage] = useState(1);
  const [opPage, setOpPage] = useState(1);
  const [hppTotalPages, setHppTotalPages] = useState(1);
  const [opTotalPages, setOpTotalPages] = useState(1);
  const [hppTotalRecords, setHppTotalRecords] = useState(0);
  const [opTotalRecords, setOpTotalRecords] = useState(0);

  // ✅ FIX: Track pagination change source to prevent race conditions
  const pageChangeSourceRef = useRef<'pagination' | 'filter' | 'init'>('init');

  useEffect(() => {
    const saved = localStorage.getItem('selected_company');
    if (saved) setSelectedCompany(saved);
  }, []);

  // ✅ Sync URL dengan page state (for HPP table)
  useEffect(() => {
    const pageFromUrl = searchParams.get('hpp_page');
    if (pageFromUrl && !isNaN(parseInt(pageFromUrl))) {
      const pageNum = parseInt(pageFromUrl);
      if (pageNum >= 1) setHppPage(pageNum);
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
      const response = await fetch(`/api/finance/reports/acquisition-costs?${params}`, { credentials: 'include' });
      const result = await response.json();
      if (result.success) {
        setData(result.data || { hpp_costs: [], operational_costs: [] });
      } else {
        setError(result.message || 'Gagal memuat biaya perolehan');
      }
    } catch (err) {
      console.error('Error fetching acquisition costs:', err);
      setError('Gagal memuat biaya perolehan');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, dateFilter]);

  useEffect(() => {
    if (selectedCompany) fetchData();
  }, [selectedCompany, fetchData]);

  // ✅ Reset pages when filters change
  useEffect(() => {
    pageChangeSourceRef.current = 'filter';
    setHppPage(1);
    setOpPage(1);
  }, [dateFilter]);

  // ✅ Trigger fetch on filter change (after reset)
  useEffect(() => {
    if (pageChangeSourceRef.current === 'filter' && selectedCompany) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter]);

  // Paginated data for HPP costs
  const paginatedHppCosts = useMemo(() => {
    const start = (hppPage - 1) * pageSize;
    const paginated = data.hpp_costs.slice(start, start + pageSize);
    setHppTotalRecords(data.hpp_costs.length);
    setHppTotalPages(Math.ceil(data.hpp_costs.length / pageSize));
    return paginated;
  }, [data.hpp_costs, hppPage, pageSize]);

  // Paginated data for Operational costs
  const paginatedOpCosts = useMemo(() => {
    const start = (opPage - 1) * pageSize;
    const paginated = data.operational_costs.slice(start, start + pageSize);
    setOpTotalRecords(data.operational_costs.length);
    setOpTotalPages(Math.ceil(data.operational_costs.length / pageSize));
    return paginated;
  }, [data.operational_costs, opPage, pageSize]);

  const hppTotal = data.hpp_costs.reduce((sum: number, e: any) => sum + Math.abs(e.amount), 0);
  const opTotal = data.operational_costs.reduce((sum: number, e: any) => sum + Math.abs(e.amount), 0);
  const printUrl = `/reports/acquisition-costs/print?company=${selectedCompany}&from_date=${dateFilter.from_date}&to_date=${dateFilter.to_date}`;

  // ✅ handlePageChange callbacks
  const handleHppPageChange = useCallback((page: number) => {
    pageChangeSourceRef.current = 'pagination';
    setHppPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleOpPageChange = useCallback((page: number) => {
    pageChangeSourceRef.current = 'pagination';
    setOpPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  if (loading) return <LoadingSpinner message="Memuat biaya perolehan..." />;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ongkir & Biaya Perolehan</h1>
          <p className="text-sm text-gray-500">Klasifikasi ongkir/handling: masuk HPP atau Beban Operasional</p>
        </div>
        <button onClick={() => setShowPrint(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm flex items-center gap-2">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
          Cetak Laporan
        </button>
      </div>

      {showPrint && (
        <PrintPreviewModal 
          title={`Biaya Perolehan — ${selectedCompany}`} 
          onClose={() => setShowPrint(false)} 
          printUrl=""
          useContentFrame={true}
          allowPaperSettings={true}
        >
          <div className="p-8 bg-white">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold">{selectedCompany}</h2>
              <h3 className="text-lg font-semibold mt-2">Ongkir & Biaya Perolehan</h3>
              <p className="text-sm text-gray-600 mt-1">
                Periode: {dateFilter.from_date} s/d {dateFilter.to_date}
              </p>
            </div>

            <div className="mb-6">
              <h4 className="text-base font-semibold mb-3">Biaya Masuk HPP</h4>
              <table className="w-full text-sm mb-4">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left py-2 px-2">Tanggal</th>
                    <th className="text-left py-2 px-2">Voucher</th>
                    <th className="text-left py-2 px-2">Akun</th>
                    <th className="text-right py-2 px-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.hpp_costs.map((e: any, i: number) => (
                    <tr key={i} className="border-b border-gray-200">
                      <td className="py-2 px-2">{e.posting_date}</td>
                      <td className="py-2 px-2">
                        <div className="font-medium">{e.voucher_no}</div>
                        <div className="text-xs text-gray-500">{e.voucher_type}</div>
                      </td>
                      <td className="py-2 px-2">{e.account}</td>
                      <td className="py-2 px-2 text-right">Rp {Math.abs(e.amount).toLocaleString('id-ID')}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300 font-bold">
                    <td colSpan={3} className="py-2 px-2 text-right">SUBTOTAL HPP:</td>
                    <td className="py-2 px-2 text-right">Rp {hppTotal.toLocaleString('id-ID')}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div>
              <h4 className="text-base font-semibold mb-3">Beban Operasional</h4>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left py-2 px-2">Tanggal</th>
                    <th className="text-left py-2 px-2">Voucher</th>
                    <th className="text-left py-2 px-2">Akun</th>
                    <th className="text-right py-2 px-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.operational_costs.map((e: any, i: number) => (
                    <tr key={i} className="border-b border-gray-200">
                      <td className="py-2 px-2">{e.posting_date}</td>
                      <td className="py-2 px-2">
                        <div className="font-medium">{e.voucher_no}</div>
                        <div className="text-xs text-gray-500">{e.voucher_type}</div>
                      </td>
                      <td className="py-2 px-2">{e.account}</td>
                      <td className="py-2 px-2 text-right">Rp {Math.abs(e.amount).toLocaleString('id-ID')}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300 font-bold">
                    <td colSpan={3} className="py-2 px-2 text-right">SUBTOTAL OPERASIONAL:</td>
                    <td className="py-2 px-2 text-right">Rp {opTotal.toLocaleString('id-ID')}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-600 font-medium">Masuk HPP ({data.hpp_costs.length})</p>
          <p className="text-2xl font-bold text-green-900">Rp {hppTotal.toLocaleString('id-ID')}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-600 font-medium">Beban Operasional ({data.operational_costs.length})</p>
          <p className="text-2xl font-bold text-blue-900">Rp {opTotal.toLocaleString('id-ID')}</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-green-50 border-b border-green-200">
            <h3 className="text-sm font-medium text-green-900">
              Biaya Masuk HPP 
              <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">{hppTotalRecords}</span>
            </h3>
          </div>
          
          {/* Desktop Table */}
          {!isMobile ? (
            <>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Voucher</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Akun</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedHppCosts.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">Tidak ada biaya masuk HPP</td></tr>
                  ) : (
                    paginatedHppCosts.map((e: any, i: number) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{e.posting_date}</td>
                        <td className="px-4 py-3 text-sm"><div className="font-medium text-indigo-600">{e.voucher_no}</div><div className="text-xs text-gray-500">{e.voucher_type}</div></td>
                        <td className="px-4 py-3 text-sm text-gray-700">{e.account}</td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">Rp {Math.abs(e.amount).toLocaleString('id-ID')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </>
          ) : (
            /* Mobile Cards */
            <div className="divide-y divide-gray-200">
              {paginatedHppCosts.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500">Tidak ada biaya masuk HPP</div>
              ) : (
                paginatedHppCosts.map((e: any, i: number) => (
                  <div key={i} className="px-4 py-4 hover:bg-gray-50">
                    <div className="space-y-3">
                      {/* Row 1: Voucher + Date */}
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-indigo-600 truncate">{e.voucher_no}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{e.voucher_type}</p>
                        </div>
                        <span className="ml-2 text-xs text-gray-500">📅 {e.posting_date}</span>
                      </div>
                      
                      {/* Row 2: Account */}
                      <div className="text-sm text-gray-700 truncate" title={e.account}>
                        💼 {e.account}
                      </div>
                      
                      {/* Row 3: Amount */}
                      <div className="pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-500 mb-1">Amount</p>
                        <p className="text-base font-bold text-green-600">
                          Rp {Math.abs(e.amount).toLocaleString('id-ID')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
          
          {hppTotalPages > 1 && (
            <Pagination 
              currentPage={hppPage} 
              totalPages={hppTotalPages} 
              totalRecords={hppTotalRecords} 
              pageSize={pageSize} 
              onPageChange={handleHppPageChange} 
            />
          )}
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-blue-50 border-b border-blue-200">
            <h3 className="text-sm font-medium text-blue-900">
              Beban Operasional 
              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">{opTotalRecords}</span>
            </h3>
          </div>
          
          {/* Desktop Table */}
          {!isMobile ? (
            <>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Voucher</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Akun</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedOpCosts.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">Tidak ada beban operasional</td></tr>
                  ) : (
                    paginatedOpCosts.map((e: any, i: number) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{e.posting_date}</td>
                        <td className="px-4 py-3 text-sm"><div className="font-medium text-indigo-600">{e.voucher_no}</div><div className="text-xs text-gray-500">{e.voucher_type}</div></td>
                        <td className="px-4 py-3 text-sm text-gray-700">{e.account}</td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">Rp {Math.abs(e.amount).toLocaleString('id-ID')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </>
          ) : (
            /* Mobile Cards */
            <div className="divide-y divide-gray-200">
              {paginatedOpCosts.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500">Tidak ada beban operasional</div>
              ) : (
                paginatedOpCosts.map((e: any, i: number) => (
                  <div key={i} className="px-4 py-4 hover:bg-gray-50">
                    <div className="space-y-3">
                      {/* Row 1: Voucher + Date */}
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-indigo-600 truncate">{e.voucher_no}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{e.voucher_type}</p>
                        </div>
                        <span className="ml-2 text-xs text-gray-500">📅 {e.posting_date}</span>
                      </div>
                      
                      {/* Row 2: Account */}
                      <div className="text-sm text-gray-700 truncate" title={e.account}>
                        💼 {e.account}
                      </div>
                      
                      {/* Row 3: Amount */}
                      <div className="pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-500 mb-1">Amount</p>
                        <p className="text-base font-bold text-blue-600">
                          Rp {Math.abs(e.amount).toLocaleString('id-ID')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
          
          {opTotalPages > 1 && (
            <Pagination 
              currentPage={opPage} 
              totalPages={opTotalPages} 
              totalRecords={opTotalRecords} 
              pageSize={pageSize} 
              onPageChange={handleOpPageChange} 
            />
          )}
        </div>
      </div>
    </div>
  );
}
