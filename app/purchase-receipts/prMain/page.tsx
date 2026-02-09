'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '../../components/LoadingSpinner';

interface Supplier {
  name: string;
  supplier_name: string;
  primary_address?: string;
  supplier_primary_address?: string;
  supplier_primary_contact?: string;
  mobile_no?: string;
  email_id?: string;
  phone_no?: string;
  contact_person?: string;
}

interface PurchaseOrder {
  name: string;
  supplier: string;
  supplier_name: string;
  transaction_date: string;
  status: string;
  grand_total: number;
  currency: string;
}

interface PurchaseOrderItem {
  item_code: string;
  item_name: string;
  description: string;
  qty: number;
  received_qty: number;
  rejected_qty: number;
  accepted_qty: number; // readonly, follows PO qty
  uom: string;
  rate: number;
  amount: number;
  warehouse: string;
  purchase_order: string;
  purchase_order_item: string;
  remaining_qty: number;
}

interface PurchaseReceipt {
  name: string;
  supplier: string;
  supplier_name: string;
  posting_date: string;
  purchase_order: string;
  status: string;
  grand_total: number;
  currency: string;
  items: PurchaseReceiptItem[];
}

interface PurchaseReceiptItem {
  item_code: string;
  item_name: string;
  description: string;
  qty: number;
  received_qty: number;
  rejected_qty: number;
  accepted_qty: number;
  uom: string;
  rate: number;
  amount: number;
  warehouse: string;
  purchase_order?: string;
  purchase_order_item?: string;
  remaining_qty?: number;
  available_stock?: number;
  actual_stock?: number;
  reserved_stock?: number;
}

export default function PurchaseReceiptMain() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [prId, setPrId] = useState('');

  // Form states
  const [supplier, setSupplier] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [postingDate, setPostingDate] = useState(new Date().toISOString().split('T')[0]);
  const [purchaseOrder, setPurchaseOrder] = useState('');
  const [purchaseOrderName, setPurchaseOrderName] = useState('');
  const [currency, setCurrency] = useState('IDR');
  const [remarks, setRemarks] = useState('');
  const [receivingWarehouse, setReceivingWarehouse] = useState('');
  const [rejectionWarehouse, setRejectionWarehouse] = useState('');

  // Items states
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [warehouses, setWarehouses] = useState<{name: string; warehouse_name: string}[]>([]);
  const [selectedItems, setSelectedItems] = useState<PurchaseReceiptItem[]>([
    {
      item_code: '',
      item_name: '',
      description: '',
      qty: 1,
      received_qty: 0,
      rejected_qty: 0,
      accepted_qty: 0,
      uom: '',
      rate: 0,
      amount: 0,
      warehouse: '',
      available_stock: 0,
      actual_stock: 0,
      reserved_stock: 0
    }
  ]);
  const [showPODialog, setShowPODialog] = useState(false);
  const [rateInputValues, setRateInputValues] = useState<{[key: number]: string}>({});
  const [showValidationAlert, setShowValidationAlert] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    // Get company from localStorage
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
    }
  }, []);

  useEffect(() => {
    // Check URL params for edit/view mode
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    const name = urlParams.get('name');

    if (id) {
      // Edit mode
      setIsEditMode(true);
      setPrId(id);
      fetchPurchaseReceipt(id);
    } else if (name) {
      // View mode
      setIsViewMode(true);
      setPrId(name);
      fetchPurchaseReceipt(name);
    }
  }, []);

  const fetchSuppliers = async () => {
    if (!selectedCompany) return;

    try {
      const response = await fetch(`/api/suppliers?company=${encodeURIComponent(selectedCompany)}`);
      const data = await response.json();

      if (data.success) {
        setSuppliers(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    }
  };

  const fetchPurchaseOrders = async () => {
    if (!selectedCompany) return;

    try {
      // Only fetch submitted POs that can be received
      const response = await fetch(`/api/purchase-orders?company=${encodeURIComponent(selectedCompany)}&status=Submitted&limit_page_length=100`);
      const data = await response.json();

      if (data.success) {
        setPurchaseOrders(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching purchase orders:', err);
    }
  };

  const fetchPurchaseReceipt = async (id: string) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/purchase-receipts/${id}?company=${encodeURIComponent(selectedCompany)}`);
      const data = await response.json();

      if (data.success) {
        const receipt = data.data;
        setSupplier(receipt.supplier);
        setSupplierName(receipt.supplier_name);
        setPostingDate(receipt.posting_date);
        setPurchaseOrder(receipt.purchase_order);
        setCurrency(receipt.currency);
        setRemarks(receipt.remarks || '');
        setSelectedItems(receipt.items || []);
      } else {
        setError(data.message || 'Gagal mengambil data Purchase Receipt');
      }
    } catch (err) {
      console.error('Error fetching purchase receipt:', err);
      setError('Terjadi kesalahan saat mengambil data');
    } finally {
      setLoading(false);
    }
  };

  const fetchPOItems = async (poName: string) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/purchase-orders/${poName}/items?company=${encodeURIComponent(selectedCompany)}`);
      const data = await response.json();

      if (data.success) {
        const poData = data.data;
        setSupplier(poData.purchase_order.supplier);
        setSupplierName(poData.purchase_order.supplier_name);
        setPurchaseOrder(poData.purchase_order.name);
        setPurchaseOrderName(poData.purchase_order.name);
        setCurrency('IDR'); // Default currency

        // Convert PO items to PR items
        const prItems = poData.items.map((item: PurchaseOrderItem) => ({
          item_code: item.item_code,
          item_name: item.item_name,
          description: item.description,
          qty: item.qty,
          received_qty: item.received_qty || 0,
          rejected_qty: 0,
          accepted_qty: item.accepted_qty, // readonly from PO
          uom: item.uom,
          rate: item.rate,
          amount: item.amount,
          warehouse: item.warehouse,
        }));

        setSelectedItems(prItems);
        setShowPODialog(false);
      } else {
        setError(data.message || 'Gagal mengambil data items Purchase Order');
      }
    } catch (err) {
      console.error('Error fetching PO items:', err);
      setError('Terjadi kesalahan saat mengambil data items');
    } finally {
      setLoading(false);
    }
  };

  const fetchWarehouses = async () => {
    try {
      if (!selectedCompany) {
        console.warn('No company selected, skipping warehouse fetch');
        return;
      }

      const response = await fetch(`/api/erpnext/warehouse?company=${encodeURIComponent(selectedCompany)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('data warehosue ', data)
      if (data.error) {
        throw new Error(data.error);
      }
      
      if (data.data && Array.isArray(data.data)) {
        setWarehouses(data.data);
        console.log('Warehouses fetched successfully:', data.data.length);
      } else {
        console.warn('No warehouse data received');
        setWarehouses([]);
      }
    } catch (err) {
      console.error('Error fetching warehouses:', err);
      // Set empty array on error to prevent UI issues
      setWarehouses([]);
      // Optionally show error to user
      setError('Gagal mengambil data gudang');
    }
  };

  useEffect(() => {
    if (selectedCompany) {
      fetchSuppliers();
      fetchPurchaseOrders();
      fetchWarehouses();
    }
  }, [selectedCompany]);

  const validateForm = () => {
    if (!purchaseOrder) {
      setValidationMessage('Purchase Order harus dipilih');
      setShowValidationAlert(true);
      return false;
    }

    if (selectedItems.length === 0) {
      setValidationMessage('Items harus ditambahkan');
      setShowValidationAlert(true);
      return false;
    }

    // Check if any received qty exceeds accepted qty
    for (const item of selectedItems) {
      if (item.received_qty > item.accepted_qty) {
        setValidationMessage(`Quantity received untuk item ${item.item_name} melebihi quantity yang diizinkan (${item.accepted_qty})`);
        setShowValidationAlert(true);
        return false;
      }
    }

    return true;
  };

  const saveDoc = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      const receiptData = {
        supplier: supplier,
        posting_date: postingDate,
        purchase_order: purchaseOrder,
        currency: currency,
        remarks: remarks,
        items: selectedItems.map(item => ({
          item_code: item.item_code,
          item_name: item.item_name,
          description: item.description,
          qty: item.qty,
          received_qty: item.received_qty,
          rejected_qty: item.rejected_qty,
          accepted_qty: item.accepted_qty,
          uom: item.uom,
          rate: item.rate,
          amount: item.amount,
          warehouse: item.warehouse,
        })),
      };

      let response;
      if (isEditMode) {
        // Update existing
        response = await fetch(`/api/purchase-receipts/${prId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(receiptData),
        });
      } else {
        // Create new
        response = await fetch('/api/purchase-receipts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(receiptData),
        });
      }

      const data = await response.json();

      if (data.success) {
        setSuccess(isEditMode ? 'Purchase Receipt berhasil diupdate!' : 'Purchase Receipt berhasil dibuat!');
        setSuccessMessage(isEditMode ? 'Purchase Receipt berhasil diupdate!' : 'Purchase Receipt berhasil dibuat!');
        setShowSuccessDialog(true);

        // Redirect after 2 seconds
        setTimeout(() => {
          router.push('/purchase-receipts');
        }, 2000);
      } else {
        setError(data.message || 'Gagal menyimpan Purchase Receipt');
      }
    } catch (err) {
      console.error('Error saving purchase receipt:', err);
      setError('Terjadi kesalahan saat menyimpan');
    } finally {
      setLoading(false);
    }
  };

  const updateItemQty = (index: number, field: 'received_qty' | 'rejected_qty', value: number) => {
    const newItems = [...selectedItems];
    newItems[index][field] = value;

    // Recalculate amount based on received_qty
    newItems[index].amount = newItems[index].received_qty * newItems[index].rate;

    setSelectedItems(newItems);
  };

  const removeItem = (index: number) => {
    const newItems = selectedItems.filter((_, i) => i !== index);
    setSelectedItems(newItems);
  };

  const calculateTotal = () => {
    return selectedItems.reduce((total, item) => total + item.amount, 0);
  };

  const handlePOSelect = (po: PurchaseOrder) => {
    fetchPOItems(po.name);
  };

  const handleAddItem = () => {
    // Add new empty item
    const newItem: PurchaseReceiptItem = {
      item_code: '',
      item_name: '',
      description: '',
      qty: 1,
      received_qty: 0,
      rejected_qty: 0,
      accepted_qty: 0,
      uom: '',
      rate: 0,
      amount: 0,
      warehouse: '',
    };
    setSelectedItems([...selectedItems, newItem]);
  };

  const openItemDialog = (index: number) => {
    // TODO: Implement item selection dialog
    console.log('Open item dialog for index:', index);
  };

  if (loading && !purchaseOrder) {
    return <LoadingSpinner />;
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
                  ? 'View Purchase Receipt'
                  : isEditMode
                    ? 'Edit Purchase Receipt'
                    : 'Purchase Receipt Baru'}
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                {isViewMode
                  ? 'Lihat detail Purchase Receipt'
                  : 'Buat atau edit Purchase Receipt dari Purchase Order'}
              </p>
            </div>
            <button
              onClick={() => router.push('/purchase-receipts/prList')}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
            >
              Kembali ke Daftar
            </button>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      )}

      {/* Success Overlay */}
      {success && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-green-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">Berhasil!</h3>
              </div>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-600">{success}</p>
              <p className="text-sm text-gray-600 mt-2">
                Purchase Receipt telah berhasil dibuat dan akan segera dialihkan ke daftar.
              </p>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => router.push('/purchase-receipts/prList')}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                Ke Daftar Purchase Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <form onSubmit={saveDoc} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Informasi Dasar</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tanggal Transaksi *
                </label>
                <input
                  type="date"
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={postingDate}
                  onChange={(e) => setPostingDate(e.target.value)}
                  disabled={isViewMode}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Purchase Order *
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    className="block flex-1 border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-50 sm:text-sm"
                    value={purchaseOrderName || purchaseOrder}
                    placeholder="Pilih Purchase Order"
                    readOnly
                  />
                  <button
                    type="button"
                    onClick={() => setShowPODialog(true)}
                    disabled={isViewMode}
                    className="bg-indigo-600 text-white px-3 py-2 rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gudang Penerimaan *
                </label>
                <select
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={receivingWarehouse}
                  onChange={(e) => setReceivingWarehouse(e.target.value)}
                  disabled={isViewMode}
                  required
                >
                  <option value="">Pilih Gudang</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.name} value={warehouse.name}>
                      {warehouse.warehouse_name || warehouse.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gudang Penolakan
                </label>
                <select
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={rejectionWarehouse}
                  onChange={(e) => setRejectionWarehouse(e.target.value)}
                  disabled={isViewMode}
                >
                  <option value="">Pilih Gudang</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.name} value={warehouse.name}>
                      {warehouse.warehouse_name || warehouse.name}
                    </option>
                  ))}
                </select>
              </div>
             
              {/* Mata Uang - Hidden */}
              <div className="hidden">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mata Uang
                </label>
                <select
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <option value="IDR">IDR</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Catatan
                </label>
                <textarea
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  disabled={isViewMode}
                  placeholder="Tambahkan catatan atau keterangan tambahan..."
                />
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-md font-medium text-gray-900">Items</h4>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="bg-green-600 text-white hover:bg-green-700 px-3 py-1 rounded-md text-sm"
                >
                  Add Item
                </button>
              </div>
            </div>

            {/* Items List */}
            <div className="space-y-2">
              {selectedItems.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-md p-4 mb-2">
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-1">
                      <label className="block text-xs font-medium text-gray-700">
                        Kode Item <span className="text-red-500">*</span>
                      </label>
                      <div className="flex mt-1">
                        <input
                          type="text"
                          required
                          readOnly
                          className="block w-full border border-gray-300 rounded-l-md shadow-sm py-1 px-2 text-sm bg-gray-50"
                          value={item.item_code || ''}
                        />
                        <button
                          type="button"
                          onClick={() => openItemDialog(index)}
                          className="px-2 py-1 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="col-span-5">
                      <label className="block text-xs font-medium text-gray-700">
                        Nama Item <span className="text-red-500">*</span>
                      </label>
                      <div className="flex mt-1">
                        <input
                          type="text"
                          required
                          readOnly
                          className="block w-full border border-gray-300 rounded-l-md shadow-sm py-1 px-2 text-sm bg-gray-50"
                          value={item.item_name || ''}
                        />
                        <button
                          type="button"
                          onClick={() => openItemDialog(index)}
                          className="px-2 py-1 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                                        <div className="col-span-1">
                      <label className="block text-xs font-medium text-gray-700">
                        Qty <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-center"
                        value={item.qty ? item.qty.toLocaleString('id-ID') : '1'}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\./g, '');
                          const newQty = value === '' ? 1 : (parseFloat(value) || 1);
                          const newItems = [...selectedItems];
                          newItems[index].qty = newQty;
                          newItems[index].amount = newQty * newItems[index].rate;
                          setSelectedItems(newItems);
                        }}
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-xs font-medium text-gray-700">
                        Accepted Qty
                      </label>
                      <input
                        type="text"
                        readOnly
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm bg-gray-50 text-center"
                        value={item.accepted_qty ? item.accepted_qty.toLocaleString('id-ID') : '0'}
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-xs font-medium text-gray-700">
                        Rejected Qty
                      </label>
                      <input
                        type="text"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-center"
                        value={item.rejected_qty ? item.rejected_qty.toLocaleString('id-ID') : '0'}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\./g, '');
                          const newQty = value === '' ? 0 : (parseFloat(value) || 0);
                          updateItemQty(index, 'rejected_qty', newQty);
                        }}
                        disabled={isViewMode}
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
                        value={item.stock_uom || ''}
                        placeholder="Auto"
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-xs font-medium text-gray-700">
                        Rate
                      </label>
                      <input
                        type="text"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-right [appearance:textfield] [&::-webkit-outer-spin-button]:m-0 [&::-webkit-inner-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        value={rateInputValues[index] || (item.rate ? item.rate.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '')}
                        onChange={(e) => {
                          const inputValue = e.target.value;
                          setRateInputValues(prev => ({ ...prev, [index]: inputValue }));
                          
                          let value = inputValue.replace(/[^\d,]/g, '');
                          value = value.replace(',', '.');
                          const newRate = parseFloat(value) || 0;
                          
                          const newItems = [...selectedItems];
                          newItems[index].rate = newRate;
                          newItems[index].amount = newItems[index].qty * newRate;
                          setSelectedItems(newItems);
                        }}
                        onFocus={(e) => {
                          const rawValue = item.rate ? item.rate.toString() : '';
                          setRateInputValues(prev => ({ ...prev, [index]: rawValue }));
                          setTimeout(() => {
                            e.target.value = rawValue;
                            e.target.setSelectionRange(rawValue.length, rawValue.length);
                          }, 0);
                        }}
                        onBlur={(e) => {
                          const newRate = parseFloat(e.target.value.replace(',', '.')) || 0;
                          const formattedValue = newRate.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                          setRateInputValues(prev => ({ ...prev, [index]: formattedValue }));
                          
                          const newItems = [...selectedItems];
                          newItems[index].rate = newRate;
                          newItems[index].amount = newItems[index].qty * newRate;
                          setSelectedItems(newItems);
                        }}
                        placeholder="0,00"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700">
                        Jumlah (IDR)
                      </label>
                      <input
                        type="text"
                        readOnly
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm bg-gray-50 text-right"
                        value={item.amount ? item.amount.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'}
                      />
                    </div>
                  </div>
                  {selectedItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="mt-2 text-sm text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              
              {/* Totals Section - langsung di dalam item container */}
              {selectedItems.some(item => item.item_code) && (
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-end">
                    <div className="grid grid-cols-2 gap-8 text-sm">
                      <div className="text-right">
                        <div className="text-gray-600">Total Quantity:</div>
                        <div className="font-semibold text-gray-900">
                          {selectedItems.reduce((sum, item) => sum + item.accepted_qty, 0).toLocaleString('id-ID')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-gray-600">Total Amount:</div>
                        <div className="font-semibold text-lg text-gray-900">
                          {currency} {selectedItems.reduce((sum, item) => sum + item.amount, 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
          </div>
        </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.push('/purchase-receipts/prList')}
              className="bg-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-400"
            >
              Batal
            </button>
            {!isViewMode && (
              <button
                type="submit"
                disabled={loading || selectedItems.length === 0}
                className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
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
                  'Update Purchase Receipt'
                ) : (
                  'Buat Purchase Receipt'
                )}
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Modals */}
      {showPODialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Pilih Purchase Order</h3>
              <button
                type="button"
                onClick={() => setShowPODialog(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-4">
              <input
                type="text"
                placeholder="Cari Purchase Order..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {purchaseOrders.length > 0 ? (
                purchaseOrders.map((po) => (
                  <div
                    key={po.name}
                    onClick={() => handlePOSelect(po)}
                    className="border border-gray-200 rounded-md p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900">{po.name}</h4>
                        <p className="text-sm text-gray-600">{po.supplier_name}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Tanggal: {new Date(po.transaction_date).toLocaleDateString('id-ID')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {po.currency} {po.grand_total.toLocaleString('id-ID')}
                        </p>
                        <p className="text-xs text-gray-500">{po.status}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>Tidak ada Purchase Order yang tersedia</p>
                  <p className="text-sm mt-2">Pastikan company sudah dipilih dan ada PO yang aktif</p>
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowPODialog(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

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

      {showSuccessDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">Berhasil</h3>
              </div>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-600">{successMessage}</p>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowSuccessDialog(false);
                  router.push('/purchase-receipts/prList');
                }}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
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
