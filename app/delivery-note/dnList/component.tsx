'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '../../components/LoadingSpinner';
import Pagination from '../../components/Pagination';
import { formatDate, parseDate } from '../../../utils/format';
import BrowserStyleDatePicker from '../../../components/BrowserStyleDatePicker';

interface DeliveryNote {
  name: string;
  customer: string;
  customer_name: string;
  posting_date: string;
  status: string;
  grand_total: number;
  sales_order?: string;
  custom_notes_dn?: string;
}

export default function DeliveryNoteList() {
  const router = useRouter();
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState({
    from_date: formatDate(new Date(Date.now() - 86400000)),
    to_date: formatDate(new Date()),
  });
  const [nameFilter, setNameFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

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

  const fetchDeliveryNotes = useCallback(async () => {
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
      if (customerFilter) params.append('search', customerFilter);
      if (nameFilter) params.append('documentNumber', nameFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (dateFilter.from_date) {
        const parsedDate = parseDate(dateFilter.from_date);
        if (parsedDate) params.append('from_date', parsedDate);
      }
      if (dateFilter.to_date) {
        const parsedDate = parseDate(dateFilter.to_date);
        if (parsedDate) params.append('to_date', parsedDate);
      }
      params.append('filters', JSON.stringify([["company", "=", companyToUse]]));

      const response = await fetch(`/api/delivery-note?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        const filteredData = data.data || [];
        setDeliveryNotes(filteredData);
        if (data.total_records !== undefined) {
          setTotalRecords(data.total_records);
          setTotalPages(Math.ceil(data.total_records / pageSize));
        } else {
          setTotalRecords(filteredData.length);
          setTotalPages(1);
        }
        setError('');
      } else {
        setError(data.message || 'Gagal memuat surat jalan');
      }
    } catch (err) {
      console.error('Error fetching delivery notes:', err);
      setError('Gagal memuat surat jalan');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, dateFilter, nameFilter, customerFilter, statusFilter, currentPage, pageSize]);

  useEffect(() => {
    fetchDeliveryNotes();
  }, [fetchDeliveryNotes]);

  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter, nameFilter, customerFilter, statusFilter]);

  // Submit Delivery Note
  const handleSubmitDeliveryNote = async (deliveryNoteName: string) => {
    try {
      const response = await fetch(`/api/delivery-note/${deliveryNoteName}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: deliveryNoteName }),
      });
      const result = await response.json();
      if (result.success) {
        setSuccessMessage(`✅ Surat Jalan ${deliveryNoteName} berhasil diajukan!\n\n📦 Status: Draft → Diajukan\n📉 Dampak Stok:\n• Stok telah berkurang dari gudang\n• Barang telah dikirim`);
        fetchDeliveryNotes();
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        setError(result.message || 'Gagal mengajukan Surat Jalan');
      }
    } catch (error) {
      console.error('Error submitting delivery note:', error);
      setError('Terjadi kesalahan saat mengajukan Surat Jalan');
    }
  };

  if (loading) {
    return <LoadingSpinner message="Memuat Surat Jalan..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Surat Jalan</h1>
          <button
            onClick={() => router.push('/delivery-note/dnMain')}
            className="w-full sm:w-auto bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 min-h-[44px]"
          >
            Buat Surat Jalan
          </button>
        </div>

        {/* Success Message Alert */}
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

        {/* Error Message Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Kesalahan</h3>
                <div className="mt-2 text-sm text-red-700">
                  <pre className="whitespace-pre-wrap font-sans">{error}</pre>
                </div>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={() => setError('')}
                  className="inline-flex bg-red-50 rounded-md p-1.5 text-red-500 hover:bg-red-100"
                >
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6 border-b border-gray-200">
            <p className="text-sm text-gray-500">Kelola surat jalan pengiriman barang</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cari Pelanggan</label>
              <input type="text" className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Cari nama pelanggan..." value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">No. Dokumen</label>
              <input type="text" className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Cari nomor dokumen..." value={nameFilter} onChange={(e) => setNameFilter(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">Semua Status</option>
                <option value="Draft">Draft</option>
                <option value="Submitted">Diajukan</option>
                <option value="Completed">Selesai</option>
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
                  setNameFilter('');
                  setCustomerFilter('');
                  setStatusFilter('');
                }}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
              >
                Hapus Filter
              </button>
            </div>
          </div>
        </div>

        {/* Delivery Notes List */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {deliveryNotes.map((deliveryNote) => (
              <li
                key={deliveryNote.name}
                onClick={() => {
                  if (deliveryNote.name) {
                    router.push(`/delivery-note/dnMain?name=${deliveryNote.name}`);
                  }
                }}
                className="cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-indigo-600 truncate">{deliveryNote.name}</p>
                      <p className="mt-1 text-sm text-gray-900">Pelanggan: {deliveryNote.customer_name}</p>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        deliveryNote.status === 'Submitted' ? 'bg-green-100 text-green-800'
                        : deliveryNote.status === 'Draft' ? 'bg-yellow-100 text-yellow-800'
                        : deliveryNote.status === 'Completed' ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                      }`}>
                        {deliveryNote.status}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      <p className="flex items-center text-sm text-gray-500">Tanggal: {deliveryNote.posting_date}</p>
                      {deliveryNote.sales_order && (
                        <p className="mt-2 sm:mt-0 sm:ml-6 flex items-center text-sm text-gray-500">SO: {deliveryNote.sales_order}</p>
                      )}
                    </div>
                    <div className="mt-2 flex items-center justify-between sm:mt-0">
                      <span className="font-medium text-sm text-gray-500">Total: Rp {deliveryNote.grand_total ? deliveryNote.grand_total.toLocaleString('id-ID') : '0'}</span>
                      {deliveryNote.status === 'Draft' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSubmitDeliveryNote(deliveryNote.name);
                          }}
                          className="ml-4 px-3 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors"
                        >
                          Ajukan
                        </button>
                      )}
                    </div>
                    {deliveryNote.custom_notes_dn && (
                      <p className="mt-1 text-xs text-gray-400 truncate">Catatan: {deliveryNote.custom_notes_dn}</p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {deliveryNotes.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">Tidak ada surat jalan ditemukan</p>
            </div>
          )}
          <Pagination currentPage={currentPage} totalPages={totalPages} totalRecords={totalRecords} pageSize={pageSize} onPageChange={setCurrentPage} />
        </div>
      </div>
    </div>
  );
}
