// TypeScript interfaces for Accounting Period Closing feature

export interface AccountingPeriod {
  name: string;
  period_name: string;
  company: string;
  start_date: string;
  end_date: string;
  period_type: 'Monthly' | 'Quarterly' | 'Yearly';
  status: 'Open' | 'Closed' | 'Permanently Closed';
  closed_by?: string;
  closed_on?: string;
  closing_journal_entry?: string;
  permanently_closed_by?: string;
  permanently_closed_on?: string;
  fiscal_year?: string;
  remarks?: string;
  creation: string;
  modified: string;
  modified_by: string;
  owner: string;
}

export interface PeriodClosingLog {
  name: string;
  accounting_period: string;
  action_type: 'Created' | 'Closed' | 'Reopened' | 'Permanently Closed' | 'Transaction Modified';
  action_by: string;
  action_date: string;
  reason?: string;
  before_snapshot?: string;
  after_snapshot?: string;
  affected_transaction?: string;
  transaction_doctype?: string;
  ip_address?: string;
  user_agent?: string;
}

export interface PeriodClosingConfig {
  name: string;
  retained_earnings_account: string;
  enable_bank_reconciliation_check: boolean;
  enable_draft_transaction_check: boolean;
  enable_unposted_transaction_check: boolean;
  enable_sales_invoice_check: boolean;
  enable_purchase_invoice_check: boolean;
  enable_inventory_check: boolean;
  enable_payroll_check: boolean;
  closing_role: string;
  reopen_role: string;
  reminder_days_before_end: number;
  escalation_days_after_end: number;
  enable_email_notifications: boolean;
}

export interface AccountBalance {
  account: string;
  account_name: string;
  account_type: string;
  root_type: 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense';
  is_group: boolean;
  debit: number;
  credit: number;
  balance: number;
  is_nominal: boolean; // Income or Expense
}

export interface ClosingJournalEntry {
  doctype: 'Journal Entry';
  voucher_type: 'Closing Entry';
  posting_date: string;
  company: string;
  accounts: ClosingJournalAccount[];
  user_remark: string;
  is_closing_entry: boolean;
  accounting_period: string;
}

export interface ClosingJournalAccount {
  account: string;
  debit_in_account_currency: number;
  credit_in_account_currency: number;
  user_remark?: string;
}

export interface ValidationResult {
  check_name: string;
  passed: boolean;
  message: string;
  severity: 'error' | 'warning' | 'info';
  details?: {
    doctype?: string;
    name?: string;
    status?: string;
    [key: string]: any;
  }[];
}

// API Request/Response Types

export interface GetPeriodsRequest {
  company?: string;
  status?: 'Open' | 'Closed' | 'Permanently Closed';
  fiscal_year?: string;
  limit?: number;
  start?: number;
}

export interface GetPeriodsResponse {
  success: boolean;
  data: AccountingPeriod[];
  total_count: number;
}

export interface CreatePeriodRequest {
  period_name: string;
  company: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  period_type: 'Monthly' | 'Quarterly' | 'Yearly';
  fiscal_year?: string;
  remarks?: string;
}

export interface CreatePeriodResponse {
  success: boolean;
  data: AccountingPeriod;
  message?: string;
}

export interface GetPeriodDetailResponse {
  success: boolean;
  data: AccountingPeriod & {
    closing_journal?: any;
    account_balances?: AccountBalance[];
    validation_results?: ValidationResult[];
  };
}

export interface ValidatePeriodRequest {
  period_name: string;
  company: string;
}

export interface ValidatePeriodResponse {
  success: boolean;
  all_passed: boolean;
  validations: ValidationResult[];
}

export interface ClosePeriodRequest {
  period_name: string;
  company: string;
  force?: boolean; // Skip validations (admin only)
}

export interface ClosePeriodResponse {
  success: boolean;
  data: {
    period: AccountingPeriod;
    closing_journal: any;
    account_balances: AccountBalance[];
  };
  message: string;
}

export interface ReopenPeriodRequest {
  period_name: string;
  company: string;
  reason: string; // Required
}

export interface ReopenPeriodResponse {
  success: boolean;
  data: AccountingPeriod;
  message: string;
}

export interface PermanentClosePeriodRequest {
  period_name: string;
  company: string;
  confirmation: string; // Must be "PERMANENT"
}

export interface PermanentClosePeriodResponse {
  success: boolean;
  data: AccountingPeriod;
  message: string;
}

export interface ClosingSummaryRequest {
  period_name: string;
  company: string;
  format?: 'json' | 'pdf' | 'excel';
}

export interface ClosingSummaryResponse {
  success: boolean;
  data: {
    period: AccountingPeriod;
    closing_journal: any;
    account_balances: AccountBalance[];
    nominal_accounts: AccountBalance[];
    real_accounts: AccountBalance[];
    net_income: number;
  };
  pdf_url?: string;
  excel_url?: string;
}

export interface AuditLogRequest {
  period_name?: string;
  action_type?: string;
  action_by?: string;
  from_date?: string;
  to_date?: string;
  limit?: number;
  start?: number;
}

export interface AuditLogResponse {
  success: boolean;
  data: PeriodClosingLog[];
  total_count: number;
}

export interface GetConfigResponse {
  success: boolean;
  data: PeriodClosingConfig;
}

export interface UpdateConfigRequest {
  retained_earnings_account?: string;
  enable_bank_reconciliation_check?: boolean;
  enable_draft_transaction_check?: boolean;
  enable_unposted_transaction_check?: boolean;
  enable_sales_invoice_check?: boolean;
  enable_purchase_invoice_check?: boolean;
  enable_inventory_check?: boolean;
  enable_payroll_check?: boolean;
  closing_role?: string;
  reopen_role?: string;
  reminder_days_before_end?: number;
  escalation_days_after_end?: number;
  enable_email_notifications?: boolean;
}

export interface UpdateConfigResponse {
  success: boolean;
  data: PeriodClosingConfig;
  message: string;
}
