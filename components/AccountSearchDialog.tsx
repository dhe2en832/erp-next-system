'use client';

import { useState, useMemo } from 'react';

interface Account {
  name: string;
  account_name: string;
  account_type?: string;
}

interface AccountSearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (account: string) => void;
  accounts: Account[];
  title?: string;
  currentValue?: string;
}

export default function AccountSearchDialog({
  isOpen,
  onClose,
  onSelect,
  accounts,
  title = 'Pilih Akun',
  currentValue = '',
}: AccountSearchDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAccounts = useMemo(() => {
    if (!searchTerm.trim()) {
      return accounts;
    }

    const term = searchTerm.toLowerCase();
    return accounts.filter((acc) => {
      const accountNumber = acc.name.split(' - ')[0] || '';
      const accountName = acc.account_name || acc.name;
      return (
        accountNumber.toLowerCase().includes(term) ||
        accountName.toLowerCase().includes(term) ||
        acc.name.toLowerCase().includes(term)
      );
    });
  }, [searchTerm, accounts]);

  const handleSelect = (accountName: string) => {
    onSelect(accountName);
    setSearchTerm('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="px-6 py-4 border-b border-gray-200">
          <input
            type="text"
            placeholder="Cari berdasarkan nomor atau nama akun..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            autoFocus
          />
          <p className="mt-2 text-xs text-gray-500">
            Ditemukan {filteredAccounts.length} dari {accounts.length} akun
          </p>
        </div>

        {/* Account List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {filteredAccounts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Tidak ada akun yang ditemukan
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAccounts.map((acc) => {
                const isSelected = acc.name === currentValue;
                return (
                  <button
                    key={acc.name}
                    onClick={() => handleSelect(acc.name)}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                      isSelected
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-900'
                        : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-sm">{acc.name}</div>
                    {acc.account_type && (
                      <div className="text-xs text-gray-500 mt-1">{acc.account_type}</div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}
