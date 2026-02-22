/**
 * TypeScript interfaces for Sales Return Management
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 3.1, 3.2, 3.3, 8.1, 8.2
 */

/**
 * Return Reason Enumeration
 * Predefined reasons for product returns
 */
export type ReturnReason = 
  | 'Damaged'
  | 'Wrong Item'
  | 'Quality Issue'
  | 'Customer Request'
  | 'Expired'
  | 'Other';

/**
 * Sales Return Line Item
 * Represents a single item being returned
 */
export interface SalesReturnItem {
  /** Item row ID */
  name: string;
  /** Item code */
  item_code: string;
  /** Item description */
  item_name: string;
  /** Return quantity */
  qty: number;
  /** Unit price */
  rate: number;
  /** Line total (qty * rate) */
  amount: number;
  /** Unit of measure */
  uom: string;
  /** Warehouse for stock return */
  warehouse: string;
  /** Link to delivery note item row */
  delivery_note_item: string;
  /** Original delivered quantity */
  delivered_qty: number;
  /** Reason for return */
  return_reason: ReturnReason;
  /** Additional notes (required for "Other" reason) */
  return_notes?: string;
}

/**
 * Sales Return Document
 * Represents a customer return based on a delivery note
 */
export interface SalesReturn {
  /** Return document number (RET-YYYY-NNNNN) */
  name: string;
  /** Customer ID */
  customer: string;
  /** Customer display name */
  customer_name: string;
  /** Return date (YYYY-MM-DD) */
  posting_date: string;
  /** Reference to source delivery note */
  delivery_note: string;
  /** Document status */
  status: 'Draft' | 'Submitted' | 'Cancelled';
  /** Company name */
  company: string;
  /** Total value of returned items */
  grand_total: number;
  /** Line items */
  items: SalesReturnItem[];
  /** Additional notes */
  custom_notes?: string;
  /** Creation timestamp */
  creation: string;
  /** Last modified timestamp */
  modified: string;
  /** Document owner */
  owner: string;
}

/**
 * Form Item with Validation State
 * Used in the form component for managing item state
 */
export interface SalesReturnFormItem {
  /** Item code */
  item_code: string;
  /** Item description */
  item_name: string;
  /** Return quantity */
  qty: number;
  /** Unit price */
  rate: number;
  /** Line total (qty * rate) */
  amount: number;
  /** Unit of measure */
  uom: string;
  /** Warehouse for stock return */
  warehouse: string;
  /** Link to delivery note item row */
  delivery_note_item: string;
  /** Original delivered quantity (for validation) */
  delivered_qty: number;
  /** Calculated: delivered - already returned */
  remaining_qty: number;
  /** Reason for return */
  return_reason: ReturnReason | '';
  /** Additional notes (required for "Other" reason) */
  return_notes?: string;
  /** Whether item is selected for return */
  selected: boolean;
}

/**
 * Form Data for Creating/Editing Returns
 * Used in the form component for managing form state
 */
export interface SalesReturnFormData {
  /** Customer ID */
  customer: string;
  /** Customer display name */
  customer_name: string;
  /** Return date (DD/MM/YYYY format for display) */
  posting_date: string;
  /** Reference to source delivery note */
  delivery_note: string;
  /** Additional notes */
  custom_notes?: string;
  /** Line items with validation state */
  items: SalesReturnFormItem[];
}

/**
 * Delivery Note Item
 * Represents a line item in a delivery note
 */
export interface DeliveryNoteItem {
  /** Item row ID */
  name: string;
  /** Item code */
  item_code: string;
  /** Item description */
  item_name: string;
  /** Delivered quantity */
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
}

/**
 * Delivery Note (for selection dialog)
 * Represents a delivery note that can be selected for creating a return
 */
export interface DeliveryNote {
  /** Delivery note number */
  name: string;
  /** Customer ID */
  customer: string;
  /** Customer display name */
  customer_name: string;
  /** Delivery date */
  posting_date: string;
  /** Document status */
  status: string;
  /** Total value */
  grand_total: number;
  /** Line items */
  items: DeliveryNoteItem[];
}

/**
 * Request body for creating Sales Return
 */
export interface CreateSalesReturnRequest {
  /** Company name */
  company: string;
  /** Customer ID */
  customer: string;
  /** Return date (YYYY-MM-DD) */
  posting_date: string;
  /** Reference to source delivery note */
  delivery_note: string;
  /** Naming series */
  naming_series: string;
  /** Line items */
  items: Array<{
    item_code: string;
    item_name: string;
    qty: number;
    rate: number;
    amount: number;
    warehouse: string;
    delivery_note_item: string;
    return_reason: string;
    return_notes?: string;
  }>;
  /** Additional notes */
  custom_notes?: string;
}

/**
 * Response for creating Sales Return
 */
export interface CreateSalesReturnResponse {
  success: boolean;
  message?: string;
  data?: {
    name: string;
    status: string;
    [key: string]: any;
  };
  error?: string;
}

/**
 * Response for getting Sales Returns
 */
export interface GetSalesReturnsResponse {
  success: boolean;
  data?: SalesReturn[];
  total_records?: number;
  message?: string;
  error?: string;
}

/**
 * Query parameters for GET /api/sales-return
 */
export interface GetSalesReturnsParams {
  /** Number of records per page */
  limit_page_length?: number;
  /** Starting record index */
  start?: number;
  /** Customer name search */
  search?: string;
  /** Return document number */
  documentNumber?: string;
  /** Document status filter */
  status?: 'Draft' | 'Submitted' | 'Cancelled';
  /** Start date filter (YYYY-MM-DD) */
  from_date?: string;
  /** End date filter (YYYY-MM-DD) */
  to_date?: string;
  /** Additional ERPNext filters (JSON string) */
  filters?: string;
}
