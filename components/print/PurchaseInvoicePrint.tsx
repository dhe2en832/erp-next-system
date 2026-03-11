/**
 * Purchase Invoice Print Component
 * 
 * Renders Purchase Invoice documents for printing with continuous form format.
 * Includes supplier invoice reference, related PR, and payment due date.
 * 
 * @validates Requirements 1.2, 9.20, 9.21, 9.22
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

export interface PurchaseInvoicePrintProps {
  data: {
    name: string;
    posting_date: string;
    docstatus: number;
    supplier: string;
    supplier_name?: string;
    bill_no?: string;
    bill_date?: string;
    purchase_receipt?: string;
    due_date?: string;
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

export default function PurchaseInvoicePrint({ data, companyName, companyLogo }: PurchaseInvoicePrintProps) {
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

  // Build notes with supplier invoice reference
  let notesText = data.remarks || '';
  if (data.bill_no) {
    const billInfo = data.bill_date 
      ? `No. Invoice Supplier: ${data.bill_no} (${formatDate(data.bill_date)})`
      : `No. Invoice Supplier: ${data.bill_no}`;
    notesText = notesText ? `${notesText}\n\n${billInfo}` : billInfo;
  }

  const printProps: PrintLayoutProps = {
    documentTitle: 'PURCHASE INVOICE',
    documentNumber: data.name,
    documentDate: formatDate(data.posting_date),
    status: getStatus(data.docstatus),
    companyName,
    companyLogo,
    partyLabel: 'Pemasok',
    partyName: data.supplier_name || data.supplier,
    referenceDoc: data.purchase_receipt,
    referenceLabel: 'Ref. Purchase Receipt',
    dueDate: data.due_date ? formatDate(data.due_date) : undefined,
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
    notes: notesText,
    signatures: [
      { label: 'Dibuat Oleh' },
      { label: 'Disetujui Oleh' },
    ],
    paperMode: 'continuous',
  };

  return <PrintLayout {...printProps} />;
}
