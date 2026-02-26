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

export default function ReturnsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile(768);
  
  // ✅ Responsive pageSize
  const pageSize = isMobile ? 10 : 20;
  
  const [data, setData] = useState<any>({ sales_returns: [], purchase_returns: [] });
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
  const [srPage, setSrPage] = useState(1);
  const [prPage, setPrPage] = useState(1);
  const [srTotalPages, setSrTotalPages] = useState(1);
  const [prTotalPages, setPrTotalPages] = useState(1);
  const [srTotalRecords, setSrTotalRecords] = useState(0);
  const [prTotalRecords, setPrTotalRecords] = useState(0);

  // ✅ FIX: Track pagination change source to prevent race conditions
  const pageChangeSourceRef = useRef<'pagination' | 'filter' | 'init'>('init');

  useEffect(() => {
    const saved = localStorage.getItem('selected_company');
    if (saved) setSelectedCompany(saved);
  }, []);

  // ✅ Sync URL dengan page state (for Sales Returns table)
  useEffect(() => {
    const pageFromUrl = searchParams.get('sr_page');
    if (pageFromUrl && !isNaN(parseInt(pageFromUrl))) {
      const pageNum = parseInt(pageFromUrl);
      if (pageNum >= 1) setSrPage(pageNum);
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
      const response = await fetch(`/api/finance/reports/returns?${params}`, { credentials: 'include' });
      const result = await response.json();
      if (result.success) {
        setData(result.data || { sales_returns: [], purchase_returns: [] });
      } else {
        setError(result.message || 'Gagal memuat data retur');
      }
    } catch (err) {
      console.error('Error fetching returns:', err);
      setError('Gagal memuat data retur');
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
    setSrPage(1);
    setPrPage(1);
  }, [dateFilter]);

  // ✅ Trigger fetch on filter change (after reset)
  useEffect(() => {
    if (pageChangeSourceRef.current === 'filter' && selectedCompany) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter]);

  // Paginated data for Sales Returns
  const paginatedSalesReturns = useMemo(() => {
    const start = (srPage - 1) * pageSize;
    const paginated = data.sales_returns.slice(start, start + pageSize);
    setSrTotalRecords(data.sales_returns.length);
    setSrTotalPages(Math.ceil(data.sales_returns.length / pageSize));
    return paginated;
  }, [data.sales_returns, srPage, pageSize]);

  // Paginated data for Purchase Returns
  const paginatedPurchaseReturns = useMemo(() => {
    const start = (prPage - 1) * pageSize;
    const paginated = data.purchase_returns.slice(start, start + pageSize);
    setPrTotalRecords(data.purchase_returns.length);
    setPrTotalPages(Math.ceil(data.purchase_returns.length / pageSize));
    return paginated;
  }, [data.purchase_returns, prPage, pageSize]);

  const srTotal = data.sales_returns.reduce((sum: number, e: any) => sum + (e.grand_total || 0), 0);
  const prTotal = data.purchase_returns.reduce((sum: number, e: any) => sum + (e.grand_total || 0), 0);
  const printUrl = `/reports/returns/print?company=${selectedCompany}&from_date=${dateFilter.from_date}&to_date=${dateFilter.to_date}`;

  // ✅ handlePageChange callbacks
  const handleSrPageChange = useCallback((page: number) => {
    pageChangeSourceRef.current = 'pagination';
    setSrPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handlePrPageChange = useCallback((page: number) => {
    pageChangeSourceRef.current = 'pagination';
    setPrPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  if (loading) return <LoadingSpinner message="Memuat data retur..." />;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Retur Penjualan & Pembelian</h1>
          <p className="text-sm text-gray-500">Monitoring retur jual/beli yang mengurangi HPP & stok</p>
        </div>
        <button onClick={() => setShowPrint(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm flex items-center gap-2">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
          Cetak Laporan
        </button>
      </div>

      {showPrint && (
        <PrintPreviewModal 
          title={`Retur Jual/Beli — ${selectedCompany}`} 
          onClose={() => setShowPrint(false)} 
          printUrl=""
          useContentFrame={true}
          allowPaperSettings={true}
        >
          <div className="p-8 bg-white">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold">{selectedCompany}</h2>
              <h3 className="text-lg font-semibold mt-2">Retur Penjualan & Pembelian</h3>
              <p className="text-sm text-gray-600 mt-1">
                Periode: {dateFilter.from_date} s/d {dateFilter.to_date}
              </p>
            </div>

            <div className="mb-6">
              <h4 className="text-base font-semibold mb-3">Retur Penjualan</h4>
              <table className="w-full text-sm mb-4">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left py-2 px-2">Tanggal</th>
                    <th className="text-left py-2 px-2">No. Invoice</th>
                    <th className="text-left py-2 px-2">Customer</th>
                    <th className="text-right py-2 px-2">Total</th>
                    <th className="text-left py-2 px-2">Return Against</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sales_returns.map((e: any, i: number) => (
                    <tr key={i} className="border-b border-gray-200">
                      <td className="py-2 px-2">{e.posting_date}</td>
                      <td className="py-2 px-2 font-medium">{e.name}</td>
                      <td className="py-2 px-2">{e.customer_name || e.customer}</td>
                      <td className="py-2 px-2 text-right">Rp {Math.abs(e.grand_total).toLocaleString('id-ID')}</td>
                      <td className="py-2 px-2">{e.return_against || '-'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300 font-bold">
                    <td colSpan={3} className="py-2 px-2 text-right">SUBTOTAL RETUR PENJUALAN:</td>
                    <td className="py-2 px-2 text-right">Rp {Math.abs(srTotal).toLocaleString('id-ID')}</td>
                    <td className="py-2 px-2"></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div>
              <h4 className="text-base font-semibold mb-3">Retur Pembelian</h4>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left py-2 px-2">Tanggal</th>
                    <th className="text-left py-2 px-2">No. Invoice</th>
                    <th className="text-left py-2 px-2">Supplier</th>
                    <th className="text-right py-2 px-2">Total</th>
                    <th className="text-left py-2 px-2">Return Against</th>
                  </tr>
                </thead>
                <tbody>
                  {data.purchase_returns.map((e: any, i: number) => (
                    <tr key={i} className="border-b border-gray-200">
                      <td className="py-2 px-2">{e.posting_date}</td>
                      <td className="py-2 px-2 font-medium">{e.name}</td>
                      <td className="py-2 px-2">{e.supplier_name || e.supplier}</td>
                      <td className="py-2 px-2 text-right">Rp {Math.abs(e.grand_total).toLocaleString('id-ID')}</td>
                      <td className="py-2 px-2">{e.return_against || '-'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300 font-bold">
                    <td colSpan={3} className="py-2 px-2 text-right">SUBTOTAL RETUR PEMBELIAN:</td>
                    <td className="py-2 px-2 text-right">Rp {Math.abs(prTotal).toLocaleString('id-ID')}</td>
                    <td className="py-2 px-2"></td>
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
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600 font-medium">Retur Penjualan ({data.sales_returns.length})</p>
          <p className="text-2xl font-bold text-red-900">Rp {Math.abs(srTotal).toLocaleString('id-ID')}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-600 font-medium">Retur Pembelian ({data.purchase_returns.length})</p>
          <p className="text-2xl font-bold text-blue-900">Rp {Math.abs(prTotal).toLocaleString('id-ID')}</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-red-50 border-b border-red-200">
            <h3 className="text-sm font-medium text-red-900">
              Retur Penjualan 
              <span className="ml-2 px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">{srTotalRecords}</span>
            </h3>
          </div>
          
          {/* Desktop Table */}
          {!isMobile ? (
            <>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">No. Invoice</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Return Against</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedSalesReturns.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Tidak ada retur penjualan</td></tr>
                  ) : (
                    paginatedSalesReturns.map((e: any, i: number) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{e.posting_date}</td>
                        <td className="px-4 py-3 text-sm font-medium text-indigo-600">{e.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{e.customer_name || e.customer}</td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-red-600">Rp {Math.abs(e.grand_total).toLocaleString('id-ID')}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{e.return_against || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </>
          ) : (
            /* Mobile Cards */
            <div className="divide-y divide-gray-200">
              {paginatedSalesReturns.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500">Tidak ada retur penjualan</div>
              ) : (
                paginatedSalesReturns.map((e: any, i: number) => (
                  <div key={i} className="px-4 py-4 hover:bg-gray-50">
                    <div className="space-y-3">
                      {/* Row 1: Invoice No + Date */}
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-indigo-600 truncate">{e.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">📅 {e.posting_date}</p>
                        </div>
                      </div>
                      
                      {/* Row 2: Customer */}
                      <div className="text-sm text-gray-700 truncate" title={e.customer_name || e.customer}>
                        👤 {e.customer_name || e.customer}
                      </div>
                      
                      {/* Row 3: Total + Return Against */}
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Total</p>
                          <p className="text-base font-bold text-red-600">
                            Rp {Math.abs(e.grand_total).toLocaleString('id-ID')}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Return Against</p>
                          <p className="text-sm text-gray-700 truncate" title={e.return_against}>
                            {e.return_against || '-'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
          
          {srTotalPages > 1 && (
            <Pagination 
              currentPage={srPage} 
              totalPages={srTotalPages} 
              totalRecords={srTotalRecords} 
              pageSize={pageSize} 
              onPageChange={handleSrPageChange} 
            />
          )}
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-blue-50 border-b border-blue-200">
            <h3 className="text-sm font-medium text-blue-900">
              Retur Pembelian 
              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">{prTotalRecords}</span>
            </h3>
          </div>
          
          {/* Desktop Table */}
          {!isMobile ? (
            <>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">No. Invoice</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Return Against</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedPurchaseReturns.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Tidak ada retur pembelian</td></tr>
                  ) : (
                    paginatedPurchaseReturns.map((e: any, i: number) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{e.posting_date}</td>
                        <td className="px-4 py-3 text-sm font-medium text-indigo-600">{e.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{e.supplier_name || e.supplier}</td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-blue-600">Rp {Math.abs(e.grand_total).toLocaleString('id-ID')}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{e.return_against || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </>
          ) : (
            /* Mobile Cards */
            <div className="divide-y divide-gray-200">
              {paginatedPurchaseReturns.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500">Tidak ada retur pembelian</div>
              ) : (
                paginatedPurchaseReturns.map((e: any, i: number) => (
                  <div key={i} className="px-4 py-4 hover:bg-gray-50">
                    <div className="space-y-3">
                      {/* Row 1: Invoice No + Date */}
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-indigo-600 truncate">{e.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">📅 {e.posting_date}</p>
                        </div>
                      </div>
                      
                      {/* Row 2: Supplier */}
                      <div className="text-sm text-gray-700 truncate" title={e.supplier_name || e.supplier}>
                        🏢 {e.supplier_name || e.supplier}
                      </div>
                      
                      {/* Row 3: Total + Return Against */}
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Total</p>
                          <p className="text-base font-bold text-blue-600">
                            Rp {Math.abs(e.grand_total).toLocaleString('id-ID')}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Return Against</p>
                          <p className="text-sm text-gray-700 truncate" title={e.return_against}>
                            {e.return_against || '-'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
          
          {prTotalPages > 1 && (
            <Pagination 
              currentPage={prPage} 
              totalPages={prTotalPages} 
              totalRecords={prTotalRecords} 
              pageSize={pageSize} 
              onPageChange={handlePrPageChange} 
            />
          )}
        </div>
      </div>
    </div>
  );
}
