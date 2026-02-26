'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { SalesInvoiceWithItems } from '@/types/sales-invoice-details';
import FilterSection from '@/components/reports/FilterSection';
import SummaryCards, { SummaryCard } from '@/components/reports/SummaryCards';
import { useExpandableRows } from '@/hooks/useExpandableRows';
import PrintPreviewModal from '@/components/PrintPreviewModal';
import SalesPersonDialog from '@/app/components/SalesPersonDialog';
import {
  formatCurrency,
  formatToDDMMYYYY,
  calculateInvoiceSummary,
  getStatusColor,
  getCurrentDate,
  getFirstDayOfMonth
} from '@/lib/report-utils';

export default function SalesInvoiceDetailsPage() {
  const router = useRouter();
  
  // State management
  const [data, setData] = useState<SalesInvoiceWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [showPrint, setShowPrint] = useState(false);
  const [showSalesPersonDialog, setShowSalesPersonDialog] = useState(false);
  
  // Filter states
  const [fromDate, setFromDate] = useState(getFirstDayOfMonth());
  const [toDate, setToDate] = useState(getCurrentDate());
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSalesPerson, setFilterSalesPerson] = useState('');
  const [selectedSalesPersonName, setSelectedSalesPersonName] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = typeof window !== 'undefined' && window.innerWidth < 768 ? 10 : 20;
  
  // Expandable rows
  const { toggleRow, isExpanded } = useExpandableRows();
  
  // Track pagination source
  const pageChangeSourceRef = useRef<'pagination' | 'filter' | 'init'>('init');

  // Check company selection
  useEffect(() => {
    const saved = localStorage.getItem('selected_company');
    if (!saved) {
      router.push('/select-company');
      return;
    }
    setSelectedCompany(saved);
  }, [router]);

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!selectedCompany) return;
    
    setLoading(true);
    setError('');
    
    try {
      const params = new URLSearchParams({
        company: selectedCompany,
        from_date: fromDate,
        to_date: toDate
      });
      
      const response = await fetch(`/api/finance/reports/sales-invoice-details?${params}`, {
        credentials: 'include'
      });
      
      const result = await response.json();
      
      if (result.success) {
        setData(result.data || []);
        // Cache data for pagination
        if (typeof window !== 'undefined') {
          (window as any).__salesInvoiceData = result.data || [];
        }
      } else {
        setError(result.message || 'Gagal memuat laporan');
      }
    } catch (err) {
      setError('Gagal memuat laporan. Silakan coba lagi.');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, fromDate, toDate]);

  useEffect(() => {
    if (selectedCompany) {
      fetchData();
    }
  }, [selectedCompany, fetchData]);

  // Filter data
  const filteredData = useMemo(() => {
    return data.filter(invoice => {
      const matchCustomer = !filterCustomer || 
        invoice.customer.toLowerCase().includes(filterCustomer.toLowerCase()) ||
        invoice.customer_name?.toLowerCase().includes(filterCustomer.toLowerCase()) ||
        invoice.name.toLowerCase().includes(filterCustomer.toLowerCase());
      
      const matchStatus = !filterStatus || invoice.status === filterStatus;
      
      const matchSalesPerson = !filterSalesPerson || 
        (invoice.sales_team && invoice.sales_team.some(st => 
          st.sales_person?.toLowerCase().includes(filterSalesPerson.toLowerCase())
        ));
      
      return matchCustomer && matchStatus && matchSalesPerson;
    });
  }, [data, filterCustomer, filterStatus, filterSalesPerson]);

  // Calculate summary
  const summary = useMemo(() => {
    return calculateInvoiceSummary(filteredData);
  }, [filteredData]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, currentPage, pageSize]);

  // Summary cards
  const summaryCards: SummaryCard[] = [
    {
      label: 'Total Faktur',
      value: summary.count,
      color: 'blue'
    },
    {
      label: 'Total Penjualan',
      value: formatCurrency(summary.total),
      color: 'green'
    },
    {
      label: 'Rata-rata Faktur',
      value: formatCurrency(summary.average),
      color: 'purple'
    },
    {
      label: 'Halaman Saat Ini',
      value: `${currentPage} / ${totalPages || 1}`,
      color: 'orange'
    }
  ];

  // Handlers
  const handleClearFilters = () => {
    setFilterCustomer('');
    setFilterStatus('');
    setFilterSalesPerson('');
    setSelectedSalesPersonName('');
    setCurrentPage(1);
    setError('');
  };

  const handleSalesPersonSelect = (salesPerson: { name: string; full_name: string }) => {
    setFilterSalesPerson(salesPerson.name);
    setSelectedSalesPersonName(salesPerson.full_name);
    setShowSalesPersonDialog(false);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reset page when filters change
  useEffect(() => {
    if (pageChangeSourceRef.current === 'filter') {
      setCurrentPage(1);
    }
    pageChangeSourceRef.current = 'filter';
  }, [filterCustomer, filterStatus, filterSalesPerson]);

  if (loading && data.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat laporan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Laporan Detail Penjualan Per Faktur
        </h1>
        <button
          onClick={() => setShowPrint(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Cetak Laporan
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <FilterSection
        fromDate={fromDate}
        toDate={toDate}
        onFromDateChange={setFromDate}
        onToDateChange={setToDate}
        searchValue={filterCustomer}
        onSearchChange={setFilterCustomer}
        searchPlaceholder="Cari pelanggan atau nomor faktur..."
        additionalFilters={
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Semua Status</option>
                <option value="Draft">Draft</option>
                <option value="Submitted">Submitted</option>
                <option value="Paid">Paid</option>
                <option value="Unpaid">Unpaid</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sales Person
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={selectedSalesPersonName || filterSalesPerson}
                  onChange={(e) => {
                    setFilterSalesPerson(e.target.value);
                    setSelectedSalesPersonName('');
                  }}
                  placeholder="Cari sales person..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={() => setShowSalesPersonDialog(true)}
                  className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 text-sm"
                  title="Pilih Sales Person"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        }
        onClearFilters={handleClearFilters}
        onRefresh={fetchData}
      />

      <SummaryCards cards={summaryCards} />

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  No. Faktur
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tanggal
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pelanggan
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Grand Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Tidak ada data
                  </td>
                </tr>
              ) : (
                paginatedData.map((invoice) => (
                  <React.Fragment key={invoice.name}>
                    <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleRow(invoice.name)}>
                      <td className="px-4 py-3">
                        <button className="text-gray-500 hover:text-gray-700">
                          {isExpanded(invoice.name) ? '▼' : '▶'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-indigo-600">
                        {invoice.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatToDDMMYYYY(invoice.posting_date)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {invoice.customer_name || invoice.customer}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        {formatCurrency(invoice.grand_total)}
                      </td>
                    </tr>
                    
                    {isExpanded(invoice.name) && (
                      <tr>
                        <td colSpan={6} className="px-4 py-4 bg-gray-50">
                          <div className="ml-8">
                            <h4 className="text-sm font-medium text-gray-900 mb-2">Detail Items:</h4>
                            <table className="min-w-full">
                              <thead className="bg-gray-100">
                                <tr>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Kode Item</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Nama Item</th>
                                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Qty</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Satuan</th>
                                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Harga</th>
                                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Diskon</th>
                                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Pajak</th>
                                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {invoice.items.map((item, idx) => (
                                  <tr key={idx} className="border-t border-gray-200">
                                    <td className="px-3 py-2 text-xs">{item.item_code}</td>
                                    <td className="px-3 py-2 text-xs">{item.item_name}</td>
                                    <td className="px-3 py-2 text-xs text-right">{item.qty}</td>
                                    <td className="px-3 py-2 text-xs">{item.uom}</td>
                                    <td className="px-3 py-2 text-xs text-right">{formatCurrency(item.rate)}</td>
                                    <td className="px-3 py-2 text-xs text-right">{formatCurrency(item.discount_amount)}</td>
                                    <td className="px-3 py-2 text-xs text-right">{formatCurrency(item.tax_amount)}</td>
                                    <td className="px-3 py-2 text-xs text-right">{formatCurrency(item.amount)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-200">
        {paginatedData.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">
            Tidak ada data
          </div>
        ) : (
          paginatedData.map((invoice) => (
            <div key={invoice.name} className="px-4 py-4">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-indigo-600">{invoice.name}</p>
                    <p className="text-sm text-gray-900 mt-1">{invoice.customer_name || invoice.customer}</p>
                    <p className="text-xs text-gray-500 mt-1">{formatToDDMMYYYY(invoice.posting_date)}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(invoice.status)}`}>
                    {invoice.status}
                  </span>
                </div>
                <div className="text-sm font-medium text-gray-900">
                  {formatCurrency(invoice.grand_total)}
                </div>
                <button
                  onClick={() => toggleRow(invoice.name)}
                  className="text-sm text-indigo-600 hover:text-indigo-700"
                >
                  {isExpanded(invoice.name) ? '▼ Sembunyikan Detail' : '▶ Lihat Detail'}
                </button>
                
                {isExpanded(invoice.name) && (
                  <div className="mt-3 pl-4 border-l-2 border-indigo-200">
                    {invoice.items.map((item, idx) => (
                      <div key={idx} className="mb-3 pb-3 border-b border-gray-100 last:border-0">
                        <p className="text-xs font-medium text-gray-900">{item.item_name}</p>
                        <p className="text-xs text-gray-500">{item.item_code}</p>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <div>
                            <span className="text-xs text-gray-500">Qty:</span>
                            <span className="text-xs text-gray-900 ml-1">{item.qty} {item.uom}</span>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500">Total:</span>
                            <span className="text-xs text-gray-900 ml-1">{formatCurrency(item.amount)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center">
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Print Modal */}
      {showPrint && (
        <PrintPreviewModal
          title={`Laporan Detail Penjualan Per Faktur — ${selectedCompany}`}
          onClose={() => setShowPrint(false)}
          printUrl=""
          useContentFrame={true}
          allowPaperSettings={true}
        >
          <div className="p-8 bg-white">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold">{selectedCompany}</h2>
              <h3 className="text-lg font-semibold mt-2">Laporan Detail Penjualan Per Faktur</h3>
              <p className="text-sm text-gray-600 mt-1">Periode: {fromDate} s/d {toDate}</p>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-2 px-2">No. Faktur</th>
                  <th className="text-left py-2 px-2">Tanggal</th>
                  <th className="text-left py-2 px-2">Pelanggan</th>
                  <th className="text-left py-2 px-2">Status</th>
                  <th className="text-right py-2 px-2">Grand Total</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((invoice) => (
                  <React.Fragment key={invoice.name}>
                    <tr className="border-b border-gray-200">
                      <td className="py-2 px-2 font-medium">{invoice.name}</td>
                      <td className="py-2 px-2">{formatToDDMMYYYY(invoice.posting_date)}</td>
                      <td className="py-2 px-2">{invoice.customer_name || invoice.customer}</td>
                      <td className="py-2 px-2">{invoice.status}</td>
                      <td className="py-2 px-2 text-right">{formatCurrency(invoice.grand_total)}</td>
                    </tr>
                    {invoice.items.map((item, idx) => (
                      <tr key={`${invoice.name}-${idx}`} className="bg-gray-50 text-xs">
                        <td className="py-1 px-2 pl-6" colSpan={2}>{item.item_code} - {item.item_name}</td>
                        <td className="py-1 px-2 text-right">{item.qty} {item.uom}</td>
                        <td className="py-1 px-2 text-right">{formatCurrency(item.rate)}</td>
                        <td className="py-1 px-2 text-right">{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300 font-bold">
                  <td colSpan={4} className="py-2 px-2 text-right">TOTAL:</td>
                  <td className="py-2 px-2 text-right">{formatCurrency(summary.total)}</td>
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
      {showSalesPersonDialog && (
        <SalesPersonDialog
          isOpen={showSalesPersonDialog}
          onSelect={handleSalesPersonSelect}
          onClose={() => setShowSalesPersonDialog(false)}
        />
      )}
    </div>
  );
}
