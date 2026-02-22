'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SalesOrderDialog from '../../components/SalesOrderDialog';
import CustomerDialog from '../../components/CustomerDialog';
import LoadingSpinner from '../../components/LoadingSpinner';
import PrintDialog from '../../components/PrintDialog';
import { formatDate, parseDate } from '../../../utils/format';
import { handleERPNextError } from '../../../utils/erpnext-error-handler';
import BrowserStyleDatePicker from '../../../components/BrowserStyleDatePicker';

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
  so_detail?: string;
  warehouse?: string;
  stock_uom?: string;
  delivered_qty?: number;
}

interface SalesTeamMember {
  sales_person: string;
  allocated_percentage: number;
}

interface DeliveryNoteFormData {
  customer: string;
  customer_name: string;
  posting_date: string;
  sales_order: string;
  custom_notes_dn: string;
  payment_terms_template?: string;
  items: DeliveryNoteItem[];
}

export default function DeliveryNoteMain() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dnName = searchParams.get('name');

  const [loading, setLoading] = useState(!!dnName);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [editingDeliveryNote, setEditingDeliveryNote] = useState<any>(null);
  const [currentDeliveryNoteStatus, setCurrentDeliveryNoteStatus] = useState<string>('');
  const [error, setError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [savedDocName, setSavedDocName] = useState('');
  // Track the doc name created in this session to avoid duplicate POST on retry
  const createdDocName = useRef<string | null>(dnName || null);
  const isSubmitting = useRef(false);

  const [formData, setFormData] = useState<DeliveryNoteFormData>({
    customer: '',
    customer_name: '',
    posting_date: formatDate(new Date()),
    sales_order: '',
    custom_notes_dn: '',
    items: [{ item_code: '', item_name: '', qty: 1, rate: 0, amount: 0, uom: 'Nos' }],
  });

  const [salesTeam, setSalesTeam] = useState<SalesTeamMember[]>([]);

  const [showSalesOrderDialog, setShowSalesOrderDialog] = useState(false);
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);

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

  // Fetch DN details in edit/view mode
  useEffect(() => {
    if (dnName && selectedCompany) {
      fetchDeliveryNoteDetails(dnName);
    }
  }, [dnName, selectedCompany]);

  const fetchDeliveryNoteDetails = async (name: string) => {
    if (!name || name === 'undefined') return;
    setLoading(true);
    try {
      const response = await fetch("/api/sales/delivery-notes/" + name);
      const data = await response.json();
      if (data.success) {
        const dn = data.data;
        setEditingDeliveryNote(dn);
        setCurrentDeliveryNoteStatus(dn.status || '');

        let salesOrderValue = '';
        if (dn.items && dn.items.length > 0) {
          salesOrderValue = dn.items[0].against_sales_order || '';
        }

        setFormData({
          customer: dn.customer,
          customer_name: dn.customer_name,
          posting_date: formatDate(dn.posting_date),
          sales_order: salesOrderValue,
          custom_notes_dn: dn.custom_notes_dn || '',
          payment_terms_template: dn.payment_terms_template || '',
          items: dn.items || [{ item_code: '', item_name: '', qty: 1, rate: 0, amount: 0 }],
        });
        // Load sales_team from DN
        const loadedSalesTeam = dn.sales_team?.map((member: any) => ({
          sales_person: member.sales_person || '',
          allocated_percentage: member.allocated_percentage || 0
        })) || [];
        setSalesTeam(loadedSalesTeam);
      } else {
        setError('Gagal memuat detail surat jalan');
      }
    } catch (err) {
      console.error('Error fetching delivery note details:', err);
      setError('Gagal memuat detail surat jalan');
    } finally {
      setLoading(false);
    }
  };

  const handleSalesOrderChange = async (salesOrderName: string) => {
    if (!salesOrderName) {
      setFormData({
        ...formData,
        sales_order: salesOrderName,
        customer: '',
        items: [{ item_code: '', item_name: '', qty: 1, rate: 0, amount: 0 }],
      });
      setSalesTeam([]);
      return;
    }
    try {
      const response = await fetch(`/api/sales/orders/${salesOrderName}`);
      const data = await response.json();
      if (data.success) {
        const order = data.data;
        setFormData({
          customer: order.customer,
          customer_name: order.customer_name,
          posting_date: new Date().toISOString().split('T')[0],
          sales_order: salesOrderName,
          custom_notes_dn: order.custom_notes_so || '',
          payment_terms_template: order.payment_terms_template || '',
          items: order.items || [{ item_code: '', item_name: '', qty: 1, rate: 0, amount: 0 }],
        });
        // Copy sales_team from SO
        const loadedSalesTeam = order.sales_team?.map((member: any) => ({
          sales_person: member.sales_person || '',
          allocated_percentage: member.allocated_percentage || 0
        })) || [];
        setSalesTeam(loadedSalesTeam);
      }
    } catch (err) {
      console.error('Error fetching sales order details:', err);
      setError('Gagal memuat detail pesanan penjualan');
    }
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
    // Prevent double-submit
    if (isSubmitting.current) return;
    isSubmitting.current = true;
    setFormLoading(true);
    setError('');

    try {
      const deliveryNotePayload = {
        company: selectedCompany,
        customer: formData.customer,
        posting_date: parseDate(formData.posting_date),
        naming_series: 'DN-.YYYY.-',
        ...(formData.sales_order && {
          remarks: `Based on Sales Order: ${formData.sales_order}`
        }),
        custom_notes_dn: formData.custom_notes_dn || '',
        payment_terms_template: formData.payment_terms_template || undefined,
        sales_team: salesTeam.length > 0 ? salesTeam : undefined,
        items: formData.items.map((item) => ({
          item_code: item.item_code,
          item_name: item.item_name,
          qty: item.qty,
          rate: item.rate,
          amount: item.amount,
          warehouse: item.warehouse || 'Stores',
          ...(formData.sales_order && {
            against_sales_order: formData.sales_order,
            so_detail: item.so_detail || ''
          }),
          delivered_qty: item.qty,
          target_warehouse: item.warehouse || 'Stores',
          conversion_factor: 1,
          stock_uom: item.stock_uom || 'Nos',
        }))
      };

      // If doc was already created in this session (or we're editing), use PUT to avoid duplicate
      const existingName = createdDocName.current;
      const isUpdate = !!existingName;

      console.log('[DEBUG] DN Payload:', deliveryNotePayload, 'isUpdate:', isUpdate, 'name:', existingName);

      const response = await fetch(
        isUpdate ? `/api/sales/delivery-notes/${existingName}` : '/api/sales/delivery-notes',
        {
          method: isUpdate ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(isUpdate ? { name: existingName, ...deliveryNotePayload } : deliveryNotePayload),
        }
      );

      const data = await response.json();

      if (data.success) {
        const docName = data.data?.name || existingName || '';
        createdDocName.current = docName;
        setSavedDocName(docName);
        setShowPrintDialog(true);
      } else {
        const { bannerMessage } = handleERPNextError(
          data,
          formData.posting_date,
          'Surat Jalan',
          'Gagal menyimpan surat jalan'
        );
        setError(bannerMessage);
      }
    } catch (err) {
      console.error('Error creating delivery note:', err);
      setError('Gagal membuat surat jalan');
    } finally {
      setFormLoading(false);
      isSubmitting.current = false;
    }
  };

  const getDefaultWarehouse = async (company: string) => {
    try {
      const response = await fetch(`/api/finance/company/settings?company=${encodeURIComponent(company)}`);
      const data = await response.json();
      if (data.success && data.data?.default_warehouse) {
        return data.data.default_warehouse;
      }
    } catch (error: unknown) {
      console.error('Failed to fetch company settings:', error);
    }

    // Fallback: fetch available warehouses and pick the first one
    try {
      const whResponse = await fetch(`/api/inventory/warehouses?company=${encodeURIComponent(company)}`);
      const whData = await whResponse.json();
      if (whData.success && whData.data && whData.data.length > 0) {
        return whData.data[0].name;
      }
    } catch (error: unknown) {
      console.error('Failed to fetch warehouses:', error);
    }

    // Last resort fallback
    return 'Stores';
  };

  const resetForm = () => {
    setFormData({
      customer: '',
      customer_name: '',
      posting_date: formatDate(new Date()),
      sales_order: '',
      custom_notes_dn: '',
      items: [{ item_code: '', item_name: '', qty: 1, rate: 0, amount: 0, uom: 'Nos' }],
    });
    setSalesTeam([]);
    setError('');
  };

  const handleSalesOrderSelect = async (salesOrder: SalesOrder) => {
    try {
      resetForm();
      const response = await fetch(`/api/sales/orders/${salesOrder.name}`);
      const data = await response.json();
      if (data.success) {
        const order = data.data;
        const defaultWarehouse = await getDefaultWarehouse(selectedCompany);
        const deliveryNoteItems = order.items ? order.items.map((item: any) => ({
          item_code: item.item_code,
          item_name: item.item_name,
          qty: item.qty,
          rate: item.rate,
          amount: item.amount,
          uom: item.uom || 'Nos',
          stock_uom: item.stock_uom || item.uom || 'Nos',
          so_detail: item.name,
          warehouse: item.warehouse || defaultWarehouse,
          delivered_qty: item.qty,
        })) : [{ item_code: '', item_name: '', qty: 1, rate: 0, amount: 0, uom: 'Nos' }];

        setFormData({
          customer: order.customer,
          customer_name: order.customer_name,
          posting_date: new Date().toISOString().split('T')[0],
          sales_order: order.name,
          custom_notes_dn: order.custom_notes_so || '',
          payment_terms_template: order.payment_terms_template || '',
          items: deliveryNoteItems,
        });
        // Copy sales_team from SO
        const loadedSalesTeam = order.sales_team?.map((member: any) => ({
          sales_person: member.sales_person || '',
          allocated_percentage: member.allocated_percentage || 0
        })) || [];
        setSalesTeam(loadedSalesTeam);
        
      } else {
        setError('Gagal memuat detail pesanan penjualan');
      }
    } catch (err) {
      console.error('Error fetching sales order details:', err);
      setError('Gagal memuat detail pesanan penjualan');
    }
  };

  const handleCustomerSelect = (customer: { name: string; customer_name: string }) => {
    setFormData(prev => ({
      ...prev,
      customer: customer.name,
      customer_name: customer.customer_name
    }));
    setShowCustomerDialog(false);
    setError('');
  };

  const isReadOnly = editingDeliveryNote && currentDeliveryNoteStatus !== 'Draft';

  if (loading) {
    return <LoadingSpinner message="Memuat detail surat jalan..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {editingDeliveryNote
                  ? (isReadOnly ? 'Lihat Surat Jalan' : 'Edit Surat Jalan')
                  : 'Buat Surat Jalan Baru'}
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                {editingDeliveryNote
                  ? (isReadOnly ? 'Lihat detail surat jalan (hanya baca)' : 'Perbarui surat jalan yang ada')
                  : 'Buat surat jalan baru'}
              </p>
            </div>
            <div className="flex gap-2">
              {!editingDeliveryNote && (
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedCompany) {
                      setError('Perusahaan belum dipilih. Silakan pilih perusahaan terlebih dahulu.');
                      return;
                    }
                    setShowSalesOrderDialog(true);
                  }}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                >
                  Dari Pesanan Penjualan
                </button>
              )}
              <button
                onClick={() => router.push('/delivery-note/dnList')}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
              >
                Kembali ke Daftar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Success */}
      {successMessage && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            {successMessage}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      )}

      {/* Form */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="bg-white shadow rounded-lg">
          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Pesanan Penjualan</label>
                <div className="flex mt-1">
                  <input
                    type="text"
                    value={formData.sales_order}
                    onChange={(e) => handleSalesOrderChange(e.target.value)}
                    placeholder="Pilih Pesanan Penjualan..."
                    className="mt-1 block w-full border border-gray-300 rounded-l-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-50"
                    readOnly
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedCompany) {
                        setError('Perusahaan belum dipilih. Silakan pilih perusahaan terlebih dahulu.');
                        return;
                      }
                      setShowSalesOrderDialog(true);
                    }}
                    className="px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-500 hover:bg-gray-100"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                </div>
                {formData.sales_order && (
                  <p className="mt-1 text-xs text-green-600">SO: {formData.sales_order}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Pelanggan</label>
                <div className="flex mt-1">
                  <input
                    type="text"
                    value={formData.customer_name || formData.customer}
                    onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-l-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Pilih pelanggan..."
                    readOnly
                  />
                  <button
                    type="button"
                    onClick={() => setShowCustomerDialog(true)}
                    className="px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-500 hover:bg-gray-100"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Tanggal Posting</label>
                <BrowserStyleDatePicker
                  value={formData.posting_date}
                  onChange={(value: string) => setFormData({ ...formData, posting_date: value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="DD/MM/YYYY"
                />
              </div>
            </div>

            {/* Items Section */}
            <div className="mt-6">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-md font-medium text-gray-900">Barang</h4>
              </div>

              {formData.items.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-2 lg:grid-cols-6 gap-6">
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Kode Barang</label>
                      <input type="text" value={item.item_code} onChange={(e) => handleItemChange(index, 'item_code', e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm bg-gray-50" placeholder="ITEM-001" readOnly />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Nama Barang</label>
                      <input type="text" value={item.item_name} onChange={(e) => handleItemChange(index, 'item_name', e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm bg-gray-50" placeholder="Deskripsi barang" readOnly />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Jml</label>
                      <input type="text" value={item.qty ? item.qty.toLocaleString('id-ID') : '0'} onChange={(e) => handleItemChange(index, 'qty', parseFloat(e.target.value) || 0)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm bg-gray-50 text-right" readOnly />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">UoM</label>
                      <input type="text" value={item.stock_uom || '-'} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm bg-gray-50 text-center" placeholder="-" readOnly />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Harga</label>
                      <input type="text" value={item.rate ? item.rate.toLocaleString('id-ID') : '0'} onChange={(e) => handleItemChange(index, 'rate', parseFloat(e.target.value) || 0)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm bg-gray-50 text-right" readOnly />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Jumlah</label>
                      <input type="text" readOnly className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm bg-gray-50 text-right" value={item.amount ? item.amount.toLocaleString('id-ID') : '0'} />
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-3">
                    <div className="flex-1"></div>
                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        disabled={!!isReadOnly}
                        className={`text-sm px-3 py-1 rounded ${isReadOnly ? 'text-gray-400 cursor-not-allowed bg-gray-100' : 'text-red-600 hover:text-red-800 hover:bg-red-50'}`}
                      >
                        Hapus
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
                  <label className="block text-xs font-medium text-gray-700">Total Kuantitas</label>
                  <input type="text" readOnly className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm bg-white text-right font-semibold" value={formData.items.reduce((total, item) => total + (item.qty || 0), 0).toLocaleString('id-ID')} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Total Jumlah</label>
                  <input type="text" readOnly className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm bg-white text-right font-semibold" value={formData.items.reduce((total, item) => total + (item.amount || 0), 0).toLocaleString('id-ID')} />
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
              <textarea
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                rows={3}
                value={formData.custom_notes_dn || ''}
                onChange={(e) => setFormData({ ...formData, custom_notes_dn: e.target.value })}
                placeholder="Tambahkan catatan untuk surat jalan ini..."
                disabled={isReadOnly}
              />
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => router.push('/delivery-note/dnList')}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
              >
                Batal
              </button>
              {!isReadOnly && (
                <button
                  type="submit"
                  disabled={formLoading}
                  className="bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-md disabled:opacity-50 flex items-center gap-2"
                >
                  {formLoading && <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                  {formLoading
                    ? 'Memproses...'
                    : editingDeliveryNote
                      ? 'Perbarui Surat Jalan'
                      : 'Simpan Surat Jalan'
                  }
                </button>
              )}
              {isReadOnly && (
                <span className="px-4 py-2 text-sm text-gray-500 bg-gray-100 rounded-md">
                  {currentDeliveryNoteStatus} - Hanya Baca
                </span>
              )}
            </div>
          </form>
        </div>
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

      {/* Print Dialog after save */}
      <PrintDialog
        isOpen={showPrintDialog}
        onClose={() => { setShowPrintDialog(false); router.push('/delivery-note/dnList'); }}
        documentType="Delivery Note"
        documentName={savedDocName}
        documentLabel="Surat Jalan"
      />
    </div>
  );
}
