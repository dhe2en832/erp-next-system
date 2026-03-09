/**
 * TypeScript interfaces for Purchase Return Management
 * 
 * Purchase Return adalah Purchase Receipt dengan is_return=1 untuk retur pembelian yang belum dibayar
 * 
 * Requirements: 1.1, 2.1, 8.1, 2.4, 2.5, 15.1-15.7, 18.1-18.7
 */

/**
 * Purchase Return Reason Enumeration
 * Predefined reasons for purchase returns
 */
export type PurchaseReturnReason = 
  | 'Damaged'
  | 'Quality Issue'
  | 'Wrong Item'
  | 'Supplier Request'
  | 'Expired'
  | 'Other';

/**
 * @deprecated Use PurchaseReturnReason instead
 */
export type ReturnReason = PurchaseReturnReason;

/**
 * Purchase Return Line Item
 * Represents a single item being returned
 */
export interface PurchaseReturnItem {
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
  /** Link to purchase receipt item row */
  purchase_receipt_item: string;
  /** Link to purchase receipt item row (alternative field name) */
  pr_detail?: string;
  /** Original received quantity */
  received_qty: number;
  /** Already returned quantity */
  returned_qty: number;
  /** Reason for return (custom field in ERPNext) */
  custom_return_reason: PurchaseReturnReason;
  /** Additional notes (required for "Other" reason, custom field in ERPNext) */
  custom_return_item_notes?: string;
}

/**
 * Purchase Return Document
 * Represents a Purchase Receipt with is_return=1
 */
export interface PurchaseReturn {
  /** Purchase Return document number */
  name: string;
  /** Document type (always 'Purchase Receipt') */
  doctype: 'Purchase Receipt';
  /** Return flag (always 1 for Purchase Returns) */
  is_return: 1;
  /** Reference to original Purchase Receipt */
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
  /** Total value of purchase return (negative) */
  grand_total: number;
  /** Additional notes (custom field in ERPNext) */
  custom_return_notes?: string;
  /** Line items */
  items: PurchaseReturnItem[];
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
export interface PurchaseReturnFormItem {
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
  /** Link to purchase receipt item row */
  purchase_receipt_item: string;
  /** Original received quantity */
  received_qty: number;
  /** Already returned quantity */
  returned_qty: number;
  /** Calculated: received - returned */
  remaining_qty: number;
  /** Reason for return */
  return_reason: PurchaseReturnReason | '';
  /** Additional notes (required for "Other" reason) */
  return_notes?: string;
  /** Whether item is selected for return */
  selected: boolean;
}

/**
 * Form Data for Creating/Editing Purchase Returns
 * Used in the form component for managing form state
 */
export interface PurchaseReturnFormData {
  /** Supplier ID */
  supplier: string;
  /** Supplier display name */
  supplier_name: string;
  /** Posting date (DD/MM/YYYY format for display) */
  posting_date: string;
  /** Reference to original Purchase Receipt */
  purchase_receipt: string;
  /** Additional notes */
  custom_notes?: string;
  /** Line items with validation state */
  items: PurchaseReturnFormItem[];
}

/**
 * Purchase Receipt Item
 * Represents a line item in a purchase receipt
 */
export interface PurchaseReceiptItem {
  /** Item row ID */
  name: string;
  /** Item code */
  item_code: string;
  /** Item description */
  item_name: string;
  /** Received quantity */
  qty: number;
  /** Unit price */
  rate: number;
  /** Line total */
  amount: number;
  /** Unit of measure */
  uom: string;
  /** Warehouse */
  warehouse: string;
  /** Stock unit of measure */
  stock_uom: string;
  /** Already returned quantity */
  returned_qty: number;
}

/**
 * Purchase Receipt (for selection dialog)
 * Represents a purchase receipt that can be selected for creating a return
 */
export interface PurchaseReceipt {
  /** Purchase Receipt number */
  name: string;
  /** Supplier ID */
  supplier: string;
  /** Supplier display name */
  supplier_name: string;
  /** Receipt date */
  posting_date: string;
  /** Document status */
  status: string;
  /** Total value */
  grand_total: number;
  /** Line items */
  items: PurchaseReceiptItem[];
}

/**
 * Request body for creating Purchase Return
 */
export interface CreatePurchaseReturnRequest {
  /** Company name */
  company: string;
  /** Supplier ID */
  supplier: string;
  /** Posting date (YYYY-MM-DD) */
  posting_date: string;
  /** Reference to original Purchase Receipt */
  return_against: string;
  /** Line items */
  items: Array<{
    item_code: string;
    item_name: string;
    qty: number; // Positive value, API converts to negative
    rate: number;
    amount: number;
    warehouse: string;
    purchase_receipt_item: string; // Reference to original item
    custom_return_reason: string;
    custom_return_item_notes?: string;
  }>;
  /** Additional notes (custom field in ERPNext) */
  custom_return_notes?: string;
}

/**
 * Response for creating Purchase Return
 */
export interface CreatePurchaseReturnResponse {
  success: boolean;
  message?: string;
  data?: PurchaseReturn;
  error?: string;
}

/**
 * Response for getting Purchase Returns
 */
export interface GetPurchaseReturnsResponse {
  success: boolean;
  data?: PurchaseReturn[];
  total_records?: number;
  message?: string;
  error?: string;
}

/**
 * Query parameters for GET /api/purchase/purchase-return
 */
export interface GetPurchaseReturnsParams {
  /** Number of records per page */
  limit_page_length?: number;
  /** Starting record index */
  start?: number;
  /** Supplier name search */
  search?: string;
  /** Purchase Return document number */
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
