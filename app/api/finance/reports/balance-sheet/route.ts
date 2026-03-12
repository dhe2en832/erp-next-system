import { NextRequest, NextResponse } from 'next/server';
import { formatCurrency } from '@/utils/format';
import { validateDateRange } from '@/utils/report-validation';
import { isCurrentAsset, isCurrentLiability } from '@/utils/account-helpers';
import {
  getERPNextClientForRequest,
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError
} from '@/lib/api-helpers';

interface GlEntry {
  account: string;
  debit?: number;
  credit?: number;
  posting_date?: string;
}

interface AccountMaster {
  name: string;
  account_name: string;
  account_type: string;
  root_type: string;
  parent_account: string;
  is_group: number;
  account_number?: string;
}

interface BalanceSheetLine {
  account: string;
  account_name: string;
  account_number: string;
  account_type: string;
  amount: number;
  formatted_amount: string;
}

interface BalanceSheetSummary {
  total_current_assets: number;
  total_fixed_assets: number;
  total_assets: number;
  total_current_liabilities: number;
  total_long_term_liabilities: number;
  total_liabilities: number;
  total_equity: number;
  total_liabilities_and_equity: number;
}

export async function GET(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company') || process.env.ERP_DEFAULT_COMPANY || process.env.ERP_COMPANY;
    const asOfDate = searchParams.get('as_of_date');

    // Validate date range (Bug #4 fix)
    const dateValidation = validateDateRange(null, asOfDate);
    if (!dateValidation.valid) {
      return NextResponse.json(
        { success: false, message: dateValidation.error },
        { status: 400 }
      );
    }

    if (!company) {
      return NextResponse.json(
        { success: false, message: 'Company is required' },
        { status: 400 }
      );
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Fetch Account master for this company
    const accountsData = await client.getList<AccountMaster>('Account', {
      fields: ['name', 'account_name', 'account_type', 'root_type', 'parent_account', 'is_group', 'account_number'],
      filters: [['company', '=', company], ['is_group', '=', 0]],
      limit_page_length: 2000
    });

    // Build lookup map: account name → master data
    const accountMasterMap = new Map<string, AccountMaster>();
    accountsData.forEach((acc) => {
      accountMasterMap.set(acc.name, acc);
    });

    // Build GL Entry filters with as_of_date
    const glFilters: [string, string, string | number][] = [['company', '=', company]];
    if (asOfDate) {
      glFilters.push(['posting_date', '<=', asOfDate]);
    }

    const glData = await client.getList<GlEntry>('GL Entry', {
      fields: ['account', 'debit', 'credit', 'posting_date'],
      filters: glFilters,
      order_by: 'account',
      limit_page_length: 5000
    });

    // Aggregate GL entries by account
    const accountMap = new Map<string, { account: string; debit: number; credit: number }>();
    glData.forEach((entry) => {
      if (!accountMap.has(entry.account)) {
        accountMap.set(entry.account, { account: entry.account, debit: 0, credit: 0 });
      }
      const row = accountMap.get(entry.account)!;
      row.debit += entry.debit || 0;
      row.credit += entry.credit || 0;
    });

    // Process accounts for Balance Sheet
    const currentAssets: BalanceSheetLine[] = [];
    const fixedAssets: BalanceSheetLine[] = [];
    const currentLiabilities: BalanceSheetLine[] = [];
    const longTermLiabilities: BalanceSheetLine[] = [];
    const equityAccounts: BalanceSheetLine[] = [];

    Array.from(accountMap.values()).forEach(row => {
      const master = accountMasterMap.get(row.account);
      if (!master) return;

      const rootType = master.root_type;
      const accountType = master.account_type;

      // Only process Asset, Liability, and Equity accounts
      if (rootType !== 'Asset' && rootType !== 'Liability' && rootType !== 'Equity') return;

      // Calculate amount based on normal balance
      // Asset: debit normal balance → amount = debit - credit
      // Liability: credit normal balance → amount = credit - debit
      // Equity: credit normal balance → amount = credit - debit
      const amount = rootType === 'Asset'
        ? (row.debit - row.credit)
        : (row.credit - row.debit);

      if (amount === 0) return;

      const line: BalanceSheetLine = {
        account: row.account,
        account_name: master.account_name || row.account,
        account_number: master.account_number || '',
        account_type: accountType || '',
        amount: amount,
        formatted_amount: formatCurrency(amount),
      };

      // Categorize accounts (Bug #9 fix - use account_type instead of hardcoded numbers)
      if (rootType === 'Asset') {
        if (isCurrentAsset(master)) {
          currentAssets.push(line);
        } else {
          // Fixed Assets
          fixedAssets.push(line);
        }
      } else if (rootType === 'Liability') {
        if (isCurrentLiability(master)) {
          currentLiabilities.push(line);
        } else {
          // Long-term Liabilities
          longTermLiabilities.push(line);
        }
      } else if (rootType === 'Equity') {
        equityAccounts.push(line);
      }
    });

    // Bug #1 Fix: Calculate Net P/L and add to equity
    let netProfitLoss = 0;
    try {
      // Query Income accounts (root_type = 'Income')
      const incomeAccountNames = Array.from(accountMasterMap.values())
        .filter(acc => acc.root_type === 'Income')
        .map(acc => acc.name);

      // Query Expense accounts (root_type = 'Expense')
      const expenseAccountNames = Array.from(accountMasterMap.values())
        .filter(acc => acc.root_type === 'Expense')
        .map(acc => acc.name);

      // Calculate total income from GL entries
      let totalIncome = 0;
      glData.forEach((entry) => {
        if (incomeAccountNames.includes(entry.account)) {
          totalIncome += (entry.credit || 0) - (entry.debit || 0);
        }
      });

      // Calculate total expense from GL entries
      let totalExpense = 0;
      glData.forEach((entry) => {
        if (expenseAccountNames.includes(entry.account)) {
          totalExpense += (entry.debit || 0) - (entry.credit || 0);
        }
      });

      // Net P/L = Income - Expense
      netProfitLoss = totalIncome - totalExpense;
    } catch (error) {
      console.error('Error calculating Net P/L:', error);
      // Continue without Net P/L if calculation fails
    }

    // Calculate summary
    const totalCurrentAssets = currentAssets.reduce((sum, acc) => sum + acc.amount, 0);
    const totalFixedAssets = fixedAssets.reduce((sum, acc) => sum + acc.amount, 0);
    const totalAssets = totalCurrentAssets + totalFixedAssets;

    const totalCurrentLiabilities = currentLiabilities.reduce((sum, acc) => sum + acc.amount, 0);
    const totalLongTermLiabilities = longTermLiabilities.reduce((sum, acc) => sum + acc.amount, 0);
    const totalLiabilities = totalCurrentLiabilities + totalLongTermLiabilities;

    // Add Net P/L to equity (Bug #1 fix)
    const totalEquity = equityAccounts.reduce((sum, acc) => sum + acc.amount, 0) + netProfitLoss;
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

    const summary: BalanceSheetSummary = {
      total_current_assets: totalCurrentAssets,
      total_fixed_assets: totalFixedAssets,
      total_assets: totalAssets,
      total_current_liabilities: totalCurrentLiabilities,
      total_long_term_liabilities: totalLongTermLiabilities,
      total_liabilities: totalLiabilities,
      total_equity: totalEquity,
      total_liabilities_and_equity: totalLiabilitiesAndEquity,
    };

    return NextResponse.json({
      success: true,
      data: {
        current_assets: currentAssets,
        fixed_assets: fixedAssets,
        current_liabilities: currentLiabilities,
        long_term_liabilities: longTermLiabilities,
        equity: equityAccounts,
        net_profit_loss: netProfitLoss,
        summary: {
          ...summary,
          net_profit_loss: netProfitLoss,
          formatted: {
            total_current_assets: formatCurrency(summary.total_current_assets),
            total_fixed_assets: formatCurrency(summary.total_fixed_assets),
            total_assets: formatCurrency(summary.total_assets),
            total_current_liabilities: formatCurrency(summary.total_current_liabilities),
            total_long_term_liabilities: formatCurrency(summary.total_long_term_liabilities),
            total_liabilities: formatCurrency(summary.total_liabilities),
            total_equity: formatCurrency(summary.total_equity),
            total_liabilities_and_equity: formatCurrency(summary.total_liabilities_and_equity),
            net_profit_loss: formatCurrency(netProfitLoss),
          },
        },
        as_of_date: asOfDate,
      },
    });
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/finance/reports/balance-sheet', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
