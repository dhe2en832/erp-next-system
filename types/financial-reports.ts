/**
 * Shared type definitions for financial reports
 * Used across Balance Sheet, P&L, AR/AP, VAT, Cash Flow, and HPP Ledger reports
 */

/**
 * Account Master - represents an account from ERPNext Chart of Accounts
 */
export interface AccountMaster {
  name: string;
  account_name: string;
  account_type: string;
  root_type: 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense';
  parent_account: string | null;
  is_group: 0 | 1;
  account_number: string | null;
}

/**
 * GL Entry - represents a General Ledger entry from ERPNext
 */
export interface GlEntry {
  account: string;
  debit: number;
  credit: number;
  posting_date: string;
  voucher_type: string;
  voucher_no: string;
  against: string | null;
  remarks: string | null;
}

/**
 * Report Line - represents a line item in financial reports (Balance Sheet, P&L)
 */
export interface ReportLine {
  account: string;
  account_name: string;
  account_number: string | null;
  account_type: string;
  amount: number;
  formatted_amount: string;
}

/**
 * VAT Invoice Detail - represents a line item in VAT report
 */
export interface VatInvoiceDetail {
  tanggal: string;
  nomor_invoice: string;
  customer_supplier: string;
  dpp: number;
  ppn: number;
  tax_rate: number;
  formatted_dpp: string;
  formatted_ppn: string;
}

/**
 * Date Validation Result - returned by validateDateRange utility
 */
export interface DateValidationResult {
  valid: boolean;
  error?: string;
}
