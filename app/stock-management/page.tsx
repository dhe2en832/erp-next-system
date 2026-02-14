'use client';

import { useState, useEffect, useCallback } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import Pagination from '../components/Pagination';
import { parseDate } from '../../utils/format';

interface StockLedger {
  name: string;
  item_code: string;
  item_name: string;
  warehouse: string;
  posting_date: string;
  posting_time: string;
  voucher_type: string;
  voucher_no: string;
  actual_qty: number;
  qty_after_transaction: number;
  valuation_rate: number;
  stock_value: number;
  company: string;
}

interface Warehouse {
  name: string;
  warehouse_name: string;
}

export default function StockManagementPage() {
  const [stockLedger, setStockLedger] = useState<StockLedger[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [voucherTypeFilter, setVoucherTypeFilter] = useState('');
  const [dateFilter, setDateFilter] = useState({
    from_date: '',
    to_date: '',
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

  const fetchWarehouses = useCallback(async () => {
    let companyToUse = selectedCompany;
    
    if (!companyToUse) {
      const storedCompany = localStorage.getItem('selected_company');
      if (storedCompany) {
        companyToUse = storedCompany;
      }
    }
    
    if (!companyToUse) return;

    try {
      const response = await fetch(`/api/inventory/warehouses?company=${encodeURIComponent(companyToUse)}`);
      const data = await response.json();
      
      if (data.success) {
        setWarehouses(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching warehouses:', err);
    }
  }, [selectedCompany]);

  const fetchStockLedger = useCallback(async () => {
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
      const params = new URLSearchParams({
        company: companyToUse,
        limit_page_length: pageSize.toString(),
        start: ((currentPage - 1) * pageSize).toString()
      });
      
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      
      if (warehouseFilter) {
        params.append('warehouse', warehouseFilter);
      }
      
      if (voucherTypeFilter) {
        params.append('voucher_type', voucherTypeFilter);
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

      const response = await fetch(`/api/inventory/stock-entry/ledger?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setStockLedger(data.data || []);
        
        if (data.total_records !== undefined) {
          setTotalRecords(data.total_records);
          const calculatedTotalPages = Math.ceil(data.total_records / pageSize);
          setTotalPages(calculatedTotalPages);
        } else {
          setTotalRecords(data.data?.length || 0);
          setTotalPages(1);
        }
        
        setError('');
      } else {
        setError(data.message || 'Gagal memuat buku besar stok');
      }
    } catch (err: unknown) {
      setError('Gagal memuat buku besar stok');
      console.error('Error fetching stock ledger:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, currentPage, pageSize, searchTerm, warehouseFilter, voucherTypeFilter, dateFilter.from_date, dateFilter.to_date]);

  useEffect(() => {
    fetchWarehouses();
  }, [selectedCompany, fetchWarehouses]);

  useEffect(() => {
    fetchStockLedger();
  }, [fetchStockLedger]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, warehouseFilter, voucherTypeFilter, dateFilter]);

  const getVoucherTypeColor = (voucherType: string) => {
    switch (voucherType) {
      case 'Stock Entry': return 'bg-blue-100 text-blue-800';
      case 'Purchase Receipt': return 'bg-green-100 text-green-800';
      case 'Delivery Note': return 'bg-orange-100 text-orange-800';
      case 'Sales Invoice': return 'bg-purple-100 text-purple-800';
      case 'Purchase Invoice': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getQuantityColor = (qty: number) => {
    if (qty > 0) return 'text-green-600';
    if (qty < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  if (loading) {
    return <LoadingSpinner message="Memuat Manajemen Stok..." />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Manajemen Stok</h1>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button className="w-full sm:w-auto bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 min-h-[44px]">
            Entri Stok
          </button>
          <button className="w-full sm:w-auto bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 min-h-[44px]">
            Rekonsiliasi Stok
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cari Barang
            </label>
            <input
              type="text"
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Cari berdasarkan kode barang..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gudang
            </label>
            <select
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
            >
              <option value="">Semua Gudang</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.name} value={warehouse.name}>
                  {warehouse.warehouse_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipe Voucher
            </label>
            <select
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={voucherTypeFilter}
              onChange={(e) => setVoucherTypeFilter(e.target.value)}
            >
              <option value="">Semua Tipe</option>
              <option value="Stock Entry">Stock Entry</option>
              <option value="Purchase Receipt">Purchase Receipt</option>
              <option value="Delivery Note">Delivery Note</option>
              <option value="Sales Invoice">Sales Invoice</option>
              <option value="Purchase Invoice">Purchase Invoice</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dari Tanggal
            </label>
            <input
              type="date"
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={dateFilter.from_date}
              onChange={(e) => setDateFilter({ ...dateFilter, from_date: e.target.value })}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sampai Tanggal
            </label>
            <input
              type="date"
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={dateFilter.to_date}
              onChange={(e) => setDateFilter({ ...dateFilter, to_date: e.target.value })}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setWarehouseFilter('');
                setVoucherTypeFilter('');
                setDateFilter({ from_date: '', to_date: '' });
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
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-900">
            Buku Besar Stok ({stockLedger.length} entri)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tanggal & Waktu
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Barang
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gudang
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipe Voucher
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  No. Voucher
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Perubahan Jml
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Saldo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nilai
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stockLedger.map((entry) => (
                <tr key={entry.name} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>{entry.posting_date}</div>
                    <div className="text-gray-500">{entry.posting_time}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{entry.item_code}</div>
                    <div className="text-sm text-gray-500">Kode: {entry.item_code}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {entry.warehouse}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getVoucherTypeColor(entry.voucher_type)}`}>
                      {entry.voucher_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600">
                    {entry.voucher_no}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getQuantityColor(entry.actual_qty)}`}>
                    {entry.actual_qty > 0 ? '+' : ''}{entry.actual_qty}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {entry.qty_after_transaction}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>{entry.valuation_rate.toFixed(2)}</div>
                    <div className="font-medium">{entry.stock_value.toFixed(2)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {stockLedger.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Tidak ada entri buku besar stok ditemukan</p>
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
