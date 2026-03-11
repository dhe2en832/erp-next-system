/**
 * Delivery Note (Surat Jalan) Print Component
 * 
 * Renders Delivery Note documents for printing with continuous form format.
 * NO PRICING - includes warehouse, driver, vehicle information.
 * 
 * @validates Requirements 1.2, 9.4, 9.5, 9.6, 9.7, 9.8
 */

import PrintLayout from './PrintLayout';
import type { PrintLayoutProps } from '@/types/print';

export interface DeliveryNotePrintProps {
  data: {
    name: string;
    posting_date: string;
    docstatus: number;
    customer: string;
    customer_name?: string;
    lr_no?: string;
    lr_date?: string;
    transporter_name?: string;
    vehicle_no?: string;
    against_sales_order?: string;
    items: Array<{
      item_code: string;
      item_name: string;
      qty: number;
      warehouse?: string;
    }>;
    remarks?: string;
  };
  companyName: string;
  companyLogo?: string;
}

export default function DeliveryNotePrint({ data, companyName, companyLogo }: DeliveryNotePrintProps) {
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
    documentTitle: 'SURAT JALAN',
    documentNumber: data.name,
    documentDate: formatDate(data.posting_date),
    status: getStatus(data.docstatus),
    companyName,
    companyLogo,
    partyLabel: 'Pelanggan',
    partyName: data.customer_name || data.customer,
    referenceDoc: data.against_sales_order,
    referenceLabel: 'Ref. Sales Order',
    driverName: data.transporter_name,
    vehicleNumber: data.vehicle_no,
    deliveryDate: data.lr_date ? formatDate(data.lr_date) : undefined,
    items: data.items,
    columns: [
      { key: 'item_code', label: 'Kode', align: 'left', width: '15%' },
      { key: 'item_name', label: 'Nama Item', align: 'left', width: '45%' },
      { key: 'qty', label: 'Qty', align: 'right', width: '15%', format: (v) => String(v || 0) },
      { key: 'warehouse', label: 'Gudang', align: 'left', width: '25%' },
    ],
    showPrice: false, // NO PRICING for Delivery Note
    notes: data.remarks,
    signatures: [
      { label: 'Pengirim' },
      { label: 'Pengemudi', name: data.transporter_name },
      { label: 'Penerima' },
    ],
    paperMode: 'continuous',
  };

  return <PrintLayout {...printProps} />;
}
