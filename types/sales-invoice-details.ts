export interface SalesInvoiceItem {
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

export interface SalesTeamMember {
  sales_person: string;
  allocated_percentage?: number;
  commission_rate?: number;
}

export interface SalesInvoiceWithItems {
  name: string;
  customer: string;
  customer_name?: string;
  posting_date: string;
  due_date?: string;
  status: string;
  docstatus: number;
  grand_total: number;
  outstanding_amount?: number;
  items: SalesInvoiceItem[];
  sales_team?: SalesTeamMember[];
}

export interface SalesInvoiceDetailsResponse {
  success: boolean;
  data: SalesInvoiceWithItems[];
  message?: string;
}
