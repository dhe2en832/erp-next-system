/**
 * Credit Note Form Component
 * 
 * Handles create, edit, and read-only view modes for Credit Notes
 * 
 * Requirements: 1.2-1.16, 4.1-4.6, 8.1-8.4, 10.3-10.4
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import LoadingButton from '@/components/LoadingButton';
import ErrorDialog from '@/components/ErrorDialog';
import SalesInvoiceDialog from '@/components/credit-note/SalesInvoiceDialog';
import BrowserStyleDatePicker from '@/components/BrowserStyleDatePicker';
import { CreditNote, CreditNoteFormData, CreditNoteFormItem, CreditNoteItem, SalesInvoice, CreditNoteReturnReason } from '@/types/credit-note';
import { validateRequiredFields, validateReturnQuantity, validateReturnReason, validateDateFormat, convertDateToAPIFormat, convertDateToDisplayFormat } from '@/lib/credit-note-validation';
import { calculateCreditNoteTotal, calculateCreditNoteCommission, calculateRemainingQty } from '@/lib/credit-note-calculation';
import { handleERPNextError } from '@/utils/erpnext-error-handler';
import { formatDate } from '@/utils/format';
import { ArrowLeft, Save, Send, XCircle, Search } from 'lucide-react';

export const dynamic = 'force-dynamic';

const RETURN_REASONS: CreditNoteReturnReason[] = [
  'Damaged',
  'Quality Issue',
  'Wrong Item',
  'Customer Request',
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

export default function CreditNoteMain() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const creditNoteName = searchParams.get('name');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null);
  const [creditNote, setCreditNote] = useState<CreditNote | null>(null);

  // Debug: Track selected invoice for side effects if needed
  useEffect(() => {
    if (selectedInvoice) {
      // Logic for selected invoice side effects could go here
    }
  }, [selectedInvoice]);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [itemErrors, setItemErrors] = useState<Record<number, { qty?: string; reason?: string; notes?: string }>>({});

  const [formData, setFormData] = useState<CreditNoteFormData>({
    customer: '',
    customer_name: '',
    posting_date: formatDate(new Date()),
    sales_invoice: '',
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

  // Load existing Credit Note if name provided
  useEffect(() => {
    if (creditNoteName) {
      loadCreditNote(creditNoteName);
    }
  }, [creditNoteName]);

  const loadCreditNote = async (name: string) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/sales/credit-note/${name}`);
      const data = await response.json();

      if (data.success && data.data) {
        const cn = data.data;
        setCreditNote(cn);

        // Set read-only mode for Submitted/Cancelled
        if (cn.docstatus === 1 || cn.docstatus === 2) {
          setIsReadOnly(true);
        }

        // Populate form data for all modes (needed for display)
        setFormData({
          customer: cn.customer,
          customer_name: cn.customer_name,
          posting_date: convertDateToDisplayFormat(cn.posting_date),
          sales_invoice: cn.return_against,
          custom_notes: cn.return_notes || '',
          items: cn.items.map((item: CreditNoteItem) => ({
            item_code: item.item_code,
            item_name: item.item_name,
            qty: Math.abs(item.qty),
            rate: item.rate,
            amount: Math.abs(item.amount),
            uom: item.uom,
            warehouse: item.warehouse,
            sales_invoice_item: item.si_detail,
            delivered_qty: item.delivered_qty,
            returned_qty: item.returned_qty,
            remaining_qty: calculateRemainingQty(item.delivered_qty, item.returned_qty),
            return_reason: item.custom_return_reason,
            return_notes: item.custom_return_item_notes || '',
            custom_komisi_sales: Math.abs(item.custom_komisi_sales || 0),
            selected: true,
          })),
        });
      } else {
        // Use error handler for ERPNext errors
        if (data._server_messages || data.exc) {
          const { errorMessage: errmsg } = handleERPNextError(
            data,
            '',
            'Credit Note',
            'Gagal memuat Credit Note'
          );
          setError(errmsg);
        } else {
          setError(data.message || 'Gagal memuat credit note');
        }
      }
    } catch (err) {
      console.error('Error loading credit note:', err);
      setError('Gagal terhubung ke server. Silakan periksa koneksi internet Anda dan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleInvoiceSelect = (invoice: SalesInvoice) => {
    setSelectedInvoice(invoice);
    setFormData({
      customer: invoice.customer,
      customer_name: invoice.customer_name,
      posting_date: formatDate(new Date()),
      sales_invoice: invoice.name,
      custom_notes: '',
      items: (invoice.items || []).map(item => ({
        item_code: item.item_code,
        item_name: item.item_name,
        qty: 0,
        rate: item.rate,
        amount: 0,
        uom: item.uom,
        warehouse: item.warehouse,
        sales_invoice_item: item.name,
        delivered_qty: item.qty,
        returned_qty: item.returned_qty || 0,
        remaining_qty: calculateRemainingQty(item.qty, item.returned_qty || 0),
        return_reason: '',
        return_notes: '',
        custom_komisi_sales: item.custom_komisi_sales || 0,
        selected: false,
      })),
    });
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
    
    // Validate quantity inline
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
    newItems[index].return_reason = reason as CreditNoteReturnReason | '';
    if (reason !== 'Other') {
      newItems[index].return_notes = '';
    }
    setFormData({ ...formData, items: newItems });
    
    // Validate reason inline
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
    
    // Validate notes inline for "Other" reason
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
    
    // Validate date format inline
    const newFieldErrors = { ...fieldErrors };
    const validation = validateDateFormat(date);
    if (!validation.valid) {
      newFieldErrors.posting_date = validation.message || 'Format tanggal tidak valid';
    } else {
      delete newFieldErrors.posting_date;
    }
    setFieldErrors(newFieldErrors);
  };

  const calculateTotals = () => {
    const selectedItems = formData.items.filter((item: CreditNoteFormItem) => item.selected && item.qty > 0);
    const grandTotal = calculateCreditNoteTotal(formData.items);
    
    // For existing credit notes (read-only or edit mode), use the stored commission values directly
    // For new credit notes, calculate proportional commission
    const totalCommission = selectedItems.reduce((sum: number, item: CreditNoteFormItem) => {
      if (creditNote) {
        // Existing credit note: use stored commission value (already in form as positive)
        return sum + item.custom_komisi_sales;
      } else {
        // New credit note: calculate proportional commission
        const commission = calculateCreditNoteCommission(
          item.custom_komisi_sales,
          item.qty,
          item.delivered_qty
        );
        return sum + Math.abs(commission);
      }
    }, 0);

    return { grandTotal, totalCommission };
  };

  const handleSave = async () => {
    // Clear previous errors
    setError('');
    setFieldErrors({});
    setItemErrors({});

    // Validate form
    const validation = validateRequiredFields(formData);
    if (!validation.valid) {
      setError(validation.message || 'Validasi gagal');
      return;
    }

    // Validate date format
    const dateValidation = validateDateFormat(formData.posting_date);
    if (!dateValidation.valid) {
      setFieldErrors({ posting_date: dateValidation.message || 'Format tanggal tidak valid' });
      setError('Silakan perbaiki kesalahan pada form');
      return;
    }

    // Validate each selected item and collect errors
    const newItemErrors: Record<number, { qty?: string; reason?: string; notes?: string }> = {};
    let hasErrors = false;

    formData.items.forEach((item, index) => {
      if (item.selected) {
        const qtyValidation = validateReturnQuantity(item.qty, item.remaining_qty);
        if (!qtyValidation.valid) {
          newItemErrors[index] = { ...newItemErrors[index], qty: qtyValidation.message };
          hasErrors = true;
        }

        const reasonValidation = validateReturnReason(item.return_reason, item.return_notes);
        if (!reasonValidation.valid) {
          if (reasonValidation.message?.includes('Alasan retur')) {
            newItemErrors[index] = { ...newItemErrors[index], reason: reasonValidation.message };
          } else {
            newItemErrors[index] = { ...newItemErrors[index], notes: reasonValidation.message };
          }
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
        customer: formData.customer,
        posting_date: convertDateToAPIFormat(formData.posting_date),
        return_against: formData.sales_invoice,
        return_notes: formData.custom_notes,
        items: selectedItems.map(item => ({
          item_code: item.item_code,
          item_name: item.item_name,
          qty: item.qty,
          rate: item.rate,
          amount: item.amount,
          warehouse: item.warehouse,
          sales_invoice_item: item.sales_invoice_item,
          custom_return_reason: item.return_reason,
          custom_return_item_notes: item.return_notes,
          custom_komisi_sales: item.custom_komisi_sales,
        })),
      };

      const response = await fetch('/api/sales/credit-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        alert('✅ Credit Note berhasil disimpan!');
        router.replace('/credit-note');
      } else {
        // Use error handler for ERPNext errors
        if (data._server_messages || data.exc) {
          const { errorMessage: errmsg, bannerMessage } = handleERPNextError(
            data,
            formData.posting_date,
            'Credit Note',
            'Gagal menyimpan Credit Note'
          );
          console.error('ERPNext Error Detail:', errmsg);
          setError(bannerMessage);
        } else {
          setError(data.message || 'Gagal menyimpan credit note');
        }
      }
    } catch (err) {
      console.error('Error saving credit note:', err);
      setError('Gagal terhubung ke server. Silakan periksa koneksi internet Anda dan coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!creditNote) return;

    if (!confirm(`Apakah Anda yakin ingin mengajukan credit note ${creditNote.name}?`)) {
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/sales/credit-note/${creditNote.name}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: creditNote.name }),
      });

      const data = await response.json();

      if (data.success) {
        alert('✅ Credit Note berhasil diajukan!');
        router.replace('/credit-note');
      } else {
        // Use error handler for ERPNext errors
        if (data._server_messages || data.exc) {
          const { errorMessage: errmsg, bannerMessage } = handleERPNextError(
            data,
            creditNote.posting_date,
            'Credit Note',
            'Gagal mengajukan Credit Note'
          );
          console.error('ERPNext Error Detail:', errmsg);
          setError(bannerMessage);
        } else {
          setError(data.message || 'Gagal mengajukan credit note');
        }
      }
    } catch (err) {
      console.error('Error submitting credit note:', err);
      setError('Gagal terhubung ke server. Silakan periksa koneksi internet Anda dan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!creditNote) return;

    if (!confirm(`Apakah Anda yakin ingin membatalkan credit note ${creditNote.name}?`)) {
      return;
    }

    setCancelling(true);
    setError('');

    try {
      const response = await fetch(`/api/sales/credit-note/${creditNote.name}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: creditNote.name }),
      });

      const data = await response.json();

      if (data.success) {
        alert('✅ Credit Note berhasil dibatalkan!');
        router.replace('/credit-note');
      } else {
        // Use error handler for ERPNext errors
        if (data._server_messages || data.exc) {
          const { errorMessage: errmsg, bannerMessage } = handleERPNextError(
            data,
            creditNote.posting_date,
            'Credit Note',
            'Gagal membatalkan Credit Note'
          );
          console.error('ERPNext Error Detail:', errmsg);
          setError(bannerMessage);
        } else {
          setError(data.message || 'Gagal membatalkan credit note');
        }
      }
    } catch (err) {
      console.error('Error cancelling credit note:', err);
      setError('Gagal terhubung ke server. Silakan periksa koneksi internet Anda dan coba lagi.');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Memuat Credit Note..." />;
  }

  const { grandTotal, totalCommission } = calculateTotals();
  const selectedItemsCount = formData.items.filter(item => item.selected && item.qty > 0).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <ErrorDialog isOpen={!!error} title="Error" message={error} onClose={() => setError('')} />
      <SalesInvoiceDialog
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
              onClick={() => router.push('/credit-note')}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {creditNote ? creditNote.name : 'Buat Credit Note Baru'}
              </h1>
              {creditNote && (
                <p className="text-sm text-gray-500 mt-1">
                  Status: {creditNote.docstatus === 0 ? 'Draft' : creditNote.docstatus === 1 ? 'Submitted' : 'Cancelled'}
                </p>
              )}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {creditNote && creditNote.docstatus === 0 && !isReadOnly && (
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
            <h2 className="text-lg font-semibold text-gray-900">Informasi Credit Note</h2>
          </div>

          <div className="px-6 py-6 space-y-6">
            {/* Sales Invoice Selection */}
            {!isReadOnly && !creditNote && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sales Invoice <span className="text-red-500">*</span>
                </label>
                {!formData.sales_invoice ? (
                  <button
                    onClick={() => setShowInvoiceDialog(true)}
                    className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-indigo-500 hover:text-indigo-600 transition-colors"
                  >
                    <Search className="h-5 w-5 mx-auto mb-2" />
                    <span className="text-sm font-medium">Pilih Sales Invoice</span>
                  </button>
                ) : (
                  <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-indigo-900">{formData.sales_invoice}</p>
                        <p className="text-sm text-indigo-700 mt-1">{formData.customer_name}</p>
                      </div>
                      <button
                        onClick={() => {
                          setFormData({
                            customer: '',
                            customer_name: '',
                            posting_date: formatDate(new Date()),
                            sales_invoice: '',
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
            {(isReadOnly || creditNote) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Sales Invoice</label>
                  <p className="text-sm font-semibold text-gray-900">{creditNote?.return_against || formData.sales_invoice}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Customer</label>
                  <p className="text-sm font-semibold text-gray-900">{creditNote?.customer_name || formData.customer_name}</p>
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
                  <p className="text-sm font-semibold text-gray-900">{creditNote?.posting_date}</p>
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
                <p className="text-sm text-gray-900">{creditNote?.custom_return_notes || '-'}</p>
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
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Komisi</th>
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
                          <td className="px-4 py-3 text-right text-sm text-gray-900">{item.delivered_qty || 0}</td>
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
                              type="number"
                              value={item.qty}
                              onChange={(e) => handleItemQtyChange(index, parseFloat(e.target.value) || 0)}
                              disabled={!item.selected}
                              min="0"
                              max={item.remaining_qty || 0}
                              step="0.01"
                              className={`w-24 px-2 py-1 text-sm text-right border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 ${
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
                      <td className="px-4 py-3 text-right text-sm font-medium text-red-600">
                        -{formatCurrency(item.custom_komisi_sales)}
                      </td>
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
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Nilai Retur:</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(grandTotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Komisi Dikembalikan:</span>
                    <span className="font-semibold text-red-600">-{formatCurrency(totalCommission)}</span>
                  </div>
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
            {!isReadOnly && !creditNote && (
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => router.push('/credit-note')}
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
            {creditNote && creditNote.docstatus === 0 && (
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => router.push('/credit-note')}
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
        {isReadOnly && creditNote && (
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">Informasi Audit</h2>
            </div>
            <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Dibuat Oleh</label>
                <p className="text-sm text-gray-900">{creditNote.owner}</p>
                <p className="text-xs text-gray-500">{creditNote.creation}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Diubah Oleh</label>
                <p className="text-sm text-gray-900">{creditNote.modified_by}</p>
                <p className="text-xs text-gray-500">{creditNote.modified}</p>
              </div>
            </div>
          </div>
        )}

        {/* Help Text */}
        {!isReadOnly && formData.sales_invoice && (
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