'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '../../components/LoadingSpinner';

interface PurchaseReceipt {
  name: string;
  supplier: string;
  supplier_name: string;
  posting_date: string;
  company: string;
  grand_total: number;
  per_billed: number;
}

interface PurchaseReceiptDetail {
  name: string;
  supplier: string;
  supplier_name: string;
  supplier_address?: string;
  supplier_address_display?: string;
  posting_date: string;
  company: string;
  currency: string;
  custom_notes_pr?: string;
  items: PurchaseReceiptItem[];
}

interface PurchaseReceiptItem {
  item_code: string;
  item_name: string;
  qty: number; // Original PR qty
  received_qty?: number;
  rejected_qty?: number;
  accepted_qty?: number;
  billed_qty?: number;
  outstanding_qty?: number; // Available for billing
  uom: string;
  rate: number;
  warehouse: string;
  purchase_receipt: string;
  purchase_receipt_item: string; // API field name
  purchase_order: string;
  purchase_order_item: string; // API field name
}

interface PurchaseInvoiceItem {
  item_code: string;
  item_name: string;
  description?: string;
  qty: number;
  amount: number;
  uom: string;
  rate: number;
  warehouse: string;
  purchase_receipt: string;
  purchase_receipt_item: string; // ERPNext field name
  purchase_order: string;
  purchase_order_item: string; // ERPNext field name
  received_qty?: number; // Add quantity fields
  rejected_qty?: number;
}

interface PurchaseInvoiceFormData {
  supplier: string;
  supplier_name: string;
  supplier_address_display?: string;
  posting_date: string;
  due_date: string;
  company: string;
  currency: string;
  items: PurchaseInvoiceItem[];
  custom_notes_pi?: string;
}

export default function PurchaseInvoiceMain() {
  const router = useRouter();
  const [selectedCompany, setSelectedCompany] = useState('');
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Edit/View mode states
  const [isEditMode, setIsEditMode] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [invoiceId, setInvoiceId] = useState('');

  // Dialog states
  const [showPurchaseReceiptDialog, setShowPurchaseReceiptDialog] = useState(false);
  const [purchaseReceipts, setPurchaseReceipts] = useState<PurchaseReceipt[]>([]);
  const [purchaseReceiptsLoading, setPurchaseReceiptsLoading] = useState(false);
  const [purchaseReceiptsError, setPurchaseReceiptsError] = useState('');
  const [prSearchTerm, setPrSearchTerm] = useState('');
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showValidationAlert, setShowValidationAlert] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');

  // Form data
  const [formData, setFormData] = useState<PurchaseInvoiceFormData>({
    supplier: '',
    supplier_name: '',
    supplier_address_display: '',
    posting_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    company: '',
    currency: 'IDR',
    items: [] // Start with empty array, will be populated when PR is selected
  });

  // Get company from localStorage/cookie and check for edit mode
  useEffect(() => {
    let savedCompany = localStorage.getItem('selected_company');

    if (!savedCompany) {
      const cookies = document.cookie.split(';');
      const companyCookie = cookies.find(cookie => cookie.trim().startsWith('selected_company='));
      if (companyCookie) {
        savedCompany = companyCookie.split('=')[1];
        if (savedCompany) {
          localStorage.setItem('selected_company', savedCompany);
        }
      }
    }

    if (savedCompany) {
      setSelectedCompany(savedCompany);
      setFormData(prev => ({ ...prev, company: savedCompany }));
    }
    setLoading(false);
  }, []);

  // Check for edit/view mode from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id'); // For edit mode (draft)
    const name = urlParams.get('name'); // For view mode (submitted)

    if (selectedCompany && (id || name)) {
      if (id) {
        // Edit mode
        setIsEditMode(true);
        setInvoiceId(id);
        fetchPurchaseInvoice(id);
      } else if (name) {
        // View mode
        setIsViewMode(true);
        setInvoiceId(name);
        fetchPurchaseInvoice(name);
      }
    }
  }, [selectedCompany]);

  // Fetch Purchase Invoice data for edit/view mode
  const fetchPurchaseInvoice = async (id: string) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/method/fetch_pi_detail?pi=${encodeURIComponent(id)}`);
      const data = await response.json();

      if (data.message && data.message.success) {
        const invoice = data.message.data;
        console.log('Purchase Invoice data received:', invoice);

        // Set form data from fetched invoice
        console.log('Setting form data with invoice:', invoice);
        console.log('Invoice items:', invoice.items);

        setFormData({
          supplier: invoice.supplier,
          supplier_name: invoice.supplier_name,
          supplier_address_display: invoice.address_display || '',
          posting_date: invoice.posting_date,
          due_date: invoice.due_date,
          company: invoice.company,
          currency: invoice.currency,
          items: (invoice.items || []).map((item: any) => ({
            item_code: item.item_code,
            item_name: item.item_name,
            qty: item.qty,
            rate: item.rate,
            amount: item.amount,
            uom: item.uom,
            warehouse: item.warehouse,
            purchase_receipt: item.purchase_receipt,
            pr_detail: item.pr_detail, // Database field name (already correct)
            purchase_order: item.purchase_order,
            po_detail: item.po_detail, // Database field name (already correct)
          })),
          custom_notes_pi: invoice.custom_notes_pi || ''
        });

        console.log('Form data set successfully');
      } else {
        // Handle permission error specifically
        if (data.message && data.message.message && data.message.message.includes('izin')) {
          setError('Permission Error: ' + data.message.message);
          // Auto-redirect to list after 3 seconds for permission errors
          setTimeout(() => {
            router.push('/purchase-invoice/piList');
          }, 3000);
        } else {
          setError(data.message?.message || 'Gagal mengambil data Purchase Invoice');
        }
      }
    } catch (error) {
      console.error('Error fetching Purchase Invoice:', error);

      // Check if it's a permission error
      if (error instanceof Error && error.message.includes('PermissionError')) {
        setError('Permission Error: Anda tidak memiliki izin untuk mengakses Purchase Invoice ini. Silakan hubungi administrator untuk mendapatkan akses. Anda akan dialihkan ke halaman daftar dalam 3 detik.');
        // Auto-redirect to list after 3 seconds for permission errors
        setTimeout(() => {
          router.push('/purchase-invoice/piList');
        }, 3000);
      } else {
        setError('Terjadi kesalahan saat mengambil data Purchase Invoice');
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch available purchase receipts
  const fetchAvailablePurchaseReceipts = useCallback(async () => {
    if (!selectedCompany) {
      setPurchaseReceiptsError('Perusahaan tidak dipilih');
      return;
    }

    try {
      setPurchaseReceiptsLoading(true);
      setPurchaseReceiptsError('');

      console.log('Fetching available purchase receipts for company:', selectedCompany);

      const response = await fetch(`/api/pr-list-for-pi?company=${encodeURIComponent(selectedCompany)}`, {
        credentials: 'include'
      });

      const data = await response.json();
      console.log('Purchase Receipts API Response:', data);

      if (data.message?.success) {
        const receipts = data.message.data || [];
        console.log('Available Purchase Receipts:', receipts);
        console.log('PR Search Term:', prSearchTerm);

        const filteredReceipts = receipts.filter((receipt: PurchaseReceipt) =>
          prSearchTerm === '' ||
          receipt.name.toLowerCase().includes(prSearchTerm.toLowerCase()) ||
          receipt.supplier_name.toLowerCase().includes(prSearchTerm.toLowerCase())
        );

        console.log('Filtered Purchase Receipts:', filteredReceipts);
        console.log('Filtered count:', filteredReceipts.length);

        setPurchaseReceipts(receipts);
      } else {
        setPurchaseReceiptsError(data.message?.message || 'Gagal mengambil data Purchase Receipt');
        setPurchaseReceipts([]);
      }
    } catch (error) {
      console.error('Error fetching purchase receipts:', error);
      setPurchaseReceiptsError('Gagal mengambil data Purchase Receipt');
      setPurchaseReceipts([]);
    } finally {
      setPurchaseReceiptsLoading(false);
    }
  }, [selectedCompany]);

  // Debug formData.items changes
  useEffect(() => {
    console.log('=== formData.items Debug ===');
    console.log('Total items:', formData.items.length);
    console.log('Items detail:', formData.items);
    console.log('Items with item_code:', formData.items.filter(item => item.item_code));
    console.log('Items with item_name:', formData.items.filter(item => item.item_name));
    console.log('========================');
  }, [formData.items]);

  // Handle purchase receipt selection
  const handleSelectPurchaseReceipt = async (prName: string) => {
    try {
      console.log('Fetching detail for PR:', prName);

      const response = await fetch(`/api/pr-detail-for-pi/${prName}`, {
        credentials: 'include'
      });

      const data = await response.json();
      console.log('PR Detail Response:', data);

      if (data.message?.success) {
        const prData: PurchaseReceiptDetail = data.message.data;
        console.log('PR Detail Data:', prData);

        // Map PR data to Purchase Invoice form
        const mappedFormData: PurchaseInvoiceFormData = {
          supplier: prData.supplier,
          supplier_name: prData.supplier_name,
          supplier_address_display: prData.supplier_address_display,
          posting_date: prData.posting_date,
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          company: prData.company,
          currency: prData.currency,
          custom_notes_pi: prData.custom_notes_pr,
          items: prData.items.map(item => ({
            item_code: item.item_code,
            item_name: item.item_name,
            qty: item.outstanding_qty || item.qty, // Use outstanding_qty or fallback to original qty
            amount: (item.outstanding_qty || item.qty) * item.rate, // Calculate based on qty used
            uom: item.uom,
            rate: item.rate, // Add missing rate field
            warehouse: item.warehouse,
            purchase_receipt: item.purchase_receipt,
            purchase_receipt_item: item.purchase_receipt_item, // ERPNext field name
            purchase_order: item.purchase_order,
            purchase_order_item: item.purchase_order_item, // ERPNext field name
            // Add quantity fields from PR data
            received_qty: item.received_qty || 0,
            rejected_qty: item.rejected_qty || 0,
          }))
        };

        console.log('Mapped Form Data:', mappedFormData);
        console.log('Items in mapped data:', mappedFormData.items);
        console.log('Sample item fields:', mappedFormData.items[0] ? {
          purchase_receipt_item: mappedFormData.items[0].purchase_receipt_item,
          purchase_order_item: mappedFormData.items[0].purchase_order_item,
          received_qty: mappedFormData.items[0].received_qty,  // Add this
          rejected_qty: mappedFormData.items[0].rejected_qty   // Add this
        } : 'No items');
        console.log('PR Data items sample:', prData.items[0] ? {
          received_qty: prData.items[0].received_qty,
          rejected_qty: prData.items[0].rejected_qty
        } : 'No PR items');
        setFormData(mappedFormData);
        setShowPurchaseReceiptDialog(false);
        setError('');
      } else {
        setError(data.message?.message || 'Gagal mengambil detail Purchase Receipt');
      }
    } catch (error) {
      console.error('Error fetching PR detail:', error);
      setError('Gagal mengambil detail Purchase Receipt');
    }
  };

  // Calculate total amount
  const calculateTotal = () => {
    return formData.items.reduce((total, item) => total + item.amount, 0);
  };

  // Handle cancel button
  const handleCancel = () => {
    // console.log('CANCEL BUTTON CLICKED!!!');
    // alert('Cancel button clicked!'); // Debug alert

    // // Debug mode detection
    // console.log('isEditMode:', isEditMode);
    // console.log('isViewMode:', isViewMode);
    // alert(`isEditMode: ${isEditMode}, isViewMode: ${isViewMode}`);

    if (isEditMode || isViewMode) {
      // Go back to list using Next.js router
      // console.log('NAVIGATING TO LIST PAGE...');
      // alert('Navigating to list page...');
      router.push('/purchase-invoice/piList');
    } else {
      // Reset form for create mode
      // console.log('RESETTING FORM...');
      // alert('Resetting form...');
      setFormData({
        supplier: '',
        supplier_name: '',
        supplier_address_display: '',
        posting_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        company: selectedCompany,
        currency: 'IDR',
        items: []
      });
      setError('');
      router.push('/purchase-invoice/piList');
      // console.log('FORM RESET COMPLETE');
      // alert('Form reset complete');
    }
  };

  // Parse ERPNext error into user-friendly message
  const parseERPNextError = (errorMessage: string): string => {
    if (!errorMessage) return 'Terjadi kesalahan yang tidak diketahui';

    // Common ERPNext error patterns
    if (errorMessage.includes('PermissionError') || errorMessage.includes('frappe.exceptions.PermissionError')) {
      return 'Permission Error: Anda tidak memiliki izin untuk mengakses atau mengubah Purchase Invoice. Silakan hubungi administrator sistem.';
    }

    if (errorMessage.includes('mandatory')) {
      return 'Field wajib belum diisi. Silakan periksa kembali data yang dimasukkan.';
    }

    if (errorMessage.includes('exists')) {
      return 'Data sudah ada. Gunakan nomor dokumen yang berbeda.';
    }

    if (errorMessage.includes('not found')) {
      return 'Data tidak ditemukan. Silakan periksa kembali data yang dimasukkan.';
    }

    if (errorMessage.includes('check_permission')) {
      return 'Permission Error: Anda tidak memiliki izin untuk melakukan operasi ini. Silakan hubungi administrator sistem.';
    }

    // Extract the main error message from ERPNext responses
    const cleanMessage = errorMessage.split('\n')[0].trim();
    return cleanMessage || 'Terjadi kesalahan saat menyimpan data';
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');

    // Validate form data
    if (!formData.supplier) {
      setError('Supplier harus dipilih');
      setFormLoading(false);
      return;
    }

    if (!formData.posting_date) {
      setError('Tanggal posting harus diisi');
      setFormLoading(false);
      return;
    }

    if (!formData.due_date) {
      setError('Tanggal jatuh tempo harus diisi');
      setFormLoading(false);
      return;
    }

    // Filter out empty items
    const validItems = formData.items.filter(item => item.item_code && item.qty > 0);

    if (validItems.length === 0) {
      setError('Silakan tambahkan minimal satu item yang valid dengan qty > 0');
      setFormLoading(false);
      return;
    }

    try {
      // ERPNext compliant payload for Purchase Invoice
      let invoiceData = {
        doctype: "Purchase Invoice",
        supplier: formData.supplier,
        company: selectedCompany,
        posting_date: formData.posting_date,
        due_date: formData.due_date,
        currency: formData.currency,
        conversion_rate: 1,
        remarks: formData.custom_notes_pi || "",
        custom_notes_pi: formData.custom_notes_pi || "",
        items: validItems.map(item => ({
          doctype: "Purchase Invoice Item",
          item_code: item.item_code,
          item_name: item.item_name,
          description: item.item_name,
          qty: item.qty, // Outstanding qty (accepted - billed)
          uom: item.uom,
          rate: item.rate,
          amount: item.amount,
          warehouse: item.warehouse,
          purchase_receipt: item.purchase_receipt,
          purchase_receipt_item: item.purchase_receipt_item, // Use field from interface
          purchase_order: item.purchase_order,
          purchase_order_item: item.purchase_order_item, // Use field from interface
          // Add quantity fields for custom API
          received_qty: item.received_qty || 0,
          rejected_qty: item.rejected_qty || 0,
        }))
      };

      console.log('=== FINAL PAYLOAD DEBUG ===');
      console.log('Valid Items:', validItems);
      console.log('Sample valid item:', validItems[0] ? {
        purchase_receipt_item: validItems[0].purchase_receipt_item,
        purchase_order_item: validItems[0].purchase_order_item,
        purchase_receipt: validItems[0].purchase_receipt,
        purchase_order: validItems[0].purchase_order,
        received_qty: validItems[0].received_qty,  // Add this
        rejected_qty: validItems[0].rejected_qty   // Add this
      } : 'No valid items');
      console.log('Invoice Data Items:', JSON.stringify(invoiceData.items, null, 2));
      console.log('Sending Purchase Invoice data:', invoiceData);

      let isSuccess = false;  // Track success state - declare outside try block
      
      try {
        // Use different API for create vs update
        const apiUrl = isEditMode ? `/api/purchase-invoice?id=${invoiceId}` : '/api/purchase-invoice';
        const method = isEditMode ? 'PUT' : 'POST';
        
        console.log(`${isEditMode ? 'Updating' : 'Creating'} Purchase Invoice with ${method} ${apiUrl}`);
        
        // For update, don't include doctype in payload
        if (isEditMode) {
          const { doctype, ...updateData } = invoiceData;
          invoiceData = updateData as any; // Type assertion for update payload
        }

        const response = await fetch(apiUrl, {
          method: method,
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(invoiceData),
        });

        const data = await response.json();
        console.log('Submit Response:', data);
        
        if (data.success) {
          isSuccess = true;
          const successMessage = isEditMode ? 'Purchase Invoice berhasil diupdate!' : 'Purchase Invoice berhasil dibuat!';
          setSuccessMessage(successMessage);
          setShowSuccessDialog(true);
          
          // Keep form loading = true to prevent multiple submissions
          // Redirect after 3 seconds
          setTimeout(() => {
            router.push('/purchase-invoice/piList');
          }, 3000);
        } else {
          // Parse ERPNext error into user-friendly message
          const userFriendlyError = parseERPNextError(data.message);
          setValidationMessage(userFriendlyError);
          setShowValidationAlert(true);
        }
      } catch (error) {
        console.error('Error submitting Purchase Invoice:', error);

        // Check for permission error specifically
        if (error instanceof Error && (
          error.message.includes('PermissionError') ||
          error.message.includes('frappe.exceptions.PermissionError') ||
          error.message.includes('check_permission')
        )) {
          setValidationMessage('Permission Error: Anda tidak memiliki izin untuk membuat Purchase Invoice. Silakan hubungi administrator sistem untuk mendapatkan akses ke menu Purchase Invoice.');
          setShowValidationAlert(true);
        } else {
          setError(`Gagal ${isEditMode ? 'mengupdate' : 'membuat'} Purchase Invoice`);
        }
      } finally {
        // Only set form loading to false if there was an error
        // On success, keep loading true until redirect
        if (!isSuccess) {
          setFormLoading(false);
        }
      }
    } catch (error) {  // <-- BARIS INI YANG DITAMBAHKAN (closing brace untuk outer try + catch block)
      console.error('Error in handleSubmit:', error);
      setError(`Gagal ${isEditMode ? 'mengupdate' : 'membuat'} Purchase Invoice`);
      setFormLoading(false);
    }

  };

  if (loading) {
    return <LoadingSpinner message="Memuat Purchase Invoice..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {isViewMode
                  ? 'Lihat Faktur Pembelian'
                  : isEditMode
                    ? 'Edit Faktur Pembelian'
                    : 'Faktur Pembelian Baru'}
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                {isViewMode
                  ? 'Lihat detail faktur pembelian'
                  : isEditMode
                    ? 'Edit faktur pembelian yang ada'
                    : 'Buat faktur pembelian dari penerimaan barang'}
              </p>
            </div>
            <button
              onClick={() => router.push('/purchase-invoice')}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
            >
              Kembali ke Daftar
            </button>
          </div>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <div className="flex items-center justify-between">
              <div>{error}</div>
              {(error.includes('Permission Error') || error.includes('izin')) && (
                <button
                  type="button"
                  onClick={() => router.push('/purchase-invoice/piList')}
                  className="ml-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-sm"
                >
                  Kembali ke Daftar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            {successMessage}
          </div>
        </div>
      )}

      {/* Form */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="bg-white shadow rounded-lg">
          <form onSubmit={handleSubmit} className="p-6">
            {/* Informasi Supplier dan Pemilihan PR */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Informasi Pemasok</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Pemasok
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={formData.supplier_name}
                      readOnly
                      className="flex-1 border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-50"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowPurchaseReceiptDialog(true);
                        setPrSearchTerm(''); // Reset search term
                        fetchAvailablePurchaseReceipts();
                      }}
                      disabled={!selectedCompany || isViewMode}
                      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      Pilih dari PR
                    </button>
                  </div>
                  {formData.supplier_name && (
                    <span className="text-xs text-gray-600 mt-1 block">
                      PR: {formData.items[0]?.purchase_receipt || 'N/A'}
                    </span>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Alamat Pemasok
                  </label>
                  <textarea
                    value={formData.supplier_address_display || ''}
                    readOnly
                    rows={2}
                    placeholder="Alamat pemasok akan ditampilkan di sini"
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-50 resize-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tanggal Posting
                  </label>
                  <input
                    type="date"
                    value={formData.posting_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, posting_date: e.target.value }))}
                    disabled={isViewMode}
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tanggal Jatuh Tempo
                  </label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                    disabled={isViewMode}
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Catatan
                </label>
                <textarea
                  value={formData.custom_notes_pi || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, custom_notes_pi: e.target.value }))}
                  disabled={isViewMode}
                  rows={2}
                  placeholder="Tambahkan catatan untuk faktur pembelian ini"
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 resize-none"
                />
              </div>
            </div>

            {/* Detail Item */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Detail Barang</h3>

              {/* Items List - Follow purchase receipt pattern */}
              <div className="space-y-2">
                {/* Always show at least one empty row in create mode */}
                {(formData.items.length === 0 || formData.items.every(item => !item.item_code && !item.item_name)) && !isEditMode && !isViewMode ? (
                  /* Empty row in create mode */
                  <div className="border border-gray-200 rounded-md p-4 mb-2">
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-1">
                        <label className="block text-xs font-medium text-gray-700">
                          Kode Barang
                        </label>
                        <div className="flex mt-1">
                          <input
                            type="text"
                            readOnly
                            className="block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm bg-gray-50"
                            value=""
                            placeholder="Auto"
                          />
                        </div>
                      </div>
                      <div className="col-span-3">
                        <label className="block text-xs font-medium text-gray-700">
                          Nama Barang
                        </label>
                        <div className="flex mt-1">
                          <input
                            type="text"
                            readOnly
                            className="block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm bg-gray-50"
                            value=""
                            placeholder="Auto"
                          />
                        </div>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700">
                          Gudang
                        </label>
                        <input
                          type="text"
                          readOnly
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm bg-gray-50"
                          value=""
                          placeholder="Otomatis"
                        />
                      </div>
                      <div className="col-span-1">
                        <label className="block text-xs font-medium text-gray-700">
                          Qty
                        </label>
                        <input
                          type="text"
                          readOnly
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-1 text-sm bg-gray-50 text-center"
                          value="0"
                        />
                      </div>
                      <div className="col-span-1">
                        <label className="block text-xs font-medium text-gray-700">
                          UoM
                        </label>
                        <input
                          type="text"
                          readOnly
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm bg-gray-50"
                          value=""
                          placeholder="Auto"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700">
                          Harga
                        </label>
                        <input
                          type="text"
                          readOnly
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm bg-gray-50 text-right"
                          value="0,00"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700">
                          Jumlah
                        </label>
                        <input
                          type="text"
                          readOnly
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm bg-gray-50 text-right"
                          value="0,00"
                        />
                      </div>
                    </div>
                    <div className="mt-3 text-center text-sm text-gray-500">
                      Pilih Penerimaan Barang terlebih dahulu untuk mengisi barang
                    </div>
                  </div>
                ) : (
                  /* Render actual items or show empty state for edit/view */
                  <>
                    {formData.items.length > 0 ? (
                      formData.items.map((item, index) => {
                        // Only render items that have actual data (either item_code or item_name)
                        if (!item.item_code && !item.item_name) {
                          return null;
                        }

                        return (
                          <div key={index} className="border border-gray-200 rounded-md p-4 mb-2">
                            <div className="grid grid-cols-12 gap-2">
                              <div className="col-span-1">
                                <label className="block text-xs font-medium text-gray-700">
                                  Kode Barang
                                </label>
                                <div className="flex mt-1">
                                  <input
                                    type="text"
                                    readOnly
                                    className="block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm bg-gray-50"
                                    value={item.item_code || ''}
                                  />
                                </div>
                              </div>
                              <div className="col-span-3">
                                <label className="block text-xs font-medium text-gray-700">
                                  Nama Barang
                                </label>
                                <div className="flex mt-1">
                                  <input
                                    type="text"
                                    readOnly
                                    className="block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm bg-gray-50"
                                    value={item.item_name || ''}
                                  />
                                </div>
                              </div>
                              <div className="col-span-2">
                                <label className="block text-xs font-medium text-gray-700">
                                  Gudang
                                </label>
                                <input
                                  type="text"
                                  readOnly
                                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm bg-gray-50"
                                  value={item.warehouse || ''}
                                  placeholder="Otomatis"
                                />
                              </div>
                              <div className="col-span-1">
                                <label className="block text-xs font-medium text-gray-700">
                                  Qty
                                </label>
                                <input
                                  type="text"
                                  readOnly
                                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-1 text-sm bg-gray-50 text-center"
                                  value={item.qty ? item.qty.toLocaleString('id-ID') : '0'}
                                />
                              </div>
                              <div className="col-span-1">
                                <label className="block text-xs font-medium text-gray-700">
                                  UoM
                                </label>
                                <input
                                  type="text"
                                  readOnly
                                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm bg-gray-50"
                                  value={item.uom || ''}
                                  placeholder="Auto"
                                />
                              </div>
                              <div className="col-span-2">
                                <label className="block text-xs font-medium text-gray-700">
                                  Harga
                                </label>
                                <input
                                  type="text"
                                  readOnly
                                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm bg-gray-50 text-right"
                                  value={item.rate ? item.rate.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'}
                                />
                              </div>
                              <div className="col-span-2">
                                <label className="block text-xs font-medium text-gray-700">
                                  Jumlah
                                </label>
                                <input
                                  type="text"
                                  readOnly
                                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm bg-gray-50 text-right"
                                  value={item.amount ? item.amount.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      /* Empty state for edit/view mode */
                      <div className="border border-gray-200 rounded-md p-8 text-center">
                        <div className="text-gray-500">
                          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                          </svg>
                          <h3 className="mt-2 text-sm font-medium text-gray-900">Tidak ada item</h3>
                          <p className="mt-1 text-sm text-gray-500">
                            Tidak ada item dalam dokumen ini
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Totals Section - hanya muncul jika ada items */}
                {formData.items.some(item => item.item_code || item.item_name) && (
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <div className="flex justify-end">
                      <div className="grid grid-cols-2 gap-8 text-sm">
                        <div className="text-right">
                          <div className="text-gray-600">Total Kuantitas:</div>
                          <div className="font-semibold text-gray-900">
                            {formData.items.reduce((sum, item) => sum + (item.qty || 0), 0).toLocaleString('id-ID')}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-gray-600">Total Jumlah:</div>
                          <div className="font-semibold text-gray-900">
                            {calculateTotal().toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Tombol Submit */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleCancel}
                disabled={formLoading}
                className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                title={formLoading ? "Form sedang diproses..." : "Batalkan operasi"}
              >
                {formLoading ? 'Memproses...' : 'Batal'}
              </button>
              <button
                type="submit"
                disabled={formLoading || !formData.supplier || isViewMode}
                className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {formLoading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Menyimpan...
                  </>
                ) : isEditMode ? (
                  'Perbarui Faktur'
                ) : (
                  'Simpan Faktur'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Purchase Receipt Dialog */}
      {showPurchaseReceiptDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Pilih Penerimaan Barang</h3>
                <button
                  type="button"
                  onClick={() => setShowPurchaseReceiptDialog(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="px-6 py-4">
              {/* Search Filter */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cari Penerimaan Barang
                </label>
                <input
                  type="text"
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Cari nama pemasok atau nomor penerimaan..."
                  value={prSearchTerm}
                  onChange={(e) => setPrSearchTerm(e.target.value)}
                />
              </div>

              {purchaseReceiptsLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-600">Memuat Penerimaan Barang...</p>
                </div>
              ) : purchaseReceiptsError ? (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  {purchaseReceiptsError}
                </div>
              ) : purchaseReceipts.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-gray-500">Tidak ada penerimaan barang tersedia</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {purchaseReceipts
                    .filter(receipt => {
                      const matches = prSearchTerm === '' ||
                        receipt.name.toLowerCase().includes(prSearchTerm.toLowerCase()) ||
                        receipt.supplier_name.toLowerCase().includes(prSearchTerm.toLowerCase());

                      if (!matches) {
                        console.log('Filtered out receipt:', receipt.name, '-', receipt.supplier_name, 'Search term:', prSearchTerm);
                      }

                      return matches;
                    })
                    .map((receipt) => (
                      <div
                        key={receipt.name}
                        onClick={() => handleSelectPurchaseReceipt(receipt.name)}
                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-indigo-600">{receipt.name}</p>
                            <p className="mt-1 text-sm text-gray-900">Pemasok: {receipt.supplier_name}</p>
                            <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                              <span>Tanggal: {receipt.posting_date}</span>
                              <span>Tagihan: {receipt.per_billed}%</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">
                              {receipt.grand_total.toLocaleString('id-ID', {
                                style: 'currency',
                                currency: 'IDR'
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowPurchaseReceiptDialog(false)}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Dialog */}
      {showSuccessDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-green-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">Sukses!</h3>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              {successMessage}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowSuccessDialog(false)}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Validation Alert Dialog */}
      {showValidationAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">Validasi Gagal</h3>
              </div>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-600">{validationMessage}</p>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowValidationAlert(false)}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}