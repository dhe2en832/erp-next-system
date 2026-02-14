'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  X, 
  Eye
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import Pagination from '../components/Pagination';
import { parseDate } from '../../utils/format';

interface GLEntry {
  name: string;
  posting_date: string;
  account: string;
  debit: number;
  credit: number;
  voucher_type: string;
  voucher_no: string;
  cost_center: string;
  company: string;
  remarks: string;
  fiscal_year: string;
  is_opening: string;
  project: string | null;
}

export default function GLEntryPage() {
  const [glEntries, setGLEntries] = useState<GLEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showViewForm, setShowViewForm] = useState(false);
  const [selectedGLEntry, setSelectedGLEntry] = useState<GLEntry | null>(null);
  const [selectedCompany, setSelectedCompany] = useState('');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Filter states
  const [dateFilter, setDateFilter] = useState({
    from_date: '',
    to_date: ''
  });
  const [accountFilter, setAccountFilter] = useState('');
  const [voucherTypeFilter, setVoucherTypeFilter] = useState('');

  // Get selected company from localStorage or cookie
  useEffect(() => {
    const storedCompany = localStorage.getItem('selected_company');
    if (storedCompany) {
      setSelectedCompany(storedCompany);
    } else {
      const cookies = document.cookie.split(';');
      const companyCookie = cookies.find(cookie => cookie.trim().startsWith('selected_company='));
      if (companyCookie) {
        const company = companyCookie.split('=')[1];
        setSelectedCompany(company);
      }
    }
  }, []);

  const fetchGLEntries = useCallback(async () => {
    if (!selectedCompany) {
      setError('No company selected. Please select a company to view GL entries.');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const params = new URLSearchParams({
        company: selectedCompany,
        limit_page_length: pageSize.toString(),
        start: ((currentPage - 1) * pageSize).toString()
      });

      if (searchTerm) {
        params.append('search', searchTerm);
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

      if (accountFilter) {
        params.append('account', accountFilter);
      }

      if (voucherTypeFilter) {
        params.append('voucher_type', voucherTypeFilter);
      }

      const response = await fetch(`/api/finance/gl-entry?${params}`);
      const data = await response.json();

      if (data.success) {
        setGLEntries(data.data || []);
        setTotalRecords(data.total_records || 0);
        setTotalPages(Math.ceil((data.total_records || 0) / pageSize));
      } else {
        setError(data.message || 'Failed to fetch GL entries');
      }
    } catch (err: unknown) {
      console.error('Error fetching GL entries:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch GL entries';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, currentPage, pageSize, searchTerm, dateFilter, accountFilter, voucherTypeFilter]);

  useEffect(() => {
    if (selectedCompany) {
      fetchGLEntries();
    }
  }, [selectedCompany, fetchGLEntries]);

  // Reset to page 1 when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateFilter, accountFilter, voucherTypeFilter]);

  const handleViewGLEntry = (glEntry: GLEntry) => {
    setSelectedGLEntry(glEntry);
    setShowViewForm(true);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setDateFilter({ from_date: '', to_date: '' });
    setAccountFilter('');
    setVoucherTypeFilter('');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">General Ledger</h1>
            <p className="text-gray-600 mt-1">View General Ledger Entries</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search GL entries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <input
                type="date"
                placeholder="From Date"
                value={dateFilter.from_date}
                onChange={(e) => setDateFilter(prev => ({ ...prev, from_date: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <input
                type="date"
                placeholder="To Date"
                value={dateFilter.to_date}
                onChange={(e) => setDateFilter(prev => ({ ...prev, to_date: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <input
                type="text"
                placeholder="Account"
                value={accountFilter}
                onChange={(e) => setAccountFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={clearFilters}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* GL Entries List */}
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Debit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Credit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Voucher Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Voucher No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <LoadingSpinner message="Loading GL Entries..." />
                    </td>
                  </tr>
                ) : glEntries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No GL entries found
                    </td>
                  </tr>
                ) : (
                  glEntries.map((glEntry) => (
                    <tr key={glEntry.name} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(glEntry.posting_date).toLocaleDateString('id-ID')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {glEntry.account}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {glEntry.debit > 0 ? formatCurrency(glEntry.debit) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {glEntry.credit > 0 ? formatCurrency(glEntry.credit) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {glEntry.voucher_type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {glEntry.voucher_no}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => handleViewGLEntry(glEntry)}
                          className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && glEntries.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalRecords={totalRecords}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>

        {/* View GL Entry Modal */}
        {showViewForm && selectedGLEntry && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">GL Entry Details</h2>
                <button
                  onClick={() => setShowViewForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Entry No
                    </label>
                    <p className="text-sm text-gray-900 font-medium">{selectedGLEntry.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Posting Date
                    </label>
                    <p className="text-sm text-gray-900">{new Date(selectedGLEntry.posting_date).toLocaleDateString('id-ID')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account
                    </label>
                    <p className="text-sm text-gray-900">{selectedGLEntry.account}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cost Center
                    </label>
                    <p className="text-sm text-gray-900">{selectedGLEntry.cost_center || '-'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Debit
                    </label>
                    <p className="text-sm text-gray-900 font-medium">
                      {selectedGLEntry.debit > 0 ? formatCurrency(selectedGLEntry.debit) : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Credit
                    </label>
                    <p className="text-sm text-gray-900 font-medium">
                      {selectedGLEntry.credit > 0 ? formatCurrency(selectedGLEntry.credit) : '-'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Voucher Type
                    </label>
                    <p className="text-sm text-gray-900">{selectedGLEntry.voucher_type}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Voucher No
                    </label>
                    <p className="text-sm text-gray-900">{selectedGLEntry.voucher_no}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cost Center
                    </label>
                    <p className="text-sm text-gray-900">{selectedGLEntry.cost_center || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company
                    </label>
                    <p className="text-sm text-gray-900">{selectedGLEntry.company}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fiscal Year
                    </label>
                    <p className="text-sm text-gray-900">{selectedGLEntry.fiscal_year || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Project
                    </label>
                    <p className="text-sm text-gray-900">{selectedGLEntry.project || '-'}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Remarks
                  </label>
                  <p className="text-sm text-gray-900">{selectedGLEntry.remarks || '-'}</p>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowViewForm(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
