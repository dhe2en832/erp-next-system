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

interface Supplier {
  name: string;
  supplier_name: string;
  supplier_group?: string;
  supplier_type?: string;
  country?: string;
  mobile_no?: string;
}

export default function SupplierList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile(768);
  const pageSize = isMobile ? 10 : 20;
  
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Ref untuk tracking pagination source (prevent race conditions)
  const pageChangeSourceRef = useRef<'pagination' | 'filter' | 'init'>('init');

  // Sync URL dengan page state
  useEffect(() => {
    const pageFromUrl = searchParams?.get('page');
    if (pageFromUrl && !isNaN(parseInt(pageFromUrl))) {
      const pageNum = parseInt(pageFromUrl);
      if (pageNum >= 1) setCurrentPage(pageNum);
    }
  }, [searchParams]);

  // Update URL with debounce to prevent throttling
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const timeoutId = setTimeout(() => {
      const newParams = new URLSearchParams(searchParams?.toString() || '');
      if (currentPage > 1) {
        newParams.set('page', currentPage.toString());
      } else {
        newParams.delete('page');
      }
      const newUrl = `${window.location.pathname}${newParams.toString() ? `?${newParams.toString()}` : ''}`;
      window.history.replaceState({}, '', newUrl);
    }, 100); // Debounce 100ms

    return () => clearTimeout(timeoutId);
  }, [currentPage, searchParams]);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('limit_page_length', pageSize.toString());
      params.set('limit_start', ((currentPage - 1) * pageSize).toString());
      
      if (searchTerm.trim()) params.set('search', searchTerm.trim());

      const response = await fetch(`/api/purchase/suppliers?${params}`, { credentials: 'include' });
      const data = await response.json();

      if (data.success) {
        setSuppliers(data.data || []);
        setTotalRecords(data.total || data.data?.length || 0);
        setTotalPages(Math.ceil((data.total || data.data?.length || 0) / pageSize));
      } else {
        setError(data.message || 'Gagal memuat data pemasok');
      }
    } catch (err) {
      console.error('Error fetching suppliers:', err);
      setError('Gagal memuat data pemasok');
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
    fetchSuppliers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // Trigger fetch when filters change (after page reset)
  useEffect(() => {
    if (pageChangeSourceRef.current === 'filter') {
      fetchSuppliers();
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

  if (loading && suppliers.length === 0) {
    return <LoadingSpinner message="Memuat data pemasok..." />;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pemasok</h1>
          <p className="text-sm text-gray-500">Kelola data master pemasok</p>
        </div>
        <button
          onClick={() => router.push('/suppliers/suppMain')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          + Tambah Pemasok
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Cari Pemasok</label>
            <input 
              type="text" 
              placeholder="Nama atau Kode Pemasok..." 
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
              onClick={fetchSuppliers}
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
          <p className="text-sm text-blue-600 font-medium">Total Pemasok</p>
          <p className="text-2xl font-bold text-blue-900">{totalRecords}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-600 font-medium">Halaman</p>
          <p className="text-xl font-bold text-green-900">{currentPage} / {totalPages || 1}</p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {/* Desktop Table */}
        {!isMobile ? (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Pemasok</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                      {searchTerm ? 'Tidak ada pemasok yang cocok dengan pencarian' : 'Belum ada data pemasok'}
                    </td>
                  </tr>
                ) : (
                  suppliers.map((supplier) => (
                    <tr key={supplier.name} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/suppliers/suppMain?name=${encodeURIComponent(supplier.name)}`)}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">{supplier.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{supplier.supplier_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={(e) => { e.stopPropagation(); router.push(`/suppliers/suppMain?name=${encodeURIComponent(supplier.name)}`); }}
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
            {suppliers.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                {searchTerm ? 'Tidak ada pemasok yang cocok dengan pencarian' : 'Belum ada data pemasok'}
              </div>
            ) : (
              suppliers.map((supplier) => (
                <div
                  key={supplier.name}
                  onClick={() => router.push(`/suppliers/suppMain?name=${encodeURIComponent(supplier.name)}`)}
                  className="px-4 py-4 hover:bg-gray-50 cursor-pointer"
                >
                  <div className="space-y-2">
                    {/* Row 1: ID + Name */}
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-indigo-600 truncate">🏢 {supplier.name}</p>
                        <p className="text-sm text-gray-900 mt-1 font-medium">{supplier.supplier_name}</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); router.push(`/suppliers/suppMain?name=${encodeURIComponent(supplier.name)}`); }}
                        className="ml-4 text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                      >
                        Lihat
                      </button>
                    </div>
                    
                    {/* Row 2: Additional Info (if available) */}
                    {(supplier.supplier_group || supplier.country || supplier.mobile_no) && (
                      <div className="pt-2 border-t border-gray-100">
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                          {supplier.supplier_group && (
                            <div>
                              <span className="font-medium">🏷️ Grup:</span> {supplier.supplier_group}
                            </div>
                          )}
                          {supplier.country && (
                            <div>
                              <span className="font-medium">🌍 Negara:</span> {supplier.country}
                            </div>
                          )}
                          {supplier.mobile_no && (
                            <div className="col-span-2">
                              <span className="font-medium">📱 Telepon:</span> {supplier.mobile_no}
                            </div>
                          )}
                        </div>
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
