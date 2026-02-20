import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

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

/**
 * Format currency in Indonesian Rupiah format
 * @param amount - The amount to format
 * @returns Formatted string like "Rp 1.000.000,00"
 */
function formatCurrency(amount: number): string {
  const absAmount = Math.abs(amount);
  const formatted = new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absAmount);
  
  return `Rp ${formatted}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company') || process.env.ERP_DEFAULT_COMPANY || process.env.ERP_COMPANY;
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');

    const sid = request.cookies.get('sid')?.value;
    if (!sid) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const _ak = process.env.ERP_API_KEY;
    const _as = process.env.ERP_API_SECRET;
    const _h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (_ak && _as) {
      _h['Authorization'] = `token ${_ak}:${_as}`;
    } else {
      _h['Cookie'] = `sid=${sid}`;
    }

    if (!company) {
      return NextResponse.json(
        { success: false, message: 'Company is required' },
        { status: 400 }
      );
    }

    // Fetch Account master for this company
    const accountsUrl = `${ERPNEXT_API_URL}/api/resource/Account?fields=["name","account_name","account_type","root_type","parent_account","is_group","account_number"]&filters=${encodeURIComponent(`[["company","=","${company}"],["is_group","=",0]]`)}&limit_page_length=2000`;
    const accountsResp = await fetch(accountsUrl, { method: 'GET', headers: _h });
    const accountsData = await accountsResp.json();

    if (!accountsResp.ok) {
      return NextResponse.json(
        { success: false, message: accountsData.exc || accountsData.message || 'Failed to fetch accounts' },
        { status: accountsResp.status }
      );
    }

    // Build lookup map: account name → master data
    const accountMasterMap = new Map<string, AccountMaster>();
    (accountsData.data || []).forEach((acc: AccountMaster) => {
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

    const glUrl = `${ERPNEXT_API_URL}/api/resource/GL Entry?fields=["account","debit","credit","posting_date"]&filters=${encodeURIComponent(JSON.stringify(glFilters))}&order_by=account&limit_page_length=5000`;

    const glResp = await fetch(glUrl, { method: 'GET', headers: _h });
    const glData = await glResp.json();

    if (!glResp.ok) {
      return NextResponse.json(
        { success: false, message: glData.exc || glData.message || 'Failed to fetch GL entries' },
        { status: glResp.status }
      );
    }

    // Aggregate GL entries by account
    const accountMap = new Map<string, { account: string; debit: number; credit: number }>();
    (glData.data || []).forEach((entry: GlEntry) => {
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

      // Check for discount accounts (contra accounts)
      // 4300 - Potongan Penjualan (Sales Discount - contra to Income)
      if (row.account.includes('4300') || master.account_name.toLowerCase().includes('potongan penjualan')) {
        salesDiscountAmount = row.debit - row.credit; // Debit balance for contra income
        incomeAccounts.push(line);
      }
      // 5300 - Potongan Pembelian (Purchase Discount - contra to COGS)
      else if (row.account.includes('5300') || master.account_name.toLowerCase().includes('potongan pembelian')) {
        purchaseDiscountAmount = row.credit - row.debit; // Credit balance for contra expense
        expenseAccounts.push(line);
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
  } catch (error) {
    console.error('Profit & Loss Report API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
