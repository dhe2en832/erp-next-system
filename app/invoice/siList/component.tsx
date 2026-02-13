'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '../../components/LoadingSpinner';
import Pagination from '../../components/Pagination';
import { formatDate, parseDate } from '../../../utils/format';
import BrowserStyleDatePicker from '../../../components/BrowserStyleDatePicker';

interface InvoiceItem {
  item_code: string;
  item_name: string;
  qty: number;
  rate: number;
  amount: number;
  income_account: string;
  cost_center: string;
  warehouse: string;
  delivery_note?: string;
  sales_order?: string;
  so_detail?: string;
  dn_detail?: string;
  custom_komisi_sales?: number;
}

interface Invoice {
  name: string;
  customer: string;
  customer_name: string;
  posting_date: string;
  due_date: string;
  grand_total: number;
  outstanding_amount: number;
  paid_amount: number;
  status: string;
  delivery_note: string;
  items?: InvoiceItem[];
  custom_total_komisi_sales?: number;
  custom_notes_si?: string;
}

export default function SalesInvoiceList() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState({
    from_date: formatDate(new Date(Date.now() - 86400000)),
    to_date: formatDate(new Date()),
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [documentNumberFilter, setDocumentNumberFilter] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submittingInvoice, setSubmittingInvoice] = useState<string | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [pageSize] = useState(20);

  useEffect(() => {
    let savedCompany = localStorage.getItem('selected_company');
    if (!savedCompany) {
      const cookies = document.cookie.split(';');
      const companyCookie = cookies.find(cookie => cookie.trim().startsWith('selected_company='));
      if (companyCookie) {
        savedCompany = companyCookie.split('=')[1];
        if (savedCompany) localStorage.setItem('selected_company', savedCompany);
      }
    }
    if (savedCompany) setSelectedCompany(savedCompany);
  }, []);

  const fetchInvoices = useCallback(async () => {
    setError('');
    let companyToUse = selectedCompany;
    if (!companyToUse) {
      const storedCompany = localStorage.getItem('selected_company');
      if (storedCompany) {
        companyToUse = storedCompany;
      } else {
        const cookies = document.cookie.split(';');
        const companyCookie = cookies.find(cookie => cookie.trim().startsWith('selected_company='));
        if (companyCookie) {
          const cookieValue = companyCookie.split('=')[1];
          if (cookieValue) companyToUse = cookieValue;
        }
      }
    }
    if (!companyToUse) {
      setError('Perusahaan belum dipilih. Silakan pilih perusahaan terlebih dahulu.');
      setLoading(false);
      return;
    }
    if (!selectedCompany && companyToUse) setSelectedCompany(companyToUse);

    try {
      const params = new URLSearchParams();
      params.append('limit_page_length', pageSize.toString());
      params.append('start', ((currentPage - 1) * pageSize).toString());
      if (companyToUse) params.append('company', companyToUse);
      if (searchTerm) params.append('search', searchTerm);
      if (documentNumberFilter) params.append('documentNumber', documentNumberFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (dateFilter.from_date) {
        const parsedDate = parseDate(dateFilter.from_date);
        if (parsedDate) params.append('from_date', parsedDate);
      }
      if (dateFilter.to_date) {
        const parsedDate = parseDate(dateFilter.to_date);
        if (parsedDate) params.append('to_date', parsedDate);
      }

      const response = await fetch(`/api/invoice?${params}`);
      const data = await response.json();

      if (data.success) {
        setInvoices(data.data || []);
        if (data.total_records !== undefined) {
          setTotalRecords(data.total_records);
          setTotalPages(Math.ceil(data.total_records / pageSize));
        } else {
          setTotalRecords(data.data?.length || 0);
          setTotalPages(1);
        }
        setError('');
      } else {
        setError('Gagal memuat faktur: ' + data.message);
      }
    } catch {
      setError('Gagal memuat faktur penjualan');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, currentPage, pageSize, dateFilter, searchTerm, statusFilter, documentNumberFilter]);

  useEffect(() => {
    fetchInvoices();
  }, [dateFilter, searchTerm, statusFilter, documentNumberFilter, fetchInvoices]);

  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter, searchTerm, statusFilter, documentNumberFilter]);

  // Submit Sales Invoice
  const handleSubmitSalesInvoice = async (invoiceName: string) => {
    try {
      setSubmittingInvoice(invoiceName);
      const response = await fetch(`/api/invoice/${invoiceName}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await response.json();
      if (result.success) {
        setSuccessMessage(`✅ Faktur Penjualan ${invoiceName} berhasil diajukan!\n\n📄 Status: Draft → Belum Lunas\n💰 Dampak Akuntansi:\n• Faktur masuk ke sistem akuntansi\n• Jurnal penjualan otomatis terbuat\n• Piutang pelanggan tercatat`);
        fetchInvoices();
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        setError(`Gagal mengajukan Faktur Penjualan: ${result.message}`);
      }
    } catch (error) {
      console.error('Error submitting sales invoice:', error);
      setError('Terjadi kesalahan saat mengajukan Faktur Penjualan');
    } finally {
      setSubmittingInvoice(null);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Memuat Faktur Penjualan..." />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Faktur Penjualan</h1>
        <div className="flex space-x-3">
          <button
            onClick={() => router.push('/invoice/siMain')}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center"
          >
            <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Buat Faktur Baru
          </button>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cari Pelanggan</label>
            <input type="text" placeholder="Cari nama pelanggan..." className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">No. Dokumen</label>
            <input type="text" placeholder="Cari nomor faktur..." className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" value={documentNumberFilter} onChange={(e) => setDocumentNumberFilter(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Semua Status</option>
              <option value="Draft">Draft</option>
              <option value="Submitted">Diajukan</option>
              <option value="Unpaid">Belum Lunas</option>
              <option value="Paid">Lunas</option>
              <option value="Cancelled">Dibatalkan</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dari Tanggal</label>
            <BrowserStyleDatePicker value={dateFilter.from_date} onChange={(value: string) => setDateFilter({ ...dateFilter, from_date: value })} className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="DD/MM/YYYY" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sampai Tanggal</label>
            <BrowserStyleDatePicker value={dateFilter.to_date} onChange={(value: string) => setDateFilter({ ...dateFilter, to_date: value })} className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="DD/MM/YYYY" />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setDateFilter({ from_date: formatDate(new Date(Date.now() - 86400000)), to_date: formatDate(new Date()) });
                setSearchTerm('');
                setStatusFilter('');
                setDocumentNumberFilter('');
              }}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
            >
              Hapus Filter
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-md mb-6">
          <div className="flex"><div className="text-sm text-red-700">{error}</div></div>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Berhasil!</h3>
              <div className="mt-2 text-sm text-green-700">
                <pre className="whitespace-pre-wrap font-sans">{successMessage}</pre>
              </div>
            </div>
            <div className="ml-auto pl-3">
              <button onClick={() => setSuccessMessage('')} className="inline-flex bg-green-50 rounded-md p-1.5 text-green-500 hover:bg-green-100">
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {invoices.map((invoice) => (
            <li
              key={invoice.name}
              onClick={() => {
                if (invoice.name) {
                  router.push(`/invoice/siMain?name=${invoice.name}`);
                }
              }}
              className="cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-indigo-600 truncate">{invoice.name}</p>
                    <p className="mt-1 text-sm text-gray-900">Pelanggan: {invoice.customer_name || invoice.customer}</p>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      invoice.status === 'Paid' ? 'bg-green-100 text-green-800'
                      : invoice.status === 'Unpaid' ? 'bg-red-100 text-red-800'
                      : invoice.status === 'Submitted' ? 'bg-blue-100 text-blue-800'
                      : invoice.status === 'Draft' ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                    }`}>
                      {invoice.status}
                    </span>
                  </div>
                </div>
                <div className="mt-2 sm:flex sm:justify-between">
                  <div className="sm:flex">
                    <p className="flex items-center text-sm text-gray-500">Tanggal: {invoice.posting_date}</p>
                    <p className="mt-2 sm:mt-0 sm:ml-6 flex items-center text-sm text-gray-500">Jatuh Tempo: {invoice.due_date}</p>
                    {invoice.items && invoice.items.length > 0 && invoice.items.find((item: InvoiceItem) => item.delivery_note) && (
                      <p className="mt-2 sm:mt-0 sm:ml-6 flex items-center text-sm text-gray-500">
                        DN: {invoice.items.find((item: InvoiceItem) => item.delivery_note)?.delivery_note || '-'}
                      </p>
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-between sm:mt-0">
                    <div className="text-right">
                      <div className="font-medium text-sm text-gray-900">Total: Rp {invoice.grand_total ? invoice.grand_total.toLocaleString('id-ID') : '0'}</div>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-xs text-green-600">
                          Dibayar: Rp {(invoice.paid_amount || (invoice.grand_total - invoice.outstanding_amount) || 0).toLocaleString('id-ID')}
                        </span>
                        <span className="text-xs text-orange-600">
                          Sisa: Rp {invoice.outstanding_amount ? invoice.outstanding_amount.toLocaleString('id-ID') : '0'}
                        </span>
                      </div>
                      {/* Payment Progress Bar */}
                      {invoice.grand_total && invoice.grand_total > 0 && (
                        <div className="mt-2 w-32">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(((invoice.paid_amount || (invoice.grand_total - invoice.outstanding_amount) || 0) / invoice.grand_total) * 100, 100)}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {Math.round(((invoice.paid_amount || (invoice.grand_total - invoice.outstanding_amount) || 0) / invoice.grand_total) * 100)}% Lunas
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Submit Button for Draft Invoices */}
                    {invoice.status === 'Draft' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSubmitSalesInvoice(invoice.name);
                        }}
                        disabled={submittingInvoice === invoice.name}
                        className="ml-4 px-3 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
                      >
                        {submittingInvoice === invoice.name ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Mengajukan...
                          </>
                        ) : (
                          'Ajukan'
                        )}
                      </button>
                    )}
                  </div>
                  {invoice.custom_notes_si && (
                    <p className="mt-1 text-xs text-gray-400 truncate">Catatan: {invoice.custom_notes_si}</p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
        {invoices.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Tidak ada faktur ditemukan</p>
          </div>
        )}
        <Pagination currentPage={currentPage} totalPages={totalPages} totalRecords={totalRecords} pageSize={pageSize} onPageChange={setCurrentPage} />
      </div>
    </div>
  );
}
