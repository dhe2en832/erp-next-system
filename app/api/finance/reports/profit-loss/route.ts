import { NextRequest, NextResponse } from 'next/server';
import { formatCurrency } from '@/utils/format';
import { validateDateRange } from '@/utils/report-validation';
import { isDiscountAccount } from '@/utils/account-helpers';
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

interface ProfitLossLine {
  account: string;
  account_name: string;
  account_number: string;
  account_type: string;
  amount: number;
  formatted_amount: string;
}

interface ProfitLossSummary {
  gross_sales: number;
  sales_discount: number;
  net_sales: number;
  gross_cogs: number;
  purchase_discount: number;
  net_cogs: number;
  gross_profit: number;
  total_expenses: number;
  net_profit: number;
}

export async function GET(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company') || process.env.ERP_DEFAULT_COMPANY || process.env.ERP_COMPANY;
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');

    // Validate date range
    const dateValidation = validateDateRange(fromDate, toDate);
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
    const accountsData = await client.getList('Account', {
      fields: ['name', 'account_name', 'account_type', 'root_type', 'parent_account', 'is_group', 'account_number'],
      filters: [['company', '=', company], ['is_group', '=', 0]],
      limit_page_length: 2000
    });

    // Build lookup map: account name → master data
    const accountMasterMap = new Map<string, AccountMaster>();
    accountsData.forEach((acc: AccountMaster) => {
      accountMasterMap.set(acc.name, acc);
    });

    // Build GL Entry filters with date range
    const glFilters: any[] = [['company', '=', company]];
    if (fromDate) {
      glFilters.push(['posting_date', '>=', fromDate]);
    }
    if (toDate) {
      glFilters.push(['posting_date', '<=', toDate]);
    }

    const glData = await client.getList('GL Entry', {
      fields: ['account', 'debit', 'credit', 'posting_date'],
      filters: glFilters,
      order_by: 'account',
      limit_page_length: 5000
    });

    // Aggregate GL entries by account
    const accountMap = new Map<string, { account: string; debit: number; credit: number }>();
    glData.forEach((entry: GlEntry) => {
      if (!accountMap.has(entry.account)) {
        accountMap.set(entry.account, { account: entry.account, debit: 0, credit: 0 });
      }
      const row = accountMap.get(entry.account)!;
      row.debit += entry.debit || 0;
      row.credit += entry.credit || 0;
    });

    // Process accounts for Profit & Loss
    const incomeAccounts: ProfitLossLine[] = [];
    const expenseAccounts: ProfitLossLine[] = [];
    let salesDiscountAmount = 0;
    let purchaseDiscountAmount = 0;

    Array.from(accountMap.values()).forEach(row => {
      const master = accountMasterMap.get(row.account);
      if (!master) return;

      const rootType = master.root_type;
      const accountType = master.account_type;

      // Only process Income and Expense accounts
      if (rootType !== 'Income' && rootType !== 'Expense') return;

      // Calculate amount based on normal balance
      // Income: credit normal balance → amount = credit - debit
      // Expense: debit normal balance → amount = debit - credit
      const amount = rootType === 'Income'
        ? (row.credit - row.debit)
        : (row.debit - row.credit);

      if (amount === 0) return;

      const line: ProfitLossLine = {
        account: row.account,
        account_name: master.account_name || row.account,
        account_number: master.account_number || '',
        account_type: accountType || '',
        amount: amount,
        formatted_amount: formatCurrency(amount),
      };

      // Check for discount accounts using flexible detection
      if (isDiscountAccount(master)) {
        if (rootType === 'Income' || master.parent_account?.toLowerCase().includes('income')) {
          // Sales Discount (contra to Income) - debit balance
          salesDiscountAmount += row.debit - row.credit;
          incomeAccounts.push(line);
        } else if (accountType === 'Cost of Goods Sold' || master.parent_account?.toLowerCase().includes('cost of goods sold')) {
          // Purchase Discount (contra to COGS) - credit balance
          purchaseDiscountAmount += row.credit - row.debit;
          expenseAccounts.push(line);
        }
      }
      else if (rootType === 'Income') {
        incomeAccounts.push(line);
      } else if (rootType === 'Expense') {
        expenseAccounts.push(line);
      }
    });

    // Calculate summary
    const grossSales = incomeAccounts
      .filter(acc => !acc.account.includes('4300') && !acc.account_name.toLowerCase().includes('potongan'))
      .reduce((sum, acc) => sum + acc.amount, 0);

    const netSales = grossSales - salesDiscountAmount;

    const grossCogs = expenseAccounts
      .filter(acc => 
        (acc.account_type === 'Cost of Goods Sold' || acc.account_name.toLowerCase().includes('hpp')) &&
        !acc.account.includes('5300') && 
        !acc.account_name.toLowerCase().includes('potongan')
      )
      .reduce((sum, acc) => sum + acc.amount, 0);

    const netCogs = grossCogs - purchaseDiscountAmount;

    const grossProfit = netSales - netCogs;

    const totalExpenses = expenseAccounts
      .filter(acc => 
        acc.account_type !== 'Cost of Goods Sold' && 
        !acc.account_name.toLowerCase().includes('hpp') &&
        !acc.account.includes('5300') &&
        !acc.account_name.toLowerCase().includes('potongan')
      )
      .reduce((sum, acc) => sum + acc.amount, 0);

    const netProfit = grossProfit - totalExpenses;

    const summary: ProfitLossSummary = {
      gross_sales: grossSales,
      sales_discount: salesDiscountAmount,
      net_sales: netSales,
      gross_cogs: grossCogs,
      purchase_discount: purchaseDiscountAmount,
      net_cogs: netCogs,
      gross_profit: grossProfit,
      total_expenses: totalExpenses,
      net_profit: netProfit,
    };

    return NextResponse.json({
      success: true,
      data: {
        income_accounts: incomeAccounts,
        expense_accounts: expenseAccounts,
        summary: {
          ...summary,
          formatted: {
            gross_sales: formatCurrency(summary.gross_sales),
            sales_discount: formatCurrency(summary.sales_discount),
            net_sales: formatCurrency(summary.net_sales),
            gross_cogs: formatCurrency(summary.gross_cogs),
            purchase_discount: formatCurrency(summary.purchase_discount),
            net_cogs: formatCurrency(summary.net_cogs),
            gross_profit: formatCurrency(summary.gross_profit),
            total_expenses: formatCurrency(summary.total_expenses),
            net_profit: formatCurrency(summary.net_profit),
          },
        },
        period: {
          from_date: fromDate,
          to_date: toDate,
        },
      },
    });
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/finance/reports/profit-loss', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
