'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

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
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce search term
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // 300ms delay
    
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (debouncedSearchTerm.trim()) {
        params.append('search', debouncedSearchTerm.trim());
      }
      if (company) {
        params.append('company', company);
      }
      
      console.log('🔍 Searching customers with term:', debouncedSearchTerm.trim());
      const response = await fetch(`/api/customers?${params.toString()}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `HTTP ${response.status}: ${response.statusText}`;
        console.error('❌ HTTP Error:', {
          status: response.status,
          statusText: response.statusText,
          message: errorData.message
        });
        setError(errorMessage);
        setCustomers([]);
        return;
      }
      
      const data = await response.json();
      
      if (data.success) {
        let customers = data.data || [];
        
        // If server-side search failed, try client-side filtering as fallback
        if (debouncedSearchTerm.trim() && customers.length === 0) {
          console.log('🔄 Server search returned empty, trying client-side filtering...');
          try {
            // Fetch all customers without search
            const allParams = new URLSearchParams();
            if (company) {
              allParams.append('company', company);
            }
            const allResponse = await fetch(`/api/customers?${allParams.toString()}&limit=100`, {
              credentials: 'include'
            });
            if (allResponse.ok) {
              const allData = await allResponse.json();
              if (allData.success && allData.data) {
                const searchTermLower = debouncedSearchTerm.trim().toLowerCase();
                customers = allData.data.filter((customer: Customer) => 
                  customer.name.toLowerCase().includes(searchTermLower) ||
                  customer.customer_name.toLowerCase().includes(searchTermLower)
                );
                console.log('✅ Client-side filtering found:', customers.length, 'customers');
              }
            }
          } catch (fallbackError) {
            console.error('❌ Client-side filtering failed:', fallbackError);
          }
        }
        
        setCustomers(customers);
        console.log('✅ Final customers count:', customers.length);
        setError(null);
      } else {
        const errorMessage = data.message || 'Failed to fetch customers';
        console.error('❌ API Error:', {
          message: data.message,
          status: response.status
        });
        setError(errorMessage);
        setCustomers([]);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error occurred';
      console.error('❌ Network Error:', error);
      setError(errorMessage);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchTerm, company]);

  useEffect(() => {
    if (isOpen) {
      fetchCustomers();
    }
  }, [isOpen, fetchCustomers]);

  const handleSelect = (customer: Customer) => {
    onSelect(customer);
    onClose();
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setError(null);
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
          {searchTerm && (
            <div className="mt-1 text-xs text-gray-500">
              Searching for: &quot;{searchTerm}&quot;
            </div>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Loading customers...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-500">❌ {error}</div>
              <button
                onClick={() => {
                  setError(null);
                  fetchCustomers();
                }}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Try Again
              </button>
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {debouncedSearchTerm.trim() ? 'No customers found matching your search' : 'No customers found'}
              {company && (
                <p className="text-xs text-gray-400 mt-2">
                  Company filter: {company}
                </p>
              )}
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
