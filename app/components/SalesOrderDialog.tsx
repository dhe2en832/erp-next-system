'use client';

import { useState, useEffect, useCallback } from 'react';

interface SalesOrder {
  name: string;
  customer: string;
  customer_name: string;
  transaction_date: string;
  grand_total: number;
  status: string;
  docstatus: number;
  delivery_date: string;
  per_delivered?: number;
  items?: Array<{
    item_code: string;
    item_name: string;
    qty: number;
    rate: number;
    amount: number;
  }>;
}

interface SalesOrderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (salesOrder: SalesOrder) => void;
  selectedCompany: string;
  customerFilter?: string;
}

export default function SalesOrderDialog({ isOpen, onClose, onSelect, selectedCompany, customerFilter }: SalesOrderDialogProps) {
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [error, setError] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterSalesPerson, setFilterSalesPerson] = useState('');

  const fetchSalesOrders = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({ company: selectedCompany });
      if (searchTerm) params.set('search', searchTerm);
      if (filterCustomer || customerFilter) params.set('customer', filterCustomer || customerFilter || '');
      if (filterSalesPerson) params.set('sales_person', filterSalesPerson);

      const response = await fetch(`/api/sales/orders/available-for-dn?${params}`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSalesOrders(data.data || []);
      } else {
        setError(data.message || 'Gagal memuat pesanan penjualan');
      }
    } catch {
      setError('Gagal memuat pesanan penjualan');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, searchTerm, customerFilter, filterCustomer, filterSalesPerson]);

  useEffect(() => {
    if (isOpen && selectedCompany) {
      setSalesOrders([]);
      setError('');
      fetchSalesOrders();
    }
  }, [isOpen, selectedCompany, fetchSalesOrders]);

  useEffect(() => {
    if (!isOpen) {
      setSalesOrders([]);
      setError('');
      setSelectedOrder(null);
      setSearchTerm('');
      setFilterCustomer('');
      setFilterSalesPerson('');
    }
  }, [isOpen]);

  const handleSelect = () => {
    if (selectedOrder) {
      onSelect(selectedOrder);
      onClose();
      setSelectedOrder(null);
      setSearchTerm('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Pilih Pesanan Penjualan</h3>
          <p className="mt-1 text-sm text-gray-500">Hanya menampilkan SO yang sudah submitted, masih ada qty tersisa, dan belum memiliki Surat Jalan</p>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 border-b border-gray-200 space-y-3">
          <input
            type="text"
            placeholder="Cari berdasarkan nama SO atau pelanggan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Filter Pelanggan..."
              value={filterCustomer}
              onChange={(e) => setFilterCustomer(e.target.value)}
              className="border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
            <input
              type="text"
              placeholder="Filter Tenaga Penjual..."
              value={filterSalesPerson}
              onChange={(e) => setFilterSalesPerson(e.target.value)}
              className="border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>
          <button
            onClick={fetchSalesOrders}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Terapkan Filter
          </button>
        </div>

        {/* Sales Orders List */}
        <div className="flex-1 overflow-y-auto" style={{ maxHeight: '500px' }}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <span className="ml-3 text-sm text-gray-500">Memuat pesanan penjualan...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-500">{error}</p>
              <button
                onClick={fetchSalesOrders}
                className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm"
              >
                Coba Lagi
              </button>
            </div>
          ) : salesOrders.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="mt-2 text-sm font-medium text-gray-900">Tidak Ada Pesanan Tersedia</p>
              <p className="mt-1 text-sm text-gray-500">
                Semua SO sudah memiliki Surat Jalan, atau tidak ada SO submitted yang memenuhi syarat.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {salesOrders.map((order) => (
                <div
                  key={order.name}
                  onClick={() => setSelectedOrder(order)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedOrder?.name === order.name ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-indigo-600">{order.name}</p>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          order.status === 'To Deliver and Bill' ? 'bg-green-100 text-green-800'
                          : order.status === 'To Deliver' ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-900">Pelanggan: {order.customer_name}</p>
                      <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                        <span>Tanggal: {order.transaction_date}</span>
                        <span>Tgl Kirim: {order.delivery_date}</span>
                        {order.per_delivered !== undefined && order.per_delivered > 0 && (
                          <span className="text-orange-600">Terkirim: {order.per_delivered}%</span>
                        )}
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      <p className="text-sm font-medium text-gray-900">
                        Rp {order.grand_total ? order.grand_total.toLocaleString('id-ID') : '0'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              {selectedOrder ? (
                <span>Dipilih: <strong>{selectedOrder.name}</strong> - {selectedOrder.customer_name}</span>
              ) : (
                <span>{salesOrders.length} pesanan tersedia</span>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
              >
                Batal
              </button>
              <button
                onClick={handleSelect}
                disabled={!selectedOrder}
                className={`px-4 py-2 rounded-md ${
                  selectedOrder
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Buat Surat Jalan
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
