'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface DeliveryNoteItem {
  item_code: string;
  item_name: string;
  qty: number;
  rate: number;
  amount: number;
}

interface DeliveryNote {
  name: string;
  customer: string;
  posting_date: string;
  status: string;
  grand_total: number;
  sales_order?: string;
  items?: DeliveryNoteItem[];
}

export default function DeliveryNotePage() {
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [dateFilter, setDateFilter] = useState({
    from_date: '',
    to_date: '',
  });
  const [nameFilter, setNameFilter] = useState('');
  const [editingDeliveryNote, setEditingDeliveryNote] = useState<DeliveryNote | null>(null);
  const [currentDeliveryNoteStatus, setCurrentDeliveryNoteStatus] = useState<string>('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [formData, setFormData] = useState({
    customer: '',
    posting_date: new Date().toISOString().split('T')[0],
    sales_order: '',
    items: [{ item_code: '', item_name: '', qty: 1, rate: 0, amount: 0 }],
  });
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [salesOrders, setSalesOrders] = useState<any[]>([]);
  const [loadingSalesOrders, setLoadingSalesOrders] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Try to get company from localStorage first, then from cookie
    let savedCompany = localStorage.getItem('selected_company');
    
    if (!savedCompany) {
      // Fallback to cookie if localStorage is empty
      const cookies = document.cookie.split(';');
      const companyCookie = cookies.find(cookie => cookie.trim().startsWith('selected_company='));
      if (companyCookie) {
        savedCompany = companyCookie.split('=')[1];
        // Store in localStorage for future use
        if (savedCompany) {
          localStorage.setItem('selected_company', savedCompany);
        }
      }
    }
    
    if (savedCompany) {
      setSelectedCompany(savedCompany);
    }
  }, []);

  const fetchSalesOrders = async () => {
    setLoadingSalesOrders(true);
    try {
      // Check for company selection
      let companyToUse = selectedCompany;
      
      if (!companyToUse) {
        const storedCompany = localStorage.getItem('selected_company');
        if (storedCompany) {
          companyToUse = storedCompany;
        } else {
          const cookies = document.cookie.split(';');
          const companyCookie = cookies.find(cookie => cookie.trim().startsWith('selected_company='));
          if (companyCookie) {
            const cookieValue = companyCookie.split('=')[1];
            if (cookieValue) {
              companyToUse = cookieValue;
            }
          }
        }
      }
      
      if (!companyToUse) {
        setError('No company selected. Please select a company first.');
        setLoadingSalesOrders(false);
        return;
      }
      
      const filters = [["company", "=", companyToUse], ["status", "in", ["Submitted", "Completed"]]];
      const filtersJson = JSON.stringify(filters);
      const url = `/api/sales-order?filters=${encodeURIComponent(filtersJson)}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setSalesOrders(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching sales orders:', error);
    } finally {
      setLoadingSalesOrders(false);
    }
  };

  const handleSalesOrderChange = async (salesOrderName: string) => {
    if (!salesOrderName) {
      // Reset form if no sales order selected
      setFormData({
        ...formData,
        sales_order: salesOrderName,
        customer: '',
        items: [{ item_code: '', item_name: '', qty: 1, rate: 0, amount: 0 }],
      });
      return;
    }
    
    try {
      const response = await fetch(`/api/sales-order/${salesOrderName}`);
      const data = await response.json();
      
      if (data.success) {
        const order = data.data;
        setFormData({
          customer: order.customer,
          posting_date: new Date().toISOString().split('T')[0],
          sales_order: salesOrderName,
          items: order.items || [{ item_code: '', item_name: '', qty: 1, rate: 0, amount: 0 }],
        });
      }
    } catch (error) {
      console.error('Error fetching sales order details:', error);
      setError('Failed to fetch sales order details');
    }
  };

  useEffect(() => {
    fetchDeliveryNotes();
  }, [dateFilter, nameFilter]); // Removed selectedCompany from dependencies

  useEffect(() => {
    if (showForm) {
      fetchSalesOrders();
    }
  }, [showForm, selectedCompany]);

  const fetchDeliveryNotes = async () => {
    // Clear previous error when starting to fetch
    setError('');
    
    // Check for company selection with better logic
    let companyToUse = selectedCompany;
    
    // If no company in state, try to get it fresh
    if (!companyToUse) {
      const storedCompany = localStorage.getItem('selected_company');
      if (storedCompany) {
        companyToUse = storedCompany;
      } else {
        const cookies = document.cookie.split(';');
        const companyCookie = cookies.find(cookie => cookie.trim().startsWith('selected_company='));
        if (companyCookie) {
          const cookieValue = companyCookie.split('=')[1];
          if (cookieValue) {
            companyToUse = cookieValue;
          }
        }
      }
    }
    
    if (!companyToUse) {
      setError('No company selected. Please select a company first.');
      setLoading(false);
      return;
    }
    
    // Update state if we found company from storage
    if (!selectedCompany && companyToUse) {
      setSelectedCompany(companyToUse);
    }
    
    try {
      // Test dengan test API untuk debugging
      const response = await fetch("/api/test-erpnext");
      const data = await response.json();
      
      console.log('Test ERPNext Response:', data);
      
      // Jika test berhasil, ambil data dari simple test
      if (data.success && data.tests.simple.data.data) {
        setDeliveryNotes(data.tests.simple.data.data);
        setError('');
      } else {
        setError('Test failed: ' + JSON.stringify(data));
      }
    } catch (err) {
      setError('Failed to fetch delivery notes');
    } finally {
      setLoading(false);
    }
  };

  const fetchDeliveryNoteDetails = async (deliveryNoteName: string, deliveryNoteStatus?: string) => {
    if (!deliveryNoteName || deliveryNoteName === 'undefined') {
      console.error('Invalid delivery note name:', deliveryNoteName);
      return;
    }
    
    try {
      const response = await fetch("/api/delivery-note/" + deliveryNoteName);
      const data = await response.json();
      
      if (data.success) {
        const deliveryNote = data.data;
        setEditingDeliveryNote(deliveryNote);
        setCurrentDeliveryNoteStatus(deliveryNoteStatus || deliveryNote.status || '');
        setFormData({
          customer: deliveryNote.customer,
          posting_date: deliveryNote.posting_date,
          sales_order: deliveryNote.sales_order || '',
          items: deliveryNote.items || [{ item_code: '', item_name: '', qty: 1, rate: 0, amount: 0 }],
        });
        setShowForm(true);
      }
    } catch (error) {
      console.error('Error fetching delivery note details:', error);
      setError('Failed to fetch delivery note details');
    }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        { item_code: '', item_name: '', qty: 1, rate: 0, amount: 0 },
      ],
    });
  };

  const handleRemoveItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const handleItemChange = (index: number, field: string, value: string | number) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === 'qty' || field === 'rate') {
      newItems[index].amount = newItems[index].qty * newItems[index].rate;
    }

    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');

    try {
      const deliveryNotePayload = {
        company: selectedCompany,
        customer: formData.customer,
        posting_date: formData.posting_date,
        sales_order: formData.sales_order,
        items: formData.items,
      };
      
      const response = await fetch('/api/delivery-note', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deliveryNotePayload),
      });

      const data = await response.json();

      if (data.success) {
        setShowForm(false);
        setFormData({
          customer: '',
          posting_date: new Date().toISOString().split('T')[0],
          sales_order: '',
          items: [{ item_code: '', item_name: '', qty: 1, rate: 0, amount: 0 }],
        });
        fetchDeliveryNotes();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to create delivery note');
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading delivery notes...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Delivery Notes</h1>
            <p className="mt-1 text-sm text-gray-500">Manage delivery notes and surat jalan</p>
          </div>

          {/* Filters */}
          <div className="px-4 py-5 sm:p-6 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  From Date
                </label>
                <input
                  type="date"
                  value={dateFilter.from_date}
                  onChange={(e) => setDateFilter({ ...dateFilter, from_date: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  To Date
                </label>
                <input
                  type="date"
                  value={dateFilter.to_date}
                  onChange={(e) => setDateFilter({ ...dateFilter, to_date: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Search by Name
                </label>
                <input
                  type="text"
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.target.value)}
                  placeholder="Search delivery note..."
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={() => setShowForm(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
              >
                Create Delivery Note
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            </div>
          )}

          {/* Delivery Notes List */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {deliveryNotes.map((deliveryNote) => (
                <li 
                  key={deliveryNote.name}
                  onClick={() => {
                    if (deliveryNote.name) {
                      fetchDeliveryNoteDetails(deliveryNote.name, deliveryNote.status);
                    }
                  }}
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-indigo-600 truncate">
                          {deliveryNote.name}
                        </p>
                        <p className="mt-1 text-sm text-gray-900">Customer: {deliveryNote.customer}</p>
                        {deliveryNote.sales_order && (
                          <p className="mt-1 text-sm text-gray-500">SO: {deliveryNote.sales_order}</p>
                        )}
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            deliveryNote.status === 'Submitted'
                              ? 'bg-green-100 text-green-800'
                              : deliveryNote.status === 'Draft'
                              ? 'bg-yellow-100 text-yellow-800'
                              : deliveryNote.status === 'Completed'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {deliveryNote.status}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500">
                          Posting Date: {deliveryNote.posting_date}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                        <span className="font-medium">Total: ${deliveryNote.grand_total ? deliveryNote.grand_total.toFixed(2) : '0.00'}</span>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            {deliveryNotes.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No delivery notes found</p>
              </div>
            )}
          </div>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingDeliveryNote ? 'Edit Delivery Note' : 'Create Delivery Note'}
                </h3>
              </div>
              <form onSubmit={handleSubmit} className="px-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Sales Order (Optional)
                    </label>
                    <select
                      value={formData.sales_order}
                      onChange={(e) => handleSalesOrderChange(e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    >
                      <option value="">Select Sales Order...</option>
                      {loadingSalesOrders ? (
                        <option>Loading...</option>
                      ) : (
                        salesOrders.map((so) => (
                          <option key={so.name} value={so.name}>
                            {so.name} - {so.customer}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Customer
                    </label>
                    <input
                      type="text"
                      value={formData.customer}
                      onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Posting Date
                    </label>
                    <input
                      type="date"
                      value={formData.posting_date}
                      onChange={(e) => setFormData({ ...formData, posting_date: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      required
                    />
                  </div>
                </div>

                {/* Items Section */}
                <div className="mt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-md font-medium text-gray-900">Items</h4>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                    >
                      Add Item
                    </button>
                  </div>
                  
                  {formData.items.map((item, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700">
                            Item Code
                          </label>
                          <input
                            type="text"
                            value={item.item_code}
                            onChange={(e) => handleItemChange(index, 'item_code', e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm"
                            placeholder="ITEM-001"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700">
                            Item Name
                          </label>
                          <input
                            type="text"
                            value={item.item_name}
                            onChange={(e) => handleItemChange(index, 'item_name', e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm"
                            placeholder="Item description"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700">
                            Quantity
                          </label>
                          <input
                            type="number"
                            value={item.qty}
                            onChange={(e) => handleItemChange(index, 'qty', parseFloat(e.target.value) || 0)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm"
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700">
                            Rate
                          </label>
                          <input
                            type="number"
                            value={item.rate}
                            onChange={(e) => handleItemChange(index, 'rate', parseFloat(e.target.value) || 0)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700">
                            Amount
                          </label>
                          <input
                            type="number"
                            readOnly
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm bg-gray-50"
                            value={item.amount}
                          />
                        </div>
                      </div>
                      {formData.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="mt-2 text-red-600 text-sm hover:text-red-800"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading || currentDeliveryNoteStatus === 'Completed'}
                    className={`${
                      currentDeliveryNoteStatus === 'Completed'
                        ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    } px-4 py-2 rounded-md disabled:opacity-50`}
                  >
                    {formLoading 
                      ? 'Creating...' 
                      : currentDeliveryNoteStatus === 'Completed' 
                        ? 'Delivery Note Completed - Cannot Edit' 
                        : editingDeliveryNote 
                          ? 'Update Delivery Note' 
                          : 'Create Delivery Note'
                    }
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
