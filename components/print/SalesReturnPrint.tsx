/**
 * Sales Return Print Component
 * 
 * Renders Sales Return documents for printing with continuous form format.
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

interface SalesReturnPrintProps {
  data: {
    name: string;
    posting_date: string;
    docstatus: number;
    customer: string;
    customer_name?: string;
    return_against?: string;
    delivery_note?: string;
    items: Array<{
      item_code: string;
      item_name: string;
      qty: number;
      rate: number;
      amount: number;
      discount_percentage?: number;
      uom?: string;
      stock_uom?: string;
    }>;
    total?: number;
    net_total?: number;
    total_taxes_and_charges?: number;
    grand_total: number;
    in_words?: string;
    base_in_words?: string;
    custom_notes?: string;
    customer_address?: string;
    address_display?: string;
    shipping_address_name?: string;
  };
  companyName: string;
}

export default function SalesReturnPrint({ 
  data, 
  companyName,
}: SalesReturnPrintProps) {
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

  const printProps: PrintLayoutProps = {
    documentTitle: 'SALES RETURN',
    documentNumber: data.name,
    documentDate: formatDate(data.posting_date),
    status: getStatus(data.docstatus),
    companyName,
    partyLabel: 'Pelanggan',
    partyName: data.customer_name || data.customer,
    referenceDoc: data.delivery_note || data.return_against,
    referenceLabel: data.delivery_note ? 'Surat Jalan' : 'Referensi',
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
    terbilang: fixTerbilang(data.in_words || ''),
    notes: data.custom_notes || '',
    signatures: [
      { label: 'Dibuat Oleh' },
      { label: 'Disetujui Oleh' },
    ],
    paperMode: 'continuous',
  };

  return <PrintLayout {...printProps} />;
}
