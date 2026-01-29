'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface StockEntry {
  name: string;
  posting_date: string;
  posting_time: string;
  purpose: string;
  company: string;
  from_warehouse: string;
  to_warehouse: string;
  total_amount: number;
  total_qty: number;
  status: string;
  items: StockEntryItem[];
}

interface StockEntryItem {
  item_code: string;
  item_name: string;
  qty: number;
  transfer_qty: number;
  serial_no: string;
  batch_no: string;
}

interface Warehouse {
  name: string;
  warehouse_name: string;
}

interface Item {
  name: string;
  item_name: string;
  item_code: string;
  stock_uom: string;
}

export default function StockEntryPage() {
  const [entries, setEntries] = useState<StockEntry[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [purposeFilter, setPurposeFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [dateFilter, setDateFilter] = useState({ from_date: '', to_date: '' });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [newEntry, setNewEntry] = useState({
    purpose: 'Material Receipt',
    posting_date: new Date().toISOString().split('T')[0],
    posting_time: new Date().toTimeString().split(' ')[0].substring(0, 5),
    from_warehouse: '',
    to_warehouse: '',
    items: [{ item_code: '', qty: 1, transfer_qty: 1 }]
  });

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

  const fetchEntries = useCallback(async () => {
    if (!selectedCompany) return;

    try {
      setLoading(true);
      const params = new URLSearchParams({
        company: selectedCompany,
        ...(searchTerm && { search: searchTerm }),
        ...(purposeFilter && { purpose: purposeFilter }),
        ...(warehouseFilter && { warehouse: warehouseFilter }),
        ...(dateFilter.from_date && { from_date: dateFilter.from_date }),
        ...(dateFilter.to_date && { to_date: dateFilter.to_date })
      });

      const response = await fetch(`/api/stock-entry?${params}`);
      const data = await response.json();

      if (data.success) {
        setEntries(data.data || []);
      } else {
        setError(data.message || 'Failed to fetch stock entries');
      }
    } catch (err) {
      setError('An error occurred while fetching stock entries');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, searchTerm, purposeFilter, warehouseFilter, dateFilter]);

  const fetchWarehouses = useCallback(async () => {
    if (!selectedCompany) return;

    try {
      const response = await fetch(`/api/warehouses?company=${selectedCompany}`);
      const data = await response.json();

      if (data.success) {
        setWarehouses(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch warehouses:', err);
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
      fetchEntries();
      fetchWarehouses();
      fetchItems();
    }
  }, [selectedCompany, fetchEntries, fetchWarehouses, fetchItems]);

  const handleCreateEntry = async () => {
    if (!selectedCompany || !newEntry.from_warehouse || !newEntry.purpose) {
      setError('Purpose and warehouse are required');
      return;
    }

    try {
      const response = await fetch('/api/stock-entry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newEntry,
          company: selectedCompany
        }),
      });

      const data = await response.json();

      if (data.success) {
        setShowCreateForm(false);
        setNewEntry({
          purpose: 'Material Receipt',
          posting_date: new Date().toISOString().split('T')[0],
          posting_time: new Date().toTimeString().split(' ')[0].substring(0, 5),
          from_warehouse: '',
          to_warehouse: '',
          items: [{ item_code: '', qty: 1, transfer_qty: 1 }]
        });
        fetchEntries();
      } else {
        setError(data.message || 'Failed to create stock entry');
      }
    } catch (err) {
      setError('An error occurred while creating stock entry');
    }
  };

  const getPurposeColor = (purpose: string) => {
    switch (purpose?.toLowerCase()) {
      case 'material receipt':
        return 'bg-green-100 text-green-800';
      case 'material issue':
        return 'bg-red-100 text-red-800';
      case 'material transfer':
        return 'bg-blue-100 text-blue-800';
      case 'manufacture':
        return 'bg-purple-100 text-purple-800';
      case 'repack':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'submitted':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const addItemRow = () => {
    setNewEntry(prev => ({
      ...prev,
      items: [...prev.items, { item_code: '', qty: 1, transfer_qty: 1 }]
    }));
  };

  const removeItemRow = (index: number) => {
    setNewEntry(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItemRow = (index: number, field: string, value: any) => {
    setNewEntry(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Stock Entries...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Stock Entry</h1>
              <p className="mt-1 text-sm text-gray-600">Manage stock movements and inventory transfers</p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Stock Entry
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
                placeholder="Search entries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Purpose
              </label>
              <select
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={purposeFilter}
                onChange={(e) => setPurposeFilter(e.target.value)}
              >
                <option value="">All Purposes</option>
                <option value="Material Receipt">Material Receipt</option>
                <option value="Material Issue">Material Issue</option>
                <option value="Material Transfer">Material Transfer</option>
                <option value="Manufacture">Manufacture</option>
                <option value="Repack">Repack</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Warehouse
              </label>
              <select
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={warehouseFilter}
                onChange={(e) => setWarehouseFilter(e.target.value)}
              >
                <option value="">All Warehouses</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.name} value={warehouse.name}>
                    {warehouse.warehouse_name}
                  </option>
                ))}
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
                setPurposeFilter('');
                setWarehouseFilter('');
                setDateFilter({ from_date: '', to_date: '' });
              }}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
            >
              Clear Filters
            </button>
            <button
              onClick={fetchEntries}
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

      {/* Stock Entries List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-900">
              Stock Entries ({entries.length} entries)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Entry No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Purpose
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    From Warehouse
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    To Warehouse
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Amount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {entries.map((entry) => (
                  <tr key={entry.name} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">
                      {entry.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {entry.posting_date} {entry.posting_time}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPurposeColor(entry.purpose)}`}>
                        {entry.purpose}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {entry.from_warehouse || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {entry.to_warehouse || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {entry.total_amount?.toLocaleString() || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {entries.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No stock entries found</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Stock Entry Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-4/5 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Create New Stock Entry</h3>
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Purpose *
                  </label>
                  <select
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={newEntry.purpose}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, purpose: e.target.value }))}
                    required
                  >
                    <option value="Material Receipt">Material Receipt</option>
                    <option value="Material Issue">Material Issue</option>
                    <option value="Material Transfer">Material Transfer</option>
                    <option value="Manufacture">Manufacture</option>
                    <option value="Repack">Repack</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Posting Date
                  </label>
                  <input
                    type="date"
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={newEntry.posting_date}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, posting_date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Posting Time
                  </label>
                  <input
                    type="time"
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={newEntry.posting_time}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, posting_time: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From Warehouse *
                  </label>
                  <select
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={newEntry.from_warehouse}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, from_warehouse: e.target.value }))}
                    required
                  >
                    <option value="">Select Warehouse</option>
                    {warehouses.map((warehouse) => (
                      <option key={warehouse.name} value={warehouse.name}>
                        {warehouse.warehouse_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {(newEntry.purpose === 'Material Transfer' || newEntry.purpose === 'Material Issue') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To Warehouse
                  </label>
                  <select
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={newEntry.to_warehouse}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, to_warehouse: e.target.value }))}
                  >
                    <option value="">Select Warehouse</option>
                    {warehouses.map((warehouse) => (
                      <option key={warehouse.name} value={warehouse.name}>
                        {warehouse.warehouse_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

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
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Transfer Qty</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {newEntry.items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2">
                            <select
                              className="block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm"
                              value={item.item_code}
                              onChange={(e) => updateItemRow(index, 'item_code', e.target.value)}
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
                              value={item.transfer_qty}
                              onChange={(e) => updateItemRow(index, 'transfer_qty', parseFloat(e.target.value) || 0)}
                              min="1"
                            />
                          </td>
                          <td className="px-4 py-2">
                            {newEntry.items.length > 1 && (
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
                  onClick={handleCreateEntry}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                >
                  Create Stock Entry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
