'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '../../components/LoadingSpinner';
import Pagination from '../../components/Pagination';

interface Employee {
  name: string;
  employee_name: string;
  department?: string;
  designation?: string;
  status?: string;
  cell_number?: string;
  personal_email?: string;
}

const PAGE_SIZE = 20;

export default function EmployeeList() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.set('search', searchTerm.trim());

      const response = await fetch(`/api/hr/employees?${params}`, { credentials: 'include' });
      const data = await response.json();

      if (data.success) {
        setEmployees(data.data || []);
      } else {
        setError(data.message || 'Gagal memuat data employee');
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
      setError('Gagal memuat data employee');
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Frontend filtering
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchSearch = !searchTerm || 
        (emp.employee_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch;
    });
  }, [employees, searchTerm]);

  // Pagination
  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredEmployees.slice(start, start + PAGE_SIZE);
  }, [filteredEmployees, currentPage]);

  // Memoized handlers
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setCurrentPage(1);
  }, []);

  if (loading) {
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
          <p className="text-2xl font-bold text-blue-900">{filteredEmployees.length}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-600 font-medium">Halaman</p>
          <p className="text-xl font-bold text-green-900">{currentPage} / {Math.ceil(filteredEmployees.length / PAGE_SIZE) || 1}</p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-sm font-medium text-gray-900">
            Data Employee
            <span className="ml-2 px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full">{filteredEmployees.length} entri</span>
          </h3>
        </div>
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
            {paginatedEmployees.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  {searchTerm ? 'Tidak ada employee yang cocok dengan pencarian' : 'Belum ada data employee'}
                </td>
              </tr>
            ) : (
              paginatedEmployees.map((emp) => (
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
        
        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil(filteredEmployees.length / PAGE_SIZE)}
          totalRecords={filteredEmployees.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}
