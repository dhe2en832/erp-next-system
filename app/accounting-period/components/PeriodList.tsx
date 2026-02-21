'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '../../components/LoadingSpinner';
import Pagination from '../../components/Pagination';
import type { AccountingPeriod } from '../../../types/accounting-period';

const PAGE_SIZE = 20;

interface PeriodListProps {
  company?: string;
}

export default function PeriodList({ company }: PeriodListProps) {
  const router = useRouter();
  const [periods, setPeriods] = useState<AccountingPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [fiscalYearFilter, setFiscalYearFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Sorting
  const [sortField, setSortField] = useState<keyof AccountingPeriod>('start_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const fetchPeriods = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (company) params.set('company', company);
      if (statusFilter) params.set('status', statusFilter);
      if (fiscalYearFilter) params.set('fiscal_year', fiscalYearFilter);

      const response = await fetch(`/api/accounting-period/periods?${params}`, { 
        credentials: 'include' 
      });
      const data = await response.json();

      if (data.success) {
        setPeriods(data.data || []);
      } else {
        setError(data.message || 'Gagal memuat data periode');
      }
    } catch (err) {
      console.error('Error fetching periods:', err);
      setError('Gagal memuat data periode');
    } finally {
      setLoading(false);
    }
  }, [company, statusFilter, fiscalYearFilter]);

  useEffect(() => {
    fetchPeriods();
  }, [fetchPeriods]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, fiscalYearFilter, searchTerm, sortField, sortDirection]);

  // Frontend filtering and sorting
  const filteredAndSortedPeriods = useMemo(() => {
    let result = [...periods];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(period => 
        period.period_name.toLowerCase().includes(term) ||
        period.name.toLowerCase().includes(term)
      );
    }

    // Sort
    result.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      
      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;
      
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [periods, searchTerm, sortField, sortDirection]);

  // Pagination
  const paginatedPeriods = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredAndSortedPeriods.slice(start, start + PAGE_SIZE);
  }, [filteredAndSortedPeriods, currentPage]);

  // Get unique fiscal years for filter
  const fiscalYears = useMemo(() => {
    const years = new Set(periods.map(p => p.fiscal_year).filter(Boolean));
    return Array.from(years).sort();
  }, [periods]);

  // Status badge styling
  const getStatusBadge = (status: string) => {
    const badges = {
      'Open': 'bg-green-100 text-green-800 border-green-200',
      'Closed': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Permanently Closed': 'bg-red-100 text-red-800 border-red-200'
    };
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // Check if period needs attention (overdue)
  const needsAttention = (period: AccountingPeriod) => {
    if (period.status !== 'Open') return false;
    const endDate = new Date(period.end_date);
    const today = new Date();
    return endDate < today;
  };

  const handleSort = (field: keyof AccountingPeriod) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleClearFilters = useCallback(() => {
    setStatusFilter('');
    setFiscalYearFilter('');
    setSearchTerm('');
    setCurrentPage(1);
  }, []);

  if (loading) {
    return <LoadingSpinner message="Memuat data periode akuntansi..." />;
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Periode Akuntansi</h1>
          <p className="text-sm text-gray-500">Kelola periode akuntansi dan penutupan</p>
        </div>
        <button
          onClick={() => router.push('/accounting-period/create')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          + Buat Periode Baru
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cari Periode</label>
            <input 
              type="text" 
              placeholder="Nama periode..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="">Semua Status</option>
              <option value="Open">Terbuka</option>
              <option value="Closed">Ditutup</option>
              <option value="Permanently Closed">Ditutup Permanen</option>
            </select>
          </div>

          {/* Fiscal Year Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tahun Fiskal</label>
            <select
              value={fiscalYearFilter}
              onChange={(e) => setFiscalYearFilter(e.target.value)}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="">Semua Tahun</option>
              {fiscalYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-end space-x-2">
            <button 
              onClick={handleClearFilters}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors text-sm"
            >
              Hapus Filter
            </button>
            <button 
              onClick={fetchPeriods}
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
          <p className="text-sm text-blue-600 font-medium">Total Periode</p>
          <p className="text-2xl font-bold text-blue-900">{filteredAndSortedPeriods.length}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-600 font-medium">Terbuka</p>
          <p className="text-2xl font-bold text-green-900">
            {filteredAndSortedPeriods.filter(p => p.status === 'Open').length}
          </p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-600 font-medium">Ditutup</p>
          <p className="text-2xl font-bold text-yellow-900">
            {filteredAndSortedPeriods.filter(p => p.status === 'Closed').length}
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600 font-medium">Perlu Perhatian</p>
          <p className="text-2xl font-bold text-red-900">
            {filteredAndSortedPeriods.filter(needsAttention).length}
          </p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('period_name')}
              >
                Nama Periode {sortField === 'period_name' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipe
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('start_date')}
              >
                Tanggal Mulai {sortField === 'start_date' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('end_date')}
              >
                Tanggal Akhir {sortField === 'end_date' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('status')}
              >
                Status {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedPeriods.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  {searchTerm || statusFilter || fiscalYearFilter 
                    ? 'Tidak ada periode yang cocok dengan filter' 
                    : 'Belum ada periode akuntansi'}
                </td>
              </tr>
            ) : (
              paginatedPeriods.map((period) => (
                <tr 
                  key={period.name} 
                  className={`hover:bg-gray-50 cursor-pointer ${needsAttention(period) ? 'bg-red-50' : ''}`}
                  onClick={() => router.push(`/accounting-period/${encodeURIComponent(period.name)}`)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{period.period_name}</div>
                        <div className="text-xs text-gray-500">{period.name}</div>
                      </div>
                      {needsAttention(period) && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                          ⚠ Overdue
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {period.period_type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(period.start_date).toLocaleDateString('id-ID')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(period.end_date).toLocaleDateString('id-ID')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(period.status)}`}>
                      {period.status === 'Open' ? 'Terbuka' : 
                       period.status === 'Closed' ? 'Ditutup' : 
                       'Ditutup Permanen'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        router.push(`/accounting-period/${encodeURIComponent(period.name)}`); 
                      }}
                      className="text-indigo-600 hover:text-indigo-900 font-medium"
                    >
                      Lihat Detail
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        
        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil(filteredAndSortedPeriods.length / PAGE_SIZE)}
          totalRecords={filteredAndSortedPeriods.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}
