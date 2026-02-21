import { NextRequest, NextResponse } from 'next/server';
import { getERPNextClient } from '@/lib/erpnext';
import type { 
  ClosingSummaryResponse, 
  AccountingPeriod, 
  AccountBalance 
} from '@/types/accounting-period';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const period_name = searchParams.get('period_name');
    const company = searchParams.get('company');
    const format = searchParams.get('format') || 'json';

    // Validate required parameters
    if (!period_name || !company) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'period_name and company are required'
        },
        { status: 400 }
      );
    }

    const client = await getERPNextClient();

    // Get period details
    const periodResponse = await client.getDoc('Accounting Period', period_name);
    
    if (!periodResponse || periodResponse.company !== company) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: 'Accounting Period not found'
        },
        { status: 404 }
      );
    }

    const period = periodResponse as AccountingPeriod;

    // Get closing journal if exists
    let closingJournal = null;
    if (period.closing_journal_entry) {
      try {
        closingJournal = await client.getDoc('Journal Entry', period.closing_journal_entry);
      } catch (error) {
        console.warn('Closing journal not found:', error);
      }
    }

    // Get account balances
    const accountBalances = await getAccountBalances(client, period);

    // Separate nominal and real accounts
    const nominalAccounts = accountBalances.filter(ab => ab.is_nominal);
    const realAccounts = accountBalances.filter(ab => !ab.is_nominal);

    // Calculate net income
    const netIncome = calculateNetIncome(nominalAccounts);

    const responseData: ClosingSummaryResponse = {
      success: true,
      data: {
        period,
        closing_journal: closingJournal,
        account_balances: accountBalances,
        nominal_accounts: nominalAccounts,
        real_accounts: realAccounts,
        net_income: netIncome
      }
    };

    // Handle export formats
    if (format === 'pdf') {
      const pdfUrl = await generatePDFReport(responseData.data);
      responseData.pdf_url = pdfUrl;
    } else if (format === 'excel') {
      const excelUrl = await generateExcelReport(responseData.data);
      responseData.excel_url = excelUrl;
    }

    return NextResponse.json(responseData);

  } catch (error: any) {
    console.error('Error generating closing summary:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: error.message || 'Failed to generate closing summary'
      },
      { status: 500 }
    );
  }
}

async function getAccountBalances(
  client: any,
  period: AccountingPeriod
): Promise<AccountBalance[]> {
  // Get all GL entries for the period
  const glEntries = await client.getList('GL Entry', {
    filters: [
      ['company', '=', period.company],
      ['posting_date', '<=', period.end_date],
      ['is_cancelled', '=', 0]
    ],
    fields: ['account', 'debit', 'credit'],
    limit_page_length: 999999
  });

  // Aggregate by account
  const accountMap = new Map<string, { debit: number; credit: number }>();

  for (const entry of glEntries) {
    const existing = accountMap.get(entry.account) || { debit: 0, credit: 0 };
    accountMap.set(entry.account, {
      debit: existing.debit + (entry.debit || 0),
      credit: existing.credit + (entry.credit || 0)
    });
  }

  // Get account details
  const accountNames = Array.from(accountMap.keys());
  if (accountNames.length === 0) {
    return [];
  }

  const accounts = await client.getList('Account', {
    filters: [
      ['name', 'in', accountNames],
      ['company', '=', period.company]
    ],
    fields: ['name', 'account_name', 'account_type', 'root_type', 'is_group'],
    limit_page_length: 999999
  });

  // Build result
  const result: AccountBalance[] = [];

  for (const account of accounts) {
    const totals = accountMap.get(account.name);
    if (!totals) continue;

    const balance = ['Asset', 'Expense'].includes(account.root_type)
      ? totals.debit - totals.credit
      : totals.credit - totals.debit;

    result.push({
      account: account.name,
      account_name: account.account_name,
      account_type: account.account_type,
      root_type: account.root_type,
      is_group: account.is_group,
      debit: totals.debit,
      credit: totals.credit,
      balance: balance,
      is_nominal: ['Income', 'Expense'].includes(account.root_type)
    });
  }

  return result;
}

function calculateNetIncome(nominalAccounts: AccountBalance[]): number {
  let totalIncome = 0;
  let totalExpense = 0;

  for (const account of nominalAccounts) {
    if (account.root_type === 'Income') {
      totalIncome += account.balance;
    } else if (account.root_type === 'Expense') {
      totalExpense += account.balance;
    }
  }

  return totalIncome - totalExpense;
}

async function generatePDFReport(data: any): Promise<string> {
  // TODO: Implement PDF generation
  // For now, return a placeholder URL
  // In production, this would use a library like puppeteer or pdfkit
  return `/api/accounting-period/reports/pdf/${data.period.name}`;
}

async function generateExcelReport(data: any): Promise<string> {
  // TODO: Implement Excel generation
  // For now, return a placeholder URL
  // In production, this would use a library like exceljs
  return `/api/accounting-period/reports/excel/${data.period.name}`;
}
