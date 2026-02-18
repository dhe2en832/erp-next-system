'use client';

import { useState, useEffect } from 'react';

interface SalesPerson {
  name: string;
  full_name: string;
  email?: string;
  category: string;
  allocated_percentage?: number;
  allocated_amount?: number;
}

interface SalesPersonDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (salesPerson: SalesPerson) => void;
}

export default function SalesPersonDialog({ isOpen, onClose, onSelect }: SalesPersonDialogProps) {
  const [salesPersons, setSalesPersons] = useState<SalesPerson[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchSalesPersons();
    }
  }, [isOpen, searchTerm]);

  const fetchSalesPersons = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      
      const response = await fetch(`/api/sales/sales-persons?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setSalesPersons(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching sales persons:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (salesPerson: SalesPerson) => {
    onSelect(salesPerson);
    onClose();
    setSearchTerm('');
  };

  // Group sales persons by category
  const groupedSalesPersons = salesPersons.reduce((acc, person) => {
    if (!acc[person.category]) {
      acc[person.category] = [];
    }
    acc[person.category].push(person);
    return acc;
  }, {} as Record<string, SalesPerson[]>);

  // Get category colors
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Kantor':
        return 'bg-green-100 text-green-800';
      case 'Tim Penjualan':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900">Select Sales Person</h3>
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
            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Search sales persons or categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="text-center py-4">
              <div className="text-gray-500">Loading...</div>
            </div>
          ) : salesPersons.length === 0 ? (
            <div className="text-center py-4">
              <div className="text-gray-500">No sales persons found</div>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedSalesPersons).map(([category, persons]) => (
                <div key={category} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center mb-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(category)}`}>
                      {category}
                    </span>
                    <span className="ml-2 text-sm text-gray-500">({persons.length} items)</span>
                  </div>
                  <div className="space-y-2">
                    {persons.map((salesPerson) => (
                      <div
                        key={salesPerson.name}
                        onClick={() => handleSelect(salesPerson)}
                        className="border border-gray-100 rounded-md p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{salesPerson.full_name}</div>
                            <div className="text-sm text-gray-600">ID: {salesPerson.name}</div>
                            {salesPerson.email && (
                              <div className="text-sm text-gray-500">Email: {salesPerson.email}</div>
                            )}
                            {salesPerson.allocated_percentage && (
                              <div className="text-sm text-gray-500">Allocation: {salesPerson.allocated_percentage}%</div>
                            )}
                          </div>
                          <div className="ml-2">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(category)}`}>
                              {category}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
