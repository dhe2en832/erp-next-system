import { NextRequest, NextResponse } from 'next/server';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError 
} from '@/lib/api-helpers';
import { ERPNextClient } from '@/lib/erpnext';
import { calculateNetIncome } from '@/lib/calculate-net-income';
import type { AccountingPeriod, PeriodClosingConfig, AccountBalance, ClosingJournalAccount } from '@/types/accounting-period';

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

    // Get configuration
    const config = await client.get<PeriodClosingConfig>('Period Closing Config', 'Period Closing Config');

    // Get nominal account balances
    const nominalAccounts = await getNominalAccountBalances(client, period);

    // Calculate net income using shared utility
    const { totalIncome, totalExpense, netIncome } = calculateNetIncome(nominalAccounts);

    // Build journal entry preview
    const journalAccounts: ClosingJournalAccount[] = [];

    // Close income accounts (debit income to zero out credit balance)
    for (const account of nominalAccounts) {
      if (account.root_type === 'Income' && account.balance !== 0) {
        journalAccounts.push({
          account: account.account,
          account_name: account.account_name,
          debit_in_account_currency: Math.abs(account.balance),
          credit_in_account_currency: 0,
          user_remark: `Closing ${account.account_name} for period ${period.period_name}`,
        });
      }
    }

    // Close expense accounts (debit expense to zero out debit balance)
    for (const account of nominalAccounts) {
      if (account.root_type === 'Expense' && account.balance !== 0) {
        journalAccounts.push({
          account: account.account,
          account_name: account.account_name,
          debit_in_account_currency: Math.abs(account.balance),
          credit_in_account_currency: 0,
          user_remark: `Closing ${account.account_name} for period ${period.period_name}`,
        });
      }
    }

    // Add retained earnings entry (balancing entry)
    if (netIncome > 0) {
      // Profit: Credit retained earnings
      journalAccounts.push({
        account: config.retained_earnings_account,
        account_name: 'Retained Earnings',
        debit_in_account_currency: 0,
        credit_in_account_currency: netIncome,
        user_remark: `Net income for period ${period.period_name}`,
      });
    } else if (netIncome < 0) {
      // Loss: Debit retained earnings
      journalAccounts.push({
        account: config.retained_earnings_account,
        account_name: 'Retained Earnings',
        debit_in_account_currency: Math.abs(netIncome),
        credit_in_account_currency: 0,
        user_remark: `Net loss for period ${period.period_name}`,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        period,
        journal_accounts: journalAccounts,
        total_income: totalIncome,
        total_expense: totalExpense,
        net_income: netIncome,
        retained_earnings_account: config.retained_earnings_account,
      },
    });
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/accounting-period/preview-closing/[name]', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * Get nominal account balances for the period
 */
async function getNominalAccountBalances(client: ERPNextClient, period: AccountingPeriod): Promise<AccountBalance[]> {
  // Get all GL entries for the period (EXCLUDE entries on the last day to avoid including closing journal entries)
  const filters = [
    ['company', '=', period.company],
    ['posting_date', '>=', period.start_date],
    ['posting_date', '<', period.end_date], // Exclude entries on the last day
    ['is_cancelled', '=', 0],
  ];

  interface GLEntrySummary {
    account: string;
    debit: number;
    credit: number;
  }
  const glEntries = await client.getList<GLEntrySummary>('GL Entry', {
    filters,
    fields: ['account', 'debit', 'credit'],
    limit_page_length: 999999,
  });

  // Aggregate by account
  const accountBalancesMap = new Map<string, { debit: number; credit: number }>();

  for (const entry of glEntries) {
    const existing = accountBalancesMap.get(entry.account) || { debit: 0, credit: 0 };
    accountBalancesMap.set(entry.account, {
      debit: existing.debit + (entry.debit || 0),
      credit: existing.credit + (entry.credit || 0),
    });
  }

  // Get account details for nominal accounts only
  interface AccountInfo {
    name: string;
    account_name: string;
    account_type: string;
    root_type: string;
  }
  const accounts = await client.getList<AccountInfo>('Account', {
    filters: [
      ['name', 'in', Array.from(accountBalancesMap.keys())],
      ['root_type', 'in', ['Income', 'Expense']],
      ['is_group', '=', 0],
    ],
    fields: ['name', 'account_name', 'account_type', 'root_type'],
    limit_page_length: 999999,
  });

  // Build result
  const result: AccountBalance[] = [];

  for (const account of accounts) {
    const totals = accountBalancesMap.get(account.name);
    if (!totals) continue;

    const balance =
      account.root_type === 'Income'
        ? totals.credit - totals.debit // Income has credit balance
        : totals.debit - totals.credit; // Expense has debit balance

    if (balance !== 0) {
      result.push({
        account: account.name,
        account_name: account.account_name,
        account_type: account.account_type,
        root_type: account.root_type as 'Income' | 'Expense',
        is_group: false,
        debit: totals.debit,
        credit: totals.credit,
        balance: balance,
        is_nominal: true,
      });
    }
  }

  return result;
}
