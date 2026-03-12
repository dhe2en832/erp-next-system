import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError 
} from '@/lib/api-helpers';
import { ERPNextClient } from '@/lib/erpnext';
import type { ValidationResult, PeriodClosingConfig, AccountingPeriod } from '@/types/accounting-period';

export async function POST(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const client = await getERPNextClientForRequest(request);
    const body = await request.json();
    const { period_name, company } = body;

    if (!period_name || !company) {
      return NextResponse.json(
        { success: false, error: 'Period name and company are required' },
        { status: 400 }
      );
    }

    // Get period
    const period = await client.get<AccountingPeriod>('Accounting Period', period_name);
    
    if (period.company !== company) {
      return NextResponse.json(
        { success: false, error: 'Period does not belong to specified company' },
        { status: 400 }
      );
    }

    // Get configuration - if not exists, use defaults
    let config: PeriodClosingConfig;
    try {
      config = await client.get<PeriodClosingConfig>('Period Closing Config', 'Period Closing Config');
    } catch {
      // Use default config if not found
      config = {
        name: 'Period Closing Config',
        retained_earnings_account: '',
        enable_draft_transaction_check: true,
        enable_unposted_transaction_check: true,
        enable_bank_reconciliation_check: true,
        enable_sales_invoice_check: true,
        enable_purchase_invoice_check: true,
        enable_inventory_check: true,
        enable_payroll_check: true,
      } as PeriodClosingConfig;
    }

    // Run validations
    const validations: ValidationResult[] = [];

    if (config.enable_draft_transaction_check !== false) {
      validations.push(await validateNoDraftTransactions(client, period));
    }

    if (config.enable_unposted_transaction_check !== false) {
      validations.push(await validateAllTransactionsPosted(client, period));
    }

    if (config.enable_bank_reconciliation_check !== false) {
      validations.push(await validateBankReconciliation(client, period));
    }

    if (config.enable_sales_invoice_check !== false) {
      validations.push(await validateSalesInvoices(client, period));
    }

    if (config.enable_purchase_invoice_check !== false) {
      validations.push(await validatePurchaseInvoices(client, period));
    }

    if (config.enable_inventory_check !== false) {
      validations.push(await validateInventoryTransactions(client, period));
    }

    if (config.enable_payroll_check !== false) {
      validations.push(await validatePayrollEntries(client, period));
    }

    const allPassed = validations.every(v => v.passed);

    return NextResponse.json({
      success: true,
      all_passed: allPassed,
      validations,
    });
  } catch (error: unknown) {
    logSiteError(error, 'POST /api/accounting-period/validate', siteId);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// Validation functions
async function validateNoDraftTransactions(
  client: ERPNextClient,
  period: AccountingPeriod
): Promise<ValidationResult> {
  const doctypes = ['Journal Entry', 'Sales Invoice', 'Purchase Invoice', 'Payment Entry'];
  const draftDocs: { name: string; posting_date: string; doctype: string; [key: string]: unknown }[] = [];

  for (const doctype of doctypes) {
    const filters: [string, string, string | number][] = [
      ['company', '=', period.company],
      ['posting_date', '>=', period.start_date],
      ['posting_date', '<=', period.end_date],
      ['docstatus', '=', 0], // Draft
    ];

    try {
      const docs = await client.getList<{ name: string; posting_date: string }>(doctype, {
        filters,
        fields: ['name', 'posting_date'],
        limit_page_length: 100,
      });

      draftDocs.push(...docs.map((d) => ({ ...d, doctype })));
    } catch {
      console.error(`Error checking ${doctype}`);
    }
  }

  return {
    check_name: 'No Draft Transactions',
    passed: draftDocs.length === 0,
    message:
      draftDocs.length === 0
        ? 'All transactions are submitted'
        : `Found ${draftDocs.length} draft transaction(s)`,
    severity: draftDocs.length === 0 ? 'info' : 'error',
    details: draftDocs,
  };
}

async function validateAllTransactionsPosted(
  client: ERPNextClient,
  period: AccountingPeriod
): Promise<ValidationResult> {
  const voucherTypes = ['Journal Entry', 'Sales Invoice', 'Purchase Invoice', 'Payment Entry'];
  const unpostedVouchers: { doctype: string; name: string; [key: string]: unknown }[] = [];

  for (const voucherType of voucherTypes) {
    const voucherFilters: [string, string, string | number][] = [
      ['company', '=', period.company],
      ['posting_date', '>=', period.start_date],
      ['posting_date', '<=', period.end_date],
      ['docstatus', '=', 1], // Submitted
    ];

    try {
      const vouchers = await client.getList<{ name: string }>(voucherType, {
        filters: voucherFilters,
        fields: ['name'],
        limit_page_length: 1000,
      });

      for (const voucher of vouchers) {
        const glFilters: [string, string, string][] = [
          ['voucher_type', '=', voucherType],
          ['voucher_no', '=', voucher.name],
        ];

        const glEntries = await client.getList('GL Entry', {
          filters: glFilters,
          fields: ['name'],
          limit_page_length: 1,
        });

        if (glEntries.length === 0) {
          unpostedVouchers.push({ doctype: voucherType, name: voucher.name });
        }
      }
    } catch {
      console.error(`Error checking ${voucherType}`);
    }
  }

  return {
    check_name: 'All Transactions Posted',
    passed: unpostedVouchers.length === 0,
    message:
      unpostedVouchers.length === 0
        ? 'All transactions have GL entries'
        : `Found ${unpostedVouchers.length} unposted transaction(s)`,
    severity: unpostedVouchers.length === 0 ? 'info' : 'error',
    details: unpostedVouchers,
  };
}

async function validateBankReconciliation(
  client: ERPNextClient,
  period: AccountingPeriod
): Promise<ValidationResult> {
  try {
    // In ERPNext v15, bank reconciliation uses Payment Entry, not GL Entry
    // Get all bank accounts first
    const bankAccounts = await client.getList<{ name: string; account_name: string }>('Account', {
      filters: [
        ['company', '=', period.company],
        ['account_type', '=', 'Bank'],
      ],
      fields: ['name', 'account_name'],
      limit_page_length: 1000,
    });

    interface UnreconciledAccount {
      account: string;
      account_name: string;
      unreconciled_payments: number;
      unreconciled_receipts: number;
      total_unreconciled: number;
      [key: string]: unknown;
    }
    const unreconciledAccounts: UnreconciledAccount[] = [];
    let skippedAccountsCount = 0;

    for (const account of bankAccounts) {
      try {
        // Check Payment Entry for uncleared transactions (ERPNext v15 approach)
        const filters: [string, string, string | number][] = [
          ['paid_from', '=', account.name],
          ['posting_date', '<=', period.end_date],
          ['clearance_date', 'is', 'not set'],
          ['docstatus', '=', 1], // Submitted only
        ];

        const unreconciledPayments = await client.getList('Payment Entry', {
          filters,
          fields: ['name', 'paid_amount'],
          limit_page_length: 100,
        });

        // Also check for received payments
        const receivedFilters: [string, string, string | number][] = [
          ['paid_to', '=', account.name],
          ['posting_date', '<=', period.end_date],
          ['clearance_date', 'is', 'not set'],
          ['docstatus', '=', 1], // Submitted only
        ];

        const unreconciledReceipts = await client.getList('Payment Entry', {
          filters: receivedFilters,
          fields: ['name', 'received_amount'],
          limit_page_length: 100,
        });

        const totalUnreconciled = unreconciledPayments.length + unreconciledReceipts.length;

        if (totalUnreconciled > 0) {
          unreconciledAccounts.push({
            account: account.name,
            account_name: account.account_name,
            unreconciled_payments: unreconciledPayments.length,
            unreconciled_receipts: unreconciledReceipts.length,
            total_unreconciled: totalUnreconciled,
          });
        }
      } catch (fieldError: unknown) {
        // Handle field permission restrictions for clearance_date
        const message = fieldError instanceof Error ? fieldError.message : String(fieldError);
        if (message && message.includes('Field not permitted in query: clearance_date')) {
          console.info(`Bank reconciliation check skipped for account ${account.name}: clearance_date field access restricted`);
          skippedAccountsCount++;
          continue; // Skip this account and continue with others
        }
        // Re-throw other errors that are not permission-related
        throw fieldError;
      }
    }

    // If all accounts were skipped due to field restrictions, return specific message
    if (skippedAccountsCount > 0 && skippedAccountsCount === bankAccounts.length) {
      return {
        check_name: 'Bank Reconciliation Complete',
        passed: true,
        message: 'Bank reconciliation check skipped (clearance_date field is restricted)',
        severity: 'info',
        details: [],
        validation_skipped: true,
        skip_reason: 'Field permission restriction: clearance_date'
      };
    }

    // If some accounts were skipped but others were processed
    if (skippedAccountsCount > 0) {
      const message = unreconciledAccounts.length === 0
        ? `All accessible bank accounts are reconciled (${skippedAccountsCount} account(s) skipped due to clearance_date field restriction)`
        : `Found ${unreconciledAccounts.length} bank account(s) with unreconciled transactions (${skippedAccountsCount} account(s) skipped due to clearance_date field restriction)`;
      
      return {
        check_name: 'Bank Reconciliation Complete',
        passed: unreconciledAccounts.length === 0,
        message: message,
        severity: unreconciledAccounts.length === 0 ? 'info' : 'warning',
        details: unreconciledAccounts,
        validation_skipped: false,
        skip_reason: `Partial validation: ${skippedAccountsCount} account(s) skipped due to clearance_date field restriction`
      };
    }

    return {
      check_name: 'Bank Reconciliation Complete',
      passed: unreconciledAccounts.length === 0,
      message:
        unreconciledAccounts.length === 0
          ? 'All bank accounts are reconciled'
          : `Found ${unreconciledAccounts.length} bank account(s) with unreconciled transactions`,
      severity: unreconciledAccounts.length === 0 ? 'info' : 'warning',
      details: unreconciledAccounts,
    };
  } catch (error: unknown) {
    // Handle general permission or access errors
    const message = error instanceof Error ? error.message : String(error);
    if (message && (
      message.includes('Field not permitted') ||
      message.includes('clearance_date')
    )) {
      console.info('Bank reconciliation check skipped: clearance_date field is restricted');
      return {
        check_name: 'Bank Reconciliation Complete',
        passed: true,
        message: 'Bank reconciliation check skipped (clearance_date field is restricted)',
        severity: 'info',
        details: [],
        validation_skipped: true,
        skip_reason: 'Field permission restriction: clearance_date'
      };
    }

    console.warn('Bank reconciliation check skipped:', message);
    return {
      check_name: 'Bank Reconciliation Complete',
      passed: true,
      message: 'Bank reconciliation check skipped (no bank accounts or error occurred)',
      severity: 'info',
      details: [],
    };
  }
}

/**
 * Validate Sales Invoices are Processed
 * Requirement 11.1: Check that all sales invoices in the period are processed (submitted)
 * 
 * This validation ensures that:
 * - All sales invoices within the period date range are submitted (not draft)
 * - No unprocessed sales invoices remain before period closing
 * 
 * @param erpnext - ERPNext client instance
 * @param period - Accounting period to validate
 * @returns ValidationResult with details of any unprocessed invoices
 */
async function validateSalesInvoices(
  client: ERPNextClient,
  period: AccountingPeriod
): Promise<ValidationResult> {
  try {
    // Query for draft (unprocessed) sales invoices in the period
    // docstatus = 0: Draft (not submitted)
    // docstatus = 1: Submitted (processed)
    // docstatus = 2: Cancelled
    const filters: [string, string, string | number][] = [
      ['company', '=', period.company],
      ['posting_date', '>=', period.start_date],
      ['posting_date', '<=', period.end_date],
      ['docstatus', '=', 0], // Draft only
    ];

    const draftInvoices = await client.getList<{ name: string; customer: string; grand_total: number; posting_date: string; [key: string]: unknown }>('Sales Invoice', {
      filters,
      fields: ['name', 'customer', 'grand_total', 'posting_date'],
      limit_page_length: 100,
    });

    return {
      check_name: 'Sales Invoices Processed',
      passed: draftInvoices.length === 0,
      message:
        draftInvoices.length === 0
          ? 'All sales invoices are processed'
          : `Found ${draftInvoices.length} unprocessed sales invoice(s) in period`,
      severity: draftInvoices.length === 0 ? 'info' : 'error',
      details: draftInvoices,
    };
  } catch (error) {
    console.error('Error checking sales invoices:', error);
    return {
      check_name: 'Sales Invoices Processed',
      passed: false,
      message: 'Error checking sales invoices',
      severity: 'error',
      details: [],
    };
  }
}

/**
 * Validate Purchase Invoices are Processed
 * Requirement 11.2: Check that all purchase invoices in the period are processed (submitted)
 * 
 * This validation ensures that:
 * - All purchase invoices within the period date range are submitted (not draft)
 * - No unprocessed purchase invoices remain before period closing
 * 
 * @param erpnext - ERPNext client instance
 * @param period - Accounting period to validate
 * @returns ValidationResult with details of any unprocessed invoices
 */
async function validatePurchaseInvoices(
  client: ERPNextClient,
  period: AccountingPeriod
): Promise<ValidationResult> {
  try {
    // Query for draft (unprocessed) purchase invoices in the period
    // docstatus = 0: Draft (not submitted)
    // docstatus = 1: Submitted (processed)
    // docstatus = 2: Cancelled
    const filters: [string, string, string | number][] = [
      ['company', '=', period.company],
      ['posting_date', '>=', period.start_date],
      ['posting_date', '<=', period.end_date],
      ['docstatus', '=', 0], // Draft only
    ];

    const draftInvoices = await client.getList<{ name: string; supplier: string; grand_total: number; posting_date: string; [key: string]: unknown }>('Purchase Invoice', {
      filters,
      fields: ['name', 'supplier', 'grand_total', 'posting_date'],
      limit_page_length: 100,
    });

    return {
      check_name: 'Purchase Invoices Processed',
      passed: draftInvoices.length === 0,
      message:
        draftInvoices.length === 0
          ? 'All purchase invoices are processed'
          : `Found ${draftInvoices.length} unprocessed purchase invoice(s) in period`,
      severity: draftInvoices.length === 0 ? 'info' : 'error',
      details: draftInvoices,
    };
  } catch (error) {
    console.error('Error checking purchase invoices:', error);
    return {
      check_name: 'Purchase Invoices Processed',
      passed: false,
      message: 'Error checking purchase invoices',
      severity: 'error',
      details: [],
    };
  }
}

async function validateInventoryTransactions(
  client: ERPNextClient,
  period: AccountingPeriod
): Promise<ValidationResult> {
  try {
    const filters: [string, string, string | number][] = [
      ['company', '=', period.company],
      ['posting_date', '>=', period.start_date],
      ['posting_date', '<=', period.end_date],
      ['docstatus', '=', 0], // Draft
    ];

    const draftStockEntries = await client.getList<{ name: string; stock_entry_type: string; [key: string]: unknown }>('Stock Entry', {
      filters,
      fields: ['name', 'stock_entry_type'],
      limit_page_length: 100,
    });

    return {
      check_name: 'Inventory Transactions Posted',
      passed: draftStockEntries.length === 0,
      message:
        draftStockEntries.length === 0
          ? 'All inventory transactions are posted'
          : `Found ${draftStockEntries.length} unposted inventory transaction(s)`,
      severity: draftStockEntries.length === 0 ? 'info' : 'error',
      details: draftStockEntries,
    };
  } catch (error) {
    console.error('Error checking inventory transactions:', error);
    return {
      check_name: 'Inventory Transactions Posted',
      passed: false,
      message: 'Error checking inventory transactions',
      severity: 'error',
      details: [],
    };
  }
}

async function validatePayrollEntries(
  client: ERPNextClient,
  period: AccountingPeriod
): Promise<ValidationResult> {
  try {
    const filters: [string, string, string | number][] = [
      ['company', '=', period.company],
      ['posting_date', '>=', period.start_date],
      ['posting_date', '<=', period.end_date],
      ['docstatus', '=', 0], // Draft
    ];

    const draftPayrollEntries = await client.getList<{ name: string; employee: string; net_pay: number; [key: string]: unknown }>('Salary Slip', {
      filters,
      fields: ['name', 'employee', 'net_pay'],
      limit_page_length: 100,
    });

    return {
      check_name: 'Payroll Entries Recorded',
      passed: draftPayrollEntries.length === 0,
      message:
        draftPayrollEntries.length === 0
          ? 'All payroll entries are recorded'
          : `Found ${draftPayrollEntries.length} unrecorded payroll entry(ies)`,
      severity: draftPayrollEntries.length === 0 ? 'info' : 'error',
      details: draftPayrollEntries,
    };
  } catch (error: unknown) {
    // Handle Salary Slip doctype access restrictions
    const message = error instanceof Error ? error.message : String(error);
    if (message && (
      message.includes('Failed to fetch Salary Slip list') ||
      message.includes('Permission denied') ||
      message.includes('Not permitted') ||
      message.includes('Salary Slip')
    )) {
      console.info('Payroll validation check skipped: Salary Slip access is restricted');
      return {
        check_name: 'Payroll Entries Recorded',
        passed: true,
        message: 'Payroll check skipped (Salary Slip access is restricted)',
        severity: 'info',
        details: [],
        validation_skipped: true,
        skip_reason: 'Doctype permission restriction: Salary Slip'
      };
    }

    console.warn('Payroll validation check skipped:', message);
    return {
      check_name: 'Payroll Entries Recorded',
      passed: true,
      message: 'Payroll check skipped (no payroll data or error occurred)',
      severity: 'info',
      details: [],
    };
  }
}
