'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '../../components/LoadingSpinner';
import Pagination from '../../components/Pagination';
import { formatDate, parseDate } from '../../../utils/format';
import BrowserStyleDatePicker from '../../../components/BrowserStyleDatePicker';
import { Printer } from 'lucide-react';
import ErrorDialog from '../../../components/ErrorDialog';

interface PurchaseReceipt {
  name: string;
  supplier: string;
  supplier_name?: string;
  posting_date: string;
  status: string;
  grand_total: number;
  currency: string;
}

interface Supplier {
  name: string;
  supplier_name: string;
}

interface PurchaseOrder {
  name: string;
  supplier_name: string;
  transaction_date: string;
  status: string;
}

export default function PurchaseReceiptList() {
  const router = useRouter();
  const [purchaseReceipts, setPurchaseReceipts] = useState<PurchaseReceipt[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [error, setError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState({
    from_date: formatDate(new Date(Date.now() - 86400000)), // Yesterday in DD/MM/YYYY
    to_date: formatDate(new Date()), // Today in DD/MM/YYYY
  });
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [pageSize] = useState(20); // 20 records per page

  useEffect(() => {
    // Get company from localStorage
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

  const fetchPurchaseOrders = useCallback(async () => {
    let companyToUse = selectedCompany;
    
    if (!companyToUse) {
      const storedCompany = localStorage.getItem('selected_company');
      if (storedCompany) {
        companyToUse = storedCompany;
      }
    }
    
    if (!companyToUse) return;

    try {
      // Only fetch submitted POs that can be received
      const response = await fetch(`/api/purchase/orders?company=${encodeURIComponent(companyToUse)}&status=Submitted&limit_page_length=100`);
      const data = await response.json();
      
      if (data.success) {
        setPurchaseOrders(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching purchase orders:', err);
    }
  }, [selectedCompany]);

  const fetchPurchaseReceipts = useCallback(async () => {
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
      if (documentNumber) {
        params.append('documentNumber', documentNumber);
      }
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

      const response = await fetch(`/api/purchase/receipts?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setPurchaseReceipts(data.data || []);
        setTotalRecords(data.total_records || 0);
        setTotalPages(Math.ceil((data.total_records || 0) / pageSize));
      } else {
        setError(data.message || 'Gagal mengambil data penerimaan barang');
      }
    } catch (err) {
      console.error('Error fetching purchase receipts:', err);
      setError('Terjadi kesalahan saat mengambil data');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, currentPage, pageSize, searchTerm, documentNumber, statusFilter, dateFilter]);

  useEffect(() => {
    if (selectedCompany) {
      fetchSuppliers();
      fetchPurchaseOrders();
    }
  }, [selectedCompany, fetchSuppliers, fetchPurchaseOrders]);

  useEffect(() => {
    if (selectedCompany) {
      fetchPurchaseReceipts();
    }
  }, [fetchPurchaseReceipts]);

  const handleSubmit = async (prName: string) => {
    setActionLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/purchase/receipts/${prName}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccessMessage(`Penerimaan Barang ${prName} berhasil diajukan!`);
        setShowSuccessDialog(true);
        
        // Redirect after 2 seconds
        setTimeout(() => {
          router.push(`/purchase-receipts/prMain?name=${prName}`);
        }, 2000);
      } else {
        setSubmitError(data.message || 'Gagal mengajukan Penerimaan Barang');
      }
    } catch (err) {
      setSubmitError('Gagal mengajukan Penerimaan Barang');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCardClick = (receipt: PurchaseReceipt) => {
    if (receipt.status === 'Draft') {
      router.push(`/purchase-receipts/prMain?id=${receipt.name}`);
    } else {
      router.push(`/purchase-receipts/prMain?name=${receipt.name}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'Submitted':
        return 'bg-blue-100 text-blue-800';
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'Cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'Draft':
        return 'Draft';
      case 'Submitted':
        return 'Diajukan';
      case 'Completed':
        return 'Selesai';
      case 'Cancelled':
        return 'Dibatalkan';
      case 'To Bill':
        return 'Belum Ditagih';
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ErrorDialog isOpen={!!submitError} title="Gagal Mengajukan" message={submitError} onClose={() => setSubmitError('')} />
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Penerimaan Barang</h1>
              <p className="mt-1 text-sm text-gray-600">Penerimaan barang dari pesanan pembelian</p>
            </div>
            <button
              onClick={() => router.push('/purchase-receipts/prMain')}
              className="w-full sm:w-auto bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center justify-center min-h-[44px]"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Buat Penerimaan Barang
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
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                No. Dokumen
              </label>
              <input
                type="text"
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Cari nomor penerimaan..."
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
                <option value="To Bill">Belum Ditagih</option>
                <option value="Completed">Selesai</option>
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
                  from_date: formatDate(new Date(Date.now() - 86400000)), // Reset to yesterday
                  to_date: formatDate(new Date()), // Reset to today
                });
              }}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
            >
              Hapus Filter
            </button>
            <button
              onClick={() => {
                setCurrentPage(1);
                fetchPurchaseReceipts();
              }}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              Terapkan Filter
            </button>
          </div>
        </div>
      </div>

      {/* Purchase Receipts List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {loading ? (
          <LoadingSpinner />
        ) : purchaseReceipts.length === 0 ? (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-900">
                Penerimaan Barang (0 penerimaan)
              </h3>
            </div>
            <div className="px-4 py-8 text-center">
              <p className="text-gray-500">Tidak ada penerimaan barang ditemukan</p>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-900">
                Penerimaan Barang ({purchaseReceipts.length} penerimaan)
              </h3>
            </div>
            <ul className="divide-y divide-gray-200">
              {purchaseReceipts.map((receipt, index) => {
                return (
                <li 
                  key={receipt.name}
                  onClick={() => {
                    if (receipt.name) {
                      // Route based on status
                      if (receipt.status === 'Draft') {
                        router.push(`/purchase-receipts/prMain?id=${receipt.name}`);
                      } else {
                        router.push(`/purchase-receipts/prMain?name=${receipt.name}`);
                      }
                    }
                  }}
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-indigo-600 truncate">
                          {receipt.name}
                        </p>
                        <p className="mt-1 text-sm text-gray-900">Pemasok: {receipt.supplier_name || receipt.supplier}</p>
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(receipt.status)}`}
                        >
                          {getStatusText(receipt.status)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500">
                          Tanggal: {formatDate(receipt.posting_date)}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center justify-between sm:mt-0">
                        <span className="font-medium text-sm text-gray-500">
                          Total: {receipt.currency} {receipt.grand_total.toLocaleString('id-ID')}
                        </span>
                        
                        {/* Print button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`/print/Purchase%20Receipt?name=${receipt.name}`, '_blank');
                          }}
                          className="ml-2 p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                          title="Cetak"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        
                        {/* Action buttons based on status */}
                        <div className="ml-2 flex space-x-2">
                          {/* Submit button for Draft receipts */}
                          {receipt.status === 'Draft' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSubmit(receipt.name);
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
                );
              })}
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
