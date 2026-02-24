/**
 * Payment Print Component (Pay & Receive)
 * 
 * Renders Payment documents for printing with continuous form format.
 * Includes payment method, bank account, related invoices, and payment status.
 * 
 * @validates Requirements 1.2, 9.23, 9.24, 9.25, 9.26
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
interface PaymentPrintProps {
  data: {
    name: string;
    posting_date: string;
    docstatus: number;
    payment_type: 'Pay' | 'Receive';
    party_type: string;
    party: string;
    party_name?: string;
    mode_of_payment?: string;
    paid_from?: string;
    paid_to?: string;
    paid_amount: number;
    received_amount?: number;
    status?: string;
    references?: Array<{
      reference_doctype: string;
      reference_name: string;
      allocated_amount: number;
    }>;
    remarks?: string;
    in_words?: string;
  };
  companyName: string;
  companyLogo?: string;
}

export default function PaymentPrint({ data, companyName, companyLogo }: PaymentPrintProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
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

  const isPay = data.payment_type === 'Pay';
  const documentTitle = isPay ? 'PEMBAYARAN KELUAR' : 'PEMBAYARAN MASUK';
  const partyLabel = isPay ? 'Pemasok' : 'Pelanggan';
  const bankAccount = isPay ? data.paid_from : data.paid_to;

  // Build items from references
  const items = (data.references || []).map(ref => ({
    reference_doctype: ref.reference_doctype,
    reference_name: ref.reference_name,
    allocated_amount: ref.allocated_amount,
  }));

  // Build notes with payment status
  let notesText = data.remarks || '';
  if (data.status) {
    notesText = notesText
      ? `${notesText}\n\nStatus Pembayaran: ${data.status}`
      : `Status Pembayaran: ${data.status}`;
  }

  const printProps: PrintLayoutProps = {
    documentTitle,
    documentNumber: data.name,
    documentDate: formatDate(data.posting_date),
    status: getStatus(data.docstatus),
    companyName,
    companyLogo,
    partyLabel,
    partyName: data.party_name || data.party,
    paymentMethod: data.mode_of_payment,
    bankAccount,
    items: items.length > 0 ? items : [{ reference_doctype: '-', reference_name: '-', allocated_amount: data.paid_amount }],
    columns: [
      { key: 'reference_doctype', label: 'Tipe Dokumen', align: 'left', width: '30%' },
      { key: 'reference_name', label: 'No. Dokumen', align: 'left', width: '40%' },
      { key: 'allocated_amount', label: 'Jumlah', align: 'right', width: '30%', format: formatCurrency },
    ],
    showPrice: true,
    totalAmount: data.received_amount || data.paid_amount,
    // terbilang: undefined,
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
