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
import PrintPreviewModal from '../../../components/print/PrintPreviewModal';
import DeliveryNotePrint from '../../../components/print/DeliveryNotePrint';

export const dynamic = 'force-dynamic';

// ─── Types ────────────────────────────────────────────────────────────────────

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
  against_sales_order?: string;
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

interface ERPNextDeliveryNote {
  name: string;
  status: string;
  customer: string;
  customer_name?: string;
  posting_date: string;
  lr_no?: string;
  lr_date?: string;
  transporter_name?: string;
  vehicle_no?: string;
  against_sales_order?: string;
  items: DeliveryNoteItem[];
  custom_notes_dn?: string;
  remarks?: string;
  docstatus?: number;
  sales_team?: Array<{
    sales_person: string;
    allocated_percentage: number;
  }>;
  payment_terms_template?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_ITEM: DeliveryNoteItem = {
  item_code: '',
  item_name: '',
  qty: 1,
  rate: 0,
  amount: 0,
  uom: 'Nos',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    Draft:
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700',
    'To Bill':
      'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700',
    Completed:
      'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-300 dark:border-green-700',
    Cancelled:
      'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-300 dark:border-red-700',
    Closed:
      'bg-gray-100 text-gray-700 dark:bg-gray-700/40 dark:text-gray-300 border-gray-300 dark:border-gray-600',
  };
  const cls =
    colorMap[status] ??
    'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600';
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
  'block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm py-1.5 px-2 text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition';

const searchBtnBase =
  'inline-flex items-center justify-center px-3 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-md bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition';

const searchBtnDisabled =
  'inline-flex items-center justify-center px-3 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-md bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed';

const sectionCard =
  'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm';

// ─── Component ────────────────────────────────────────────────────────────────

export default function DeliveryNoteMain() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dnName = searchParams.get('name');

  const [loading, setLoading] = useState(!!dnName);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [editingDeliveryNote, setEditingDeliveryNote] = useState<ERPNextDeliveryNote | null>(null);
  const [currentDeliveryNoteStatus, setCurrentDeliveryNoteStatus] = useState('');
  const [error, setError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [savedDocName, setSavedDocName] = useState('');

  const createdDocName = useRef<string | null>(dnName ?? null);
  const isSubmitting = useRef(false);

  const [formData, setFormData] = useState<DeliveryNoteFormData>({
    customer: '',
    customer_name: '',
    posting_date: formatDate(new Date()),
    sales_order: '',
    custom_notes_dn: '',
    items: [{ ...EMPTY_ITEM }],
  });

  const [salesTeam, setSalesTeam] = useState<SalesTeamMember[]>([]);
  const [showSalesOrderDialog, setShowSalesOrderDialog] = useState(false);
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
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

  // ── Fetch DN details ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (dnName && selectedCompany) fetchDeliveryNoteDetails(dnName);
  }, [dnName, selectedCompany]); // fetchDeliveryNoteDetails is stable (defined outside)

  const fetchDeliveryNoteDetails = async (name: string) => {
    if (!name || name === 'undefined') return;
    setLoading(true);
    try {
      const res = await fetch(`/api/sales/delivery-notes/${name}`);
      const data = await res.json();
      if (data.success) {
        const dn = data.data as ERPNextDeliveryNote;
        setEditingDeliveryNote(dn);
        setCurrentDeliveryNoteStatus(dn.status ?? '');

        const salesOrderValue = dn.items?.[0]?.against_sales_order ?? '';

        setFormData({
          customer: dn.customer ?? '',
          customer_name: dn.customer_name ?? '',
          posting_date: formatDate(dn.posting_date),
          sales_order: salesOrderValue,
          custom_notes_dn: dn.custom_notes_dn ?? '',
          payment_terms_template: dn.payment_terms_template ?? '',
          items: dn.items?.length
            ? dn.items
            : [{ ...EMPTY_ITEM }],
        });

        setSalesTeam(
          dn.sales_team?.map((m) => ({
            sales_person: m.sales_person ?? '',
            allocated_percentage: m.allocated_percentage ?? 0,
          })) ?? [],
        );
      } else {
        setError('Gagal memuat detail surat jalan');
      }
    } catch (e) {
      console.error('Error fetching delivery note details:', e);
      setError('Gagal memuat detail surat jalan');
    } finally {
      setLoading(false);
    }
  };

  // ── Warehouse fallback ───────────────────────────────────────────────────────
  const getDefaultWarehouse = async (company: string): Promise<string> => {
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
  };

  // ── Reset form ───────────────────────────────────────────────────────────────
  const resetForm = () => {
    setFormData({
      customer: '',
      customer_name: '',
      posting_date: formatDate(new Date()),
      sales_order: '',
      custom_notes_dn: '',
      items: [{ ...EMPTY_ITEM }],
    });
    setSalesTeam([]);
    setError('');
  };

  // ── Sales Order handlers ─────────────────────────────────────────────────────
  const handleSalesOrderSelect = async (salesOrder: SalesOrder) => {
    try {
      resetForm();
      const res = await fetch(`/api/sales/orders/${salesOrder.name}`);
      const data = await res.json();
      if (data.success) {
        const order = data.data as Record<string, unknown>;
        const defaultWarehouse = await getDefaultWarehouse(selectedCompany);

        const deliveryNoteItems: DeliveryNoteItem[] = (
          (order.items as Record<string, unknown>[]) ?? []
        ).map((item) => ({
          item_code: (item.item_code as string) ?? '',
          item_name: (item.item_name as string) ?? '',
          qty: (item.qty as number) ?? 0,
          rate: (item.rate as number) ?? 0,
          amount: (item.amount as number) ?? 0,
          uom: (item.uom as string) || 'Nos',
          stock_uom: (item.stock_uom as string) || (item.uom as string) || 'Nos',
          so_detail: (item.name as string) ?? '',
          warehouse: (item.warehouse as string) || defaultWarehouse,
          delivered_qty: (item.qty as number) ?? 0,
        }));

        setFormData({
          customer: (order.customer as string) ?? '',
          customer_name: (order.customer_name as string) ?? '',
          posting_date: new Date().toISOString().split('T')[0],
          sales_order: order.name as string,
          custom_notes_dn: (order.custom_notes_so as string) ?? '',
          payment_terms_template: (order.payment_terms_template as string) ?? '',
          items: deliveryNoteItems.length ? deliveryNoteItems : [{ ...EMPTY_ITEM }],
        });

        setSalesTeam(
          ((order.sales_team as Record<string, unknown>[]) ?? []).map((m) => ({
            sales_person: (m.sales_person as string) ?? '',
            allocated_percentage: (m.allocated_percentage as number) ?? 0,
          })),
        );
      } else {
        setError('Gagal memuat detail pesanan penjualan');
      }
    } catch (e) {
      console.error('Error fetching sales order details:', e);
      setError('Gagal memuat detail pesanan penjualan');
    }
  };

  // ── Customer handler ─────────────────────────────────────────────────────────
  const handleCustomerSelect = (customer: { name: string; customer_name: string }) => {
    setFormData((prev) => ({ ...prev, customer: customer.name, customer_name: customer.customer_name }));
    setShowCustomerDialog(false);
    setError('');
  };

  // ── Item handler ─────────────────────────────────────────────────────────────
  const handleRemoveItem = (index: number) => {
    setFormData((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  // ── Submit ────────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
          remarks: `Based on Sales Order: ${formData.sales_order}`,
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
            so_detail: item.so_detail || '',
          }),
          delivered_qty: item.qty,
          target_warehouse: item.warehouse || 'Stores',
          conversion_factor: 1,
          stock_uom: item.stock_uom || 'Nos',
        })),
      };

      const existingName = createdDocName.current;
      const isUpdate = !!existingName;

      const res = await fetch(
        isUpdate ? `/api/sales/delivery-notes/${existingName}` : '/api/sales/delivery-notes',
        {
          method: isUpdate ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            isUpdate ? { name: existingName, ...deliveryNotePayload } : deliveryNotePayload,
          ),
        },
      );

      const data = await res.json();

      if (res.ok && data.success) {
        const docName = ((data.data as Record<string, unknown>)?.name as string) || existingName || '';
        setSavedDocName(docName);
        createdDocName.current = docName;
        setIsSaved(true);
        setSuccessMessage(
          `Surat Jalan ${docName} berhasil ${editingDeliveryNote ? 'diperbarui' : 'dibuat'}`,
        );
        setShowPrintDialog(true);
      } else {
        const { bannerMessage } = handleERPNextError(
          data,
          formData.posting_date,
          'Surat Jalan',
          'Gagal menyimpan surat jalan',
        );
        setError(bannerMessage);
      }
    } catch (e: unknown) {
      console.error('Error submitting delivery note:', e);
      setError('Terjadi kesalahan saat menyimpan data');
    } finally {
      setFormLoading(false);
      isSubmitting.current = false;
    }
  };

  // ─── Computed ─────────────────────────────────────────────────────────────────
  const isReadOnly = !!(editingDeliveryNote && currentDeliveryNoteStatus !== 'Draft');
  const isFormDisabled = isReadOnly || isSaved;
  const totalQty = formData.items.reduce((s, i) => s + (i.qty || 0), 0);
  const grandTotal = formData.items.reduce((s, i) => s + (i.amount || 0), 0);

  const pageTitle = editingDeliveryNote
    ? isReadOnly
      ? 'Lihat Surat Jalan'
      : 'Edit Surat Jalan'
    : 'Buat Surat Jalan Baru';

  const pageSubtitle = editingDeliveryNote
    ? isReadOnly
      ? 'Detail surat jalan (hanya baca)'
      : 'Perbarui surat jalan yang ada'
    : 'Isi form di bawah untuk membuat surat jalan baru';

  if (loading) return <LoadingSpinner />;

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
                onClick={() => router.push('/delivery-note/dnList')}
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
                  {editingDeliveryNote && <StatusBadge status={currentDeliveryNoteStatus} />}
                </div>
                <p className="mt-0.5 text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                  {pageSubtitle}
                  {editingDeliveryNote && (
                    <span className="ml-1 font-medium text-indigo-600 dark:text-indigo-400">
                      #{editingDeliveryNote.name}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {editingDeliveryNote && (
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
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white shadow-sm transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span className="hidden sm:inline">Dari Pesanan Penjualan</span>
                  <span className="sm:hidden">Dari SO</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => router.push('/delivery-note/dnList')}
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

      {/* ── Success banner ─────────────────────────────────────────────────────── */}
      {successMessage && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="flex items-start gap-3 bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg text-sm">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{successMessage}</span>
            <button
              type="button"
              onClick={() => setSuccessMessage('')}
              className="ml-auto text-green-500 dark:text-green-400 hover:text-green-700 dark:hover:text-green-200 transition"
              aria-label="Tutup"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

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
              Informasi Surat Jalan
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">

              {/* Pesanan Penjualan */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Pesanan Penjualan
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={formData.sales_order}
                    readOnly
                    placeholder="Pilih Pesanan Penjualan..."
                    className={`${inputBase} rounded-r-none ${inputReadOnly}`}
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
                    className={searchBtnBase}
                    aria-label="Cari Pesanan Penjualan"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                </div>
                {formData.sales_order && (
                  <p className="mt-1 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                    SO: {formData.sales_order}
                  </p>
                )}
              </div>

              {/* Pelanggan */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Pelanggan
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={formData.customer_name || formData.customer}
                    readOnly
                    placeholder="Pilih pelanggan..."
                    className={`${inputBase} rounded-r-none ${isFormDisabled ? inputReadOnly : 'bg-white dark:bg-gray-800'}`}
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

              {/* Tanggal Posting */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tanggal Posting
                </label>
                <BrowserStyleDatePicker
                  value={formData.posting_date}
                  onChange={(value: string) => setFormData((prev) => ({ ...prev, posting_date: value }))}
                  className={`${inputBase} ${isFormDisabled ? inputReadOnly : ''}`}
                  placeholder="DD/MM/YYYY"
                />
              </div>
            </div>
          </section>

          {/* ── Section: Barang ─────────────────────────────────────────────── */}
          <section className={`${sectionCard} p-5 mb-5`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Daftar Barang
              </h2>
              <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                {formData.items.length} item
              </span>
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
                        Kode Barang
                      </label>
                      <input
                        type="text"
                        value={item.item_code}
                        readOnly
                        className={`${inputSmBase} ${inputReadOnly}`}
                        placeholder="–"
                      />
                    </div>

                    {/* Nama Barang */}
                    <div className="flex-1 min-w-[140px]">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 whitespace-nowrap">
                        Nama Barang
                      </label>
                      <input
                        type="text"
                        value={item.item_name}
                        readOnly
                        className={`${inputSmBase} ${inputReadOnly} min-w-0`}
                        placeholder="–"
                      />
                    </div>

                    {/* Qty */}
                    <div className="flex-shrink-0 w-16">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 whitespace-nowrap">
                        Jml
                      </label>
                      <input
                        type="text"
                        value={item.qty ? item.qty.toLocaleString('id-ID') : '0'}
                        readOnly
                        className={`${inputSmBase} ${inputReadOnly} text-right`}
                      />
                    </div>

                    {/* UoM */}
                    <div className="flex-shrink-0 w-16">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        UoM
                      </label>
                      <input
                        type="text"
                        value={item.stock_uom || '–'}
                        readOnly
                        className={`${inputSmBase} ${inputReadOnly} text-center`}
                      />
                    </div>

                    {/* Harga */}
                    <div className="flex-shrink-0 w-28">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Harga
                      </label>
                      <input
                        type="text"
                        value={item.rate ? item.rate.toLocaleString('id-ID') : '0'}
                        readOnly
                        className={`${inputSmBase} ${inputReadOnly} text-right`}
                      />
                    </div>

                    {/* Subtotal */}
                    <div className="flex-shrink-0 w-28">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Subtotal
                      </label>
                      <input
                        type="text"
                        readOnly
                        className={`${inputSmBase} ${inputReadOnly} text-right font-semibold`}
                        value={item.amount ? item.amount.toLocaleString('id-ID') : '0'}
                      />
                    </div>
                  </div>

                  {/* SO detail badge */}
                  {item.against_sales_order && (
                    <p className="mt-2 text-xs text-indigo-600 dark:text-indigo-400">
                      SO: {item.against_sales_order}
                    </p>
                  )}
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
              value={formData.custom_notes_dn ?? ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, custom_notes_dn: e.target.value }))}
              placeholder="Tambahkan catatan untuk surat jalan ini..."
              disabled={isFormDisabled}
            />
          </section>

          {/* ── Footer Actions ───────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => router.push('/delivery-note/dnList')}
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
                {formLoading
                  ? 'Memproses...'
                  : editingDeliveryNote
                    ? 'Perbarui Surat Jalan'
                    : 'Simpan Surat Jalan'}
              </button>
            )}

            {isReadOnly && (
              <span className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                {currentDeliveryNoteStatus} — Hanya Baca
              </span>
            )}
          </div>

        </form>
      </main>

      {/* ── Dialogs ──────────────────────────────────────────────────────────── */}
      <SalesOrderDialog
        isOpen={showSalesOrderDialog}
        onClose={() => setShowSalesOrderDialog(false)}
        onSelect={handleSalesOrderSelect}
        selectedCompany={selectedCompany}
        customerFilter={formData.customer}
      />

      <CustomerDialog
        isOpen={showCustomerDialog}
        onClose={() => setShowCustomerDialog(false)}
        onSelect={handleCustomerSelect}
      />

      <PrintDialog
        isOpen={showPrintDialog}
        onClose={() => { setShowPrintDialog(false); router.replace('/delivery-note/dnList'); }}
        documentType="Delivery Note"
        documentName={savedDocName}
        documentLabel="Surat Jalan"
      />

      {showPrintPreview && editingDeliveryNote && (
        <PrintPreviewModal
          title={`Surat Jalan - ${editingDeliveryNote.name}`}
          onClose={() => setShowPrintPreview(false)}
          paperMode="continuous"
        >
          <DeliveryNotePrint
            data={{
              name: editingDeliveryNote.name,
              posting_date: editingDeliveryNote.posting_date,
              docstatus: editingDeliveryNote.docstatus ?? 0,
              customer: editingDeliveryNote.customer,
              customer_name: editingDeliveryNote.customer_name,
              lr_no: editingDeliveryNote.lr_no,
              lr_date: editingDeliveryNote.lr_date,
              transporter_name: editingDeliveryNote.transporter_name,
              vehicle_no: editingDeliveryNote.vehicle_no,
              against_sales_order: editingDeliveryNote.against_sales_order,
              items: editingDeliveryNote.items ?? [],
              remarks: editingDeliveryNote.custom_notes_dn || editingDeliveryNote.remarks || '',
            }}
            companyName={selectedCompany}
          />
        </PrintPreviewModal>
      )}
    </div>
  );
}
