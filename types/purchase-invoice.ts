/**
 * TypeScript interfaces for Purchase Invoice API with Discount and Tax support
 * 
 * Requirements: 3.1, 3.2, 3.3
 */

// Reuse InvoiceItem and TaxRow from sales-invoice.ts
export { InvoiceItem, TaxRow } from './sales-invoice';

/**
 * Request body for creating Purchase Invoice
 */
export interface CreatePurchaseInvoiceRequest {
  // Basic fields
  company: string;
  supplier: string;
  supplier_name: string;
  posting_date: string;
  due_date?: string;
  items: import('./sales-invoice').InvoiceItem[];
  
  // Discount fields (optional) - Requirements 3.1, 3.2
  discount_amount?: number;
  discount_percentage?: number;
  additional_discount_percentage?: number;
  apply_discount_on?: "Grand Total" | "Net Total";
  
  // Tax fields (optional) - Requirement 3.3
  taxes_and_charges?: string; // Tax Template name
  taxes?: import('./sales-invoice').TaxRow[];
  
  // Other fields
  currency?: string;
  buying_price_list?: string;
  price_list_currency?: string;
  plc_conversion_rate?: number;
  status?: string;
  docstatus?: 0 | 1 | 2;
  
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
  
  // Bill details
  bill_no?: string;
  bill_date?: string;
}

/**
 * Purchase Invoice response data
 */
export interface PurchaseInvoice {
  name: string; // Invoice number
  company: string;
  supplier: string;
  supplier_name: string;
  posting_date: string;
  due_date?: string;
  
  // Totals before discount
  total: number;
  base_total: number;
  
  // Discount fields - Requirement 3.6
  discount_amount: number; // Always present, 0 for old invoices
  discount_percentage: number;
  additional_discount_percentage?: number;
  apply_discount_on?: string;
  
  // Totals after discount
  net_total: number;
  base_net_total: number;
  
  // Tax fields - Requirement 3.6
  taxes_and_charges?: string;
  taxes: import('./sales-invoice').TaxRow[]; // Always present, empty array for old invoices
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
  items?: import('./sales-invoice').InvoiceItem[];
  
  // Bill details
  bill_no?: string;
  bill_date?: string;
  
  // Metadata
  creation?: string;
  modified?: string;
  owner?: string;
}

/**
 * Response for creating Purchase Invoice
 */
export interface CreatePurchaseInvoiceResponse {
  success: boolean;
  message?: string;
  data?: PurchaseInvoice;
  error?: string;
}

/**
 * Response for getting Purchase Invoices
 */
export interface GetPurchaseInvoicesResponse {
  success: boolean;
  data?: PurchaseInvoice[];
  message?: string;
  error?: string;
}

/**
 * Query parameters for GET /api/purchase/invoices
 */
export interface GetPurchaseInvoicesParams {
  company?: string;
  supplier?: string;
  status?: string;
  from_date?: string;
  to_date?: string;
  search?: string;
  documentNumber?: string;
  limit?: string;
  start?: string;
  order_by?: string;
}
