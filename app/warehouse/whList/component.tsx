'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '../../components/LoadingSpinner';
import Pagination from '../../components/Pagination';

interface Warehouse {
  name: string;
  warehouse_name: string;
  company: string;
  address: string;
  email: string;
  phone: string;
  is_group: boolean;
  parent_warehouse: string;
}

export default function WarehouseList() {
  const router = useRouter();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [pageSize] = useState(20);

  useEffect(() => {
    const savedCompany = localStorage.getItem('selected_company');
    if (savedCompany) {
      setSelectedCompany(savedCompany);
    } else {
      router.push('/select-company');
    }
  }, [router]);

  const fetchWarehouses = useCallback(async () => {
    if (!selectedCompany) return;
    try {
      setLoading(true);
      const params = new URLSearchParams({
        company: selectedCompany,
        ...(searchTerm && { search: searchTerm }),
        limit_page_length: pageSize.toString(),
        start: ((currentPage - 1) * pageSize).toString()
      });

      const response = await fetch(`/api/warehouses?${params}`);
      const data = await response.json();

      if (data.success) {
        setWarehouses(data.data || []);
        if (data.total_records !== undefined) {
          setTotalRecords(data.total_records);
          setTotalPages(Math.ceil(data.total_records / pageSize));
        } else {
          setTotalRecords(data.data?.length || 0);
          setTotalPages(1);
        }
      } else {
        setError(data.message || 'Gagal memuat gudang');
      }
    } catch {
      setError('Terjadi kesalahan saat memuat gudang');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, searchTerm, currentPage, pageSize]);

  useEffect(() => {
    if (selectedCompany) fetchWarehouses();
  }, [selectedCompany, fetchWarehouses]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  if (loading) {
    return <LoadingSpinner message="Memuat Daftar Gudang..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gudang</h1>
              <p className="mt-1 text-sm text-gray-600">Kelola lokasi gudang dan penyimpanan inventaris</p>
            </div>
            <button
              onClick={() => router.push('/warehouse/whMain')}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Gudang Baru
            </button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <input
                type="text"
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Cari gudang..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button onClick={fetchWarehouses} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">
              Cari
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>
        </div>
      )}

      {/* Warehouses Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-900">Gudang ({warehouses.length} lokasi)</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {warehouses.map((warehouse) => (
              <div key={warehouse.name} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{warehouse.warehouse_name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{warehouse.name}</p>
                  </div>
                  {warehouse.is_group && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Grup
                    </span>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">{warehouse.company}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {warehouses.length === 0 && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Tidak ada gudang</h3>
              <p className="mt-1 text-sm text-gray-500">Mulai dengan membuat gudang baru.</p>
            </div>
          )}
          <Pagination currentPage={currentPage} totalPages={totalPages} totalRecords={totalRecords} pageSize={pageSize} onPageChange={setCurrentPage} />
        </div>
      </div>
    </div>
  );
}
