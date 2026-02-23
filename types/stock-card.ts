/**
 * TypeScript interfaces for Stock Card Report (Laporan Kartu Stok)
 * 
 * Requirements: 1.1, 1.2, 2.1-2.6, 3.1-3.6
 */

/**
 * Transaction types supported by the Stock Card Report
 * Represents all possible stock movement transaction types in ERPNext
 */
export type TransactionType =
  | 'Sales Invoice'
  | 'Purchase Receipt'
  | 'Delivery Note'
  | 'Stock Entry'
  | 'Stock Reconciliation';

/**
 * Party type for transactions
 * Indicates whether the party involved is a customer or supplier
 */
export type PartyType = 'Customer' | 'Supplier';

/**
 * Stock Ledger Entry interface
 * Represents a single stock movement transaction from ERPNext Stock Ledger Entry doctype
 * Includes both native ERPNext fields and enriched fields for display
 */
export interface StockLedgerEntry {
  /** ERPNext document ID */
  name: string;
  
  /** Transaction date in YYYY-MM-DD format */
  posting_date: string;
  
  /** Transaction time in HH:MM:SS format */
  posting_time: string;
  
  /** Item code/identifier */
  item_code: string;
  
  /** Item name (enriched from Item doctype) */
  item_name?: string;
  
  /** Warehouse name where transaction occurred */
  warehouse: string;
  
  /** Quantity change: positive for incoming, negative for outgoing */
  actual_qty: number;
  
  /** Running balance after this transaction */
  qty_after_transaction: number;
  
  /** Type of transaction (Sales Invoice, Purchase Receipt, etc.) */
  voucher_type: TransactionType;
  
  /** Source document reference number */
  voucher_no: string;
  
  /** Unit of measurement */
  stock_uom: string;
  
  /** Item value per unit */
  valuation_rate: number;
  
  /** Total value change for this transaction */
  stock_value_difference: number;
  
  /** Company name */
  company: string;
  
  // Enriched fields for display
  
  /** Type of party involved (Customer or Supplier) */
  party_type?: PartyType;
  
  /** Name of the customer or supplier (enriched from Customer/Supplier doctype) */
  party_name?: string;
  
  /** Source warehouse for stock transfers */
  source_warehouse?: string;
  
  /** Target/destination warehouse for stock transfers */
  target_warehouse?: string;
}

/**
 * Filter state for Stock Card Report
 * Manages all user-selected filter criteria
 */
export interface StockCardFilters {
  /** Date range filter */
  dateRange: {
    /** Start date in DD/MM/YYYY format */
    from_date: string;
    
    /** End date in DD/MM/YYYY format */
    to_date: string;
  };
  
  /** Selected item code (required for report display) */
  item_code: string;
  
  /** Selected warehouse filter (optional) */
  warehouse: string;
  
  /** Selected customer filter (optional) */
  customer: string;
  
  /** Selected supplier filter (optional) */
  supplier: string;
  
  /** Selected transaction type filter (optional, empty string means all types) */
  transaction_type: TransactionType | '';
}

/**
 * API Response for Stock Card Report
 * Standard response format from the stock card API endpoint
 */
export interface StockCardAPIResponse {
  /** Indicates if the request was successful */
  success: boolean;
  
  /** Array of stock ledger entries matching the filters */
  data: StockLedgerEntry[];
  
  /** Summary statistics for the filtered data */
  summary: SummaryData;
  
  /** Pagination information */
  pagination: PaginationState;
  
  /** Optional error or info message */
  message?: string;
}

/**
 * Summary statistics for Stock Card Report
 * Provides aggregate information about stock movements
 */
export interface SummaryData {
  /** Stock balance at the start of the selected period */
  opening_balance: number;
  
  /** Stock balance at the end of the selected period */
  closing_balance: number;
  
  /** Total quantity received (sum of all positive transactions) */
  total_in: number;
  
  /** Total quantity issued (sum of all negative transactions, as absolute value) */
  total_out: number;
  
  /** Total number of transactions in the period */
  transaction_count: number;
  
  /** Item code for the report */
  item_code: string;
  
  /** Item name for display */
  item_name: string;
  
  /** Unit of measurement */
  uom: string;
}

/**
 * Pagination state for Stock Card Report
 * Manages pagination of large transaction datasets
 */
export interface PaginationState {
  /** Current page number (1-indexed) */
  current_page: number;
  
  /** Number of records per page */
  page_size: number;
  
  /** Total number of records matching the filters */
  total_records: number;
  
  /** Total number of pages */
  total_pages: number;
}

/**
 * Dropdown option interface
 * Generic interface for select/dropdown components
 */
export interface DropdownOption {
  /** Option value (used in API requests) */
  value: string;
  
  /** Option label (displayed to user) */
  label: string;
}

/**
 * Query parameters for Stock Card API endpoint
 * Used when making GET requests to /api/inventory/reports/stock-card
 */
export interface StockCardAPIParams {
  /** Company name (required) */
  company: string;
  
  /** Item code (required) */
  item_code: string;
  
  /** Warehouse filter (optional) */
  warehouse?: string;
  
  /** Start date in YYYY-MM-DD format (optional) */
  from_date?: string;
  
  /** End date in YYYY-MM-DD format (optional) */
  to_date?: string;
  
  /** Customer filter (optional) */
  customer?: string;
  
  /** Supplier filter (optional) */
  supplier?: string;
  
  /** Transaction type filter (optional) */
  transaction_type?: string;
  
  /** Page number for pagination (optional, default: 1) */
  page?: number;
  
  /** Number of records per page (optional, default: 20) */
  limit?: number;
}

/**
 * Component props for StockCardFilters component
 */
export interface StockCardFiltersProps {
  /** Current filter state */
  filters: StockCardFilters;
  
  /** Callback when filters change */
  onFilterChange: (filters: StockCardFilters) => void;
  
  /** Callback to clear all filters */
  onClear: () => void;
  
  /** Callback to refresh data */
  onRefresh: () => void;
  
  /** Available items for dropdown */
  items: DropdownOption[];
  
  /** Available warehouses for dropdown */
  warehouses: DropdownOption[];
  
  /** Available customers for dropdown */
  customers: DropdownOption[];
  
  /** Available suppliers for dropdown */
  suppliers: DropdownOption[];
  
  /** Loading state indicator */
  loading: boolean;
}

/**
 * Component props for StockCardTable component
 */
export interface StockCardTableProps {
  /** Stock ledger entries to display */
  data: StockLedgerEntry[];
  
  /** Loading state indicator */
  loading: boolean;
  
  /** Pagination state */
  pagination: PaginationState;
  
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  
  /** Callback when page size changes */
  onPageSizeChange: (pageSize: number) => void;
}

/**
 * Component props for StockCardSummary component
 */
export interface StockCardSummaryProps {
  /** Opening balance at start of period */
  openingBalance: number;
  
  /** Closing balance at end of period */
  closingBalance: number;
  
  /** Total quantity received */
  totalIn: number;
  
  /** Total quantity issued */
  totalOut: number;
  
  /** Total number of transactions */
  transactionCount: number;
  
  /** Item name for display */
  itemName: string;
  
  /** Unit of measurement */
  uom: string;
}

/**
 * Component props for StockCardExport component
 */
export interface StockCardExportProps {
  /** Stock ledger entries to export */
  data: StockLedgerEntry[];
  
  /** Current filter state */
  filters: StockCardFilters;
  
  /** Summary statistics */
  summary: SummaryData;
  
  /** Callback for Excel export */
  onExportExcel: () => void;
  
  /** Callback for PDF export */
  onExportPDF: () => void;
  
  /** Callback for print */
  onPrint: () => void;
  
  /** Loading state indicator */
  loading: boolean;
}

/**
 * Main Stock Card Report state interface
 * Manages the complete state of the report page
 */
export interface StockCardState {
  /** Stock ledger entries data */
  data: StockLedgerEntry[];
  
  /** Loading state indicator */
  loading: boolean;
  
  /** Error message (null if no error) */
  error: string | null;
  
  /** Current filter state */
  filters: StockCardFilters;
  
  /** Pagination state */
  pagination: PaginationState;
  
  /** Selected company */
  selectedCompany: string;
  
  /** Summary statistics */
  summary?: SummaryData;
}
