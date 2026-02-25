'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PaymentEntry } from '@/types/payment-details';
import FilterSection from '@/components/reports/FilterSection';
import SummaryCards, { SummaryCard } from '@/components/reports/SummaryCards';
import PrintPreviewModal from '@/components/PrintPreviewModal';
import {
  formatCurrency,
  formatToDDMMYYYY,
  calculatePaymentSummary,
  getStatusColor,
  getCurrentDate,
  getFirstDayOfMonth
} from '@/lib/report-utils';

export default function PaymentSummaryPage() {
  const router = useRouter();
  
  const [data, setData] = useState<PaymentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [showPrint, setShowPrint] = useState(false);
  
  const [fromDate, setFromDate] = useState(getFirstDayOfMonth());
  const [toDate, setToDate] = useState(getCurrentDate());
  const [filterParty, setFilterParty] = useState('');
  const [filterPaymentType, setFilterPaymentType] = useState('');
  const [filterModeOfPayment, setFilterModeOfPayment] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = typeof window !== 'undefined' && window.innerWidth < 768 ? 10 : 20;
  
  const pageChangeSourceRef = useRef<'pagination' | 'filter' | 'init'>('init');

  useEffect(() => {
    const saved = localStorage.getItem('selected_company');
    if (!saved) {
      router.push('/select-company');
      return;
    }
    setSelectedCompany(saved);
  }, [router]);

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
      
      const response = await fetch(`/api/finance/reports/payment-summary?${params}`, {
        credentials: 'include'
      });
      
      const result = await response.json();
      
      if (result.success) {
        setData(result.data || []);
        if (typeof window !== 'undefined') {
          (window as any).__paymentSummaryData = result.data || [];
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

  const filteredData = useMemo(() => {
    return data.filter(payment => {
      const matchParty = !filterParty || 
        payment.party.toLowerCase().includes(filterParty.toLowerCase()) ||
        payment.party_name?.toLowerCase().includes(filterParty.toLowerCase()) ||
        payment.name.toLowerCase().includes(filterParty.toLowerCase());
      
      const matchType = !filterPaymentType || payment.payment_type === filterPaymentType;
      const matchMode = !filterModeOfPayment || payment.mode_of_payment === filterModeOfPayment;
      
      return matchParty && matchType && matchMode;
    });
  }, [data, filterParty, filterPaymentType, filterModeOfPayment]);

  const summary = useMemo(() => {
    return calculatePaymentSummary(filteredData);
  }, [filteredData]);

  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, currentPage, pageSize]);

  const summaryCards: SummaryCard[] = [
    {
      label: 'Total Transaksi',
      value: summary.count,
      color: 'blue'
    },
    {
      label: 'Total Penerimaan',
      value: formatCurrency(summary.totalReceived),
      color: 'green'
    },
    {
      label: 'Total Pembayaran',
      value: formatCurrency(summary.totalPaid),
      color: 'purple'
    },
    {
      label: 'Saldo Bersih',
      value: formatCurrency(summary.netBalance),
      color: 'orange'
    }
  ];

  const handleClearFilters = () => {
    setFilterParty('');
    setFilterPaymentType('');
    setFilterModeOfPayment('');
    setCurrentPage(1);
    setError('');
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (pageChangeSourceRef.current === 'filter') {
      setCurrentPage(1);
    }
    pageChangeSourceRef.current = 'filter';
  }, [filterParty, filterPaymentType, filterModeOfPayment]);

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
          Laporan Pembayaran
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
        searchValue={filterParty}
        onSearchChange={setFilterParty}
        searchPlaceholder="Cari pihak terkait atau nomor pembayaran..."
        additionalFilters={
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipe Pembayaran
              </label>
              <select
                value={filterPaymentType}
                onChange={(e) => setFilterPaymentType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Semua Tipe</option>
                <option value="Receive">Receive</option>
                <option value="Pay">Pay</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Metode Pembayaran
              </label>
              <select
                value={filterModeOfPayment}
                onChange={(e) => setFilterModeOfPayment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Semua Metode</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Check">Check</option>
                <option value="Credit Card">Credit Card</option>
              </select>
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
                  No. Pembayaran
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tanggal
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipe
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pihak Terkait
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Metode
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Jumlah
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
                paginatedData.map((payment) => (
                  <tr key={payment.name} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-indigo-600">
                      {payment.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatToDDMMYYYY(payment.posting_date)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        payment.payment_type === 'Receive' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {payment.payment_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {payment.party_name || payment.party}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {payment.mode_of_payment}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">
                      {formatCurrency(payment.paid_amount)}
                    </td>
                  </tr>
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
          paginatedData.map((payment) => (
            <div key={payment.name} className="px-4 py-4">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-indigo-600">{payment.name}</p>
                    <p className="text-sm text-gray-900 mt-1">{payment.party_name || payment.party}</p>
                    <p className="text-xs text-gray-500 mt-1">{formatToDDMMYYYY(payment.posting_date)}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    payment.payment_type === 'Receive' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {payment.payment_type}
                  </span>
                </div>
                <div className="text-sm font-medium text-gray-900">
                  {formatCurrency(payment.paid_amount)}
                </div>
                <div className="text-xs text-gray-500">
                  {payment.mode_of_payment}
                </div>
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
          title={`Laporan Pembayaran — ${selectedCompany}`}
          onClose={() => setShowPrint(false)}
          printUrl=""
          useContentFrame={true}
          allowPaperSettings={true}
        >
          <div className="p-8 bg-white">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold">{selectedCompany}</h2>
              <h3 className="text-lg font-semibold mt-2">Laporan Pembayaran</h3>
              <p className="text-sm text-gray-600 mt-1">Periode: {fromDate} s/d {toDate}</p>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-2 px-2">No. Pembayaran</th>
                  <th className="text-left py-2 px-2">Tanggal</th>
                  <th className="text-left py-2 px-2">Tipe</th>
                  <th className="text-left py-2 px-2">Pihak Terkait</th>
                  <th className="text-left py-2 px-2">Metode</th>
                  <th className="text-right py-2 px-2">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((payment) => (
                  <tr key={payment.name} className="border-b border-gray-200">
                    <td className="py-2 px-2 font-medium">{payment.name}</td>
                    <td className="py-2 px-2">{formatToDDMMYYYY(payment.posting_date)}</td>
                    <td className="py-2 px-2">{payment.payment_type}</td>
                    <td className="py-2 px-2">{payment.party_name || payment.party}</td>
                    <td className="py-2 px-2">{payment.mode_of_payment}</td>
                    <td className="py-2 px-2 text-right">{formatCurrency(payment.paid_amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300 font-bold">
                  <td colSpan={5} className="py-2 px-2 text-right">TOTAL PENERIMAAN:</td>
                  <td className="py-2 px-2 text-right text-green-700">{formatCurrency(summary.totalReceived)}</td>
                </tr>
                <tr className="font-bold">
                  <td colSpan={5} className="py-2 px-2 text-right">TOTAL PEMBAYARAN:</td>
                  <td className="py-2 px-2 text-right text-red-700">{formatCurrency(summary.totalPaid)}</td>
                </tr>
                <tr className="border-t border-gray-300 font-bold">
                  <td colSpan={5} className="py-2 px-2 text-right">SALDO BERSIH:</td>
                  <td className="py-2 px-2 text-right">{formatCurrency(summary.netBalance)}</td>
                </tr>
              </tfoot>
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
