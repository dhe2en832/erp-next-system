'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dayjs from 'dayjs';
import LoadingSpinner from '../../components/LoadingSpinner';
import PrintDialog from '../../components/PrintDialog';
import { formatDate, parseDate } from '../../../utils/format';
import BrowserStyleDatePicker from '../../../components/BrowserStyleDatePicker';
import DiscountInput from '../../../components/invoice/DiscountInput';
import TaxTemplateSelect, { TaxTemplate } from '../../../components/invoice/TaxTemplateSelect';
import InvoiceSummary, { InvoiceSummaryProps } from '../../../components/invoice/InvoiceSummary';
import { handleERPNextError } from '../../../utils/erpnext-error-handler';
import PrintPreviewModal from '../../../components/print/PrintPreviewModal';
import SalesInvoicePrint from '../../../components/print/SalesInvoicePrint';

import {
  TaxRow,
} from '../../../types/sales-invoice';

export const dynamic = 'force-dynamic';

// ─── Types ────────────────────────────────────────────────────────────────────

interface InvoiceItem {
  item_code: string;
  item_name: string;
  qty: number;
  rate: number;
  amount: number;
  income_account: string;
  cost_center: string;
  warehouse: string;
  delivery_note: string;
  sales_order: string;
  so_detail: string;
  dn_detail: string;
  custom_komisi_sales: number;
}

interface CompleteInvoiceItem extends InvoiceItem {
  name?: string;
  description?: string;
  against_sales_order?: string;
  sales_order_item?: string;
  stock_uom?: string;
  conversion_factor?: number;
  returned_qty?: number;
}

interface SalesTeamMember {
  sales_person: string;
  allocated_percentage: number;
}

interface DeliveryNoteSummary {
  name: string;
  customer: string;
  customer_name: string;
  posting_date: string;
  grand_total: number;
  status: string;
}

interface CommissionPreviewItem {
  item_code: string;
  commission: number;
}

interface CommissionPreview {
  preview_available: boolean;
  items: CommissionPreviewItem[];
  total_commission: number;
}

interface SalesInvoice {
  name: string;
  posting_date: string;
  due_date: string;
  docstatus: number;
  status: string;
  customer: string;
  customer_name: string;
  tax_id: string;
  items: CompleteInvoiceItem[];
  total: number;
  total_taxes_and_charges: number;
  grand_total: number;
  in_words: string;
  remarks: string;
  custom_notes_si: string;
  currency: string;
  price_list_currency: string;
  plc_conversion_rate: number;
  selling_price_list: string;
  territory: string;
  customer_address: string;
  shipping_address: string;
  contact_person: string;
  tax_category: string;
  taxes_and_charges: string;
  base_total: number;
  base_net_total: number;
  base_grand_total: number;
  net_total: number;
  outstanding_amount: number;
  discount_amount: number;
  additional_discount_percentage: number;
  sales_team?: SalesTeamMember[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    Draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700',
    Submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-300 dark:border-blue-700',
    Paid: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-300 dark:border-green-700',
    Unpaid: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 border-orange-300 dark:border-orange-700',
    Overdue: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-300 dark:border-red-700',
    Cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-300 dark:border-red-700',
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
  'block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm py-1.5 px-2 text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition';

const sectionCard =
  'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm';

// ─── Component ────────────────────────────────────────────────────────────────

export default function SalesInvoiceMain() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invoiceName = searchParams.get('name');

  const [loading, setLoading] = useState(!!invoiceName);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [editingInvoice, setEditingInvoice] = useState<string | null>(null);
  const [editingInvoiceData, setEditingInvoiceData] = useState<SalesInvoice | null>(null);
  const [editingInvoiceStatus, setEditingInvoiceStatus] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [savedDocName, setSavedDocName] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const createdDocName = useRef<string | null>(invoiceName || null);
  const isSubmittingRef = useRef(false);

  // Delivery Note Dialog
  const [showDeliveryNoteDialog, setShowDeliveryNoteDialog] = useState(false);
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNoteSummary[]>([]);
  const [deliveryNotesLoading, setDeliveryNotesLoading] = useState(false);
  const [deliveryNotesError, setDeliveryNotesError] = useState('');
  const [deliveryNoteSearch, setDeliveryNoteSearch] = useState('');

  const [salesTeam, setSalesTeam] = useState<SalesTeamMember[]>([]);

  // Discount and Tax state
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [selectedTaxTemplate, setSelectedTaxTemplate] = useState<TaxTemplate | null>(null);

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
    payment_terms_template: '',
    discount_amount: 0,
    discount_percentage: 0,
  });

  // ── Company detection ─────────────────────────────────────────────────────
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

  // ── Fetch invoice on edit/view ────────────────────────────────────────────
  useEffect(() => {
    if (invoiceName && selectedCompany) {
      handleEditInvoice(invoiceName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceName, selectedCompany]);

  const handleEditInvoice = async (name: string) => {
    if (!name || name === 'undefined') return;
    setLoading(true);
    try {
      const response = await fetch(`/api/sales/invoices/details?invoice_name=${encodeURIComponent(name)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();

      if (data.success) {
        const invoice = data.data as SalesInvoice;
        const invoiceItems = (invoice.items || []).map((item) => ({
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
        })) as CompleteInvoiceItem[];

        const totalKomisiSales = invoiceItems.reduce((sum: number, item: CompleteInvoiceItem) => sum + (item.custom_komisi_sales || 0), 0);

        setFormData({
          ...formData,
          customer: invoice.customer,
          customer_name: invoice.customer_name || invoice.customer,
          posting_date: invoice.posting_date ? dayjs(invoice.posting_date).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
          due_date: invoice.due_date ? dayjs(invoice.due_date).format('YYYY-MM-DD') : dayjs().add(30, 'day').format('YYYY-MM-DD'),
          company: selectedCompany,
          items: invoiceItems,
          currency: invoice.currency || 'IDR',
          price_list_currency: invoice.price_list_currency || 'IDR',
          plc_conversion_rate: invoice.plc_conversion_rate || 1,
          selling_price_list: invoice.selling_price_list || 'Standard Selling',
          territory: invoice.territory || 'All Territories',
          tax_id: invoice.tax_id || '',
          customer_address: invoice.customer_address || '',
          shipping_address: invoice.shipping_address || '',
          contact_person: invoice.contact_person || '',
          tax_category: invoice.tax_category || 'On Net Total',
          taxes_and_charges: invoice.taxes_and_charges || '',
          base_total: invoice.base_total || 0,
          base_net_total: invoice.base_net_total || 0,
          base_grand_total: invoice.base_grand_total || 0,
          total: invoice.total || 0,
          net_total: invoice.net_total || 0,
          grand_total: invoice.grand_total || 0,
          outstanding_amount: invoice.outstanding_amount || 0,
          custom_total_komisi_sales: totalKomisiSales,
          custom_notes_si: invoice.custom_notes_si || '',
          discount_amount: invoice.discount_amount || 0,
          discount_percentage: invoice.additional_discount_percentage || 0,
        });

        setDiscountAmount((invoice.discount_amount as number) || 0);
        setDiscountPercentage((invoice.additional_discount_percentage as number) || 0);

        if (invoice.taxes_and_charges) {
          fetch(`/api/setup/tax-templates?type=Sales&company=${encodeURIComponent(selectedCompany)}`)
            .then(res => res.json())
            .then(d => {
              if (d.success) {
                const template = d.data.find((t: TaxTemplate) => t.name === invoice.taxes_and_charges);
                if (template) setSelectedTaxTemplate(template);
              }
            })
            .catch(err => console.error('Error fetching tax template:', err));
        }

        setEditingInvoice(name);
        setEditingInvoiceData(invoice);
        setEditingInvoiceStatus(invoice.docstatus === 1 ? 'Submitted' : (invoice.status as string) || 'Draft');
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

  const handleRemoveItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    const totalKomisiSales = newItems.reduce((sum, item) => sum + (item.custom_komisi_sales || 0), 0);
    setFormData({ ...formData, items: newItems, custom_total_komisi_sales: totalKomisiSales });
  };

  const fetchAvailableDeliveryNotes = async () => {
    try {
      setDeliveryNotesLoading(true);
      setDeliveryNotesError('');
      const invoiceItemsResponse = await fetch(`/api/sales/invoices/items?company=${encodeURIComponent(selectedCompany)}`);
      const invoiceItemsData = await invoiceItemsResponse.json();
      if (invoiceItemsData.success) {
        const allDNs = (invoiceItemsData.data || []) as DeliveryNoteSummary[];
        const usedDNs = (invoiceItemsData.meta?.used_dn_list || []) as string[];
        const availableDNs = allDNs.filter((dn: DeliveryNoteSummary) => !usedDNs.includes(dn.name));
        setDeliveryNotes(availableDNs);
      } else {
        setDeliveryNotesError((invoiceItemsData.error as string) || 'Gagal memuat surat jalan');
        setDeliveryNotes([]);
      }
    } catch {
      setDeliveryNotesError('Gagal memuat surat jalan');
      setDeliveryNotes([]);
    } finally {
      setDeliveryNotesLoading(false);
    }
  };

  const calculateDueDate = async (postingDate: string, salesOrderName: string): Promise<string> => {
    const defaultDays = 30;
    try {
      if (!salesOrderName) return addDays(postingDate, defaultDays);
      const soRes = await fetch(`/api/sales/orders/${encodeURIComponent(salesOrderName)}`, { credentials: 'include' });
      const soData = await soRes.json();
      if (!soData.success || !soData.data?.payment_terms_template) return addDays(postingDate, defaultDays);
      const ptRes = await fetch(`/api/setup/payment-terms/detail?name=${encodeURIComponent(soData.data.payment_terms_template)}`, { credentials: 'include' });
      const ptData = await ptRes.json();
      if (ptData.success && ptData.data?.terms && ptData.data.terms.length > 0) {
        const creditDays = ptData.data.terms[0].credit_days || defaultDays;
        return addDays(postingDate, creditDays);
      }
    } catch {
      // fallback to default
    }
    return addDays(postingDate, defaultDays);
  };

  const addDays = (dateStr: string, days: number): string => {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  };

  async function handleSelectDeliveryNote(dn: string) {
    try {
      let commissionData: CommissionPreview | null = null;
      try {
        const res = await fetch(`/api/setup/commission/preview?delivery_note=${encodeURIComponent(dn)}`);
        const data = await res.json();
        if (data.success && data.message && data.message.preview_available && data.message.items && data.message.total_commission !== undefined) {
          commissionData = data.message;
        }
      } catch {
        // Continue with manual calculation as fallback
      }

      const dnResponse = await fetch(`/api/sales/delivery-notes/detail?name=${encodeURIComponent(dn)}`);
      if (!dnResponse.ok) throw new Error(`Gagal mengambil detail Surat Jalan: ${dnResponse.status}`);

      const dnData = await dnResponse.json();
      if (dnData.success && dnData.data) {
        const completeDnData = dnData.data;

        const invoiceItems = completeDnData.items.map((item: CompleteInvoiceItem) => {
          let commission = 0;
          if (commissionData && commissionData.items) {
            const foundCommission = commissionData.items.find((p: CommissionPreviewItem) => p.item_code === item.item_code);
            commission = foundCommission?.commission || 0;
          }
          const deliveredQty = item.qty || 0;
          const returnedQty = item.returned_qty || 0;
          const billableQty = deliveredQty - returnedQty;
          return {
            item_code: item.item_code,
            item_name: item.item_name || item.description,
            description: item.description || item.item_name,
            qty: billableQty,
            rate: item.rate || 0,
            amount: billableQty * (item.rate || 0),
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

        const totalKomisiSales = commissionData && commissionData.preview_available
          ? commissionData.total_commission
          : invoiceItems.reduce((sum: number, item: CompleteInvoiceItem) => sum + (item.custom_komisi_sales || 0), 0);

        const postingDate = new Date().toISOString().split('T')[0];
        const firstSOName = invoiceItems.find((item: CompleteInvoiceItem) => item.sales_order)?.sales_order || '';

        let paymentTermsTemplate = '';
        try {
          const soRes = await fetch(`/api/sales/orders/${encodeURIComponent(firstSOName)}`, { credentials: 'include' });
          const soData = await soRes.json();
          if (soData.success && soData.data?.payment_terms_template) {
            paymentTermsTemplate = soData.data.payment_terms_template;
          }
        } catch {
          // ignore
        }

        const dueDate = await calculateDueDate(postingDate, firstSOName);

        setFormData({
          customer: (completeDnData.customer as string) || '',
          customer_name: (completeDnData.customer_name as string) || '',
          posting_date: postingDate,
          due_date: dueDate,
          items: invoiceItems,
          custom_total_komisi_sales: totalKomisiSales,
          company: selectedCompany,
          currency: (completeDnData.currency as string) || 'IDR',
          price_list_currency: (completeDnData.price_list_currency as string) || 'IDR',
          plc_conversion_rate: (completeDnData.plc_conversion_rate as number) || 1,
          selling_price_list: (completeDnData.selling_price_list as string) || 'Standard Selling',
          territory: (completeDnData.territory as string) || 'All Territories',
          tax_id: (completeDnData.tax_id as string) || '',
          customer_address: (completeDnData.customer_address as string) || '',
          shipping_address: (completeDnData.shipping_address_name as string) || '',
          contact_person: (completeDnData.contact_person as string) || '',
          tax_category: (completeDnData.tax_category as string) || 'On Net Total',
          taxes_and_charges: (completeDnData.taxes_and_charges as string) || '',
          base_total: 0, base_net_total: 0, base_grand_total: 0,
          total: 0, net_total: 0, grand_total: 0, outstanding_amount: 0,
          custom_notes_si: (completeDnData.custom_notes_dn as string) || '',
          payment_terms_template: paymentTermsTemplate,
          discount_amount: (completeDnData.discount_amount as number) || 0,
          discount_percentage: (completeDnData.discount_percentage as number) || 0,
        });

        const loadedSalesTeam = (completeDnData.sales_team as Record<string, unknown>[])?.map((member: Record<string, unknown>) => ({
          sales_person: (member.sales_person as string) || '',
          allocated_percentage: (member.allocated_percentage as number) || 0,
        })) || [];
        setSalesTeam(loadedSalesTeam);
        setShowDeliveryNoteDialog(false);
        setError('');
      } else {
        throw new Error('Data Surat Jalan tidak valid');
      }
    } catch (error) {
      setError(`Gagal memproses surat jalan: ${error instanceof Error ? error.message : 'Kesalahan tidak diketahui'}`);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setFormLoading(true);
    setError('');

    try {
      if (!formData.posting_date || formData.posting_date === 'Invalid Date') {
        setError('Tanggal Posting tidak valid');
        setFormLoading(false);
        isSubmittingRef.current = false;
        return;
      }
      if (!formData.due_date || formData.due_date === 'Invalid Date') {
        setError('Tanggal Jatuh Tempo tidak valid');
        setFormLoading(false);
        isSubmittingRef.current = false;
        return;
      }
      const postingDateObj = new Date(formData.posting_date);
      const dueDateObj = new Date(formData.due_date);
      if (dueDateObj < postingDateObj) {
        setError('Tanggal Jatuh Tempo tidak boleh lebih awal dari Tanggal Posting');
        setFormLoading(false);
        isSubmittingRef.current = false;
        return;
      }

      const total = formData.items.reduce((sum, item) => sum + (item.amount || 0), 0);
      const finalDiscountAmount = discountAmount > 0 ? discountAmount : (discountPercentage / 100) * total;
      const netTotal = total - finalDiscountAmount;

      let totalTaxes = 0;
      const taxesPayload: TaxRow[] = [];

      if (selectedTaxTemplate && selectedTaxTemplate.taxes) {
        let runningTotal = netTotal;
        for (const taxRow of selectedTaxTemplate.taxes) {
          const rate = taxRow.rate || 0;
          let taxAmount = 0;
          if (taxRow.charge_type === 'On Net Total') {
            taxAmount = (rate / 100) * netTotal;
          } else if (taxRow.charge_type === 'On Previous Row Total') {
            taxAmount = (rate / 100) * runningTotal;
          }
          runningTotal += taxAmount;
          totalTaxes += taxAmount;
          taxesPayload.push({
            charge_type: taxRow.charge_type as 'On Net Total' | 'Actual' | 'On Previous Row Total',
            account_head: taxRow.account_head,
            description: taxRow.description,
            rate,
            tax_amount: Math.round(taxAmount * 100) / 100,
          } as TaxRow);
        }
      }

      const grandTotal = netTotal + totalTaxes;

      const invoicePayload = {
        company: selectedCompany,
        customer: formData.customer,
        customer_name: formData.customer_name,
        posting_date: parseDate(formData.posting_date),
        due_date: parseDate(formData.due_date),
        currency: 'IDR',
        price_list_currency: 'IDR',
        plc_conversion_rate: 1,
        customer_address: formData.customer_address || '',
        shipping_address: formData.shipping_address || '',
        contact_person: formData.contact_person || '',
        taxes_and_charges: selectedTaxTemplate?.name || '',
        update_stock: 0,
        remarks: formData.items.find(item => item.delivery_note)
          ? `Generated from Delivery Note: ${formData.items.find(item => item.delivery_note)?.delivery_note}`
          : 'Direct Sales Invoice',
        sales_team: salesTeam.length > 0
          ? salesTeam.map((m, idx) => ({
            sales_person: m.sales_person,
            allocated_percentage: m.allocated_percentage,
            idx: idx + 1,
            doctype: 'Sales Team',
            parentfield: 'sales_team',
            parenttype: 'Sales Invoice',
          }))
          : undefined,
        payment_terms_template: formData.payment_terms_template || undefined,
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
        discount_amount: finalDiscountAmount,
        additional_discount_percentage: discountPercentage,
        apply_discount_on: 'Net Total',
        taxes: taxesPayload,
        total,
        net_total: netTotal,
        grand_total: grandTotal,
        base_total: total,
        base_net_total: netTotal,
        base_grand_total: grandTotal,
        outstanding_amount: grandTotal,
        total_taxes_and_charges: totalTaxes,
      };

      const existingName = editingInvoice || createdDocName.current;
      const isUpdate = !!existingName;
      const url = isUpdate ? `/api/sales/invoices/${encodeURIComponent(existingName!)}` : '/api/sales/invoices';
      const method = isUpdate ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoicePayload),
      });

      const data = await response.json();

      if (data.success) {
        const siName = isUpdate ? existingName! : ((data.data as Record<string, unknown>)?.name as string || '');
        if (!editingInvoice) createdDocName.current = siName;
        setSavedDocName(siName);
        setIsSaved(true);
        setShowPrintDialog(true);
        if (isUpdate) setSuccessMessage('Faktur Penjualan berhasil diperbarui');
      } else {
        const action = isUpdate ? 'memperbarui' : 'menyimpan';
        const defaultMsg = `Gagal ${action} Faktur Penjualan (status ${response.status || 'unknown'})`;
        const result = handleERPNextError(
          data as Record<string, unknown>,
          formData.posting_date,
          'Sales Invoice',
          defaultMsg,
        );
        setError(result.bannerMessage);
      }
    } catch (e: unknown) {
      console.error('Error creating invoice:', e);
      const errorMessage = 'Terjadi kesalahan. Silakan coba lagi.';
      handleERPNextError(
        { message: errorMessage } as Record<string, unknown>,
        formData.posting_date,
        'Sales Invoice',
        errorMessage,
      );
      setError(errorMessage);
    } finally {
      setFormLoading(false);
      isSubmittingRef.current = false;
    }
  };

  const isReadOnly = editingInvoiceStatus === 'Paid' || editingInvoiceStatus === 'Submitted';
  const isFormDisabled = isReadOnly || isSaved;

  const subtotal = formData.items.reduce((sum, item) => sum + item.amount, 0);
  const totalQty = formData.items.reduce((sum, item) => sum + item.qty, 0);

  const pageTitle = editingInvoice
    ? isReadOnly ? 'Lihat Faktur Penjualan' : 'Edit Faktur Penjualan'
    : 'Buat Faktur Penjualan Baru';

  const pageSubtitle = editingInvoice
    ? isReadOnly ? 'Detail faktur penjualan (hanya baca)' : 'Perbarui faktur penjualan yang ada'
    : 'Isi form di bawah untuk membuat faktur baru';

  if (loading) return <LoadingSpinner message="Memuat detail faktur..." />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">

      {/* ── Header ──────────────────────────────────────────────────────────────── */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="flex items-center gap-3 min-w-0">
              {/* back chevron on mobile */}
              <button
                type="button"
                onClick={() => router.push('/invoice/siList')}
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
                  {editingInvoice && editingInvoiceStatus && (
                    <StatusBadge status={editingInvoiceStatus} />
                  )}
                </div>
                <p className="mt-0.5 text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                  {pageSubtitle}
                  {editingInvoice && (
                    <span className="ml-1 font-medium text-indigo-600 dark:text-indigo-400">
                      #{editingInvoice}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {editingInvoice && (
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
              {!editingInvoice && (
                <button
                  type="button"
                  onClick={() => { setShowDeliveryNoteDialog(true); fetchAvailableDeliveryNotes(); }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white shadow-sm transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span className="hidden sm:inline">Dari Surat Jalan</span>
                  <span className="sm:hidden">Dari SJ</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => router.push('/invoice/siList')}
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

      {/* ── Success banner ────────────────────────────────────────────────────── */}
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

          {/* ── Section: Informasi Faktur ──────────────────────────────────── */}
          <section className={`${sectionCard} p-5 mb-5`}>
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
              Informasi Faktur
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">

              {/* Pelanggan */}
              <div className="sm:col-span-2 xl:col-span-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Pelanggan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  readOnly
                  className={`${inputBase} ${inputReadOnly}`}
                  value={formData.customer_name || formData.customer}
                  placeholder="Pilih dari Surat Jalan..."
                />
              </div>

              {/* Tanggal Posting */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tanggal Posting <span className="text-red-500">*</span>
                </label>
                <BrowserStyleDatePicker
                  value={formData.posting_date}
                  onChange={(value: string) => setFormData({ ...formData, posting_date: value })}
                  className={`${inputBase} ${isFormDisabled ? inputReadOnly : ''}`}
                  placeholder="DD/MM/YYYY"
                />
              </div>

              {/* Jatuh Tempo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Jatuh Tempo <span className="text-red-500">*</span>
                </label>
                <BrowserStyleDatePicker
                  value={formData.due_date}
                  onChange={(value: string) => setFormData({ ...formData, due_date: value })}
                  className={`${inputBase} ${isFormDisabled ? inputReadOnly : ''}`}
                  placeholder="DD/MM/YYYY"
                />
              </div>

              {/* Total Komisi Sales */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Total Komisi Sales
                </label>
                <input
                  type="text"
                  readOnly
                  className={`${inputBase} ${inputReadOnly} text-right`}
                  value={formData.custom_total_komisi_sales
                    ? formData.custom_total_komisi_sales.toLocaleString('id-ID')
                    : '0'}
                  placeholder="0"
                />
              </div>
            </div>
          </section>

          {/* ── Section: Daftar Barang ─────────────────────────────────────── */}
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
                    {formData.items.length > 1 && !isFormDisabled && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Hapus
                      </button>
                    )}
                  </div>

                  {/* Main fields — single row, horizontally scrollable on small screens */}
                  <div className="flex flex-nowrap items-start gap-2 overflow-x-auto pb-0.5">

                    {/* Kode Barang */}
                    <div className="flex-shrink-0 w-36">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 whitespace-nowrap">
                        Kode Barang
                      </label>
                      <input
                        type="text"
                        required
                        readOnly
                        className={`${inputSmBase} ${inputReadOnly}`}
                        value={item.item_code}
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
                        required
                        readOnly
                        className={`${inputSmBase} ${inputReadOnly} min-w-0`}
                        value={item.item_name}
                        placeholder="–"
                      />
                    </div>

                    {/* Qty */}
                    <div className="flex-shrink-0 w-16">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 whitespace-nowrap">
                        Qty
                      </label>
                      <input
                        type="text"
                        readOnly
                        className={`${inputSmBase} ${inputReadOnly} text-right`}
                        value={item.qty ? item.qty.toLocaleString('id-ID') : '0'}
                      />
                    </div>

                    {/* Harga */}
                    <div className="flex-shrink-0 w-28">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Harga</label>
                      <input
                        type="text"
                        readOnly
                        className={`${inputSmBase} ${inputReadOnly} text-right`}
                        value={item.rate ? item.rate.toLocaleString('id-ID') : '0'}
                      />
                    </div>

                    {/* Jumlah (Subtotal) */}
                    <div className="flex-shrink-0 w-28">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Jumlah</label>
                      <input
                        type="text"
                        readOnly
                        className={`${inputSmBase} ${inputReadOnly} text-right font-semibold`}
                        value={item.amount ? item.amount.toLocaleString('id-ID') : '0'}
                      />
                    </div>

                    {/* Akun Pendapatan */}
                    <div className="flex-shrink-0 w-44">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 whitespace-nowrap">
                        Akun Pendapatan
                      </label>
                      <input
                        type="text"
                        readOnly
                        className={`${inputSmBase} ${inputReadOnly}`}
                        value={item.income_account}
                      />
                    </div>
                  </div>

                  {/* DN / SO detail fields */}
                  <div className="flex flex-nowrap items-start gap-2 overflow-x-auto pb-0.5 mt-2">

                    {/* Surat Jalan */}
                    <div className="flex-shrink-0 w-36">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 whitespace-nowrap">
                        Surat Jalan
                      </label>
                      <input
                        type="text"
                        readOnly
                        className={`${inputSmBase} ${inputReadOnly}`}
                        value={item.delivery_note || ''}
                        placeholder="–"
                      />
                    </div>

                    {/* Pesanan Penjualan */}
                    <div className="flex-1 min-w-[120px]">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 whitespace-nowrap">
                        Pesanan Penjualan
                      </label>
                      <input
                        type="text"
                        readOnly
                        className={`${inputSmBase} ${inputReadOnly} min-w-0`}
                        value={item.sales_order || ''}
                        placeholder="–"
                      />
                    </div>

                    {/* Detail SO */}
                    <div className="flex-shrink-0 w-36">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 whitespace-nowrap">
                        Detail SO
                      </label>
                      <input
                        type="text"
                        readOnly
                        className={`${inputSmBase} ${inputReadOnly}`}
                        value={item.so_detail || ''}
                        placeholder="–"
                      />
                    </div>

                    {/* Komisi Sales */}
                    <div className="flex-shrink-0 w-28">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 whitespace-nowrap">
                        Komisi Sales
                      </label>
                      <input
                        type="text"
                        readOnly
                        className={`${inputSmBase} ${inputReadOnly} text-right`}
                        value={item.custom_komisi_sales
                          ? item.custom_komisi_sales.toLocaleString('id-ID')
                          : '0'}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Section: Totals ───────────────────────────────────────────────── */}
          <section className={`${sectionCard} p-5 mb-5`}>
            <div className="flex flex-wrap items-center justify-end gap-6 text-sm">
              <div className="text-right">
                <p className="text-gray-500 dark:text-gray-400">Total Komisi Sales</p>
                <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  Rp {formData.items.reduce((sum, item) => sum + (item.custom_komisi_sales || 0), 0).toLocaleString('id-ID')}
                </p>
              </div>
              <div className="h-8 border-l border-gray-200 dark:border-gray-700" />
              <div className="text-right">
                <p className="text-gray-500 dark:text-gray-400">Total Kuantitas</p>
                <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  {totalQty.toLocaleString('id-ID')}
                </p>
              </div>
              <div className="h-8 border-l border-gray-200 dark:border-gray-700" />
              <div className="text-right">
                <p className="text-gray-500 dark:text-gray-400">Subtotal</p>
                <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                  Rp {subtotal.toLocaleString('id-ID')}
                </p>
              </div>
            </div>
          </section>

          {/* ── Section: Diskon ───────────────────────────────────────────────── */}
          <section className={`${sectionCard} p-5 mb-5`}>
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
              Diskon
            </h2>
            <DiscountInput
              subtotal={subtotal}
              discountPercentage={discountPercentage}
              discountAmount={discountAmount}
              onChange={(data) => {
                setDiscountPercentage(data.discountPercentage);
                setDiscountAmount(data.discountAmount);
              }}
              disabled={isFormDisabled}
            />
          </section>

          {/* ── Section: Pajak ────────────────────────────────────────────────── */}
          <section className={`${sectionCard} p-5 mb-5`}>
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
              Pajak
            </h2>
            <TaxTemplateSelect
              company={selectedCompany}
              type="Sales"
              value={selectedTaxTemplate?.name || ''}
              onChange={(template) => {
                setSelectedTaxTemplate(template);
                setFormData(prev => ({ ...prev, taxes_and_charges: template?.name || '' }));
              }}
              disabled={isFormDisabled}
            />
            {selectedTaxTemplate && (
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg text-sm">
                <p className="font-medium text-blue-800 dark:text-blue-300">
                  Template: {selectedTaxTemplate.title}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                  {selectedTaxTemplate.taxes.length} baris pajak
                </p>
              </div>
            )}
          </section>

          {/* ── Section: Ringkasan Invoice ────────────────────────────────────── */}
          <section className={`${sectionCard} p-5 mb-5`}>
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
              Ringkasan
            </h2>
            <InvoiceSummary
              items={formData.items}
              discountAmount={discountAmount}
              discountPercentage={discountPercentage}
              taxes={selectedTaxTemplate?.taxes as InvoiceSummaryProps['taxes']}
            />
          </section>

          {/* ── Section: Catatan ──────────────────────────────────────────────── */}
          <section className={`${sectionCard} p-5 mb-5`}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Catatan</label>
            <textarea
              rows={3}
              className={`${inputBase} resize-none ${isFormDisabled ? inputReadOnly : ''}`}
              value={formData.custom_notes_si ?? ''}
              onChange={(e) => setFormData({ ...formData, custom_notes_si: e.target.value })}
              placeholder="Tambahkan catatan untuk faktur penjualan ini..."
              disabled={isFormDisabled}
            />
          </section>

          {/* ── Footer Actions ────────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => router.push('/invoice/siList')}
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
                  : editingInvoice
                    ? 'Perbarui Faktur'
                    : 'Simpan Faktur'}
              </button>
            )}

            {isReadOnly && (
              <span className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                {editingInvoiceStatus} — Hanya Baca
              </span>
            )}
          </div>

        </form>
      </main>

      {/* ── Delivery Note Dialog ──────────────────────────────────────────────── */}
      {showDeliveryNoteDialog && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 overflow-y-auto flex items-start justify-center z-50 p-4">
          <div className="relative mt-16 w-full max-w-4xl bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700">

            {/* Dialog header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Pilih Surat Jalan</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Semua barang akan diganti dengan data dari Surat Jalan yang dipilih
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDeliveryNoteDialog(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Dialog body */}
            <div className="px-6 py-4">
              {deliveryNotesLoading ? (
                <div className="text-center py-10">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400" />
                  <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Memuat surat jalan...</p>
                </div>
              ) : deliveryNotesError ? (
                <div className="text-center py-10">
                  <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">Kesalahan</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{deliveryNotesError}</p>
                </div>
              ) : deliveryNotes.length === 0 ? (
                <div className="text-center py-10">
                  <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">Tidak Ada Surat Jalan</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Tidak ada surat jalan yang tersedia untuk ditagih.</p>
                </div>
              ) : (
                <>
                  <div className="mb-3">
                    <input
                      type="text"
                      value={deliveryNoteSearch}
                      onChange={(e) => setDeliveryNoteSearch(e.target.value)}
                      placeholder="Cari nomor surat jalan atau pelanggan..."
                      className={`${inputBase}`}
                    />
                  </div>
                  <ul className="divide-y divide-gray-100 dark:divide-gray-700 max-h-96 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
                    {deliveryNotes
                      .filter((dn) => {
                        const term = deliveryNoteSearch.trim().toLowerCase();
                        if (!term) return true;
                        const customerLabel = (dn.customer_name || dn.customer || '').toLowerCase();
                        return dn.name.toLowerCase().includes(term) || customerLabel.includes(term);
                      })
                      .map((dn) => (
                        <li
                          key={dn.name}
                          onClick={() => handleSelectDeliveryNote(dn.name)}
                          className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                          <div className="px-4 py-3">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 truncate">{dn.name}</p>
                                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{dn.customer_name || dn.customer}</p>
                              </div>
                              <span className={`ml-3 flex-shrink-0 inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                                dn.status === 'To Bill'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                                  : dn.status === 'Submitted'
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                                    : dn.status === 'Completed'
                                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300'
                                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                              }`}>
                                {dn.status}
                              </span>
                            </div>
                            <div className="mt-1.5 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                              <span>{dn.posting_date}</span>
                              <span className="font-medium">Rp {dn.grand_total ? dn.grand_total.toLocaleString('id-ID') : '0'}</span>
                            </div>
                          </div>
                        </li>
                      ))}
                  </ul>
                </>
              )}

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowDeliveryNoteDialog(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Print Dialog ─────────────────────────────────────────────────────── */}
      <PrintDialog
        isOpen={showPrintDialog}
        onClose={() => { setShowPrintDialog(false); router.replace('/invoice/siList'); }}
        documentType="Sales Invoice"
        documentName={savedDocName}
        documentLabel="Faktur Penjualan"
      />

      {/* ── Print Preview Modal ───────────────────────────────────────────────── */}
      {showPrintPreview && editingInvoiceData && (
        <PrintPreviewModal
          title={`Faktur Penjualan - ${editingInvoiceData.name}`}
          onClose={() => setShowPrintPreview(false)}
          paperMode="continuous"
        >
          <SalesInvoicePrint
            data={{
              name: editingInvoiceData.name || '',
              posting_date: editingInvoiceData.posting_date || '',
              due_date: editingInvoiceData.due_date || '',
              docstatus: editingInvoiceData.docstatus || 0,
              customer: editingInvoiceData.customer || '',
              customer_name: editingInvoiceData.customer_name || '',
              tax_id: editingInvoiceData.tax_id || '',
              items: editingInvoiceData.items || [],
              total: editingInvoiceData.total || 0,
              total_taxes_and_charges: editingInvoiceData.total_taxes_and_charges || 0,
              grand_total: editingInvoiceData.grand_total || 0,
              in_words: editingInvoiceData.in_words || '',
              remarks: editingInvoiceData.remarks || editingInvoiceData.custom_notes_si || '',
            }}
            companyName={selectedCompany}
          />
        </PrintPreviewModal>
      )}
    </div>
  );
}
