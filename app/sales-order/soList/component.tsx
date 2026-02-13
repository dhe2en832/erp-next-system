'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '../../components/LoadingSpinner';
import Pagination from '../../components/Pagination';
import { formatDate, parseDate } from '../../../utils/format';
import BrowserStyleDatePicker from '../../../components/BrowserStyleDatePicker';

interface SalesOrder {
  name: string;
  customer: string;
  customer_name: string;
  transaction_date: string;
  grand_total: number;
  status: string;
  delivery_date: string;
  creation?: string;
  custom_notes_so?: string;
}

export default function SalesOrderList() {
  const router = useRouter();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState({
    from_date: formatDate(new Date(Date.now() - 86400000)),
    to_date: formatDate(new Date()),
  });
  const [nameFilter, setNameFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [documentNumberFilter, setDocumentNumberFilter] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [error, setError] = useState('');

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
        if (savedCompany) {
          localStorage.setItem('selected_company', savedCompany);
        }
      }
    }
    
    if (savedCompany) {
      setSelectedCompany(savedCompany);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [dateFilter, nameFilter, statusFilter, documentNumberFilter, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter, nameFilter, statusFilter, documentNumberFilter]);

  const fetchOrders = async () => {
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
          if (cookieValue) {
            companyToUse = cookieValue;
          }
        }
      }
    }
    
    if (!companyToUse) {
      setError('Perusahaan belum dipilih. Silakan pilih perusahaan terlebih dahulu.');
      setLoading(false);
      return;
    }
    
    if (!selectedCompany && companyToUse) {
      setSelectedCompany(companyToUse);
    }
    
    try {
      const params = new URLSearchParams();
      
      params.append('limit_page_length', pageSize.toString());
      params.append('start', ((currentPage - 1) * pageSize).toString());
      
      if (companyToUse) {
        params.append('company', companyToUse);
      }
      
      if (nameFilter) {
        params.append('search', nameFilter);
      }
      
      if (documentNumberFilter) {
        params.append('documentNumber', documentNumberFilter);
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
      
      const response = await fetch("/api/sales-order?" + params.toString());
      const result = await response.json();

      if (result.success) {
        const ordersData = result.data || [];
        
        if (result.total_records !== undefined) {
          setTotalRecords(result.total_records);
          const calculatedTotalPages = Math.ceil(result.total_records / pageSize);
          setTotalPages(calculatedTotalPages);
        } else {
          setTotalRecords(ordersData.length);
          setTotalPages(1);
        }
        
        ordersData.sort((a: SalesOrder, b: SalesOrder) => {
          const dateA = new Date(a.creation || a.transaction_date || '1970-01-01');
          const dateB = new Date(b.creation || b.transaction_date || '1970-01-01');
          return dateB.getTime() - dateA.getTime();
        });
        
        if (ordersData.length === 0) {
          setError(`Tidak ada pesanan penjualan untuk perusahaan: ${companyToUse}`);
        } else {
          setError('');
        }
        setOrders(ordersData);
      } else {
        setError(result.message || 'Gagal memuat pesanan penjualan');
      }
    } catch {
      setError('Gagal memuat pesanan penjualan');
    } finally {
      setLoading(false);
    }
  };

  // Submit Sales Order untuk mengubah status dari Draft ke Submitted
  const handleSubmitSalesOrder = async (orderName: string) => {
    try {
      console.log('Submitting Sales Order:', orderName);
      
      const response = await fetch(`/api/sales-order/${orderName}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        alert(`✅ Sales Order ${orderName} submitted successfully!\n\n📋 Status: Draft → Submitted\n\n🔔 Next Steps:\n• Create Delivery Note (untuk pengiriman & stok)\n• Create Sales Invoice (untuk jurnal akuntansi)`);
        fetchOrders();
      } else {
        alert(`❌ Failed to submit Sales Order: ${result.message}`);
      }
    } catch (error) {
      console.error('Error submitting sales order:', error);
      alert('❌ An error occurred while submitting Sales Order');
    }
  };

  // Create Delivery Note dari Sales Order
  const handleCreateDeliveryNote = async (orderName: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/delivery-note/from-sales-order/${orderName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        const deliveryNoteName = result.data?.name || 'Unknown';
        alert(`✅ Delivery Note ${deliveryNoteName} created successfully!\n\n📦 Status: Draft\n\n📉 Stock Impact:\n• Stock akan berkurang saat Delivery Note disubmit\n• Barang akan keluar dari gudang\n\n🔔 Next Step:\n• Submit Delivery Note untuk mengurangi stok\n• Create Sales Invoice untuk jurnal akuntansi`);
        fetchOrders();
      } else {
        alert(`❌ Failed to create Delivery Note: ${result.message}`);
      }
    } catch (error) {
      console.error('Error creating delivery note:', error);
      alert('❌ An error occurred while creating Delivery Note');
    }
  };

  // Create Sales Invoice dari Sales Order
  const handleCreateSalesInvoice = async (orderName: string) => {
    try {
      const response = await fetch(`/api/sales-invoice/from-sales-order/${orderName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        const invoiceName = result.data?.name || 'Unknown';
        alert(`✅ Sales Invoice ${invoiceName} created successfully!\n\n📊 Status: Draft\n\n💰 Jurnal Akuntansi:\n• Debit: Accounts Receivable (Piutang Usaha)\n• Credit: Sales Revenue (Pendapatan Penjualan)\n• Credit: Tax Payable (PPN Keluaran) - jika ada\n\n🔔 Next Step:\n• Submit Sales Invoice untuk mengaktifkan jurnal\n• Create Payment Entry untuk pelunasan`);
        fetchOrders();
      } else {
        alert(`❌ Failed to create Sales Invoice: ${result.message}`);
      }
    } catch (error) {
      console.error('Error creating sales invoice:', error);
      alert('❌ An error occurred while creating Sales Invoice');
    }
  };

  if (loading) {
    return <LoadingSpinner message="Memuat Pesanan Penjualan..." />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Pesanan Penjualan</h1>
        <button
          onClick={() => router.push('/sales-order/soMain')}
          className="w-full sm:w-auto bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 min-h-[44px]"
        >
          Buat Pesanan
        </button>
      </div>

      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cari Nama
            </label>
            <input
              type="text"
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Cari nama pelanggan..."
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              No. Dokumen
            </label>
            <input
              type="text"
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Cari nomor pesanan..."
              value={documentNumberFilter}
              onChange={(e) => setDocumentNumberFilter(e.target.value)}
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
              <option value="To Deliver">Belum Dikirim</option>
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
              onChange={(value: string) => setDateFilter({ ...dateFilter, from_date: value })}
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
              onChange={(value: string) => setDateFilter({ ...dateFilter, to_date: value })}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="DD/MM/YYYY"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setDateFilter({ 
                from_date: formatDate(new Date(Date.now() - 86400000)),
                to_date: formatDate(new Date()),
              });
                setNameFilter('');
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

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {orders.map((order) => (
            <li 
              key={order.name}
              onClick={() => {
                if (order.name) {
                  router.push(`/sales-order/soMain?name=${order.name}`);
                }
              }}
              className="cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-indigo-600 truncate">
                      {order.name}
                    </p>
                    <p className="mt-1 text-sm text-gray-900">Pelanggan: {order.customer_name}</p>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        order.status === 'Submitted'
                          ? 'bg-green-100 text-green-800'
                          : order.status === 'Draft'
                          ? 'bg-yellow-100 text-yellow-800'
                          : order.status === 'Completed'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>
                <div className="mt-2 sm:flex sm:justify-between">
                  <div className="sm:flex">
                    <p className="flex items-center text-sm text-gray-500">
                      Tgl Transaksi: {order.transaction_date}
                    </p>
                    <p className="mt-2 sm:mt-0 sm:ml-6 flex items-center text-sm text-gray-500">
                      Tgl Pengiriman: {order.delivery_date}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center justify-between sm:mt-0">
                    <span className="font-medium text-sm text-gray-500">Total: Rp {order.grand_total.toLocaleString('id-ID')}</span>
                    
                    {/* Submit button for Draft orders */}
                    {order.status === 'Draft' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSubmitSalesOrder(order.name);
                        }}
                        className="ml-4 px-3 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors"
                      >
                        Ajukan
                      </button>
                    )}
                    
                    {/* Create Invoice button for Submitted orders */}
                    {order.status === 'Submitted' && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCreateDeliveryNote(order.name);
                          }}
                          className="ml-4 px-3 py-1 bg-orange-600 text-white text-xs font-medium rounded hover:bg-orange-700 transition-colors"
                        >
                          Buat Surat Jalan
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCreateSalesInvoice(order.name);
                          }}
                          className="ml-2 px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                        >
                          Buat Faktur
                        </button>
                      </>
                    )}
                  </div>
                {order.custom_notes_so && (
                  <p className="mt-1 text-xs text-gray-400 truncate">Catatan: {order.custom_notes_so}</p>
                )}
                </div>
              </div>
            </li>
          ))}
        </ul>
        {orders.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Tidak ada pesanan penjualan</p>
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
    </div>
  );
}
