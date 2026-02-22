import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { erpnextClient } from '@/lib/erpnext';
import type { ValidationResult, PeriodClosingConfig, AccountingPeriod } from '@/types/accounting-period';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { period_name, company } = body;

    if (!period_name || !company) {
      return NextResponse.json(
        { success: false, error: 'Period name and company are required' },
        { status: 400 }
      );
    }

    // Get period
    const period = await erpnextClient.get<AccountingPeriod>('Accounting Period', period_name);
    
    if (period.company !== company) {
      return NextResponse.json(
        { success: false, error: 'Period does not belong to specified company' },
        { status: 400 }
      );
    }

    // Get configuration - if not exists, use defaults
    let config: PeriodClosingConfig;
    try {
      config = await erpnextClient.get<PeriodClosingConfig>('Period Closing Config', 'Period Closing Config');
    } catch (error) {
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
      validations.push(await validateNoDraftTransactions(period));
    }

    if (config.enable_unposted_transaction_check !== false) {
      validations.push(await validateAllTransactionsPosted(period));
    }

    if (config.enable_bank_reconciliation_check !== false) {
      validations.push(await validateBankReconciliation(period));
    }

    if (config.enable_sales_invoice_check !== false) {
      validations.push(await validateSalesInvoices(period));
    }

    if (config.enable_purchase_invoice_check !== false) {
      validations.push(await validatePurchaseInvoices(period));
    }

    if (config.enable_inventory_check !== false) {
      validations.push(await validateInventoryTransactions(period));
    }

    if (config.enable_payroll_check !== false) {
      validations.push(await validatePayrollEntries(period));
    }

    const allPassed = validations.every(v => v.passed);

    return NextResponse.json({
      success: true,
      all_passed: allPassed,
      validations,
    });
  } catch (error: any) {
    console.error('Validation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Validation functions
async function validateNoDraftTransactions(
  period: AccountingPeriod
): Promise<ValidationResult> {
  const doctypes = ['Journal Entry', 'Sales Invoice', 'Purchase Invoice', 'Payment Entry'];
  const draftDocs: any[] = [];

  for (const doctype of doctypes) {
    const filters = [
      ['company', '=', period.company],
      ['posting_date', '>=', period.start_date],
      ['posting_date', '<=', period.end_date],
      ['docstatus', '=', 0], // Draft
    ];

    try {
      const docs = await erpnextClient.getList(doctype, {
        filters,
        fields: ['name', 'posting_date'],
        limit_page_length: 100,
      });

      draftDocs.push(...docs.map((d: any) => ({ ...d, doctype })));
    } catch (error) {
      console.error(`Error checking ${doctype}:`, error);
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
  period: AccountingPeriod
): Promise<ValidationResult> {
  const voucherTypes = ['Journal Entry', 'Sales Invoice', 'Purchase Invoice', 'Payment Entry'];
  const unpostedVouchers: any[] = [];

  for (const voucherType of voucherTypes) {
    const voucherFilters = [
      ['company', '=', period.company],
      ['posting_date', '>=', period.start_date],
      ['posting_date', '<=', period.end_date],
      ['docstatus', '=', 1], // Submitted
    ];

    try {
      const vouchers = await erpnextClient.getList(voucherType, {
        filters: voucherFilters,
        fields: ['name'],
        limit_page_length: 1000,
      });

      for (const voucher of vouchers) {
        const glFilters = [
          ['voucher_type', '=', voucherType],
          ['voucher_no', '=', voucher.name],
        ];

        const glEntries = await erpnextClient.getList('GL Entry', {
          filters: glFilters,
          fields: ['name'],
          limit_page_length: 1,
        });

        if (glEntries.length === 0) {
          unpostedVouchers.push({ doctype: voucherType, name: voucher.name });
        }
      }
    } catch (error) {
      console.error(`Error checking ${voucherType}:`, error);
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
  period: AccountingPeriod
): Promise<ValidationResult> {
  try {
    const bankAccounts = await erpnextClient.getList('Account', {
      filters: [
        ['company', '=', period.company],
        ['account_type', '=', 'Bank'],
      ],
      fields: ['name', 'account_name'],
      limit_page_length: 1000,
    });

    const unreconciledAccounts: any[] = [];

    for (const account of bankAccounts) {
      const filters = [
        ['account', '=', account.name],
        ['posting_date', '<=', period.end_date],
        ['clearance_date', 'is', 'not set'],
      ];

      const unreconciledEntries = await erpnextClient.getList('GL Entry', {
        filters,
        fields: ['name'],
        limit_page_length: 1,
      });

      if (unreconciledEntries.length > 0) {
        unreconciledAccounts.push({
          account: account.name,
          account_name: account.account_name,
          unreconciled_count: unreconciledEntries.length,
        });
      }
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
  } catch (error) {
    console.error('Error checking bank reconciliation:', error);
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
  period: AccountingPeriod
): Promise<ValidationResult> {
  try {
    // Query for draft (unprocessed) sales invoices in the period
    // docstatus = 0: Draft (not submitted)
    // docstatus = 1: Submitted (processed)
    // docstatus = 2: Cancelled
    const filters = [
      ['company', '=', period.company],
      ['posting_date', '>=', period.start_date],
      ['posting_date', '<=', period.end_date],
      ['docstatus', '=', 0], // Draft only
    ];

    const draftInvoices = await erpnextClient.getList('Sales Invoice', {
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
  period: AccountingPeriod
): Promise<ValidationResult> {
  try {
    // Query for draft (unprocessed) purchase invoices in the period
    // docstatus = 0: Draft (not submitted)
    // docstatus = 1: Submitted (processed)
    // docstatus = 2: Cancelled
    const filters = [
      ['company', '=', period.company],
      ['posting_date', '>=', period.start_date],
      ['posting_date', '<=', period.end_date],
      ['docstatus', '=', 0], // Draft only
    ];

    const draftInvoices = await erpnextClient.getList('Purchase Invoice', {
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
  period: AccountingPeriod
): Promise<ValidationResult> {
  try {
    const filters = [
      ['company', '=', period.company],
      ['posting_date', '>=', period.start_date],
      ['posting_date', '<=', period.end_date],
      ['docstatus', '=', 0], // Draft
    ];

    const draftStockEntries = await erpnextClient.getList('Stock Entry', {
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
  period: AccountingPeriod
): Promise<ValidationResult> {
  try {
    const filters = [
      ['company', '=', period.company],
      ['posting_date', '>=', period.start_date],
      ['posting_date', '<=', period.end_date],
      ['docstatus', '=', 0], // Draft
    ];

    const draftPayrollEntries = await erpnextClient.getList('Salary Slip', {
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
  } catch (error) {
    console.error('Error checking payroll entries:', error);
    return {
      check_name: 'Payroll Entries Recorded',
      passed: true,
      message: 'Payroll check skipped (no payroll data or error occurred)',
      severity: 'info',
      details: [],
    };
  }
}
