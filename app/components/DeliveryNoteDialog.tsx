'use client';

import { useState, useEffect, useCallback } from 'react';
import { DeliveryNote } from '@/types/sales-return';
import { Search, X, Package } from 'lucide-react';
import BrowserStyleDatePicker from '@/components/BrowserStyleDatePicker';

interface DeliveryNoteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (deliveryNote: DeliveryNote) => void;
  selectedCompany: string;
  customerFilter?: string;
}

export default function DeliveryNoteDialog({ 
  isOpen, 
  onClose, 
  onSelect, 
  selectedCompany, 
  customerFilter 
}: DeliveryNoteDialogProps) {
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNote, setSelectedNote] = useState<DeliveryNote | null>(null);
  const [error, setError] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterDocNumber, setFilterDocNumber] = useState('');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');

  const fetchDeliveryNotes = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      
      // Build filters array for ERPNext
      const filters: any[] = [
        ['company', '=', selectedCompany],
        ['docstatus', '=', 1], // Only submitted documents
        ['status', '=', 'To Bill'] // Only To Bill status (not Completed or Draft)
      ];

      // Apply customer filter
      if (filterCustomer || customerFilter) {
        filters.push(['customer_name', 'like', `%${filterCustomer || customerFilter}%`]);
      }

      // Apply search term (searches both customer and document number)
      if (searchTerm) {
        // Note: ERPNext doesn't support OR in filters easily, so we'll filter on customer_name
        // and use documentNumber param for document number search
        filters.push(['customer_name', 'like', `%${searchTerm}%`]);
      }

      // Apply document number filter
      if (filterDocNumber) {
        params.set('documentNumber', filterDocNumber);
      }

      // Apply date filters
      if (filterFromDate) {
        params.set('from_date', filterFromDate);
      }
      if (filterToDate) {
        params.set('to_date', filterToDate);
      }

      // Add filters to params
      params.set('filters', JSON.stringify(filters));
      params.set('limit', '50'); // Show more results in dialog
      params.set('start', '0');

      const response = await fetch(`/api/sales/delivery-notes?${params}`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setDeliveryNotes(data.data || []);
      } else {
        setError(data.message || 'Gagal memuat surat jalan');
      }
    } catch {
      setError('Gagal memuat surat jalan');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, searchTerm, customerFilter, filterCustomer, filterDocNumber, filterFromDate, filterToDate]);

  useEffect(() => {
    if (isOpen && selectedCompany) {
      setDeliveryNotes([]);
      setError('');
      fetchDeliveryNotes();
    }
  }, [isOpen, selectedCompany, fetchDeliveryNotes]);

  useEffect(() => {
    if (!isOpen) {
      setDeliveryNotes([]);
      setError('');
      setSelectedNote(null);
      setSearchTerm('');
      setFilterCustomer('');
      setFilterDocNumber('');
      setFilterFromDate('');
      setFilterToDate('');
    }
  }, [isOpen]);

  const handleSelect = () => {
    if (selectedNote) {
      onSelect(selectedNote);
      onClose();
      setSelectedNote(null);
      setSearchTerm('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && selectedNote) {
      handleSelect();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 id="dialog-title" className="text-lg font-medium text-gray-900">
              Pilih Surat Jalan
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Hanya menampilkan surat jalan dengan status "To Bill" yang dapat diretur
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-full p-1"
            aria-label="Tutup dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 border-b border-gray-200 space-y-3 bg-gray-50">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari berdasarkan nama pelanggan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              aria-label="Cari surat jalan"
            />
          </div>

          {/* Filter inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="filter-customer" className="block text-xs font-medium text-gray-700 mb-1">
                Filter Pelanggan
              </label>
              <input
                id="filter-customer"
                type="text"
                placeholder="Nama pelanggan..."
                value={filterCustomer}
                onChange={(e) => setFilterCustomer(e.target.value)}
                className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
            </div>
            <div>
              <label htmlFor="filter-doc-number" className="block text-xs font-medium text-gray-700 mb-1">
                Nomor Surat Jalan
              </label>
              <input
                id="filter-doc-number"
                type="text"
                placeholder="Nomor dokumen..."
                value={filterDocNumber}
                onChange={(e) => setFilterDocNumber(e.target.value)}
                className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
            </div>
          </div>

          {/* Date range filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="filter-from-date" className="block text-xs font-medium text-gray-700 mb-1">
                Dari Tanggal
              </label>
              <BrowserStyleDatePicker
                value={filterFromDate}
                onChange={(value: string) => setFilterFromDate(value)}
                className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                placeholder="DD/MM/YYYY"
              />
            </div>
            <div>
              <label htmlFor="filter-to-date" className="block text-xs font-medium text-gray-700 mb-1">
                Sampai Tanggal
              </label>
              <BrowserStyleDatePicker
                value={filterToDate}
                onChange={(value: string) => setFilterToDate(value)}
                className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                placeholder="DD/MM/YYYY"
              />
            </div>
          </div>

          {/* Apply filters button */}
          <button
            onClick={fetchDeliveryNotes}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded px-2 py-1"
          >
            Terapkan Filter
          </button>
        </div>

        {/* Delivery Notes List */}
        <div className="flex-1 overflow-y-auto" style={{ maxHeight: '500px' }}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <span className="ml-3 text-sm text-gray-500">Memuat surat jalan...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-500">{error}</p>
              <button
                onClick={fetchDeliveryNotes}
                className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Coba Lagi
              </button>
            </div>
          ) : deliveryNotes.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm font-medium text-gray-900">Tidak Ada Surat Jalan Tersedia</p>
              <p className="mt-1 text-sm text-gray-500">
                Tidak ada surat jalan yang sudah submitted dan dapat diretur.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {deliveryNotes.map((note) => (
                <div
                  key={note.name}
                  onClick={() => setSelectedNote(note)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedNote(note);
                    }
                  }}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 ${
                    selectedNote?.name === note.name ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''
                  }`}
                  role="button"
                  tabIndex={0}
                  aria-pressed={selectedNote?.name === note.name}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-indigo-600">{note.name}</p>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          note.status === 'To Bill' ? 'bg-green-100 text-green-800'
                          : note.status === 'Completed' ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                        }`}>
                          {note.status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-900">Pelanggan: {note.customer_name}</p>
                      <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                        <span>Tanggal: {note.posting_date}</span>
                        {note.items && note.items.length > 0 && (
                          <span>{note.items.length} item</span>
                        )}
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      <p className="text-sm font-medium text-gray-900">
                        Rp {note.grand_total ? note.grand_total.toLocaleString('id-ID') : '0'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              {selectedNote ? (
                <span>Dipilih: <strong>{selectedNote.name}</strong> - {selectedNote.customer_name}</span>
              ) : (
                <span>{deliveryNotes.length} surat jalan tersedia</span>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Batal
              </button>
              <button
                onClick={handleSelect}
                disabled={!selectedNote}
                className={`px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  selectedNote
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Pilih Surat Jalan
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
