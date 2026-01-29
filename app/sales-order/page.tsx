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
  warehouse: string;
  stock_uom: string;
  available_stock: number;
  actual_stock?: number;
  reserved_stock?: number;
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
    transaction_date: '',
    delivery_date: '',
    sales_person: '',
    items: [{ item_code: '', item_name: '', qty: 1, rate: 0, amount: 0, warehouse: '', stock_uom: '', available_stock: 0 }],
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
      items: [{ item_code: '', item_name: '', qty: 1, rate: 0, amount: 0, warehouse: '', stock_uom: '', available_stock: 0 }],
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
        { item_code: '', item_name: '', qty: 1, rate: 0, amount: 0, warehouse: '', stock_uom: '', available_stock: 0 },
      ],
    });
  };

  const handleRemoveItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const resetForm = () => {
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      customer: '',
      transaction_date: today,
      delivery_date: today,
      sales_person: '',
      items: [{ item_code: '', item_name: '', qty: 1, rate: 0, amount: 0, warehouse: '', stock_uom: '', available_stock: 0 }],
    });
    setError('');
    setEditingOrder(null);
    setCurrentOrderStatus('');
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

  const handleItemSelect = async (item: { item_code: string; item_name: string; stock_uom?: string }) => {
    console.log('Item selected:', item);
    if (currentItemIndex !== null) {
      const newItems = [...formData.items];
      
      // Fetch item price tanpa company filter (company tidak diizinkan di ERPNext)
      let rate = 0;
      try {
        const priceResponse = await fetch(`/api/item-price?item_code=${item.item_code}`);
        const priceResult = await priceResponse.json();
        
        if (priceResult.success) {
          rate = priceResult.data.price_list_rate;
          console.log('Item price fetched:', priceResult.data);
        } else {
          console.log('No price found, using default rate 0');
        }
      } catch (error) {
        console.error('Failed to fetch item price:', error);
      }
      
      // Get current item to preserve existing fields
      const currentItem = formData.items[currentItemIndex];
      console.log('Current item before update:', currentItem);
      
      newItems[currentItemIndex] = {
        ...currentItem, // Preserve all existing fields from current form state
        item_code: item.item_code,
        item_name: item.item_name,
        stock_uom: item.stock_uom || '',
        rate: rate,
      };
      // Update amount
      newItems[currentItemIndex].amount = newItems[currentItemIndex].qty * newItems[currentItemIndex].rate;
      
      console.log('Updated item before stock check:', newItems[currentItemIndex]);
      
      setFormData({ ...formData, items: newItems });
      
      // Check stock for selected item - pass the updated item
      checkItemStock(item.item_code, currentItemIndex, newItems[currentItemIndex]);
    }
  };

  const checkItemStock = async (itemCode: string, itemIndex: number, currentItem: any) => {
    console.log('Checking stock for item:', itemCode, 'at index:', itemIndex);
    console.log('Current item passed to stock check:', currentItem);
    
    try {
      const response = await fetch(`/api/stock-check?item_code=${itemCode}`);
      const data = await response.json();
      
      console.log('Stock check response:', data);
      
      if (!data.error && data.length > 0) {
        // Find warehouse with highest available stock
        const bestWarehouse = data.reduce((prev: any, current: any) => 
          (prev.available >= current.available) ? prev : current
        );
        
        console.log('Best warehouse:', bestWarehouse);
        
        // Update item with warehouse info
        const updatedItem = {
          ...currentItem, // Use the passed item instead of formData
          warehouse: bestWarehouse.warehouse,
          available_stock: bestWarehouse.available,
          actual_stock: bestWarehouse.actual,
          reserved_stock: bestWarehouse.reserved,
        };
        
        console.log('Updated item with warehouse:', updatedItem);
        
        // Update form data with the updated item
        setFormData(prev => ({
          ...prev,
          items: prev.items.map((item, index) => 
            index === itemIndex ? updatedItem : item
          )
        }));
        
        console.log('Form data updated with warehouse');
      } else {
        console.log('No available stock data found, using first warehouse from stock data');
        
        // Set default warehouse
        const defaultWarehouse = data.length > 0 ? data[0].warehouse : 'Stores - E1D';
        const actualStock = data.length > 0 ? data[0].available : 0;
        
        const updatedItem = {
          ...currentItem, // Use the passed item instead of formData
          warehouse: defaultWarehouse,
          available_stock: actualStock,
          actual_stock: data.length > 0 ? data[0].actual : 0,
          reserved_stock: data.length > 0 ? data[0].reserved : 0,
        };
        
        setFormData(prev => ({
          ...prev,
          items: prev.items.map((item, index) => 
            index === itemIndex ? updatedItem : item
          )
        }));
        
        console.log('Set default warehouse from stock database data');
      }
    } catch (error) {
      console.error('Stock check failed:', error);
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
          warehouse: item.warehouse,
        })),
      };

      const response = await fetch('/api/sales-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderPayload),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Order created successfully:', result);
        
        // Reset form and close on success
        resetForm();
        setShowForm(false);
        
        // Refresh orders list
        fetchOrders();
        
        // Show success message (optional)
        alert('Sales Order created successfully!');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create sales order');
      }
    } catch (error) {
      console.error('Error creating order:', error);
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
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
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
                    Customer <span className="text-red-500">*</span>
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
                    Delivery Date <span className="text-red-500">*</span>
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
                    Sales Person <span className="text-red-500">*</span>
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
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700">
                          Item Code <span className="text-red-500">*</span>
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
                      <div className="col-span-3">
                        <label className="block text-xs font-medium text-gray-700">
                          Item Name <span className="text-red-500">*</span>
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
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700">
                          Warehouse
                        </label>
                        <input
                          type="text"
                          readOnly
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm bg-gray-50"
                          value={item.warehouse}
                          placeholder="Auto-select"
                        />
                        {item.warehouse && (
                          <div className="mt-1 p-1 bg-blue-50 border border-blue-200 rounded text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-blue-700">
                                Avail: <span className="font-semibold">{item.available_stock || 0}</span>
                              </span>
                              <span className="text-gray-600">
                                A:{item.actual_stock || 0} R:{item.reserved_stock || 0}
                              </span>
                            </div>
                            {item.available_stock <= 0 && (
                              <div className="text-xs text-orange-600">⚠️ Out of stock</div>
                            )}
                            {item.available_stock > 0 && item.available_stock < 10 && (
                              <div className="text-xs text-yellow-600">⚠️ Low stock ({item.available_stock})</div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="col-span-1">
                        <label className="block text-xs font-medium text-gray-700">
                          Qty <span className="text-red-500">*</span>
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
                      <div className="col-span-1">
                        <label className="block text-xs font-medium text-gray-700">
                          UoM
                        </label>
                        <input
                          type="text"
                          readOnly
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm bg-gray-50"
                          value={item.stock_uom}
                          placeholder="Auto"
                        />
                      </div>
                      <div className="col-span-1">
                        <label className="block text-xs font-medium text-gray-700">
                          Rate
                        </label>
                        <input
                          type="text"
                          readOnly
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm bg-gray-50 text-right"
                          value={item.rate ? item.rate.toLocaleString('id-ID') : '0'}
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700">
                          Amount
                        </label>
                        <input
                          type="text"
                          readOnly
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm bg-gray-50 text-right"
                          value={item.amount ? item.amount.toLocaleString('id-ID') : '0'}
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

              {/* Totals Section */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-end">
                  <div className="grid grid-cols-2 gap-8 text-sm">
                    <div className="text-right">
                      <div className="text-gray-600">Total Quantity:</div>
                      <div className="font-semibold text-gray-900">
                        {formData.items.reduce((sum, item) => sum + item.qty, 0).toLocaleString('id-ID')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-gray-600">Total Amount:</div>
                      <div className="font-semibold text-lg text-gray-900">
                        Rp {formData.items.reduce((sum, item) => sum + item.amount, 0).toLocaleString('id-ID')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setShowForm(false);
                  }}
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
