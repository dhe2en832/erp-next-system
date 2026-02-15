'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '../../components/LoadingSpinner';
import Pagination from '../../components/Pagination';
import { formatDate, parseDate } from '../../../utils/format';
import BrowserStyleDatePicker from '../../../components/BrowserStyleDatePicker';
import { Printer } from 'lucide-react';

interface PurchaseInvoice {
  name: string;
  supplier: string;
  supplier_name: string;
  posting_date: string;
  due_date: string;
  grand_total: number;
  outstanding_amount: number;
  status: string;
  currency: string;
}

interface Supplier {
  name: string;
  supplier_name: string;
}

export default function PurchaseInvoiceList() {
  const router = useRouter();
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [searchTerm, setSearchTerm] = useState(''); // Search by PI name
  const [documentNumber, setDocumentNumber] = useState(''); // Tambahkan document number filter
  const [supplierFilter, setSupplierFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Debounce for search
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Handle search with debounce
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    
    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Set new timeout
    const newTimeout = setTimeout(() => {
      setCurrentPage(1);
      fetchPurchaseInvoices();
    }, 500); // 500ms delay
    
    setSearchTimeout(newTimeout);
  };
  
  const [dateFilter, setDateFilter] = useState<{
    from_date: string;
    to_date: string;
  }>({
    from_date: formatDate(new Date(Date.now() - 86400000)), // Yesterday in DD/MM/YYYY
    to_date: formatDate(new Date()), // Today in DD/MM/YYYY
  });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [pageSize] = useState(20); // 20 records per page

  // Get company from localStorage/cookie
  useEffect(() => {
    let savedCompany = localStorage.getItem('selected_company');
    
    if (!savedCompany) {
      const cookies = document.cookie.split(';');
      const companyCookie = cookies.find(cookie => cookie.trim().startsWith('selected_company='));
      if (companyCookie) {
        savedCompany = companyCookie.split('=')[1];
        if (savedCompany) {
          localStorage.setItem('selected_company', savedCompany);
        }
      }
    }
    
    if (savedCompany) {
      setSelectedCompany(savedCompany);
    }
    setLoading(false);
  }, []);

  const fetchSuppliers = useCallback(async () => {
    let companyToUse = selectedCompany;
    
    if (!companyToUse) {
      const storedCompany = localStorage.getItem('selected_company');
      if (storedCompany) {
        companyToUse = storedCompany;
      }
    }
    
    if (!companyToUse) return;

    try {
      const response = await fetch(`/api/purchase/suppliers?company=${encodeURIComponent(companyToUse)}`);
      const data = await response.json();
      
      if (data.success) {
        setSuppliers(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    }
  }, [selectedCompany]);

  // Fetch purchase invoices
  const fetchPurchaseInvoices = useCallback(async () => {
    setError('');
    
    let companyToUse = selectedCompany;
    
    if (!companyToUse) {
      const storedCompany = localStorage.getItem('selected_company');
      if (storedCompany) {
        companyToUse = storedCompany;
      }
    }
    
    if (!companyToUse) {
      setError('Perusahaan tidak dipilih');
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const params = new URLSearchParams({
        company: companyToUse,
        limit_page_length: pageSize.toString(),
        start: ((currentPage - 1) * pageSize).toString(),
      });

      if (searchTerm) {
        params.append('search', searchTerm);
      }
      if (documentNumber) { // Tambahkan document number filter
        params.append('documentNumber', documentNumber);
      }
      // if (supplierFilter) {
      //   params.append('supplier', supplierFilter);
      // }
      if (statusFilter) {
        params.append('status', statusFilter);
      }
      if (dateFilter.from_date) {
        const parsedDate = parseDate(dateFilter.from_date);
        if (parsedDate) {
          params.append('from_date', parsedDate);
        }
      }
      if (dateFilter.to_date) {
        const parsedDate = parseDate(dateFilter.to_date);
        if (parsedDate) {
          params.append('to_date', parsedDate);
        }
      }

      const response = await fetch(`/api/purchase/invoices?${params}`, {
        credentials: 'include',
      });

      const data = await response.json();
      
      if (data.success) {
        setPurchaseInvoices(data.data || []);
        setTotalRecords(data.total_records || 0);
        setTotalPages(Math.ceil((data.total_records || 0) / pageSize));
      } else {
        setError(data.message || 'Gagal mengambil data Purchase Invoice');
      }
    } catch (err) {
      console.error('Error fetching purchase invoices:', err);
      setError('Terjadi kesalahan saat mengambil data');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, currentPage, pageSize, searchTerm, documentNumber, /*supplierFilter,*/ statusFilter, dateFilter.from_date, dateFilter.to_date]);

  useEffect(() => {
    if (selectedCompany) {
      fetchPurchaseInvoices();
      fetchSuppliers();
    }
  }, [fetchPurchaseInvoices, fetchSuppliers]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'Submitted':
        return 'bg-blue-100 text-blue-800';
      case 'Paid':
        return 'bg-green-100 text-green-800';
      case 'Unpaid':
        return 'bg-orange-100 text-orange-800';
      case 'Cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string, dueDate?: string) => {
    switch (status) {
      case 'Draft':
        return 'Draft';
      case 'Submitted':
        return 'Diajukan';
      case 'Paid':
        return 'Lunas';
      case 'Unpaid':
        return 'Belum Lunas';
      case 'Cancelled':
        return 'Dibatalkan';
      case 'Overdue':
        if (dueDate) {
          const today = new Date();
          const due = new Date(dueDate);
          const diffTime = Math.abs(today.getTime() - due.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return `Jatuh Tempo (${diffDays} hari)`;
        }
        return 'Jatuh Tempo';
      default:
        return status;
    }
  };

  const handleCardClick = (invoice: PurchaseInvoice) => {
    if (invoice.status === 'Draft') {
      router.push(`/purchase-invoice/piMain?id=${invoice.name}`);
    } else {
      router.push(`/purchase-invoice/piMain?name=${invoice.name}`);
    }
  };

  const handleSubmit = async (piName: string) => {
    setActionLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/purchase/invoices/${piName}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccessMessage(`Faktur Pembelian ${piName} berhasil diajukan!`);
        setShowSuccessDialog(true);
        
        // Refresh the list
        fetchPurchaseInvoices();
        
        // Hide dialog after 3 seconds
        setTimeout(() => {
          setShowSuccessDialog(false);
        }, 3000);
      } else {
        setError(data.message || 'Gagal mengajukan Faktur Pembelian');
      }
    } catch (err) {
      setError('Gagal mengajukan Faktur Pembelian');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Faktur Pembelian</h1>
              <p className="mt-1 text-sm text-gray-600">Daftar faktur pembelian</p>
            </div>
            <button
              onClick={() => router.push('/purchase-invoice/piMain')}
              className="w-full sm:w-auto bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center justify-center min-h-[44px]"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Buat Faktur Pembelian
            </button>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="bg-white shadow rounded-lg p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cari Pemasok
              </label>
              <input
                type="text"
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Cari nama pemasok..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                No. Dokumen
              </label>
              <input
                type="text"
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Cari nomor faktur..."
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Semua Status</option>
                <option value="Draft">Draft</option>
                <option value="Submitted">Diajukan</option>
                <option value="Unpaid">Belum Lunas</option>
                <option value="Overdue">Jatuh Tempo</option>
                <option value="Paid">Lunas</option>
                <option value="Cancelled">Dibatalkan</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dari Tanggal
              </label>
              <BrowserStyleDatePicker
                value={dateFilter.from_date}
                onChange={(value: string) => setDateFilter(prev => ({ ...prev, from_date: value }))}
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="DD/MM/YYYY"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sampai Tanggal
              </label>
              <BrowserStyleDatePicker
                value={dateFilter.to_date}
                onChange={(value: string) => setDateFilter(prev => ({ ...prev, to_date: value }))}
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="DD/MM/YYYY"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end space-x-2">
            <button
              onClick={() => {
                setSearchTerm('');
                setDocumentNumber('');
                setStatusFilter('');
                setDateFilter({
                  from_date: formatDate(new Date(Date.now() - 86400000)), // Reset to yesterday in DD/MM/YYYY
                  to_date: formatDate(new Date()), // Reset to today in DD/MM/YYYY
                });
                setCurrentPage(1);
              }}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
            >
              Hapus Filter
            </button>
            <button
              onClick={() => {
                setCurrentPage(1);
                fetchPurchaseInvoices();
              }}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              Terapkan Filter
            </button>
          </div>
        </div>
      </div>

      {/* Purchase Invoices List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {loading ? (
          <LoadingSpinner />
        ) : purchaseInvoices.length === 0 ? (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-900">
                Faktur Pembelian (0 faktur)
              </h3>
            </div>
            <div className="px-4 py-8 text-center">
              <p className="text-gray-500">Tidak ada faktur pembelian ditemukan</p>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-900">
                Faktur Pembelian ({purchaseInvoices.length} faktur)
              </h3>
            </div>
            <ul className="divide-y divide-gray-200">
              {purchaseInvoices.map((invoice) => (
                <li 
                  key={invoice.name}
                  onClick={() => handleCardClick(invoice)}
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-indigo-600 truncate">
                          {invoice.name}
                        </p>
                        <p className="mt-1 text-sm text-gray-900">Pemasok: {invoice.supplier_name || invoice.supplier}</p>
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}
                        >
                          {getStatusText(invoice.status, invoice.due_date)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500">
                          Tanggal: {formatDate(invoice.posting_date)}
                        </p>
                        {invoice.due_date && (
                          <p className="ml-6 flex items-center text-sm text-gray-500">
                            Jatuh Tempo: {formatDate(invoice.due_date)}
                          </p>
                        )}
                      </div>
                      <div className="mt-2 flex items-center justify-between sm:mt-0">
                        <span className="font-medium text-sm text-gray-500">
                          Total: {invoice.currency} {invoice.grand_total.toLocaleString('id-ID')}
                        </span>
                        {invoice.outstanding_amount !== undefined && (
                          <span className="ml-4 text-sm text-gray-500">
                            Sisa: {invoice.currency} {invoice.outstanding_amount.toLocaleString('id-ID')}
                          </span>
                        )}

                        {/* Print button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`/print/Purchase%20Invoice?name=${invoice.name}`, '_blank');
                          }}
                          className="ml-2 p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                          title="Cetak"
                        >
                          <Printer className="h-4 w-4" />
                        </button>

                         {/* Action buttons based on status */}
                        <div className="ml-2 flex space-x-2">
                          {/* Submit button for Draft invoices */}
                          {invoice.status === 'Draft' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSubmit(invoice.name);
                              }}
                              disabled={actionLoading}
                              className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center"
                            >
                              {actionLoading ? (
                                <>
                                  <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Pagination Controls */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalRecords={totalRecords}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>
      
      {/* Success Dialog */}
      {showSuccessDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-green-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">Sukses!</h3>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              {successMessage}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowSuccessDialog(false)}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}