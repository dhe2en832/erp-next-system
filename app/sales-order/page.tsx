'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CustomerDialog from '../components/CustomerDialog';
import ItemDialog from '../components/ItemDialog';
import SalesPersonDialog from '../components/SalesPersonDialog';

interface SalesOrder {
  name: string;
  customer: string;
  transaction_date: string;
  grand_total: number;
  status: string;
  delivery_date: string;
  sales_person?: string;
}

interface OrderItem {
  item_code: string;
  item_name: string;
  qty: number;
  rate: number;
  amount: number;
}

export default function SalesOrderPage() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [dateFilter, setDateFilter] = useState({
    from_date: '',
    to_date: '',
  });
  const [nameFilter, setNameFilter] = useState('');
  const [editingOrder, setEditingOrder] = useState<SalesOrder | null>(null);
  const [currentOrderStatus, setCurrentOrderStatus] = useState<string>('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [formData, setFormData] = useState({
    customer: '',
    transaction_date: new Date().toISOString().split('T')[0],
    delivery_date: new Date().toISOString().split('T')[0],
    sales_person: '',
    items: [{ item_code: '', item_name: '', qty: 1, rate: 0, amount: 0 }],
  });
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [showSalesPersonDialog, setShowSalesPersonDialog] = useState(false);
  const [currentItemIndex, setCurrentItemIndex] = useState<number | null>(null);
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

  useEffect(() => {
    fetchOrders();
  }, [dateFilter, nameFilter]); // Remove selectedCompany from dependencies

  const fetchOrders = async () => {
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
      const params = new URLSearchParams();
      
      // Build filters array for ERPNext - use companyToUse instead of selectedCompany
      const filters = [["company", "=", companyToUse]];
      
      if (dateFilter.from_date) filters.push(["transaction_date", ">=", dateFilter.from_date]);
      if (dateFilter.to_date) filters.push(["transaction_date", "<=", dateFilter.to_date]);
      if (nameFilter) filters.push(["name", "like", "%" + nameFilter + "%"]);
      
      params.append('filters', JSON.stringify(filters));
      
      const response = await fetch("/api/sales-order?" + params.toString());
      const data = await response.json();

      if (data.success) {
        if (data.data && data.data.length === 0) {
          setError(`No sales orders found for company: ${companyToUse}`);
        } else {
          setError(''); // Clear error if data is found
        }
        setOrders(data.data || []);
      } else {
        setError(data.message || 'Failed to fetch sales orders');
      }
    } catch (err) {
      setError('Failed to fetch sales orders');
    } finally {
      setLoading(false);
    }
  };

  const handleEditOrder = (order: SalesOrder) => {
    setEditingOrder(order);
    setFormData({
      customer: order.customer,
      transaction_date: order.transaction_date,
      delivery_date: order.delivery_date,
      sales_person: order.sales_person || '',
      items: [{ item_code: '', item_name: '', qty: 1, rate: 0, amount: 0 }],
    });
    setShowForm(true);
  };

  const fetchOrderDetails = async (orderName: string, orderStatus?: string) => {
    if (!orderName || orderName === 'undefined') {
      console.error('Invalid order name:', orderName);
      return;
    }
    
    try {
      const response = await fetch("/api/sales-order/" + orderName);
      const data = await response.json();
      
      if (data.success) {
        const order = data.data;
        setEditingOrder(order);
        setCurrentOrderStatus(orderStatus || order.status || '');
        setFormData({
          customer: order.customer,
          transaction_date: order.transaction_date,
          delivery_date: order.delivery_date,
          sales_person: order.sales_person || '',
          items: order.items || [{ item_code: '', item_name: '', qty: 1, rate: 0, amount: 0 }],
        });
        setShowForm(true);
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
      setError('Failed to fetch order details');
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

  const handleCustomerSelect = (customer: { name: string; customer_name: string }) => {
    setFormData({ ...formData, customer: customer.name });
  };

  const handleItemSelect = (item: { item_code: string; item_name: string }) => {
    if (currentItemIndex !== null) {
      const newItems = [...formData.items];
      newItems[currentItemIndex] = {
        ...newItems[currentItemIndex],
        item_code: item.item_code,
        item_name: item.item_name,
      };
      setFormData({ ...formData, items: newItems });
    }
  };

  const handleSalesPersonSelect = (salesPerson: { name: string; full_name: string }) => {
    setFormData({ ...formData, sales_person: salesPerson.full_name });
  };

  const openItemDialog = (index: number) => {
    setCurrentItemIndex(index);
    setShowItemDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');

    try {
      const orderPayload = {
        company: selectedCompany,
        customer: formData.customer,
        transaction_date: formData.transaction_date,
        delivery_date: formData.delivery_date,
        sales_person: formData.sales_person,
        items: formData.items.map(item => ({
          item_code: item.item_code,
          item_name: item.item_name,
          qty: item.qty,
          rate: item.rate,
          amount: item.amount,
        })),
      };

      const response = await fetch('/api/sales-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderPayload),
      });

      const data = await response.json();

      if (data.success) {
        setShowForm(false);
        setFormData({
          customer: '',
          transaction_date: new Date().toISOString().split('T')[0],
          delivery_date: new Date().toISOString().split('T')[0],
          sales_person: '',
          items: [{ item_code: '', item_name: '', qty: 1, rate: 0, amount: 0 }],
        });
        fetchOrders();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Sales Orders</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          New Sales Order
        </button>
      </div>

      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Name
            </label>
            <input
              type="text"
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Search by name..."
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              type="date"
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={dateFilter.from_date}
              onChange={(e) => setDateFilter({ ...dateFilter, from_date: e.target.value })}
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
              onChange={(e) => setDateFilter({ ...dateFilter, to_date: e.target.value })}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setDateFilter({ from_date: '', to_date: '' });
                setNameFilter('');
              }}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold text-gray-900 mb-4">New Sales Order</h3>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Customer
                  </label>
                  <div className="flex mt-1">
                    <input
                      type="text"
                      required
                      className="block w-full border border-gray-300 rounded-l-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      value={formData.customer}
                      onChange={(e) =>
                        setFormData({ ...formData, customer: e.target.value })
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setShowCustomerDialog(true)}
                      className="px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Transaction Date
                  </label>
                  <input
                    type="date"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={formData.transaction_date}
                    onChange={(e) =>
                      setFormData({ ...formData, transaction_date: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Delivery Date
                  </label>
                  <input
                    type="date"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={formData.delivery_date}
                    onChange={(e) =>
                      setFormData({ ...formData, delivery_date: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Sales Person
                  </label>
                  <div className="flex mt-1">
                    <input
                      type="text"
                      className="block w-full border border-gray-300 rounded-l-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      value={formData.sales_person}
                      onChange={(e) =>
                        setFormData({ ...formData, sales_person: e.target.value })
                      }
                      placeholder="Enter sales person name..."
                    />
                    <button
                      type="button"
                      onClick={() => setShowSalesPersonDialog(true)}
                      className="px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-md font-medium text-gray-900">Items</h4>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="bg-green-600 text-white px-3 py-1 rounded-md text-sm hover:bg-green-700"
                  >
                    Add Item
                  </button>
                </div>

                {formData.items.map((item, index) => (
                  <div key={index} className="border border-gray-200 rounded-md p-4 mb-2">
                    <div className="grid grid-cols-5 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700">
                          Item Code
                        </label>
                        <div className="flex mt-1">
                          <input
                            type="text"
                            required
                            className="block w-full border border-gray-300 rounded-l-md shadow-sm py-1 px-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            value={item.item_code}
                            onChange={(e) =>
                              handleItemChange(index, 'item_code', e.target.value)
                            }
                          />
                          <button
                            type="button"
                            onClick={() => openItemDialog(index)}
                            className="px-2 py-1 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700">
                          Item Name
                        </label>
                        <div className="flex mt-1">
                          <input
                            type="text"
                            required
                            className="block w-full border border-gray-300 rounded-l-md shadow-sm py-1 px-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            value={item.item_name}
                            onChange={(e) =>
                              handleItemChange(index, 'item_name', e.target.value)
                            }
                          />
                          <button
                            type="button"
                            onClick={() => openItemDialog(index)}
                            className="px-2 py-1 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700">
                          Quantity
                        </label>
                        <input
                          type="number"
                          required
                          min="1"
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          value={item.qty}
                          onChange={(e) =>
                            handleItemChange(index, 'qty', parseFloat(e.target.value) || 0)
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700">
                          Rate
                        </label>
                        <input
                          type="number"
                          required
                          min="0"
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          value={item.rate}
                          onChange={(e) =>
                            handleItemChange(index, 'rate', parseFloat(e.target.value) || 0)
                          }
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

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading || currentOrderStatus === 'Completed'}
                  className={`${
                    currentOrderStatus === 'Completed'
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  } px-4 py-2 rounded-md disabled:opacity-50`}
                >
                  {formLoading 
                    ? 'Creating...' 
                    : currentOrderStatus === 'Completed' 
                      ? 'Order Completed - Cannot Edit' 
                      : editingOrder 
                        ? 'Update Order' 
                        : 'Create Order'
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      // </div>
 )}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {orders.map((order) => (
            <li 
              key={order.name}
              onClick={() => {
                if (order.name) {
                  fetchOrderDetails(order.name, order.status);
                }
              }}
              className="cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-indigo-600 truncate">
                      {order.name}
                    </p>
                    <p className="mt-1 text-sm text-gray-900">Customer: {order.customer}</p>
                    {order.sales_person && (
                      <p className="mt-1 text-sm text-gray-600">Sales Person: {order.sales_person}</p>
                    )}
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        order.status === 'Submitted'
                          ? 'bg-green-100 text-green-800'
                          : order.status === 'Draft'
                          ? 'bg-yellow-100 text-yellow-800'
                          : order.status === 'Completed'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>
                <div className="mt-2 sm:flex sm:justify-between">
                  <div className="sm:flex">
                    <p className="flex items-center text-sm text-gray-500">
                      Transaction Date: {order.transaction_date}
                    </p>
                    <p className="mt-2 sm:mt-0 sm:ml-6 flex items-center text-sm text-gray-500">
                      Delivery Date: {order.delivery_date}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                    <span className="font-medium">Total: ${order.grand_total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
        {orders.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No sales orders found</p>
          </div>
        )}
      </div>
      
      {/* Customer Selection Dialog */}
      <CustomerDialog
        isOpen={showCustomerDialog}
        onClose={() => setShowCustomerDialog(false)}
        onSelect={handleCustomerSelect}
      />

      {/* Item Selection Dialog */}
      <ItemDialog
        isOpen={showItemDialog}
        onClose={() => setShowItemDialog(false)}
        onSelect={handleItemSelect}
      />

      {/* Sales Person Selection Dialog */}
      <SalesPersonDialog
        isOpen={showSalesPersonDialog}
        onClose={() => setShowSalesPersonDialog(false)}
        onSelect={handleSalesPersonSelect}
      />
      
    </div>
    
  );
}
