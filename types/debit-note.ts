/**
 * TypeScript interfaces for Debit Note Management
 * 
 * Debit Note adalah Purchase Invoice dengan is_return=1 untuk retur pembelian yang sudah dibayar
 * 
 * Requirements: 3.4, 3.5, 15.1-15.7, 19.1-19.7
 */

/**
 * Return Reason Enumeration
 * Predefined reasons for debit note returns
 */
export type DebitNoteReturnReason = 
  | 'Damaged'
  | 'Quality Issue'
  | 'Wrong Item'
  | 'Supplier Request'
  | 'Expired'
  | 'Other';

/**
 * Alias for backward compatibility
 */
export type ReturnReason = DebitNoteReturnReason;

/**
 * Debit Note Line Item
 * Represents a single item being returned in a debit note
 */
export interface DebitNoteItem {
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
  /** Link to original purchase invoice item row */
  pi_detail: string;
  /** Original received quantity */
  received_qty: number;
  /** Already returned quantity */
  returned_qty: number;
  /** Reason for return (custom field in ERPNext) */
  custom_return_reason: DebitNoteReturnReason;
  /** Additional notes (required for "Other" reason, custom field in ERPNext) */
  custom_return_item_notes?: string;
}

/**
 * Debit Note Document
 * Represents a Purchase Invoice with is_return=1
 */
export interface DebitNote {
  /** Debit Note document number */
  name: string;
  /** Document type (always 'Purchase Invoice') */
  doctype: 'Purchase Invoice';
  /** Return flag (always 1 for Debit Notes) */
  is_return: 1;
  /** Reference to original Purchase Invoice */
  return_against: string;
  /** Supplier ID */
  supplier: string;
  /** Supplier display name */
  supplier_name: string;
  /** Posting date (YYYY-MM-DD) */
  posting_date: string;
  /** Company name */
  company: string;
  /** Document status label */
  status: 'Draft' | 'Submitted' | 'Cancelled';
  /** Document status code (0=Draft, 1=Submitted, 2=Cancelled) */
  docstatus: 0 | 1 | 2;
  /** Total value of debit note (negative) */
  grand_total: number;
  /** Additional notes (custom field in ERPNext) */
  custom_return_notes?: string;
  /** Line items */
  items: DebitNoteItem[];
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
export interface DebitNoteFormItem {
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
  /** Link to original purchase invoice item row */
  purchase_invoice_item: string;
  /** Original received quantity */
  received_qty: number;
  /** Already returned quantity */
  returned_qty: number;
  /** Calculated: received - returned */
  remaining_qty: number;
  /** Reason for return */
  return_reason: DebitNoteReturnReason | '';
  /** Additional notes (required for "Other" reason) */
  return_notes?: string;
  /** Whether item is selected for return */
  selected: boolean;
}

/**
 * Form Data for Creating/Editing Debit Notes
 * Used in the form component for managing form state
 */
export interface DebitNoteFormData {
  /** Supplier ID */
  supplier: string;
  /** Supplier display name */
  supplier_name: string;
  /** Posting date (DD/MM/YYYY format for display) */
  posting_date: string;
  /** Reference to original Purchase Invoice */
  purchase_invoice: string;
  /** Additional notes */
  custom_notes?: string;
  /** Line items with validation state */
  items: DebitNoteFormItem[];
}

/**
 * Purchase Invoice Item
 * Represents a line item in a purchase invoice
 */
export interface PurchaseInvoiceItem {
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
  /** Already returned quantity */
  returned_qty: number;
}

/**
 * Purchase Invoice (for selection dialog)
 * Represents a paid purchase invoice that can be selected for creating a debit note
 */
export interface PurchaseInvoice {
  /** Purchase Invoice number */
  name: string;
  /** Supplier ID */
  supplier: string;
  /** Supplier display name */
  supplier_name: string;
  /** Posting date */
  posting_date: string;
  /** Document status */
  status: string;
  /** Total value */
  grand_total: number;
  /** Line items */
  items: PurchaseInvoiceItem[];
}

/**
 * Request body for creating Debit Note
 */
export interface CreateDebitNoteRequest {
  /** Company name */
  company: string;
  /** Supplier ID */
  supplier: string;
  /** Posting date (YYYY-MM-DD) */
  posting_date: string;
  /** Reference to original Purchase Invoice */
  return_against: string;
  /** Line items */
  items: Array<{
    item_code: string;
    item_name: string;
    qty: number; // Positive value, API converts to negative
    rate: number;
    amount: number;
    warehouse: string;
    purchase_invoice_item: string; // Reference to original item
    custom_return_reason: string;
    custom_return_item_notes?: string;
  }>;
  /** Additional notes (custom field in ERPNext) */
  custom_return_notes?: string;
}

/**
 * Response for creating Debit Note
 */
export interface CreateDebitNoteResponse {
  success: boolean;
  message?: string;
  data?: DebitNote;
  error?: string;
}

/**
 * Response for getting Debit Notes
 */
export interface GetDebitNotesResponse {
  success: boolean;
  data?: DebitNote[];
  total_records?: number;
  message?: string;
  error?: string;
}

/**
 * Query parameters for GET /api/purchase/debit-note
 */
export interface GetDebitNotesParams {
  /** Number of records per page */
  limit_page_length?: number;
  /** Starting record index */
  start?: number;
  /** Supplier name search */
  search?: string;
  /** Debit Note document number */
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
