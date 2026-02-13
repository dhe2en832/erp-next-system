'use client';

import { useState, useEffect } from 'react';
import LoadingSpinner from '../../components/LoadingSpinner';
import Pagination from '../../components/Pagination';
import BrowserStyleDatePicker from '../../../components/BrowserStyleDatePicker';
import { formatDate, parseDate } from '../../../utils/format';

interface PaymentEntry {
  name: string;
  payment_type: string;
  party: string;
  party_name?: string;
  party_type: string;
  paid_amount: number;
  received_amount: number;
  status: string;
  posting_date: string;
  total_allocated_amount: number;
  custom_notes_payment?: string;
  references: Array<{
    reference_doctype: string;
    reference_name: string;
    allocated_amount: number;
  }>;
}

interface PaymentListProps {
  onEdit: (payment: PaymentEntry) => void;
  onCreate: () => void;
  selectedCompany: string;
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'Draft': return 'Draft';
    case 'Submitted': return 'Diajukan';
    case 'Cancelled': return 'Dibatalkan';
    default: return status;
  }
};

const getStatusClass = (status: string) => {
  switch (status) {
    case 'Submitted': return 'bg-green-100 text-green-800';
    case 'Draft': return 'bg-yellow-100 text-yellow-800';
    case 'Cancelled': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export default function PaymentList({ onEdit, onCreate, selectedCompany }: PaymentListProps) {
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [pageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Set default dates: yesterday to today in DD/MM/YYYY format
  const [dateFilter, setDateFilter] = useState({
    from_date: formatDate(new Date(Date.now() - 86400000)),
    to_date: formatDate(new Date()),
  });
  const [searchFilter, setSearchFilter] = useState('');
  const [documentNumberFilter, setDocumentNumberFilter] = useState('');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchPayments = async () => {
    setError('');

    if (!selectedCompany) {
      setError('Perusahaan belum dipilih. Silakan pilih perusahaan terlebih dahulu.');
      setLoading(false);
      return;
    }

    try {
      const params = new URLSearchParams();
      params.append('limit_page_length', pageSize.toString());
      params.append('start', ((currentPage - 1) * pageSize).toString());

      if (dateFilter.from_date) {
        const parsedDate = parseDate(dateFilter.from_date);
        if (parsedDate) params.append('from_date', parsedDate);
      }

      if (dateFilter.to_date) {
        const parsedDate = parseDate(dateFilter.to_date);
        if (parsedDate) params.append('to_date', parsedDate);
      }

      if (paymentTypeFilter) params.append('payment_type', paymentTypeFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (searchFilter.trim()) params.append('search', searchFilter.trim());
      if (documentNumberFilter.trim()) params.append('documentNumber', documentNumberFilter.trim());

      params.append('filters', JSON.stringify([["company", "=", selectedCompany]]));

      const response = await fetch(`/api/payment?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        if (data.total_records !== undefined) {
          setTotalRecords(data.total_records);
          setTotalPages(Math.ceil(data.total_records / pageSize));
        } else {
          setTotalRecords(data.data?.length || 0);
          setTotalPages(1);
        }
        setPayments(data.data || []);
        setError('');
      } else {
        setError(data.message || 'Gagal memuat data pembayaran');
      }
    } catch (err) {
      console.error('Fetch Payments Error:', err);
      setError('Gagal memuat data pembayaran');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCompany) {
      fetchPayments();
    }
  }, [selectedCompany, currentPage, pageSize, dateFilter, searchFilter, documentNumberFilter, paymentTypeFilter, statusFilter]);

  // Handle submit payment
  const handleSubmitPayment = async (paymentName: string) => {
    try {
      const response = await fetch(`/api/payment/${paymentName}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage(`Payment ${paymentName} berhasil di-submit!`);
        fetchPayments();
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        setError(data.message || 'Gagal submit pembayaran');
      }
    } catch (error) {
      console.error('Payment submit error:', error);
      setError('Terjadi kesalahan saat submit pembayaran');
    }
  };

  if (loading) {
    return <LoadingSpinner message="Memuat Data Pembayaran..." />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Manajemen Pembayaran</h1>
        <button
          onClick={onCreate}
          className="w-full sm:w-auto bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center justify-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Buat Pembayaran
        </button>
      </div>

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
              <button
                onClick={() => setSuccessMessage('')}
                className="inline-flex bg-green-50 rounded-md p-1.5 text-green-500 hover:bg-green-100"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cari Nama</label>
            <input
              type="text"
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Nama pelanggan/pemasok"
              value={searchFilter}
              onChange={(e) => {
                setSearchFilter(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">No. Dokumen</label>
            <input
              type="text"
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Nomor pembayaran"
              value={documentNumberFilter}
              onChange={(e) => {
                setDocumentNumberFilter(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipe</label>
            <select
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={paymentTypeFilter}
              onChange={(e) => {
                setPaymentTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">Semua</option>
              <option value="Receive">Penerimaan</option>
              <option value="Pay">Pembayaran</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">Semua Status</option>
              <option value="Draft">Draft</option>
              <option value="Submitted">Diajukan</option>
              <option value="Cancelled">Dibatalkan</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dari Tanggal</label>
            <BrowserStyleDatePicker
              value={dateFilter.from_date}
              onChange={(value: string) => {
                setDateFilter(prev => ({ ...prev, from_date: value }));
                setCurrentPage(1);
              }}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="DD/MM/YYYY"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sampai Tanggal</label>
            <BrowserStyleDatePicker
              value={dateFilter.to_date}
              onChange={(value: string) => {
                setDateFilter(prev => ({ ...prev, to_date: value }));
                setCurrentPage(1);
              }}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="DD/MM/YYYY"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-2 flex items-end">
            <button
              onClick={() => {
                setDateFilter({
                  from_date: formatDate(new Date(Date.now() - 86400000)),
                  to_date: formatDate(new Date())
                });
                setSearchFilter('');
                setDocumentNumberFilter('');
                setPaymentTypeFilter('');
                setStatusFilter('');
                setCurrentPage(1);
              }}
              className="w-full sm:w-auto bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
            >
              Hapus Filter
            </button>
          </div>
        </div>
      </div>

      {/* Payments List */}
      <div className="bg-white shadow overflow-hidden rounded-lg">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No. Dokumen</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipe</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pihak</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Jumlah</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="hidden xl:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Catatan</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payments.map((payment) => (
                <tr
                  key={payment.name}
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => onEdit(payment)}
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm font-medium text-indigo-600">{payment.name}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {payment.payment_type === 'Receive' ? 'Penerimaan' : 'Pembayaran'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-900">{payment.party_name || payment.party}</div>
                    <div className="text-xs text-gray-500">{payment.party_type === 'Customer' ? 'Pelanggan' : 'Pemasok'}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {payment.posting_date}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    {payment.payment_type === 'Receive' ? (
                      <span className="text-sm font-medium text-green-600">
                        Rp {payment.received_amount ? payment.received_amount.toLocaleString('id-ID') : '0'}
                      </span>
                    ) : (
                      <span className="text-sm font-medium text-red-600">
                        Rp {payment.paid_amount ? payment.paid_amount.toLocaleString('id-ID') : '0'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusClass(payment.status)}`}>
                      {getStatusLabel(payment.status)}
                    </span>
                  </td>
                  <td className="hidden xl:table-cell px-4 py-3">
                    <span className="text-sm text-gray-500 truncate block max-w-[200px]" title={payment.custom_notes_payment || ''}>
                      {payment.custom_notes_payment ? (payment.custom_notes_payment.length > 50 ? payment.custom_notes_payment.substring(0, 50) + '...' : payment.custom_notes_payment) : '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    {payment.status === 'Draft' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSubmitPayment(payment.name);
                        }}
                        className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors"
                      >
                        Ajukan
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden">
          <ul className="divide-y divide-gray-200">
            {payments.map((payment) => (
              <li
                key={payment.name}
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => onEdit(payment)}
              >
                <div className="px-4 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-indigo-600 truncate">
                        {payment.name}
                      </p>
                      <p className="mt-1 text-sm text-gray-900 truncate">
                        {payment.party_type === 'Customer' ? 'Pelanggan' : 'Pemasok'}: {payment.party_name || payment.party}
                      </p>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusClass(payment.status)}`}>
                        {getStatusLabel(payment.status)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <p className="text-sm text-gray-500">
                        Tipe: {payment.payment_type === 'Receive' ? 'Penerimaan' : 'Pembayaran'}
                      </p>
                      <p className="text-sm text-gray-500">
                        Tanggal: {payment.posting_date}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {payment.payment_type === 'Receive' ? (
                        <span className="text-sm font-medium text-green-600">
                          Rp {payment.received_amount ? payment.received_amount.toLocaleString('id-ID') : '0'}
                        </span>
                      ) : (
                        <span className="text-sm font-medium text-red-600">
                          Rp {payment.paid_amount ? payment.paid_amount.toLocaleString('id-ID') : '0'}
                        </span>
                      )}
                      {payment.status === 'Draft' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSubmitPayment(payment.name);
                          }}
                          className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors"
                        >
                          Ajukan
                        </button>
                      )}
                    </div>
                  </div>
                  {payment.custom_notes_payment && (
                    <p className="mt-1 text-xs text-gray-400 truncate">
                      Catatan: {payment.custom_notes_payment}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {payments.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Tidak ada data pembayaran</p>
          </div>
        )}

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalRecords={totalRecords}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}
