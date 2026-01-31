'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '../components/LoadingSpinner';
import Pagination from '../components/Pagination';

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

export default function WarehousePage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [newWarehouse, setNewWarehouse] = useState({
    warehouse_name: '',
    is_group: false,
    parent_warehouse: ''
  });
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [pageSize] = useState(20); // 20 records per page

  const router = useRouter();

  useEffect(() => {
    // Get selected company from localStorage
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
        // Add pagination parameters
        limit_page_length: pageSize.toString(),
        start: ((currentPage - 1) * pageSize).toString()
      });

      const response = await fetch(`/api/warehouses?${params}`);
      const data = await response.json();

      if (data.success) {
        setWarehouses(data.data || []);
        
        // Update pagination info from API response
        if (data.total_records !== undefined) {
          setTotalRecords(data.total_records);
          const calculatedTotalPages = Math.ceil(data.total_records / pageSize);
          setTotalPages(calculatedTotalPages);
        } else {
          // Fallback: calculate from received data
          setTotalRecords(data.data?.length || 0);
          setTotalPages(1);
        }
      } else {
        setError(data.message || 'Failed to fetch warehouses');
      }
    } catch (err) {
      setError('An error occurred while fetching warehouses');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, searchTerm, currentPage, pageSize]);

  useEffect(() => {
    if (selectedCompany) {
      fetchWarehouses();
    }
  }, [selectedCompany, fetchWarehouses]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleCreateWarehouse = async () => {
    if (!selectedCompany || !newWarehouse.warehouse_name) {
      setError('Warehouse name is required');
      return;
    }

    try {
      const response = await fetch('/api/warehouses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newWarehouse,
          company: selectedCompany
        }),
      });

      const data = await response.json();

      if (data.success) {
        setShowCreateForm(false);
        setNewWarehouse({
          warehouse_name: '',
          is_group: false,
          parent_warehouse: ''
        });
        fetchWarehouses();
      } else {
        setError(data.message || 'Failed to create warehouse');
      }
    } catch (err) {
      setError('An error occurred while creating warehouse');
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading Warehouses..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Warehouses</h1>
              <p className="mt-1 text-sm text-gray-600">Manage your warehouse locations and inventory storage</p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Warehouse
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
                placeholder="Search warehouses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={fetchWarehouses}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              Search
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      )}

      {/* Warehouses List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-900">
              Warehouses ({warehouses.length} locations)
            </h3>
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
                      Group
                    </span>
                  )}
                </div>
                
                <div className="mt-4 space-y-2">
                  {/* No additional fields to display */}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">{warehouse.company}</span>
                    <div className="flex space-x-2">
                      <button className="text-indigo-600 hover:text-indigo-800 text-sm">
                        Edit
                      </button>
                      <button className="text-red-600 hover:text-red-800 text-sm">
                        Delete
                      </button>
                    </div>
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
              <h3 className="mt-2 text-sm font-medium text-gray-900">No warehouses</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new warehouse.</p>
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

      {/* Create Warehouse Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Create New Warehouse</h3>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Warehouse Name *
                </label>
                <input
                  type="text"
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={newWarehouse.warehouse_name}
                  onChange={(e) => setNewWarehouse(prev => ({ ...prev, warehouse_name: e.target.value }))}
                  required
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  checked={newWarehouse.is_group}
                  onChange={(e) => setNewWarehouse(prev => ({ ...prev, is_group: e.target.checked }))}
                />
                <label className="ml-2 block text-sm text-gray-900">
                  Is Group Warehouse
                </label>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateWarehouse}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                >
                  Create Warehouse
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
