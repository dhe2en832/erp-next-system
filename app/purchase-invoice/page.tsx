'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '../components/LoadingSpinner';
import Pagination from '../components/Pagination';

interface PurchaseInvoice {
  name: string;
  supplier: string;
  posting_date: string;
  due_date: string;
  grand_total: number;
  outstanding_amount: number;
  status: string;
  items: PurchaseInvoiceItem[];
}

interface PurchaseInvoiceItem {
  item_code: string;
  item_name: string;
  qty: number;
  rate: number;
  amount: number;
}

interface Supplier {
  name: string;
  supplier_name: string;
}

interface Item {
  name: string;
  item_name: string;
  item_code: string;
  rate: number;
}

export default function PurchaseInvoicePage() {
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState({ from_date: '', to_date: '' });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [newInvoice, setNewInvoice] = useState({
    supplier: '',
    posting_date: new Date().toISOString().split('T')[0],
    due_date: '',
    items: [{ item_code: '', qty: 1, rate: 0 }]
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

  const fetchInvoices = useCallback(async () => {
    if (!selectedCompany) return;

    try {
      setLoading(true);
      const params = new URLSearchParams({
        company: selectedCompany,
        // Add pagination parameters
        limit_page_length: pageSize.toString(),
        start: ((currentPage - 1) * pageSize).toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(supplierFilter && { supplier: supplierFilter }),
        ...(statusFilter && { status: statusFilter }),
        ...(dateFilter.from_date && { from_date: dateFilter.from_date }),
        ...(dateFilter.to_date && { to_date: dateFilter.to_date })
      });

      const response = await fetch(`/api/purchase-invoice?${params}`);
      const data = await response.json();

      if (data.success) {
        setInvoices(data.data || []);
        
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
        setError(data.message || 'Failed to fetch purchase invoices');
      }
    } catch (err) {
      setError('An error occurred while fetching purchase invoices');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, currentPage, pageSize, searchTerm, supplierFilter, statusFilter, dateFilter.from_date, dateFilter.to_date]);

  const fetchSuppliers = useCallback(async () => {
    if (!selectedCompany) return;

    try {
      const response = await fetch(`/api/suppliers?company=${selectedCompany}`);
      const data = await response.json();

      if (data.success) {
        setSuppliers(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch suppliers:', err);
    }
  }, [selectedCompany]);

  const fetchItems = useCallback(async () => {
    if (!selectedCompany) return;

    try {
      const response = await fetch(`/api/items?company=${selectedCompany}`);
      const data = await response.json();

      if (data.success) {
        setItems(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch items:', err);
    }
  }, [selectedCompany]);

  useEffect(() => {
    if (selectedCompany) {
      fetchInvoices();
      fetchSuppliers();
      fetchItems();
    }
  }, [fetchInvoices, fetchSuppliers, fetchItems]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, supplierFilter, statusFilter, dateFilter]);

  const handleCreateInvoice = async () => {
    if (!selectedCompany || !newInvoice.supplier) {
      setError('Supplier is required');
      return;
    }

    try {
      const response = await fetch('/api/purchase-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newInvoice,
          company: selectedCompany
        }),
      });

      const data = await response.json();

      if (data.success) {
        setShowCreateForm(false);
        setNewInvoice({
          supplier: '',
          posting_date: new Date().toISOString().split('T')[0],
          due_date: '',
          items: [{ item_code: '', qty: 1, rate: 0 }]
        });
        fetchInvoices();
      } else {
        setError(data.message || 'Failed to create purchase invoice');
      }
    } catch (err) {
      setError('An error occurred while creating purchase invoice');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'unpaid':
        return 'bg-red-100 text-red-800';
      case 'partially_paid':
        return 'bg-yellow-100 text-yellow-800';
      case 'submitted':
        return 'bg-blue-100 text-blue-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const addItemRow = () => {
    setNewInvoice(prev => ({
      ...prev,
      items: [...prev.items, { item_code: '', qty: 1, rate: 0 }]
    }));
  };

  const removeItemRow = (index: number) => {
    setNewInvoice(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItemRow = (index: number, field: string, value: any) => {
    setNewInvoice(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const calculateTotal = () => {
    return newInvoice.items.reduce((total, item) => {
      return total + (item.qty * item.rate);
    }, 0);
  };

  if (loading) {
    return <LoadingSpinner message="Loading Purchase Invoices..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Purchase Invoices</h1>
              <p className="mt-1 text-sm text-gray-600">Manage your purchase invoices and bills</p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Purchase Invoice
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="bg-white shadow rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                type="text"
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supplier
              </label>
              <select
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
              >
                <option value="">All Suppliers</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.name} value={supplier.name}>
                    {supplier.supplier_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="Draft">Draft</option>
                <option value="Submitted">Submitted</option>
                <option value="Unpaid">Unpaid</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="Paid">Paid</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From Date
              </label>
              <input
                type="date"
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={dateFilter.from_date}
                onChange={(e) => setDateFilter(prev => ({ ...prev, from_date: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To Date
              </label>
              <input
                type="date"
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={dateFilter.to_date}
                onChange={(e) => setDateFilter(prev => ({ ...prev, to_date: e.target.value }))}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end space-x-2">
            <button
              onClick={() => {
                setSearchTerm('');
                setSupplierFilter('');
                setStatusFilter('');
                setDateFilter({ from_date: '', to_date: '' });
              }}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
            >
              Clear Filters
            </button>
            <button
              onClick={fetchInvoices}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              Apply Filters
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

      {/* Purchase Invoices List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-900">
              Purchase Invoices ({invoices.length} invoices)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supplier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Outstanding
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.map((invoice) => (
                  <tr key={invoice.name} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">
                      {invoice.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {invoice.supplier}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {invoice.posting_date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {invoice.due_date || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {invoice.grand_total?.toLocaleString() || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {invoice.outstanding_amount?.toLocaleString() || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                        {invoice.status || 'Unknown'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {invoices.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No purchase invoices found</p>
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

      {/* Create Invoice Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-4/5 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Create New Purchase Invoice</h3>
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Supplier *
                  </label>
                  <select
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={newInvoice.supplier}
                    onChange={(e) => setNewInvoice(prev => ({ ...prev, supplier: e.target.value }))}
                    required
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.name} value={supplier.name}>
                        {supplier.supplier_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Posting Date
                  </label>
                  <input
                    type="date"
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={newInvoice.posting_date}
                    onChange={(e) => setNewInvoice(prev => ({ ...prev, posting_date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={newInvoice.due_date}
                    onChange={(e) => setNewInvoice(prev => ({ ...prev, due_date: e.target.value }))}
                  />
                </div>
              </div>

              {/* Items Table */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Items
                  </label>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="text-indigo-600 hover:text-indigo-800 text-sm"
                  >
                    + Add Item
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {newInvoice.items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2">
                            <select
                              className="block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm"
                              value={item.item_code}
                              onChange={(e) => {
                                const selectedItem = items.find(i => i.item_code === e.target.value);
                                updateItemRow(index, 'item_code', e.target.value);
                                if (selectedItem) {
                                  updateItemRow(index, 'rate', selectedItem.rate);
                                }
                              }}
                            >
                              <option value="">Select Item</option>
                              {items.map((item) => (
                                <option key={item.name} value={item.item_code}>
                                  {item.item_name} ({item.item_code})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              className="block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm"
                              value={item.qty}
                              onChange={(e) => updateItemRow(index, 'qty', parseFloat(e.target.value) || 0)}
                              min="1"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              className="block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm"
                              value={item.rate}
                              onChange={(e) => updateItemRow(index, 'rate', parseFloat(e.target.value) || 0)}
                              min="0"
                              step="0.01"
                            />
                          </td>
                          <td className="px-4 py-2 text-sm">
                            {(item.qty * item.rate).toFixed(2)}
                          </td>
                          <td className="px-4 py-2">
                            {newInvoice.items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeItemRow(index)}
                                className="text-red-600 hover:text-red-800 text-sm"
                              >
                                Remove
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total */}
              <div className="flex justify-end">
                <div className="text-lg font-medium">
                  Total: {calculateTotal().toFixed(2)}
                </div>
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
                  onClick={handleCreateInvoice}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                >
                  Create Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
