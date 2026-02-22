import { NextRequest, NextResponse } from 'next/server';
import { erpnextClient } from '@/lib/erpnext';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const period_name = searchParams.get('period_name');
    const company = searchParams.get('company');
    const format = searchParams.get('format') || 'json';

    if (!period_name || !company) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', message: 'Period name and company are required' },
        { status: 400 }
      );
    }

    // Get period details
    const period = await erpnextClient.get('Accounting Period', period_name);

    // Get GL entries for the period
    const glEntries = await erpnextClient.getList('GL Entry', {
      filters: [
        ['company', '=', company],
        ['posting_date', '>=', period.start_date],
        ['posting_date', '<=', period.end_date],
      ],
      fields: ['account', 'debit', 'credit', 'posting_date', 'voucher_type', 'voucher_no'],
      limit: 10000,
    });

    // Get account details to determine root_type
    const accounts = await erpnextClient.getList('Account', {
      filters: [['company', '=', company]],
      fields: ['name', 'account_name', 'root_type', 'account_type'],
      limit: 10000,
    });

    const accountMap = new Map(accounts.map((acc: any) => [acc.name, acc]));

    // Aggregate by account
    const accountBalances: Record<string, { 
      account: string;
      account_name: string;
      root_type: string;
      account_type: string;
      debit: number; 
      credit: number; 
      balance: number;
    }> = {};
    
    glEntries.forEach((entry: any) => {
      const accountInfo = accountMap.get(entry.account);
      if (!accountBalances[entry.account]) {
        accountBalances[entry.account] = { 
          account: entry.account,
          account_name: accountInfo?.account_name || entry.account,
          root_type: accountInfo?.root_type || 'Unknown',
          account_type: accountInfo?.account_type || 'Unknown',
          debit: 0, 
          credit: 0, 
          balance: 0 
        };
      }
      accountBalances[entry.account].debit += entry.debit || 0;
      accountBalances[entry.account].credit += entry.credit || 0;
      accountBalances[entry.account].balance += (entry.debit || 0) - (entry.credit || 0);
    });

    const allAccounts = Object.values(accountBalances);
    const nominal_accounts = allAccounts.filter(a => a.root_type === 'Income' || a.root_type === 'Expense');
    const real_accounts = allAccounts.filter(a => a.root_type === 'Asset' || a.root_type === 'Liability' || a.root_type === 'Equity');
    
    const total_income = nominal_accounts.filter(a => a.root_type === 'Income').reduce((sum, a) => sum + a.balance, 0);
    const total_expense = nominal_accounts.filter(a => a.root_type === 'Expense').reduce((sum, a) => sum + Math.abs(a.balance), 0);
    const net_income = total_income - total_expense;

    const summary = {
      period: {
        name: period.name,
        period_name: period.period_name,
        company: period.company,
        start_date: period.start_date,
        end_date: period.end_date,
        status: period.status,
        closed_by: period.closed_by,
        closed_on: period.closed_on,
      },
      closing_journal: period.closing_journal_entry ? {
        name: period.closing_journal_entry,
      } : null,
      nominal_accounts,
      real_accounts,
      net_income,
      total_debit: allAccounts.reduce((sum, b) => sum + b.debit, 0),
      total_credit: allAccounts.reduce((sum, b) => sum + b.credit, 0),
    };

    if (format === 'json') {
      return NextResponse.json({
        success: true,
        data: summary,
      });
    }

    // For PDF/Excel, return JSON for now (client will handle formatting)
    return NextResponse.json({
      success: true,
      data: summary,
      format,
    });
  } catch (error: any) {
    console.error('Error generating closing summary:', error);
    return NextResponse.json(
      { success: false, error: 'REPORT_ERROR', message: error.message || 'Failed to generate report' },
      { status: 500 }
    );
  }
}
