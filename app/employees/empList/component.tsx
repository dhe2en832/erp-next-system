'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoadingSpinner from '../../components/LoadingSpinner';
import Pagination from '../../components/Pagination';

export const dynamic = 'force-dynamic';

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

interface Employee {
  name: string;
  employee_name: string;
  department?: string;
  designation?: string;
  status?: string;
  cell_number?: string;
  personal_email?: string;
}

export default function EmployeeList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile(768);
  const pageSize = isMobile ? 10 : 20;
  
  const [employees, setEmployees] = useState<Employee[]>([]);
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


  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('limit_page_length', pageSize.toString());
      params.set('limit_start', ((currentPage - 1) * pageSize).toString());
      
      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      params.set('order_by', 'creation desc');

      const response = await fetch(`/api/hr/employees?${params}`, { credentials: 'include' });
      const data = await response.json();

      if (data.success) {
        setEmployees(data.data || []);
        setTotalRecords(data.total || data.data?.length || 0);
        setTotalPages(Math.ceil((data.total || data.data?.length || 0) / pageSize));
      } else {
        setError(data.message || 'Gagal memuat data employee');
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
      setError('Gagal memuat data employee');
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
    fetchEmployees();
     
  }, [currentPage]);

  // Trigger fetch when filters change (after page reset)
  useEffect(() => {
    if (pageChangeSourceRef.current === 'filter') {
      fetchEmployees();
    }
     
  }, [searchTerm]);

  // Memoized handlers
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setCurrentPage(1);
  }, []);

  if (loading && employees.length === 0) {
    return <LoadingSpinner message="Memuat data employee..." />;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daftar Employee</h1>
          <p className="text-sm text-gray-500">Kelola data master employee (untuk sales person)</p>
        </div>
        <button
          onClick={() => router.push('/employees/empMain')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          + Tambah Employee
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Cari Employee</label>
            <input 
              type="text" 
              placeholder="Nama atau ID Employee..." 
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
              onClick={fetchEmployees}
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
          <p className="text-sm text-blue-600 font-medium">Total Employee</p>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jabatan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      {searchTerm ? 'Tidak ada employee yang cocok dengan pencarian' : 'Belum ada data employee'}
                    </td>
                  </tr>
                ) : (
                  employees.map((emp) => (
                    <tr key={emp.name} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/employees/empMain?name=${encodeURIComponent(emp.name)}`)}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">{emp.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{emp.employee_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{emp.department || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{emp.designation || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          emp.status === 'Active' ? 'bg-green-100 text-green-800' :
                          emp.status === 'Inactive' ? 'bg-gray-100 text-gray-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {emp.status || 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={(e) => { e.stopPropagation(); router.push(`/employees/empMain?name=${encodeURIComponent(emp.name)}`); }}
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
            {employees.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                {searchTerm ? 'Tidak ada employee yang cocok dengan pencarian' : 'Belum ada data employee'}
              </div>
            ) : (
              employees.map((emp) => (
                <div
                  key={emp.name}
                  onClick={() => router.push(`/employees/empMain?name=${encodeURIComponent(emp.name)}`)}
                  className="px-4 py-4 hover:bg-gray-50 cursor-pointer"
                >
                  <div className="space-y-3">
                    {/* Row 1: ID + Name + Status */}
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-indigo-600 truncate">👤 {emp.name}</p>
                        <p className="text-sm text-gray-900 mt-1 font-medium">{emp.employee_name}</p>
                      </div>
                      <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        emp.status === 'Active' ? 'bg-green-100 text-green-800' :
                        emp.status === 'Inactive' ? 'bg-gray-100 text-gray-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {emp.status === 'Active' ? '✓ Active' : emp.status === 'Inactive' ? '✗ Inactive' : emp.status || 'Active'}
                      </span>
                    </div>
                    
                    {/* Row 2: Department & Designation */}
                    {(emp.department || emp.designation) && (
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">🏢 Department</p>
                          <p className="text-sm font-medium text-gray-900 truncate">{emp.department || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">💼 Jabatan</p>
                          <p className="text-sm font-medium text-gray-900 truncate">{emp.designation || '-'}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Row 3: Contact Info (if available) */}
                    {(emp.cell_number || emp.personal_email) && (
                      <div className="pt-2 border-t border-gray-100">
                        <div className="space-y-1 text-xs text-gray-500">
                          {emp.cell_number && (
                            <p>📱 {emp.cell_number}</p>
                          )}
                          {emp.personal_email && (
                            <p className="truncate">✉️ {emp.personal_email}</p>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Row 4: Action Button */}
                    <div className="pt-2 border-t border-gray-100">
                      <button
                        onClick={(e) => { e.stopPropagation(); router.push(`/employees/empMain?name=${encodeURIComponent(emp.name)}`); }}
                        className="w-full text-center text-indigo-600 hover:text-indigo-900 text-sm font-medium py-1"
                      >
                        Lihat Detail →
                      </button>
                    </div>
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
