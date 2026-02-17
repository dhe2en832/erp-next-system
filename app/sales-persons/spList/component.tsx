'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '../../components/LoadingSpinner';
import Pagination from '../../components/Pagination';

interface SalesPerson {
  name: string;
  full_name: string;
  email?: string;
  category?: string;
}

const PAGE_SIZE = 20;

export default function SalesPersonList() {
  const router = useRouter();
  const [salesPersons, setSalesPersons] = useState<SalesPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchSalesPersons = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.set('search', searchTerm.trim());

      const response = await fetch(`/api/sales/sales-persons?${params}`, { credentials: 'include' });
      const data = await response.json();

      if (data.success) {
        setSalesPersons(data.data || []);
      } else {
        setError(data.message || 'Gagal memuat data sales person');
      }
    } catch (err) {
      console.error('Error fetching sales persons:', err);
      setError('Gagal memuat data sales person');
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    fetchSalesPersons();
  }, [fetchSalesPersons]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Frontend filtering
  const filteredSalesPersons = useMemo(() => {
    return salesPersons.filter(sp => {
      const matchSearch = !searchTerm || 
        (sp.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sp.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch;
    });
  }, [salesPersons, searchTerm]);

  // Pagination
  const paginatedSalesPersons = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredSalesPersons.slice(start, start + PAGE_SIZE);
  }, [filteredSalesPersons, currentPage]);

  // Memoized handlers
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setCurrentPage(1);
  }, []);

  if (loading) {
    return <LoadingSpinner message="Memuat data sales person..." />;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Person</h1>
          <p className="text-sm text-gray-500">Kelola data master sales person</p>
        </div>
        <button
          onClick={() => router.push('/sales-persons/spMain')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          + Tambah Sales Person
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Cari Sales Person</label>
            <input 
              type="text" 
              placeholder="Nama atau ID Sales Person..." 
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
              onClick={fetchSalesPersons}
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
          <p className="text-sm text-blue-600 font-medium">Total Sales Person</p>
          <p className="text-2xl font-bold text-blue-900">{filteredSalesPersons.length}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-600 font-medium">Halaman</p>
          <p className="text-xl font-bold text-green-900">{currentPage} / {Math.ceil(filteredSalesPersons.length / PAGE_SIZE) || 1}</p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategori</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedSalesPersons.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  {searchTerm ? 'Tidak ada sales person yang cocok dengan pencarian' : 'Belum ada data sales person'}
                </td>
              </tr>
            ) : (
              paginatedSalesPersons.map((sp) => (
                <tr key={sp.name} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/sales-persons/spMain?name=${encodeURIComponent(sp.name)}`)}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">{sp.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sp.full_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sp.category || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sp.email || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={(e) => { e.stopPropagation(); router.push(`/sales-persons/spMain?name=${encodeURIComponent(sp.name)}`); }}
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
          totalPages={Math.ceil(filteredSalesPersons.length / PAGE_SIZE)}
          totalRecords={filteredSalesPersons.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}
