'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DeliveryNoteDialog from '../../components/DeliveryNoteDialog';
import LoadingSpinner from '../../components/LoadingSpinner';
import PrintDialog from '../../components/PrintDialog';
import { formatDate, parseDate } from '../../../utils/format';
import { handleERPNextError } from '../../../utils/erpnext-error-handler';
import BrowserStyleDatePicker from '../../../components/BrowserStyleDatePicker';
import { 
  SalesReturnFormData, 
  SalesReturnFormItem, 
  DeliveryNote, 
  SalesReturn,
  ReturnReason 
} from '../../../types/sales-return';

export default function SalesReturnMain() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnName = searchParams.get('name');

  // State management
  const [loading, setLoading] = useState(!!returnName);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [editingReturn, setEditingReturn] = useState<SalesReturn | null>(null);
  const [currentStatus, setCurrentStatus] = useState<string>('');
  const [error, setError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [savedDocName, setSavedDocName] = useState('');
  const createdDocName = useRef<string | null>(returnName || null);
  const isSubmitting = useRef(false);

  // Form data state
  const [formData, setFormData] = useState<SalesReturnFormData>({
    customer: '',
    customer_name: '',
    posting_date: formatDate(new Date()),
    delivery_note: '',
    custom_notes: '',
    items: [],
  });

  // Dialog state
  const [selectedDeliveryNote, setSelectedDeliveryNote] = useState<DeliveryNote | null>(null);
  const [showDeliveryNoteDialog, setShowDeliveryNoteDialog] = useState(false);

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
      const response = await fetch(`/api/sales/delivery-note-return/${name}`);
      const data = await response.json();
      if (data.success) {
        const returnDoc = data.data;
        setEditingReturn(returnDoc);
        setCurrentStatus(returnDoc.status || '');

        // Map return items to form items (qty is negative in backend, make positive for display)
        const mappedItems: SalesReturnFormItem[] = (returnDoc.items || []).map((item: any) => ({
          item_code: item.item_code || '',
          item_name: item.item_name || '',
          qty: Math.abs(item.qty || 0), // Convert negative to positive for display
          rate: item.rate || 0,
          amount: Math.abs(item.amount || 0), // Convert negative to positive for display
          uom: item.uom || '',
          warehouse: item.warehouse || '',
          delivery_note_item: item.delivery_note_item || '',
          delivered_qty: item.delivered_qty || 0,
          remaining_qty: item.delivered_qty || 0,
          return_reason: item.return_reason || '',
          return_notes: item.return_item_notes || '', // Note: return_item_notes in backend
          selected: true,
        }));

        setFormData({
          customer: returnDoc.customer || '',
          customer_name: returnDoc.customer_name || '',
          posting_date: formatDate(returnDoc.posting_date),
          delivery_note: returnDoc.delivery_note || '', // return_against in backend
          custom_notes: returnDoc.custom_notes || '', // return_notes in backend
          items: mappedItems,
        });
      } else {
        setError('Gagal memuat detail retur penjualan');
      }
    } catch (err) {
      console.error('Error fetching return details:', err);
      setError('Gagal memuat detail retur penjualan');
    } finally {
      setLoading(false);
    }
  };

  const handleDeliveryNoteSelect = async (deliveryNote: DeliveryNote) => {
    setSelectedDeliveryNote(deliveryNote);
    setFormLoading(true);
    setError('');
    
    try {
      // Fetch full delivery note details with items
      const response = await fetch(`/api/sales/delivery-notes/${deliveryNote.name}`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const fullDN = data.data;
        
        // Map delivery note items to form items
        const mappedItems: SalesReturnFormItem[] = (fullDN.items || []).map((item: any) => ({
          item_code: item.item_code,
          item_name: item.item_name,
          qty: 0, // User will enter return quantity
          rate: item.rate,
          amount: 0,
          uom: item.uom,
          warehouse: item.warehouse,
          delivery_note_item: item.name,
          delivered_qty: item.qty,
          remaining_qty: item.qty, // TODO: Calculate actual remaining qty
          return_reason: '',
          return_notes: '',
          selected: false,
        }));

        setFormData({
          customer: fullDN.customer,
          customer_name: fullDN.customer_name,
          posting_date: formatDate(new Date()),
          delivery_note: fullDN.name,
          custom_notes: '',
          items: mappedItems,
        });

        // Close dialog
        setShowDeliveryNoteDialog(false);
      } else {
        setError('Gagal memuat detail surat jalan');
      }
    } catch (err) {
      console.error('Error fetching delivery note details:', err);
      setError('Gagal memuat detail surat jalan');
    } finally {
      setFormLoading(false);
    }
  };

  const handleItemChange = (index: number, field: keyof SalesReturnFormItem, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Recalculate amount when qty or rate changes
    if (field === 'qty' || field === 'rate') {
      newItems[index].amount = newItems[index].qty * newItems[index].rate;
    }
    
    setFormData({ ...formData, items: newItems });
  };

  const handleItemSelect = (index: number, selected: boolean) => {
    const newItems = [...formData.items];
    newItems[index].selected = selected;
    
    // Reset qty when deselecting
    if (!selected) {
      newItems[index].qty = 0;
      newItems[index].amount = 0;
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

  const validateForm = (): string[] => {
    const errors: string[] = [];

    if (!formData.delivery_note) {
      errors.push('Surat jalan harus dipilih');
    }

    const selectedItems = formData.items.filter(item => item.selected);
    if (selectedItems.length === 0) {
      errors.push('Minimal satu item harus dipilih untuk diretur');
    }

    selectedItems.forEach((item, index) => {
      if (item.qty <= 0) {
        errors.push(`Item ${item.item_name}: Jumlah retur harus lebih dari 0`);
      }
      if (item.qty > item.delivered_qty) {
        errors.push(`Item ${item.item_name}: Jumlah retur melebihi jumlah yang dikirim`);
      }
      if (!item.return_reason) {
        errors.push(`Item ${item.item_name}: Alasan retur harus dipilih`);
      }
      if (item.return_reason === 'Other' && !item.return_notes) {
        errors.push(`Item ${item.item_name}: Catatan tambahan diperlukan untuk alasan "Lainnya"`);
      }
    });

    return errors;
  };

  const handleSave = async () => {
    // Validate form
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setError(validationErrors.join('\n'));
      return;
    }

    setFormLoading(true);
    setError('');

    try {
      // Prepare request body for delivery-note-return API
      const selectedItems = formData.items.filter(item => item.selected && item.qty > 0);
      const requestBody = {
        company: selectedCompany,
        customer: formData.customer,
        posting_date: parseDate(formData.posting_date), // Convert DD/MM/YYYY to YYYY-MM-DD
        return_against: formData.delivery_note, // Note: return_against for backend
        items: selectedItems.map(item => ({
          item_code: item.item_code,
          item_name: item.item_name,
          qty: item.qty, // API will convert to negative
          rate: item.rate,
          amount: item.amount,
          warehouse: item.warehouse,
          delivery_note_item: item.delivery_note_item,
          return_reason: item.return_reason,
          return_item_notes: item.return_notes || '', // Note: return_item_notes for backend
        })),
        return_notes: formData.custom_notes || '', // Note: return_notes for backend
      };

      let response;
      if (editingReturn && returnName) {
        // Update existing return
        response = await fetch(`/api/sales/delivery-note-return/${returnName}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(requestBody),
        });
      } else {
        // Create new return
        response = await fetch('/api/sales/delivery-note-return', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(requestBody),
        });
      }

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccessMessage('Retur penjualan berhasil disimpan');
        setSavedDocName(data.data.name);
        setShowPrintDialog(true);
        createdDocName.current = data.data.name;
      } else {
        const errorMessage = handleERPNextError(data);
        setError(errorMessage);
      }
    } catch (err) {
      console.error('Error saving return:', err);
      setError('Gagal menyimpan retur penjualan');
    } finally {
      setFormLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/sales-return');
  };

  const handlePrintDialogClose = (action: string) => {
    setShowPrintDialog(false);
    if (action === 'list') {
      router.push('/sales-return');
    } else if (action === 'print') {
      // TODO: Implement print functionality
      router.push('/sales-return');
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

  const isReadOnly = currentStatus && currentStatus !== 'Draft';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {editingReturn ? `Retur Penjualan: ${editingReturn.name}` : 'Buat Retur Penjualan Baru'}
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

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">{successMessage}</p>
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
          {/* Delivery Note Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Surat Jalan <span className="text-red-500">*</span>
            </label>
            {isReadOnly ? (
              <input
                type="text"
                value={formData.delivery_note}
                disabled
                className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-100 text-gray-700"
              />
            ) : (
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={formData.delivery_note}
                  disabled
                  placeholder="Pilih surat jalan..."
                  className="flex-1 border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-50 text-gray-700"
                />
                <button
                  onClick={() => setShowDeliveryNoteDialog(true)}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  Pilih Surat Jalan
                </button>
              </div>
            )}
          </div>

          {/* Customer Information (Read-only) */}
          {formData.customer && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pelanggan
                </label>
                <input
                  type="text"
                  value={formData.customer_name}
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
                      Jumlah Dikirim
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Jumlah Retur
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      UOM
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
                      
                      {/* Delivered Quantity */}
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.delivered_qty}
                      </td>
                      
                      {/* Return Quantity Input */}
                      <td className="px-3 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          value={item.qty || ''}
                          onChange={(e) => handleItemChange(index, 'qty', parseFloat(e.target.value) || 0)}
                          disabled={!item.selected || isReadOnly}
                          min="0"
                          max={item.delivered_qty}
                          step="0.01"
                          className="w-24 border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:text-gray-500"
                        />
                      </td>
                      
                      {/* UOM */}
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.uom}
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
                        <select
                          value={item.return_reason}
                          onChange={(e) => handleItemChange(index, 'return_reason', e.target.value)}
                          disabled={!item.selected || isReadOnly}
                          className="w-40 border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:text-gray-500"
                        >
                          <option value="">Pilih alasan...</option>
                          <option value="Damaged">Rusak</option>
                          <option value="Wrong Item">Item Salah</option>
                          <option value="Quality Issue">Masalah Kualitas</option>
                          <option value="Customer Request">Permintaan Pelanggan</option>
                          <option value="Expired">Kadaluarsa</option>
                          <option value="Other">Lainnya</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Conditional Notes Fields */}
            {formData.items.some(item => item.selected && item.return_reason === 'Other') && (
              <div className="mt-6 space-y-4">
                <h3 className="text-sm font-medium text-gray-900">Catatan Tambahan untuk Alasan "Lainnya"</h3>
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
                        className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                      />
                    </div>
                  )
                ))}
              </div>
            )}
          </div>
        )}

        {/* Summary Section - Placeholder */}
        {formData.items.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">Total Item: {calculateTotalItems()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Total Nilai</p>
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
              className="bg-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              {isReadOnly ? 'Kembali' : 'Batal'}
            </button>
            {!isReadOnly && (
              <button
                onClick={handleSave}
                disabled={formLoading}
                className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
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
          </div>
        </div>
      </div>

      {/* Delivery Note Dialog */}
      <DeliveryNoteDialog
        isOpen={showDeliveryNoteDialog}
        onClose={() => setShowDeliveryNoteDialog(false)}
        onSelect={handleDeliveryNoteSelect}
        selectedCompany={selectedCompany}
        customerFilter={formData.customer}
      />

      {/* Print Dialog */}
      {showPrintDialog && (
        <PrintDialog
          isOpen={showPrintDialog}
          onClose={handlePrintDialogClose}
          docName={savedDocName}
          docType="Sales Return"
        />
      )}
    </div>
  );
}
