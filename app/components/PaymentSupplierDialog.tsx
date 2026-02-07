'use client';

import { useState, useEffect, useCallback } from 'react';

interface Supplier {
  name: string;
  supplier_name: string;
}

interface SupplierDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (supplier: Supplier) => void;
  company?: string; // Add company prop
}

export default function SupplierDialog({ isOpen, onClose, onSelect, company }: SupplierDialogProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      if (company) {
        params.append('company', company);
      }
      
      const response = await fetch(`/api/suppliers?${params.toString()}`, {
        credentials: 'include'
      });
      const data = await response.json();
      
      console.log('Suppliers API Response:', data);
      
      if (data.success) {
        setSuppliers(data.data || []);
      } else {
        console.error('Failed to fetch suppliers:', data.message);
        setSuppliers([]);
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, company]);

  useEffect(() => {
    if (isOpen) {
      fetchSuppliers();
    }
  }, [isOpen, fetchSuppliers]);

  const handleSelect = (supplier: Supplier) => {
    onSelect(supplier);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Select Supplier</h3>
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
            placeholder="Search suppliers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Loading suppliers...</p>
            </div>
          ) : suppliers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No suppliers found
              {company && (
                <p className="text-xs text-gray-400 mt-2">
                  Company filter: {company}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {suppliers.map((supplier) => (
                <div
                  key={supplier.name}
                  onClick={() => handleSelect(supplier)}
                  className="p-3 border rounded hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <p className="font-medium text-gray-900">{supplier.name}</p>
                  {supplier.supplier_name && supplier.supplier_name !== supplier.name && (
                    <p className="text-sm text-gray-500">{supplier.supplier_name}</p>
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
