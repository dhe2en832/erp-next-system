'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoadingSpinner from '../../components/LoadingSpinner';
import { formatDate, parseDate } from '../../../utils/format';
import BrowserStyleDatePicker from '../../../components/BrowserStyleDatePicker';

interface InvoiceItem {
  item_code: string;
  item_name: string;
  qty: number;
  rate: number;
  amount: number;
  income_account: string;
  cost_center: string;
  warehouse: string;
  delivery_note?: string;
  sales_order?: string;
  so_detail?: string;
  dn_detail?: string;
  custom_komisi_sales?: number;
}

interface CompleteInvoiceItem extends InvoiceItem {
  name?: string;
  description?: string;
  against_sales_order?: string;
  sales_order_item?: string;
  stock_uom?: string;
  conversion_factor?: number;
}

export default function SalesInvoiceMain() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invoiceName = searchParams.get('name');

  const [loading, setLoading] = useState(!!invoiceName);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [editingInvoice, setEditingInvoice] = useState<string | null>(null);
  const [editingInvoiceStatus, setEditingInvoiceStatus] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Delivery Note Dialog
  const [showDeliveryNoteDialog, setShowDeliveryNoteDialog] = useState(false);
  const [deliveryNotes, setDeliveryNotes] = useState<any[]>([]);
  const [deliveryNotesLoading, setDeliveryNotesLoading] = useState(false);
  const [deliveryNotesError, setDeliveryNotesError] = useState('');

  const [formData, setFormData] = useState({
    customer: '',
    customer_name: '',
    posting_date: formatDate(new Date()),
    due_date: formatDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
    items: [{
      item_code: '',
      item_name: '',
      qty: 1,
      rate: 0,
      amount: 0,
      income_account: '411000 - Penjualan - ST',
      cost_center: 'Main - ST',
      warehouse: 'Finished Goods - ST',
      sales_order: '',
      so_detail: '',
      dn_detail: '',
      delivery_note: '',
      custom_komisi_sales: 0,
    }],
    company: '',
    currency: 'IDR',
    price_list_currency: 'IDR',
    plc_conversion_rate: 1,
    selling_price_list: 'Standard Selling',
    territory: 'All Territories',
    tax_id: '',
    customer_address: '',
    shipping_address: '',
    contact_person: '',
    tax_category: 'On Net Total',
    taxes_and_charges: '',
    base_total: 0,
    base_net_total: 0,
    base_grand_total: 0,
    total: 0,
    net_total: 0,
    grand_total: 0,
    outstanding_amount: 0,
    custom_total_komisi_sales: 0,
    custom_notes_si: '',
  });

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
    if (savedCompany) {
      setSelectedCompany(savedCompany);
      setFormData(prev => ({ ...prev, company: savedCompany! }));
    }
  }, []);

  // Fetch invoice details in edit/view mode
  useEffect(() => {
    if (invoiceName && selectedCompany) {
      handleEditInvoice(invoiceName);
    }
  }, [invoiceName, selectedCompany]);

  const handleEditInvoice = async (name: string) => {
    if (!name || name === 'undefined') return;
    setLoading(true);
    try {
      const response = await fetch("/api/sales/invoices", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceName: name }),
      });
      const data = await response.json();

      if (data.success) {
        const invoice = data.data;
        const invoiceItems = (invoice.items || []).map((item: CompleteInvoiceItem) => ({
          item_code: item.item_code,
          item_name: item.item_name,
          qty: item.qty,
          rate: item.rate,
          amount: item.amount,
          income_account: item.income_account || '411000 - Penjualan - ST',
          cost_center: item.cost_center || 'Main - ST',
          warehouse: item.warehouse || 'Finished Goods - ST',
          sales_order: item.sales_order || '',
          so_detail: item.so_detail || '',
          dn_detail: item.dn_detail || '',
          delivery_note: item.delivery_note || '',
          custom_komisi_sales: item.custom_komisi_sales || 0,
        }));

        const totalKomisiSales = invoiceItems.reduce((sum: number, item: CompleteInvoiceItem) => sum + (item.custom_komisi_sales || 0), 0);

        setFormData({
          ...formData,
          customer: invoice.customer,
          customer_name: invoice.customer_name || invoice.customer,
          posting_date: invoice.posting_date,
          due_date: invoice.due_date,
          company: selectedCompany,
          items: invoiceItems,
          custom_total_komisi_sales: totalKomisiSales,
          custom_notes_si: invoice.custom_notes_si || '',
        });
        setEditingInvoice(name);
        setEditingInvoiceStatus(invoice.docstatus === 1 ? 'Submitted' : invoice.status || 'Draft');
        setError('');
      } else {
        setError(data.message || 'Gagal memuat detail faktur');
      }
    } catch (err) {
      console.error('Error fetching invoice details:', err);
      setError('Gagal memuat detail faktur');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    const newItems = [...formData.items, {
      item_code: '', item_name: '', qty: 1, rate: 0, amount: 0,
      income_account: '411000 - Penjualan - ST', cost_center: 'Main - ST',
      warehouse: 'Finished Goods - ST', sales_order: '', so_detail: '',
      dn_detail: '', delivery_note: '', custom_komisi_sales: 0,
    }];
    const totalKomisiSales = newItems.reduce((sum, item) => sum + (item.custom_komisi_sales || 0), 0);
    setFormData({ ...formData, items: newItems, custom_total_komisi_sales: totalKomisiSales });
  };

  const handleRemoveItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    const totalKomisiSales = newItems.reduce((sum, item) => sum + (item.custom_komisi_sales || 0), 0);
    setFormData({ ...formData, items: newItems, custom_total_komisi_sales: totalKomisiSales });
  };

  const handleItemChange = (index: number, field: string, value: string | number) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === 'qty' || field === 'rate') {
      newItems[index].amount = newItems[index].qty * newItems[index].rate;
    }
    const total = newItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    const totalKomisiSales = newItems.reduce((sum, item) => sum + (item.custom_komisi_sales || 0), 0);
    setFormData({
      ...formData, items: newItems,
      total, net_total: total, grand_total: total,
      base_total: total, base_net_total: total, base_grand_total: total,
      outstanding_amount: total, custom_total_komisi_sales: totalKomisiSales
    });
  };

  const fetchAvailableDeliveryNotes = async () => {
    try {
      setDeliveryNotesLoading(true);
      setDeliveryNotesError('');
      const invoiceItemsResponse = await fetch(`/api/sales/invoices/items?company=${encodeURIComponent(selectedCompany)}`);
      const invoiceItemsData = await invoiceItemsResponse.json();
      if (invoiceItemsData.success) {
        const allDNs = invoiceItemsData.data || [];
        const usedDNs = invoiceItemsData.meta?.used_dn_list || [];
        const availableDNs = allDNs.filter((dn: { name: string }) => !usedDNs.includes(dn.name));
        setDeliveryNotes(availableDNs);
      } else {
        setDeliveryNotesError(invoiceItemsData.error || 'Gagal memuat surat jalan');
        setDeliveryNotes([]);
      }
    } catch {
      setDeliveryNotesError('Gagal memuat surat jalan');
      setDeliveryNotes([]);
    } finally {
      setDeliveryNotesLoading(false);
    }
  };

  // Main function to handle delivery note selection with commission preview
  async function handleSelectDeliveryNote(dn: string) {
    try {
      // Step 1: Try to get commission preview
      let commissionData: any = null;
      try {
        const res = await fetch(`/api/setup/commission/preview?delivery_note=${encodeURIComponent(dn)}`);
        const data = await res.json();
        if (data.success && data.message && data.message.preview_available && data.message.items && data.message.total_commission !== undefined) {
          commissionData = data.message;
        }
      } catch {
        // Continue with manual calculation as fallback
      }

      // Step 2: Get complete DN data
      const dnResponse = await fetch(`/api/sales/delivery-notes/detail?name=${encodeURIComponent(dn)}`);
      if (!dnResponse.ok) throw new Error(`Gagal mengambil detail Surat Jalan: ${dnResponse.status}`);

      const dnData = await dnResponse.json();
      if (dnData.success && dnData.data) {
        const completeDnData = dnData.data;

        const invoiceItems = completeDnData.items.map((item: CompleteInvoiceItem) => {
          let commission = 0;
          if (commissionData && commissionData.items) {
            const foundCommission = commissionData.items.find((p: any) => p.item_code === item.item_code);
            commission = foundCommission?.commission || 0;
          }
          return {
            item_code: item.item_code,
            item_name: item.item_name || item.description,
            description: item.description || item.item_name,
            qty: item.qty,
            rate: item.rate || 0,
            amount: item.amount || (item.qty * (item.rate || 0)),
            delivery_note: completeDnData.name,
            dn_detail: item.name,
            sales_order: item.against_sales_order || item.sales_order || '',
            so_detail: item.so_detail || item.sales_order_item || '',
            custom_komisi_sales: commission,
            income_account: item.income_account || '411000 - Penjualan - ST',
            cost_center: item.cost_center || 'Main - ST',
            warehouse: item.warehouse || 'Finished Goods - ST',
            stock_uom: item.stock_uom || 'Nos',
            uom_conversion_factor: item.conversion_factor || 1,
          };
        });

        const totalKomisiSales = commissionData && commissionData.preview_available ?
          commissionData.total_commission :
          invoiceItems.reduce((sum: number, item: CompleteInvoiceItem) => sum + (item.custom_komisi_sales || 0), 0);

        setFormData({
          customer: completeDnData.customer || '',
          customer_name: completeDnData.customer_name || '',
          posting_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          items: invoiceItems,
          custom_total_komisi_sales: totalKomisiSales,
          company: selectedCompany,
          currency: completeDnData.currency || 'IDR',
          price_list_currency: completeDnData.price_list_currency || 'IDR',
          plc_conversion_rate: completeDnData.plc_conversion_rate || 1,
          selling_price_list: completeDnData.selling_price_list || 'Standard Selling',
          territory: completeDnData.territory || 'All Territories',
          tax_id: completeDnData.tax_id || '',
          customer_address: completeDnData.customer_address || '',
          shipping_address: completeDnData.shipping_address_name || '',
          contact_person: completeDnData.contact_person || '',
          tax_category: completeDnData.tax_category || 'On Net Total',
          taxes_and_charges: completeDnData.taxes_and_charges || '',
          base_total: 0, base_net_total: 0, base_grand_total: 0,
          total: 0, net_total: 0, grand_total: 0, outstanding_amount: 0,
          custom_notes_si: completeDnData.custom_notes_dn || '',
        });
        setShowDeliveryNoteDialog(false);
        setError('');
      } else {
        throw new Error('Data Surat Jalan tidak valid');
      }
    } catch (error) {
      console.error('Error in handleSelectDeliveryNote:', error);
      setError(`Gagal memproses surat jalan: ${error instanceof Error ? error.message : 'Kesalahan tidak diketahui'}`);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');

    try {
      const total = formData.items.reduce((sum, item) => sum + (item.amount || 0), 0);

      const invoicePayload = {
        company: selectedCompany,
        customer: formData.customer,
        posting_date: parseDate(formData.posting_date),
        due_date: parseDate(formData.due_date),
        currency: 'IDR',
        price_list_currency: 'IDR',
        plc_conversion_rate: 1,
        customer_address: formData.customer_address || '',
        shipping_address: formData.shipping_address || '',
        contact_person: formData.contact_person || '',
        taxes_and_charges: formData.taxes_and_charges || '',
        update_stock: 0,
        remarks: formData.items.find(item => item.delivery_note)
          ? `Generated from Delivery Note: ${formData.items.find(item => item.delivery_note)?.delivery_note}`
          : 'Direct Sales Invoice',
        items: formData.items.map(item => ({
          item_code: item.item_code,
          qty: item.qty,
          rate: item.rate,
          amount: item.amount,
          warehouse: item.warehouse,
          delivery_note: item.delivery_note,
          dn_detail: item.dn_detail,
          sales_order: item.sales_order,
          so_detail: item.so_detail,
          custom_komisi_sales: item.custom_komisi_sales,
        })),
        status: 'Draft',
        docstatus: 0,
        custom_total_komisi_sales: formData.custom_total_komisi_sales,
        custom_notes_si: formData.custom_notes_si || '',
      };

      const response = await fetch('/api/sales/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoicePayload),
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage(`Faktur Penjualan ${data.data?.name || ''} berhasil disimpan!`);
        setTimeout(() => {
          router.push('/invoice/siList');
        }, 2000);
      } else {
        setError(`Gagal menyimpan Faktur Penjualan: ${data.message}`);
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      setError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setFormLoading(false);
    }
  };

  const isReadOnly = editingInvoiceStatus === 'Paid' || editingInvoiceStatus === 'Submitted';

  if (loading) {
    return <LoadingSpinner message="Memuat detail faktur..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {editingInvoice
                  ? (isReadOnly ? 'Lihat Faktur Penjualan' : 'Edit Faktur Penjualan')
                  : 'Buat Faktur Penjualan'}
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                {editingInvoice
                  ? (isReadOnly ? 'Lihat detail faktur penjualan (hanya baca)' : 'Perbarui faktur penjualan yang ada')
                  : 'Buat faktur penjualan baru'}
              </p>
            </div>
            <div className="flex gap-2">
              {!editingInvoice && (
                <button
                  type="button"
                  onClick={() => {
                    setShowDeliveryNoteDialog(true);
                    fetchAvailableDeliveryNotes();
                  }}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                >
                  Dari Surat Jalan
                </button>
              )}
              <button
                onClick={() => router.push('/invoice/siList')}
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
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">{successMessage}</div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>
        </div>
      )}

      {/* Form */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="bg-white shadow rounded-lg">
          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Pelanggan</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                />
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
              <div>
                <label className="block text-sm font-medium text-gray-700">Jatuh Tempo</label>
                <BrowserStyleDatePicker
                  value={formData.due_date}
                  onChange={(value: string) => setFormData({ ...formData, due_date: value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="DD/MM/YYYY"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Total Komisi Sales</label>
                <input
                  type="text"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-50"
                  value={formData.custom_total_komisi_sales ? formData.custom_total_komisi_sales.toLocaleString('id-ID') : '0'}
                  readOnly
                  placeholder="0"
                />
              </div>
            </div>

            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-md font-medium text-gray-900">Barang</h4>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="hidden bg-green-600 text-white px-3 py-1 rounded-md text-sm hover:bg-green-700"
                >
                  Tambah Barang
                </button>
              </div>

              {formData.items.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-md p-4 mb-2">
                  <div className="grid grid-cols-6 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Kode Barang</label>
                      <input type="text" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm bg-gray-50" value={item.item_code} readOnly />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Nama Barang</label>
                      <input type="text" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm bg-gray-50" value={item.item_name} readOnly />
                    </div>
                    <div className="text-right">
                      <label className="block text-xs font-medium text-gray-700">Kuantitas</label>
                      <input type="text" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm bg-gray-50 text-right" value={item.qty.toLocaleString('id-ID')} readOnly />
                    </div>
                    <div className="text-right">
                      <label className="block text-xs font-medium text-gray-700">Harga</label>
                      <input type="text" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm bg-gray-50 text-right" value={item.rate.toLocaleString('id-ID')} readOnly />
                    </div>
                    <div className="text-right">
                      <label className="block text-xs font-medium text-gray-700">Jumlah</label>
                      <input type="text" readOnly className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm bg-gray-50 text-right font-semibold" value={item.amount.toLocaleString('id-ID')} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Akun Pendapatan</label>
                      <input type="text" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm bg-gray-50" value={item.income_account} readOnly />
                    </div>
                  </div>
                  {/* DN/SO Fields */}
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Surat Jalan</label>
                      <input type="text" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm bg-gray-50" value={item.delivery_note || ''} readOnly placeholder="Pilih SJ di atas..." />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Pesanan Penjualan</label>
                      <input type="text" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm bg-gray-50" value={item.sales_order || ''} readOnly placeholder="Otomatis dari SJ..." />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Detail SO</label>
                      <input type="text" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm bg-gray-50" value={item.so_detail || ''} readOnly placeholder="Otomatis dari SJ..." />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Komisi Sales</label>
                      <input type="text" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm bg-gray-50 text-right" value={item.custom_komisi_sales ? item.custom_komisi_sales.toLocaleString('id-ID') : '0'} readOnly placeholder="0" />
                    </div>
                  </div>
                  {formData.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="mt-2 text-red-600 text-sm hover:text-red-800 hidden"
                    >
                      Hapus
                    </button>
                  )}
                </div>
              ))}

              {/* Total Summary */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-end">
                  <div className="grid grid-cols-3 gap-8 text-sm">
                    <div className="text-left">
                      <div className="text-gray-600">Total Komisi Sales:</div>
                      <div className="font-semibold text-gray-900">
                        Rp {formData.items.reduce((sum, item) => sum + (item.custom_komisi_sales || 0), 0).toLocaleString('id-ID')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-gray-600">Total Kuantitas:</div>
                      <div className="font-semibold text-gray-900">
                        {formData.items.reduce((sum, item) => sum + item.qty, 0).toLocaleString('id-ID')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-gray-600">Total Jumlah:</div>
                      <div className="font-semibold text-lg text-gray-900">
                        Rp {formData.items.reduce((sum, item) => sum + item.amount, 0).toLocaleString('id-ID')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
              <textarea
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                rows={3}
                value={formData.custom_notes_si || ''}
                onChange={(e) => setFormData({ ...formData, custom_notes_si: e.target.value })}
                placeholder="Tambahkan catatan untuk faktur penjualan ini..."
                disabled={isReadOnly}
              />
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => router.push('/invoice/siList')}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
              >
                Batal
              </button>
              {!isReadOnly && (
                <button
                  type="submit"
                  disabled={formLoading}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {formLoading ? 'Memproses...' : editingInvoice ? 'Perbarui Faktur' : 'Simpan Faktur'}
                </button>
              )}
              {isReadOnly && (
                <span className="px-4 py-2 text-sm text-gray-500 bg-gray-100 rounded-md">
                  {editingInvoiceStatus} - Hanya Baca
                </span>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Delivery Note Dialog */}
      {showDeliveryNoteDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Pilih Surat Jalan</h3>
                  <p className="text-sm text-gray-500 mt-1">Semua barang akan diganti dengan data dari Surat Jalan yang dipilih</p>
                </div>
                <button type="button" onClick={() => setShowDeliveryNoteDialog(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="px-6 py-4">
              {deliveryNotesLoading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  <p className="mt-2 text-sm text-gray-500">Memuat surat jalan...</p>
                </div>
              ) : deliveryNotesError ? (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Kesalahan</h3>
                  <p className="mt-1 text-sm text-gray-500">{deliveryNotesError}</p>
                </div>
              ) : deliveryNotes.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Tidak Ada Surat Jalan</h3>
                  <p className="mt-1 text-sm text-gray-500">Tidak ada surat jalan yang tersedia untuk ditagih.</p>
                </div>
              ) : (
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                  <ul className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                    {deliveryNotes.map((dn: { name: string; customer: string; customer_name?: string; status: string; grand_total?: number; posting_date?: string }) => (
                      <li key={dn.name} onClick={() => handleSelectDeliveryNote(dn.name)} className="cursor-pointer hover:bg-gray-50 transition-colors">
                        <div className="px-4 py-4 sm:px-6">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-indigo-600 truncate">{dn.name}</p>
                              <p className="mt-1 text-sm text-gray-900">Pelanggan: {dn.customer_name || dn.customer}</p>
                            </div>
                            <div className="ml-4 flex-shrink-0">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                dn.status === 'To Bill' ? 'bg-green-100 text-green-800'
                                : dn.status === 'Submitted' ? 'bg-blue-100 text-blue-800'
                                : dn.status === 'Completed' ? 'bg-purple-100 text-purple-800'
                                : 'bg-gray-100 text-gray-800'
                              }`}>
                                {dn.status}
                              </span>
                            </div>
                          </div>
                          <div className="mt-2 sm:flex sm:justify-between">
                            <p className="flex items-center text-sm text-gray-500">Tanggal: {dn.posting_date}</p>
                            <span className="font-medium text-sm text-gray-500">Total: Rp {dn.grand_total ? dn.grand_total.toLocaleString('id-ID') : '0'}</span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="mt-6 flex justify-end">
                <button type="button" onClick={() => setShowDeliveryNoteDialog(false)} className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400">
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
