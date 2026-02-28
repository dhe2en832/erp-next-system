/**
 * TypeScript interfaces for Credit Note Management
 * 
 * Credit Note adalah Sales Invoice dengan is_return=1 untuk retur penjualan yang sudah dibayar
 * 
 * Requirements: 9.1, 9.7
 */

/**
 * Return Reason Enumeration
 * Predefined reasons for credit note returns
 */
export type CreditNoteReturnReason = 
  | 'Damaged'
  | 'Quality Issue'
  | 'Wrong Item'
  | 'Customer Request'
  | 'Expired'
  | 'Other';

/**
 * Credit Note Line Item
 * Represents a single item being returned in a credit note
 */
export interface CreditNoteItem {
  /** Item row ID */
  name: string;
  /** Item code */
  item_code: string;
  /** Item description */
  item_name: string;
  /** Return quantity (negative for returns) */
  qty: number;
  /** Unit price */
  rate: number;
  /** Line total (qty * rate, negative for returns) */
  amount: number;
  /** Unit of measure */
  uom: string;
  /** Warehouse for stock return */
  warehouse: string;
  /** Link to original sales invoice item row */
  si_detail: string;
  /** Original delivered quantity */
  delivered_qty: number;
  /** Already returned quantity */
  returned_qty: number;
  /** Reason for return */
  return_reason: CreditNoteReturnReason;
  /** Additional notes (required for "Other" reason) */
  return_item_notes?: string;
  /** Commission value for this item (negative for returns) */
  custom_komisi_sales: number;
}

/**
 * Credit Note Document
 * Represents a Sales Invoice with is_return=1
 */
export interface CreditNote {
  /** Credit Note document number */
  name: string;
  /** Document type (always 'Sales Invoice') */
  doctype: 'Sales Invoice';
  /** Return flag (always 1 for Credit Notes) */
  is_return: 1;
  /** Reference to original Sales Invoice */
  return_against: string;
  /** Customer ID */
  customer: string;
  /** Customer display name */
  customer_name: string;
  /** Posting date (YYYY-MM-DD) */
  posting_date: string;
  /** Company name */
  company: string;
  /** Document status label */
  status: 'Draft' | 'Submitted' | 'Cancelled';
  /** Document status code (0=Draft, 1=Submitted, 2=Cancelled) */
  docstatus: 0 | 1 | 2;
  /** Total value of credit note (negative) */
  grand_total: number;
  /** Total commission adjustment (negative) */
  custom_total_komisi_sales: number;
  /** Additional notes */
  return_notes?: string;
  /** Line items */
  items: CreditNoteItem[];
  /** Creation timestamp */
  creation: string;
  /** Last modified timestamp */
  modified: string;
  /** Document owner */
  owner: string;
  /** Last modified by */
  modified_by: string;
}

/**
 * Form Item with Validation State
 * Used in the form component for managing item state
 */
export interface CreditNoteFormItem {
  /** Item code */
  item_code: string;
  /** Item description */
  item_name: string;
  /** Return quantity (positive for display) */
  qty: number;
  /** Unit price */
  rate: number;
  /** Line total (positive for display) */
  amount: number;
  /** Unit of measure */
  uom: string;
  /** Warehouse for stock return */
  warehouse: string;
  /** Link to original sales invoice item row */
  sales_invoice_item: string;
  /** Original delivered quantity */
  delivered_qty: number;
  /** Already returned quantity */
  returned_qty: number;
  /** Calculated: delivered - returned */
  remaining_qty: number;
  /** Reason for return */
  return_reason: CreditNoteReturnReason | '';
  /** Additional notes (required for "Other" reason) */
  return_notes?: string;
  /** Commission value from original invoice */
  custom_komisi_sales: number;
  /** Whether item is selected for return */
  selected: boolean;
}

/**
 * Form Data for Creating/Editing Credit Notes
 * Used in the form component for managing form state
 */
export interface CreditNoteFormData {
  /** Customer ID */
  customer: string;
  /** Customer display name */
  customer_name: string;
  /** Posting date (DD/MM/YYYY format for display) */
  posting_date: string;
  /** Reference to original Sales Invoice */
  sales_invoice: string;
  /** Additional notes */
  custom_notes?: string;
  /** Line items with validation state */
  items: CreditNoteFormItem[];
}

/**
 * Sales Invoice Item
 * Represents a line item in a sales invoice
 */
export interface SalesInvoiceItem {
  /** Item row ID */
  name: string;
  /** Item code */
  item_code: string;
  /** Item description */
  item_name: string;
  /** Quantity */
  qty: number;
  /** Unit price */
  rate: number;
  /** Line total */
  amount: number;
  /** Unit of measure */
  uom: string;
  /** Warehouse */
  warehouse: string;
  /** Commission value for this item */
  custom_komisi_sales: number;
  /** Already returned quantity */
  returned_qty: number;
}

/**
 * Sales Invoice (for selection dialog)
 * Represents a paid sales invoice that can be selected for creating a credit note
 */
export interface SalesInvoice {
  /** Sales Invoice number */
  name: string;
  /** Customer ID */
  customer: string;
  /** Customer display name */
  customer_name: string;
  /** Posting date */
  posting_date: string;
  /** Document status */
  status: string;
  /** Total value */
  grand_total: number;
  /** Total commission */
  custom_total_komisi_sales: number;
  /** Line items */
  items: SalesInvoiceItem[];
}

/**
 * Request body for creating Credit Note
 */
export interface CreateCreditNoteRequest {
  /** Company name */
  company: string;
  /** Customer ID */
  customer: string;
  /** Posting date (YYYY-MM-DD) */
  posting_date: string;
  /** Reference to original Sales Invoice */
  return_against: string;
  /** Line items */
  items: Array<{
    item_code: string;
    item_name: string;
    qty: number; // Positive value, API converts to negative
    rate: number;
    amount: number;
    warehouse: string;
    sales_invoice_item: string; // Reference to original item
    return_reason: string;
    return_item_notes?: string;
    custom_komisi_sales: number; // From original invoice
  }>;
  /** Additional notes */
  return_notes?: string;
}

/**
 * Response for creating Credit Note
 */
export interface CreateCreditNoteResponse {
  success: boolean;
  message?: string;
  data?: CreditNote;
  error?: string;
}

/**
 * Response for getting Credit Notes
 */
export interface GetCreditNotesResponse {
  success: boolean;
  data?: CreditNote[];
  total_records?: number;
  message?: string;
  error?: string;
}

/**
 * Query parameters for GET /api/sales/credit-note
 */
export interface GetCreditNotesParams {
  /** Number of records per page */
  limit_page_length?: number;
  /** Starting record index */
  start?: number;
  /** Customer name search */
  search?: string;
  /** Credit Note document number */
  documentNumber?: string;
  /** Document status filter */
  status?: 'Draft' | 'Submitted' | 'Cancelled';
  /** Start date filter (YYYY-MM-DD) */
  from_date?: string;
  /** End date filter (YYYY-MM-DD) */
  to_date?: string;
  /** Sort order */
  order_by?: string;
  /** Additional ERPNext filters (JSON string) */
  filters?: string;
}
