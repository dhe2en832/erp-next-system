'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '../components/LoadingSpinner';
import Pagination from '../components/Pagination';

interface Payment {
  name: string;
  payment_type: string;
  party: string;
  party_type: string;
  paid_amount: number;
  received_amount: number;
  status: string;
  posting_date: string;
}

export default function PaymentPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [dateFilter, setDateFilter] = useState({
    from_date: '',
    to_date: '',
  });
  const [selectedCompany, setSelectedCompany] = useState('');
  const [formData, setFormData] = useState({
    payment_type: 'Receive',
    party_type: 'Customer',
    party: '',
    paid_amount: 0,
    received_amount: 0,
    posting_date: new Date().toISOString().split('T')[0],
  });
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingPayment, setEditingPayment] = useState<string | null>(null);
  const [editingPaymentStatus, setEditingPaymentStatus] = useState<string>('');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [pageSize] = useState(20); // 20 records per page
  
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

  const fetchPayments = useCallback(async () => {
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
      const params = new URLSearchParams({
        company: companyToUse,
        // Add pagination parameters
        limit_page_length: pageSize.toString(),
        start: ((currentPage - 1) * pageSize).toString()
      });
      
      // Build filters array for ERPNext - use companyToUse instead of selectedCompany
      const filters = [["company", "=", companyToUse]];
      
      if (dateFilter.from_date) filters.push(["posting_date", ">=", dateFilter.from_date]);
      if (dateFilter.to_date) filters.push(["posting_date", "<=", dateFilter.to_date]);
      
      params.append('filters', JSON.stringify(filters));
      
      const response = await fetch(`/api/payment?${params}`);
      const data = await response.json();

      if (data.success) {
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
        
        setPayments(data.data || []);
        setError('');
      } else {
        setError(data.message || 'Failed to fetch payments');
      }
    } catch (err) {
      setError('Failed to fetch payments');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, currentPage, pageSize, dateFilter.from_date, dateFilter.to_date]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter]);

  const handleEditPayment = async (paymentName: string, paymentStatus?: string) => {
    if (!paymentName || paymentName === 'undefined') {
      console.error('Invalid payment name:', paymentName);
      return;
    }

    try {
      console.log('Fetching payment details for:', paymentName);
      const response = await fetch("/api/get-payment", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentName }),
      });
      const data = await response.json();

      console.log('Payment Detail Response:', data);

      if (data.success) {
        const payment = data.data;
        setFormData({
          payment_type: payment.payment_type,
          party_type: payment.party_type,
          party: payment.party,
          paid_amount: payment.paid_amount,
          received_amount: payment.received_amount,
          posting_date: payment.posting_date,
        });
        setEditingPayment(paymentName);
        setEditingPaymentStatus(paymentStatus || 'Draft');
        setShowForm(true);
        setError('');
      } else {
        setError(data.message || 'Failed to fetch payment details');
      }
    } catch (error) {
      console.error('Error fetching payment details:', error);
      setError('Failed to fetch payment details');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');

    try {
      const paymentPayload = {
        company: selectedCompany,
        ...formData,
        paid_amount: formData.payment_type === 'Pay' ? formData.paid_amount : 0,
        received_amount: formData.payment_type === 'Receive' ? formData.received_amount : 0,
      };

      const response = await fetch('/api/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentPayload),
      });

      const data = await response.json();

      if (data.success) {
        setShowForm(false);
        setFormData({
          payment_type: 'Receive',
          party_type: 'Customer',
          party: '',
          paid_amount: 0,
          received_amount: 0,
          posting_date: new Date().toISOString().split('T')[0],
        });
        fetchPayments();
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
    return <LoadingSpinner message="Loading Payments..." />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Payment Management</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          New Payment
        </button>
      </div>

      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              onClick={() => setDateFilter({ from_date: '', to_date: '' })}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
            >
              Clear Filter
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
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold text-gray-900 mb-4">{editingPayment ? 'Edit Payment' : 'New Payment'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Payment Type
                  </label>
                  <select
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={formData.payment_type}
                    onChange={(e) =>
                      setFormData({ ...formData, payment_type: e.target.value })
                    }
                  >
                    <option value="Receive">Receive</option>
                    <option value="Pay">Pay</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Party Type
                  </label>
                  <select
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={formData.party_type}
                    onChange={(e) =>
                      setFormData({ ...formData, party_type: e.target.value })
                    }
                  >
                    <option value="Customer">Customer</option>
                    <option value="Supplier">Supplier</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {formData.party_type}
                  </label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={formData.party}
                    onChange={(e) =>
                      setFormData({ ...formData, party: e.target.value })
                    }
                  />
                </div>
                {formData.payment_type === 'Receive' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Received Amount
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      value={formData.received_amount}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          received_amount: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Paid Amount
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      value={formData.paid_amount}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          paid_amount: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Posting Date
                  </label>
                  <input
                    type="date"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={formData.posting_date}
                    onChange={(e) =>
                      setFormData({ ...formData, posting_date: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingPayment(null);
                    setEditingPaymentStatus('');
                    setFormData({
                      payment_type: 'Receive',
                      party_type: 'Customer',
                      party: '',
                      paid_amount: 0,
                      received_amount: 0,
                      posting_date: new Date().toISOString().split('T')[0],
                    });
                  }}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading || editingPaymentStatus === 'Submitted'}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {formLoading ? 'Processing...' : (editingPayment ? 'Update Payment' : 'Create Payment')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {payments.map((payment) => (
            <li 
              key={payment.name}
              onClick={() => {
                if (payment.name) {
                  handleEditPayment(payment.name, payment.status);
                }
              }}
              className="cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-indigo-600 truncate">
                      {payment.name}
                    </p>
                    <p className="mt-1 text-sm text-gray-900">
                      {payment.party_type}: {payment.party}
                    </p>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        payment.status === 'Submitted'
                          ? 'bg-green-100 text-green-800'
                          : payment.status === 'Draft'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {payment.status}
                    </span>
                  </div>
                </div>
                <div className="mt-2 sm:flex sm:justify-between">
                  <div className="sm:flex">
                    <p className="flex items-center text-sm text-gray-500">
                      Type: {payment.payment_type}
                    </p>
                    <p className="mt-2 sm:mt-0 sm:ml-6 flex items-center text-sm text-gray-500">
                      Date: {payment.posting_date}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                    {payment.payment_type === 'Receive' ? (
                      <span className="text-green-600">
                        Received: ${payment.received_amount ? payment.received_amount.toFixed(2) : '0.00'}
                      </span>
                    ) : (
                      <span className="text-red-600">
                        Paid: ${payment.paid_amount ? payment.paid_amount.toFixed(2) : '0.00'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
        {payments.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No payments found</p>
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
  );
}
