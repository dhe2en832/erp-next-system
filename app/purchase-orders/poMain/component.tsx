'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ItemDialog from '../../components/ItemDialog';
import LoadingSpinner from '../../components/LoadingSpinner';
import { formatAddress } from '../../../utils';

interface Supplier {
  name: string;
  supplier_name: string;
  // Field dari API detail
  primary_address?: string;
  supplier_primary_address?: string;
  supplier_primary_contact?: string;
  mobile_no?: string;
  email_id?: string;
  phone_no?: string;
  contact_person?: string;
}

interface Item {
  name: string;
  item_name: string;
  item_code: string;
  description: string;
  stock_uom: string;
  rate: number;
  expense_account?: string;
}

interface PurchaseOrderItem {
  item_code: string;
  item_name: string;
  description: string;
  qty: number;
  rate: number;
  amount: number;
  stock_uom: string;
  expense_account?: string;
  warehouse?: string;
  scheduled_delivery_date?: string;
  available_stock?: number;
  actual_stock?: number;
  reserved_stock?: number;
}

interface TermsAndConditions {
  name: string;
  terms: string;
}

interface TaxTemplate {
  name: string;
  tax_rate: number;
  description?: string;
}

export default function PurchaseOrderMain() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form states
  const [supplier, setSupplier] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [scheduleDate, setScheduleDate] = useState('');
  const [currency, setCurrency] = useState('IDR');
  const [priceList, setPriceList] = useState('Standar Pembelian');
  const [termsAndConditions, setTermsAndConditions] = useState('');
  const [taxesAndCharges, setTaxesAndCharges] = useState('');
  const [remarks, setRemarks] = useState('');
  
  // Additional ERPNext fields
  const [contactPerson, setContactPerson] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [warehouse, setWarehouse] = useState('');
  
  // Items states
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [termsList, setTermsList] = useState<TermsAndConditions[]>([]);
  const [taxTemplates, setTaxTemplates] = useState<TaxTemplate[]>([]);
  const [warehouses, setWarehouses] = useState<{name: string; warehouse_name: string}[]>([]);
  const [selectedItems, setSelectedItems] = useState<PurchaseOrderItem[]>([
    { 
      item_code: '', 
      item_name: '', 
      description: '',
      qty: 1, 
      rate: 0, 
      amount: 0, 
      stock_uom: '', 
      warehouse: '', 
      scheduled_delivery_date: '',
      available_stock: 0,
      actual_stock: 0,
      reserved_stock: 0
    }
  ]);
  const [selectedItemCode, setSelectedItemCode] = useState('');
  const [itemQty, setItemQty] = useState(1);
  const [itemRate, setItemRate] = useState(0);
  const [itemWarehouse, setItemWarehouse] = useState('');
  const [itemScheduledDate, setItemScheduledDate] = useState('');
  
  // Calculations
  const [subtotal, setSubtotal] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);

  // Dialog states
  const [showSupplierDialog, setShowSupplierDialog] = useState(false);
  const [supplierSearchTerm, setSupplierSearchTerm] = useState('');
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [currentItemIndex, setCurrentItemIndex] = useState<number | null>(null);
  const [showValidationAlert, setShowValidationAlert] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  
  // Rate input states for each item
  const [rateInputValues, setRateInputValues] = useState<{[key: number]: string}>({});
  
  // Countdown timer for redirect
  const [redirectCountdown, setRedirectCountdown] = useState(0);

  // Filter suppliers based on search term
  const filteredSuppliers = suppliers.filter(supplier =>
    (supplier.supplier_name && supplier.supplier_name.toLowerCase().includes(supplierSearchTerm.toLowerCase())) ||
    (supplier.name && supplier.name.toLowerCase().includes(supplierSearchTerm.toLowerCase()))
  );

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
      fetchSuppliers(savedCompany);
      fetchItems(savedCompany);
      // fetchTermsAndConditions(savedCompany);
      // fetchTaxTemplates(savedCompany);
      fetchWarehouses(savedCompany);
    }
  }, []);

  // Update warehouse di semua item saat warehouse header berubah
  useEffect(() => {
    if (warehouse) {
      setSelectedItems(prev => 
        prev.map(item => ({
          ...item,
          warehouse: warehouse // Update semua item dengan warehouse dari header
        }))
      );
    }
  }, [warehouse]);

  useEffect(() => {
    // Calculate totals whenever items change
    const newSubtotal = selectedItems.reduce((sum, item) => sum + item.amount, 0);
    let newTaxAmount = 0;
    
    // Calculate tax based on selected tax template
    if (taxesAndCharges) {
      const taxTemplate = taxTemplates.find(t => t.name === taxesAndCharges);
      if (taxTemplate) {
        newTaxAmount = newSubtotal * (taxTemplate.tax_rate / 100);
      }
    }
    
    const newGrandTotal = newSubtotal + newTaxAmount;
    
    setSubtotal(newSubtotal);
    setTaxAmount(newTaxAmount);
    setGrandTotal(newGrandTotal);
  }, [selectedItems, taxesAndCharges, taxTemplates]);

  const fetchSuppliers = async (company: string) => {
    try {
      const response = await fetch(`/api/suppliers?company=${encodeURIComponent(company)}`);
      const data = await response.json();
      
      if (data.success) {
        setSuppliers(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    }
  };

  const fetchItems = async (company: string) => {
    try {
      const response = await fetch(`/api/items?company=${encodeURIComponent(company)}`);
      const data = await response.json();
      
      if (data.success) {
        setItems(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching items:', err);
    }
  };

  const fetchTermsAndConditions = async (company: string) => {
    try {
      const response = await fetch(`/api/terms-and-conditions?company=${encodeURIComponent(company)}`);
      
      if (!response.ok) {
        // API tidak ada atau error, gunakan fallback data
        console.log('Terms API not available, using fallback data');
        setTermsList([
          { name: 'Standar', terms: 'Syarat dan ketentuan standar berlaku' }
        ]);
        return;
      }
      
      const data = await response.json();
      
      if (data.success) {
        setTermsList(data.data || []);
      } else {
        // API error, gunakan fallback
        console.log('Terms API error, using fallback data');
        setTermsList([
          { name: 'Standar', terms: 'Syarat dan ketentuan standar berlaku' }
        ]);
      }
    } catch (err) {
      console.error('Error fetching terms and conditions:', err);
      // Error network atau parsing, gunakan fallback
      setTermsList([
        { name: 'Standar', terms: 'Syarat dan ketentuan standar berlaku' }
      ]);
    }
  };

  const fetchTaxTemplates = async (company: string) => {
    try {
      const response = await fetch(`/api/tax-templates?company=${encodeURIComponent(company)}`);
      
      if (!response.ok) {
        // API tidak ada atau error, gunakan fallback data
        console.log('Tax templates API not available, using fallback data');
        setTaxTemplates([
          { name: 'PPN 11%', tax_rate: 11, description: 'Pajak Pertambahan Nilang 11%' }
        ]);
        return;
      }
      
      const data = await response.json();
      
      if (data.success) {
        setTaxTemplates(data.data || []);
      } else {
        // API error, gunakan fallback
        console.log('Tax templates API error, using fallback data');
        setTaxTemplates([
          { name: 'PPN 11%', tax_rate: 11, description: 'Pajak Pertambahan Nilang 11%' }
        ]);
      }
    } catch (error) {
      console.error('Error fetching tax templates:', error);
      // Error network atau parsing, gunakan fallback
      setTaxTemplates([
        { name: 'PPN 11%', tax_rate: 11, description: 'Pajak Pertambahan Nilang 11%' }
      ]);
    }
  };

  const fetchWarehouses = async (company: string) => {
    try {
      const response = await fetch(`/api/warehouses?company=${encodeURIComponent(company)}`);
      
      if (!response.ok) {
        // API tidak ada, gunakan fallback data
        setWarehouses([
          { name: 'WH-001', warehouse_name: 'Gudang Utama' },
          { name: 'WH-002', warehouse_name: 'Gudang Cadangan' }
        ]);
        return;
      }
      
      const data = await response.json();
      
      if (data.success) {
        setWarehouses(data.data || []);
      } else {
        // API error, gunakan fallback
        setWarehouses([
          { name: 'WH-001', warehouse_name: 'Gudang Utama' },
          { name: 'WH-002', warehouse_name: 'Gudang Cadangan' }
        ]);
      }
    } catch (err) {
      console.error('Error fetching warehouses:', err);
      // Error network atau parsing, gunakan fallback
      setWarehouses([
        { name: 'WH-001', warehouse_name: 'Gudang Utama' },
        { name: 'WH-002', warehouse_name: 'Gudang Cadangan' }
      ]);
    }
  };

  const handleItemChange = (itemCode: string) => {
    setSelectedItemCode(itemCode);
    const item = items.find(i => i.item_code === itemCode);
    if (item) {
      setItemRate(item.rate);
    } else {
      setItemRate(0);
    }
  };

  const addItem = () => {
    if (!selectedItemCode || itemQty <= 0) {
      setError('Silakan pilih item dan masukkan jumlah yang valid');
      return;
    }

    const item = items.find(i => i.item_code === selectedItemCode);
    if (!item) {
      setError('Item yang dipilih tidak ditemukan');
      return;
    }

    const amount = itemQty * itemRate;
    const newItem: PurchaseOrderItem = {
      item_code: item.item_code,
      item_name: item.item_name,
      description: item.description,
      qty: itemQty,
      rate: itemRate,
      amount: amount,
      stock_uom: item.stock_uom,
      warehouse: warehouse, // Gunakan gudang default
      scheduled_delivery_date: scheduleDate // Gunakan tanggal jadwal default
    };

    setSelectedItems([...selectedItems, newItem]);
    setSelectedItemCode('');
    setItemQty(1);
    setItemRate(0);
    setError('');
  };

  const removeItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  const handleSupplierSelect = async (supplierCode: string, supplierName: string) => {
    setSupplier(supplierCode);
    setShowSupplierDialog(false);
    setSupplierSearchTerm('');
    
    console.log('Supplier selected:', supplierCode, supplierName);
    
    // Ambil detail supplier dari API
    try {
      const response = await fetch(`/api/supplier/${supplierCode}`);
      const data = await response.json();
      
      console.log('Supplier detail response:', data);
      
      if (data.success && data.data) {
        const supplierDetail = data.data;
        
        // Ambil data dari API response
        const address = formatAddress(supplierDetail.primary_address || '');
        const contact = supplierDetail.contact_person || '';
        
        setContactPerson(contact);
        setDeliveryLocation(address);
        setShippingAddress(address); // Alamat Supplier (visible) - sudah diformat
        setBillingAddress(address);
        
        console.log('Supplier info filled from API:', {
          name: supplierDetail.name,
          supplier_name: supplierDetail.supplier_name,
          address: address,
          contact: contact
        });
      } else {
        console.log('Failed to fetch supplier detail:', data.message);
        // Set kosong jika gagal
        setContactPerson('');
        setDeliveryLocation('');
        setShippingAddress('');
        setBillingAddress('');
      }
    } catch (error) {
      console.error('Error fetching supplier detail:', error);
      // Set kosong jika error
      setContactPerson('');
      setDeliveryLocation('');
      setShippingAddress('');
      setBillingAddress('');
    }
  };

  const handleAddItem = () => {
    setSelectedItems([
      ...selectedItems,
      { 
        item_code: '', 
        item_name: '', 
        description: '',
        qty: 1, 
        rate: 0, 
        amount: 0, 
        stock_uom: '', 
        warehouse: warehouse || '', // Gunakan warehouse dari header
        scheduled_delivery_date: '',
        available_stock: 0,
        actual_stock: 0,
        reserved_stock: 0
      }
    ]);
  };

  // Check stock for selected item
  const checkItemStock = async (itemCode: string, itemIndex: number, currentItem: PurchaseOrderItem) => {
    console.log('Checking stock for item:', itemCode, 'at index:', itemIndex, 'company:', selectedCompany);
    console.log('Current item passed to stock check:', currentItem);
    console.log('Using warehouse from header:', warehouse);
    
    try {
      const response = await fetch(`/api/stock-check?item_code=${itemCode}&company=${selectedCompany}`);
      const data = await response.json();
      
      console.log('Stock check response:', data);
      
      if (!data.error && data.length > 0) {
        // Find stock info untuk warehouse yang dipilih di header
        const selectedWarehouseStock = data.find((stock: any) => stock.warehouse === warehouse);
        
        console.log('Selected warehouse stock:', selectedWarehouseStock);
        
        if (selectedWarehouseStock) {
          // Update item dengan stock info dari warehouse yang dipilih
          const updatedItem = {
            ...currentItem,
            warehouse: warehouse, // Gunakan warehouse dari header
            available_stock: selectedWarehouseStock.available,
            actual_stock: selectedWarehouseStock.actual,
            reserved_stock: selectedWarehouseStock.reserved,
          };
          
          console.log('Updated item with warehouse stock:', updatedItem);
          
          // Update selectedItems dengan updated item
          setSelectedItems(prev => 
            prev.map((item, index) => 
              index === itemIndex ? updatedItem : item
            )
          );
          
          console.log('Selected items updated with warehouse stock');
        } else {
          console.log('No stock data found for selected warehouse:', warehouse);
          // Jika warehouse tidak ditemukan di stock data, set stock ke 0
          const updatedItem = {
            ...currentItem,
            warehouse: warehouse,
            available_stock: 0,
            actual_stock: 0,
            reserved_stock: 0,
          };
          
          setSelectedItems(prev => 
            prev.map((item, index) => 
              index === itemIndex ? updatedItem : item
            )
          );
        }
      } else {
        console.log('No stock data found for item:', itemCode);
        // Set stock ke 0 jika tidak ada data
        const updatedItem = {
          ...currentItem,
          warehouse: warehouse,
          available_stock: 0,
          actual_stock: 0,
          reserved_stock: 0,
        };
        
        setSelectedItems(prev => 
          prev.map((item, index) => 
            index === itemIndex ? updatedItem : item
          )
        );
      }
    } catch (error) {
      console.error('Failed to check item stock:', error);
      // Set stock ke 0 jika error
      const updatedItem = {
        ...currentItem,
        warehouse: warehouse,
        available_stock: 0,
        actual_stock: 0,
        reserved_stock: 0,
      };
      
      setSelectedItems(prev => 
        prev.map((item, index) => 
          index === itemIndex ? updatedItem : item
        )
      );
    }
  };

  const handleItemSelect = async (item: { item_code: string; item_name: string; stock_uom?: string }) => {
    console.log('Item selected:', item);
    
    if (currentItemIndex === null) return;
    
    if (!selectedCompany) {
      setError('Perusahaan tidak dipilih. Silakan login kembali.');
      return;
    }
    
    // Fetch item price untuk PO (Standar Pembelian)
    let rate = 0;
    try {
      // Coba dengan "Standar Pembelian"
      console.log('Trying to fetch price for item:', item.item_code, 'company:', selectedCompany);
      const priceResponse = await fetch(`/api/item-price?item_code=${item.item_code}&price_list=Standar%20Pembelian&company=${selectedCompany}`);
      const priceResult = await priceResponse.json();
      
      console.log('Price API response:', priceResult);
      
      if (priceResult.success && priceResult.data) {
        rate = priceResult.data.price_list_rate;
        console.log('Item price fetched successfully:', rate);
      } else {
        console.log('No price found from Standar Pembelian, using default rate 0');
        // Coba tanpa price list (gunakan default)
        const defaultResponse = await fetch(`/api/item-price?item_code=${item.item_code}&company=${selectedCompany}`);
        const defaultResult = await defaultResponse.json();
        
        console.log('Default price API response:', defaultResult);
        
        if (defaultResult.success && defaultResult.data) {
          rate = defaultResult.data.price_list_rate || defaultResult.data.rate || 0;
          console.log('Item price fetched from default:', rate);
        }
      }
    } catch (error) {
      console.error('Failed to fetch item price:', error);
    }
    
    // Get current item to preserve existing fields
    const currentItem = selectedItems[currentItemIndex];
    console.log('Current item before update:', currentItem);
    
    // Update existing item at specific index
    const newItems = [...selectedItems];
    newItems[currentItemIndex] = {
      ...currentItem, // Preserve all existing fields from current form state
      item_code: item.item_code,
      item_name: item.item_name,
      description: currentItem.description || '', // Preserve existing description
      stock_uom: item.stock_uom || '',
      rate: rate, // Harga dari API
      amount: (currentItem.qty || 1) * rate, // Auto-calculate amount
      warehouse: currentItem.warehouse || warehouse, // Gunakan warehouse item jika ada, default dari header
      scheduled_delivery_date: currentItem.scheduled_delivery_date || scheduleDate, // Gunakan tanggal jadwal item jika ada, default dari header
      available_stock: 0, // Default stock info
      actual_stock: 0,
      reserved_stock: 0
    };

    console.log('Updated item with rate:', newItems[currentItemIndex]);
    console.log('Rate set to:', rate);
    console.log('Amount calculated:', newItems[currentItemIndex].amount);

    console.log('Updated item before stock check:', newItems[currentItemIndex]);
    
    setSelectedItems(newItems);
    setShowItemDialog(false);
    setCurrentItemIndex(null);
    setError('');
    
    // Check stock for selected item - pass the updated item
    checkItemStock(item.item_code, currentItemIndex, newItems[currentItemIndex]);
  };

  const SupplierDialog = () => {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-96 overflow-hidden">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Pilih Supplier</h3>
            <button
              onClick={() => {
                setShowSupplierDialog(false);
                setSupplierSearchTerm('');
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Search Input */}
          <div className="mb-4">
            <input
              type="text"
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Cari supplier..."
              value={supplierSearchTerm}
              onChange={(e) => setSupplierSearchTerm(e.target.value)}
              autoFocus
            />
          </div>

          {/* Supplier List */}
          <div className="max-h-64 overflow-y-auto">
            {filteredSuppliers.length > 0 ? (
              <div className="space-y-2">
                {filteredSuppliers.map((sup) => (
                  <div
                    key={sup.name}
                    onClick={() => handleSupplierSelect(sup.name, sup.supplier_name)}
                    className="p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-gray-900">{sup.supplier_name}</div>
                        <div className="text-sm text-gray-500">Kode: {sup.name}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">Tidak ada supplier ditemukan</p>
              </div>
            )}
          </div>

          {/* Dialog Actions */}
          <div className="flex justify-end space-x-3 mt-4">
            <button
              onClick={() => {
                setShowSupplierDialog(false);
                setSupplierSearchTerm('');
              }}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
            >
              Batal
            </button>
          </div>
        </div>
      </div>
    );
  };

  const openItemDialog = (index: number) => {
    // Validasi warehouse header
    if (!warehouse) {
      setValidationMessage('Silakan pilih warehouse default terlebih dahulu');
      setShowValidationAlert(true);
      return;
    }
    
    // Validasi supplier
    if (!supplier) {
      setValidationMessage('Silakan pilih supplier terlebih dahulu');
      setShowValidationAlert(true);
      return;
    }
    
    setCurrentItemIndex(index);
    setShowItemDialog(true);
    setError(''); // Clear error when validations pass
  };

  const saveDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!supplier || selectedItems.length === 0) {
      setError('Silakan pilih supplier dan tambahkan minimal satu item');
      return;
    }

    // Filter out empty items
    const validItems = selectedItems.filter(item => item.item_code && item.qty > 0);
    
    if (validItems.length === 0) {
      setError('Silakan tambahkan minimal satu item yang valid');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // ERPNext compliant payload
      const purchaseOrderData = {
        supplier: supplier,
        company: selectedCompany,
        transaction_date: transactionDate,
        schedule_date: scheduleDate || transactionDate,
        currency: currency,
        conversion_rate: 1,
        set_warehouse: warehouse,
        custom_notes_po: remarks || "",
        items: validItems.map(item => ({
          item_code: item.item_code,
          qty: item.qty,
          uom: item.stock_uom,
          rate: item.rate,
          warehouse: item.warehouse || warehouse
        }))
      };

      console.log('Sending PO data:', purchaseOrderData);

      const response = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(purchaseOrderData),
      });

      const data = await response.json();
      console.log('Save PO Response:', data);
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (data.success) {
        console.log('Setting success message');
        setSuccess('Purchase Order berhasil dibuat!');
        setRedirectCountdown(3); // Start countdown from 3
        
        // Create countdown interval
        let countdown = 3;
        const interval = setInterval(() => {
          countdown--;
          setRedirectCountdown(countdown);
          if (countdown <= 0) {
            clearInterval(interval);
            router.push('/purchase-orders/poList');
          }
        }, 1000);
      } else {
        console.log('Setting error message:', data.message);
        setError(data.message || 'Gagal membuat purchase order');
      }
    } catch (err) {
      console.error('PO creation error:', err);
      setError('Gagal membuat purchase order');
    } finally {
      setLoading(false);
    }
  };

  if (loading && selectedItems.length === 0) {
    return <LoadingSpinner message="Memuat form..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Buat Purchase Order</h1>
              <p className="mt-1 text-sm text-gray-600">Buat purchase order baru</p>
            </div>
            <button
              onClick={() => router.push('/purchase-orders/poList')}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
            >
              Kembali ke Daftar
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      )}

      {success && (
        <>
          {console.log('Rendering success alert with message:', success)}
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">Berhasil!</h3>
                </div>
              </div>
              <div className="mb-4">
                <p className="text-sm text-gray-600">{success}</p>
                <p className="text-sm text-gray-600 mt-2">
                  Purchase Order telah berhasil dibuat dan akan segera dialihkan ke daftar PO.
                </p>
                {redirectCountdown > 0 && (
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Mengalihkan dalam <span className="font-bold text-green-600">{redirectCountdown}</span> detik...
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => router.push('/purchase-orders/poList')}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {redirectCountdown > 0 ? 'Langsung ke Daftar' : 'Ke Daftar PO'}
                </button>
              </div>
            </div>
          </div>
        </>
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
                  Supplier *
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    className="block flex-1 border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-50 sm:text-sm"
                    value={supplier ? suppliers.find(s => s.name === supplier)?.supplier_name || '' : ''}
                    placeholder="Pilih supplier..."
                    readOnly
                  />
                  <button
                    type="button"
                    onClick={() => setShowSupplierDialog(true)}
                    className="bg-indigo-600 text-white px-3 py-2 rounded-md hover:bg-indigo-700"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tanggal Transaksi *
                </label>
                <input
                  type="date"
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  required
                />
              </div>
              <div className="hidden">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tanggal Jadwal
                </label>
                <input
                  type="date"
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                />
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
              <div className="hidden">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Daftar Harga
                </label>
                <select
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={priceList}
                  onChange={(e) => setPriceList(e.target.value)}
                >
                  <option value="">Pembelian Standar</option>
                </select>
              </div>
              <div className="hidden">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pajak dan Biaya
                </label>
                <select
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={taxesAndCharges}
                  onChange={(e) => setTaxesAndCharges(e.target.value)}
                >
                  <option value="">Pilih Template Pajak</option>
                  {taxTemplates.map((tax) => (
                    <option key={tax.name} value={tax.name}>
                      {tax.name} ({tax.tax_rate}%)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Set Warehouse (Default)
                </label>
                <select
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={warehouse}
                  onChange={(e) => setWarehouse(e.target.value)}
                >
                  <option value="">Pilih Gudang</option>
                  {warehouses.map((wh) => (
                    <option key={wh.name} value={wh.name}>
                      {wh.warehouse_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Additional Information */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Kontak Person - Hidden */}
              <div className="hidden">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kontak Person
                </label>
                <input
                  type="text"
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="Nama kontak person..."
                />
              </div>
              {/* Lokasi Pengiriman - Hidden */}
              <div className="hidden">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lokasi Pengiriman
                </label>
                <input
                  type="text"
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={deliveryLocation}
                  onChange={(e) => setDeliveryLocation(e.target.value)}
                  placeholder="Alamat lokasi pengiriman..."
                />
              </div>
            </div>
            
            {/* Address Information - One Row */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alamat Supplier
                </label>
                <textarea
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  rows={3}
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="Alamat supplier..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Catatan
                </label>
                <textarea
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
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

            {/* Add Item Form - Hidden, using dialog instead */}
            <div className="hidden">
              {/* This form is now handled by dialog */}
            </div>

            {/* Items List - Always show like sales order */}
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
                      <div className="col-span-4">
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
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700">
                          Warehouse
                        </label>
                        <input
                          type="text"
                          readOnly
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm bg-gray-50"
                          value={item.warehouse || ''}
                          placeholder="Auto-select"
                        />
                        {item.warehouse && (
                          <div className="mt-1 p-1 bg-blue-50 border border-blue-200 rounded text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-blue-700">
                                Avail: <span className="font-semibold">{item.available_stock || 0}</span>
                              </span>
                              <span className="text-gray-600">
                                A:{item.actual_stock || 0} R:{item.reserved_stock || 0}
                              </span>
                            </div>
                            {(item.available_stock || 0) <= 0 && (
                              <div className="text-xs text-orange-600">⚠️ Out of stock</div>
                            )}
                            {(item.available_stock || 0) > 0 && (item.available_stock || 0) < 10 && (
                              <div className="text-xs text-yellow-600">⚠️ Low stock ({item.available_stock || 0})</div>
                            )}
                          </div>
                        )}
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
                            const newQty = value === '' ? 1 : (parseFloat(value) || 1); // Default to 1 if empty
                            const newItems = [...selectedItems];
                            newItems[index].qty = newQty;
                            newItems[index].amount = newQty * newItems[index].rate;
                            setSelectedItems(newItems);
                          }}
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
                            // Update input state immediately for smooth typing
                            setRateInputValues(prev => ({ ...prev, [index]: inputValue }));
                            
                            // Parse and update the actual rate
                            let value = inputValue.replace(/[^\d,]/g, '');
                            value = value.replace(',', '.');
                            const newRate = parseFloat(value) || 0;
                            
                            const newItems = [...selectedItems];
                            newItems[index].rate = newRate;
                            newItems[index].amount = newItems[index].qty * newRate;
                            setSelectedItems(newItems);
                          }}
                          onFocus={(e) => {
                            // Show raw number on focus
                            const rawValue = item.rate ? item.rate.toString() : '';
                            setRateInputValues(prev => ({ ...prev, [index]: rawValue }));
                            // Use setTimeout to ensure this runs after React's focus handling
                            setTimeout(() => {
                              e.target.value = rawValue;
                              e.target.setSelectionRange(rawValue.length, rawValue.length);
                            }, 0);
                          }}
                          onBlur={(e) => {
                            // Format on blur
                            const newRate = parseFloat(e.target.value.replace(',', '.')) || 0;
                            const formattedValue = newRate.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                            setRateInputValues(prev => ({ ...prev, [index]: formattedValue }));
                            
                            // Update the actual rate
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
                          {selectedItems.reduce((sum, item) => sum + item.qty, 0).toLocaleString('id-ID')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-gray-600">Total Amount:</div>
                        <div className="font-semibold text-lg text-gray-900">
                          {currency} {selectedItems.reduce((sum, item) => sum + item.amount, 0).toLocaleString('id-ID')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.push('/purchase-orders/poList')}
              className="bg-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-400"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || selectedItems.length === 0}
              className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Menyimpan...
                </>
              ) : (
                'Buat Purchase Order'
              )}
            </button>
          </div>
        </form>
      </div>
      
      {/* Validation Alert */}
      {showValidationAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-yellow-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">Validasi Diperlukan</h3>
              </div>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-600">{validationMessage}</p>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowValidationAlert(false)}
                className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Supplier Dialog */}
      {showSupplierDialog && <SupplierDialog />}
      
      {/* Item Dialog */}
      <ItemDialog
        isOpen={showItemDialog}
        onClose={() => {
          setShowItemDialog(false);
          setCurrentItemIndex(null);
        }}
        onSelect={handleItemSelect}
      />
    </div>
  );
}
