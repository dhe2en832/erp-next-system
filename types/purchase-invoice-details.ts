export interface PurchaseInvoiceItem {
  item_code: string;
  item_name: string;
  description?: string;
  qty: number;
  uom: string;
  rate: number;
  discount_percentage?: number;
  discount_amount: number;
  tax_amount: number;
  amount: number;
}

export interface PurchaseInvoiceWithItems {
  name: string;
  supplier: string;
  supplier_name?: string;
  posting_date: string;
  due_date?: string;
  status: string;
  docstatus: number;
  grand_total: number;
  outstanding_amount?: number;
  items: PurchaseInvoiceItem[];
}

export interface PurchaseInvoiceDetailsResponse {
  success: boolean;
  data: PurchaseInvoiceWithItems[];
  message?: string;
}
