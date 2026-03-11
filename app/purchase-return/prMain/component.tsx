'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PurchaseReceiptDialog from '../../../components/purchase-return/PurchaseReceiptDialog';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { formatDate, parseDate } from '../../../utils/format';
import { handleERPNextError } from '../../../utils/erpnext-error-handler';
import BrowserStyleDatePicker from '../../../components/BrowserStyleDatePicker';
import { useToast } from '../../../lib/toast-context';
import { 
  PurchaseReturnFormData, 
  PurchaseReturnFormItem, 
  PurchaseReceipt, 
  PurchaseReturn,
  ReturnReason 
} from '../../../types/purchase-return';

export const dynamic = 'force-dynamic';

export default function PurchaseReturnMain() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnName = searchParams.get('name');
  const toast = useToast();

  // State management
  const [loading, setLoading] = useState(!!returnName);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [editingReturn, setEditingReturn] = useState<PurchaseReturn | null>(null);
  const [currentStatus, setCurrentStatus] = useState<string>('');
  const [error, setError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const isSubmitting = useRef(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [itemErrors, setItemErrors] = useState<Record<number, { qty?: string; reason?: string; notes?: string }>>({});
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Form data state
  const [formData, setFormData] = useState<PurchaseReturnFormData>({
    supplier: '',
    supplier_name: '',
    posting_date: formatDate(new Date()),
    purchase_receipt: '',
    custom_notes: '',
    items: [],
  });

  // Dialog state
  const [selectedReceipt, setSelectedReceipt] = useState<PurchaseReceipt | null>(null);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);

  // Get company on mount
  useEffect(() => {
    let savedCompany = localStorage.getItem('selected_company');
    if (!savedCompany) {
      const cookies = document.cookie.split(';');
      const companyCookie = cookies.find(cookie => cookie.trim().startsWith('selected_company='));
      if (companyCookie) {
        savedCompany = companyCookie.split('=')[1];
        if (savedCompany) localStorage.setItem('selected_company', savedCompany);
      }
    }
    if (savedCompany) setSelectedCompany(savedCompany);
  }, []);

  // Fetch return details in edit/view mode
  useEffect(() => {
    if (returnName && selectedCompany) {
      fetchReturnDetails(returnName);
    }
  }, [returnName, selectedCompany]);

  const fetchReturnDetails = async (name: string) => {
    if (!name || name === 'undefined') return;
    setLoading(true);
    try {
      const response = await fetch(`/api/purchase/purchase-return/${name}?company=${encodeURIComponent(selectedCompany)}`);
      const data = await response.json();
      if (data.success) {
        const returnDoc = data.data;
        setEditingReturn(returnDoc);
        setCurrentStatus(returnDoc.status || '');

        // Map return items to form items (qty is negative in backend, make positive for display)
        const mappedItems: PurchaseReturnFormItem[] = (returnDoc.items || []).map((item: any) => ({
          item_code: item.item_code || '',
          item_name: item.item_name || '',
          qty: Math.abs(item.qty || 0), // Convert negative to positive for display
          rate: item.rate || 0,
          amount: Math.abs(item.amount || 0), // Convert negative to positive for display
          uom: item.uom || '',
          warehouse: item.warehouse || '',
          purchase_receipt_item: item.purchase_receipt_item || '',
          received_qty: item.received_qty || 0,
          returned_qty: item.returned_qty || 0,
          remaining_qty: item.received_qty || 0,
          return_reason: item.custom_return_reason || '',
          return_notes: item.custom_return_item_notes || '',
          selected: true,
        }));

        setFormData({
          supplier: returnDoc.supplier || '',
          supplier_name: returnDoc.supplier_name || '',
          posting_date: formatDate(returnDoc.posting_date),
          purchase_receipt: returnDoc.return_against || '',
          custom_notes: returnDoc.custom_return_notes || '',
          items: mappedItems,
        });
      } else {
        setError('Gagal memuat detail retur pembelian');
      }
    } catch (err) {
      console.error('Error fetching return details:', err);
      setError('Gagal memuat detail retur pembelian');
    } finally {
      setLoading(false);
    }
  };

  const handleReceiptSelect = async (receipt: PurchaseReceipt) => {
    setSelectedReceipt(receipt);
    setFormLoading(true);
    setError('');
    
    try {
      // Fetch full receipt details with items
      const response = await fetch(`/api/purchase/receipts/${receipt.name}?company=${encodeURIComponent(selectedCompany)}`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const fullReceipt = data.data;
        
        // Map receipt items to form items
        const mappedItems: PurchaseReturnFormItem[] = (fullReceipt.items || []).map((item: any) => ({
          item_code: item.item_code,
          item_name: item.item_name,
          qty: 0, // User will enter return quantity
          rate: item.rate,
          amount: 0,
          uom: item.uom,
          warehouse: item.warehouse,
          purchase_receipt_item: item.name,
          received_qty: item.qty,
          returned_qty: item.returned_qty || 0,
          remaining_qty: item.qty - (item.returned_qty || 0),
          return_reason: '',
          return_notes: '',
          selected: false,
        }));

        setFormData({
          supplier: fullReceipt.supplier,
          supplier_name: fullReceipt.supplier_name,
          posting_date: formatDate(new Date()),
          purchase_receipt: fullReceipt.name,
          custom_notes: '',
          items: mappedItems,
        });

        // Close dialog
        setShowReceiptDialog(false);
      } else {
        setError('Gagal memuat detail tanda terima pembelian');
      }
    } catch (err) {
      console.error('Error fetching receipt details:', err);
      setError('Gagal memuat detail tanda terima pembelian');
    } finally {
      setFormLoading(false);
    }
  };

  const handleItemChange = (index: number, field: keyof PurchaseReturnFormItem, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Recalculate amount when qty or rate changes
    if (field === 'qty' || field === 'rate') {
      newItems[index].amount = newItems[index].qty * newItems[index].rate;
    }
    
    setFormData({ ...formData, items: newItems });
    
    // Clear inline errors when field is corrected
    const newItemErrors = { ...itemErrors };
    
    if (field === 'qty') {
      const qty = value as number;
      if (qty > 0 && qty <= newItems[index].remaining_qty) {
        if (newItemErrors[index]) {
          delete newItemErrors[index].qty;
          if (Object.keys(newItemErrors[index]).length === 0) {
            delete newItemErrors[index];
          }
        }
      } else if (qty <= 0) {
        newItemErrors[index] = { ...newItemErrors[index], qty: 'Jumlah harus lebih besar dari 0' };
      } else if (qty > newItems[index].remaining_qty) {
        newItemErrors[index] = { ...newItemErrors[index], qty: `Jumlah melebihi sisa yang dapat diretur (${newItems[index].remaining_qty})` };
      }
    }
    
    if (field === 'return_reason') {
      const reason = value as string;
      if (reason) {
        if (newItemErrors[index]) {
          delete newItemErrors[index].reason;
          if (Object.keys(newItemErrors[index]).length === 0) {
            delete newItemErrors[index];
          }
        }
      } else {
        newItemErrors[index] = { ...newItemErrors[index], reason: 'Alasan retur harus dipilih' };
      }
      
      // Clear notes if reason is not "Other"
      if (reason !== 'Other') {
        if (newItemErrors[index]) {
          delete newItemErrors[index].notes;
          if (Object.keys(newItemErrors[index]).length === 0) {
            delete newItemErrors[index];
          }
        }
      }
    }
    
    if (field === 'return_notes') {
      const notes = value as string;
      if (newItems[index].return_reason === 'Other') {
        if (notes && notes.trim()) {
          if (newItemErrors[index]) {
            delete newItemErrors[index].notes;
            if (Object.keys(newItemErrors[index]).length === 0) {
              delete newItemErrors[index];
            }
          }
        } else {
          newItemErrors[index] = { ...newItemErrors[index], notes: 'Catatan wajib diisi untuk alasan "Lainnya"' };
        }
      }
    }
    
    setItemErrors(newItemErrors);
  };

  const handleItemSelect = (index: number, selected: boolean) => {
    const newItems = [...formData.items];
    newItems[index].selected = selected;
    
    // Reset qty when deselecting
    if (!selected) {
      newItems[index].qty = 0;
      newItems[index].amount = 0;
      newItems[index].return_reason = '';
      newItems[index].return_notes = '';
      
      // Clear errors for deselected item
      const newItemErrors = { ...itemErrors };
      if (newItemErrors[index]) {
        delete newItemErrors[index];
        setItemErrors(newItemErrors);
      }
    }
    
    setFormData({ ...formData, items: newItems });
  };

  const calculateTotal = () => {
    return formData.items
      .filter(item => item.selected)
      .reduce((sum, item) => sum + item.amount, 0);
  };

  const calculateTotalItems = () => {
    return formData.items.filter(item => item.selected && item.qty > 0).length;
  };

  const validateForm = (): boolean => {
    // Clear previous errors
    setFieldErrors({});
    setItemErrors({});
    
    let hasErrors = false;
    const newFieldErrors: Record<string, string> = {};
    const newItemErrors: Record<number, { qty?: string; reason?: string; notes?: string }> = {};

    // Validate purchase receipt selection
    if (!formData.purchase_receipt) {
      newFieldErrors.purchase_receipt = 'Tanda terima pembelian harus dipilih';
      hasErrors = true;
    }

    // Validate at least one item is selected
    const selectedItems = formData.items.filter(item => item.selected && item.qty > 0);
    if (selectedItems.length === 0) {
      setError('Minimal satu item harus dipilih untuk diretur dengan jumlah > 0');
      hasErrors = true;
    }

    // Validate each selected item
    formData.items.forEach((item, index) => {
      if (item.selected) {
        // Validate quantity
        if (item.qty <= 0) {
          newItemErrors[index] = { ...newItemErrors[index], qty: 'Jumlah harus lebih besar dari 0' };
          hasErrors = true;
        } else if (item.qty > item.remaining_qty) {
          newItemErrors[index] = { ...newItemErrors[index], qty: `Jumlah melebihi sisa yang dapat diretur (${item.remaining_qty})` };
          hasErrors = true;
        }

        // Validate return reason
        if (!item.return_reason) {
          newItemErrors[index] = { ...newItemErrors[index], reason: 'Alasan retur harus dipilih' };
          hasErrors = true;
        }

        // Validate notes for "Other" reason
        if (item.return_reason === 'Other' && (!item.return_notes || !item.return_notes.trim())) {
          newItemErrors[index] = { ...newItemErrors[index], notes: 'Catatan wajib diisi untuk alasan "Lainnya"' };
          hasErrors = true;
        }
      }
    });

    // Set errors
    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
    }
    if (Object.keys(newItemErrors).length > 0) {
      setItemErrors(newItemErrors);
    }

    return !hasErrors;
  };

  const handleSave = async () => {
    // Validate form
    const isValid = validateForm();
    if (!isValid) {
      if (!error) {
        setError('Silakan perbaiki kesalahan pada form');
      }
      return;
    }

    // Prevent double submission
    if (isSubmitting.current) return;
    isSubmitting.current = true;

    setFormLoading(true);
    setError('');

    try {
      // Prepare request body
      const selectedItems = formData.items.filter(item => item.selected && item.qty > 0);
      const requestBody = {
        company: selectedCompany,
        supplier: formData.supplier,
        posting_date: parseDate(formData.posting_date), // Convert DD/MM/YYYY to YYYY-MM-DD
        return_against: formData.purchase_receipt,
        items: selectedItems.map(item => ({
          item_code: item.item_code,
          item_name: item.item_name,
          qty: item.qty, // API will convert to negative
          rate: item.rate,
          amount: item.amount,
          warehouse: item.warehouse,
          purchase_receipt_item: item.purchase_receipt_item,
          custom_return_reason: item.return_reason,
          custom_return_item_notes: item.return_notes || '',
        })),
        custom_return_notes: formData.custom_notes || '',
      };

      let response;
      if (editingReturn && returnName) {
        // Update existing return
        response = await fetch(`/api/purchase/purchase-return/${returnName}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(requestBody),
        });
      } else {
        // Create new return
        response = await fetch('/api/purchase/purchase-return', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(requestBody),
        });
      }

      const data = await response.json();

      if (response.ok && data.success) {
        // Show success toast
        toast.success(
          'Berhasil',
          data.message || 'Retur pembelian berhasil disimpan'
        );
        
        // Redirect to list after short delay
        setTimeout(() => {
          router.replace('/purchase-return');
        }, 500);
      } else {
        const { bannerMessage } = handleERPNextError(
          data,
          formData.posting_date,
          'Retur Pembelian',
          'Gagal menyimpan retur pembelian'
        );
        setError(bannerMessage);
        toast.error('Gagal', bannerMessage);
      }
    } catch (err) {
      console.error('Error saving return:', err);
      const errorMsg = 'Gagal menyimpan retur pembelian';
      setError(errorMsg);
      toast.error('Gagal', errorMsg);
    } finally {
      setFormLoading(false);
      isSubmitting.current = false;
    }
  };

  const handleCancel = () => {
    router.push('/purchase-return');
  };

  // Submit action
  const handleSubmit = async () => {
    if (!editingReturn) return;

    if (!confirm(`Apakah Anda yakin ingin mengajukan retur pembelian ${editingReturn.name}?`)) {
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/purchase/purchase-return/${editingReturn.name}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingReturn.name }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Berhasil', 'Retur pembelian berhasil diajukan');
        setTimeout(() => {
          router.replace('/purchase-return');
        }, 500);
      } else {
        // Use error handler for ERPNext errors
        if (data._server_messages || data.exc) {
          const { bannerMessage } = handleERPNextError(
            data,
            editingReturn.posting_date,
            'Retur Pembelian',
            'Gagal mengajukan retur pembelian'
          );
          setError(bannerMessage);
          toast.error('Gagal', bannerMessage);
        } else {
          const errorMsg = data.message || 'Gagal mengajukan retur pembelian';
          setError(errorMsg);
          toast.error('Gagal', errorMsg);
        }
      }
    } catch (err) {
      console.error('Error submitting purchase return:', err);
      const errorMsg = 'Gagal terhubung ke server. Silakan periksa koneksi internet Anda dan coba lagi.';
      setError(errorMsg);
      toast.error('Gagal', errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // Cancel action
  const handleCancelDocument = async () => {
    if (!editingReturn) return;

    if (!confirm(`Apakah Anda yakin ingin membatalkan retur pembelian ${editingReturn.name}?`)) {
      return;
    }

    setCancelling(true);
    setError('');

    try {
      const response = await fetch(`/api/purchase/purchase-return/${editingReturn.name}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingReturn.name }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Berhasil', 'Retur pembelian berhasil dibatalkan');
        setTimeout(() => {
          router.replace('/purchase-return');
        }, 500);
      } else {
        // Use error handler for ERPNext errors
        if (data._server_messages || data.exc) {
          const { bannerMessage } = handleERPNextError(
            data,
            editingReturn.posting_date,
            'Retur Pembelian',
            'Gagal membatalkan retur pembelian'
          );
          setError(bannerMessage);
          toast.error('Gagal', bannerMessage);
        } else {
          const errorMsg = data.message || 'Gagal membatalkan retur pembelian';
          setError(errorMsg);
          toast.error('Gagal', errorMsg);
        }
      }
    } catch (err) {
      console.error('Error cancelling purchase return:', err);
      const errorMsg = 'Gagal terhubung ke server. Silakan periksa koneksi internet Anda dan coba lagi.';
      setError(errorMsg);
      toast.error('Gagal', errorMsg);
    } finally {
      setCancelling(false);
    }
  };

  // Show loading spinner while fetching data
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  const isReadOnly = !!(currentStatus && currentStatus !== 'Draft');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {editingReturn ? `Retur Pembelian: ${editingReturn.name}` : 'Buat Retur Pembelian Baru'}
        </h1>
        {currentStatus && (
          <div className="mt-2">
            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
              currentStatus === 'Draft' ? 'bg-yellow-100 text-yellow-800'
              : currentStatus === 'Submitted' ? 'bg-green-100 text-green-800'
              : currentStatus === 'Cancelled' ? 'bg-gray-100 text-gray-800'
              : 'bg-blue-100 text-blue-800'
            }`}>
              {currentStatus}
            </span>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700 whitespace-pre-line">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="bg-white shadow rounded-lg">
        {/* Header Section */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Informasi Retur</h2>
        </div>

        <div className="px-6 py-4 space-y-6">
          {/* Purchase Receipt Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tanda Terima Pembelian <span className="text-red-500">*</span>
            </label>
            {isReadOnly ? (
              <input
                type="text"
                value={formData.purchase_receipt}
                disabled
                className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-100 text-gray-700"
              />
            ) : (
              <div>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={formData.purchase_receipt}
                    disabled
                    placeholder="Pilih tanda terima pembelian..."
                    className={`flex-1 border rounded-md shadow-sm py-2 px-3 bg-gray-50 text-gray-700 ${
                      fieldErrors.purchase_receipt ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  <button
                    onClick={() => setShowReceiptDialog(true)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px] min-w-[44px]"
                  >
                    Pilih Tanda Terima
                  </button>
                </div>
                {fieldErrors.purchase_receipt && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.purchase_receipt}</p>
                )}
              </div>
            )}
          </div>

          {/* Supplier Information (Read-only) */}
          {formData.supplier && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supplier
                </label>
                <input
                  type="text"
                  value={formData.supplier_name}
                  disabled
                  className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-100 text-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tanggal Posting <span className="text-red-500">*</span>
                </label>
                {isReadOnly ? (
                  <input
                    type="text"
                    value={formData.posting_date}
                    disabled
                    className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-100 text-gray-700"
                  />
                ) : (
                  <BrowserStyleDatePicker
                    value={formData.posting_date}
                    onChange={(date) => setFormData({ ...formData, posting_date: date })}
                  />
                )}
              </div>
            </div>
          )}

          {/* Additional Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Catatan Tambahan
            </label>
            <textarea
              value={formData.custom_notes || ''}
              onChange={(e) => setFormData({ ...formData, custom_notes: e.target.value })}
              disabled={isReadOnly}
              rows={3}
              className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
              placeholder="Catatan tambahan (opsional)..."
            />
          </div>
        </div>

        {/* Items Section */}
        {formData.items.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Item Retur</h2>
            
            {/* Items Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pilih
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kode Item
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nama Item
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Jumlah Diterima
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sudah Diretur
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sisa
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Jumlah Retur
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Harga
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Alasan Retur
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {formData.items.map((item, index) => (
                    <tr key={index} className={item.selected ? 'bg-indigo-50' : ''}>
                      {/* Checkbox */}
                      <td className="px-3 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={(e) => handleItemSelect(index, e.target.checked)}
                          disabled={isReadOnly}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded disabled:opacity-50"
                        />
                      </td>
                      
                      {/* Item Code */}
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.item_code}
                      </td>
                      
                      {/* Item Name */}
                      <td className="px-3 py-4 text-sm text-gray-900">
                        {item.item_name}
                      </td>
                      
                      {/* Received Quantity */}
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.received_qty}
                      </td>
                      
                      {/* Returned Quantity */}
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.returned_qty}
                      </td>
                      
                      {/* Remaining Quantity */}
                      <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.remaining_qty}
                      </td>
                      
                      {/* Return Quantity Input */}
                      <td className="px-3 py-4 whitespace-nowrap">
                        <div>
                          <input
                            type="text"
                            value={item.qty > 0 ? item.qty.toLocaleString('id-ID') : ''}
                            onChange={(e) => {
                              // Remove formatting and parse number
                              const rawValue = e.target.value.replace(/\./g, '').replace(/,/g, '.');
                              const numValue = parseFloat(rawValue) || 0;
                              handleItemChange(index, 'qty', numValue);
                            }}
                            disabled={!item.selected || isReadOnly}
                            placeholder="0"
                            className={`w-32 border rounded-md shadow-sm py-1 px-2 text-sm text-right focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:text-gray-500 ${
                              itemErrors[index]?.qty ? 'border-red-500' : 'border-gray-300'
                            }`}
                          />
                          {itemErrors[index]?.qty && (
                            <p className="mt-1 text-xs text-red-600 whitespace-normal">{itemErrors[index].qty}</p>
                          )}
                        </div>
                      </td>
                      
                      {/* Rate */}
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        Rp {item.rate.toLocaleString('id-ID')}
                      </td>
                      
                      {/* Line Total */}
                      <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        Rp {item.amount.toLocaleString('id-ID')}
                      </td>
                      
                      {/* Return Reason Dropdown */}
                      <td className="px-3 py-4 whitespace-nowrap">
                        <div>
                          <select
                            value={item.return_reason}
                            onChange={(e) => handleItemChange(index, 'return_reason', e.target.value)}
                            disabled={!item.selected || isReadOnly}
                            className={`w-40 border rounded-md shadow-sm py-1 px-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:text-gray-500 ${
                              itemErrors[index]?.reason ? 'border-red-500' : 'border-gray-300'
                            }`}
                          >
                            <option value="">Pilih alasan...</option>
                            <option value="Damaged">Rusak</option>
                            <option value="Quality Issue">Masalah Kualitas</option>
                            <option value="Wrong Item">Item Salah</option>
                            <option value="Supplier Request">Permintaan Supplier</option>
                            <option value="Expired">Kadaluarsa</option>
                            <option value="Other">Lainnya</option>
                          </select>
                          {itemErrors[index]?.reason && (
                            <p className="mt-1 text-xs text-red-600 whitespace-normal">{itemErrors[index].reason}</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Conditional Notes Fields */}
            {formData.items.some(item => item.selected && item.return_reason === 'Other') && (
              <div className="mt-6 space-y-4">
                <h3 className="text-sm font-medium text-gray-900">Catatan Tambahan untuk Alasan &quot;Lainnya&quot;</h3>
                {formData.items.map((item, index) => (
                  item.selected && item.return_reason === 'Other' && (
                    <div key={index} className="border border-gray-200 rounded-md p-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {item.item_name} <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={item.return_notes || ''}
                        onChange={(e) => handleItemChange(index, 'return_notes', e.target.value)}
                        disabled={isReadOnly}
                        rows={2}
                        placeholder="Jelaskan alasan retur untuk item ini..."
                        className={`w-full border rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 ${
                          itemErrors[index]?.notes ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {itemErrors[index]?.notes && (
                        <p className="mt-1 text-sm text-red-600">{itemErrors[index].notes}</p>
                      )}
                    </div>
                  )
                ))}
              </div>
            )}
          </div>
        )}

        {/* Summary Section */}
        {formData.items.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">Total Item: {calculateTotalItems()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Total Nilai Retur</p>
                <p className="text-xl font-bold text-gray-900">
                  Rp {calculateTotal().toLocaleString('id-ID')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleCancel}
              className="bg-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 min-h-[44px]"
            >
              {isReadOnly ? 'Kembali' : 'Batal'}
            </button>
            {!isReadOnly && (
              <button
                onClick={handleSave}
                disabled={formLoading}
                className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center min-h-[44px]"
              >
                {formLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Menyimpan...
                  </>
                ) : (
                  'Simpan'
                )}
              </button>
            )}
            {currentStatus === 'Draft' && editingReturn && (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center min-h-[44px]"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Mengajukan...
                  </>
                ) : (
                  'Ajukan'
                )}
              </button>
            )}
            {currentStatus === 'Submitted' && editingReturn && (
              <button
                onClick={handleCancelDocument}
                disabled={cancelling}
                className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center min-h-[44px]"
              >
                {cancelling ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Membatalkan...
                  </>
                ) : (
                  'Batalkan'
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Purchase Receipt Dialog */}
      <PurchaseReceiptDialog
        isOpen={showReceiptDialog}
        onClose={() => setShowReceiptDialog(false)}
        onSelect={handleReceiptSelect}
        selectedCompany={selectedCompany}
        supplierFilter={formData.supplier}
      />
    </div>
  );
}
