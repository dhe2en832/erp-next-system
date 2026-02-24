/**
 * Sales Invoice (Faktur Jual) Print Component
 * 
 * Renders Sales Invoice documents for printing with continuous form format.
 * Includes NPWP, tax breakdown, payment due date, and bank account information.
 * 
 * @validates Requirements 1.2, 9.9, 9.10, 9.11, 9.12
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

interface SalesInvoicePrintProps {
  data: {
    name: string;
    posting_date: string;
    docstatus: number;
    customer: string;
    customer_name?: string;
    tax_id?: string;
    due_date?: string;
    payment_terms_template?: string;
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
  companyNpwp?: string;
  bankAccount?: string;
}

export default function SalesInvoicePrint({ 
  data, 
  companyName, 
  companyLogo, 
  companyNpwp,
  bankAccount 
}: SalesInvoicePrintProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
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

  // Build notes with bank account info
  let notesText = data.remarks || '';
  if (bankAccount) {
    notesText = notesText 
      ? `${notesText}\n\nRekening Bank: ${bankAccount}` 
      : `Rekening Bank: ${bankAccount}`;
  }
  if (companyNpwp) {
    notesText = notesText 
      ? `${notesText}\nNPWP Perusahaan: ${companyNpwp}` 
      : `NPWP Perusahaan: ${companyNpwp}`;
  }
  if (data.tax_id) {
    notesText = notesText 
      ? `${notesText}\nNPWP Pelanggan: ${data.tax_id}` 
      : `NPWP Pelanggan: ${data.tax_id}`;
  }

  const printProps: PrintLayoutProps = {
    documentTitle: 'FAKTUR JUAL',
    documentNumber: data.name,
    documentDate: formatDate(data.posting_date),
    status: getStatus(data.docstatus),
    companyName,
    companyLogo,
    companyNpwp,
    partyLabel: 'Pelanggan',
    partyName: data.customer_name || data.customer,
    partyNpwp: data.tax_id,
    dueDate: data.due_date ? formatDate(data.due_date) : undefined,
    paymentTerms: data.payment_terms_template,
    items: data.items,
    columns: [
      { key: 'item_code', label: 'Kode', align: 'left', width: '15%' },
      { key: 'item_name', label: 'Nama Item', align: 'left', width: '40%' },
      { key: 'qty', label: 'Qty', align: 'right', width: '10%', format: (v) => v.toString() },
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
