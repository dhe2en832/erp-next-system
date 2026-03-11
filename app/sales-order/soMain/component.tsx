'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import CustomerDialog from '../../components/CustomerDialog';
import ItemDialog from '../../components/ItemDialog';
import SalesPersonDialog from '../../components/SalesPersonDialog';
import LoadingSpinner from '../../components/LoadingSpinner';
import PrintDialog from '../../components/PrintDialog';
import { formatDate, parseDate } from '../../../utils/format';
import BrowserStyleDatePicker from '../../../components/BrowserStyleDatePicker';
import PrintPreviewModal from '../../../components/print/PrintPreviewModal';
import SalesOrderPrint from '../../../components/print/SalesOrderPrint';

export const dynamic = 'force-dynamic';

// ─── Types ────────────────────────────────────────────────────────────────────

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
  /** Original price from item price list */
  original_rate: number;
}

interface ERPNextSalesOrderItem {
  item_code: string;
  item_name: string;
  qty: number;
  rate: number;
  amount: number;
  warehouse: string;
  stock_uom: string;
  uom?: string;
}

interface ERPNextSalesOrder {
  name: string;
  status: string;
  customer: string;
  customer_name: string;
  transaction_date: string;
  delivery_date: string;
  sales_person: string;
  salesperson?: string;
  owner?: string;
  custom_persentase_komisi_so?: number;
  custom_notes_so?: string;
  remarks?: string;
  items: ERPNextSalesOrderItem[];
  payment_terms_template: string;
  sales_team?: Array<{
    sales_person: string;
    allocated_percentage: number;
  }>;
  docstatus?: number;
  address_display?: string;
  customer_address?: string;
  shipping_address_name?: string;
  total?: number;
  total_taxes_and_charges?: number;
  grand_total?: number;
  in_words?: string;
}

interface StockInfo {
  warehouse: string;
  available: number;
  actual: number;
  reserved: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_ITEM: OrderItem = {
  item_code: '',
  item_name: '',
  qty: 1,
  rate: 0,
  amount: 0,
  warehouse: '',
  stock_uom: '',
  available_stock: 0,
  actual_stock: 0,
  reserved_stock: 0,
  original_rate: 0,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    Draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700',
    'To Deliver and Bill': 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-300 dark:border-blue-700',
    'To Bill': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700',
    'To Deliver': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700',
    Completed: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-300 dark:border-green-700',
    Cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-300 dark:border-red-700',
    Closed: 'bg-gray-100 text-gray-700 dark:bg-gray-700/40 dark:text-gray-300 border-gray-300 dark:border-gray-600',
  };
  const cls = colorMap[status] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      {status}
    </span>
  );
}

// ─── Shared class helpers ─────────────────────────────────────────────────────

const inputBase =
  'block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm py-2 px-3 text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition';

const inputReadOnly =
  'bg-gray-100 dark:bg-gray-700 cursor-not-allowed text-gray-500 dark:text-gray-400';

const inputSmBase =
  'block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm py-1.5 px-2 text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition';

const searchBtnBase =
  'inline-flex items-center justify-center px-3 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-md bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition';

const searchBtnDisabled =
  'inline-flex items-center justify-center px-3 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-md bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed';

const sectionCard =
  'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm';

// ─── Component ────────────────────────────────────────────────────────────────

export default function SalesOrderMain() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderName = searchParams.get('name');

  const [loading, setLoading] = useState(!!orderName);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [editingOrder, setEditingOrder] = useState<ERPNextSalesOrder | null>(null);
  const [currentOrderStatus, setCurrentOrderStatus] = useState('');
  const [error, setError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [savedDocName, setSavedDocName] = useState('');

  const createdDocName = useRef<string | null>(orderName ?? null);
  const isSubmittingRef = useRef(false);

  const [formData, setFormData] = useState({
    customer: '',
    customer_name: '',
    transaction_date: '',
    delivery_date: '',
    sales_person: '',
    custom_persentase_komisi_so: 0,
    custom_notes_so: '',
    items: [{ ...EMPTY_ITEM }],
    payment_terms_template: '',
  });

  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [showSalesPersonDialog, setShowSalesPersonDialog] = useState(false);
  const [currentItemIndex, setCurrentItemIndex] = useState<number | null>(null);
  const [salesTeam, setSalesTeam] = useState<SalesTeamMember[]>([]);
  const [paymentTermsList, setPaymentTermsList] = useState<{ name: string }[]>([]);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  // ── Company detection ────────────────────────────────────────────────────────
  useEffect(() => {
    let saved = localStorage.getItem('selected_company');
    if (!saved) {
      const companyCookie = document.cookie
        .split(';')
        .find((c) => c.trim().startsWith('selected_company='));
      if (companyCookie) {
        saved = companyCookie.split('=')[1];
        if (saved) localStorage.setItem('selected_company', saved);
      }
    }
    if (saved) setSelectedCompany(saved);
  }, []);

  // ── Payment terms ────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/setup/payment-terms', { credentials: 'include' });
        const data = await res.json();
        if (data.success) setPaymentTermsList(data.data ?? []);
      } catch {
        // silently fail — dropdown will be empty
      }
    })();
  }, []);

  // ── Default dates ────────────────────────────────────────────────────────────
  useEffect(() => {
    const now = new Date();
    const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
    const todayStr = localDate.toISOString().split('T')[0];
    setFormData((prev) => ({
      ...prev,
      transaction_date: prev.transaction_date || formatDate(new Date(todayStr)),
      delivery_date: prev.delivery_date || formatDate(new Date(todayStr)),
    }));
  }, []);

  // ── Warehouse fallback ───────────────────────────────────────────────────────
  const getDefaultWarehouse = useCallback(
    async (company: string): Promise<string> => {
      try {
        const res = await fetch(`/api/finance/company/settings?company=${encodeURIComponent(company)}`);
        const data = await res.json();
        if (data.success && data.data?.default_warehouse) return data.data.default_warehouse;
      } catch (e: unknown) {
        console.error('Failed to fetch company settings:', e);
      }
      try {
        const res = await fetch(`/api/inventory/warehouses?company=${encodeURIComponent(company)}`);
        const data = await res.json();
        if (data.success && data.data?.length > 0) return data.data[0].name;
      } catch (e: unknown) {
        console.error('Failed to fetch warehouses:', e);
      }
      return 'Stores';
    },
    [],
  );

  // ── Stock check ──────────────────────────────────────────────────────────────
  const checkItemStock = useCallback(
    async (itemCode: string, itemIndex: number, currentItem: OrderItem) => {
      try {
        const res = await fetch(`/api/inventory/check?item_code=${itemCode}`);
        const data = await res.json();

        let updated: OrderItem;

        if (!data.error && data.length > 0) {
          const best = (data as StockInfo[]).reduce((a, b) => (a.available >= b.available ? a : b));
          updated = {
            ...currentItem,
            warehouse: best.warehouse,
            available_stock: best.available,
            actual_stock: best.actual,
            reserved_stock: best.reserved,
            original_rate: currentItem.original_rate || currentItem.rate,
          };
        } else {
          const defaultWarehouse = await getDefaultWarehouse(selectedCompany);
          updated = {
            ...currentItem,
            warehouse: defaultWarehouse,
            available_stock: data.length > 0 ? data[0].available : 0,
            actual_stock: data.length > 0 ? data[0].actual : 0,
            reserved_stock: data.length > 0 ? data[0].reserved : 0,
            original_rate: currentItem.original_rate || currentItem.rate,
          };
        }

        setFormData((prev) => ({
          ...prev,
          items: prev.items.map((item, i) => (i === itemIndex ? updated : item)),
        }));
      } catch (e: unknown) {
        console.error('Stock check failed:', e);
      }
    },
    [selectedCompany, getDefaultWarehouse],
  );

  // ── Fetch order details ──────────────────────────────────────────────────────
  const fetchOrderDetails = useCallback(
    async (name: string) => {
      if (!name || name === 'undefined') {
        console.error('Invalid order name:', name);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`/api/sales/orders/${name}`);
        const data = await res.json();

        if (data.success) {
          const order = data.data as ERPNextSalesOrder;
          setEditingOrder(order);
          setCurrentOrderStatus(order.status ?? '');

          let salesPersonValue = '';
          let loadedSalesTeam: SalesTeamMember[] = [];

          if (order.sales_team?.length) {
            salesPersonValue = order.sales_team[0].sales_person ?? '';
            loadedSalesTeam = order.sales_team.map((m) => ({
              sales_person: m.sales_person ?? '',
              allocated_percentage: m.allocated_percentage ?? 0,
            }));
          } else {
            salesPersonValue = order.sales_person || order.salesperson || order.owner || '';
            if (salesPersonValue) {
              loadedSalesTeam = [{ sales_person: salesPersonValue, allocated_percentage: 100 }];
            }
          }
          setSalesTeam(loadedSalesTeam);

          const mappedItems: OrderItem[] =
            order.items?.map((item) => ({
              item_code: item.item_code ?? '',
              item_name: item.item_name ?? '',
              qty: item.qty ?? 0,
              rate: item.rate ?? 0,
              amount: item.amount ?? 0,
              warehouse: item.warehouse ?? '',
              stock_uom: item.stock_uom || item.uom || '',
              available_stock: 0,
              actual_stock: 0,
              reserved_stock: 0,
              original_rate: item.rate ?? 0,
            })) ?? [];

          if (mappedItems.length === 0) mappedItems.push({ ...EMPTY_ITEM });

          setFormData({
            customer: order.customer ?? '',
            customer_name: order.customer_name ?? '',
            transaction_date: formatDate(order.transaction_date),
            delivery_date: formatDate(order.delivery_date),
            sales_person: salesPersonValue,
            custom_persentase_komisi_so: order.custom_persentase_komisi_so ?? 0,
            custom_notes_so: order.custom_notes_so ?? '',
            items: mappedItems,
            payment_terms_template: order.payment_terms_template ?? '',
          });

          for (let i = 0; i < mappedItems.length; i++) {
            if (mappedItems[i].item_code) {
              await checkItemStock(mappedItems[i].item_code, i, mappedItems[i]);
            }
          }
        } else {
          setError('Gagal memuat detail pesanan');
        }
      } catch (e) {
        console.error('Error fetching order details:', e);
        setError('Gagal memuat detail pesanan');
      } finally {
        setLoading(false);
      }
    },
    [checkItemStock],
  );

  useEffect(() => {
    if (orderName && selectedCompany) fetchOrderDetails(orderName);
  }, [orderName, selectedCompany, fetchOrderDetails]);

  // ── Item handlers ─────────────────────────────────────────────────────────────
  const handleAddItem = () => {
    setFormData((prev) => ({ ...prev, items: [...prev.items, { ...EMPTY_ITEM }] }));
  };

  const handleRemoveItem = (index: number) => {
    setFormData((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const handleItemChange = (index: number, field: keyof OrderItem, value: string | number) => {
    setFormData((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      if (field === 'qty' || field === 'rate') {
        items[index].amount = items[index].qty * items[index].rate;
      }
      return { ...prev, items };
    });
  };

  const handleItemSelect = async (item: { item_code: string; item_name: string; stock_uom?: string }) => {
    if (currentItemIndex === null) return;

    let rate = 0;
    try {
      const res = await fetch(`/api/inventory/items/price?item_code=${item.item_code}`);
      const result = await res.json();
      if (result.success) rate = result.data.price_list_rate;
    } catch (e) {
      console.error('Failed to fetch item price:', e);
    }

    setFormData((prev) => {
      const items = [...prev.items];
      const current = items[currentItemIndex];
      items[currentItemIndex] = {
        ...current,
        item_code: item.item_code,
        item_name: item.item_name,
        stock_uom: item.stock_uom ?? '',
        rate,
        original_rate: rate,
        amount: current.qty * rate,
      };
      return { ...prev, items };
    });

    // run stock check after state update
    setFormData((prev) => {
      checkItemStock(item.item_code, currentItemIndex!, prev.items[currentItemIndex!]);
      return prev;
    });
  };

  const openItemDialog = (index: number) => {
    setCurrentItemIndex(index);
    setShowItemDialog(true);
  };

  // ── Customer handler ─────────────────────────────────────────────────────────
  const handleCustomerSelect = (customer: { name: string; customer_name: string }) => {
    setFormData((prev) => ({ ...prev, customer: customer.name, customer_name: customer.customer_name }));
    setShowCustomerDialog(false);
    setError('');
    fetchCustomerDetail(customer.name);
  };

  const fetchCustomerDetail = async (customerName: string) => {
    try {
      const res = await fetch(`/api/sales/customers/customer/${encodeURIComponent(customerName)}`);
      if (!res.ok) return;
      const result = await res.json();
      if (!result.success || !result.data) return;

      const cd = result.data;

      if (cd.sales_team?.length) {
        const primary = cd.sales_team.find(
          (m: { sales_person: string; allocated_percentage: number; idx?: number }) =>
            m.allocated_percentage === 100 || m.idx === 1,
        );
        const spName: string = primary?.sales_person ?? cd.sales_team[0].sales_person;

        if (spName) {
          setFormData((prev) => ({ ...prev, sales_person: spName }));
          setSalesTeam([{ sales_person: spName, allocated_percentage: 100 }]);

          try {
            const spRes = await fetch(`/api/sales/sales-persons/detail?name=${encodeURIComponent(spName)}`);
            if (spRes.ok) {
              const spData = await spRes.json();
              if (spData.success && spData.data) {
                const defaultRate = Number(spData.data.custom_default_commission_rate ?? spData.data.commission_rate ?? 0);
                setFormData((prev) => ({
                  ...prev,
                  custom_persentase_komisi_so: isNaN(defaultRate) ? 0 : defaultRate,
                }));
              }
            }
          } catch (e) {
            console.error('Failed to fetch sales person commission:', e);
          }
        }
      }

      if (cd.custom_persentase_komisi_so !== undefined) {
        setFormData((prev) => ({
          ...prev,
          custom_persentase_komisi_so: Number(cd.custom_persentase_komisi_so) || 0,
        }));
      }
    } catch (e) {
      console.error('Error fetching customer detail:', e);
    }
  };

  // ── Sales person handler ──────────────────────────────────────────────────────
  const handleSalesPersonSelect = (salesPerson: { name: string; full_name: string }) => {
    setFormData((prev) => ({ ...prev, sales_person: salesPerson.name }));
    setSalesTeam([{ sales_person: salesPerson.name, allocated_percentage: 100 }]);
  };

  // ── Submit ────────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setFormLoading(true);
    setError('');

    const guards: [boolean, string][] = [
      [!selectedCompany, 'Perusahaan harus dipilih'],
      [!formData.customer, 'Pelanggan harus dipilih'],
      [!formData.transaction_date, 'Tanggal transaksi harus diisi'],
      [!formData.delivery_date, 'Tanggal pengiriman harus diisi'],
      [!formData.payment_terms_template, 'Termin pembayaran harus dipilih'],
    ];

    for (const [condition, message] of guards) {
      if (condition) {
        setError(message);
        setFormLoading(false);
        isSubmittingRef.current = false;
        return;
      }
    }

    const validItems = formData.items.filter((item) => item.item_code && item.qty > 0);
    if (validItems.length === 0) {
      setError('Silakan tambahkan minimal satu barang yang valid');
      setFormLoading(false);
      isSubmittingRef.current = false;
      return;
    }

    if (validItems.some((item) => !item.warehouse)) {
      setError('Semua barang harus memiliki gudang');
      setFormLoading(false);
      isSubmittingRef.current = false;
      return;
    }

    const grandTotal = validItems.reduce((sum, item) => sum + item.amount, 0);

    const orderPayload = {
      doctype: 'Sales Order',
      company: selectedCompany,
      customer: formData.customer,
      transaction_date: parseDate(formData.transaction_date),
      delivery_date: parseDate(formData.delivery_date),
      order_type: 'Sales',
      currency: 'IDR',
      status: 'Draft',
      payment_terms_template: formData.payment_terms_template,
      sales_team:
        salesTeam.length > 0
          ? salesTeam
          : formData.sales_person
            ? [{ sales_person: formData.sales_person, allocated_percentage: 100 }]
            : [],
      items: validItems.map((item) => ({
        doctype: 'Sales Order Item',
        item_code: item.item_code,
        item_name: item.item_name,
        qty: item.qty,
        rate: item.rate,
        amount: item.amount,
        warehouse: item.warehouse,
      })),
      custom_persentase_komisi_so: formData.custom_persentase_komisi_so || 0,
      custom_notes_so: formData.custom_notes_so || '',
      total: grandTotal,
      grand_total: grandTotal,
    };

    try {
      const existingName = editingOrder?.name ?? createdDocName.current;
      const isUpdate = !!existingName;

      const res = await fetch('/api/sales/orders', {
        method: isUpdate ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isUpdate ? { ...orderPayload, name: existingName } : orderPayload),
      });

      const result = await res.json();

      if (result.success) {
        const soName: string = result.data?.name ?? existingName ?? 'Unknown';
        if (!editingOrder) createdDocName.current = soName;
        setSavedDocName(soName);
        setIsSaved(true);
        setShowPrintDialog(true);
      } else {
        setError(result.message ?? result.error ?? 'Gagal menyimpan pesanan penjualan');
      }
    } catch (e) {
      console.error('Error saving order:', e);
      setError('Terjadi kesalahan yang tidak terduga');
    } finally {
      setFormLoading(false);
      isSubmittingRef.current = false;
    }
  };

  // ─── Computed ──────────────────────────────────────────────────────────────────
  const isReadOnly = currentOrderStatus !== 'Draft' && currentOrderStatus !== '';
  const isFormDisabled = isReadOnly || isSaved;
  const grandTotal = formData.items.reduce((s, i) => s + i.amount, 0);
  const totalQty = formData.items.reduce((s, i) => s + i.qty, 0);

  const pageTitle = editingOrder
    ? isReadOnly
      ? 'Lihat Pesanan Penjualan'
      : 'Edit Pesanan Penjualan'
    : 'Buat Pesanan Penjualan Baru';

  const pageSubtitle = editingOrder
    ? isReadOnly
      ? 'Detail pesanan penjualan (hanya baca)'
      : 'Perbarui pesanan penjualan yang ada'
    : 'Isi form di bawah untuk membuat pesanan baru';

  if (loading) return <LoadingSpinner message="Memuat detail pesanan..." />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">

      {/* ── Header ─────────────────────────────────────────────────────────────── */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="flex items-center gap-3 min-w-0">
              {/* back chevron on mobile */}
              <button
                type="button"
                onClick={() => router.push('/sales-order/soList')}
                className="flex-shrink-0 p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition lg:hidden"
                aria-label="Kembali"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">
                    {pageTitle}
                  </h1>
                  {editingOrder && <StatusBadge status={currentOrderStatus} />}
                </div>
                <p className="mt-0.5 text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                  {pageSubtitle}
                  {editingOrder && (
                    <span className="ml-1 font-medium text-indigo-600 dark:text-indigo-400">
                      #{editingOrder.name}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {editingOrder && (
                <button
                  type="button"
                  onClick={() => setShowPrintPreview(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white shadow-sm transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  <span className="hidden sm:inline">Print</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => router.push('/sales-order/soList')}
                className="hidden lg:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 shadow-sm transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                Kembali ke Daftar
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Error banner ──────────────────────────────────────────────────────── */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError('')}
              className="ml-auto text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-200 transition"
              aria-label="Tutup"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ── Body ──────────────────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5 pb-24">
        <form onSubmit={handleSubmit} noValidate>

          {/* ── Section: Info Utama ─────────────────────────────────────────── */}
          <section className={`${sectionCard} p-5 mb-5`}>
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
              Informasi Pesanan
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">

              {/* Pelanggan */}
              <div className="sm:col-span-2 xl:col-span-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Pelanggan <span className="text-red-500">*</span>
                </label>
                <div className="flex">
                  <input
                    type="text"
                    required
                    readOnly
                    className={`${inputBase} rounded-r-none ${isFormDisabled ? inputReadOnly : 'bg-white dark:bg-gray-800'}`}
                    value={formData.customer_name || formData.customer}
                    placeholder="Pilih pelanggan..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowCustomerDialog(true)}
                    disabled={isFormDisabled}
                    className={isFormDisabled ? searchBtnDisabled : searchBtnBase}
                    aria-label="Cari Pelanggan"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Tanggal Transaksi */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tanggal Transaksi <span className="text-red-500">*</span>
                </label>
                <BrowserStyleDatePicker
                  value={formData.transaction_date}
                  onChange={(value: string) => setFormData((prev) => ({ ...prev, transaction_date: value }))}
                  className={`${inputBase} ${isFormDisabled ? inputReadOnly : ''}`}
                  placeholder="DD/MM/YYYY"
                />
              </div>

              {/* Tanggal Pengiriman */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tanggal Pengiriman <span className="text-red-500">*</span>
                </label>
                <BrowserStyleDatePicker
                  value={formData.delivery_date}
                  onChange={(value: string) => setFormData((prev) => ({ ...prev, delivery_date: value }))}
                  className={`${inputBase} ${isFormDisabled ? inputReadOnly : ''}`}
                  placeholder="DD/MM/YYYY"
                />
              </div>

              {/* Termin Pembayaran */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Termin Pembayaran <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  className={`${inputBase} ${isFormDisabled ? inputReadOnly : ''}`}
                  value={formData.payment_terms_template}
                  onChange={(e) => setFormData((prev) => ({ ...prev, payment_terms_template: e.target.value }))}
                  disabled={isFormDisabled}
                >
                  <option value="">Pilih Termin Pembayaran...</option>
                  {paymentTermsList.map((pt) => (
                    <option key={pt.name} value={pt.name}>{pt.name}</option>
                  ))}
                </select>
              </div>

              {/* Sales Penjual */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Sales Penjual
                </label>
                <div className="flex">
                  <input
                    type="text"
                    readOnly
                    disabled
                    className={`${inputBase} rounded-r-none ${inputReadOnly}`}
                    value={formData.sales_person}
                    placeholder="Otomatis dari pelanggan"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSalesPersonDialog(true)}
                    disabled
                    className={searchBtnDisabled}
                    aria-label="Cari Sales Person"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* ── Section: Barang ─────────────────────────────────────────────── */}
          <section className={`${sectionCard} p-5 mb-5`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Daftar Barang
              </h2>
              <button
                type="button"
                onClick={handleAddItem}
                disabled={isFormDisabled}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition shadow-sm ${
                  isFormDisabled
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Tambah Barang
              </button>
            </div>

            <div className="space-y-3">
              {formData.items.map((item, index) => (
                <div
                  key={index}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900/40 transition hover:border-gray-300 dark:hover:border-gray-600"
                >
                  {/* Row header */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                      Barang #{index + 1}
                    </span>
                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        disabled={isFormDisabled}
                        className={`inline-flex items-center gap-1 text-xs font-medium transition ${
                          isFormDisabled
                            ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                            : 'text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300'
                        }`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Hapus
                      </button>
                    )}
                  </div>

                  {/* Fields — single row, horizontally scrollable on very small screens */}
                  <div className="flex flex-nowrap items-start gap-2 overflow-x-auto pb-0.5">

                    {/* Kode Barang */}
                    <div className="flex-shrink-0 w-36">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 whitespace-nowrap">
                        Kode Barang <span className="text-red-500">*</span>
                      </label>
                      <div className="flex">
                        <input
                          type="text"
                          required
                          className={`${inputSmBase} rounded-r-none min-w-0 ${isFormDisabled ? inputReadOnly : ''}`}
                          value={item.item_code}
                          readOnly={isFormDisabled}
                          onChange={(e) => handleItemChange(index, 'item_code', e.target.value)}
                          placeholder="Kode..."
                        />
                        <button
                          type="button"
                          onClick={() => openItemDialog(index)}
                          disabled={isFormDisabled}
                          className={`flex-shrink-0 ${isFormDisabled ? searchBtnDisabled : searchBtnBase} py-1.5`}
                          aria-label="Cari Barang"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Nama Barang */}
                    <div className="flex-1 min-w-[140px]">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 whitespace-nowrap">
                        Nama Barang <span className="text-red-500">*</span>
                      </label>
                      <div className="flex">
                        <input
                          type="text"
                          required
                          className={`${inputSmBase} rounded-r-none min-w-0 ${isFormDisabled ? inputReadOnly : ''}`}
                          value={item.item_name}
                          readOnly={isFormDisabled}
                          onChange={(e) => handleItemChange(index, 'item_name', e.target.value)}
                          placeholder="Nama..."
                        />
                        <button
                          type="button"
                          onClick={() => openItemDialog(index)}
                          disabled={isFormDisabled}
                          className={`flex-shrink-0 ${isFormDisabled ? searchBtnDisabled : searchBtnBase} py-1.5`}
                          aria-label="Cari Barang"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Gudang + stok */}
                    <div className="flex-shrink-0 w-36">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 whitespace-nowrap">Gudang</label>
                      <input
                        type="text"
                        readOnly
                        className={`${inputSmBase} ${inputReadOnly}`}
                        value={item.warehouse}
                        placeholder="Otomatis"
                      />
                      {item.warehouse && (
                        <div className={`mt-1.5 px-2 py-1 rounded text-xs border ${
                          item.available_stock <= 0
                            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                            : item.available_stock < 10
                              ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300'
                              : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                        }`}>
                          <span className="font-semibold">{item.available_stock}</span> tersedia
                          {item.available_stock <= 0 && ' · Stok habis'}
                          {item.available_stock > 0 && item.available_stock < 10 && ' · Stok rendah'}
                          <div className="text-gray-400 dark:text-gray-500">
                            A:{item.actual_stock} R:{item.reserved_stock}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Qty */}
                    <div className="flex-shrink-0 w-16">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 whitespace-nowrap">
                        Qty <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        style={{ MozAppearance: 'textfield', WebkitAppearance: 'none', appearance: 'none' }}
                        className={`${inputSmBase} ${isFormDisabled ? inputReadOnly : ''}`}
                        value={item.qty}
                        onChange={(e) => handleItemChange(index, 'qty', parseFloat(e.target.value) || 0)}
                        disabled={isFormDisabled}
                        onWheel={(e) => e.currentTarget.blur()}
                      />
                    </div>

                    {/* UoM */}
                    <div className="flex-shrink-0 w-16">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">UoM</label>
                      <input
                        type="text"
                        readOnly
                        className={`${inputSmBase} ${inputReadOnly} text-center`}
                        value={item.stock_uom}
                        placeholder="–"
                      />
                    </div>

                    {/* Harga */}
                    <div className="flex-shrink-0 w-28">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Harga</label>
                      <input
                        type="text"
                        className={`${inputSmBase} text-right ${
                          isFormDisabled
                            ? inputReadOnly
                            : item.original_rate && item.rate < item.original_rate
                              ? 'border-yellow-400 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 focus:border-yellow-500'
                              : ''
                        }`}
                        value={item.rate ? item.rate.toLocaleString('id-ID') : '0'}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\./g, '');
                          handleItemChange(index, 'rate', parseFloat(raw) || 0);
                        }}
                        disabled={isFormDisabled}
                      />
                      {item.original_rate > 0 && item.rate < item.original_rate && (
                        <p className="mt-1 text-xs text-yellow-600 dark:text-yellow-400 whitespace-nowrap">
                          ⚠ Di bawah standar
                        </p>
                      )}
                    </div>

                    {/* Subtotal */}
                    <div className="flex-shrink-0 w-28">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Subtotal</label>
                      <input
                        type="text"
                        readOnly
                        className={`${inputSmBase} ${inputReadOnly} text-right font-semibold`}
                        value={item.amount ? item.amount.toLocaleString('id-ID') : '0'}
                      />
                    </div>

                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Section: Totals ─────────────────────────────────────────────── */}
          <section className={`${sectionCard} p-5 mb-5`}>
            <div className="flex flex-wrap items-center justify-end gap-6 text-sm">
              <div className="text-right">
                <p className="text-gray-500 dark:text-gray-400">Total Kuantitas</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {totalQty.toLocaleString('id-ID')}
                </p>
              </div>
              <div className="h-8 border-l border-gray-200 dark:border-gray-700" />
              <div className="text-right">
                <p className="text-gray-500 dark:text-gray-400">Grand Total</p>
                <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                  Rp {grandTotal.toLocaleString('id-ID')}
                </p>
              </div>
            </div>
          </section>

          {/* ── Section: Catatan ─────────────────────────────────────────────── */}
          <section className={`${sectionCard} p-5 mb-5`}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Catatan</label>
            <textarea
              rows={3}
              className={`${inputBase} resize-none ${isFormDisabled ? inputReadOnly : ''}`}
              value={formData.custom_notes_so ?? ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, custom_notes_so: e.target.value }))}
              placeholder="Tambahkan catatan untuk pesanan penjualan ini..."
              disabled={isFormDisabled}
            />
          </section>

          {/* ── Footer Actions ───────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => router.push('/sales-order/soList')}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition shadow-sm"
            >
              Batal
            </button>

            {!isFormDisabled && (
              <button
                type="submit"
                disabled={formLoading || isSaved}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600 text-white shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {formLoading && (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {formLoading ? 'Memproses...' : editingOrder ? 'Perbarui Pesanan' : 'Simpan Pesanan'}
              </button>
            )}

            {isReadOnly && (
              <span className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                {currentOrderStatus} — Hanya Baca
              </span>
            )}
          </div>

        </form>
      </main>

      {/* ── Dialogs ──────────────────────────────────────────────────────────── */}
      <CustomerDialog
        isOpen={showCustomerDialog}
        onClose={() => setShowCustomerDialog(false)}
        onSelect={handleCustomerSelect}
      />

      <ItemDialog
        isOpen={showItemDialog}
        onClose={() => setShowItemDialog(false)}
        onSelect={handleItemSelect}
      />

      <SalesPersonDialog
        isOpen={showSalesPersonDialog}
        onClose={() => setShowSalesPersonDialog(false)}
        onSelect={handleSalesPersonSelect}
      />

      <PrintDialog
        isOpen={showPrintDialog}
        onClose={() => { setShowPrintDialog(false); router.replace('/sales-order/soList'); }}
        documentType="Sales Order"
        documentName={savedDocName}
        documentLabel="Pesanan Penjualan"
      />

      {showPrintPreview && editingOrder && (
        <PrintPreviewModal
          title={`Sales Order - ${editingOrder.name}`}
          onClose={() => setShowPrintPreview(false)}
          paperMode="continuous"
        >
          <SalesOrderPrint
            data={{
              name: editingOrder.name,
              transaction_date: editingOrder.transaction_date,
              docstatus: editingOrder.docstatus ?? 0,
              customer: editingOrder.customer,
              customer_name: editingOrder.customer_name,
              customer_address:
                editingOrder.address_display ||
                editingOrder.customer_address ||
                editingOrder.shipping_address_name ||
                '',
              delivery_date: editingOrder.delivery_date,
              payment_terms_template: editingOrder.payment_terms_template,
              sales_person: formData.sales_person,
              items: editingOrder.items ?? [],
              total: editingOrder.total ?? 0,
              total_taxes_and_charges: editingOrder.total_taxes_and_charges,
              grand_total: editingOrder.grand_total ?? 0,
              in_words: editingOrder.in_words,
              remarks: editingOrder.custom_notes_so || editingOrder.remarks,
            }}
            companyName={selectedCompany}
          />
        </PrintPreviewModal>
      )}
    </div>
  );
}
