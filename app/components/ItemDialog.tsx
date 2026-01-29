'use client';

import { useState, useEffect } from 'react';

interface Item {
  item_code: string;
  item_name: string;
  description?: string;
  stock_uom?: string;
}

interface ItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: Item) => void;
}

export default function ItemDialog({ isOpen, onClose, onSelect }: ItemDialogProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchItems();
    }
  }, [isOpen, searchTerm]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) {
        params.append('filters', JSON.stringify([["item_name", "like", `%${searchTerm}%`]]));
      }
      
      const response = await fetch(`/api/items?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setItems(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (item: Item) => {
    onSelect(item);
    onClose();
    setSearchTerm('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-3xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900">Select Item</h3>
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
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="text-center py-4">
              <div className="text-gray-500">Loading...</div>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-4">
              <div className="text-gray-500">No items found</div>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.item_code}
                  onClick={() => handleSelect(item)}
                  className="border border-gray-200 rounded-md p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{item.item_name}</div>
                      <div className="text-sm text-gray-600">Code: {item.item_code}</div>
                      {item.description && (
                        <div className="text-sm text-gray-500 mt-1">{item.description}</div>
                      )}
                    </div>
                    {item.stock_uom && (
                      <div className="text-sm text-gray-500">UOM: {item.stock_uom}</div>
                    )}
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
