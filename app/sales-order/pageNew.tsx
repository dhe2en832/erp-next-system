'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SalesOrderForm from '../../components/SalesOrderForm';
import CommissionDashboard from '../../components/CommissionDashboard';

interface SalesOrder {
  name: string;
  customer: string;
  transaction_date: string;
  grand_total: number;
  status: string;
  delivery_date: string;
  sales_person?: string;
}

export default function SalesOrderPage() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'create' | 'commission'>('orders');
  const [dateFilter, setDateFilter] = useState({
    from_date: '',
    to_date: '',
  });
  const [nameFilter, setNameFilter] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [error, setError] = useState('');
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
    if (activeTab === 'orders') {
      fetchOrders();
    }
  }, [dateFilter, nameFilter, activeTab]);

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

  const handleOrderCreated = () => {
    // Refresh orders list and switch to orders tab
    fetchOrders();
    setActiveTab('orders');
  };

  if (!selectedCompany) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-yellow-800">No Company Selected</h3>
          <p className="text-yellow-600 mt-2">Please select a company first to manage sales orders.</p>
          <button
            onClick={() => router.push('/select-company')}
            className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
          >
            Select Company
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sales Order Management</h1>
        <p className="text-gray-600">Manage sales orders, create new orders, and track commissions</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('orders')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'orders'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Sales Orders
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'create'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Create Order
          </button>
          <button
            onClick={() => setActiveTab('commission')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'commission'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Commission Dashboard
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'orders' && (
        <div>
          {/* Filters */}
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                <input
                  type="date"
                  value={dateFilter.from_date}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, from_date: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                <input
                  type="date"
                  value={dateFilter.to_date}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, to_date: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Order Name</label>
                <input
                  type="text"
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.target.value)}
                  placeholder="Search by order name..."
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={fetchOrders}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Search
                </button>
              </div>
            </div>
          </div>

          {/* Orders List */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Sales Orders</h3>
            </div>
            {loading ? (
              <div className="p-6 text-center">
                <div className="text-gray-500">Loading sales orders...</div>
              </div>
            ) : error ? (
              <div className="p-6 text-center">
                <div className="text-red-500">{error}</div>
              </div>
            ) : orders.length === 0 ? (
              <div className="p-6 text-center">
                <div className="text-gray-500">No sales orders found</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Order #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Delivery Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {orders.map((order) => (
                      <tr key={order.name} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {order.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {order.customer}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {order.transaction_date}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {order.delivery_date}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          Rp {order.grand_total.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            order.status === 'Submitted' ? 'bg-green-100 text-green-800' :
                            order.status === 'Draft' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'create' && (
        <div>
          <SalesOrderForm onOrderCreated={handleOrderCreated} />
        </div>
      )}

      {activeTab === 'commission' && (
        <div>
          <CommissionDashboard />
        </div>
      )}
    </div>
  );
}
