'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '../../components/LoadingSpinner';
import Pagination from '../../components/Pagination';

interface Customer {
  name: string;
  customer_name: string;
  customer_group?: string;
  territory?: string;
  mobile_no?: string;
  email_id?: string;
}

const PAGE_SIZE = 20;

export default function CustomerList() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.set('search', searchTerm.trim());

      const response = await fetch(`/api/sales/customers?${params}`, { credentials: 'include' });
      const data = await response.json();

      if (data.success) {
        setCustomers(data.data || []);
      } else {
        setError(data.message || 'Gagal memuat data pelanggan');
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError('Gagal memuat data pelanggan');
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Frontend filtering
  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      const matchSearch = !searchTerm || 
        (customer.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (customer.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch;
    });
  }, [customers, searchTerm]);

  // Pagination
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredCustomers.slice(start, start + PAGE_SIZE);
  }, [filteredCustomers, currentPage]);

  // Memoized handlers
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setCurrentPage(1);
  }, []);

  if (loading) {
    return <LoadingSpinner message="Memuat data pelanggan..." />;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pelanggan</h1>
          <p className="text-sm text-gray-500">Kelola data master pelanggan</p>
        </div>
        <button
          onClick={() => router.push('/customers/custMain')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          + Tambah Pelanggan
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Cari Pelanggan</label>
            <input 
              type="text" 
              placeholder="Nama atau Kode Pelanggan..." 
              value={searchTerm}
              onChange={handleSearchChange}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-end space-x-2 lg:col-span-2">
            <button 
              onClick={handleClearFilters}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors text-sm"
            >
              Hapus Filter
            </button>
            <button 
              onClick={fetchCustomers}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors text-sm"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-600 font-medium">Total Pelanggan</p>
          <p className="text-2xl font-bold text-blue-900">{filteredCustomers.length}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-600 font-medium">Halaman</p>
          <p className="text-xl font-bold text-green-900">{currentPage} / {Math.ceil(filteredCustomers.length / PAGE_SIZE) || 1}</p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Pelanggan</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedCustomers.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                  {searchTerm ? 'Tidak ada pelanggan yang cocok dengan pencarian' : 'Belum ada data pelanggan'}
                </td>
              </tr>
            ) : (
              paginatedCustomers.map((customer) => (
                <tr key={customer.name} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/customers/custMain?name=${encodeURIComponent(customer.name)}`)}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">{customer.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{customer.customer_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={(e) => { e.stopPropagation(); router.push(`/customers/custMain?name=${encodeURIComponent(customer.name)}`); }}
                      className="text-indigo-600 hover:text-indigo-900 font-medium"
                    >
                      Lihat
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        
        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil(filteredCustomers.length / PAGE_SIZE)}
          totalRecords={filteredCustomers.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}
