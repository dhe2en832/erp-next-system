'use client';

import { useState } from 'react';
import CurrencyInput from '../../components/CurrencyInput';

interface Invoice {
  name: string;
  grand_total: number;
  outstanding_amount: number;
  due_date: string;
  allocated_amount?: number;
}

interface SelectedInvoice {
  invoice_name: string;
  invoice_total: number;
  outstanding_amount: number;
  allocated_amount: number;
}

interface InvoiceAllocationTableProps {
  invoices: Invoice[];
  selectedInvoices: SelectedInvoice[];
  onSelectionChange: (selected: SelectedInvoice[]) => void;
  onAllocationChange: (invoiceName: string, amount: number) => void;
  loading: boolean;
  partyType: 'Customer' | 'Supplier';
}

export default function InvoiceAllocationTable({
  invoices,
  selectedInvoices,
  onSelectionChange,
  onAllocationChange,
  loading,
  partyType,
}: InvoiceAllocationTableProps) {
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);

  const getTotalOutstanding = () => invoices.reduce((sum, inv) => sum + inv.outstanding_amount, 0);
  const getTotalSelected = () => selectedInvoices.reduce((sum, inv) => sum + inv.allocated_amount, 0);

  const handleToggleInvoice = (invoiceName: string, invoice: Invoice) => {
    const isSelected = selectedInvoices.some(s => s.invoice_name === invoiceName);
    
    if (isSelected) {
      const filtered = selectedInvoices.filter(s => s.invoice_name !== invoiceName);
      onSelectionChange(filtered);
    } else {
      const newSelection: SelectedInvoice[] = [
        ...selectedInvoices,
        {
          invoice_name: invoiceName,
          invoice_total: invoice.grand_total,
          outstanding_amount: invoice.outstanding_amount,
          allocated_amount: 0,
        },
      ];
      onSelectionChange(newSelection);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-3 text-gray-500 text-sm">
        Memuat faktur outstanding...
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="text-center py-3 text-gray-500 text-sm">
        Tidak ada faktur outstanding
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header Summary */}
      <div className="flex justify-between items-center text-xs text-gray-600 px-2 py-1 bg-gray-50 rounded">
        <span>{invoices.length} faktur • Total: Rp {getTotalOutstanding().toLocaleString('id-ID')}</span>
        {selectedInvoices.length > 0 && (
          <span className="text-indigo-600 font-medium">{selectedInvoices.length} dipilih • Rp {getTotalSelected().toLocaleString('id-ID')}</span>
        )}
      </div>

      {/* Invoice List */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {invoices.map((invoice) => {
          const isSelected = selectedInvoices.some(s => s.invoice_name === invoice.name);
          const selectedItem = selectedInvoices.find(s => s.invoice_name === invoice.name);
          const isExpanded = expandedInvoice === invoice.name;

          return (
            <div key={invoice.name} className={`border-b last:border-b-0 ${isSelected ? 'bg-indigo-50' : 'bg-white'}`}>
              {/* Main Row */}
              <div className="flex items-center gap-2 p-2 hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleToggleInvoice(invoice.name, invoice)}
                  className="h-4 w-4 text-indigo-600 rounded cursor-pointer"
                />
                
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{invoice.name}</div>
                  <div className="text-xs text-gray-500">Jatuh Tempo: {invoice.due_date}</div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-medium text-gray-900">
                    Rp {invoice.outstanding_amount.toLocaleString('id-ID')}
                  </div>
                </div>

                {isSelected && (
                  <button
                    type="button"
                    onClick={() => setExpandedInvoice(isExpanded ? null : invoice.name)}
                    className="p-1 text-indigo-600 hover:bg-indigo-100 rounded"
                  >
                    <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7-7m0 0L5 14m7-7v12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Allocation Input - Expanded */}
              {isSelected && isExpanded && (
                <div className="px-2 py-2 bg-indigo-50 border-t border-indigo-200">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Jumlah Alokasi</label>
                  <div className="flex items-center gap-2">
                    <CurrencyInput
                      value={selectedItem?.allocated_amount || 0}
                      onChange={(value) => onAllocationChange(invoice.name, value)}
                      placeholder="0"
                      className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded"
                      min={0}
                      max={invoice.outstanding_amount}
                      step="1"
                    />
                    <div className="text-xs text-gray-600 whitespace-nowrap">
                      Max: Rp {invoice.outstanding_amount.toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
