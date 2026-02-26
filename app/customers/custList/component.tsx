'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoadingSpinner from '../../components/LoadingSpinner';
import Pagination from '../../components/Pagination';

// ─────────────────────────────────────────────────────────────
// Hook: Deteksi mobile (breakpoint 768px)
// ─────────────────────────────────────────────────────────────
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < breakpoint);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [breakpoint]);

  return isMobile;
}

interface Customer {
  name: string;
  customer_name: string;
  customer_group?: string;
  territory?: string;
  mobile_no?: string;
  email_id?: string;
}

export default function CustomerList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile(768);
  const pageSize = isMobile ? 10 : 20;
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // ✅ FIX: Track pagination change source to prevent race conditions
  const pageChangeSourceRef = useRef<'pagination' | 'filter' | 'init'>('init');

  // Sync URL dengan page state
  useEffect(() => {
    const pageFromUrl = searchParams?.get('page');
    if (pageFromUrl && !isNaN(parseInt(pageFromUrl))) {
      const pageNum = parseInt(pageFromUrl);
      if (pageNum >= 1) setCurrentPage(pageNum);
    }
  }, [searchParams]);


  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('limit_page_length', pageSize.toString());
      params.set('limit_start', ((currentPage - 1) * pageSize).toString());
      
      if (searchTerm.trim()) params.set('search', searchTerm.trim());

      const response = await fetch(`/api/sales/customers?${params}`, { credentials: 'include' });
      const data = await response.json();

      if (data.success) {
        setCustomers(data.data || []);
        setTotalRecords(data.total || data.data?.length || 0);
        setTotalPages(Math.ceil((data.total || data.data?.length || 0) / pageSize));
      } else {
        setError(data.message || 'Gagal memuat data pelanggan');
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError('Gagal memuat data pelanggan');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, currentPage, pageSize]);

  // Reset page when search changes
  useEffect(() => {
    pageChangeSourceRef.current = 'filter';
    setCurrentPage(1);
  }, [searchTerm]);

  // Fetch when page changes (separated from filter logic)
  useEffect(() => {
    fetchCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // Trigger fetch when filters change (after page reset)
  useEffect(() => {
    if (pageChangeSourceRef.current === 'filter') {
      fetchCustomers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  // Memoized handlers
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setCurrentPage(1);
  }, []);

  if (loading && customers.length === 0) {
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
          <p className="text-2xl font-bold text-blue-900">{totalRecords}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-600 font-medium">Halaman</p>
          <p className="text-xl font-bold text-green-900">{currentPage} / {totalPages || 1}</p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-900">
            Daftar Pelanggan 
            <span className="ml-2 px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full">{totalRecords} pelanggan</span>
          </h3>
        </div>
        
        {/* Desktop Table */}
        {!isMobile ? (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Pelanggan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                      {searchTerm ? 'Tidak ada pelanggan yang cocok dengan pencarian' : 'Belum ada data pelanggan'}
                    </td>
                  </tr>
                ) : (
                  customers.map((customer) => (
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
          </>
        ) : (
          /* Mobile Cards */
          <div className="divide-y divide-gray-200">
            {customers.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                {searchTerm ? 'Tidak ada pelanggan yang cocok dengan pencarian' : 'Belum ada data pelanggan'}
              </div>
            ) : (
              customers.map((customer) => (
                <div
                  key={customer.name}
                  onClick={() => router.push(`/customers/custMain?name=${encodeURIComponent(customer.name)}`)}
                  className="px-4 py-4 hover:bg-gray-50 cursor-pointer"
                >
                  <div className="space-y-3">
                    {/* Row 1: Customer ID */}
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-indigo-600 truncate">{customer.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">ID Pelanggan</p>
                      </div>
                    </div>
                    
                    {/* Row 2: Customer Name */}
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-500 mb-1">Nama Pelanggan</p>
                      <p className="text-sm font-semibold text-gray-900">
                        👤 {customer.customer_name}
                      </p>
                    </div>
                    
                    {/* Row 3: Additional Info (if available) */}
                    {(customer.customer_group || customer.territory || customer.mobile_no || customer.email_id) && (
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                        {customer.customer_group && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Grup</p>
                            <p className="text-sm text-gray-900 truncate" title={customer.customer_group}>
                              🏷️ {customer.customer_group}
                            </p>
                          </div>
                        )}
                        {customer.territory && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Wilayah</p>
                            <p className="text-sm text-gray-900 truncate" title={customer.territory}>
                              📍 {customer.territory}
                            </p>
                          </div>
                        )}
                        {customer.mobile_no && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Telepon</p>
                            <p className="text-sm text-gray-900 truncate" title={customer.mobile_no}>
                              📱 {customer.mobile_no}
                            </p>
                          </div>
                        )}
                        {customer.email_id && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Email</p>
                            <p className="text-sm text-gray-900 truncate" title={customer.email_id}>
                              ✉️ {customer.email_id}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalRecords={totalRecords}
          pageSize={pageSize}
          onPageChange={(page) => {
            pageChangeSourceRef.current = 'pagination';
            setCurrentPage(page);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      </div>
    </div>
  );
}
