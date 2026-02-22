import { z } from 'zod';
import { sanitizeString, sanitizeDate } from './input-sanitization';

// Base schemas
export const periodTypeSchema = z.enum(['Monthly', 'Quarterly', 'Yearly']);
export const periodStatusSchema = z.enum(['Open', 'Closed', 'Permanently Closed']);
export const actionTypeSchema = z.enum(['Created', 'Closed', 'Reopened', 'Permanently Closed', 'Transaction Modified']);
export const rootTypeSchema = z.enum(['Asset', 'Liability', 'Equity', 'Income', 'Expense']);
export const severitySchema = z.enum(['error', 'warning', 'info']);

// Sanitized string schema
const sanitizedStringSchema = z.string().transform((val) => sanitizeString(val));

// Date validation helper with sanitization
const dateStringSchema = z.string()
  .transform((val) => sanitizeString(val))
  .pipe(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'));

// AccountingPeriod schema
export const accountingPeriodSchema = z.object({
  name: sanitizedStringSchema,
  period_name: sanitizedStringSchema,
  company: sanitizedStringSchema,
  start_date: dateStringSchema,
  end_date: dateStringSchema,
  period_type: periodTypeSchema,
  status: periodStatusSchema,
  closed_by: sanitizedStringSchema.optional(),
  closed_on: sanitizedStringSchema.optional(),
  closing_journal_entry: sanitizedStringSchema.optional(),
  permanently_closed_by: sanitizedStringSchema.optional(),
  permanently_closed_on: sanitizedStringSchema.optional(),
  fiscal_year: sanitizedStringSchema.optional(),
  remarks: sanitizedStringSchema.optional(),
  creation: sanitizedStringSchema,
  modified: sanitizedStringSchema,
  modified_by: sanitizedStringSchema,
  owner: sanitizedStringSchema,
});

// PeriodClosingLog schema
export const periodClosingLogSchema = z.object({
  name: sanitizedStringSchema,
  accounting_period: sanitizedStringSchema,
  action_type: actionTypeSchema,
  action_by: sanitizedStringSchema,
  action_date: sanitizedStringSchema,
  reason: sanitizedStringSchema.optional(),
  before_snapshot: sanitizedStringSchema.optional(),
  after_snapshot: sanitizedStringSchema.optional(),
  affected_transaction: sanitizedStringSchema.optional(),
  transaction_doctype: sanitizedStringSchema.optional(),
  ip_address: sanitizedStringSchema.optional(),
  user_agent: sanitizedStringSchema.optional(),
});

// PeriodClosingConfig schema
export const periodClosingConfigSchema = z.object({
  name: sanitizedStringSchema,
  retained_earnings_account: sanitizedStringSchema,
  enable_bank_reconciliation_check: z.boolean(),
  enable_draft_transaction_check: z.boolean(),
  enable_unposted_transaction_check: z.boolean(),
  enable_sales_invoice_check: z.boolean(),
  enable_purchase_invoice_check: z.boolean(),
  enable_inventory_check: z.boolean(),
  enable_payroll_check: z.boolean(),
  closing_role: sanitizedStringSchema,
  reopen_role: sanitizedStringSchema,
  reminder_days_before_end: z.number().int().min(0),
  escalation_days_after_end: z.number().int().min(0),
  enable_email_notifications: z.boolean(),
});

// AccountBalance schema
export const accountBalanceSchema = z.object({
  account: sanitizedStringSchema,
  account_name: sanitizedStringSchema,
  account_type: sanitizedStringSchema,
  root_type: rootTypeSchema,
  is_group: z.boolean(),
  debit: z.number(),
  credit: z.number(),
  balance: z.number(),
  is_nominal: z.boolean(),
});

// ValidationResult schema
export const validationResultSchema = z.object({
  check_name: sanitizedStringSchema,
  passed: z.boolean(),
  message: sanitizedStringSchema,
  severity: severitySchema,
  details: z.array(z.record(z.string(), z.any())).optional(),
});

// API Request schemas
export const getPeriodsRequestSchema = z.object({
  company: sanitizedStringSchema.optional(),
  status: periodStatusSchema.optional(),
  fiscal_year: sanitizedStringSchema.optional(),
  limit: z.number().int().positive().optional(),
  start: z.number().int().min(0).optional(),
});

export const createPeriodRequestSchema = z.object({
  period_name: z.string().min(1, 'Period name is required').transform((val) => sanitizeString(val)),
  company: z.string().min(1, 'Company is required').transform((val) => sanitizeString(val)),
  start_date: dateStringSchema,
  end_date: dateStringSchema,
  period_type: periodTypeSchema,
  fiscal_year: sanitizedStringSchema.optional(),
  remarks: sanitizedStringSchema.optional(),
}).refine(
  (data) => {
    const start = new Date(data.start_date);
    const end = new Date(data.end_date);
    return start < end;
  },
  {
    message: 'Start date must be before end date',
    path: ['start_date'],
  }
);

export const validatePeriodRequestSchema = z.object({
  period_name: z.string().min(1, 'Period name is required').transform((val) => sanitizeString(val)),
  company: z.string().min(1, 'Company is required').transform((val) => sanitizeString(val)),
});

export const closePeriodRequestSchema = z.object({
  period_name: z.string().min(1, 'Period name is required').transform((val) => sanitizeString(val)),
  company: z.string().min(1, 'Company is required').transform((val) => sanitizeString(val)),
  force: z.boolean().optional(),
});

export const reopenPeriodRequestSchema = z.object({
  period_name: z.string().min(1, 'Period name is required').transform((val) => sanitizeString(val)),
  company: z.string().min(1, 'Company is required').transform((val) => sanitizeString(val)),
  reason: z.string().min(1, 'Reason is required for reopening a period').transform((val) => sanitizeString(val)),
});

export const permanentClosePeriodRequestSchema = z.object({
  period_name: z.string().min(1, 'Period name is required').transform((val) => sanitizeString(val)),
  company: z.string().min(1, 'Company is required').transform((val) => sanitizeString(val)),
  confirmation: z.literal('PERMANENT'),
}).refine(
  (data) => data.confirmation === 'PERMANENT',
  {
    message: 'Confirmation must be "PERMANENT"',
    path: ['confirmation'],
  }
);

export const closingSummaryRequestSchema = z.object({
  period_name: z.string().min(1, 'Period name is required').transform((val) => sanitizeString(val)),
  company: z.string().min(1, 'Company is required').transform((val) => sanitizeString(val)),
  format: z.enum(['json', 'pdf', 'excel']).optional(),
});

export const auditLogRequestSchema = z.object({
  period_name: sanitizedStringSchema.optional(),
  action_type: sanitizedStringSchema.optional(),
  action_by: sanitizedStringSchema.optional(),
  from_date: dateStringSchema.optional(),
  to_date: dateStringSchema.optional(),
  limit: z.number().int().positive().optional(),
  start: z.number().int().min(0).optional(),
});

export const updateConfigRequestSchema = z.object({
  retained_earnings_account: sanitizedStringSchema.optional(),
  enable_bank_reconciliation_check: z.boolean().optional(),
  enable_draft_transaction_check: z.boolean().optional(),
  enable_unposted_transaction_check: z.boolean().optional(),
  enable_sales_invoice_check: z.boolean().optional(),
  enable_purchase_invoice_check: z.boolean().optional(),
  enable_inventory_check: z.boolean().optional(),
  enable_payroll_check: z.boolean().optional(),
  closing_role: sanitizedStringSchema.optional(),
  reopen_role: sanitizedStringSchema.optional(),
  reminder_days_before_end: z.number().int().min(0).optional(),
  escalation_days_after_end: z.number().int().min(0).optional(),
  enable_email_notifications: z.boolean().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  {
    message: 'At least one field must be provided for update',
  }
);
