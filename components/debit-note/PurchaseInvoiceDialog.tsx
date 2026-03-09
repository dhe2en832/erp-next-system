'use client';

import { useState, useEffect, useCallback } from 'react';
import { PurchaseInvoice } from '@/types/debit-note';
import { Search, X, FileText } from 'lucide-react';
import BrowserStyleDatePicker from '@/components/BrowserStyleDatePicker';

interface PurchaseInvoiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (invoice: PurchaseInvoice) => void;
  selectedCompany: string;
  supplierFilter?: string;
}

/**
 * Dialog for selecting a paid Purchase Invoice to create a Debit Note
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.7, 14.8
 */
export default function PurchaseInvoiceDialog({ 
  isOpen, 
  onClose, 
  onSelect, 
  selectedCompany, 
  supplierFilter 
}: PurchaseInvoiceDialogProps) {
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<PurchaseInvoice | null>(null);
  const [error, setError] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterDocNumber, setFilterDocNumber] = useState('');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');

  const fetchPurchaseInvoices = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      params.set('company', selectedCompany);
      params.set('limit_page_length', '50'); // Show more results in dialog
      params.set('start', '0');
      params.set('status', 'Paid'); // Only paid invoices can have debit notes

      // Apply supplier filter
      if (filterSupplier || supplierFilter) {
        params.set('search', (filterSupplier || supplierFilter) as string);
      }

      // Apply search term (searches supplier name)
      if (searchTerm) {
        params.set('search', searchTerm);
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

      const response = await fetch(`/api/purchase/invoices?${params}`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Show all paid invoices
        // The actual returnable quantity check will be done when loading invoice details
        setInvoices(data.data || []);
      } else {
        setError(data.message || 'Gagal memuat faktur pembelian');
      }
    } catch {
      setError('Gagal memuat faktur pembelian');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, searchTerm, supplierFilter, filterSupplier, filterDocNumber, filterFromDate, filterToDate]);

  useEffect(() => {
    if (isOpen && selectedCompany) {
      setInvoices([]);
      setError('');
      fetchPurchaseInvoices();
    }
  }, [isOpen, selectedCompany, fetchPurchaseInvoices]);

  useEffect(() => {
    if (!isOpen) {
      setInvoices([]);
      setError('');
      setSelectedInvoice(null);
      setSearchTerm('');
      setFilterSupplier('');
      setFilterDocNumber('');
      setFilterFromDate('');
      setFilterToDate('');
    }
  }, [isOpen]);

  const handleSelect = () => {
    if (selectedInvoice) {
      onSelect(selectedInvoice);
      onClose();
      setSelectedInvoice(null);
      setSearchTerm('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && selectedInvoice) {
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
              Pilih Faktur Pembelian
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Hanya menampilkan faktur yang sudah dibayar dan memiliki item yang dapat diretur
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
              placeholder="Cari berdasarkan nama supplier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              aria-label="Cari faktur pembelian"
            />
          </div>

          {/* Filter inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="filter-supplier" className="block text-xs font-medium text-gray-700 mb-1">
                Filter Supplier
              </label>
              <input
                id="filter-supplier"
                type="text"
                placeholder="Nama supplier..."
                value={filterSupplier}
                onChange={(e) => setFilterSupplier(e.target.value)}
                className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
            </div>
            <div>
              <label htmlFor="filter-doc-number" className="block text-xs font-medium text-gray-700 mb-1">
                Nomor Faktur
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
            onClick={fetchPurchaseInvoices}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded px-2 py-1"
          >
            Terapkan Filter
          </button>
        </div>

        {/* Purchase Invoices List */}
        <div className="flex-1 overflow-y-auto" style={{ maxHeight: '500px' }}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <span className="ml-3 text-sm text-gray-500">Memuat faktur pembelian...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-500">{error}</p>
              <button
                onClick={fetchPurchaseInvoices}
                className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Coba Lagi
              </button>
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm font-medium text-gray-900">Tidak Ada Faktur Tersedia</p>
              <p className="mt-1 text-sm text-gray-500">
                Tidak ada faktur pembelian yang sudah dibayar dan dapat diretur.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {invoices.map((invoice) => (
                <div
                  key={invoice.name}
                  onClick={() => setSelectedInvoice(invoice)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedInvoice(invoice);
                    }
                  }}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 ${
                    selectedInvoice?.name === invoice.name ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''
                  }`}
                  role="button"
                  tabIndex={0}
                  aria-pressed={selectedInvoice?.name === invoice.name}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-indigo-600">{invoice.name}</p>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          invoice.status === 'Paid' ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                        }`}>
                          {invoice.status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-900">Supplier: {invoice.supplier_name}</p>
                      <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                        <span>Tanggal: {invoice.posting_date}</span>
                        {invoice.items && invoice.items.length > 0 && (
                          <span>{invoice.items.length} item</span>
                        )}
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      <p className="text-sm font-medium text-gray-900">
                        Rp {invoice.grand_total ? invoice.grand_total.toLocaleString('id-ID') : '0'}
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
              {selectedInvoice ? (
                <span>Dipilih: <strong>{selectedInvoice.name}</strong> - {selectedInvoice.supplier_name}</span>
              ) : (
                <span>{invoices.length} faktur tersedia</span>
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
                disabled={!selectedInvoice}
                className={`px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  selectedInvoice
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Pilih Faktur
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
