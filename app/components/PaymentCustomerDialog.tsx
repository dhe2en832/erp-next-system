'use client';

import { useState, useEffect } from 'react';

interface Customer {
  name: string;
  customer_name: string;
}

interface CustomerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (customer: Customer) => void;
  company?: string; // Add company prop
}

export default function CustomerDialog({ isOpen, onClose, onSelect, company }: CustomerDialogProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchCustomers();
    }
  }, [isOpen, searchTerm, company]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      // Remove company filter temporarily for testing
      // if (company) {
      //   params.append('company', company);
      // }
      
      const response = await fetch(`/api/customers?${params.toString()}`);
      const data = await response.json();
      
      console.log('Customers API Response:', data);
      
      if (data.success) {
        setCustomers(data.data || []);
        console.log('Customers loaded:', data.data?.length || 0, 'items');
      } else {
        console.error('Failed to fetch customers:', data.message);
        setCustomers([]);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (customer: Customer) => {
    onSelect(customer);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Select Customer</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Loading customers...</p>
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No customers found
              {company && (
                <p className="text-xs text-gray-400 mt-2">
                  Company filter: {company}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-2">
                Try refreshing or check your connection
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {customers.map((customer) => (
                <div
                  key={customer.name}
                  onClick={() => handleSelect(customer)}
                  className="p-3 border rounded hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <p className="font-medium text-gray-900">{customer.name}</p>
                  {customer.customer_name && customer.customer_name !== customer.name && (
                    <p className="text-sm text-gray-500">{customer.customer_name}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
