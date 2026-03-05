import { NextRequest, NextResponse } from 'next/server';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError 
} from '@/lib/api-helpers';
import type { AccountingPeriod, AccountBalance } from '@/types/accounting-period';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ name: string }> }
) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const client = await getERPNextClientForRequest(request);
    const { name } = await context.params;
    const periodName = decodeURIComponent(name);

    // Get period details
    const period = await client.get<AccountingPeriod>('Accounting Period', periodName);

    // Calculate balances for both cumulative and period-only
    const cumulativeBalances = await calculateAllAccountBalances(client, period, false);
    const periodOnlyBalances = await calculateAllAccountBalances(client, period, true);

    return NextResponse.json({
      success: true,
      data: {
        cumulative: cumulativeBalances,
        period_only: periodOnlyBalances,
      },
    });
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/accounting-period/balances/[name]', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * Calculate all account balances as of period end date
 * @param client - ERPNext client instance
 * @param period - Accounting period
 * @param periodOnly - If true, only include transactions within the period (start_date to end_date)
 *                     If false, include all transactions up to end_date (cumulative)
 */
async function calculateAllAccountBalances(client: any, period: AccountingPeriod, periodOnly: boolean = false): Promise<AccountBalance[]> {
  // console.log('=== Calculate Account Balances ===');
  // console.log('Period:', period.name, period.start_date, '-', period.end_date);
  // console.log('Company:', period.company);
  // console.log('Mode:', periodOnly ? 'Period Only' : 'Cumulative');
  
  // Step 1: Fetch ALL non-group accounts from Chart of Accounts first
  const allAccounts = await client.getList('Account', {
    filters: [
      ['company', '=', period.company],
      ['is_group', '=', 0],
    ],
    fields: ['name', 'account_name', 'account_type', 'root_type', 'is_group'],
    limit_page_length: 999999,
  });
  
  // console.log('Total accounts fetched:', allAccounts.length);
  // console.log('Income accounts:', allAccounts.filter(a => a.root_type === 'Income').length);
  // console.log('Expense accounts:', allAccounts.filter(a => a.root_type === 'Expense').length);

  // Step 2: Initialize accountMap with all accounts having zero balances
  const accountMap = new Map<string, { debit: number; credit: number }>();
  for (const account of allAccounts) {
    accountMap.set(account.name, { debit: 0, credit: 0 });
  }

  // Step 3: Query GL entries and augment the accountMap
  const glFilters: any[] = [
    ['company', '=', period.company],
    ['posting_date', '<=', period.end_date],
    ['is_cancelled', '=', 0],
  ];

  // If period-only mode, add start_date filter
  if (periodOnly) {
    glFilters.push(['posting_date', '>=', period.start_date]);
  }
  
  // console.log('GL Entry filters:', JSON.stringify(glFilters));

  const glEntries = await client.getList('GL Entry', {
    filters: glFilters,
    fields: ['account', 'debit', 'credit', 'posting_date', 'voucher_type', 'voucher_no'],
    limit_page_length: 999999,
  });
  
  // console.log('Total GL entries fetched:', glEntries.length);
  
  // Log ALL GL entries to see what we got
  // if (glEntries.length > 0) {
  //   console.log('All GL entries:', glEntries);
  // }
  
  // Log sample GL entries for Income/Expense accounts
  const incomeExpenseEntries = glEntries.filter((e: any) => {
    const account = allAccounts.find((a: any) => a.name === e.account);
    return account && ['Income', 'Expense'].includes(account.root_type);
  });
  // console.log('GL entries for Income/Expense accounts:', incomeExpenseEntries.length);
  // if (incomeExpenseEntries.length > 0) {
  //   console.log('Sample entries:', incomeExpenseEntries.slice(0, 5));
  // }

  // Update existing entries in accountMap (don't create new ones)
  for (const entry of glEntries) {
    const existing = accountMap.get(entry.account);
    if (existing) {
      accountMap.set(entry.account, {
        debit: existing.debit + (entry.debit || 0),
        credit: existing.credit + (entry.credit || 0),
      });
    }
  }

  // Step 4: Build results from all accounts in accountMap
  const result: AccountBalance[] = [];

  for (const account of allAccounts) {
    const totals = accountMap.get(account.name);
    if (!totals) continue;

    const balance = ['Asset', 'Expense'].includes(account.root_type)
      ? totals.debit - totals.credit
      : totals.credit - totals.debit;

    // For Income/Expense accounts: include ALL accounts (even with zero balance)
    // For Real accounts: keep existing logic (only non-zero balances)
    const isNominal = ['Income', 'Expense'].includes(account.root_type);
    if (isNominal || balance !== 0) {
      result.push({
        account: account.name,
        account_name: account.account_name,
        account_type: account.account_type,
        root_type: account.root_type,
        is_group: account.is_group,
        debit: totals.debit,
        credit: totals.credit,
        balance: balance,
        is_nominal: isNominal,
      });
    }
  }
  
  // console.log('Result - Nominal accounts:', result.filter(r => r.is_nominal).length);
  // console.log('Result - Real accounts:', result.filter(r => !r.is_nominal).length);
  // console.log('Result - Nominal with non-zero balance:', result.filter(r => r.is_nominal && r.balance !== 0).length);

  return result;
}
