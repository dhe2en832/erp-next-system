import { NextRequest, NextResponse } from 'next/server';
import { erpnextClient } from '@/lib/erpnext';
import type { AccountingPeriod, AccountBalance } from '@/types/accounting-period';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await context.params;
    const periodName = decodeURIComponent(name);

    // Get period details
    const period = await erpnextClient.get<AccountingPeriod>('Accounting Period', periodName);

    // Calculate balances for both cumulative and period-only
    const cumulativeBalances = await calculateAllAccountBalances(period, false);
    const periodOnlyBalances = await calculateAllAccountBalances(period, true);

    return NextResponse.json({
      success: true,
      data: {
        cumulative: cumulativeBalances,
        period_only: periodOnlyBalances,
      },
    });
  } catch (error: any) {
    console.error('Error fetching account balances:', error);
    return NextResponse.json(
      { success: false, error: 'FETCH_ERROR', message: error.message || 'Failed to fetch account balances' },
      { status: 500 }
    );
  }
}

/**
 * Calculate all account balances as of period end date
 * @param period - Accounting period
 * @param periodOnly - If true, only include transactions within the period (start_date to end_date)
 *                     If false, include all transactions up to end_date (cumulative)
 */
async function calculateAllAccountBalances(period: AccountingPeriod, periodOnly: boolean = false): Promise<AccountBalance[]> {
  const filters: any[] = [
    ['company', '=', period.company],
    ['posting_date', '<=', period.end_date],
    ['is_cancelled', '=', 0],
  ];

  // If period-only mode, add start_date filter
  if (periodOnly) {
    filters.push(['posting_date', '>=', period.start_date]);
  }

  const glEntries = await erpnextClient.getList('GL Entry', {
    filters,
    fields: ['account', 'debit', 'credit'],
    limit_page_length: 999999,
  });

  // Aggregate by account
  const accountMap = new Map<string, { debit: number; credit: number }>();

  for (const entry of glEntries) {
    const existing = accountMap.get(entry.account) || { debit: 0, credit: 0 };
    accountMap.set(entry.account, {
      debit: existing.debit + (entry.debit || 0),
      credit: existing.credit + (entry.credit || 0),
    });
  }

  // Get account details
  const accounts = await erpnextClient.getList('Account', {
    filters: [
      ['name', 'in', Array.from(accountMap.keys())],
      ['company', '=', period.company],
    ],
    fields: ['name', 'account_name', 'account_type', 'root_type', 'is_group'],
    limit_page_length: 999999,
  });

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
      is_nominal: ['Income', 'Expense'].includes(account.root_type),
    });
  }

  return result;
}
