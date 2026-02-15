'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '../../components/LoadingSpinner';

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
  const [invoices, setInvoices] = useState<PayableInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');

  // Filter states
  const [filters, setFilters] = useState({
    invoiceNo: '',
    customerName: '',
    status: 'all',
    dateFrom: '',
    dateTo: '',
    salesPerson: '',
  });

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem('selected_company');
    if (saved) setSelectedCompany(saved);

    // Set default date range: kemarin sampai hari ini
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    
    setFilters(prev => ({
      ...prev,
      dateFrom: formatDate(yesterday),
      dateTo: formatDate(today)
    }));
  }, []);

  const fetchPayableInvoices = useCallback(async (pageNum = 1) => {
    if (!selectedCompany) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        company: selectedCompany,
        page: String(pageNum),
        limit: String(limit),
      });

      // Add filters if provided
      if (filters.invoiceNo) params.set('invoice_no', filters.invoiceNo);
      if (filters.customerName) params.set('customer_name', filters.customerName);
      if (filters.status && filters.status !== 'all') params.set('status', filters.status);
      if (filters.dateFrom) params.set('date_from', filters.dateFrom);
      if (filters.dateTo) params.set('date_to', filters.dateTo);
      if (filters.salesPerson) params.set('sales_person', filters.salesPerson);

      const response = await fetch(`/api/finance/commission/payable-invoices?${params}`, { credentials: 'include' });
      const data = await response.json();

      if (data.success) {
        setInvoices(data.data || []);
        setTotal(data.total || 0);
      } else {
        setError(data.message || 'Gagal memuat data komisi');
      }
    } catch (err) {
      console.error('Error fetching payable invoices:', err);
      setError('Gagal memuat data komisi');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, filters, limit]);

  useEffect(() => {
    if (selectedCompany) {
      setPage(1);
      fetchPayableInvoices(1);
    }
  }, [selectedCompany, filters, fetchPayableInvoices]);

  // Calculate totals
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
          <p className="text-2xl font-bold text-blue-900">{total}</p>
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
              type="text"
              value={filters.invoiceNo}
              onChange={(e) => setFilters(prev => ({ ...prev, invoiceNo: e.target.value }))}
              placeholder="Cari no faktur..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Pelanggan</label>
            <input
              type="text"
              value={filters.customerName}
              onChange={(e) => setFilters(prev => ({ ...prev, customerName: e.target.value }))}
              placeholder="Cari pelanggan..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sales Person</label>
            <input
              type="text"
              value={filters.salesPerson}
              onChange={(e) => setFilters(prev => ({ ...prev, salesPerson: e.target.value }))}
              placeholder="Cari sales..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status Komisi</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">Semua</option>
              <option value="unpaid">Belum Dibayar</option>
              <option value="paid">Sudah Dibayar</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dari Tanggal</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sampai Tanggal</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={() => {
              setFilters({ invoiceNo: '', customerName: '', status: 'all', dateFrom: '', dateTo: '', salesPerson: '' });
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-50"
          >
            Reset Filter
          </button>
          <button
            onClick={() => { setPage(1); fetchPayableInvoices(1); }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700"
          >
            Cari
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
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
        {/* Pagination */}
        {total > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Menampilkan {((page - 1) * limit) + 1} - {Math.min(page * limit, total)} dari {total} data
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { if (page > 1) { setPage(page - 1); fetchPayableInvoices(page - 1); } }}
                disabled={page <= 1}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                &larr; Sebelumnya
              </button>
              <span className="px-3 py-1 text-sm text-gray-600">
                Halaman {page}
              </span>
              <button
                onClick={() => { if (page * limit < total) { setPage(page + 1); fetchPayableInvoices(page + 1); } }}
                disabled={page * limit >= total}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Selanjutnya &rarr;
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
