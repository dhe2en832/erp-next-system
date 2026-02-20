/**
 * TypeScript interfaces for Sales Invoice API with Discount and Tax support
 * 
 * Requirements: 2.1, 2.2, 2.3
 */

/**
 * Invoice Item interface
 */
export interface InvoiceItem {
  item_code: string;
  item_name?: string;
  qty: number;
  rate: number;
  amount?: number;
  warehouse?: string;
  uom?: string;
  description?: string;
  delivery_note?: string;
  dn_detail?: string;
}

/**
 * Tax Row interface for taxes array
 */
export interface TaxRow {
  charge_type: "On Net Total" | "Actual" | "On Previous Row Total";
  account_head: string;
  description?: string;
  rate?: number;
  tax_amount?: number;
  add_deduct_tax?: "Add" | "Deduct";
  total?: number;
}

/**
 * Sales Team member interface
 */
export interface SalesTeamMember {
  sales_person: string;
  allocated_percentage?: number;
  allocated_amount?: number;
  commission_rate?: number;
  incentives?: number;
}

/**
 * Request body for creating Sales Invoice
 */
export interface CreateSalesInvoiceRequest {
  // Basic fields
  company: string;
  customer: string;
  customer_name: string;
  posting_date: string;
  due_date?: string;
  items: InvoiceItem[];
  
  // Discount fields (optional) - Requirements 2.1, 2.2
  discount_amount?: number;
  discount_percentage?: number;
  additional_discount_percentage?: number;
  apply_discount_on?: "Grand Total" | "Net Total";
  
  // Tax fields (optional) - Requirement 2.3
  taxes_and_charges?: string; // Tax Template name
  taxes?: TaxRow[];
  
  // Other fields
  currency?: string;
  selling_price_list?: string;
  price_list_currency?: string;
  plc_conversion_rate?: number;
  territory?: string;
  status?: string;
  docstatus?: 0 | 1 | 2;
  
  // Sales team
  sales_team?: SalesTeamMember[];
  
  // Custom fields
  custom_total_komisi_sales?: number;
  custom_notes_si?: string;
  
  // Payment terms
  payment_terms_template?: string;
  
  // Calculated totals (optional, will be calculated by ERPNext)
  total?: number;
  net_total?: number;
  grand_total?: number;
  base_total?: number;
  base_net_total?: number;
  base_grand_total?: number;
  outstanding_amount?: number;
  total_taxes_and_charges?: number;
  
  // Write-off
  write_off_amount?: number;
  base_write_off_amount?: number;
}

/**
 * Sales Invoice response data
 */
export interface SalesInvoice {
  name: string; // Invoice number
  company: string;
  customer: string;
  customer_name: string;
  posting_date: string;
  due_date?: string;
  
  // Totals before discount
  total: number;
  base_total: number;
  
  // Discount fields - Requirement 2.6
  discount_amount: number; // Always present, 0 for old invoices
  discount_percentage: number;
  additional_discount_percentage?: number;
  apply_discount_on?: string;
  
  // Totals after discount
  net_total: number;
  base_net_total: number;
  
  // Tax fields - Requirement 2.6
  taxes_and_charges?: string;
  taxes: TaxRow[]; // Always present, empty array for old invoices
  total_taxes_and_charges: number;
  
  // Grand total
  grand_total: number;
  base_grand_total: number;
  rounded_total?: number;
  outstanding_amount: number;
  
  // Status
  status: string;
  docstatus: number;
  
  // Items
  items?: InvoiceItem[];
  
  // Sales team
  sales_team?: SalesTeamMember[];
  
  // Custom fields
  custom_total_komisi_sales?: number;
  custom_notes_si?: string;
  
  // Metadata
  creation?: string;
  modified?: string;
  owner?: string;
}

/**
 * Response for creating Sales Invoice
 */
export interface CreateSalesInvoiceResponse {
  success: boolean;
  message?: string;
  data?: SalesInvoice;
  error?: string;
}

/**
 * Response for getting Sales Invoices
 */
export interface GetSalesInvoicesResponse {
  success: boolean;
  data?: SalesInvoice[];
  message?: string;
  error?: string;
}

/**
 * Query parameters for GET /api/sales/invoices
 */
export interface GetSalesInvoicesParams {
  company?: string;
  customer?: string;
  status?: string;
  from_date?: string;
  to_date?: string;
  search?: string;
  documentNumber?: string;
  limit?: string;
  start?: string;
  order_by?: string;
}
