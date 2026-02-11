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

// ERPNext API response item structure
interface ERPNextPOItem {
  item_code: string;
  item_name: string;
  description: string;
  qty: number;
  uom: string;
  stock_uom: string;
  conversion_factor: number;
  rate: number;
  warehouse: string;
  purchase_order: string;
  purchase_order_item: string;
  schedule_date: string;
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
  uom: string;
  rate: number;
  amount: number;
  warehouse: string;
  purchase_order?: string;
  purchase_order_item?: string;
  schedule_date?: string;
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
  const handlePOSelect = (po: PurchaseOrder) => {
    fetchPOItems(po.name);
    setShowPODialog(false);
    setPoSearchCode('');
    setPoSearchSupplier('');
  };

  const closePODialog = () => {
    setShowPODialog(false);
    setPoSearchCode('');
    setPoSearchSupplier('');
  };
  const [purchaseOrderName, setPurchaseOrderName] = useState('');
  const [currency, setCurrency] = useState('IDR');
  const [remarks, setRemarks] = useState('');
  const [receivingWarehouse, setReceivingWarehouse] = useState('');
  const [rejectionWarehouse, setRejectionWarehouse] = useState('');

  // Items states
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [warehouses, setWarehouses] = useState<{ name: string; warehouse_name: string }[]>([]);
  const [selectedItems, setSelectedItems] = useState<PurchaseReceiptItem[]>([
    {
      item_code: '',
      item_name: '',
      description: '',
      qty: 1,
      received_qty: 0,
      rejected_qty: 0,
      uom: '',
      rate: 0,
      amount: 0,
      warehouse: '',
      purchase_order: '',
      purchase_order_item: '',
      schedule_date: '',
    }
  ]);
  const [showPODialog, setShowPODialog] = useState(false);
  const [rateInputValues, setRateInputValues] = useState<{ [key: number]: string }>({});
  const [showValidationAlert, setShowValidationAlert] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // PO Dialog Search States
  const [poSearchCode, setPoSearchCode] = useState('');
  const [poSearchSupplier, setPoSearchSupplier] = useState('');

  // Filter purchase orders based on search criteria
  const filteredPurchaseOrders = purchaseOrders.filter(po => {
    const matchesCode = po.name.toLowerCase().includes(poSearchCode.toLowerCase());
    const matchesSupplier = po.supplier_name.toLowerCase().includes(poSearchSupplier.toLowerCase());
    return matchesCode && matchesSupplier;
  });

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

    if (selectedCompany && (id || name)) {
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
    }
  }, [selectedCompany]);

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


  const fetchPurchaseReceipt = async (id: string) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/purchase-receipts/${id}?company=${encodeURIComponent(selectedCompany)}`);
      const data = await response.json();

      if (data.success) {
        const receipt = data.data;
        console.log('Purchase Receipt data received:', receipt);
        
        setSupplier(receipt.supplier);
        setSupplierName(receipt.supplier_name);
        setPostingDate(receipt.posting_date);
        setPurchaseOrder(receipt.purchase_order);
        setCurrency(receipt.currency);
        setRemarks(receipt.remarks || '');
        
        // Set receiving warehouse from set_warehouse or items
        if (receipt.set_warehouse) {
          setReceivingWarehouse(receipt.set_warehouse);
        } else if (receipt.items && receipt.items.length > 0 && receipt.items[0].warehouse) {
          setReceivingWarehouse(receipt.items[0].warehouse);
        }
        
        // Process items to ensure all fields are properly set
        const processedItems = (receipt.items || []).map(item => {
          console.log('Processing item:', item);
          console.log('Original received_qty:', item.received_qty);
          console.log('Original rejected_qty:', item.rejected_qty);
          
          // ERPNext logic: received_qty = received_qty + rejected_qty
          // So: received_qty = received_qty - rejected_qty
          const calculatedReceivedQty = (item.received_qty || 0) - (item.rejected_qty || 0);
          
          const processedItem = {
            ...item,
            // Calculate received_qty from received_qty and rejected_qty
            received_qty: calculatedReceivedQty > 0 ? calculatedReceivedQty : 0,
            rejected_qty: item.rejected_qty || 0,
          };
          
          console.log('Calculated received_qty:', calculatedReceivedQty);
          console.log('Processed item:', processedItem);
          return processedItem;
        });
        
        setSelectedItems(processedItems);
        
        // If no PO in header, get from first item
        if (!receipt.purchase_order && receipt.items && receipt.items.length > 0) {
          const firstPO = receipt.items[0].purchase_order;
          if (firstPO) {
            setPurchaseOrder(firstPO);
            console.log('PO number set from first item:', firstPO);
          }
        }
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
      // Call Next.js API proxy route
      const response = await fetch(`/api/purchase-receipts/fetch-po-detail?po=${encodeURIComponent(poName)}`);
      const data = await response.json();

      if (data.message && data.message.success) {
        const poData = data.message.data;
        console.log('PO data received:', poData);
        
        // Set form fields from PO data
        setSupplier(poData.supplier);
        setSupplierName(poData.supplier_name);
        setPurchaseOrder(poData.name);
        setPurchaseOrderName(poData.name);
        setCurrency('IDR'); // Default currency

        // Set receiving warehouse from PO if available
        if (poData.warehouse) {
          setReceivingWarehouse(poData.warehouse);
        }

        // Set remarks from PO custom notes if available
        if (poData.custom_notes_po) {
          setRemarks(poData.custom_notes_po);
        }

        // Convert PO items to PR items
        const prItems = poData.items.map((item: ERPNextPOItem) => ({
          item_code: item.item_code,
          item_name: item.item_name,
          description: item.description, // Use description from PO response
          qty: item.qty,
          received_qty: 0, // Default to 0 for new receipt
          rejected_qty: 0, // Default to 0
          uom: item.uom,
          rate: item.rate,
          amount: item.qty * item.rate, // Calculate amount
          warehouse: item.warehouse,
          purchase_order: item.purchase_order,
          purchase_order_item: item.purchase_order_item,
          schedule_date: item.schedule_date,
        }));

        console.log('PR items mapped:', prItems);

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

    // Validate each item
    for (const item of selectedItems) {
      // Skip validation for empty items
      if (!item.item_code) continue;

      // Check if received_qty is 0 or empty
      if (!item.received_qty || item.received_qty <= 0) {
        setValidationMessage(`Received Qty untuk item ${item.item_name} harus lebih dari 0`);
        setShowValidationAlert(true);
        return false;
      }

      // Check if total (received_qty + rejected_qty) exceeds original qty
      const totalQty = (item.received_qty || 0) + (item.rejected_qty || 0);
      if (totalQty > item.qty) {
        setValidationMessage(`Total Received Qty (${item.received_qty}) + Rejected Qty (${item.rejected_qty}) untuk item ${item.item_name} melebihi Qty PO (${item.qty})`);
        setShowValidationAlert(true);
        return false;
      }

      // Check if individual quantities exceed original qty
      if (item.received_qty > item.qty) {
        setValidationMessage(`Received Qty (${item.received_qty}) untuk item ${item.item_name} melebihi Qty PO (${item.qty})`);
        setShowValidationAlert(true);
        return false;
      }

      if (item.rejected_qty > item.qty) {
        setValidationMessage(`Rejected Qty (${item.rejected_qty}) untuk item ${item.item_name} melebihi Qty PO (${item.qty})`);
        setShowValidationAlert(true);
        return false;
      }

      // Check if rejected qty is filled but rejection warehouse is not selected
      if (item.rejected_qty && item.rejected_qty > 0) {
        // if (!rejectionWarehouse) {
        //   setValidationMessage(`Gudang penolakan harus dipilih karena ada rejected qty untuk item ${item.item_name}`);
        //   setShowValidationAlert(true);
        //   return false;
        // }

        // Check if rejection warehouse is same as receiving warehouse
        if (rejectionWarehouse === receivingWarehouse) {
          setValidationMessage(`Gudang penolakan tidak boleh sama dengan gudang penerimaan untuk item ${item.item_name}`);
          setShowValidationAlert(true);
          return false;
        }
      }
    }

    return true;
  };

  // Function to parse ERPNext errors into user-friendly messages
  const parseERPNextError = (errorMessage: string): string => {
    if (!errorMessage) return 'Terjadi kesalahan yang tidak diketahui';
    
    // Remove traceback and technical details
    const cleanMessage = errorMessage.replace(/Traceback[\s\S]*?ValidationError:\s*/g, '');
    
    // Common ERPNext error patterns
    const errorPatterns = [
      {
        pattern: /Gudang Penolakan wajib diisi untuk Item yang ditolak (.+)/i,
        message: 'Gudang penolakan harus dipilih karena ada barang yang ditolak'
      },
      {
        pattern: /Received Qty must be equal to Accepted \+ Rejected Qty for Item (.+)/i,
        message: 'Jumlah diterima harus sama dengan jumlah diterima + jumlah ditolak'
      },
      {
        pattern: /Row #\d+:\s*(.+)/i,
        message: (match: string) => `Kesalahan pada baris: ${match}`
      },
      {
        pattern: /(.+) is required/i,
        message: (match: string) => `${match} harus diisi`
      },
      {
        pattern: /(.+) cannot be (.+)/i,
        message: (match: string) => `${match} tidak boleh ${match.split(' cannot be ')[1]}`
      },
      {
        pattern: /(.+) must be (.+)/i,
        message: (match: string) => `${match} harus ${match.split(' must be ')[1]}`
      }
    ];
    
    // Try to match known patterns
    for (const { pattern, message } of errorPatterns) {
      const match = cleanMessage.match(pattern);
      if (match) {
        if (typeof message === 'function') {
          return message(match[1] || match[0]);
        }
        return message;
      }
    }
    
    // If no pattern matches, return cleaned message
    return cleanMessage || 'Terjadi kesalahan saat menyimpan data';
  };

  const saveDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    // Filter out empty items
    const validItems = selectedItems.filter(item => item.item_code && item.received_qty > 0);
    
    if (validItems.length === 0) {
      setError('Silakan tambahkan minimal satu item yang valid dengan received qty > 0');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // ERPNext compliant payload for Purchase Receipt
      const receiptData = {
        supplier: supplier,
        company: selectedCompany,
        posting_date: postingDate,
        purchase_order: purchaseOrder,
        currency: currency,
        conversion_rate: 1,
        remarks: remarks || "",
        set_warehouse: receivingWarehouse,
        // Add rejected_warehouse if any items have rejected_qty
        ...(validItems.some(item => item.rejected_qty > 0) && {
          rejected_warehouse: rejectionWarehouse
        }),
        items: validItems.map(item => {
          const uiReceivedQty = item.received_qty || 0; // What user entered in "Received Qty" field
          const uiRejectedQty = item.rejected_qty || 0; // What user entered in "Rejected Qty" field
          const erpnextReceivedQty = uiReceivedQty + uiRejectedQty; // ERPNext: total received = accepted + rejected
          
          console.log(`=== PAYLOAD CALCULATION FOR ${item.item_code} ===`);
          console.log(`UI "Accepted Qty" field: ${uiReceivedQty} (what user entered)`);
          console.log(`UI "Rejected Qty" field: ${uiRejectedQty} (what user entered)`);
          console.log(`ERPNext received_qty (total): ${uiReceivedQty} + ${uiRejectedQty} = ${erpnextReceivedQty}`);
          console.log(`✅ This is CORRECT - ERPNext received_qty = accepted + rejected`);
          
          return {
            item_code: item.item_code,
            item_name: item.item_name,
            description: item.description,
            //qty: item.qty,
            received_qty: erpnextReceivedQty, // ERPNext: received_qty = accepted + rejected
            rejected_qty: item.rejected_qty,
            accepted_qty: uiReceivedQty, // ERPNext needs accepted_qty field
            uom: item.uom,
            rate: item.rate,
            amount: item.amount,
            warehouse: item.warehouse || receivingWarehouse,
            purchase_order: item.purchase_order,
            purchase_order_item: item.purchase_order_item,
            schedule_date: item.schedule_date,
            // Add rejected_warehouse at item level if needed
            ...(item.rejected_qty > 0 && {
              rejected_warehouse: rejectionWarehouse
            })
          };
        })
      };

      console.log('=== FINAL PAYLOAD DEBUG ===');
      console.log('Valid Items:', validItems);
      console.log('Receipt Data Items:', receiptData.items);
      console.log('Sending Purchase Receipt data:', receiptData);

      // Determine API endpoint and method based on edit mode
      const apiUrl = isEditMode ? `/api/purchase-receipts/${prId}` : '/api/purchase-receipts';
      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(apiUrl, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(receiptData),
      });

      const data = await response.json();

      if (data.success) {
        const successMessage = isEditMode ? 'Purchase Receipt berhasil diupdate!' : 'Purchase Receipt berhasil dibuat!';
        setSuccess(successMessage);
        setSuccessMessage(successMessage);
        setShowSuccessDialog(true);
        
        // Start countdown for redirect
        setTimeout(() => {
          router.push('/purchase-receipts/prList');
        }, 3000); // Start countdown from 3
      } else {
        // Parse ERPNext error into user-friendly message
        const userFriendlyError = parseERPNextError(data.message);
        setValidationMessage(userFriendlyError);
        setShowValidationAlert(true);
      }
    } catch (err) {
      console.error('Purchase Receipt creation error:', err);
      setError(`Gagal ${isEditMode ? 'mengupdate' : 'membuat'} purchase receipt`);
    } finally {
      setLoading(false);
    }
  };

  const updateItemQty = (index: number, field: 'received_qty' | 'rejected_qty', value: number) => {
    console.log(`Updating ${field} for item ${index} to ${value}`);
    const newItems = [...selectedItems];
    const oldValue = newItems[index][field];
    newItems[index][field] = value;
    
    console.log(`${field} changed from ${oldValue} to ${value}`);

    // Only recalculate amount if received_qty is being updated
    if (field === 'received_qty') {
      const newAmount = value * newItems[index].rate;
      newItems[index].amount = newAmount;
      console.log(`Amount recalculated to ${newAmount}`);
    }

    setSelectedItems(newItems);
    console.log('SelectedItems updated:', newItems);
  };

  const removeItem = (index: number) => {
    const newItems = selectedItems.filter((_, i) => i !== index);
    setSelectedItems(newItems);
  };

  const calculateTotal = () => {
    return selectedItems.reduce((total, item) => total + item.amount, 0);
  };

  const fetchPurchaseOrders = async () => {
    try {
      if (!selectedCompany) {
        console.warn('No company selected, skipping PO fetch');
        return;
      }

      const response = await fetch(`/api/purchase-orders?company=${encodeURIComponent(selectedCompany)}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && Array.isArray(data.data)) {
        setPurchaseOrders(data.data);
        console.log('Purchase Orders fetched successfully:', data.data.length);
      } else {
        console.warn('No purchase orders data received');
        setPurchaseOrders([]);
      }
    } catch (err) {
      console.error('Error fetching purchase orders:', err);
      setPurchaseOrders([]);
    }
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
      uom: '',
      rate: 0,
      amount: 0,
      warehouse: '',
      purchase_order: '',
      purchase_order_item: '',
      schedule_date: '',
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
            <div className="hidden">
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
                          className="block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm bg-gray-50"
                          value={item.item_code || ''}
                        />
                      </div>
                    </div>
                    <div className="col-span-3">
                      <label className="block text-xs font-medium text-gray-700">
                        Nama Item <span className="text-red-500">*</span>
                      </label>
                      <div className="flex mt-1">
                        <input
                          type="text"
                          required
                          readOnly
                          className="block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm bg-gray-50"
                          value={item.item_name || ''}
                        />
                      </div>
                    </div>
                    <div className="col-span-1">
                      <label className="block text-xs font-medium text-gray-700">
                        Qty PO
                      </label>
                      <input
                        type="text"
                        readOnly
                        // required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-1 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-center"
                        value={item.qty ? item.qty.toLocaleString('id-ID') : '1'}
                      // onChange={(e) => {
                      //   const value = e.target.value.replace(/\./g, '');
                      //   const newQty = value === '' ? 1 : (parseFloat(value) || 1);
                      //   const newItems = [...selectedItems];
                      //   newItems[index].qty = newQty;
                      //   newItems[index].amount = newQty * newItems[index].rate;
                      //   setSelectedItems(newItems);
                      // }}
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-xs font-medium text-gray-700">
                        Accepted Qty
                      </label>
                      <input
                        type="text"
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-1 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-center"
                        value={item.received_qty ? item.received_qty.toLocaleString('id-ID') : '0'}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\./g, '');
                          const newQty = value === '' ? 0 : (parseFloat(value) || 0);
                          updateItemQty(index, 'received_qty', newQty);
                        }}
                        disabled={isViewMode}
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-xs font-medium text-gray-700">
                        Rejected Qty
                      </label>
                      <input
                        type="text"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-1 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-center"
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
                        value={item.uom || ''}
                        placeholder="Auto"
                      />
                    </div>
                    <div className="col-span-2">
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
              {selectedItems.some(item => item.item_code && item.qty > 0) && (
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-end">
                    <div className="grid grid-cols-2 gap-8 text-sm">
                      <div className="text-right">
                        <div className="text-gray-600">Total Quantity:</div>
                        <div className="font-semibold text-gray-900">
                          {selectedItems.reduce((sum, item) => sum + (item.received_qty || 0), 0).toLocaleString('id-ID')}
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
                disabled={loading || !selectedItems.some(item => item.item_code)}
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kode Purchase Order
                  </label>
                  <input
                    type="text"
                    placeholder="Cari kode PO..."
                    value={poSearchCode}
                    onChange={(e) => setPoSearchCode(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Supplier
                  </label>
                  <input
                    type="text"
                    placeholder="Cari supplier..."
                    value={poSearchSupplier}
                    onChange={(e) => setPoSearchSupplier(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredPurchaseOrders.length > 0 ? (
                filteredPurchaseOrders.map((po) => (
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
                  <p>
                    {poSearchCode || poSearchSupplier 
                      ? 'Tidak ada Purchase Order yang cocok dengan filter' 
                      : 'Tidak ada Purchase Order yang tersedia'
                    }
                  </p>
                  <p className="text-sm mt-2">
                    {poSearchCode || poSearchSupplier 
                      ? 'Coba ubah filter pencarian' 
                      : 'Pastikan company sudah dipilih dan ada PO yang aktif'
                    }
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={closePODialog}
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
