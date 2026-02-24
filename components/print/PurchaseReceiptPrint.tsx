/**
 * Purchase Receipt Print Component
 * 
 * Renders Purchase Receipt documents for printing with continuous form format.
 * Includes related PO, ordered vs received quantities, and QC notes.
 * 
 * @validates Requirements 1.2, 9.16, 9.17, 9.18, 9.19
 */

import PrintLayout from './PrintLayout';
import type { PrintLayoutProps } from '@/types/print';

interface PurchaseReceiptPrintProps {
  data: {
    name: string;
    posting_date: string;
    docstatus: number;
    supplier: string;
    supplier_name?: string;
    purchase_order?: string;
    items: Array<{
      item_code: string;
      item_name: string;
      qty: number;
      received_qty?: number;
      warehouse?: string;
    }>;
    remarks?: string;
  };
  companyName: string;
  companyLogo?: string;
}

export default function PurchaseReceiptPrint({ data, companyName, companyLogo }: PurchaseReceiptPrintProps) {
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

  const printProps: PrintLayoutProps = {
    documentTitle: 'PURCHASE RECEIPT',
    documentNumber: data.name,
    documentDate: formatDate(data.posting_date),
    status: getStatus(data.docstatus),
    companyName,
    companyLogo,
    partyLabel: 'Pemasok',
    partyName: data.supplier_name || data.supplier,
    referenceDoc: data.purchase_order,
    referenceLabel: 'Ref. Purchase Order',
    items: data.items,
    columns: [
      { key: 'item_code', label: 'Kode', align: 'left', width: '15%' },
      { key: 'item_name', label: 'Nama Item', align: 'left', width: '30%' },
      { key: 'qty', label: 'Dipesan', align: 'right', width: '12%', format: (v) => v.toString() },
      { key: 'received_qty', label: 'Diterima', align: 'right', width: '12%', format: (v) => v?.toString() || '-' },
      { key: 'warehouse', label: 'Gudang', align: 'left', width: '21%' },
    ],
    showPrice: false,
    notes: data.remarks,
    signatures: [
      { label: 'Penerima' },
      { label: 'QC' },
      { label: 'Supervisor' },
    ],
    paperMode: 'continuous',
  };

  return <PrintLayout {...printProps} />;
}
