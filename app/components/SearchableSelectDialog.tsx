'use client';

import { useState, useEffect } from 'react';

interface SearchableSelectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (value: string) => void;
  title: string;
  placeholder: string;
  options: { name: string }[];
  selectedValue: string;
}

export default function SearchableSelectDialog({ 
  isOpen, 
  onClose, 
  onSelect, 
  title, 
  placeholder, 
  options, 
  selectedValue 
}: SearchableSelectDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState<{ name: string }[]>(options);

  useEffect(() => {
    const filtered = options.filter((option: { name: string }) =>
      option.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredOptions(filtered);
  }, [searchTerm, options]);

  const handleSelect = (value: string) => {
    onSelect(value);
    onClose();
    setSearchTerm('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <div className="mb-4">
          <input
            type="text"
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto border border-gray-200 rounded-md">
          {filteredOptions.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              Tidak ada data yang ditemukan
            </div>
          ) : (
            <div className="max-h-60">
              {filteredOptions.map((option: { name: string }) => (
                <button
                  key={option.name}
                  onClick={() => handleSelect(option.name)}
                  className={`w-full text-left px-4 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-b-0 ${
                    selectedValue === option.name ? 'bg-indigo-50 text-indigo-700' : 'text-gray-900'
                  }`}
                >
                  <div className="font-medium">{option.name}</div>
                  {selectedValue === option.name && (
                    <div className="text-xs text-indigo-600">Sedang dipilih</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}
