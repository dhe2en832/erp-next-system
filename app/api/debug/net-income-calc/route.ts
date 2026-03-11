import { NextRequest, NextResponse } from 'next/server';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError 
} from '@/lib/api-helpers';
import { calculateNetIncome } from '@/lib/calculate-net-income';

export async function GET(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const client = await getERPNextClientForRequest(request);
    const { searchParams } = new URL(request.url);
    
    const period_name = searchParams.get('period_name');
    const company = searchParams.get('company');

    if (!period_name || !company) {
      return NextResponse.json(
        { success: false, error: 'Period name and company are required' },
        { status: 400 }
      );
    }

    // Get period
    const periodList = await client.getList('Accounting Period', {
      filters: [['name', '=', period_name]],
      fields: ['name', 'start_date', 'end_date', 'closing_journal_entry'],
      limit: 1,
    });
    
    if (!periodList || periodList.length === 0) {
      return NextResponse.json(
        { success: false, error: `Period not found: ${period_name}` },
        { status: 404 }
      );
    }
    
    const period = periodList[0] as any;

    // Get GL entries
    const filters: any[] = [
      ['company', '=', company],
      ['posting_date', '>=', period.start_date],
      ['posting_date', '<=', period.end_date],
      ['is_cancelled', '=', 0],
    ];
    
    if (period.closing_journal_entry) {
      filters.push(['voucher_no', '!=', period.closing_journal_entry]);
    }
    
    filters.push(['voucher_type', '!=', 'Closing Entry']);
    
    const glEntries = await client.getList('GL Entry', {
      filters,
      fields: ['account', 'debit', 'credit', 'posting_date', 'voucher_type', 'voucher_no'],
      limit: 10000,
    });

    // Get accounts
    const accounts = await client.getList('Account', {
      filters: [['company', '=', company]],
      fields: ['name', 'account_name', 'root_type'],
      limit: 10000,
    });

    const accountMap = new Map(accounts.map((acc: any) => [acc.name, acc]));

    // Aggregate
    const accountBalances: Record<string, any> = {};
    
    glEntries.forEach((entry: any) => {
      const accountInfo = accountMap.get(entry.account);
      const rootType = accountInfo?.root_type || 'Asset';
      
      if (!accountBalances[entry.account]) {
        accountBalances[entry.account] = { 
          account: entry.account,
          account_name: accountInfo?.account_name || entry.account,
          root_type: rootType,
          debit: 0, 
          credit: 0, 
          balance: 0,
        };
      }
      accountBalances[entry.account].debit += entry.debit || 0;
      accountBalances[entry.account].credit += entry.credit || 0;
      
      if (rootType === 'Income') {
        accountBalances[entry.account].balance = accountBalances[entry.account].credit - accountBalances[entry.account].debit;
      } else if (rootType === 'Expense') {
        accountBalances[entry.account].balance = accountBalances[entry.account].debit - accountBalances[entry.account].credit;
      } else {
        accountBalances[entry.account].balance = accountBalances[entry.account].debit - accountBalances[entry.account].credit;
      }
    });

    const allAccounts = Object.values(accountBalances);
    const nominal_accounts = allAccounts.filter((a: any) => a.root_type === 'Income' || a.root_type === 'Expense');
    
    // Calculate using utility
    const { totalIncome, totalExpense, netIncome } = calculateNetIncome(nominal_accounts as any);

    // Manual calculation for verification
    const incomeAccounts = nominal_accounts.filter((a: any) => a.root_type === 'Income');
    const expenseAccounts = nominal_accounts.filter((a: any) => a.root_type === 'Expense');
    
    const manualTotalIncome = incomeAccounts.reduce((sum: number, a: any) => sum + a.balance, 0);
    const manualTotalExpense = expenseAccounts.reduce((sum: number, a: any) => sum + a.balance, 0);
    const manualNetIncome = manualTotalIncome - manualTotalExpense;

    return NextResponse.json({
      success: true,
      data: {
        period: {
          name: period.name,
          start_date: period.start_date,
          end_date: period.end_date,
          closing_journal_entry: period.closing_journal_entry,
        },
        filters_applied: filters,
        gl_entries_count: glEntries.length,
        income_accounts: incomeAccounts.map((a: any) => ({
          account: a.account,
          account_name: a.account_name,
          debit: a.debit,
          credit: a.credit,
          balance: a.balance,
        })),
        expense_accounts: expenseAccounts.map((a: any) => ({
          account: a.account,
          account_name: a.account_name,
          debit: a.debit,
          credit: a.credit,
          balance: a.balance,
        })),
        calculation_from_utility: {
          totalIncome,
          totalExpense,
          netIncome,
        },
        manual_calculation: {
          totalIncome: manualTotalIncome,
          totalExpense: manualTotalExpense,
          netIncome: manualNetIncome,
        },
        expected_result: {
          totalIncome: 1319000,
          totalExpense: 44058,
          netIncome: 1274942,
        },
      },
    });
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/debug/net-income-calc', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
