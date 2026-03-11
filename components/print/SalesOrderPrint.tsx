/**
 * Sales Order Print Component
 * 
 * Renders Sales Order documents for printing with continuous form format.
 * Includes delivery date, payment terms, and sales person information.
 * 
 * @validates Requirements 1.2, 9.1, 9.2, 9.3
 */

import PrintLayout from './PrintLayout';
import type { PrintLayoutProps } from '@/types/print';

function fixTerbilang(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/^IDR\s+/i, '')
    .replace(/\s+saja\.?$/i, ' rupiah')
    .trim();
}

export interface SalesOrderPrintProps {
  data: {
    name: string;
    transaction_date: string;
    docstatus: number;
    customer: string;
    customer_name?: string;
    customer_address?: string;
    delivery_date?: string;
    payment_terms_template?: string;
    sales_person?: string;
    items: Array<{
      item_code: string;
      item_name: string;
      qty: number;
      rate: number;
      amount: number;
    }>;
    total: number;
    total_taxes_and_charges?: number;
    grand_total: number;
    in_words?: string;
    remarks?: string;
  };
  companyName: string;
  companyLogo?: string;
}

export default function SalesOrderPrint({ data, companyName, companyLogo }: SalesOrderPrintProps) {
  const formatCurrency = (amount: unknown) => {
    const numAmount = typeof amount === 'number' ? amount : Number(amount);
    return new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(isNaN(numAmount) ? 0 : numAmount);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  };

  const getStatus = (docstatus: number) => {
    if (docstatus === 0) return 'Draft';
    if (docstatus === 1) return 'Submitted';
    if (docstatus === 2) return 'Cancelled';
    return undefined;
  };

  // Calculate totals
  const totalQuantity = data.items.reduce((sum, item) => sum + (item.qty || 0), 0);
  const totalItems = data.items.length;

  const printProps: PrintLayoutProps = {
    documentTitle: 'SALES ORDER',
    documentNumber: data.name,
    documentDate: formatDate(data.transaction_date),
    status: getStatus(data.docstatus),
    companyName,
    companyLogo,
    partyLabel: 'Pelanggan',
    partyName: data.customer_name || data.customer,
    partyAddress: data.customer_address,
    salesPerson: data.sales_person,
    deliveryDate: data.delivery_date ? formatDate(data.delivery_date) : undefined,
    paymentTerms: data.payment_terms_template,
    items: data.items,
    columns: [
      { key: 'item_code', label: 'Kode', align: 'left', width: '15%' },
      { key: 'item_name', label: 'Nama Item', align: 'left', width: '40%' },
      { key: 'qty', label: 'Qty', align: 'right', width: '10%', format: (v) => String(v || 0) },
      { key: 'rate', label: 'Harga', align: 'right', width: '17%', format: formatCurrency },
      { key: 'amount', label: 'Jumlah', align: 'right', width: '18%', format: formatCurrency },
    ],
    showPrice: true,
    subtotal: data.total,
    taxAmount: data.total_taxes_and_charges,
    totalAmount: data.grand_total,
    totalQuantity: totalQuantity,
    totalItems: totalItems,
    terbilang: fixTerbilang(data.in_words || ''),
    notes: data.remarks,
    signatures: [
      { label: 'Dibuat Oleh', name: data.sales_person },
      { label: 'Disetujui Oleh' },
      { label: 'Diterima oleh' },
    ],
    paperMode: 'continuous',
  };

  return <PrintLayout {...printProps} />;
}
