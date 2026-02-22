'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import CustomerDialog from '../../components/CustomerDialog';
import ItemDialog from '../../components/ItemDialog';
import SalesPersonDialog from '../../components/SalesPersonDialog';
import LoadingSpinner from '../../components/LoadingSpinner';
import PrintDialog from '../../components/PrintDialog';
import { formatDate, parseDate } from '../../../utils/format';
import BrowserStyleDatePicker from '../../../components/BrowserStyleDatePicker';

interface SalesTeamMember {
  sales_person: string;
  allocated_percentage: number;
}

interface OrderItem {
  item_code: string;
  item_name: string;
  qty: number;
  rate: number;
  amount: number;
  warehouse: string;
  stock_uom: string;
  available_stock: number;
  actual_stock: number;
  reserved_stock: number;
}

export default function SalesOrderMain() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderName = searchParams.get('name');

  const [loading, setLoading] = useState(!!orderName);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [currentOrderStatus, setCurrentOrderStatus] = useState<string>('');
  const [error, setError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [savedDocName, setSavedDocName] = useState('');
  const createdDocName = useRef<string | null>(orderName || null);
  const isSubmittingRef = useRef(false);

  const [formData, setFormData] = useState({
    customer: '',
    customer_name: '',
    transaction_date: '',
    delivery_date: '',
    sales_person: '',
    custom_persentase_komisi_so: 0,
    custom_notes_so: '',
    items: [{ item_code: '', item_name: '', qty: 1, rate: 0, amount: 0, warehouse: '', stock_uom: '', available_stock: 0, actual_stock: 0, reserved_stock: 0 }],
    payment_terms_template: '',
  });

  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [showSalesPersonDialog, setShowSalesPersonDialog] = useState(false);
  const [currentItemIndex, setCurrentItemIndex] = useState<number | null>(null);
  const [salesTeam, setSalesTeam] = useState<SalesTeamMember[]>([]);
  const [paymentTermsList, setPaymentTermsList] = useState<{name: string}[]>([]);

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

  // Fetch payment terms templates
  useEffect(() => {
    const fetchPaymentTerms = async () => {
      try {
        const response = await fetch('/api/setup/payment-terms', { credentials: 'include' });
        const data = await response.json();
        if (data.success) {
          setPaymentTermsList(data.data || []);
        }
      } catch (err) {
        // silently fail — dropdown will be empty
      }
    };
    fetchPaymentTerms();
  }, []);

  // Set default dates on mount
  useEffect(() => {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localDate = new Date(today.getTime() - (offset * 60 * 1000));
    const todayString = localDate.toISOString().split('T')[0];
    
    setFormData(prev => ({
      ...prev,
      transaction_date: prev.transaction_date || formatDate(new Date(todayString)),
      delivery_date: prev.delivery_date || formatDate(new Date(todayString)),
    }));
  }, []);

  // Fetch order details in edit mode
  useEffect(() => {
    if (orderName && selectedCompany) {
      fetchOrderDetails(orderName);
    }
  }, [orderName, selectedCompany]);

  const fetchOrderDetails = async (name: string) => {
    if (!name || name === 'undefined') {
      console.error('Invalid order name:', name);
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch("/api/sales/orders/" + name);
      const data = await response.json();
      
      if (data.success) {
        const order = data.data;
        
        setEditingOrder(order);
        setCurrentOrderStatus(order.status || '');
        
        let salesPersonValue = '';
        let loadedSalesTeam: SalesTeamMember[] = [];
        
        if (order.sales_team && Array.isArray(order.sales_team) && order.sales_team.length > 0) {
          salesPersonValue = order.sales_team[0].sales_person || '';
          loadedSalesTeam = order.sales_team.map((member: any) => ({
            sales_person: member.sales_person || '',
            allocated_percentage: member.allocated_percentage || 0
          }));
        } else {
          salesPersonValue = order.sales_person || order.salesperson || order.owner || '';
          if (salesPersonValue) {
            loadedSalesTeam = [{
              sales_person: salesPersonValue,
              allocated_percentage: 100
            }];
          }
        }
        
        setSalesTeam(loadedSalesTeam);
        
        const mappedItems = (order.items || []).map((item: any) => ({
          item_code: item.item_code || '',
          item_name: item.item_name || '',
          qty: item.qty || 0,
          rate: item.rate || 0,
          amount: item.amount || 0,
          warehouse: item.warehouse || '',
          stock_uom: item.stock_uom || item.uom || '',
          available_stock: 0,
          actual_stock: 0,
          reserved_stock: 0,
        }));
        
        if (mappedItems.length === 0) {
          mappedItems.push({ 
            item_code: '', item_name: '', qty: 1, rate: 0, amount: 0, 
            warehouse: '', stock_uom: '', available_stock: 0, actual_stock: 0, reserved_stock: 0 
          });
        }
        
        setFormData({
          customer: order.customer || '',
          customer_name: order.customer_name || '',
          transaction_date: formatDate(order.transaction_date),
          delivery_date: formatDate(order.delivery_date),
          sales_person: salesPersonValue,
          custom_persentase_komisi_so: order.custom_persentase_komisi_so ?? 0,
          custom_notes_so: order.custom_notes_so || '',
          items: mappedItems,
          payment_terms_template: order.payment_terms_template || '',
        });
      } else {
        setError('Gagal memuat detail pesanan');
      }
    } catch (err) {
      console.error('Error fetching order details:', err);
      setError('Gagal memuat detail pesanan');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        { item_code: '', item_name: '', qty: 1, rate: 0, amount: 0, warehouse: '', stock_uom: '', available_stock: 0, actual_stock: 0, reserved_stock: 0 },
      ],
    });
  };

  const handleCustomerSelect = (customer: { name: string; customer_name: string; }) => {
    setFormData(prev => ({ 
      ...prev, 
      customer: customer.name,
      customer_name: customer.customer_name,
    }));
    setShowCustomerDialog(false);
    setError('');
    fetchCustomerDetail(customer.name);
  };

  const fetchCustomerDetail = async (customerName: string) => {
    try {
      const response = await fetch(`/api/sales/customers/customer/${encodeURIComponent(customerName)}`);
      
      if (!response.ok) {
        return;
      }
      // console.log('Customer detail response:', response);
      const result = await response.json();
      
      if (result.success && result.data) {
        const customerData = result.data;
        
        if (customerData.sales_team && customerData.sales_team.length > 0) {
          const primarySalesPerson = customerData.sales_team.find((member: any) => 
            member.allocated_percentage === 100 || member.idx === 1
          );
          
          const salesPersonName = primarySalesPerson?.sales_person || customerData.sales_team[0].sales_person;
          
          if (salesPersonName) {
            setFormData(prev => ({ ...prev, sales_person: salesPersonName }));
            setSalesTeam([{ sales_person: salesPersonName, allocated_percentage: 100 }]);

            // Pull default commission rate from Sales Person master
            try {
              const spRes = await fetch(`/api/sales/sales-persons/detail?name=${encodeURIComponent(salesPersonName)}`);
              if (spRes.ok) {
                const spData = await spRes.json();
                if (spData.success && spData.data) {
                  const defaultRate = Number(spData.data.custom_default_commission_rate ?? spData.data.commission_rate ?? 0);
                  setFormData(prev => ({
                    ...prev,
                    custom_persentase_komisi_so: isNaN(defaultRate) ? 0 : defaultRate,
                  }));
                }
              }
            } catch (err) {
              console.error('Failed to fetch sales person commission:', err);
            }
          }
        }

        if (customerData.custom_persentase_komisi_so !== undefined) {
          setFormData(prev => ({
            ...prev,
            custom_persentase_komisi_so: Number(customerData.custom_persentase_komisi_so) || 0,
          }));
        }
      }
      
      // await getFallbackSalesPerson(customerName);
    } catch (error) {
      console.error('Error fetching customer detail:', error);
      // await getFallbackSalesPerson(customerName);
    }
  };

  const handleRemoveItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const getFallbackSalesPerson = async (_customerName: string) => {
    const customerSalesPersonMapping: Record<string, string> = {
      'Grant Plastics Ltd.': 'Kantor',
      'Palmer Productions Ltd.': 'Tim Penjualan',
    };
    
    let defaultSalesPerson = customerSalesPersonMapping[_customerName];

    // If no mapping, pick first available sales person from API
    if (!defaultSalesPerson) {
      try {
        const spRes = await fetch('/api/sales/sales-persons', { credentials: 'include' });
        if (spRes.ok) {
          const spData = await spRes.json();
          const first = Array.isArray(spData.data) ? spData.data[0] : null;
          if (first?.name) {
            defaultSalesPerson = first.name;
          }
        }
      } catch (err) {
        console.error('Fallback sales person lookup failed:', err);
      }
    }
    
    if (!defaultSalesPerson) {
      return;
    }
    
    setFormData(prev => ({ ...prev, sales_person: defaultSalesPerson }));
    setSalesTeam([{ sales_person: defaultSalesPerson, allocated_percentage: 100 }]);
  };

  const resetForm = () => {
    const today = formatDate(new Date());
    setFormData({
      customer: '',
      customer_name: '',
      transaction_date: today,
      delivery_date: today,
      sales_person: '',
      custom_persentase_komisi_so: 0,
      custom_notes_so: '',
      items: [{ item_code: '', item_name: '', qty: 1, rate: 0, amount: 0, warehouse: '', stock_uom: '', available_stock: 0, actual_stock: 0, reserved_stock: 0 }],
      payment_terms_template: '',
    });
    setSalesTeam([]);
    setError('');
    setEditingOrder(null);
    setCurrentOrderStatus('');
  };

  const handleItemChange = (index: number, field: keyof OrderItem, value: string | number) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === 'qty' || field === 'rate') {
      newItems[index].amount = newItems[index].qty * newItems[index].rate;
    }
    
    setFormData({ ...formData, items: newItems });
  };

  const handleItemSelect = async (item: { item_code: string; item_name: string; stock_uom?: string }) => {
    if (currentItemIndex !== null) {
      const newItems = [...formData.items];
      
      let rate = 0;
      try {
        const priceResponse = await fetch(`/api/inventory/items/price?item_code=${item.item_code}`);
        const priceResult = await priceResponse.json();
        if (priceResult.success) {
          rate = priceResult.data.price_list_rate;
        }
      } catch (error) {
        console.error('Failed to fetch item price:', error);
      }
      
      const currentItem = formData.items[currentItemIndex];
      
      newItems[currentItemIndex] = {
        ...currentItem,
        item_code: item.item_code,
        item_name: item.item_name,
        stock_uom: item.stock_uom || '',
        rate: rate,
      };
      newItems[currentItemIndex].amount = newItems[currentItemIndex].qty * newItems[currentItemIndex].rate;
      
      setFormData({ ...formData, items: newItems });
      checkItemStock(item.item_code, currentItemIndex, newItems[currentItemIndex]);
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

  const checkItemStock = async (itemCode: string, itemIndex: number, currentItem: OrderItem) => {
    try {
      const response = await fetch(`/api/inventory/check?item_code=${itemCode}`);
      const data = await response.json();
      
      if (!data.error && data.length > 0) {
        const bestWarehouse = data.reduce((prev: any, current: any) => 
          (prev.available >= current.available) ? prev : current
        );
        
        const updatedItem = {
          ...currentItem,
          warehouse: bestWarehouse.warehouse,
          available_stock: bestWarehouse.available,
          actual_stock: bestWarehouse.actual,
          reserved_stock: bestWarehouse.reserved,
        };
        
        setFormData(prev => ({
          ...prev,
          items: prev.items.map((item, index) => 
            index === itemIndex ? updatedItem : item
          )
        }));
      } else {
        const defaultWarehouse = await getDefaultWarehouse(selectedCompany);
        const actualStock = data.length > 0 ? data[0].available : 0;
        
        const updatedItem = {
          ...currentItem,
          warehouse: defaultWarehouse,
          available_stock: actualStock,
          actual_stock: data.length > 0 ? data[0].actual : 0,
          reserved_stock: data.length > 0 ? data[0].reserved : 0,
        };
        
        setFormData(prev => ({
          ...prev,
          items: prev.items.map((item, index) => 
            index === itemIndex ? updatedItem : item
          )
        }));
      }
    } catch (error: unknown) {
      console.error('Stock check failed:', error);
    }
  };

  const handleSalesPersonSelect = (salesPerson: { name: string; full_name: string }) => {
    setFormData({ ...formData, sales_person: salesPerson.name });
    setSalesTeam([{ sales_person: salesPerson.name, allocated_percentage: 100 }]);
  };

  const openItemDialog = (index: number) => {
    setCurrentItemIndex(index);
    setShowItemDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setFormLoading(true);
    setError('');

    if (!selectedCompany) {
      setError('Perusahaan harus dipilih');
      setFormLoading(false);
      return;
    }

    if (!formData.customer) {
      setError('Pelanggan harus dipilih');
      setFormLoading(false);
      return;
    }

    if (!formData.transaction_date) {
      setError('Tanggal transaksi harus diisi');
      setFormLoading(false);
      return;
    }

    if (!formData.delivery_date) {
      setError('Tanggal pengiriman harus diisi');
      setFormLoading(false);
      return;
    }

    if (!formData.payment_terms_template) {
      setError('Termin pembayaran harus dipilih');
      setFormLoading(false);
      return;
    }

    const validItems = formData.items.filter(item => item.item_code && item.qty > 0);
    if (validItems.length === 0) {
      setError('Silakan tambahkan minimal satu barang yang valid');
      setFormLoading(false);
      return;
    }

    const itemsWithoutWarehouse = validItems.filter(item => !item.warehouse);
    if (itemsWithoutWarehouse.length > 0) {
      setError('Semua barang harus memiliki gudang');
      setFormLoading(false);
      return;
    }

    try {
      const orderPayload = {
        doctype: "Sales Order",
        company: selectedCompany,
        customer: formData.customer,
        transaction_date: parseDate(formData.transaction_date),
        delivery_date: parseDate(formData.delivery_date),
        order_type: "Sales",
        currency: "IDR",
        status: "Draft",
        
        payment_terms_template: formData.payment_terms_template,
        
        sales_team: salesTeam.length > 0 ? salesTeam : (formData.sales_person ? [{
          sales_person: formData.sales_person,
          allocated_percentage: 100
        }] : []),
        
        items: validItems.map(item => ({
          doctype: "Sales Order Item",
          item_code: item.item_code,
          item_name: item.item_name,
          qty: item.qty,
          rate: item.rate,
          amount: item.amount,
          warehouse: item.warehouse,
        })),
        
        custom_persentase_komisi_so: formData.custom_persentase_komisi_so || 0,
        custom_notes_so: formData.custom_notes_so || '',
        total: validItems.reduce((sum, item) => sum + item.amount, 0),
        grand_total: validItems.reduce((sum, item) => sum + item.amount, 0),
      };

      // Use PUT if editing OR if doc was already created in this session (retry guard)
      const existingName = editingOrder?.name || createdDocName.current;
      const isUpdate = !!existingName;
      const url = isUpdate ? '/api/sales/orders' : '/api/sales/orders';
      const response = await fetch(url, {
        method: isUpdate ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isUpdate ? { ...orderPayload, name: existingName } : orderPayload),
      });

      const result = await response.json();

      if (result.success) {
        const soName = result.data?.name || existingName || 'Unknown';
        if (!editingOrder) createdDocName.current = soName;
        setSavedDocName(soName);
        setShowPrintDialog(true);
      } else {
        const errorMessage = result.message || result.error || 'Gagal menyimpan pesanan penjualan';
        setError(errorMessage);
      }
    } catch (error) {
      console.error('Error saving order:', error);
      setError('Terjadi kesalahan yang tidak terduga');
    } finally {
      setFormLoading(false);
      isSubmittingRef.current = false;
    }
  };

  const isReadOnly = currentOrderStatus !== 'Draft' && currentOrderStatus !== '';

  if (loading) {
    return <LoadingSpinner message="Memuat detail pesanan..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {editingOrder 
                  ? (isReadOnly ? 'Lihat Pesanan Penjualan' : 'Edit Pesanan Penjualan')
                  : 'Buat Pesanan Penjualan Baru'}
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                {editingOrder
                  ? (isReadOnly ? 'Lihat detail pesanan penjualan (hanya baca)' : 'Perbarui pesanan penjualan yang ada')
                  : 'Buat pesanan penjualan baru'}
              </p>
            </div>
            <button
              onClick={() => router.push('/sales-order/soList')}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
            >
              Kembali ke Daftar
            </button>
          </div>
        </div>
      </div>

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
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Pelanggan <span className="text-red-500">*</span>
                </label>
                <div className="flex mt-1">
                  <input
                    type="text"
                    required
                    className={`mt-1 block w-full border border-gray-300 rounded-l-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                      isReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                    value={formData.customer_name || formData.customer}
                    onChange={(e) =>
                      setFormData({ ...formData, customer: e.target.value })
                    }
                    disabled={isReadOnly}
                    readOnly
                  />
                  <button
                    type="button"
                    onClick={() => setShowCustomerDialog(true)}
                    disabled={isReadOnly}
                    className={`px-3 py-2 border border-l-0 border-gray-300 rounded-r-md ${
                      isReadOnly
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                    } focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500`}
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Tanggal Transaksi <span className="text-red-500">*</span>
                </label>
                <BrowserStyleDatePicker
                  value={formData.transaction_date}
                  onChange={(value: string) =>
                    setFormData({ ...formData, transaction_date: value })
                  }
                  className={`mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                    isReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                  placeholder="DD/MM/YYYY"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Tanggal Pengiriman <span className="text-red-500">*</span>
                </label>
                <BrowserStyleDatePicker
                  value={formData.delivery_date}
                  onChange={(value: string) =>
                    setFormData({ ...formData, delivery_date: value })
                  }
                  className={`mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                    isReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                  placeholder="DD/MM/YYYY"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Termin Pembayaran <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  className={`mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                    isReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                  value={formData.payment_terms_template}
                  onChange={(e) => setFormData({ ...formData, payment_terms_template: e.target.value })}
                  disabled={isReadOnly}
                >
                  <option value="">Pilih Termin Pembayaran...</option>
                  {paymentTermsList.map((pt) => (
                    <option key={pt.name} value={pt.name}>{pt.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Tenaga Penjual <span className="text-red-500">*</span>
                </label>
                <div className="flex mt-1">
                  <input
                    type="text"
                    className="block w-full border border-gray-300 rounded-l-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-100 cursor-not-allowed"
                    value={formData.sales_person}
                    onChange={(e) =>
                      setFormData({ ...formData, sales_person: e.target.value })
                    }
                    disabled={true}
                    readOnly
                  />
                  <button
                    type="button"
                    onClick={() => setShowSalesPersonDialog(true)}
                    disabled={true}
                    className="px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-100 text-gray-400 cursor-not-allowed"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-md font-medium text-gray-900">Barang</h4>
                <button
                  type="button"
                  onClick={handleAddItem}
                  disabled={isReadOnly}
                  className={`${
                    isReadOnly
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  } px-3 py-1 rounded-md text-sm`}
                >
                  Tambah Barang
                </button>
              </div>

              {formData.items.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-md p-4 mb-2">
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700">
                        Kode Barang <span className="text-red-500">*</span>
                      </label>
                      <div className="flex mt-1">
                        <input
                          type="text"
                          required
                          className="block w-full border border-gray-300 rounded-l-md shadow-sm py-1 px-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          value={item.item_code}
                          onChange={(e) =>
                            handleItemChange(index, 'item_code', e.target.value)
                          }
                        />
                        <button
                          type="button"
                          onClick={() => openItemDialog(index)}
                          disabled={isReadOnly}
                          className={`px-2 py-1 border border-l-0 border-gray-300 rounded-r-md ${
                            isReadOnly
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                          } focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500`}
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="col-span-3">
                      <label className="block text-xs font-medium text-gray-700">
                        Nama Barang <span className="text-red-500">*</span>
                      </label>
                      <div className="flex mt-1">
                        <input
                          type="text"
                          required
                          className="block w-full border border-gray-300 rounded-l-md shadow-sm py-1 px-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          value={item.item_name}
                          onChange={(e) =>
                            handleItemChange(index, 'item_name', e.target.value)
                          }
                        />
                        <button
                          type="button"
                          onClick={() => openItemDialog(index)}
                          disabled={isReadOnly}
                          className={`px-2 py-1 border border-l-0 border-gray-300 rounded-r-md ${
                            isReadOnly
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                          } focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500`}
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </button>
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
                        value={item.warehouse}
                        placeholder="Otomatis"
                      />
                      {item.warehouse && (
                        <div className="mt-1 p-1 bg-blue-50 border border-blue-200 rounded text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-blue-700">
                              Tersedia: <span className="font-semibold">{item.available_stock || 0}</span>
                            </span>
                            <span className="text-gray-600">
                              A:{item.actual_stock || 0} R:{item.reserved_stock || 0}
                            </span>
                          </div>
                          {item.available_stock <= 0 && (
                            <div className="text-xs text-orange-600">⚠️ Stok habis</div>
                          )}
                          {item.available_stock > 0 && item.available_stock < 10 && (
                            <div className="text-xs text-yellow-600">⚠️ Stok rendah ({item.available_stock})</div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="col-span-1">
                      <label className="block text-xs font-medium text-gray-700">
                        Jml <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        className={`mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                          isReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''
                        }`}
                        style={{
                          MozAppearance: 'textfield',
                          WebkitAppearance: 'none',
                          appearance: 'none'
                        }}
                        value={item.qty}
                        onChange={(e) =>
                          handleItemChange(index, 'qty', parseFloat(e.target.value) || 0)
                        }
                        disabled={isReadOnly}
                        onWheel={(e) => e.currentTarget.blur()}
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
                        value={item.stock_uom}
                        placeholder="Otomatis"
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-xs font-medium text-gray-700">
                        Harga
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className={`mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-right ${
                          isReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''
                        }`}
                        style={{
                          MozAppearance: 'textfield',
                          WebkitAppearance: 'none',
                          appearance: 'none'
                        }}
                        value={item.rate || 0}
                        onChange={(e) =>
                          handleItemChange(index, 'rate', parseFloat(e.target.value) || 0)
                        }
                        disabled={isReadOnly}
                        onWheel={(e) => e.currentTarget.blur()}
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
                        value={item.amount ? item.amount.toLocaleString('id-ID') : '0'}
                      />
                    </div>
                  </div>
                  {formData.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      disabled={isReadOnly}
                      className={`mt-2 text-sm ${
                        isReadOnly
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-red-600 hover:text-red-800'
                      }`}
                    >
                      Hapus Baris
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Totals Section */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-end">
                <div className="grid grid-cols-2 gap-8 text-sm">
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

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
              <textarea
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                rows={3}
                value={formData.custom_notes_so || ''}
                onChange={(e) => setFormData({ ...formData, custom_notes_so: e.target.value })}
                placeholder="Tambahkan catatan untuk pesanan penjualan ini..."
                disabled={isReadOnly}
              />
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => router.push('/sales-order/soList')}
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
                    : editingOrder 
                      ? 'Perbarui Pesanan' 
                      : 'Simpan Pesanan'
                  }
                </button>
              )}
              {isReadOnly && (
                <span className="px-4 py-2 text-sm text-gray-500 bg-gray-100 rounded-md">
                  {currentOrderStatus} - Hanya Baca
                </span>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Customer Selection Dialog */}
      <CustomerDialog
        isOpen={showCustomerDialog}
        onClose={() => setShowCustomerDialog(false)}
        onSelect={handleCustomerSelect}
      />

      {/* Item Selection Dialog */}
      <ItemDialog
        isOpen={showItemDialog}
        onClose={() => setShowItemDialog(false)}
        onSelect={handleItemSelect}
      />

      {/* Sales Person Selection Dialog */}
      <SalesPersonDialog
        isOpen={showSalesPersonDialog}
        onClose={() => setShowSalesPersonDialog(false)}
        onSelect={handleSalesPersonSelect}
      />

      {/* Print Dialog after save */}
      <PrintDialog
        isOpen={showPrintDialog}
        onClose={() => { setShowPrintDialog(false); router.push('/sales-order/soList'); }}
        documentType="Sales Order"
        documentName={savedDocName}
        documentLabel="Pesanan Penjualan"
      />
    </div>
  );
}
