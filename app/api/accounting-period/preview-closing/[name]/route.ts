import { NextRequest, NextResponse } from 'next/server';
import { getNominalAccountBalances } from '../../../../../lib/accounting-period-closing';
import type { AccountingPeriod, ClosingJournalAccount } from '../../../../../types/accounting-period';

const ERPNEXT_URL = process.env.ERPNEXT_URL || 'http://localhost:8000';
const API_KEY = process.env.ERPNEXT_API_KEY || '';
const API_SECRET = process.env.ERPNEXT_API_SECRET || '';

export async function GET(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const periodName = decodeURIComponent(params.name);

    // Fetch period details from ERPNext
    const periodResponse = await fetch(
      `${ERPNEXT_URL}/api/resource/Accounting Period/${encodeURIComponent(periodName)}`,
      {
        headers: {
          'Authorization': `token ${API_KEY}:${API_SECRET}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!periodResponse.ok) {
      if (periodResponse.status === 404) {
        return NextResponse.json(
          {
            success: false,
            error: 'NOT_FOUND',
            message: 'Periode akuntansi tidak ditemukan',
          },
          { status: 404 }
        );
      }
      throw new Error(`ERPNext API error: ${periodResponse.statusText}`);
    }

    const periodData = await periodResponse.json();
    const period: AccountingPeriod = periodData.data;

    // Get configuration for retained earnings account
    const configResponse = await fetch(
      `${ERPNEXT_URL}/api/resource/Period Closing Config/Period Closing Config`,
      {
        headers: {
          'Authorization': `token ${API_KEY}:${API_SECRET}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!configResponse.ok) {
      throw new Error('Failed to fetch period closing configuration');
    }

    const configData = await configResponse.json();
    const retainedEarningsAccount = configData.data.retained_earnings_account;

    // Get nominal accounts
    const nominalAccounts = await getNominalAccountBalances(period);

    // Calculate totals
    let totalIncome = 0;
    let totalExpense = 0;

    for (const account of nominalAccounts) {
      if (account.root_type === 'Income') {
        totalIncome += account.balance;
      } else if (account.root_type === 'Expense') {
        totalExpense += account.balance;
      }
    }

    const netIncome = totalIncome - totalExpense;

    // Build preview journal entries
    const journalAccounts: ClosingJournalAccount[] = [];

    // Close income accounts (debit income to zero it out)
    for (const account of nominalAccounts) {
      if (account.root_type === 'Income' && Math.abs(account.balance) > 0.01) {
        journalAccounts.push({
          account: account.account,
          debit_in_account_currency: Math.abs(account.balance),
          credit_in_account_currency: 0,
          user_remark: `Closing ${account.account_name} for period ${period.period_name}`
        });
      }
    }

    // Close expense accounts (credit expense to zero it out)
    for (const account of nominalAccounts) {
      if (account.root_type === 'Expense' && Math.abs(account.balance) > 0.01) {
        journalAccounts.push({
          account: account.account,
          debit_in_account_currency: 0,
          credit_in_account_currency: Math.abs(account.balance),
          user_remark: `Closing ${account.account_name} for period ${period.period_name}`
        });
      }
    }

    // Add retained earnings entry (balancing entry)
    if (Math.abs(netIncome) > 0.01) {
      if (netIncome > 0) {
        // Profit: Credit retained earnings
        journalAccounts.push({
          account: retainedEarningsAccount,
          debit_in_account_currency: 0,
          credit_in_account_currency: netIncome,
          user_remark: `Net income for period ${period.period_name}`
        });
      } else {
        // Loss: Debit retained earnings
        journalAccounts.push({
          account: retainedEarningsAccount,
          debit_in_account_currency: Math.abs(netIncome),
          credit_in_account_currency: 0,
          user_remark: `Net loss for period ${period.period_name}`
        });
      }
    }

    // Fetch account names for the journal entries
    const accountNames = new Map<string, string>();
    for (const entry of journalAccounts) {
      if (!accountNames.has(entry.account)) {
        try {
          const accountResponse = await fetch(
            `${ERPNEXT_URL}/api/resource/Account/${encodeURIComponent(entry.account)}?fields=["account_name"]`,
            {
              headers: {
                'Authorization': `token ${API_KEY}:${API_SECRET}`,
                'Content-Type': 'application/json',
              },
            }
          );
          if (accountResponse.ok) {
            const accountData = await accountResponse.json();
            accountNames.set(entry.account, accountData.data.account_name);
          }
        } catch (error) {
          console.error(`Error fetching account name for ${entry.account}:`, error);
        }
      }
    }

    // Add account names to journal entries
    const enrichedJournalAccounts = journalAccounts.map(entry => ({
      ...entry,
      account_name: accountNames.get(entry.account) || entry.account,
    }));

    return NextResponse.json({
      success: true,
      data: {
        period,
        journal_accounts: enrichedJournalAccounts,
        total_income: totalIncome,
        total_expense: totalExpense,
        net_income: netIncome,
        retained_earnings_account: retainedEarningsAccount,
      },
    });
  } catch (error: any) {
    console.error('Error generating closing journal preview:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Gagal membuat preview jurnal penutup',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
