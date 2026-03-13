/**
 * Sales Invoice Dialog Component
 * 
 * Dialog untuk memilih Sales Invoice yang sudah dibayar (Paid)
 * untuk membuat Credit Note
 * 
 * Requirements: 1.3, 1.4
 */

'use client';

import { useState, useEffect } from 'react';
import { X, Search, Loader2 } from 'lucide-react';
import { SalesInvoice } from '@/types/credit-note';

interface SalesInvoiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (invoice: SalesInvoice) => void;
  selectedCompany: string;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
};

export default function SalesInvoiceDialog({
  isOpen,
  onClose,
  onSelect,
  selectedCompany,
}: SalesInvoiceDialogProps) {
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && selectedCompany) {
      fetchPaidInvoices();
    }
     
  }, [isOpen, selectedCompany]);

  const fetchPaidInvoices = async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      params.append('limit_page_length', '50');
      params.append('start', '0');
      
      // Filter: status = Paid, is_return = 0 (bukan Credit Note)
      const filters = [
        ['company', '=', selectedCompany],
        ['status', '=', 'Paid'],
        ['is_return', '=', 0],
        ['docstatus', '=', 1], // Submitted only
      ];
      
      params.append('filters', JSON.stringify(filters));
      params.append('order_by', 'posting_date desc');
      
      // Request fields including items
      params.append('fields', JSON.stringify([
        'name',
        'customer',
        'customer_name',
        'posting_date',
        'status',
        'grand_total',
        'custom_total_komisi_sales',
        'items',
      ]));

      // Fetch through our API proxy
      const response = await fetch(`/api/sales/credit-note/invoices?${params.toString()}`);
      const data = await response.json();

      if (data.success && data.data) {
        // Filter out invoices that already have credit notes
        // Check if invoice has any return (credit note) against it
        const invoicesWithoutReturns = await Promise.all(
          data.data.map(async (invoice: SalesInvoice) => {
            try {
              // Check if there are any credit notes for this invoice
              const checkParams = new URLSearchParams();
              checkParams.append('filters', JSON.stringify([
                ['return_against', '=', invoice.name],
                ['is_return', '=', 1],
              ]));
              checkParams.append('fields', JSON.stringify(['name']));
              checkParams.append('limit_page_length', '1');
              
              const checkResponse = await fetch(`/api/sales/credit-note/invoices?${checkParams.toString()}`);
              const checkData = await checkResponse.json();
              
              // Only include invoice if it has no credit notes
              return checkData.success && (!checkData.data || checkData.data.length === 0) ? invoice : null;
            } catch (err) {
              console.error('Error checking credit notes for invoice:', invoice.name, err);
              return invoice; // Include on error to be safe
            }
          })
        );
        
        setInvoices(invoicesWithoutReturns.filter(inv => inv !== null));
      } else {
        setError('Gagal memuat Sales Invoice');
      }
    } catch (err) {
      console.error('Error fetching paid invoices:', err);
      setError('Gagal memuat Sales Invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (invoice: SalesInvoice) => {
    // Fetch full invoice details including items from Sales Invoice API
    try {
      const response = await fetch(`/api/sales/invoices/${invoice.name}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        onSelect(data.data);
      } else {
        onSelect(invoice); // Fallback to original invoice
      }
    } catch (err) {
      console.error('Error fetching invoice details:', err);
      onSelect(invoice); // Fallback to original invoice
    }
    onClose();
  };

  const filteredInvoices = invoices.filter(inv =>
    inv.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        {/* Dialog */}
        <div className="relative bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">
              Pilih Sales Invoice
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Search */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Cari nomor invoice atau nama customer..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                <span className="ml-3 text-gray-600">Memuat data...</span>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-red-600">{error}</p>
                <button
                  onClick={fetchPaidInvoices}
                  className="mt-4 px-4 py-2 text-sm text-indigo-600 hover:text-indigo-700"
                >
                  Coba Lagi
                </button>
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">
                  {searchTerm
                    ? 'Tidak ada invoice yang cocok dengan pencarian'
                    : 'Tidak ada Sales Invoice dengan status Paid'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredInvoices.map((invoice) => (
                  <button
                    key={invoice.name}
                    onClick={() => handleSelect(invoice)}
                    className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-indigo-600 truncate">
                          {invoice.name}
                        </p>
                        <p className="text-sm text-gray-900 mt-1 truncate">
                          {invoice.customer_name}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>📅 {invoice.posting_date}</span>
                          <span>📦 {invoice.items?.length || 0} item</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          {formatCurrency(invoice.grand_total)}
                        </p>
                        <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                          Paid
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>
                {filteredInvoices.length} invoice ditemukan
              </span>
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
