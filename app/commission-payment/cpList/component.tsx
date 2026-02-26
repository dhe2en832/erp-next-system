'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoadingSpinner from '../../components/LoadingSpinner';
import Pagination from '../../components/Pagination';
import BrowserStyleDatePicker from '../../../components/BrowserStyleDatePicker';
import { formatDate, parseDate } from '../../../utils/format';

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

interface PayableInvoice {
  name: string;
  customer: string;
  customer_name: string;
  posting_date: string;
  grand_total: number;
  custom_total_komisi_sales: number;
  custom_commission_paid: number;
  status: string;
  sales_team?: { sales_person: string; allocated_percentage: number }[];
}

export default function CommissionPaymentList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile(768);
  
  // ✅ Responsive pageSize
  const pageSize = isMobile ? 10 : 20;
  
  const [invoices, setInvoices] = useState<PayableInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');

  // Filter states - langsung digunakan untuk fetch (responsif)
  const [filters, setFilters] = useState({
    invoiceNo: '',
    customerName: '',
    status: 'all',
    dateFrom: '',
    dateTo: '',
    salesPerson: '',
  });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // ✅ FIX: Track pagination change source to prevent race conditions
  const pageChangeSourceRef = useRef<'pagination' | 'filter' | 'init'>('init');

  // Refs untuk input focus
  const invoiceNoRef = useRef<HTMLInputElement>(null);
  const customerNameRef = useRef<HTMLInputElement>(null);
  const salesPersonRef = useRef<HTMLInputElement>(null);
  const lastActiveInput = useRef<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('selected_company');
    if (saved) setSelectedCompany(saved);

    // Set default date range: kemarin sampai hari ini
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const defaultFilters = {
      dateFrom: formatDate(yesterday),
      dateTo: formatDate(today)
    };
    
    setFilters(prev => ({ ...prev, ...defaultFilters }));
  }, []);

  const fetchPayableInvoices = useCallback(async () => {
    if (!selectedCompany) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        company: selectedCompany,
        limit_page_length: String(pageSize),
        limit_start: String((currentPage - 1) * pageSize),
      });

      // Add filters if provided
      if (filters.invoiceNo) params.set('invoice_no', filters.invoiceNo);
      if (filters.customerName) params.set('customer_name', filters.customerName);
      if (filters.status && filters.status !== 'all') params.set('status', filters.status);
      if (filters.dateFrom) {
        const parsedDate = parseDate(filters.dateFrom);
        if (parsedDate) params.set('date_from', parsedDate);
      }
      if (filters.dateTo) {
        const parsedDate = parseDate(filters.dateTo);
        if (parsedDate) params.set('date_to', parsedDate);
      }
      if (filters.salesPerson) params.set('sales_person', filters.salesPerson);

      const response = await fetch(`/api/finance/commission/payable-invoices?${params}`, { credentials: 'include' });
      const data = await response.json();

      if (data.success) {
        setInvoices(data.data || []);
        setTotalRecords(data.total || 0);
        setTotalPages(Math.ceil((data.total || 0) / pageSize));
      } else {
        setError(data.message || 'Gagal memuat data komisi');
      }
    } catch (err) {
      console.error('Error fetching payable invoices:', err);
      setError('Gagal memuat data komisi');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, currentPage, pageSize, filters]);

  // ─────────────────────────────────────────────────────────
  // Effects - FIXED VERSION - Prevent race conditions
  // ─────────────────────────────────────────────────────────
  
  // ✅ Sync URL dengan page state
  useEffect(() => {
    const pageFromUrl = searchParams.get('page');
    if (pageFromUrl && !isNaN(parseInt(pageFromUrl))) {
      const pageNum = parseInt(pageFromUrl);
      if (pageNum >= 1) setCurrentPage(pageNum);
    }
  }, [searchParams]);

  
  // Reset page when filters change
  useEffect(() => {
    pageChangeSourceRef.current = 'filter';
    setCurrentPage(1);
  }, [filters]);

  // Fetch when page changes (separated from filter logic)
  useEffect(() => {
    if (selectedCompany) {
      fetchPayableInvoices();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, selectedCompany]);

  // Trigger fetch when filters change (after page reset)
  useEffect(() => {
    if (pageChangeSourceRef.current === 'filter' && selectedCompany) {
      fetchPayableInvoices();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, selectedCompany]);

  // Restore focus after re-render
  useEffect(() => {
    if (lastActiveInput.current === 'invoiceNo' && invoiceNoRef.current) {
      invoiceNoRef.current.focus();
    } else if (lastActiveInput.current === 'customerName' && customerNameRef.current) {
      customerNameRef.current.focus();
    } else if (lastActiveInput.current === 'salesPerson' && salesPersonRef.current) {
      salesPersonRef.current.focus();
    }
  });

  const handleReset = () => {
    const emptyFilters = { invoiceNo: '', customerName: '', status: 'all', dateFrom: '', dateTo: '', salesPerson: '' };
    setFilters(emptyFilters);
    setCurrentPage(1);
  };
  const unpaidInvoices = invoices.filter(inv => !inv.custom_commission_paid);
  const paidInvoices = invoices.filter(inv => inv.custom_commission_paid);
  const totalCommission = invoices.reduce((sum, inv) => sum + (inv.custom_total_komisi_sales || 0), 0);
  const unpaidCommission = unpaidInvoices.reduce((sum, inv) => sum + (inv.custom_total_komisi_sales || 0), 0);

  if (!selectedCompany) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-yellow-800">Perusahaan Belum Dipilih</h3>
          <p className="text-yellow-600 mt-2">Silakan pilih perusahaan terlebih dahulu.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner message="Memuat data komisi yang belum dibayar..." />;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pembayaran Komisi Sales</h1>
          <p className="text-sm text-gray-500">Faktur penjualan lunas dengan komisi belum dibayar</p>
        </div>
        <button
          onClick={() => router.push('/commission-payment/cpMain')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          + Bayar Komisi
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-600 font-medium">Total Faktur</p>
          <p className="text-2xl font-bold text-blue-900">{totalRecords}</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <p className="text-sm text-orange-600 font-medium">Total Komisi</p>
          <p className="text-2xl font-bold text-orange-900">Rp {totalCommission.toLocaleString('id-ID')}</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-600 font-medium">Belum Dibayar</p>
          <p className="text-2xl font-bold text-yellow-900">{unpaidInvoices.length} (Rp {unpaidCommission.toLocaleString('id-ID')})</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-600 font-medium">Sudah Dibayar</p>
          <p className="text-2xl font-bold text-green-900">{paidInvoices.length}</p>
        </div>
      </div>

      {/* Filter Panel */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">No. Faktur</label>
            <input
              ref={invoiceNoRef}
              type="text"
              value={filters.invoiceNo}
              onChange={(e) => {
                lastActiveInput.current = 'invoiceNo';
                setFilters(prev => ({ ...prev, invoiceNo: e.target.value }));
                setCurrentPage(1);
              }}
              placeholder="Cari no faktur..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Pelanggan</label>
            <input
              ref={customerNameRef}
              type="text"
              value={filters.customerName}
              onChange={(e) => {
                lastActiveInput.current = 'customerName';
                setFilters(prev => ({ ...prev, customerName: e.target.value }));
                setCurrentPage(1);
              }}
              placeholder="Cari pelanggan..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sales Person</label>
            <input
              ref={salesPersonRef}
              type="text"
              value={filters.salesPerson}
              onChange={(e) => {
                lastActiveInput.current = 'salesPerson';
                setFilters(prev => ({ ...prev, salesPerson: e.target.value }));
                setCurrentPage(1);
              }}
              placeholder="Cari sales..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status Komisi</label>
            <select
              value={filters.status}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, status: e.target.value }));
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">Semua</option>
              <option value="unpaid">Belum Dibayar</option>
              <option value="paid">Sudah Dibayar</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dari Tanggal</label>
            <BrowserStyleDatePicker
              value={filters.dateFrom}
              onChange={(value) => {
                setFilters(prev => ({ ...prev, dateFrom: value }));
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sampai Tanggal</label>
            <BrowserStyleDatePicker
              value={filters.dateTo}
              onChange={(value) => {
                setFilters(prev => ({ ...prev, dateTo: value }));
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleReset}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-50"
          >
            Reset Filter
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-900">
            Daftar Faktur Komisi 
            <span className="ml-2 px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full">{totalRecords} faktur</span>
          </h3>
        </div>
        
        {/* Desktop Table */}
        {!isMobile ? (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No. Faktur</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pelanggan</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sales Person</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Faktur</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Komisi</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      Tidak ada faktur dengan komisi
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.name} className="hover:bg-gray-50">
                      <td 
                        className="px-4 py-3 whitespace-nowrap text-sm font-medium text-indigo-600 cursor-pointer hover:underline"
                        onClick={() => router.push(`/invoice/siMain?name=${encodeURIComponent(inv.name)}`)}
                      >
                        {inv.name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{inv.customer_name || inv.customer}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {inv.sales_team && inv.sales_team.length > 0
                          ? inv.sales_team.map(s => s.sales_person).join(', ')
                          : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{inv.posting_date}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">Rp {(inv.grand_total || 0).toLocaleString('id-ID')}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-orange-600 text-right">Rp {(inv.custom_total_komisi_sales || 0).toLocaleString('id-ID')}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {inv.custom_commission_paid ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Sudah Dibayar
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Belum Dibayar
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </>
        ) : (
          /* Mobile Cards */
          <div className="divide-y divide-gray-200">
            {invoices.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">Tidak ada faktur dengan komisi</div>
            ) : (
              invoices.map((inv) => (
                <div 
                  key={inv.name} 
                  className="px-4 py-4 hover:bg-gray-50"
                  onClick={() => router.push(`/invoice/siMain?name=${encodeURIComponent(inv.name)}`)}
                >
                  <div className="space-y-3">
                    {/* Row 1: Invoice No + Status Badge */}
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-indigo-600 truncate cursor-pointer">{inv.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">📅 {inv.posting_date}</p>
                      </div>
                      {inv.custom_commission_paid ? (
                        <span className="ml-2 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ✓ Dibayar
                        </span>
                      ) : (
                        <span className="ml-2 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          ⏳ Belum
                        </span>
                      )}
                    </div>
                    
                    {/* Row 2: Customer */}
                    <div className="text-sm text-gray-700 truncate" title={inv.customer_name || inv.customer}>
                      👤 {inv.customer_name || inv.customer}
                    </div>
                    
                    {/* Row 3: Sales Person */}
                    {inv.sales_team && inv.sales_team.length > 0 && (
                      <div className="text-sm text-gray-600 truncate">
                        💼 {inv.sales_team.map(s => s.sales_person).join(', ')}
                      </div>
                    )}
                    
                    {/* Row 4: Total Faktur + Komisi */}
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Total Faktur</p>
                        <p className="text-sm font-semibold text-gray-900">
                          Rp {(inv.grand_total || 0).toLocaleString('id-ID')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Komisi</p>
                        <p className="text-sm font-bold text-orange-600">
                          Rp {(inv.custom_total_komisi_sales || 0).toLocaleString('id-ID')}
                        </p>
                      </div>
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
          onPageChange={(page) => {
            pageChangeSourceRef.current = 'pagination';
            setCurrentPage(page);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      </div>
    </div>
  );
}
