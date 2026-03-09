/**
 * Debit Note Form Component
 * 
 * Handles create, edit, and read-only view modes for Debit Notes
 * 
 * Requirements: 2.1-2.16, 5.1-5.6, 9.1-9.4, 11.3-11.4
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import LoadingButton from '@/components/LoadingButton';
import ErrorDialog from '@/components/ErrorDialog';
import PurchaseInvoiceDialog from '@/components/debit-note/PurchaseInvoiceDialog';
import BrowserStyleDatePicker from '@/components/BrowserStyleDatePicker';
import { DebitNote, DebitNoteFormData, DebitNoteFormItem, DebitNoteItem, PurchaseInvoice, ReturnReason } from '@/types/debit-note';
import { validateDebitNoteRequiredFields, validateReturnQuantity, validateReturnReason, validateDateFormat, convertDateToAPIFormat, convertDateToDisplayFormat } from '@/lib/purchase-return-validation';
import { calculateTotal, calculateRemainingQty } from '@/lib/purchase-return-calculations';
import { handleERPNextError } from '@/utils/erpnext-error-handler';
import { formatDate } from '@/utils/format';
import { ArrowLeft, Save, Send, XCircle, Search } from 'lucide-react';

export const dynamic = 'force-dynamic';

const RETURN_REASONS: ReturnReason[] = [
  'Damaged',
  'Quality Issue',
  'Wrong Item',
  'Supplier Request',
  'Expired',
  'Other',
];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
};

export default function DebitNoteMain() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const debitNoteName = searchParams.get('name');

  // Subtask 11.1: State management
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<PurchaseInvoice | null>(null);
  const [debitNote, setDebitNote] = useState<DebitNote | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [itemErrors, setItemErrors] = useState<Record<number, { qty?: string; reason?: string; notes?: string }>>({});

  const [formData, setFormData] = useState<DebitNoteFormData>({
    supplier: '',
    supplier_name: '',
    posting_date: formatDate(new Date()),
    purchase_invoice: '',
    custom_notes: '',
    items: [],
  });

  // Get company from localStorage/cookies
  useEffect(() => {
    let savedCompany = localStorage.getItem('selected_company');
    if (!savedCompany) {
      const cookies = document.cookie.split(';');
      const companyCookie = cookies.find(c => c.trim().startsWith('selected_company='));
      if (companyCookie) {
        savedCompany = companyCookie.split('=')[1];
        if (savedCompany) localStorage.setItem('selected_company', savedCompany);
      }
    }
    if (savedCompany) setSelectedCompany(savedCompany);
  }, []);

  // Load existing Debit Note if name provided
  useEffect(() => {
    if (debitNoteName) {
      loadDebitNote(debitNoteName);
    }
  }, [debitNoteName]);

  const loadDebitNote = async (name: string) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/purchase/debit-note/${name}?company=${encodeURIComponent(selectedCompany)}`);
      const data = await response.json();

      if (data.success && data.data) {
        const dn = data.data;
        setDebitNote(dn);

        // Set read-only mode for Submitted/Cancelled
        if (dn.docstatus === 1 || dn.docstatus === 2) {
          setIsReadOnly(true);
        }

        // Populate form data for all modes (needed for display)
        setFormData({
          supplier: dn.supplier,
          supplier_name: dn.supplier_name,
          posting_date: convertDateToDisplayFormat(dn.posting_date),
          purchase_invoice: dn.return_against,
          custom_notes: dn.custom_return_notes || '',
          items: dn.items.map((item: DebitNoteItem) => ({
            item_code: item.item_code,
            item_name: item.item_name,
            qty: Math.abs(item.qty),
            rate: item.rate,
            amount: Math.abs(item.amount),
            uom: item.uom,
            warehouse: item.warehouse,
            purchase_invoice_item: item.pi_detail,
            received_qty: item.received_qty,
            returned_qty: item.returned_qty,
            remaining_qty: calculateRemainingQty(item.received_qty, item.returned_qty),
            return_reason: item.custom_return_reason,
            return_notes: item.custom_return_item_notes || '',
            selected: true,
          })),
        });
      } else {
        // Use error handler for ERPNext errors
        if (data._server_messages || data.exc) {
          const { errorMessage } = handleERPNextError(
            data,
            '',
            'Debit Note',
            'Gagal memuat Debit Note'
          );
          setError(errorMessage);
        } else {
          setError(data.message || 'Gagal memuat debit note');
        }
      }
    } catch (err) {
      console.error('Error loading debit note:', err);
      setError('Gagal terhubung ke server. Silakan periksa koneksi internet Anda dan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  // Subtask 11.3: Document selection and auto-population
  const handleInvoiceSelect = async (invoice: PurchaseInvoice) => {
    setSelectedInvoice(invoice);
    setLoading(true);
    setError('');

    try {
      // Fetch full invoice details via API (Requirement 2.4)
      const response = await fetch(`/api/purchase/invoices?id=${invoice.name}&company=${selectedCompany}`);
      const data = await response.json();

      if (data.success && data.data) {
        const fullInvoice = data.data;
        
        // Auto-populate supplier, posting date, and items (Requirements 7.1, 7.2, 7.7, 14.6)
        setFormData({
          supplier: fullInvoice.supplier,
          supplier_name: fullInvoice.supplier_name,
          posting_date: formatDate(new Date()),
          purchase_invoice: fullInvoice.name,
          custom_notes: '',
          items: (fullInvoice.items || []).map((item: any) => ({
            item_code: item.item_code,
            item_name: item.item_name,
            qty: 0,
            rate: item.rate,
            amount: 0,
            uom: item.uom,
            warehouse: item.warehouse,
            purchase_invoice_item: item.name,
            received_qty: item.qty,
            returned_qty: item.returned_qty || 0,
            remaining_qty: calculateRemainingQty(item.qty, item.returned_qty || 0),
            return_reason: '',
            return_notes: '',
            selected: false, // All items unselected by default (Requirement 14.6)
          })),
        });
      } else {
        // Use error handler for ERPNext errors
        if (data._server_messages || data.exc) {
          const { errorMessage } = handleERPNextError(
            data,
            '',
            'Purchase Invoice',
            'Gagal memuat detail faktur pembelian'
          );
          setError(errorMessage);
        } else {
          setError(data.message || 'Gagal memuat detail faktur pembelian');
        }
      }
    } catch (err) {
      console.error('Error fetching invoice details:', err);
      setError('Gagal terhubung ke server. Silakan periksa koneksi internet Anda dan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleItemSelect = (index: number, selected: boolean) => {
    const newItems = [...formData.items];
    newItems[index].selected = selected;
    if (!selected) {
      newItems[index].qty = 0;
      newItems[index].return_reason = '';
      newItems[index].return_notes = '';
    }
    setFormData({ ...formData, items: newItems });
  };

  const handleItemQtyChange = (index: number, qty: number) => {
    const newItems = [...formData.items];
    newItems[index].qty = qty;
    newItems[index].amount = qty * newItems[index].rate;
    setFormData({ ...formData, items: newItems });
    
    // Subtask 11.2: Validate quantity inline
    const newItemErrors = { ...itemErrors };
    if (qty <= 0) {
      newItemErrors[index] = { ...newItemErrors[index], qty: 'Jumlah harus lebih besar dari 0' };
    } else if (qty > newItems[index].remaining_qty) {
      newItemErrors[index] = { ...newItemErrors[index], qty: `Jumlah melebihi sisa yang dapat diretur (${newItems[index].remaining_qty})` };
    } else {
      if (newItemErrors[index]) {
        delete newItemErrors[index].qty;
        if (Object.keys(newItemErrors[index]).length === 0) {
          delete newItemErrors[index];
        }
      }
    }
    setItemErrors(newItemErrors);
  };

  const handleItemReasonChange = (index: number, reason: string) => {
    const newItems = [...formData.items];
    newItems[index].return_reason = reason as ReturnReason | '';
    if (reason !== 'Other') {
      newItems[index].return_notes = '';
    }
    setFormData({ ...formData, items: newItems });
    
    // Subtask 11.2: Validate reason inline
    const newItemErrors = { ...itemErrors };
    if (!reason) {
      newItemErrors[index] = { ...newItemErrors[index], reason: 'Alasan retur harus dipilih' };
    } else {
      if (newItemErrors[index]) {
        delete newItemErrors[index].reason;
        if (Object.keys(newItemErrors[index]).length === 0) {
          delete newItemErrors[index];
        }
      }
    }
    setItemErrors(newItemErrors);
  };

  const handleItemNotesChange = (index: number, notes: string) => {
    const newItems = [...formData.items];
    newItems[index].return_notes = notes;
    setFormData({ ...formData, items: newItems });
    
    // Subtask 11.2: Validate notes inline for "Other" reason
    const newItemErrors = { ...itemErrors };
    if (newItems[index].return_reason === 'Other' && !notes.trim()) {
      newItemErrors[index] = { ...newItemErrors[index], notes: 'Catatan wajib diisi untuk alasan "Other"' };
    } else {
      if (newItemErrors[index]) {
        delete newItemErrors[index].notes;
        if (Object.keys(newItemErrors[index]).length === 0) {
          delete newItemErrors[index];
        }
      }
    }
    setItemErrors(newItemErrors);
  };

  const handlePostingDateChange = (date: string) => {
    setFormData({ ...formData, posting_date: date });
    
    // Subtask 11.2: Validate date format inline
    const newFieldErrors = { ...fieldErrors };
    const isValid = validateDateFormat(date);
    if (!isValid) {
      newFieldErrors.posting_date = 'Format tanggal tidak valid (DD/MM/YYYY)';
    } else {
      delete newFieldErrors.posting_date;
    }
    setFieldErrors(newFieldErrors);
  };

  const calculateTotals = () => {
    const grandTotal = calculateTotal(formData.items);
    return { grandTotal };
  };

  // Subtask 11.4: Form submission and API integration
  const handleSave = async () => {
    // Clear previous errors
    setError('');
    setFieldErrors({});
    setItemErrors({});

    // Subtask 11.2: Validate form
    const validation = validateDebitNoteRequiredFields(formData);
    if (!validation.isValid) {
      setError(validation.errors.join(', '));
      return;
    }

    // Validate date format
    const isDateValid = validateDateFormat(formData.posting_date);
    if (!isDateValid) {
      setFieldErrors({ posting_date: 'Format tanggal tidak valid (DD/MM/YYYY)' });
      setError('Silakan perbaiki kesalahan pada form');
      return;
    }

    // Validate each selected item and collect errors
    const newItemErrors: Record<number, { qty?: string; reason?: string; notes?: string }> = {};
    let hasErrors = false;

    formData.items.forEach((item, index) => {
      if (item.selected) {
        const isQtyValid = validateReturnQuantity(item.qty, item.remaining_qty);
        if (!isQtyValid) {
          newItemErrors[index] = { ...newItemErrors[index], qty: 'Jumlah retur tidak valid' };
          hasErrors = true;
        }

        const isReasonValid = validateReturnReason(item.return_reason);
        if (!isReasonValid) {
          newItemErrors[index] = { ...newItemErrors[index], reason: 'Alasan retur harus dipilih' };
          hasErrors = true;
        }

        // Validate notes for "Other" reason
        if (item.return_reason === 'Other' && (!item.return_notes || !item.return_notes.trim())) {
          newItemErrors[index] = { ...newItemErrors[index], notes: 'Catatan diperlukan untuk alasan "Other"' };
          hasErrors = true;
        }
      }
    });

    if (hasErrors) {
      setItemErrors(newItemErrors);
      setError('Silakan perbaiki kesalahan pada item yang dipilih');
      return;
    }

    setSaving(true);

    try {
      const selectedItems = formData.items.filter(item => item.selected && item.qty > 0);

      const payload = {
        company: selectedCompany,
        supplier: formData.supplier,
        posting_date: convertDateToAPIFormat(formData.posting_date),
        return_against: formData.purchase_invoice,
        custom_return_notes: formData.custom_notes,
        items: selectedItems.map(item => ({
          item_code: item.item_code,
          item_name: item.item_name,
          qty: item.qty,
          rate: item.rate,
          amount: item.amount,
          warehouse: item.warehouse,
          purchase_invoice_item: item.purchase_invoice_item,
          custom_return_reason: item.return_reason,
          custom_return_item_notes: item.return_notes,
        })),
      };

      let response;
      if (debitNote && debitNoteName) {
        // Update existing draft debit note (Requirement 2.11, 3.8)
        response = await fetch(`/api/purchase/debit-note/${debitNoteName}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        // Create new debit note (Requirement 2.11)
        response = await fetch('/api/purchase/debit-note', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await response.json();

      if (data.success) {
        // Success handling (Requirement 2.12, 3.9, 10.3)
        alert('✅ Debit Note berhasil disimpan!');
        router.replace('/debit-note');
      } else {
        // Error handling (Requirement 2.13, 3.10, 10.1, 10.4)
        if (data._server_messages || data.exc) {
          const { errorMessage, bannerMessage } = handleERPNextError(
            data,
            formData.posting_date,
            'Debit Note',
            'Gagal menyimpan Debit Note'
          );
          setError(bannerMessage);
        } else {
          setError(data.message || 'Gagal menyimpan debit note');
        }
      }
    } catch (err) {
      // Network error handling (Requirement 10.7)
      console.error('Error saving debit note:', err);
      setError('Gagal terhubung ke server. Silakan periksa koneksi internet Anda dan coba lagi.');
    } finally {
      // Disable loading state (Requirement 10.5, 10.6)
      setSaving(false);
    }
  };

  // Subtask 11.5: Submit action
  // Requirements 4.1-4.7: Submit draft debit note
  const handleSubmit = async () => {
    if (!debitNote) return;

    // Requirement 4.2: Display confirmation dialog
    if (!confirm(`Apakah Anda yakin ingin mengajukan debit note ${debitNote.name}?`)) {
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // Requirement 4.3: Send POST request to submit endpoint
      const response = await fetch(`/api/purchase/debit-note/${debitNote.name}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: debitNote.name }),
      });

      const data = await response.json();

      if (data.success) {
        // Requirements 4.4, 4.5: Update status to Submitted and show success message
        alert('✅ Debit Note berhasil diajukan!');
        router.replace('/debit-note');
      } else {
        // Requirement 4.6: Display error message
        if (data._server_messages || data.exc) {
          const { errorMessage, bannerMessage } = handleERPNextError(
            data,
            debitNote.posting_date,
            'Debit Note',
            'Gagal mengajukan Debit Note'
          );
          setError(bannerMessage);
        } else {
          setError(data.message || 'Gagal mengajukan debit note');
        }
      }
    } catch (err) {
      console.error('Error submitting debit note:', err);
      setError('Gagal terhubung ke server. Silakan periksa koneksi internet Anda dan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  // Subtask 11.5: Cancel action
  // Requirements 5.1-5.7: Cancel submitted debit note
  const handleCancel = async () => {
    if (!debitNote) return;

    // Requirement 5.2: Display confirmation dialog
    if (!confirm(`Apakah Anda yakin ingin membatalkan debit note ${debitNote.name}?`)) {
      return;
    }

    setCancelling(true);
    setError('');

    try {
      // Requirement 5.3: Send POST request to cancel endpoint
      const response = await fetch(`/api/purchase/debit-note/${debitNote.name}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: debitNote.name }),
      });

      const data = await response.json();

      if (data.success) {
        // Requirements 5.4, 5.5: Update status to Cancelled and show success message
        alert('✅ Debit Note berhasil dibatalkan!');
        router.replace('/debit-note');
      } else {
        // Requirement 5.6: Display error message
        if (data._server_messages || data.exc) {
          const { errorMessage, bannerMessage } = handleERPNextError(
            data,
            debitNote.posting_date,
            'Debit Note',
            'Gagal membatalkan Debit Note'
          );
          setError(bannerMessage);
        } else {
          setError(data.message || 'Gagal membatalkan debit note');
        }
      }
    } catch (err) {
      console.error('Error cancelling debit note:', err);
      setError('Gagal terhubung ke server. Silakan periksa koneksi internet Anda dan coba lagi.');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Memuat Debit Note..." />;
  }

  const { grandTotal } = calculateTotals();
  const selectedItemsCount = formData.items.filter(item => item.selected && item.qty > 0).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <ErrorDialog isOpen={!!error} title="Error" message={error} onClose={() => setError('')} />
      <PurchaseInvoiceDialog
        isOpen={showInvoiceDialog}
        onClose={() => setShowInvoiceDialog(false)}
        onSelect={handleInvoiceSelect}
        selectedCompany={selectedCompany}
      />

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6 lg:px-8 sticky top-0 z-30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/debit-note')}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {debitNote ? debitNote.name : 'Buat Debit Note Baru'}
              </h1>
              {debitNote && (
                <p className="text-sm text-gray-500 mt-1">
                  Status: {debitNote.docstatus === 0 ? 'Draft' : debitNote.docstatus === 1 ? 'Submitted' : 'Cancelled'}
                </p>
              )}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Requirement 5.1, 5.7: Cancel button only for Submitted documents */}
            {debitNote && debitNote.docstatus === 1 && (
              <LoadingButton
                onClick={handleCancel}
                loading={cancelling}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Batalkan
              </LoadingButton>
            )}
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          
          {/* Header Info */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">Informasi Debit Note</h2>
          </div>

          <div className="px-6 py-6 space-y-6">
            {/* Purchase Invoice Selection */}
            {!isReadOnly && !debitNote && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Purchase Invoice <span className="text-red-500">*</span>
                </label>
                {!formData.purchase_invoice ? (
                  <button
                    onClick={() => setShowInvoiceDialog(true)}
                    className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-indigo-500 hover:text-indigo-600 transition-colors"
                  >
                    <Search className="h-5 w-5 mx-auto mb-2" />
                    <span className="text-sm font-medium">Pilih Purchase Invoice</span>
                  </button>
                ) : (
                  <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-indigo-900">{formData.purchase_invoice}</p>
                        <p className="text-sm text-indigo-700 mt-1">{formData.supplier_name}</p>
                      </div>
                      <button
                        onClick={() => {
                          setFormData({
                            supplier: '',
                            supplier_name: '',
                            posting_date: formatDate(new Date()),
                            purchase_invoice: '',
                            custom_notes: '',
                            items: [],
                          });
                          setSelectedInvoice(null);
                        }}
                        className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                      >
                        Ganti
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Read-only Invoice Info */}
            {(isReadOnly || debitNote) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Purchase Invoice</label>
                  <p className="text-sm font-semibold text-gray-900">{debitNote?.return_against || formData.purchase_invoice}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Supplier</label>
                  <p className="text-sm font-semibold text-gray-900">{debitNote?.supplier_name || formData.supplier_name}</p>
                </div>
              </div>
            )}

            {/* Posting Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tanggal Posting <span className="text-red-500">*</span>
                </label>
                {isReadOnly ? (
                  <p className="text-sm font-semibold text-gray-900">{debitNote?.posting_date}</p>
                ) : (
                  <div>
                    <BrowserStyleDatePicker
                      value={formData.posting_date}
                      onChange={(value: string) => handlePostingDateChange(value)}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="DD/MM/YYYY"
                    />
                    {fieldErrors.posting_date && (
                      <p className="mt-1 text-sm text-red-600">{fieldErrors.posting_date}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Catatan</label>
              {isReadOnly ? (
                <p className="text-sm text-gray-900">{debitNote?.custom_return_notes || '-'}</p>
              ) : (
                <textarea
                  value={formData.custom_notes}
                  onChange={(e) => setFormData({ ...formData, custom_notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Catatan tambahan..."
                />
              )}
            </div>
          </div>
        </div>

        {/* Items Table */}
        {formData.items.length > 0 && (
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">
                Item Retur {!isReadOnly && `(${selectedItemsCount} dipilih)`}
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {!isReadOnly && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pilih</th>}
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                    {!isReadOnly && (
                      <>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty Asli</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sudah Retur</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sisa</th>
                      </>
                    )}
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty Retur</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">UOM</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Harga</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Alasan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {formData.items.map((item, index) => (
                    <tr key={index} className={!isReadOnly && item.selected ? 'bg-indigo-50' : ''}>
                      {!isReadOnly && (
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={(e) => handleItemSelect(index, e.target.checked)}
                            className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                          />
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{item.item_code}</p>
                        <p className="text-xs text-gray-500">{item.item_name}</p>
                      </td>
                      {!isReadOnly && (
                        <>
                          <td className="px-4 py-3 text-right text-sm text-gray-900">{item.received_qty || 0}</td>
                          <td className="px-4 py-3 text-right text-sm text-gray-500">{item.returned_qty || 0}</td>
                          <td className="px-4 py-3 text-right text-sm font-medium text-green-600">{item.remaining_qty || 0}</td>
                        </>
                      )}
                      <td className="px-4 py-3 text-right">
                        {isReadOnly ? (
                          <span className="text-sm font-semibold text-gray-900">{item.qty}</span>
                        ) : (
                          <div>
                            <input
                              type="text"
                              value={item.qty > 0 ? item.qty.toLocaleString('id-ID') : ''}
                              onChange={(e) => {
                                // Remove formatting and parse number
                                const rawValue = e.target.value.replace(/\./g, '').replace(/,/g, '.');
                                const numValue = parseFloat(rawValue) || 0;
                                handleItemQtyChange(index, numValue);
                              }}
                              disabled={!item.selected}
                              placeholder="0"
                              className={`w-32 px-2 py-1 text-sm text-right border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 ${
                                itemErrors[index]?.qty ? 'border-red-500' : 'border-gray-300'
                              }`}
                            />
                            {itemErrors[index]?.qty && (
                              <p className="mt-1 text-xs text-red-600 text-right">{itemErrors[index].qty}</p>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-left text-sm text-gray-700">{item.uom}</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900">{formatCurrency(item.rate)}</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">{formatCurrency(item.amount)}</td>
                      <td className="px-4 py-3">
                        {isReadOnly ? (
                          <div>
                            <span className="text-sm text-gray-900">{item.return_reason}</span>
                            {item.return_notes && (
                              <p className="text-xs text-gray-500 mt-1">{item.return_notes}</p>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div>
                              <select
                                value={item.return_reason}
                                onChange={(e) => handleItemReasonChange(index, e.target.value)}
                                disabled={!item.selected}
                                className={`w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 ${
                                  itemErrors[index]?.reason ? 'border-red-500' : 'border-gray-300'
                                }`}
                              >
                                <option value="">Pilih alasan...</option>
                                {RETURN_REASONS.map(reason => (
                                  <option key={reason} value={reason}>{reason}</option>
                                ))}
                              </select>
                              {itemErrors[index]?.reason && (
                                <p className="mt-1 text-xs text-red-600">{itemErrors[index].reason}</p>
                              )}
                            </div>
                            {item.return_reason === 'Other' && (
                              <div>
                                <input
                                  type="text"
                                  value={item.return_notes}
                                  onChange={(e) => handleItemNotesChange(index, e.target.value)}
                                  placeholder="Catatan wajib untuk 'Other'"
                                  className={`w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                    itemErrors[index]?.notes ? 'border-red-500' : 'border-gray-300'
                                  }`}
                                />
                                {itemErrors[index]?.notes && (
                                  <p className="mt-1 text-xs text-red-600">{itemErrors[index].notes}</p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="flex justify-end">
                <div className="w-full max-w-sm space-y-2">
                  <div className="pt-2 border-t border-gray-300">
                    <div className="flex justify-between">
                      <span className="text-base font-semibold text-gray-900">Grand Total:</span>
                      <span className="text-lg font-bold text-indigo-600">{formatCurrency(grandTotal)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            {!isReadOnly && !debitNote && (
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => router.push('/debit-note')}
                    className="bg-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Batal
                  </button>
                  <LoadingButton
                    onClick={handleSave}
                    loading={saving}
                    disabled={selectedItemsCount === 0}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Simpan
                  </LoadingButton>
                </div>
              </div>
            )}

            {/* Actions - Edit Mode (Draft) */}
            {/* Requirement 4.1, 4.7: Submit button only for Draft documents */}
            {debitNote && debitNote.docstatus === 0 && (
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => router.push('/debit-note')}
                    className="bg-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Batal
                  </button>
                  <LoadingButton
                    onClick={handleSave}
                    loading={saving}
                    disabled={selectedItemsCount === 0}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Simpan
                  </LoadingButton>
                  <LoadingButton
                    onClick={handleSubmit}
                    loading={submitting}
                    className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Ajukan
                  </LoadingButton>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Audit Info - Read-only mode */}
        {isReadOnly && debitNote && (
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">Informasi Audit</h2>
            </div>
            <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Dibuat Oleh</label>
                <p className="text-sm text-gray-900">{debitNote.owner}</p>
                <p className="text-xs text-gray-500">{debitNote.creation}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Diubah Oleh</label>
                <p className="text-sm text-gray-900">{debitNote.modified_by}</p>
                <p className="text-xs text-gray-500">{debitNote.modified}</p>
              </div>
            </div>
          </div>
        )}

        {/* Help Text */}
        {!isReadOnly && formData.purchase_invoice && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              💡 <strong>Petunjuk:</strong> Pilih item yang ingin diretur dengan mencentang checkbox, 
              masukkan jumlah retur, dan pilih alasan retur untuk setiap item.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
