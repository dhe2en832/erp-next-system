'use client';

import { useState, useEffect, useCallback } from 'react';
import SalesOrderDialog from '../components/SalesOrderDialog';
import CustomerDialog from '../components/CustomerDialog';
import LoadingSpinner from '../components/LoadingSpinner';
import Pagination from '../components/Pagination';

interface SalesOrder {
  name: string;
  customer: string;
  transaction_date: string;
  grand_total: number;
  status: string;
  delivery_date: string;
  items?: Array<{
    item_code: string;
    item_name: string;
    qty: number;
    rate: number;
    amount: number;
  }>;
}

interface DeliveryNoteItem {
  item_code: string;
  item_name: string;
  qty: number;
  rate: number;
  amount: number;
  uom?: string;
}

interface DeliveryNote {
  name: string;
  customer: string;
  customer_name: string;
  posting_date: string;
  status: string;
  grand_total: number;
  sales_order?: string;
  items?: DeliveryNoteItem[];
}

export default function DeliveryNotePage() {
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [dateFilter, setDateFilter] = useState({
    from_date: '',
    to_date: '',
  });
  const [nameFilter, setNameFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [editingDeliveryNote, setEditingDeliveryNote] = useState<DeliveryNote | null>(null);
  const [currentDeliveryNoteStatus, setCurrentDeliveryNoteStatus] = useState<string>('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [formData, setFormData] = useState({
    customer: '',
    customer_name: '',
    posting_date: new Date().toISOString().split('T')[0],
    sales_order: '',
    items: [{ item_code: '', item_name: '', qty: 1, rate: 0, amount: 0 }],
  });
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSalesOrderDialog, setShowSalesOrderDialog] = useState(false);
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [pageSize] = useState(20); // 20 records per page

  useEffect(() => {
    // Try to get company from localStorage first, then from cookie
    let savedCompany = localStorage.getItem('selected_company');
    
    if (!savedCompany) {
      // Fallback to cookie if localStorage is empty
      const cookies = document.cookie.split(';');
      const companyCookie = cookies.find(cookie => cookie.trim().startsWith('selected_company='));
      if (companyCookie) {
        savedCompany = companyCookie.split('=')[1];
        // Store in localStorage for future use
        if (savedCompany) {
          localStorage.setItem('selected_company', savedCompany);
        }
      }
    }
    
    if (savedCompany) {
      setSelectedCompany(savedCompany);
    }
  }, []);

  const fetchDeliveryNotes = useCallback(async () => {
    // Clear previous error when starting to fetch
    setError('');
    
    // Check for company selection with better logic
    let companyToUse = selectedCompany;
    
    // If no company in state, try to get it fresh
    if (!companyToUse) {
      const storedCompany = localStorage.getItem('selected_company');
      if (storedCompany) {
        companyToUse = storedCompany;
      } else {
        const cookies = document.cookie.split(';');
        const companyCookie = cookies.find(cookie => cookie.trim().startsWith('selected_company='));
        if (companyCookie) {
          const cookieValue = companyCookie.split('=')[1];
          if (cookieValue) {
            companyToUse = cookieValue;
          }
        }
      }
    }
    
    if (!companyToUse) {
      setError('No company selected. Please select a company first.');
      setLoading(false);
      return;
    }
    
    // Update state if we found company from storage
    if (!selectedCompany && companyToUse) {
      setSelectedCompany(companyToUse);
    }
    
    try {
      // Build filters for company
      const filters = [["company", "=", companyToUse]];
      const filtersJson = JSON.stringify(filters);
      
      let url = `/api/delivery-note?filters=${encodeURIComponent(filtersJson)}`;
      
      // Add pagination parameters
      url += `&limit_page_length=${pageSize}&start=${((currentPage - 1) * pageSize)}`;
      
      // Add date filters if provided
      if (dateFilter.from_date) {
        url += `&from_date=${dateFilter.from_date}`;
      }
      if (dateFilter.to_date) {
        url += `&to_date=${dateFilter.to_date}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('Delivery Notes Response:', data);
      
      if (data.success) {
        // Filter by name and customer if filters are provided
        let filteredData = data.data || [];
        if (nameFilter) {
          filteredData = filteredData.filter((dn: DeliveryNote) => 
            dn.name.toLowerCase().includes(nameFilter.toLowerCase())
          );
        }
        if (customerFilter) {
          filteredData = filteredData.filter((dn: DeliveryNote) => 
            dn.customer.toLowerCase().includes(customerFilter.toLowerCase())
          );
        }
        
        setDeliveryNotes(filteredData);
        
        // Update pagination info from API response
        if (data.total_records !== undefined) {
          setTotalRecords(data.total_records);
          const calculatedTotalPages = Math.ceil(data.total_records / pageSize);
          setTotalPages(calculatedTotalPages);
        } else {
          // Fallback: calculate from received data
          setTotalRecords(filteredData.length);
          setTotalPages(1);
        }
        
        setError('');
      } else {
        setError(data.message || 'Failed to fetch delivery notes');
      }
    } catch (err) {
      console.error('Error fetching delivery notes:', err);
      setError('Failed to fetch delivery notes');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, dateFilter, nameFilter, customerFilter, currentPage, pageSize]);

  useEffect(() => {
    fetchDeliveryNotes();
  }, [fetchDeliveryNotes]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter, nameFilter, customerFilter]);

  const handleSalesOrderChange = async (salesOrderName: string) => {
    if (!salesOrderName) {
      // Reset form if no sales order selected
      setFormData({
        ...formData,
        sales_order: salesOrderName,
        customer: '',
        items: [{ item_code: '', item_name: '', qty: 1, rate: 0, amount: 0 }],
      });
      return;
    }
    
    try {
      const response = await fetch(`/api/sales-order/${salesOrderName}`);
      const data = await response.json();
      
      if (data.success) {
        const order = data.data;
        setFormData({
          customer: order.customer,
          customer_name: order.customer_name,
          posting_date: new Date().toISOString().split('T')[0],
          sales_order: salesOrderName,
          items: order.items || [{ item_code: '', item_name: '', qty: 1, rate: 0, amount: 0 }],
        });
      }
    } catch (error) {
      console.error('Error fetching sales order details:', error);
      setError('Failed to fetch sales order details');
    }
  };

  const fetchDeliveryNoteDetails = async (deliveryNoteName: string, deliveryNoteStatus?: string) => {
    if (!deliveryNoteName || deliveryNoteName === 'undefined') {
      console.error('Invalid delivery note name:', deliveryNoteName);
      return;
    }
    
    try {
      const response = await fetch("/api/delivery-note/" + deliveryNoteName);
      const data = await response.json();
      
      if (data.success) {
        const deliveryNote = data.data;
        setEditingDeliveryNote(deliveryNote);
        setCurrentDeliveryNoteStatus(deliveryNoteStatus || deliveryNote.status || '');
        
        // Extract sales_order from items if available
        let salesOrderValue = '';
        if (deliveryNote.items && deliveryNote.items.length > 0) {
          const firstItem = deliveryNote.items[0];
          salesOrderValue = firstItem.against_sales_order || '';
          console.log('Sales Order extracted from items:', salesOrderValue);
        }
        
        setFormData({
          customer: deliveryNote.customer,
          customer_name: deliveryNote.customer_name,
          posting_date: deliveryNote.posting_date,
          sales_order: salesOrderValue, // Extract from items
          items: deliveryNote.items || [{ item_code: '', item_name: '', qty: 1, rate: 0, amount: 0 }],
        });
        setShowForm(true);
      }
    } catch (error) {
      console.error('Error fetching delivery note details:', error);
      setError('Failed to fetch delivery note details');
    }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        { item_code: '', item_name: '', qty: 1, rate: 0, amount: 0 },
      ],
    });
  };

  const handleRemoveItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const handleItemChange = (index: number, field: string, value: string | number) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === 'qty' || field === 'rate') {
      newItems[index].amount = newItems[index].qty * newItems[index].rate;
    }

    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');

    try {
      // Build delivery note payload sesuai struktur ERPNext
      const deliveryNotePayload = {
        company: selectedCompany,
        customer: formData.customer,
        posting_date: formData.posting_date,
        // Field tambahan yang penting untuk ERPNext
        naming_series: 'DN-.YYYY.-', // Standard naming series
        // Reference ke Sales Order melalui remarks (ERPNext standard)
        ...(formData.sales_order && { 
          remarks: `Based on Sales Order: ${formData.sales_order}`
        }),
        // Items dengan structure yang benar (termasuk SO reference)
        items: formData.items.map((item) => ({
          item_code: item.item_code,
          item_name: item.item_name,
          qty: item.qty,
          rate: item.rate,
          amount: item.amount,
          // Field penting untuk ERPNext Delivery Note items
          warehouse: item.warehouse || 'Stores', // Dynamic warehouse dari item
          // ✅ KEEP THIS - Field yang valid di ERPNext!
          ...(formData.sales_order && {
            against_sales_order: formData.sales_order,
            so_detail: item.so_detail || '' // Harus diisi dengan valid SO item ID
          }),
          delivered_qty: item.qty, // Default delivered qty
          target_warehouse: item.warehouse || 'Stores', // Dynamic warehouse
          conversion_factor: 1, // Default conversion factor
          stock_uom: item.stock_uom || 'Nos', // Unit of measurement dari item
          // Hapus field yang mungkin bermasalah:
          // cost_center - akan di-auto fill oleh ERPNext
        }))
      };
      
      console.log('Delivery Note Payload:', JSON.stringify(deliveryNotePayload, null, 2));
      
      const response = await fetch('/api/delivery-note', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deliveryNotePayload),
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage(`✅ Delivery Note berhasil disimpan!\n\n📄 Nomor: ${data.data?.name || 'DN Baru'}\n👤 Customer: ${formData.customer}\n📅 Tanggal: ${formData.posting_date}\n💰 Total: ${formData.items.reduce((sum, item) => sum + item.amount, 0).toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}\n\n🎯 Next Steps:\n• Klik tombol "Submit" untuk mengubah status menjadi "Submitted"\n• Setelah submit, stock akan berkurang dari gudang`);
        
        setShowForm(false);
        resetForm(); // Gunakan resetForm function
        fetchDeliveryNotes();
        
        // Clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        setError(data.message);
      }
    } catch (err) {
      console.error('Error creating delivery note:', err);
      setError('Failed to create delivery note');
    } finally {
      setFormLoading(false);
    }
  };

  // Submit Delivery Note
  const handleSubmitDeliveryNote = async (deliveryNoteName: string) => {
    try {
      console.log('Submitting Delivery Note:', deliveryNoteName);
      
      const response = await fetch(`/api/delivery-note/${deliveryNoteName}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      console.log('Submit Delivery Note Response:', result);

      if (result.success) {
        setSuccessMessage(`✅ Delivery Note ${deliveryNoteName} berhasil di-submit!\n\n📦 Status: Draft → Submitted\n📉 Stock Impact:\n• Stock telah berkurang dari gudang\n• Barang telah keluar (delivered)\n\n🔔 Next Steps:\n• Buat Sales Invoice untuk jurnal akuntansi\n• Customer dapat menerima barang sesuai DN`);
        fetchDeliveryNotes(); // Refresh list
        
        // Clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        setError(`❌ Gagal submit Delivery Note: ${result.message}`);
      }
    } catch (error) {
      console.error('Error submitting delivery note:', error);
      setError('❌ Terjadi error saat submit Delivery Note');
    }
  };

  // Reset form function
  const resetForm = () => {
    setFormData({
      customer: '',
      customer_name: '',
      posting_date: new Date().toISOString().split('T')[0],
      sales_order: '',
      items: [{ item_code: '', item_name: '', qty: 1, rate: 0, amount: 0, uom: 'Nos' }],
    });
    setError('');
    setFormLoading(false);
    setEditingDeliveryNote(null); // Reset editing state
    setCurrentDeliveryNoteStatus(''); // Reset status
  };

  // Handle sales order selection from dialog
  const handleSalesOrderSelect = async (salesOrder: SalesOrder) => {
    try {
      console.log('Selected sales order:', salesOrder);
      
      // Reset form sebelum mengisi data baru
      resetForm();
      
      // Fetch detailed sales order data including items
      const response = await fetch(`/api/sales-order/${salesOrder.name}`);
      const data = await response.json();
      
      if (data.success) {
        const order = data.data;
        console.log('Sales order details:', order);
        
        // Map sales order items to delivery note items dengan field lengkap
        const deliveryNoteItems = order.items ? order.items.map((item: any) => ({
          item_code: item.item_code,
          item_name: item.item_name,
          qty: item.qty,
          rate: item.rate,
          amount: item.amount,
          uom: item.uom || 'Nos',
          so_detail: item.name, // Sales Order item detail ID
          warehouse: item.warehouse || 'Stores - EN',
          delivered_qty: item.qty // Default delivered qty = ordered qty
        })) : [{ item_code: '', item_name: '', qty: 1, rate: 0, amount: 0, uom: 'Nos' }];
        
        console.log('Mapped delivery note items:', deliveryNoteItems);
        
        // Set form dengan data dari sales order
        setFormData({
          customer: order.customer,
          customer_name: order.customer_name,
          posting_date: new Date().toISOString().split('T')[0],
          sales_order: order.name,
          items: deliveryNoteItems,
        });
        setShowForm(true);
      } else {
        setError('Failed to fetch sales order details');
      }
    } catch (error) {
      console.error('Error fetching sales order details:', error);
      setError('Failed to fetch sales order details');
    }
  };

  // Handle create new delivery note
  const handleCreateNew = () => {
    resetForm();
    setShowForm(true);
    setError(''); // Clear error when opening new form
    setSuccessMessage(''); // Clear success message when opening new form
  };

  // Handle customer selection
  const handleCustomerSelect = (customer: { name: string; customer_name: string }) => {
    setFormData(prev => ({ 
      ...prev, 
      customer: customer.name,
      customer_name: customer.customer_name
    }));
    setShowCustomerDialog(false);
    setError('');
  };

  if (loading) {
    return <LoadingSpinner message="Loading Delivery Notes..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Delivery Notes</h1>
          <button
            onClick={handleCreateNew}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            New Delivery Note
          </button>
        </div>

        {/* Success Message Alert */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Berhasil!</h3>
                <div className="mt-2 text-sm text-green-700">
                  <pre className="whitespace-pre-wrap font-sans">{successMessage}</pre>
                </div>
              </div>
              <div className="ml-auto pl-3">
                <div className="-mx-1.5 -my-1.5">
                  <button
                    onClick={() => setSuccessMessage('')}
                    className="inline-flex bg-green-50 rounded-md p-1.5 text-green-500 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-green-50 focus:ring-green-600"
                  >
                    <span className="sr-only">Dismiss</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <pre className="whitespace-pre-wrap font-sans">{error}</pre>
                </div>
              </div>
              <div className="ml-auto pl-3">
                <div className="-mx-1.5 -my-1.5">
                  <button
                    onClick={() => setError('')}
                    className="inline-flex bg-red-50 rounded-md p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-red-50 focus:ring-red-600"
                  >
                    <span className="sr-only">Dismiss</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6 border-b border-gray-200">
            <p className="text-sm text-gray-500">Manage delivery notes (surat jalan)</p>
          </div>
        </div>

          {/* Filters */}
          <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Name
            </label>
            <input
              type="text"
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Search by name..."
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Customer
            </label>
            <input
              type="text"
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Search by customer..."
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              type="date"
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={dateFilter.from_date}
              onChange={(e) => setDateFilter({ ...dateFilter, from_date: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              type="date"
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={dateFilter.to_date}
              onChange={(e) => setDateFilter({ ...dateFilter, to_date: e.target.value })}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setDateFilter({ from_date: '', to_date: '' });
                setNameFilter('');
                setCustomerFilter('');
              }}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

          {/* Error Message */}
          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            </div>
          )}

          {/* Delivery Notes List */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {deliveryNotes.map((deliveryNote, index) => {
            console.log(`Rendering delivery note ${index}:`, deliveryNote);
            return (
            <li 
              key={deliveryNote.name}
              onClick={() => {
                if (deliveryNote.name) {
                  fetchDeliveryNoteDetails(deliveryNote.name, deliveryNote.status);
                }
              }}
              className="cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-indigo-600 truncate">
                      {deliveryNote.name}
                    </p>
                    <p className="mt-1 text-sm text-gray-900">Customer: {deliveryNote.customer_name}</p>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        deliveryNote.status === 'Submitted'
                          ? 'bg-green-100 text-green-800'
                          : deliveryNote.status === 'Draft'
                          ? 'bg-yellow-100 text-yellow-800'
                          : deliveryNote.status === 'Completed'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {deliveryNote.status}
                    </span>
                  </div>
                </div>
                <div className="mt-2 sm:flex sm:justify-between">
                  <div className="sm:flex">
                    <p className="flex items-center text-sm text-gray-500">
                      Posting Date: {deliveryNote.posting_date}
                    </p>
                    {deliveryNote.sales_order && (
                      <p className="mt-2 sm:mt-0 sm:ml-6 flex items-center text-sm text-gray-500">
                        SO: {deliveryNote.sales_order}
                      </p>
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-between sm:mt-0">
                    <span className="font-medium text-sm text-gray-500">Total: Rp {deliveryNote.grand_total ? deliveryNote.grand_total.toLocaleString('id-ID') : '0'}</span>
                    
                    {/* Submit button for Draft delivery notes */}
                    {deliveryNote.status === 'Draft' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent opening delivery note details
                          handleSubmitDeliveryNote(deliveryNote.name);
                        }}
                        className="ml-4 px-3 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors"
                      >
                        Submit
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </li>
            );
          })}
        </ul>
        {deliveryNotes.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No delivery notes found</p>
          </div>
        )}
        
        {/* Pagination Controls */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalRecords={totalRecords}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">
                    {editingDeliveryNote ? 'Edit Delivery Note' : 'Create Delivery Note'}
                  </h3>
                  {!editingDeliveryNote && (
                    <button
                      type="button"
                      onClick={() => {
                        console.log('Opening Sales Order Dialog. Selected Company:', selectedCompany);
                        if (!selectedCompany) {
                          setError('No company selected. Please select a company first.');
                          return;
                        }
                        setShowSalesOrderDialog(true);
                      }}
                      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                    >
                      Create from Sales Order
                    </button>
                  )}
                </div>
              </div>
              <form onSubmit={handleSubmit} className="px-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Sales Order
                    </label>
                    <div className="flex mt-1">
                      <input
                        type="text"
                        value={formData.sales_order}
                        onChange={(e) => handleSalesOrderChange(e.target.value)}
                        placeholder="Pilih Sales Order..."
                        className="mt-1 block w-full border border-gray-300 rounded-l-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-50"
                        readOnly
                      />
                      <button
                        type="button"
                        onClick={() => {
                          console.log('Opening Sales Order Dialog. Selected Company:', selectedCompany);
                          if (!selectedCompany) {
                            setError('No company selected. Please select a company first.');
                            return;
                          }
                          setShowSalesOrderDialog(true);
                        }}
                        className="px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </button>
                    </div>
                    {formData.sales_order && (
                      <p className="mt-1 text-xs text-green-600">
                        SO: {formData.sales_order}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Customer
                    </label>
                    <div className="flex mt-1">
                      <input
                        type="text"
                        value={formData.customer_name || formData.customer}
                        onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-l-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="Select customer..."
                        readOnly
                      />
                      <button
                        type="button"
                        onClick={() => setShowCustomerDialog(true)}
                        className="px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Posting Date
                    </label>
                    <input
                      type="date"
                      value={formData.posting_date}
                      onChange={(e) => setFormData({ ...formData, posting_date: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      required
                    />
                  </div>
                </div>

                {/* Items Section */}
                <div className="mt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-md font-medium text-gray-900">Items</h4>
                    {/* Always hide Add Item button */}
                  </div>
                  
                  {formData.items.map((item, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
                      <div className="grid grid-cols-2 lg:grid-cols-6 gap-6">
                        <div>
                          <label className="block text-xs font-medium text-gray-700">
                            Item Code
                          </label>
                          <input
                            type="text"
                            value={item.item_code}
                            onChange={(e) => handleItemChange(index, 'item_code', e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm bg-gray-50"
                            placeholder="ITEM-001"
                            readOnly
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700">
                            Item Name
                          </label>
                          <input
                            type="text"
                            value={item.item_name}
                            onChange={(e) => handleItemChange(index, 'item_name', e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm bg-gray-50"
                            placeholder="Item description"
                            readOnly
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700">
                            Quantity
                          </label>
                          <input
                            type="text"
                            value={item.qty ? item.qty.toLocaleString('id-ID') : '0'}
                            onChange={(e) => handleItemChange(index, 'qty', parseFloat(e.target.value) || 0)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm bg-gray-50 text-right"
                            min="0"
                            readOnly
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700">
                            UoM
                          </label>
                          <input
                            type="text"
                            value={item.stock_uom || '-'}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm bg-gray-50 text-center"
                            placeholder="-"
                            readOnly
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700">
                            Rate
                          </label>
                          <input
                            type="text"
                            value={item.rate ? item.rate.toLocaleString('id-ID') : '0'}
                            onChange={(e) => handleItemChange(index, 'rate', parseFloat(e.target.value) || 0)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm bg-gray-50 text-right"
                            min="0"
                            step="0.01"
                            readOnly
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700">
                            Amount
                          </label>
                          <input
                            type="text"
                            readOnly
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm bg-gray-50 text-right"
                            value={item.amount ? item.amount.toLocaleString('id-ID') : '0'}
                          />
                        </div>
                      </div>
                      <div className="flex justify-between items-center mt-3">
                        <div className="flex-1"></div>
                        {formData.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            disabled={editingDeliveryNote && currentDeliveryNoteStatus !== 'Draft'}
                            className={`text-sm px-3 py-1 rounded ${
                              editingDeliveryNote && currentDeliveryNoteStatus !== 'Draft'
                                ? 'text-gray-400 cursor-not-allowed bg-gray-100'
                                : 'text-red-600 hover:text-red-800 hover:bg-red-50'
                            }`}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals Section */}
                <div className="mt-6 bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    <div className="col-span-2 md:col-span-4"></div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">
                        Total Quantity
                      </label>
                      <input
                        type="text"
                        readOnly
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm bg-white text-right font-semibold"
                        value={formData.items.reduce((total, item) => total + (item.qty || 0), 0).toLocaleString('id-ID')}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">
                        Total Amount
                      </label>
                      <input
                        type="text"
                        readOnly
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm bg-white text-right font-semibold"
                        value={formData.items.reduce((total, item) => total + (item.amount || 0), 0).toLocaleString('id-ID')}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      resetForm(); // Reset form saat close
                      setShowForm(false);
                    }}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading || currentDeliveryNoteStatus === 'Completed'}
                    className={`${
                      currentDeliveryNoteStatus === 'Completed'
                        ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    } px-4 py-2 rounded-md disabled:opacity-50`}
                  >
                    {formLoading 
                      ? 'Creating...' 
                      : currentDeliveryNoteStatus === 'Completed' 
                        ? 'Delivery Note Completed - Cannot Edit' 
                        : editingDeliveryNote 
                          ? 'Update Delivery Note' 
                          : 'Create Delivery Note'
                    }
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Sales Order Dialog */}
      <SalesOrderDialog
        isOpen={showSalesOrderDialog}
        onClose={() => setShowSalesOrderDialog(false)}
        onSelect={handleSalesOrderSelect}
        selectedCompany={selectedCompany}
        customerFilter={formData.customer}
      />

      {/* Customer Dialog */}
      <CustomerDialog
        isOpen={showCustomerDialog}
        onClose={() => setShowCustomerDialog(false)}
        onSelect={handleCustomerSelect}
      />
    </div>
  );
}
